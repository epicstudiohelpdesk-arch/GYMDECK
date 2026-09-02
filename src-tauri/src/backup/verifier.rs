use std::path::Path;
use sha2::{Digest, Sha256};
use rusqlite::Connection;
use crate::errors::AppError;
use super::metadata::BackupVerificationResult;

pub struct BackupVerifier;

impl BackupVerifier {
    /// Computes SHA-256 checksum of a file.
    pub fn compute_sha256(path: &Path) -> Result<String, AppError> {
        let bytes = std::fs::read(path).map_err(|e| AppError::Backup(format!("Failed to read backup for checksum: {}", e)))?;
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        Ok(hex::encode(hasher.finalize()))
    }

    /// Verifies the structural, cryptographic, and referential integrity of a backup database file.
    pub fn verify_backup_file(path: &Path, key: &str, backup_id: &str) -> Result<BackupVerificationResult, AppError> {
        if !path.exists() {
            return Err(AppError::Backup(format!("Backup file does not exist at {:?}", path)));
        }

        let metadata = std::fs::metadata(path)
            .map_err(|e| AppError::Backup(format!("Failed to read backup metadata: {}", e)))?;
        let size_bytes = metadata.len();
        if size_bytes == 0 {
            return Err(AppError::Backup("Backup file is empty (0 bytes)".to_string()));
        }

        let checksum_sha256 = Self::compute_sha256(path)?;

        // 1. Verify that the backup cannot be opened as plaintext or with wrong key (Encryption Proof)
        let wrong_key_conn = Connection::open(path)
            .map_err(|e| AppError::Backup(format!("Failed to open backup connection: {}", e)))?;
        let _ = wrong_key_conn.execute_batch("PRAGMA key = 'invalid_wrong_key_verification_test_999';");
        let wrong_key_check: Result<String, _> = wrong_key_conn.query_row("PRAGMA quick_check;", [], |r| r.get(0));
        let is_encrypted_and_protected = wrong_key_check.is_err() || wrong_key_check.unwrap_or_default() != "ok";
        drop(wrong_key_conn);

        if !is_encrypted_and_protected {
            return Err(AppError::Backup("Security Violation: Backup database appears to be unencrypted plaintext!".to_string()));
        }

        // 2. Open with authoritative key
        let conn = Connection::open(path)
            .map_err(|e| AppError::Backup(format!("Failed to open backup for verification: {}", e)))?;
        
        let pragma_key = format!("PRAGMA key = '{}';", key);
        conn.execute_batch(&pragma_key)
            .map_err(|e| AppError::Backup(format!("Failed to apply key to backup: {}", e)))?;

        // 3. Run PRAGMA quick_check
        let integrity_check: String = conn.query_row("PRAGMA quick_check;", [], |r| r.get(0))
            .map_err(|e| AppError::Backup(format!("Integrity check failed on backup: {}", e)))?;

        if integrity_check != "ok" {
            return Err(AppError::Backup(format!("Backup failed quick_check with status: {}", integrity_check)));
        }

        // 4. Run PRAGMA foreign_key_check
        let mut fk_stmt = conn.prepare("PRAGMA foreign_key_check;")
            .map_err(|e| AppError::Backup(format!("Foreign key check failed: {}", e)))?;
        let fk_violations: Vec<String> = fk_stmt.query_map([], |row| {
            let table: String = row.get(0)?;
            Ok(table)
        })
        .map_err(|e| AppError::Backup(format!("Foreign key check query error: {}", e)))?
        .filter_map(Result::ok)
        .collect();

        let foreign_keys_valid = fk_violations.is_empty();

        // 5. Verify presence of critical tables
        let mut tables_stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table';")
            .map_err(|e| AppError::Backup(format!("Failed to query tables: {}", e)))?;
        let tables: Vec<String> = tables_stmt.query_map([], |row| row.get(0))
            .map_err(|e| AppError::Backup(format!("Table scan error: {}", e)))?
            .filter_map(Result::ok)
            .collect();

        let required_tables = [
            "gym_members",
            "membership_plans",
            "payments",
            "attendance_logs",
            "sync_outbox",
            "sync_state",
            "sync_inbox",
            "schema_version",
        ];

        let mut verified_tables = Vec::new();
        for req in required_tables {
            if tables.iter().any(|t| t == req) {
                verified_tables.push(req.to_string());
            } else {
                tracing::warn!("Critical table missing from backup: {}", req);
            }
        }

        Ok(BackupVerificationResult {
            backup_id: backup_id.to_string(),
            file_path: path.to_string_lossy().to_string(),
            size_bytes,
            checksum_sha256,
            integrity_check,
            foreign_keys_valid,
            tables_verified: verified_tables,
            is_encrypted_and_protected,
            is_valid: foreign_keys_valid,
        })
    }
}
