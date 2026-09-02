#[cfg(test)]
mod desktop_backup_verification_tests {
    use std::path::PathBuf;
    use rusqlite::Connection;
    use uuid::Uuid;
    use crate::backup::{BackupEngine, BackupVerifier, RestoreEngine};

    fn setup_test_encrypted_db(db_path: &PathBuf, key: &str) -> Connection {
        let conn = Connection::open(db_path).expect("Should open test DB");
        let pragma_key = format!("PRAGMA key = '{}';", key);
        conn.execute_batch(&pragma_key).expect("Should apply key");
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP, description TEXT);
            INSERT INTO schema_version (version, description) VALUES (4, 'Test base');
            CREATE TABLE gym_members (id TEXT PRIMARY KEY, gym_id TEXT, full_name TEXT, phone TEXT, membership_status TEXT, joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME);
            CREATE TABLE membership_plans (id TEXT PRIMARY KEY, gym_id TEXT, name TEXT, price TEXT);
            CREATE TABLE payments (id TEXT PRIMARY KEY, gym_id TEXT, member_id TEXT, amount TEXT, refunded_amount TEXT DEFAULT '0.00', status TEXT, idempotency_key TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE attendance_logs (id TEXT PRIMARY KEY, gym_id TEXT, member_id TEXT, check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE sync_outbox (id TEXT PRIMARY KEY, event_id TEXT UNIQUE, gym_id TEXT, entity_type TEXT, entity_id TEXT, operation TEXT, payload TEXT, status TEXT DEFAULT 'PENDING', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE sync_state (key TEXT PRIMARY KEY, gym_id TEXT, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE sync_inbox (server_sequence INTEGER PRIMARY KEY, gym_id TEXT, event_id TEXT UNIQUE, entity_type TEXT, entity_id TEXT, operation TEXT, payload TEXT, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);
            
            INSERT INTO gym_members (id, gym_id, full_name, phone, membership_status) VALUES ('m-1', 'g-1', 'Alice Walker', '555-0101', 'ACTIVE');
            INSERT INTO payments (id, gym_id, member_id, amount, status, idempotency_key) VALUES ('p-1', 'g-1', 'm-1', '100.00', 'COMPLETED', 'idem-1');
            INSERT INTO attendance_logs (id, gym_id, member_id) VALUES ('a-1', 'g-1', 'm-1');
            INSERT INTO sync_inbox (server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload) VALUES (15, 'g-1', 'ev-15', 'MEMBER', 'm-1', 'INSERT', '{}');
            "
        ).expect("Should create test tables and fixtures");
        conn
    }

    #[test]
    fn test_encrypted_backup_creation_and_encryption_proof() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_backup_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");

        let db_path = temp_dir.join("live_vault.sqlite");
        let backup_dir = temp_dir.join("backups");
        let key = "auth_secret_key_vault_backup_test_123456";

        let live_conn = setup_test_encrypted_db(&db_path, key);

        // 1. Create encrypted backup via engine
        let backup_meta = BackupEngine::create_encrypted_backup(&live_conn, &backup_dir, key)
            .expect("Backup creation must succeed");

        assert!(!backup_meta.id.is_empty());
        assert_eq!(backup_meta.schema_version, 4);
        assert_eq!(backup_meta.verification_status, "PASSED");
        assert!(backup_meta.is_encrypted);

        let backup_path = backup_dir.join(&backup_meta.file_name);
        assert!(backup_path.exists(), "Backup file must exist on disk");
        assert!(backup_meta.size_bytes > 0, "Backup file size must be non-zero");
        assert!(!backup_meta.checksum_sha256.is_empty(), "Checksum must be computed");

        // 2. Proof of Encryption: Wrong key MUST fail quick_check
        let wrong_key_conn = Connection::open(&backup_path).expect("Should open file");
        let _ = wrong_key_conn.execute_batch("PRAGMA key = 'completely_wrong_key_999999';");
        let check_res: Result<String, _> = wrong_key_conn.query_row("PRAGMA quick_check;", [], |r| r.get(0));
        assert!(
            check_res.is_err() || check_res.unwrap() != "ok",
            "Backup must NOT be readable with wrong key (Encryption Proof)"
        );
        drop(wrong_key_conn);

        // 3. Authoritative key MUST succeed and read all data
        let correct_conn = Connection::open(&backup_path).expect("Should open file");
        let pragma_key = format!("PRAGMA key = '{}';", key);
        correct_conn.execute_batch(&pragma_key).expect("Should set key");
        let integrity: String = correct_conn.query_row("PRAGMA quick_check;", [], |r| r.get(0))
            .expect("Should pass quick check");
        assert_eq!(integrity, "ok");

        let member_count: i64 = correct_conn.query_row("SELECT COUNT(*) FROM gym_members;", [], |r| r.get(0))
            .expect("Should count members");
        assert_eq!(member_count, 1);

        drop(correct_conn);
        drop(live_conn);
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_verifier_detects_corrupted_file() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_corrupt_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");

        let corrupt_path = temp_dir.join("corrupted_backup.sqlite");
        // Write random garbage bytes
        std::fs::write(&corrupt_path, b"NOT_A_VALID_SQLITE_CIPHER_DATABASE_GARBAGE_BYTES_1234567890")
            .expect("Should write garbage");

        let verify_result = BackupVerifier::verify_backup_file(&corrupt_path, "any_key", "corrupt-id");
        assert!(verify_result.is_err(), "Corrupted backup must fail verification");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_isolated_staging_restore_validation() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_restore_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");

        let db_path = temp_dir.join("live_vault.sqlite");
        let backup_dir = temp_dir.join("backups");
        let key = "secure_encryption_key_restore_testing_8888";

        let live_conn = setup_test_encrypted_db(&db_path, key);
        let backup_meta = BackupEngine::create_encrypted_backup(&live_conn, &backup_dir, key)
            .expect("Backup creation should succeed");

        let backup_path = backup_dir.join(&backup_meta.file_name);

        // Case A: Restored database is at sequence 15, live sequence is 15 (Aligned)
        let report_aligned = RestoreEngine::verify_restore_staging(&backup_path, key, 15)
            .expect("Restore staging validation should succeed");
        assert!(report_aligned.integrity_valid);
        assert_eq!(report_aligned.total_members, 1);
        assert_eq!(report_aligned.total_payments, 1);
        assert_eq!(report_aligned.restored_sync_sequence, 15);
        assert!(!report_aligned.requires_sync_reconciliation);
        assert!(report_aligned.is_safe_for_promotion);

        // Case B: Restored database is at sequence 15, live sequence is 45 (Behind, requires reconciliation)
        let report_behind = RestoreEngine::verify_restore_staging(&backup_path, key, 45)
            .expect("Restore staging validation should succeed");
        assert!(report_behind.requires_sync_reconciliation);
        assert!(report_behind.reconciliation_directive.contains("RESTORED_FROM_BACKUP"));
        assert!(report_behind.reconciliation_directive.contains("16..45"));

        drop(live_conn);
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_list_catalog_sorting_and_existence() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_list_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");

        let db_path = temp_dir.join("live_vault.sqlite");
        let backup_dir = temp_dir.join("backups");
        let key = "catalog_test_key_1111222233334444";

        let live_conn = setup_test_encrypted_db(&db_path, key);

        let _meta1 = BackupEngine::create_encrypted_backup(&live_conn, &backup_dir, key)
            .expect("First backup should succeed");
        
        let _meta2 = BackupEngine::create_encrypted_backup(&live_conn, &backup_dir, key)
            .expect("Second backup should succeed");

        let list = BackupEngine::list_backups(&backup_dir).expect("List backups should succeed");
        assert_eq!(list.len(), 2, "Both backups must be present in catalog");
        assert!(list[0].created_at >= list[1].created_at, "Backups must be sorted descending by timestamp");

        drop(live_conn);
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
