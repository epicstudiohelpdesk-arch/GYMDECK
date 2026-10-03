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
                ON CONFLICT(gym_id, server_sequence) DO NOTHING",
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

                        let gender = change.payload.get("gender").and_then(|v| v.as_str());
                        let dob = change.payload.get("dob").and_then(|v| v.as_str());
                        let address = change.payload.get("address").and_then(|v| v.as_str());
                        let notes = change.payload.get("notes").and_then(|v| v.as_str());
                        let alternate_phone = change.payload.get("alternatePhone")
                            .or_else(|| change.payload.get("alternate_phone"))
                            .and_then(|v| v.as_str());

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
                                id, gym_id, member_code, full_name, phone, alternate_phone, email,
                                gender, dob, address, notes, membership_status,
                                joined_at, created_by_user_id, updated_by_user_id, created_at, updated_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?16)
                            ON CONFLICT(id) DO UPDATE SET
                                member_code = excluded.member_code,
                                full_name = excluded.full_name,
                                phone = excluded.phone,
                                alternate_phone = excluded.alternate_phone,
                                email = excluded.email,
                                gender = excluded.gender,
                                dob = excluded.dob,
                                address = excluded.address,
                                notes = excluded.notes,
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
                                alternate_phone,
                                email,
                                gender,
                                dob,
                                address,
                                notes,
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
                        let price_minor_units = change.payload.get("priceMinorUnits")
                            .or_else(|| change.payload.get("price_minor_units"))
                            .and_then(|v| v.as_i64())
                            .unwrap_or_else(|| {
                                change.payload.get("price")
                                    .and_then(|v| crate::utils::money::json_value_to_minor_units(v).ok())
                                    .unwrap_or(0)
                            });
                        let price_real = price_minor_units as f64 / 100.0;
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
                                id, gym_id, plan_name, duration_days, price_minor_units, price, is_active,
                                created_by_user_id, updated_by_user_id, created_at, updated_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
                            ON CONFLICT(id) DO UPDATE SET
                                plan_name = excluded.plan_name,
                                duration_days = excluded.duration_days,
                                price_minor_units = excluded.price_minor_units,
                                price = excluded.price,
                                is_active = excluded.is_active,
                                updated_by_user_id = excluded.updated_by_user_id,
                                updated_at = excluded.updated_at",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                plan_name,
                                duration_days,
                                price_minor_units,
                                price_real,
                                is_active,
                                created_by,
                                updated_by,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply membership_plan mutation: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "UPDATE membership_plans SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND gym_id = ?3",
                            params![now, change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete membership_plan: {}", e)))?;
                    }
                }
                "payment" => {
                    // Immutable financial record
                    let amount_minor_units = change.payload.get("amountMinorUnits")
                        .or_else(|| change.payload.get("amount_minor_units"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or_else(|| {
                            change.payload.get("amount")
                                .and_then(|v| crate::utils::money::json_value_to_minor_units(v).ok())
                                .unwrap_or(0)
                        });
                    let amount_real = amount_minor_units as f64 / 100.0;
                    let payment_method = change.payload.get("paymentMethod")
                        .or_else(|| change.payload.get("payment_method"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("CASH");
                    let member_id = change.payload.get("memberId")
                        .or_else(|| change.payload.get("member_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let status = change.payload.get("status")
                        .or_else(|| change.payload.get("paymentStatus"))
                        .or_else(|| change.payload.get("payment_status"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("COMPLETED");
                    let transaction_ref = change.payload.get("transactionReference")
                        .or_else(|| change.payload.get("transaction_reference"))
                        .or_else(|| change.payload.get("receiptNumber"))
                        .or_else(|| change.payload.get("receipt_number"))
                        .and_then(|v| v.as_str());
                    let payment_date = change.payload.get("paymentDate")
                        .or_else(|| change.payload.get("payment_date"))
                        .or_else(|| change.payload.get("paidAt"))
                        .or_else(|| change.payload.get("paid_at"))
                        .and_then(|v| v.as_str())
                        .unwrap_or(&now);
                    let created_by = change.payload.get("createdByUserId")
                        .or_else(|| change.payload.get("created_by_user_id"))
                        .or_else(|| change.payload.get("actorUserId"))
                        .or_else(|| change.payload.get("actor_user_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("SYSTEM_SYNC");

                    if change.operation == "CREATE" || change.operation == "UPDATE" {
                        tx.execute(
                            "INSERT INTO payments (
                                id, gym_id, member_id, amount_minor_units, amount, payment_method, transaction_reference,
                                payment_date, status, created_by_user_id, created_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                            ON CONFLICT(id) DO UPDATE SET
                                amount_minor_units = excluded.amount_minor_units,
                                amount = excluded.amount,
                                payment_method = excluded.payment_method,
                                transaction_reference = COALESCE(excluded.transaction_reference, payments.transaction_reference),
                                payment_date = excluded.payment_date,
                                status = excluded.status",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                member_id,
                                amount_minor_units,
                                amount_real,
                                payment_method,
                                transaction_ref,
                                payment_date,
                                status,
                                created_by,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply payment record: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "UPDATE payments SET deleted_at = ?1, deleted_by_user_id = ?2 WHERE id = ?3 AND gym_id = ?4",
                            params![now, created_by, change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete payment: {}", e)))?;
                    }
                }
                "attendance" | "attendance_log" => {
                    // Attendance record with mutable checkout session support
                    let member_id = change.payload.get("memberId")
                        .or_else(|| change.payload.get("member_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let check_in_time = change.payload.get("checkInTime")
                        .or_else(|| change.payload.get("check_in_time"))
                        .and_then(|v| v.as_str())
                        .unwrap_or(&now);
                    let check_out_time = change.payload.get("checkOutTime")
                        .or_else(|| change.payload.get("check_out_time"))
                        .and_then(|v| v.as_str());
                    let method = change.payload.get("attendanceMethod")
                        .or_else(|| change.payload.get("attendance_method"))
                        .or_else(|| change.payload.get("entryMethod"))
                        .or_else(|| change.payload.get("entry_method"))
                        .or_else(|| change.payload.get("checkInMethod"))
                        .or_else(|| change.payload.get("check_in_method"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("MANUAL");
                    let recorded_by = change.payload.get("recordedByUserId")
                        .or_else(|| change.payload.get("recorded_by_user_id"))
                        .or_else(|| change.payload.get("actorUserId"))
                        .or_else(|| change.payload.get("actor_user_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("SYSTEM_SYNC");

                    if change.operation == "CREATE" || change.operation == "UPDATE" {
                        tx.execute(
                            "INSERT INTO attendance_logs (
                                id, gym_id, member_id, check_in_time, check_out_time, attendance_method,
                                recorded_by_user_id, created_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                            ON CONFLICT(id) DO UPDATE SET
                                check_out_time = COALESCE(excluded.check_out_time, attendance_logs.check_out_time),
                                attendance_method = excluded.attendance_method",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                member_id,
                                check_in_time,
                                check_out_time,
                                method,
                                recorded_by,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply attendance log: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "UPDATE attendance_logs SET deleted_at = ?1 WHERE id = ?2 AND gym_id = ?3",
                            params![now, change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete attendance log: {}", e)))?;
                    }
                }
                "member_membership" => {
                    let member_id = change.payload.get("memberId")
                        .or_else(|| change.payload.get("member_id"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let plan_id = change.payload.get("planId")
                        .or_else(|| change.payload.get("plan_id"))
                        .and_then(|v| v.as_str());
                    let status = change.payload.get("membershipStatus")
                        .or_else(|| change.payload.get("membership_status"))
                        .or_else(|| change.payload.get("status"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("ACTIVE");
                    let expires_at = change.payload.get("endDate")
                        .or_else(|| change.payload.get("end_date"))
                        .or_else(|| change.payload.get("expiresAt"))
                        .or_else(|| change.payload.get("expires_at"))
                        .and_then(|v| v.as_str());

                    if !member_id.is_empty() {
                        tx.execute(
                            "UPDATE gym_members
                             SET membership_plan_id = COALESCE(?1, membership_plan_id),
                                 membership_status = ?2,
                                 expires_at = COALESCE(?3, expires_at),
                                 updated_at = ?4
                             WHERE id = ?5 AND gym_id = ?6",
                            params![
                                plan_id,
                                status,
                                expires_at,
                                now,
                                member_id,
                                gym_id.to_string(),
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply member_membership mutation: {}", e)))?;
                    }
                }
                "trainer" | "trainers" => {
                    if change.operation == "CREATE" || change.operation == "UPDATE" {
                        let full_name = change.payload.get("fullName")
                            .or_else(|| change.payload.get("full_name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Trainer");
                        let phone = change.payload.get("phone")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0000000000");
                        let specialization = change.payload.get("specialization")
                            .and_then(|v| v.as_str());
                        let is_active = change.payload.get("isActive")
                            .or_else(|| change.payload.get("is_active"))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(true);

                        tx.execute(
                            "INSERT INTO trainers (
                                id, gym_id, full_name, phone, specialization, is_active, created_at, updated_at
                            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
                            ON CONFLICT(id) DO UPDATE SET
                                full_name = excluded.full_name,
                                phone = excluded.phone,
                                specialization = excluded.specialization,
                                is_active = excluded.is_active,
                                updated_at = excluded.updated_at",
                            params![
                                change.entity_id.to_string(),
                                gym_id.to_string(),
                                full_name,
                                phone,
                                specialization,
                                is_active,
                                now,
                            ],
                        ).map_err(|e| AppError::Database(format!("Failed to apply trainer mutation: {}", e)))?;
                    } else if change.operation == "DELETE" {
                        tx.execute(
                            "UPDATE trainers SET deleted_at = ?1, updated_at = ?1, is_active = 0 WHERE id = ?2 AND gym_id = ?3",
                            params![now, change.entity_id.to_string(), gym_id.to_string()],
                        ).map_err(|e| AppError::Database(format!("Failed to delete trainer: {}", e)))?;
                    }
                }
                "trainer_assignment" | "pt_package" | "pt_session" => {
                    // PT domain entities are recorded in sync_inbox for sequence and idempotency tracking.
                    tracing::info!("Recorded PT entity in sync_inbox: entity_type={}, id={}", change.entity_type, change.entity_id);
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
             ON CONFLICT(key, gym_id) DO UPDATE SET value = ?2, updated_at = ?3",
            params![gym_id.to_string(), next_cursor.to_string(), now],
        ).map_err(|e| AppError::Database(format!("Failed to advance sync cursor: {}", e)))?;

        tx.execute(
            "INSERT INTO sync_state (key, gym_id, value, updated_at)
             VALUES ('last_sync_at', ?1, ?2, ?3)
             ON CONFLICT(key, gym_id) DO UPDATE SET value = ?2, updated_at = ?3",
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
             ON CONFLICT(key, gym_id) DO UPDATE SET value = ?2, updated_at = ?3",
            params![gym_id.to_string(), sequence.to_string(), Utc::now().to_rfc3339()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Sets an arbitrary key-value metadata entry in sync_state for a gym.
    pub fn set_sync_state(conn: &Connection, gym_id: &Uuid, key: &str, value: &str) -> Result<(), AppError> {
        conn.execute(
            "INSERT INTO sync_state (key, gym_id, value, updated_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(key, gym_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, gym_id.to_string(), value, Utc::now().to_rfc3339()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Pre-records an acknowledged push event into sync_inbox to prevent echo re-application during subsequent pull.
    pub fn record_inbox_ack(conn: &Connection, gym_id: &Uuid, server_sequence: i64, event_id: &Uuid) -> Result<(), AppError> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sync_inbox (
                server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload, applied_at
            ) VALUES (?1, ?2, ?3, 'SYNC_ACK', ?3, 'ACK', '{}', ?4)
            ON CONFLICT(gym_id, server_sequence) DO NOTHING",
            params![
                server_sequence,
                gym_id.to_string(),
                event_id.to_string(),
                now,
            ],
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

    /// Scans local SQLite business records (plans, members, payments, attendance, trainers)
    /// for the given gym_id that have not yet been recorded in sync_outbox or sync_inbox,
    /// and enqueues idempotent 'CREATE' outbox events.
    /// Returns the number of events staged.
    pub fn stage_unpushed_local_records_to_outbox(
        conn: &mut Connection,
        gym_id: &Uuid,
    ) -> Result<usize, AppError> {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        let mut staged_count = 0;
        let gym_id_str = gym_id.to_string();
        let now = Utc::now().to_rfc3339();

        // 1. Stage Membership Plans
        {
            let mut stmt = tx.prepare(
                "SELECT id, plan_name, duration_days, price_minor_units, price, is_active
                 FROM membership_plans
                 WHERE gym_id = ?1 AND deleted_at IS NULL
                   AND id NOT IN (SELECT entity_id FROM sync_outbox WHERE gym_id = ?1 AND entity_type = 'membership_plan')"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt.query_map(params![gym_id_str], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, i64>(3).unwrap_or(0),
                    r.get::<_, Option<f64>>(4)?,
                    r.get::<_, bool>(5).unwrap_or(true),
                ))
            }).map_err(|e| AppError::Database(e.to_string()))?;

            let mut plans = Vec::new();
            for r in rows {
                plans.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }

            for (plan_id, plan_name, duration_days, price_minor_units, price, is_active) in plans {
                let payload = serde_json::json!({
                    "id": plan_id,
                    "gymId": gym_id_str,
                    "planName": plan_name,
                    "durationDays": duration_days,
                    "priceMinorUnits": price_minor_units,
                    "price": price,
                    "isActive": is_active,
                });
                let id = Uuid::new_v4();
                let event_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO sync_outbox (
                        id, event_id, gym_id, entity_type, entity_id, operation, payload,
                        created_at, attempt_count, status
                    ) VALUES (?1, ?2, ?3, 'membership_plan', ?4, 'CREATE', ?5, ?6, 0, 'PENDING')",
                    params![
                        id.to_string(),
                        event_id.to_string(),
                        gym_id_str,
                        plan_id,
                        payload.to_string(),
                        now,
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
                staged_count += 1;
            }
        }

        // 2. Stage Gym Members
        {
            let mut stmt = tx.prepare(
                "SELECT id, member_code, full_name, phone, alternate_phone, email, gender, dob, address,
                        membership_status, joined_at, expires_at, notes, membership_plan_id
                 FROM gym_members
                 WHERE gym_id = ?1 AND deleted_at IS NULL
                   AND id NOT IN (SELECT entity_id FROM sync_outbox WHERE gym_id = ?1 AND entity_type = 'gym_member')"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt.query_map(params![gym_id_str], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, Option<String>>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, Option<String>>(6)?,
                    r.get::<_, Option<String>>(7)?,
                    r.get::<_, Option<String>>(8)?,
                    r.get::<_, String>(9)?,
                    r.get::<_, String>(10)?,
                    r.get::<_, Option<String>>(11)?,
                    r.get::<_, Option<String>>(12)?,
                    r.get::<_, Option<String>>(13)?,
                ))
            }).map_err(|e| AppError::Database(e.to_string()))?;

            let mut members = Vec::new();
            for r in rows {
                members.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }

            for (
                mem_id, member_code, full_name, phone, alt_phone, email, gender, dob, address,
                membership_status, joined_at, expires_at, notes, plan_id
            ) in members {
                let payload = serde_json::json!({
                    "id": mem_id,
                    "gymId": gym_id_str,
                    "memberCode": member_code,
                    "fullName": full_name,
                    "phone": phone,
                    "alternatePhone": alt_phone,
                    "email": email,
                    "gender": gender,
                    "dob": dob,
                    "address": address,
                    "membershipStatus": membership_status,
                    "joinedAt": joined_at,
                    "expiresAt": expires_at,
                    "notes": notes,
                    "membershipPlanId": plan_id,
                });
                let id = Uuid::new_v4();
                let event_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO sync_outbox (
                        id, event_id, gym_id, entity_type, entity_id, operation, payload,
                        created_at, attempt_count, status
                    ) VALUES (?1, ?2, ?3, 'gym_member', ?4, 'CREATE', ?5, ?6, 0, 'PENDING')",
                    params![
                        id.to_string(),
                        event_id.to_string(),
                        gym_id_str,
                        mem_id,
                        payload.to_string(),
                        now,
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
                staged_count += 1;
            }
        }

        // 3. Stage Payments (if any)
        {
            let mut stmt = tx.prepare(
                "SELECT id, member_id, amount_minor_units, payment_method, payment_date, status
                 FROM payments
                 WHERE gym_id = ?1 AND deleted_at IS NULL
                   AND id NOT IN (SELECT entity_id FROM sync_outbox WHERE gym_id = ?1 AND entity_type = 'payment')"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt.query_map(params![gym_id_str], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2).unwrap_or(0),
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                ))
            }).map_err(|e| AppError::Database(e.to_string()))?;

            let mut payments = Vec::new();
            for r in rows {
                payments.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }

            for (pay_id, member_id, amount_minor_units, payment_method, payment_date, status) in payments {
                let payload = serde_json::json!({
                    "id": pay_id,
                    "gymId": gym_id_str,
                    "memberId": member_id,
                    "amountMinorUnits": amount_minor_units,
                    "paymentMethod": payment_method,
                    "paymentDate": payment_date,
                    "status": status,
                });
                let id = Uuid::new_v4();
                let event_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO sync_outbox (
                        id, event_id, gym_id, entity_type, entity_id, operation, payload,
                        created_at, attempt_count, status
                    ) VALUES (?1, ?2, ?3, 'payment', ?4, 'CREATE', ?5, ?6, 0, 'PENDING')",
                    params![
                        id.to_string(),
                        event_id.to_string(),
                        gym_id_str,
                        pay_id,
                        payload.to_string(),
                        now,
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
                staged_count += 1;
            }
        }

        // 4. Stage Attendance Logs (if any)
        {
            let mut stmt = tx.prepare(
                "SELECT id, member_id, check_in_time, attendance_method
                 FROM attendance_logs
                 WHERE gym_id = ?1 AND deleted_at IS NULL
                   AND id NOT IN (SELECT entity_id FROM sync_outbox WHERE gym_id = ?1 AND (entity_type = 'attendance' OR entity_type = 'attendance_log'))"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt.query_map(params![gym_id_str], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, Option<String>>(3)?,
                ))
            }).map_err(|e| AppError::Database(e.to_string()))?;

            let mut logs = Vec::new();
            for r in rows {
                logs.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }

            for (att_id, member_id, check_in_time, method) in logs {
                let payload = serde_json::json!({
                    "id": att_id,
                    "gymId": gym_id_str,
                    "memberId": member_id,
                    "checkInTime": check_in_time,
                    "attendanceMethod": method.unwrap_or_else(|| "MANUAL".into()),
                });
                let id = Uuid::new_v4();
                let event_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO sync_outbox (
                        id, event_id, gym_id, entity_type, entity_id, operation, payload,
                        created_at, attempt_count, status
                    ) VALUES (?1, ?2, ?3, 'attendance_log', ?4, 'CREATE', ?5, ?6, 0, 'PENDING')",
                    params![
                        id.to_string(),
                        event_id.to_string(),
                        gym_id_str,
                        att_id,
                        payload.to_string(),
                        now,
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
                staged_count += 1;
            }
        }

        // 5. Stage Trainers (if any)
        {
            let mut stmt = tx.prepare(
                "SELECT id, full_name, phone, specialization, is_active
                 FROM trainers
                 WHERE gym_id = ?1 AND deleted_at IS NULL
                   AND id NOT IN (SELECT entity_id FROM sync_outbox WHERE gym_id = ?1 AND entity_type = 'trainer')"
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let rows = stmt.query_map(params![gym_id_str], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, Option<String>>(3)?,
                    r.get::<_, bool>(4).unwrap_or(true),
                ))
            }).map_err(|e| AppError::Database(e.to_string()))?;

            let mut trainers = Vec::new();
            for r in rows {
                trainers.push(r.map_err(|e| AppError::Database(e.to_string()))?);
            }

            for (tr_id, full_name, phone, spec, is_active) in trainers {
                let payload = serde_json::json!({
                    "id": tr_id,
                    "gymId": gym_id_str,
                    "fullName": full_name,
                    "phone": phone,
                    "specialization": spec,
                    "isActive": is_active,
                });
                let id = Uuid::new_v4();
                let event_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO sync_outbox (
                        id, event_id, gym_id, entity_type, entity_id, operation, payload,
                        created_at, attempt_count, status
                    ) VALUES (?1, ?2, ?3, 'trainer', ?4, 'CREATE', ?5, ?6, 0, 'PENDING')",
                    params![
                        id.to_string(),
                        event_id.to_string(),
                        gym_id_str,
                        tr_id,
                        payload.to_string(),
                        now,
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
                staged_count += 1;
            }
        }

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        tracing::info!("[SyncRepository] Staged {} unpushed local business records to outbox for gym {}", staged_count, gym_id);
        Ok(staged_count)
    }
}
