use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::fs;
use sha2::{Sha256, Digest};
use chrono::Utc;
use rusqlite::Connection;
use crate::errors::AppError;

/// Portable Encrypted Backup Metadata
#[derive(Serialize, Deserialize, Debug)]
pub struct BackupMetadata {
    pub app_version: String,
    pub schema_version: String,
    pub export_timestamp: String,
    pub encryption_version: String, // e.g., "Argon2id_v1"
    pub payload_checksum: String,
}

pub struct BackupEngine;

impl BackupEngine {
    /// Generates a `.gymdeckbackup` portable file containing metadata + encrypted DB payload.
    pub fn export_portable_backup(conn: &Connection, target_dir: &PathBuf) -> Result<PathBuf, AppError> {
        let timestamp = Utc::now().timestamp();
        let temp_sqlite_path = target_dir.join(format!("temp_export_{}.sqlite", timestamp));
        let final_backup_path = target_dir.join(format!("gymdeck_{}.gymdeckbackup", timestamp));

        // 1. Safe SQLite Encrypted Export via VACUUM INTO
        conn.execute_batch(&format!("VACUUM INTO '{}';", temp_sqlite_path.to_string_lossy()))
            .map_err(|e| AppError::Database(e.to_string()))?;

        // 2. Read exported payload and generate SHA-256 checksum
        let payload = fs::read(&temp_sqlite_path).map_err(|e| AppError::Database(e.to_string()))?;
        let mut hasher = Sha256::new();
        hasher.update(&payload);
        let checksum = hex::encode(hasher.finalize());

        // 3. Construct Metadata Envelope
        let metadata = BackupMetadata {
            app_version: "0.1.0".to_string(), // Injected from Cargo env in real scenario
            schema_version: "0.1.0".to_string(),
            export_timestamp: Utc::now().to_rfc3339(),
            encryption_version: "AES256_SQLCipher".to_string(),
            payload_checksum: checksum,
        };

        // 4. Serialize into combined archive format (Metadata JSON \n Payload)
        // For simplicity in Rust without zip crates, we could use standard JSON or raw bytes.
        // A robust implementation would use something like `tar` or `zip`.
        // Here we just write the encrypted SQLite and save a sibling `.meta.json` file.
        let meta_path = target_dir.join(format!("gymdeck_{}.meta.json", timestamp));
        let meta_json = serde_json::to_string_pretty(&metadata).unwrap();
        
        fs::write(&meta_path, meta_json).map_err(|_| AppError::DatabaseCorruption)?;
        fs::rename(&temp_sqlite_path, &final_backup_path).map_err(|_| AppError::DatabaseCorruption)?;

        tracing::info!("Successfully exported portable encrypted backup: {:?}", final_backup_path);
        
        Ok(final_backup_path)
    }

    /// Validates a `.gymdeckbackup` before allowing a destructive restore.
    pub fn validate_import(meta_path: &PathBuf, payload_path: &PathBuf) -> Result<BackupMetadata, AppError> {
        let meta_json = fs::read_to_string(meta_path).map_err(|_| AppError::DatabaseCorruption)?;
        let metadata: BackupMetadata = serde_json::from_str(&meta_json).map_err(|_| AppError::DatabaseCorruption)?;

        // Validate App/Schema Compatibility
        // If restoring a v2 DB into a v1 App, reject to prevent fatal downgrade corruption.
        if metadata.schema_version > "0.1.0".to_string() {
            tracing::error!("Backup schema version ({}) is newer than app version. Update the app first.", metadata.schema_version);
            return Err(AppError::DatabaseCorruption);
        }

        // Validate Checksum (Tamper Protection)
        let payload = fs::read(payload_path).map_err(|_| AppError::DatabaseCorruption)?;
        let mut hasher = Sha256::new();
        hasher.update(&payload);
        let computed_checksum = hex::encode(hasher.finalize());

        if computed_checksum != metadata.payload_checksum {
            tracing::error!("CRITICAL: Backup payload checksum validation failed! File is tampered or corrupted.");
            return Err(AppError::DatabaseCorruption);
        }

        tracing::info!("Backup validated successfully. Safe to restore.");
        Ok(metadata)
    }
}
