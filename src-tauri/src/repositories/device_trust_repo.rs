use rusqlite::Transaction;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceTrust {
    pub id: Uuid,
    pub user_id: Uuid,
    pub fingerprint_hash: String,
    pub trust_score: i32,
    pub last_validated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

pub struct DeviceTrustRepository;

impl DeviceTrustRepository {
    /// Upserts a device trust record based on the fingerprint hash.
    pub fn upsert_trust(tx: &Transaction, trust: &DeviceTrust) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO device_trust (
                id, user_id, fingerprint_hash, trust_score, last_validated_at, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(fingerprint_hash) DO UPDATE SET
                trust_score = excluded.trust_score,
                last_validated_at = excluded.last_validated_at",
            (
                trust.id.to_string(),
                trust.user_id.to_string(),
                &trust.fingerprint_hash,
                trust.trust_score,
                trust.last_validated_at.to_rfc3339(),
                trust.created_at.to_rfc3339(),
            ),
        ).map_err(|e| {
            tracing::error!("Failed to upsert device trust: {}", e);
            AppError::Database(e.to_string())
        })?;
        
        Ok(())
    }
}
