use rusqlite::Transaction;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;
use sha2::{Sha256, Digest};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptedBackup {
    pub id: Uuid,
    pub snapshot_version: i32,
    pub schema_version: i32,
    pub encryption_version: i32,
    pub integrity_checksum: String,
    pub app_version: String,
    pub created_at: DateTime<Utc>,
}

pub struct BackupRepository;

impl BackupRepository {
    /// Generates a SHA-256 integrity checksum for a physical backup file.
    pub fn generate_file_checksum(file_path: &Path) -> Result<String, AppError> {
        let file_bytes = std::fs::read(file_path)
            .map_err(|e| AppError::Database(format!("Backup read error: {}", e)))?;
        
        let mut hasher = Sha256::new();
        hasher.update(&file_bytes);
        Ok(hex::encode(hasher.finalize()))
    }

    /// Records the metadata of a successfully exported SQLCipher backup.
    pub fn record_backup(tx: &Transaction, backup: &EncryptedBackup) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO encrypted_backups (
                id, snapshot_version, schema_version, encryption_version, 
                integrity_checksum, app_version, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            (
                backup.id.to_string(),
                backup.snapshot_version,
                backup.schema_version,
                backup.encryption_version,
                &backup.integrity_checksum,
                &backup.app_version,
                backup.created_at.to_rfc3339(),
            ),
        ).map_err(|e| {
            tracing::error!("Failed to record encrypted backup metadata: {}", e);
            AppError::Database(e.to_string())
        })?;
        
        Ok(())
    }
}
