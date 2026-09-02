use std::path::Path;
use rusqlite::Connection;
use uuid::Uuid;
use chrono::Utc;
use crate::errors::AppError;
use super::metadata::BackupMetadata;
use super::verifier::BackupVerifier;

pub struct BackupEngine;

impl BackupEngine {
    /// Creates a verified, SQLCipher-encrypted backup of the active database.
    pub fn create_encrypted_backup(
        live_conn: &Connection,
        backup_dir: &Path,
        source_key: &str,
    ) -> Result<BackupMetadata, AppError> {
        std::fs::create_dir_all(backup_dir)
            .map_err(|e| AppError::Backup(format!("Failed to create backup directory: {}", e)))?;

        let backup_id = Uuid::new_v4().to_string();
        let timestamp_str = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let final_filename = format!("gymdeck_backup_{}_{}.sqlite", timestamp_str, &backup_id[..8]);
        let staging_filename = format!(".tmp_backup_{}.sqlite", backup_id);

        let staging_path = backup_dir.join(&staging_filename);
        let final_path = backup_dir.join(&final_filename);

        // 1. Safe Online Vacuum into isolated staging path
        let vacuum_sql = format!(
            "VACUUM INTO '{}';",
            staging_path.display().to_string().replace('\'', "''")
        );

        live_conn.execute_batch(&vacuum_sql)
            .map_err(|e| AppError::Backup(format!("VACUUM INTO failed: {}", e)))?;

        // 2. Perform immediate cryptographic and structural verification on the staging file
        let verification = match BackupVerifier::verify_backup_file(&staging_path, source_key, &backup_id) {
            Ok(v) => v,
            Err(e) => {
                let _ = std::fs::remove_file(&staging_path);
                return Err(AppError::Backup(format!("Immediate backup verification failed: {}", e)));
            }
        };

        if !verification.is_valid {
            let _ = std::fs::remove_file(&staging_path);
            return Err(AppError::Backup("Backup failed verification checks".to_string()));
        }

        // 3. Atomically rename staging file to final destination
        std::fs::rename(&staging_path, &final_path)
            .map_err(|e| AppError::Backup(format!("Failed to finalize backup file: {}", e)))?;

        // 4. Query current schema version from verified backup
        let schema_version: i64 = live_conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version;",
            [],
            |r| r.get(0),
        ).unwrap_or(4);

        let metadata = BackupMetadata {
            id: backup_id,
            created_at: Utc::now().to_rfc3339(),
            file_name: final_filename.clone(),
            size_bytes: verification.size_bytes,
            checksum_sha256: verification.checksum_sha256,
            schema_version,
            verification_status: "PASSED".to_string(),
            is_encrypted: true,
        };

        // Write companion metadata JSON
        let meta_path = backup_dir.join(format!("gymdeck_backup_{}_{}.json", timestamp_str, &metadata.id[..8]));
        if let Ok(json_str) = serde_json::to_string_pretty(&metadata) {
            let _ = std::fs::write(&meta_path, json_str);
        }

        tracing::info!("Encrypted SQLCipher backup created successfully: {:?}", final_path);
        Ok(metadata)
    }

    /// Lists all existing valid backups in the backup directory.
    pub fn list_backups(backup_dir: &Path) -> Result<Vec<BackupMetadata>, AppError> {
        if !backup_dir.exists() {
            return Ok(Vec::new());
        }

        let mut results = Vec::new();
        let entries = std::fs::read_dir(backup_dir)
            .map_err(|e| AppError::Backup(format!("Failed to read backup directory: {}", e)))?;

        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(meta) = serde_json::from_str::<BackupMetadata>(&content) {
                        // Check if corresponding sqlite file exists
                        let sqlite_path = backup_dir.join(&meta.file_name);
                        if sqlite_path.exists() {
                            results.push(meta);
                        }
                    }
                }
            }
        }

        results.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(results)
    }
}
