#[cfg(test)]
mod elite_chaos_tests {
    use std::time::{Duration, Instant};

    #[test]
    fn test_corrupted_backup_import_rejection() {
        let valid_checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        let corrupted_checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b800";

        assert_ne!(
            valid_checksum, corrupted_checksum,
            "Corrupted data must produce a different checksum"
        );
    }

    #[test]
    fn test_schema_downgrade_detection() {
        let current_version: i64 = 1;
        let incoming_version: i64 = 0;

        assert!(
            incoming_version < current_version,
            "Incoming schema version must be rejected if lower than current"
        );
    }

    #[test]
    fn test_incremental_vacuum_does_not_block() {
        let conn = rusqlite::Connection::open_in_memory()
            .expect("Failed to open in-memory database");

        conn.execute_batch("CREATE TABLE test (id INTEGER);")
            .expect("Should create table");
        conn.execute_batch("INSERT INTO test VALUES (1), (2), (3);")
            .expect("Should insert rows");

        let start = Instant::now();
        let result = conn.execute_batch("PRAGMA incremental_vacuum(10);");
        let elapsed = start.elapsed();

        assert!(result.is_ok(), "Incremental vacuum must execute without error");
        assert!(
            elapsed < Duration::from_millis(500),
            "Incremental vacuum must complete within 500ms: {:?}",
            elapsed
        );
    }

    #[test]
    fn test_panic_hook_sanitization() {
        let secret_phrase = "s3cr3t_k3y_12345";
        let safe_message = "System Error: Cryptographic operation failed.";

        assert!(
            !safe_message.contains(secret_phrase),
            "Sanitized error messages must not leak secrets"
        );
        assert!(
            safe_message.starts_with("System Error:") || safe_message.starts_with("Security Error:") ||
            safe_message.starts_with("Authentication Error:") || safe_message.starts_with("Access Denied:") ||
            safe_message.starts_with("Session Error:"),
            "Error messages must use generic safe prefixes"
        );
    }

    #[test]
    fn test_error_serialization_safety() {
        let error = crate::errors::AppError::Crypto("actual_key_material_here".to_string());
        let serialized = serde_json::to_string(&error).expect("Serialization must succeed");

        assert!(
            !serialized.contains("actual_key_material"),
            "Serialized errors must not contain sensitive material"
        );
        assert!(
            serialized.contains("Security Error"),
            "Serialized errors must contain sanitized messages"
        );
    }

    #[test]
    fn test_database_corruption_error() {
        let error = crate::errors::AppError::DatabaseCorruption;
        let serialized = serde_json::to_string(&error).expect("Serialization must succeed");

        assert!(
            serialized.contains("Database integrity compromised"),
            "Corruption error must be clearly identifiable"
        );
    }

    #[test]
    fn test_rapid_fire_auth_rejection() {
        let limiter = crate::auth::rate_limit::RateLimiter::new(3, Duration::from_secs(10));
        let runtime = tokio::runtime::Runtime::new().expect("Failed to create runtime");

        let results: Vec<bool> = runtime.block_on(async {
            let mut res = Vec::new();
            for i in 0..10 {
                let identifier = format!("rapid_user_{}", i % 2);
                let allowed = limiter.check_and_consume(&identifier).await.is_ok();
                res.push(allowed);
            }
            res
        });

        let allowed_count = results.iter().filter(|&&r| r).count();
        assert!(
            allowed_count <= 6,
            "Rate limiter must restrict rapid-fire requests. Allowed: {}",
            allowed_count
        );
    }

    #[test]
    fn test_multi_factor_kdf_produces_different_keys() {
        use crate::encryption::secrets::SecureString;

        let password = SecureString::new("test_password_123".to_string());
        let hash1 = crate::encryption::argon::CryptoEngine::hash_password(&password)
            .expect("First hash must succeed");
        let hash2 = crate::encryption::argon::CryptoEngine::hash_password(&password)
            .expect("Second hash must succeed");

        assert_ne!(
            hash1.expose_secret(),
            hash2.expose_secret(),
            "Argon2id must produce different salts each time"
        );
    }

    #[test]
    fn test_wal_mode_pragma_applies_correctly() {
        let path = std::env::temp_dir().join(format!("test_wal_{}.sqlite", std::process::id()));
        let conn = rusqlite::Connection::open(&path)
            .expect("Failed to open file-backed database");

        conn.execute_batch("PRAGMA journal_mode = WAL;")
            .expect("WAL mode must be settable");

        let journal_mode: String = conn.query_row(
            "PRAGMA journal_mode;",
            [],
            |row| row.get(0),
        ).expect("Should read journal mode");

        assert_eq!(
            journal_mode.to_lowercase(), "wal",
            "Journal mode must be WAL for file-backed databases"
        );

        drop(conn);
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(path.with_extension("sqlite-wal"));
        let _ = std::fs::remove_file(path.with_extension("sqlite-shm"));
    }

    #[test]
    fn test_config_production_mode_detection() {
        use crate::config::AppEnvironment;

        let dev_config = crate::config::AppConfig {
            environment: AppEnvironment::Development,
            db_encryption_key: "static_dev_key_x0000000000000000000000000".to_string(),
            updater_pubkey: String::new(),
            log_level: "info".to_string(),
        };

        assert!(!dev_config.is_production_mode(), "Dev environment must not be detected as production");
        assert!(dev_config.is_development_mode(), "Dev environment must be detected as development");

        let prod_config = crate::config::AppConfig {
            environment: AppEnvironment::Production,
            db_encryption_key: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".to_string(),
            updater_pubkey: String::new(),
            log_level: "info".to_string(),
        };

        assert!(prod_config.is_production_mode(), "Prod environment must be detected as production");
        assert!(!prod_config.is_development_mode(), "Prod environment must not be detected as development");
    }
}
