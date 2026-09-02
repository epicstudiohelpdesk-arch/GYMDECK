use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: String,
    pub created_at: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub checksum_sha256: String,
    pub schema_version: i64,
    pub verification_status: String,
    pub is_encrypted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupVerificationResult {
    pub backup_id: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub checksum_sha256: String,
    pub integrity_check: String,
    pub foreign_keys_valid: bool,
    pub tables_verified: Vec<String>,
    pub is_encrypted_and_protected: bool,
    pub is_valid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreValidationReport {
    pub backup_id: String,
    pub staging_dir: String,
    pub schema_version: i64,
    pub integrity_valid: bool,
    pub total_members: i64,
    pub total_payments: i64,
    pub total_attendance: i64,
    pub restored_sync_sequence: i64,
    pub requires_sync_reconciliation: bool,
    pub reconciliation_directive: String,
    pub is_safe_for_promotion: bool,
}
