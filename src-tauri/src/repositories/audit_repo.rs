use rusqlite::Transaction;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub event_type: String,
    pub event_metadata: Option<String>,
    pub device_fingerprint: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

pub struct AuditRepository;

impl AuditRepository {
    /// Appends an immutable audit log entry.
    pub fn log_event(tx: &Transaction, log: &AuditLog) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO audit_logs (
                id, user_id, event_type, event_metadata, device_fingerprint, ip_address, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                log.id.to_string(),
                log.user_id.map(|id| id.to_string()),
                &log.event_type,
                &log.event_metadata,
                &log.device_fingerprint,
                &log.ip_address,
                log.created_at.to_rfc3339(),
            ),
        ).map_err(|e| {
            tracing::error!("Failed to append audit log: {}", e);
            AppError::Database(e.to_string())
        })?;
        
        Ok(())
    }
}
