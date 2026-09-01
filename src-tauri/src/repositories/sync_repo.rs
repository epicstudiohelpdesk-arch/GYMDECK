use rusqlite::{Connection, Transaction, params};
use uuid::Uuid;
use chrono::Utc;
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
    pub status: String, // PENDING, IN_FLIGHT, SYNCED, FAILED
    pub error_code: Option<String>,
    pub error_message: Option<String>,
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

    /// Fetches pending or retryable outbox events for transmission to Cloud.
    pub fn get_pending_events(
        conn: &Connection,
        gym_id: &Uuid,
        limit: i64,
    ) -> Result<Vec<SyncOutboxRecord>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, event_id, gym_id, entity_type, entity_id, operation, payload,
                    created_at, attempt_count, last_attempt_at, status, error_code, error_message
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

    /// Marks an event as successfully synced to Cloud.
    pub fn mark_event_synced(
        conn: &Connection,
        event_id: &Uuid,
    ) -> Result<(), AppError> {
        conn.execute(
            "UPDATE sync_outbox
             SET status = 'SYNCED', last_attempt_at = ?1, error_code = NULL, error_message = NULL
             WHERE event_id = ?2",
            params![Utc::now().to_rfc3339(), event_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Ok(())
    }

    /// Increments attempt count and records failure state.
    pub fn mark_event_failed(
        conn: &Connection,
        event_id: &Uuid,
        error_code: &str,
        error_message: &str,
        is_permanent: bool,
    ) -> Result<(), AppError> {
        let status = if is_permanent { "FAILED" } else { "PENDING" };
        conn.execute(
            "UPDATE sync_outbox
             SET status = ?1, attempt_count = attempt_count + 1, last_attempt_at = ?2,
                 error_code = ?3, error_message = ?4
             WHERE event_id = ?5",
            params![
                status,
                Utc::now().to_rfc3339(),
                error_code,
                error_message,
                event_id.to_string()
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

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
