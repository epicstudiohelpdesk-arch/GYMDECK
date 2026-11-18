/**
 * Local, per-gym persistence for Settings → Gym Profile → Contact & Communication.
 *
 * There is exactly one row per gym (`gym_id` is the primary key), and every query
 * is scoped by `ctx.gym_id` — the gym id is derived from the authenticated desktop
 * session, never supplied by the renderer. A signed-in gym therefore reads and
 * writes only its own locked record, and the settings survive logout/login while
 * the cloud is unreachable.
 */

use rusqlite::{params, Connection, Row};
use serde_json::{json, Value};

use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;

fn row_to_dto(row: &Row<'_>) -> Result<Value, rusqlite::Error> {
    Ok(json!({
        "gymId": row.get::<_, String>("gym_id")?,
        "primaryPhone": row.get::<_, Option<String>>("primary_phone")?,
        "whatsappNumber": row.get::<_, Option<String>>("whatsapp_number")?,
        "officialEmail": row.get::<_, Option<String>>("official_email")?,
        "mobileForMembers": row.get::<_, i64>("mobile_for_members")? != 0,
        "mobileSmsAllowed": row.get::<_, i64>("mobile_sms_allowed")? != 0,
        "mobileCallsAllowed": row.get::<_, i64>("mobile_calls_allowed")? != 0,
        "mobilePromosAllowed": row.get::<_, i64>("mobile_promos_allowed")? != 0,
        "whatsappForMembers": row.get::<_, i64>("whatsapp_for_members")? != 0,
        "whatsappReceiptsAllowed": row.get::<_, i64>("whatsapp_receipts_allowed")? != 0,
        "whatsappRemindersAllowed": row.get::<_, i64>("whatsapp_reminders_allowed")? != 0,
        "whatsappSupportAllowed": row.get::<_, i64>("whatsapp_support_allowed")? != 0,
        "whatsappPromosAllowed": row.get::<_, i64>("whatsapp_promos_allowed")? != 0,
        "emailForMembers": row.get::<_, i64>("email_for_members")? != 0,
        "emailInvoicesAllowed": row.get::<_, i64>("email_invoices_allowed")? != 0,
        "emailAlertsAllowed": row.get::<_, i64>("email_alerts_allowed")? != 0,
        "emailNewsletterAllowed": row.get::<_, i64>("email_newsletter_allowed")? != 0,
        "quietHoursStart": row.get::<_, String>("quiet_hours_start")?,
        "quietHoursEnd": row.get::<_, String>("quiet_hours_end")?,
        "updatedAt": row.get::<_, String>("updated_at")?,
    }))
}

fn opt_string(payload: &Value, key: &str) -> Option<String> {
    payload
        .get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn bool_value(payload: &Value, key: &str, fallback: bool) -> bool {
    payload
        .get(key)
        .and_then(|v| v.as_bool())
        .unwrap_or(fallback)
}

/// Validates an `HH:MM` wall-clock value without pulling in a date crate.
fn normalise_time(payload: &Value, key: &str, fallback: &str) -> Result<String, AppError> {
    let raw = match opt_string(payload, key) {
        Some(value) => value,
        None => return Ok(fallback.to_string()),
    };
    let parts: Vec<&str> = raw.split(':').collect();
    let valid = parts.len() == 2
        && parts[0].len() <= 2
        && parts[1].len() == 2
        && parts[0].parse::<u32>().map(|h| h < 24).unwrap_or(false)
        && parts[1].parse::<u32>().map(|m| m < 60).unwrap_or(false);
    if !valid {
        return Err(AppError::Configuration(format!(
            "{} must be a 24-hour time in HH:MM format.",
            key
        )));
    }
    Ok(format!(
        "{:02}:{}",
        parts[0].parse::<u32>().unwrap_or(0),
        parts[1]
    ))
}

fn validate_phone(label: &str, value: &Option<String>) -> Result<(), AppError> {
    if let Some(phone) = value {
        let digits = phone.chars().filter(|c| c.is_ascii_digit()).count();
        let allowed = phone
            .chars()
            .all(|c| c.is_ascii_digit() || matches!(c, '+' | ' ' | '-' | '(' | ')'));
        if !allowed || !(6..=18).contains(&digits) {
            return Err(AppError::Configuration(format!(
                "{} must be a valid phone number (6-18 digits).",
                label
            )));
        }
    }
    Ok(())
}

fn validate_email(value: &Option<String>) -> Result<(), AppError> {
    if let Some(email) = value {
        let (local, domain) = match email.split_once('@') {
            Some(parts) => parts,
            None => {
                return Err(AppError::Configuration(
                    "Official email address must contain @.".into(),
                ))
            }
        };
        if local.is_empty() || !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
            return Err(AppError::Configuration(
                "Official email address is not valid.".into(),
            ));
        }
    }
    Ok(())
}

pub struct CommunicationSettingsRepository;

impl CommunicationSettingsRepository {
    /// The locked settings row for the authenticated gym, if it exists yet.
    pub fn get(conn: &Connection, ctx: &AuthenticatedContext) -> Result<Option<Value>, AppError> {
        let mut stmt = conn
            .prepare("SELECT * FROM gym_communication_settings WHERE gym_id = ?1 LIMIT 1")
            .map_err(|e| AppError::Database(e.to_string()))?;
        let mut rows = stmt
            .query_map(params![ctx.gym_id.to_string()], row_to_dto)
            .map_err(|e| AppError::Database(e.to_string()))?;
        match rows.next() {
            Some(row) => Ok(Some(row.map_err(|e| AppError::Database(e.to_string()))?)),
            None => Ok(None),
        }
    }

    /// Create or replace this gym's settings row. `gym_id` comes from the session,
    /// so a save can never write into another tenant's record.
    pub fn upsert(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<Value, AppError> {
        let primary_phone = opt_string(payload, "primaryPhone");
        let whatsapp_number = opt_string(payload, "whatsappNumber");
        let official_email = opt_string(payload, "officialEmail");

        validate_phone("Official mobile number", &primary_phone)?;
        validate_phone("WhatsApp number", &whatsapp_number)?;
        validate_email(&official_email)?;

        let quiet_start = normalise_time(payload, "quietHoursStart", "22:00")?;
        let quiet_end = normalise_time(payload, "quietHoursEnd", "06:00")?;

        let mobile_for_members = bool_value(payload, "mobileForMembers", true);
        let mobile_sms_allowed = bool_value(payload, "mobileSmsAllowed", true);
        let mobile_calls_allowed = bool_value(payload, "mobileCallsAllowed", true);
        let mobile_promos_allowed = bool_value(payload, "mobilePromosAllowed", false);
        let whatsapp_for_members = bool_value(payload, "whatsappForMembers", true);
        let whatsapp_receipts_allowed = bool_value(payload, "whatsappReceiptsAllowed", true);
        let whatsapp_reminders_allowed = bool_value(payload, "whatsappRemindersAllowed", true);
        let whatsapp_support_allowed = bool_value(payload, "whatsappSupportAllowed", true);
        let whatsapp_promos_allowed = bool_value(payload, "whatsappPromosAllowed", false);
        let email_for_members = bool_value(payload, "emailForMembers", true);
        let email_invoices_allowed = bool_value(payload, "emailInvoicesAllowed", true);
        let email_alerts_allowed = bool_value(payload, "emailAlertsAllowed", true);
        let email_newsletter_allowed = bool_value(payload, "emailNewsletterAllowed", false);

        let gym_id = ctx.gym_id.to_string();
        let user_id = ctx.user_id.to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        tx.execute(
            "INSERT INTO gym_communication_settings (
                gym_id, primary_phone, whatsapp_number, official_email,
                mobile_for_members, mobile_sms_allowed, mobile_calls_allowed, mobile_promos_allowed,
                whatsapp_for_members, whatsapp_receipts_allowed, whatsapp_reminders_allowed,
                whatsapp_support_allowed, whatsapp_promos_allowed,
                email_for_members, email_invoices_allowed, email_alerts_allowed, email_newsletter_allowed,
                quiet_hours_start, quiet_hours_end, created_by, updated_by, created_at, updated_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?20,?21,?21)
             ON CONFLICT(gym_id) DO UPDATE SET
                primary_phone = excluded.primary_phone,
                whatsapp_number = excluded.whatsapp_number,
                official_email = excluded.official_email,
                mobile_for_members = excluded.mobile_for_members,
                mobile_sms_allowed = excluded.mobile_sms_allowed,
                mobile_calls_allowed = excluded.mobile_calls_allowed,
                mobile_promos_allowed = excluded.mobile_promos_allowed,
                whatsapp_for_members = excluded.whatsapp_for_members,
                whatsapp_receipts_allowed = excluded.whatsapp_receipts_allowed,
                whatsapp_reminders_allowed = excluded.whatsapp_reminders_allowed,
                whatsapp_support_allowed = excluded.whatsapp_support_allowed,
                whatsapp_promos_allowed = excluded.whatsapp_promos_allowed,
                email_for_members = excluded.email_for_members,
                email_invoices_allowed = excluded.email_invoices_allowed,
                email_alerts_allowed = excluded.email_alerts_allowed,
                email_newsletter_allowed = excluded.email_newsletter_allowed,
                quiet_hours_start = excluded.quiet_hours_start,
                quiet_hours_end = excluded.quiet_hours_end,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at",
            params![
                gym_id,
                primary_phone,
                whatsapp_number,
                official_email,
                mobile_for_members as i64,
                mobile_sms_allowed as i64,
                mobile_calls_allowed as i64,
                mobile_promos_allowed as i64,
                whatsapp_for_members as i64,
                whatsapp_receipts_allowed as i64,
                whatsapp_reminders_allowed as i64,
                whatsapp_support_allowed as i64,
                whatsapp_promos_allowed as i64,
                email_for_members as i64,
                email_invoices_allowed as i64,
                email_alerts_allowed as i64,
                email_newsletter_allowed as i64,
                quiet_start,
                quiet_end,
                user_id,
                now,
            ],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let dto = Self::get(&tx, ctx)?
            .ok_or_else(|| AppError::Database("Failed to load saved communication settings.".into()))?;
        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(dto)
    }
}
