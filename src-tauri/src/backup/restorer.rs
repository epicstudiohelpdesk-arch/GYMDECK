use std::path::Path;
use rusqlite::Connection;
use uuid::Uuid;
use crate::errors::AppError;
use super::metadata::RestoreValidationReport;

pub struct RestoreEngine;

impl RestoreEngine {
    /// Validates restoring a backup in an isolated staging sandbox.
    /// Never mutates or overwrites the active live database.
    pub fn verify_restore_staging(
        backup_path: &Path,
        key: &str,
        current_live_seq: i64,
    ) -> Result<RestoreValidationReport, AppError> {
        if !backup_path.exists() {
            return Err(AppError::Restore(format!("Backup file not found at {:?}", backup_path)));
        }

        let staging_id = Uuid::new_v4().to_string();
        let staging_dir = std::env::temp_dir().join(format!("gymdeck_staging_restore_{}", staging_id));
        std::fs::create_dir_all(&staging_dir)
            .map_err(|e| AppError::Restore(format!("Failed to create staging directory: {}", e)))?;

        let staging_db_path = staging_dir.join("staging_vault.sqlite");

        // Copy backup to isolated staging
        std::fs::copy(backup_path, &staging_db_path)
            .map_err(|e| AppError::Restore(format!("Failed to stage backup file: {}", e)))?;

        // Open isolated staging connection
        let conn = Connection::open(&staging_db_path)
            .map_err(|e| AppError::Restore(format!("Failed to open staged database: {}", e)))?;

        let pragma_key = format!("PRAGMA key = '{}';", key);
        conn.execute_batch(&pragma_key)
            .map_err(|e| AppError::Restore(format!("Failed to apply key to staged database: {}", e)))?;

        // Integrity verification
        let integrity_check: String = conn.query_row("PRAGMA quick_check;", [], |r| r.get(0))
            .map_err(|e| AppError::Restore(format!("Integrity check failed: {}", e)))?;

        if integrity_check != "ok" {
            let _ = std::fs::remove_dir_all(&staging_dir);
            return Err(AppError::Restore(format!("Staged restore failed quick_check: {}", integrity_check)));
        }

        let schema_version: i64 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version;",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        let total_members: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gym_members WHERE deleted_at IS NULL;",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        let total_payments: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments;",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        let total_attendance: i64 = conn.query_row(
            "SELECT COUNT(*) FROM attendance_logs;",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        // Read restored sync sequence
        let restored_sync_sequence: i64 = conn.query_row(
            "SELECT COALESCE(MAX(server_sequence), 0) FROM sync_inbox;",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        let requires_sync_reconciliation = current_live_seq > restored_sync_sequence;
        let reconciliation_directive = if requires_sync_reconciliation {
            format!(
                "Restored database sequence ({}) is behind live sequence ({}). Desktop must enter RESTORED_FROM_BACKUP reconciliation mode and pull missing server delta [{}..{}] without replaying acknowledged outbox events.",
                restored_sync_sequence, current_live_seq, restored_sync_sequence + 1, current_live_seq
            )
        } else {
            "Restored database sequence is fully aligned with cloud sequence. Safe to resume operational sync.".to_string()
        };

        // Clean up staging sandbox
        drop(conn);
        let _ = std::fs::remove_dir_all(&staging_dir);

        Ok(RestoreValidationReport {
            backup_id: staging_id,
            staging_dir: staging_dir.to_string_lossy().to_string(),
            schema_version,
            integrity_valid: true,
            total_members,
            total_payments,
            total_attendance,
            restored_sync_sequence,
            requires_sync_reconciliation,
            reconciliation_directive,
            is_safe_for_promotion: true,
        })
    }
}
