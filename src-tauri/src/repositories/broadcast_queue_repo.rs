/**
 * Local, per-gym outbound broadcast queue for assisted WhatsApp delivery.
 *
 * GymDeck does not call a paid messaging provider for these runs. Instead the repo
 * renders the owner's text per member (name, plan, renewal date, fee) and stores a
 * `https://wa.me/<number>?text=...` click-to-chat link for each recipient. The desktop
 * UI opens one link at a time and records the outcome, so the gym's own WhatsApp number
 * is the sender and nothing can be flagged as automated bulk traffic.
 *
 * Every query is scoped by `ctx.gym_id` taken from the authenticated session; the
 * renderer can never choose which gym's queue it reads or writes.
 */

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, NaiveDate, Utc};
use rusqlite::{params, Connection, Row};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;

/// A single assisted run is deliberately small: one tap per member means a queue much
/// longer than this is impractical to finish, so the remainder is left for a second run.
const MAX_RECIPIENTS: usize = 200;
const MAX_BODY_CHARS: usize = 2000;
const MAX_TITLE_CHARS: usize = 200;
const EXPIRING_WINDOW_DAYS: i64 = 14;
const CHANNELS: &[&str] = &["WHATSAPP", "SMS", "EMAIL", "PUSH"];

fn broadcast_row(row: &Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, String>("id")?,
        "gymId": row.get::<_, String>("gym_id")?,
        "channel": row.get::<_, String>("channel")?,
        "messageKind": row.get::<_, String>("message_kind")?,
        "title": row.get::<_, Option<String>>("title")?,
        "body": row.get::<_, String>("body")?,
        "audienceLabel": row.get::<_, Option<String>>("audience_label")?,
        "recipientCount": row.get::<_, i64>("recipient_count")?,
        "sentCount": row.get::<_, i64>("sent_count")?,
        "failedCount": row.get::<_, i64>("failed_count")?,
        "skippedCount": row.get::<_, i64>("skipped_count")?,
        "queuedCount": row.get::<_, i64>("queued_count")?,
        "status": row.get::<_, String>("status")?,
        "createdAt": row.get::<_, String>("created_at")?,
        "completedAt": row.get::<_, Option<String>>("completed_at")?,
    }))
}

fn recipient_row(row: &Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "id": row.get::<_, String>("id")?,
        "broadcastId": row.get::<_, String>("broadcast_id")?,
        "memberId": row.get::<_, Option<String>>("member_id")?,
        "memberCode": row.get::<_, Option<String>>("member_code")?,
        "memberName": row.get::<_, Option<String>>("member_name")?,
        "phoneMasked": row.get::<_, Option<String>>("phone_masked")?,
        "renderedBody": row.get::<_, String>("rendered_body")?,
        "sendUrl": row.get::<_, Option<String>>("send_url")?,
        "status": row.get::<_, String>("status")?,
        "skipReason": row.get::<_, Option<String>>("skip_reason")?,
        "sentAt": row.get::<_, Option<String>>("sent_at")?,
    }))
}

fn trimmed(payload: &Value, key: &str) -> Option<String> {
    payload
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Normalises an Indian or international number into digits only, which is what the
/// `wa.me` link requires (no `+`, no spaces, no dashes).
fn normalize_phone(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    let normalised = if digits.len() == 10 {
        format!("91{}", digits)
    } else if digits.len() == 11 && digits.starts_with('0') {
        format!("91{}", &digits[1..])
    } else if digits.len() == 12 && digits.starts_with("91") {
        digits
    } else if (11..=15).contains(&digits.len()) {
        digits
    } else {
        return None;
    };

    if normalised.len() < 11 || normalised.len() > 15 {
        return None;
    }
    Some(normalised)
}

fn mask_phone(normalised: &str) -> String {
    let last_four = &normalised[normalised.len().saturating_sub(4)..];
    if normalised.len() >= 12 {
        let country = &normalised[..normalised.len() - 10];
        format!("+{} ••••• {}", country, last_four)
    } else {
        format!("••••• {}", last_four)
    }
}

/// Percent-encodes the message so it survives as a query-string value. Encoding the
/// UTF-8 bytes also covers emoji and any regional script the owner types.
fn encode_query_component(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for byte in input.as_bytes() {
        match *byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

fn parse_date(raw: &str) -> Option<NaiveDate> {
    let trimmed = raw.trim();
    if let Ok(date) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return Some(date);
    }
    if let Ok(stamp) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(stamp.date_naive());
    }
    let head: &str = trimmed.get(..10).unwrap_or(trimmed);
    NaiveDate::parse_from_str(head, "%Y-%m-%d").ok()
}

fn format_date(date: NaiveDate) -> String {
    date.format("%d %b %Y").to_string()
}

/// Indian digit grouping (12,34,567) so a fee reads the way the owner writes it.
fn format_amount(minor_units: i64) -> String {
    let rupees = (minor_units as f64 / 100.0).round().max(0.0) as i64;
    let digits = rupees.to_string();
    if digits.len() <= 3 {
        return format!("₹{}", digits);
    }
    let (head, tail) = digits.split_at(digits.len() - 3);
    let mut grouped = String::new();
    let head_bytes = head.as_bytes();
    for (index, ch) in head.chars().enumerate() {
        if index > 0 && (head_bytes.len() - index) % 2 == 0 {
            grouped.push(',');
        }
        grouped.push(ch);
    }
    grouped.push(',');
    grouped.push_str(tail);
    format!("₹{}", grouped)
}

struct MemberRow {
    id: String,
    member_code: Option<String>,
    full_name: String,
    phone: String,
    status: String,
    expires_at: Option<String>,
    plan_name: Option<String>,
    plan_price_minor: Option<i64>,
}

fn load_members(conn: &Connection, gym_id: &str) -> Result<Vec<MemberRow>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.member_code, m.full_name, m.phone, m.membership_status, m.expires_at,
                    p.plan_name, p.price_minor_units
             FROM gym_members m
             LEFT JOIN membership_plans p ON p.id = m.membership_plan_id
             WHERE m.gym_id = ?1 AND m.deleted_at IS NULL
             ORDER BY m.full_name COLLATE NOCASE ASC
             LIMIT 5000",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let rows = stmt
        .query_map(params![gym_id], |row| {
            Ok(MemberRow {
                id: row.get(0)?,
                member_code: row.get(1)?,
                full_name: row.get(2)?,
                phone: row.get(3)?,
                status: row.get(4)?,
                expires_at: row.get(5)?,
                plan_name: row.get(6)?,
                plan_price_minor: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut members = Vec::new();
    for row in rows {
        members.push(row.map_err(|e| AppError::Database(e.to_string()))?);
    }
    Ok(members)
}

fn in_segment(member: &MemberRow, segment: &str, today: NaiveDate) -> bool {
    let expiry = member.expires_at.as_deref().and_then(parse_date);
    match segment {
        "dues" => {
            matches!(member.status.as_str(), "EXPIRED" | "INACTIVE" | "PENDING_DUES")
                || expiry.map(|date| date <= today).unwrap_or(false)
        }
        "expiring" => expiry
            .map(|date| {
                let days = (date - today).num_days();
                days >= 0 && days <= EXPIRING_WINDOW_DAYS
            })
            .unwrap_or(false),
        "active" => member.status == "ACTIVE",
        _ => true,
    }
}

fn gym_display_name(conn: &Connection, gym_id: &str) -> String {
    conn.query_row(
        "SELECT COALESCE(NULLIF(TRIM(pd.display_name), ''), g.name)
         FROM gyms g
         LEFT JOIN gym_profile_details pd ON pd.gym_id = g.id
         WHERE g.id = ?1",
        params![gym_id],
        |row| row.get::<_, String>(0),
    )
    .unwrap_or_else(|_| "your gym".to_string())
}

fn first_name(full_name: &str) -> String {
    full_name
        .split_whitespace()
        .next()
        .unwrap_or(full_name)
        .to_string()
}

fn render_body(template: &str, member: &MemberRow, gym_name: &str) -> String {
    let today = Utc::now().date_naive();
    let expiry = member.expires_at.as_deref().and_then(parse_date);
    let expiry_text = expiry
        .map(format_date)
        .unwrap_or_else(|| "your renewal date".to_string());
    let days_left = expiry
        .map(|date| (date - today).num_days().max(0).to_string())
        .unwrap_or_default();
    let plan = member
        .plan_name
        .clone()
        .unwrap_or_else(|| "membership".to_string());
    let amount = match member.plan_price_minor {
        Some(minor) if minor > 0 => format_amount(minor),
        _ => "the membership fee".to_string(),
    };

    let variables = [
        ("{first_name}", first_name(&member.full_name)),
        ("{name}", member.full_name.clone()),
        ("{member_code}", member.member_code.clone().unwrap_or_default()),
        ("{plan}", plan),
        ("{amount}", amount),
        ("{expiry_date}", expiry_text.clone()),
        ("{due_date}", expiry_text),
        ("{days_left}", days_left),
        ("{gym_name}", gym_name.to_string()),
    ];

    let mut rendered = template.to_string();
    for (placeholder, value) in variables {
        rendered = rendered.replace(placeholder, &value);
    }
    rendered
}

fn whatsapp_link(normalised_phone: &str, body: &str) -> String {
    format!(
        "https://wa.me/{}?text={}",
        normalised_phone,
        encode_query_component(body)
    )
}

fn validate_channel_policy(
    conn: &Connection,
    ctx: &AuthenticatedContext,
    channel: &str,
    message_kind: &str,
) -> Result<(), AppError> {
    if channel != "WHATSAPP" {
        return Ok(());
    }

    let row: Option<(i64, i64)> = conn
        .query_row(
            "SELECT whatsapp_for_members, whatsapp_promos_allowed
             FROM gym_communication_settings WHERE gym_id = ?1",
            params![ctx.gym_id.to_string()],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    if let Some((members_allowed, promos_allowed)) = row {
        if members_allowed == 0 {
            return Err(AppError::Configuration(
                "WhatsApp messaging for members is turned off in Contact & Communication.".into(),
            ));
        }
        if message_kind == "PROMO" && promos_allowed == 0 {
            return Err(AppError::Configuration(
                "WhatsApp promotional messages are turned off in Contact & Communication.".into(),
            ));
        }
    }
    Ok(())
}

pub struct BroadcastQueueRepository;

impl BroadcastQueueRepository {
    /// Starts a run: resolves the audience, renders each member's message and stores the
    /// per-member click-to-chat link. Nothing is sent from here — the UI walks the queue.
    pub fn preview(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let body = trimmed(payload, "body")
            .ok_or_else(|| AppError::Configuration("Message body cannot be empty.".into()))?;
        if body.chars().count() > MAX_BODY_CHARS {
            return Err(AppError::Configuration(format!(
                "Message must be {} characters or fewer.",
                MAX_BODY_CHARS
            )));
        }
        let title = trimmed(payload, "title");
        if let Some(value) = &title {
            if value.chars().count() > MAX_TITLE_CHARS {
                return Err(AppError::Configuration(format!(
                    "Title must be {} characters or fewer.",
                    MAX_TITLE_CHARS
                )));
            }
        }

        let channel = payload
            .get("channel")
            .and_then(|v| v.as_str())
            .unwrap_or("WHATSAPP")
            .trim()
            .to_uppercase();
        if !CHANNELS.contains(&channel.as_str()) {
            return Err(AppError::Configuration("Unsupported delivery channel.".into()));
        }

        let message_kind = payload
            .get("messageKind")
            .and_then(|v| v.as_str())
            .unwrap_or("CUSTOM")
            .trim()
            .to_uppercase();
        validate_channel_policy(conn, ctx, &channel, &message_kind)?;

        let audience_label = trimmed(payload, "audienceLabel");
        let segment = payload
            .get("segment")
            .and_then(|v| v.as_str())
            .unwrap_or("all")
            .to_string();
        let requested_ids: Vec<String> = payload
            .get("memberIds")
            .and_then(|v| v.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        let gym_id = ctx.gym_id.to_string();
        let gym_name = gym_display_name(conn, &gym_id);
        let members = load_members(conn, &gym_id)?;
        let today = Utc::now().date_naive();

        let selected: Vec<&MemberRow> = if requested_ids.is_empty() {
            members
                .iter()
                .filter(|member| in_segment(member, &segment, today))
                .collect()
        } else {
            // Keep the caller's order: the owner picks members in the list they see, and
            // when two rows share a phone number the first one picked keeps the message.
            let by_id: HashMap<&str, &MemberRow> =
                members.iter().map(|member| (member.id.as_str(), member)).collect();
            let mut seen_ids: HashSet<&str> = HashSet::new();
            requested_ids
                .iter()
                .filter(|id| seen_ids.insert(id.as_str()))
                .filter_map(|id| by_id.get(id.as_str()).copied())
                .collect()
        };

        if selected.is_empty() {
            return Err(AppError::Configuration(
                "No members match this audience.".into(),
            ));
        }

        let audience_total = selected.len();
        let truncated = audience_total > MAX_RECIPIENTS;
        let batch: Vec<&MemberRow> = selected.into_iter().take(MAX_RECIPIENTS).collect();

        let now = Utc::now().to_rfc3339();
        let broadcast_id = Uuid::new_v4().to_string();
        let user_id = ctx.user_id.to_string();
        let mut seen_numbers: HashSet<String> = HashSet::new();

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "INSERT INTO gym_broadcasts (
                id, gym_id, channel, message_kind, title, body, audience_label,
                recipient_count, sent_count, failed_count, skipped_count, queued_count,
                status, created_by, created_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,0,0,0,0,0,'QUEUED',?8,?9)",
            params![
                broadcast_id,
                gym_id,
                channel,
                message_kind,
                title,
                body,
                audience_label,
                user_id,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let mut total = 0i64;
        let mut skipped = 0i64;

        for member in batch {
            let recipient_id = Uuid::new_v4().to_string();
            let rendered = render_body(&body, member, &gym_name);

            let (status, skip_reason, masked, send_url) = match normalize_phone(&member.phone) {
                None => (
                    "SKIPPED",
                    Some("NO_PHONE"),
                    None,
                    None,
                ),
                Some(normalised) => {
                    if !seen_numbers.insert(normalised.clone()) {
                        (
                            "SKIPPED",
                            Some("DUPLICATE_PHONE"),
                            Some(mask_phone(&normalised)),
                            None,
                        )
                    } else {
                        let link = whatsapp_link(&normalised, &rendered);
                        ( "QUEUED", None, Some(mask_phone(&normalised)), Some(link) )
                    }
                }
            };

            if status == "SKIPPED" {
                skipped += 1;
            }
            total += 1;

            tx.execute(
                "INSERT INTO gym_broadcast_recipients (
                    id, broadcast_id, gym_id, member_id, member_code, member_name,
                    phone_masked, rendered_body, send_url, status, skip_reason, created_at
                 ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                params![
                    recipient_id,
                    broadcast_id,
                    gym_id,
                    member.id,
                    member.member_code,
                    member.full_name,
                    masked,
                    rendered,
                    send_url,
                    status,
                    skip_reason,
                    now,
                ],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        }

        let queued = total - skipped;
        let status = if queued == 0 { "COMPLETED" } else { "QUEUED" };
        tx.execute(
            "UPDATE gym_broadcasts
             SET recipient_count = ?1, queued_count = ?2, skipped_count = ?3,
                 status = ?4, completed_at = CASE WHEN ?4 = 'COMPLETED' THEN ?5 ELSE NULL END
             WHERE id = ?6 AND gym_id = ?7",
            params![total, queued, skipped, status, now, broadcast_id, ctx.gym_id.to_string()],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        let mut result = Self::get(conn, ctx, &broadcast_id)?;
        if let Some(object) = result.as_object_mut() {
            object.insert("truncated".into(), json!(truncated));
            object.insert("audienceTotal".into(), json!(audience_total));
        }
        Ok(result)
    }

    pub fn get(conn: &Connection, ctx: &AuthenticatedContext, id: &str) -> Result<Value, AppError> {
        let broadcast = conn
            .query_row(
                "SELECT * FROM gym_broadcasts WHERE id = ?1 AND gym_id = ?2 LIMIT 1",
                params![id, ctx.gym_id.to_string()],
                broadcast_row,
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut stmt = conn
            .prepare(
                "SELECT * FROM gym_broadcast_recipients
                 WHERE broadcast_id = ?1 AND gym_id = ?2
                 ORDER BY rowid ASC",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map(params![id, ctx.gym_id.to_string()], recipient_row)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut recipients = Vec::new();
        for row in rows {
            recipients.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(json!({ "broadcast": broadcast, "recipients": recipients }))
    }

    pub fn list(conn: &Connection, ctx: &AuthenticatedContext, limit: usize) -> Result<Vec<Value>, AppError> {
        let bounded = limit.clamp(1, 200) as i64;
        let mut stmt = conn
            .prepare(
                "SELECT * FROM gym_broadcasts WHERE gym_id = ?1
                 ORDER BY created_at DESC, rowid DESC LIMIT ?2",
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        let rows = stmt
            .query_map(params![ctx.gym_id.to_string(), bounded], broadcast_row)
            .map_err(|e| AppError::Database(e.to_string()))?;

        let mut broadcasts = Vec::new();
        for row in rows {
            broadcasts.push(row.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(broadcasts)
    }

    /// Records the owner's outcome for one member and recomputes the run counters.
    pub fn record_result(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let broadcast_id = trimmed(payload, "broadcastId")
            .ok_or_else(|| AppError::Configuration("Missing broadcast reference.".into()))?;
        let recipient_id = trimmed(payload, "recipientId")
            .ok_or_else(|| AppError::Configuration("Missing recipient reference.".into()))?;
        let status = trimmed(payload, "status")
            .unwrap_or_default()
            .to_uppercase();
        if !matches!(status.as_str(), "SENT" | "FAILED" | "SKIPPED") {
            return Err(AppError::Configuration(
                "Delivery outcome must be SENT, FAILED or SKIPPED.".into(),
            ));
        }

        let gym_id = ctx.gym_id.to_string();
        let now = Utc::now().to_rfc3339();
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        let updated = tx
            .execute(
                "UPDATE gym_broadcast_recipients
                 SET status = ?1,
                     sent_at = CASE WHEN ?1 = 'SENT' THEN ?2 ELSE sent_at END
                 WHERE id = ?3 AND broadcast_id = ?4 AND gym_id = ?5",
                params![status, now, recipient_id, broadcast_id, gym_id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        if updated == 0 {
            return Err(AppError::Database(
                "Broadcast recipient not found for this gym.".into(),
            ));
        }

        let (sent, failed, skipped, queued): (i64, i64, i64, i64) = tx
            .query_row(
                "SELECT
                    COALESCE(SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END), 0)
                 FROM gym_broadcast_recipients
                 WHERE broadcast_id = ?1 AND gym_id = ?2",
                params![broadcast_id, gym_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let current_status: String = tx
            .query_row(
                "SELECT status FROM gym_broadcasts WHERE id = ?1 AND gym_id = ?2",
                params![broadcast_id, gym_id],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        let next_status = if current_status == "CANCELLED" {
            "CANCELLED"
        } else if queued == 0 {
            "COMPLETED"
        } else if sent + failed > 0 {
            "IN_PROGRESS"
        } else {
            "QUEUED"
        };

        tx.execute(
            "UPDATE gym_broadcasts
             SET sent_count = ?1, failed_count = ?2, skipped_count = ?3, queued_count = ?4,
                 status = ?5,
                 completed_at = CASE WHEN ?5 = 'COMPLETED' THEN COALESCE(completed_at, ?6) ELSE completed_at END
             WHERE id = ?7 AND gym_id = ?8",
            params![sent, failed, skipped, queued, next_status, now, broadcast_id, gym_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Self::get(conn, ctx, &broadcast_id)
    }

    /// Stops a run: everything still queued is marked skipped so the history is honest.
    pub fn cancel(conn: &mut Connection, ctx: &AuthenticatedContext, id: &str) -> Result<Value, AppError> {
        let gym_id = ctx.gym_id.to_string();
        let now = Utc::now().to_rfc3339();
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        let updated = tx
            .execute(
                "UPDATE gym_broadcasts SET status = 'CANCELLED', completed_at = ?1
                 WHERE id = ?2 AND gym_id = ?3",
                params![now, id, gym_id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        if updated == 0 {
            return Err(AppError::Database("Broadcast not found for this gym.".into()));
        }

        tx.execute(
            "UPDATE gym_broadcast_recipients
             SET status = 'SKIPPED', skip_reason = 'CANCELLED'
             WHERE broadcast_id = ?1 AND gym_id = ?2 AND status = 'QUEUED'",
            params![id, gym_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let skipped: i64 = tx
            .query_row(
                "SELECT COALESCE(SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END), 0)
                 FROM gym_broadcast_recipients WHERE broadcast_id = ?1 AND gym_id = ?2",
                params![id, gym_id],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        tx.execute(
            "UPDATE gym_broadcasts SET queued_count = 0, skipped_count = ?1
             WHERE id = ?2 AND gym_id = ?3",
            params![skipped, id, gym_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Self::get(conn, ctx, id)
    }

    /// Removes a run from this device's history (the gym's audit copy is local only).
    pub fn delete(conn: &mut Connection, ctx: &AuthenticatedContext, id: &str) -> Result<Value, AppError> {
        let gym_id = ctx.gym_id.to_string();
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "DELETE FROM gym_broadcast_recipients WHERE broadcast_id = ?1 AND gym_id = ?2",
            params![id, gym_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
        let removed = tx
            .execute(
                "DELETE FROM gym_broadcasts WHERE id = ?1 AND gym_id = ?2",
                params![id, gym_id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
        if removed == 0 {
            return Err(AppError::Database("Broadcast not found for this gym.".into()));
        }
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(json!({ "deleted": true }))
    }
}
