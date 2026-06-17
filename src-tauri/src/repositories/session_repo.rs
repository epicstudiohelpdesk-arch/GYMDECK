use rusqlite::Transaction;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub device_fingerprint: String,
    pub platform_metadata: Option<String>,
    pub app_version: String,
    pub trusted_device: bool,
    pub remember_me: bool,
    pub revoked: bool,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

pub struct SessionRepository;

impl SessionRepository {
    /// Creates a new session within an explicit transaction boundary.
    pub fn create_session(tx: &Transaction, session: &Session) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO sessions (
                id, user_id, device_fingerprint, platform_metadata, app_version, 
                trusted_device, remember_me, revoked, expires_at, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            (
                session.id.to_string(),
                session.user_id.to_string(),
                &session.device_fingerprint,
                &session.platform_metadata,
                &session.app_version,
                session.trusted_device,
                session.remember_me,
                session.revoked,
                session.expires_at.to_rfc3339(),
                session.created_at.to_rfc3339(),
            ),
        ).map_err(|e| {
            tracing::error!("Failed to create session: {}", e);
            AppError::Database(e.to_string())
        })?;
        
        Ok(())
    }

    /// Revokes a specific session.
    pub fn revoke_session(tx: &Transaction, session_id: &Uuid) -> Result<(), AppError> {
        tx.execute(
            "UPDATE sessions SET revoked = 1 WHERE id = ?1",
            [&session_id.to_string()],
        ).map_err(|e| {
            tracing::error!("Failed to revoke session: {}", e);
            AppError::Database(e.to_string())
        })?;
        Ok(())
    }
}
