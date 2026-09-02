use rusqlite::{Connection, Transaction, params};
use uuid::Uuid;
use chrono::{Utc, Duration};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncOutboxRecord {
    pub id: Uuid,
    pub event_id: Uuid,
    pub gym_id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub operation: String,
    pub payload: String,
    pub created_at: chrono::DateTime<Utc>,
    pub attempt_count: i32,
    pub last_attempt_at: Option<chrono::DateTime<Utc>>,
    pub next_retry_at: Option<chrono::DateTime<Utc>>,
    pub lease_expires_at: Option<chrono::DateTime<Utc>>,
    pub worker_id: Option<String>,
    pub status: String, // PENDING, IN_FLIGHT, SYNCED, FAILED
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteChangeRecord {
    pub server_sequence: i64,
    pub event_id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub operation: String,
    pub payload: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStats {
    pub pending_count: i64,
    pub in_flight_count: i64,
    pub synced_count: i64,
    pub failed_count: i64,
    pub last_synced_sequence: i64,
    pub last_sync_at: Option<String>,
}

pub struct SyncRepository;

impl SyncRepository {
    /// Enqueues an outbox mutation record atomically within an existing database transaction.
    pub fn enqueue_outbox_event(
        tx: &Transaction,
        gym_id: &Uuid,
        entity_type: &str,
        entity_id: &Uuid,
        operation: &str,
        payload: &str,
    ) -> Result<Uuid, AppError> {
        let id = Uuid::new_v4();
        let event_id = Uuid::new_v4();
        let now = Utc::now().to_rfc3339();

        tx.execute(
            "INSERT INTO sync_outbox (
                id, event_id, gym_id, entity_type, entity_id, operation, payload,
                created_at, attempt_count, status
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, 'PENDING')",
            params![
                id.to_string(),
                event_id.to_string(),
                gym_id.to_string(),
                entity_type,
                entity_id.to_string(),
                operation,
                payload,
                now,
            ],
        ).map_err(|e| {
            tracing::error!("Failed to insert sync outbox event: {}", e);
            AppError::Database(e.to_string())
        })?;

        tracing::info!(
            "Sync outbox event enqueued: id={}, event_id={}, entity={}, op={}",
            id, event_id, entity_type, operation
        );

        Ok(event_id)
    }

    /// Atomically claims eligible pending outbox events for a worker, enforcing in-flight leasing
    /// and recovering any expired in-flight leases from crashed workers.
    pub fn claim_pending_events(
        conn: &mut Connection,
        gym_id: &Uuid,
        worker_id: &str,
        limit: i64,
        lease_duration_secs: i64,
    ) -> Result<Vec<SyncOutboxRecord>, AppError> {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        let now = Utc::now();
        let now_str = now.to_rfc3339();
        let lease_expiry = (now + Duration::seconds(lease_duration_secs)).to_rfc3339();

        // 1. Recover expired in-flight leases from crashed workers
        tx.execute(
            "UPDATE sync_outbox
             SET status = 'PENDING', worker_id = NULL, lease_expires_at = NULL
             WHERE gym_id = ?1 AND status = 'IN_FLIGHT' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?2",
            params![gym_id.to_string(), now_str],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // 2. Query eligible event IDs (PENDING and past next_retry_at)
        let mut id_stmt = tx.prepare(
            "SELECT id FROM sync_outbox
             WHERE gym_id = ?1
               AND status = 'PENDING'
               AND (next_retry_at IS NULL OR next_retry_at <= ?2)
             ORDER BY created_at ASC
             LIMIT ?3",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let ids_iter = id_stmt.query_map(
            params![gym_id.to_string(), now_str, limit],
            |row| row.get::<_, String>(0),
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut eligible_ids = Vec::new();
        for id_res in ids_iter {
            eligible_ids.push(id_res.map_err(|e| AppError::Database(e.to_string()))?);
        }
        drop(id_stmt);

        if eligible_ids.is_empty() {
            tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
            return Ok(Vec::new());
        }

        // 3. Atomically transition claimed events to IN_FLIGHT
        for id_str in &eligible_ids {
            tx.execute(
                "UPDATE sync_outbox
                 SET status = 'IN_FLIGHT',
                     worker_id = ?1,
                     last_attempt_at = ?2,
                     lease_expires_at = ?3,
                     attempt_count = attempt_count + 1
                 WHERE id = ?4",
                params![worker_id, now_str, lease_expiry, id_str],
            ).map_err(|e| AppError::Database(e.to_string()))?;
        }

        // 4. Fetch the full claimed record details
        let mut stmt = tx.prepare(
            "SELECT id, event_id, gym_id, entity_type, entity_id, operation, payload,
                    created_at, attempt_count, last_attempt_at, next_retry_at, lease_expires_at,
                    worker_id, status, error_code, error_message
             FROM sync_outbox
             WHERE worker_id = ?1 AND status = 'IN_FLIGHT'
             ORDER BY created_at ASC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(
            params![worker_id],
            |row| {
                Ok(SyncOutboxRecord {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    event_id: Uuid::parse_str(&row.get::<_, String>("event_id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    entity_type: row.get("entity_type")?,
                    entity_id: Uuid::parse_str(&row.get::<_, String>("entity_id")?).unwrap_or_default(),
                    operation: row.get("operation")?,
                    payload: row.get("payload")?,
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    attempt_count: row.get("attempt_count")?,
                    last_attempt_at: row.get::<_, Option<String>>("last_attempt_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    next_retry_at: row.get::<_, Option<String>>("next_retry_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    lease_expires_at: row.get::<_, Option<String>>("lease_expires_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    worker_id: row.get("worker_id")?,
                    status: row.get("status")?,
                    error_code: row.get("error_code")?,
                    error_message: row.get("error_message")?,
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut events = Vec::new();
        for r in rows {
            events.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        drop(stmt);

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        Ok(events)
    }

    /// Fetches pending or retryable outbox events for transmission to Cloud (read-only inspect).
    pub fn get_pending_events(
        conn: &Connection,
        gym_id: &Uuid,
        limit: i64,
    ) -> Result<Vec<SyncOutboxRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, event_id, gym_id, entity_type, entity_id, operation, payload,
                    created_at, attempt_count, last_attempt_at, next_retry_at, lease_expires_at,
                    worker_id, status, error_code, error_message
             FROM sync_outbox
             WHERE gym_id = ?1 AND status IN ('PENDING', 'IN_FLIGHT')
             ORDER BY created_at ASC
             LIMIT ?2"
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(
            params![gym_id.to_string(), limit],
            |row| {
                Ok(SyncOutboxRecord {
                    id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                    event_id: Uuid::parse_str(&row.get::<_, String>("event_id")?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                    entity_type: row.get("entity_type")?,
                    entity_id: Uuid::parse_str(&row.get::<_, String>("entity_id")?).unwrap_or_default(),
                    operation: row.get("operation")?,
                    payload: row.get("payload")?,
                    created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                        .unwrap_or_default().with_timezone(&Utc),
                    attempt_count: row.get("attempt_count")?,
                    last_attempt_at: row.get::<_, Option<String>>("last_attempt_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    next_retry_at: row.get::<_, Option<String>>("next_retry_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    lease_expires_at: row.get::<_, Option<String>>("lease_expires_at")?
                        .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&Utc))),
                    worker_id: row.get("worker_id")?,
                    status: row.get("status")?,
                    error_code: row.get("error_code")?,
                    error_message: row.get("error_message")?,
                })
            },
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let mut events = Vec::new();
        for r in rows {
            events.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }

        Ok(events)
    }

    /// Marks an event as successfully synced to Cloud and releases worker claim.
    pub fn mark_event_synced(
        conn: &Connection,
        event_id: &Uuid,
    ) -> Result<(), AppError> {
        conn.execute(
            "UPDATE sync_outbox
             SET status = 'SYNCED',
                 worker_id = NULL,
                 lease_expires_at = NULL,
                 next_retry_at = NULL,
                 last_attempt_at = ?1,
                 error_code = NULL,
                 error_message = NULL
             WHERE event_id = ?2",
            params![Utc::now().to_rfc3339(), event_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Increments attempt count, computes exponential backoff with jitter for transient errors,
    /// and transitions permanent failures to FAILED.
    pub fn mark_event_failed(
        conn: &Connection,
        event_id: &Uuid,
        error_code: &str,
        error_message: &str,
        is_permanent: bool,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        let now_str = now.to_rfc3339();

        if is_permanent {
            conn.execute(
                "UPDATE sync_outbox
                 SET status = 'FAILED',
                     worker_id = NULL,
                     lease_expires_at = NULL,
                     next_retry_at = NULL,
                     last_attempt_at = ?1,
                     error_code = ?2,
                     error_message = ?3
                 WHERE event_id = ?4",
                params![
                    now_str,
                    error_code,
                    error_message,
                    event_id.to_string()
                ],
            ).map_err(|e| AppError::Database(e.to_string()))?;
        } else {
            // Read attempt count to calculate exponential backoff with jitter
            let current_attempts: i32 = conn.query_row(
                "SELECT attempt_count FROM sync_outbox WHERE event_id = ?1",
                params![event_id.to_string()],
                |row| row.get(0),
            ).unwrap_or(1);

            // Backoff: 2 ^ min(attempts, 8) capped at 300s + pseudo-random jitter (100ms - 500ms)
            let base_secs = 2_i64.pow((current_attempts.min(8) as u32).max(1) - 1).min(300);
            let jitter_millis = (event_id.as_bytes()[0] as i64 * 3) % 500;
            let next_retry = now + Duration::seconds(base_secs) + Duration::milliseconds(jitter_millis);
            let next_retry_str = next_retry.to_rfc3339();

            conn.execute(
                "UPDATE sync_outbox
                 SET status = 'PENDING',
                     worker_id = NULL,
                     lease_expires_at = NULL,
                     next_retry_at = ?1,
                     last_attempt_at = ?2,
                     error_code = ?3,
                     error_message = ?4
                 WHERE event_id = ?5",
                params![
                    next_retry_str,
                    now_str,
                    error_code,
                    error_message,
                    event_id.to_string()
                ],
            ).map_err(|e| AppError::Database(e.to_string()))?;
        }

        Ok(())
    }

    /// Atomically applies a batch of remote pull changes into local SQLite tables, records entries in
    /// sync_inbox, and advances last_applied_server_sequence inside ONE single transaction.
    pub fn apply_pull_batch_tx(
        conn: &mut Connection,
        gym_id: &Uuid,
        changes: &[RemoteChangeRecord],
        next_cursor: i64,
    ) -> Result<(), AppError> {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        let now = Utc::now().to_rfc3339();

        for change in changes {
            let payload_str = change.payload.to_string();

            // 1. Record into sync_inbox for idempotency
            tx.execute(
                "INSERT INTO sync_inbox (
                    server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload, applied_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ON CONFLICT(server_sequence) DO NOTHING",
                params![
                    change.server_sequence,
                    gym_id.to_string(),
                    change.event_id.to_string(),
                    &change.entity_type,
                    change.entity_id.to_string(),
                    &change.operation,
                    &payload_str,
                    &now,
                ],
            ).map_err(|e| AppError::Database(format!("Failed to record in sync_inbox: {}", e)))?;

            // 2. Apply domain mutation to local table
            match change.entity_type.as_str() {
                "gym_member" => {
                    if change.operation == "CREATE" || change.operation == "UPDATE" {
                        let full_name = change.payload.get("fullName")
                            .or_else(|| change.payload.get("full_name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Member");
                        let phone = change.payload.get("phone")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0000000000");
                        let email = change.payload.get("email").and_then(|v| v.as_str());
                        let member_code = change.payload.get("memberCode")
                            .or_else(|| change.payload.get("member_code"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("GD-MEM");
                        let status = change.payload.get("membershipStatus")
                            .or_else(|| change.payload.get("membership_status"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("ACTIVE");

                        let joined_at = change.payload.get("joinedAt")
                            .or_else(|| change.payload.get("joined_at"))
                            .and_then(|v| v.as_str())
                            .unwrap_or(&now);
                        let created_by = change.payload.get("createdByUserId")
                            .or_else(|| change.payload.get("created_by_user_id"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("SYSTEM_SYNC");
                        let updated_by = change.payload.get("updatedByUserId")
                            .or_else(|| change.payload.get("updated_by_user_id"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("SYSTEM_SYNC");

                        tx.execute(
                            "INSERT INTO gym_members (
                                id, gym_id, member_code, full_name, phone, email, membership_status,
                                joined_at, created_by_user_id, updated_by_user_id, created_at, updated_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
                            ON CONFLICT(id) DO UPDATE SET
                                member_code = excluded.member_code,
                                full_name = excluded.full_name,
                                phone = excluded.phone,
                                email = excluded.email,
                                membership_status = excluded.membership_status,
                                joined_at = excluded.joined_at,
                                updated_by_user_id = excluded.updated_by_user_id,
                                updated_at = excluded.updated_at",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                member_code,
                                full_name,
                                phone,
                                email,
                                status,
                                joined_at,
                                created_by,
                                updated_by,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply gym_member mutation: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "UPDATE gym_members SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND gym_id = ?3",
                            params![now, change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete gym_member: {}", e)))?;
                    }
                }
                "membership_plan" => {
                    if change.operation == "CREATE" || change.operation == "UPDATE" {
                        let plan_name = change.payload.get("planName")
                            .or_else(|| change.payload.get("plan_name"))
                            .or_else(|| change.payload.get("name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Standard Plan");
                        let duration_days = change.payload.get("durationDays")
                            .or_else(|| change.payload.get("duration_days"))
                            .and_then(|v| v.as_i64())
                            .unwrap_or(30) as i32;
                        let price = change.payload.get("price")
                            .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
                            .unwrap_or(0.0);
                        let is_active = change.payload.get("isActive")
                            .or_else(|| change.payload.get("is_active"))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(true);
                        let created_by = change.payload.get("createdByUserId")
                            .or_else(|| change.payload.get("created_by_user_id"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("SYSTEM_SYNC");
                        let updated_by = change.payload.get("updatedByUserId")
                            .or_else(|| change.payload.get("updated_by_user_id"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("SYSTEM_SYNC");

                        tx.execute(
                            "INSERT INTO membership_plans (
                                id, gym_id, plan_name, duration_days, price, is_active,
                                created_by_user_id, updated_by_user_id, created_at, updated_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
                            ON CONFLICT(id) DO UPDATE SET
                                plan_name = excluded.plan_name,
                                duration_days = excluded.duration_days,
                                price = excluded.price,
                                is_active = excluded.is_active,
                                updated_by_user_id = excluded.updated_by_user_id,
                                updated_at = excluded.updated_at",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                plan_name,
                                duration_days,
                                price,
                                is_active,
                                created_by,
                                updated_by,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply membership_plan mutation: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "DELETE FROM membership_plans WHERE id = ?1 AND gym_id = ?2",
                            params![change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete membership_plan: {}", e)))?;
                    }
                }
                "payment" => {
                    // Immutable financial record
                    let amount = change.payload.get("amount")
                        .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok())))
                        .unwrap_or(0.0);
                    let payment_method = change.payload.get("paymentMethod")
                        .or_else(|| change.payload.get("payment_method"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("CASH");
                    let member_id = change.payload.get("memberId")
                        .or_else(|| change.payload.get("member_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    tx.execute(
                        "INSERT INTO payments (
                            id, gym_id, member_id, amount, payment_method, payment_status, payment_date, created_at
                        ) VALUES (?1, ?2, ?3, ?4, ?5, 'COMPLETED', ?6, ?6)
                        ON CONFLICT(id) DO NOTHING",
                        params![
                            change.entity_id.to_string(),
                            gym_id.to_string(),
                            member_id,
                            amount,
                            payment_method,
                            now,
                        ],
                    ).map_err(|e| AppError::Database(format!("Failed to apply payment record: {}", e)))?;
                }
                "attendance" => {
                    // Append-only attendance record
                    let member_id = change.payload.get("memberId")
                        .or_else(|| change.payload.get("member_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let entry_method = change.payload.get("entryMethod")
                        .or_else(|| change.payload.get("attendanceMethod"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("QR_DYNAMIC");

                    tx.execute(
                        "INSERT INTO attendance_logs (
                            id, gym_id, member_id, check_in_time, check_in_method, created_at
                        ) VALUES (?1, ?2, ?3, ?4, ?5, ?4)
                        ON CONFLICT(id) DO NOTHING",
                        params![
                            change.entity_id.to_string(),
                            gym_id.to_string(),
                            member_id,
                            now,
                            entry_method,
                        ],
                    ).map_err(|e| AppError::Database(format!("Failed to apply attendance log: {}", e)))?;
                }
                _ => {
                    return Err(AppError::Database(format!("Unsupported entity type in pull batch: {}", change.entity_type)));
                }
            }
        }

        // 3. Atomically advance cursor in sync_state
        tx.execute(
            "INSERT INTO sync_state (key, gym_id, value, updated_at)
             VALUES ('last_applied_server_sequence', ?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            params![gym_id.to_string(), next_cursor.to_string(), now],
        ).map_err(|e| AppError::Database(format!("Failed to advance sync cursor: {}", e)))?;

        tx.execute(
            "INSERT INTO sync_state (key, gym_id, value, updated_at)
             VALUES ('last_sync_at', ?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            params![gym_id.to_string(), now, now],
        ).map_err(|e| AppError::Database(format!("Failed to record last_sync_at: {}", e)))?;

        // 4. Commit atomic transaction
        tx.commit().map_err(|e| AppError::Database(format!("Failed to commit pull transaction: {}", e)))?;

        Ok(())
    }

    /// Gets the current cursor for incremental pull.
    pub fn get_cursor(conn: &Connection, gym_id: &Uuid) -> Result<i64, AppError> {
        let cursor: Option<String> = conn.query_row(
            "SELECT value FROM sync_state WHERE key = 'last_applied_server_sequence' AND gym_id = ?1",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(None);

        Ok(cursor.and_then(|s| s.parse::<i64>().ok()).unwrap_or(0))
    }

    /// Sets the cursor after applying pull changes.
    pub fn set_cursor(conn: &Connection, gym_id: &Uuid, sequence: i64) -> Result<(), AppError> {
        conn.execute(
            "INSERT INTO sync_state (key, gym_id, value, updated_at)
             VALUES ('last_applied_server_sequence', ?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            params![gym_id.to_string(), sequence.to_string(), Utc::now().to_rfc3339()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Returns aggregate sync outbox statistics.
    pub fn get_outbox_stats(conn: &Connection, gym_id: &Uuid) -> Result<SyncStats, AppError> {
        let pending_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1 AND status = 'PENDING'",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(0);

        let in_flight_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1 AND status = 'IN_FLIGHT'",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(0);

        let synced_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1 AND status = 'SYNCED'",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(0);

        let failed_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1 AND status = 'FAILED'",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(0);

        let last_seq = Self::get_cursor(conn, gym_id)?;

        let last_sync_at: Option<String> = conn.query_row(
            "SELECT value FROM sync_state WHERE key = 'last_sync_at' AND gym_id = ?1",
            params![gym_id.to_string()],
            |row| row.get(0),
        ).unwrap_or(None);

        Ok(SyncStats {
            pending_count,
            in_flight_count,
            synced_count,
            failed_count,
            last_synced_sequence: last_seq,
            last_sync_at,
        })
    }
}
