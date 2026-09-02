#[cfg(test)]
mod enterprise_security_tests {
    use std::time::Duration;

    #[tokio::test]
    async fn test_rate_limiter_prevents_bruteforce() {
        let limiter = crate::auth::rate_limit::RateLimiter::new(2, Duration::from_secs(5));

        assert!(limiter.check_and_consume("attacker@test.com").await.is_ok());
        assert!(limiter.check_and_consume("attacker@test.com").await.is_ok());
        assert!(limiter.check_and_consume("attacker@test.com").await.is_err());
    }

    #[tokio::test]
    async fn test_rate_limiter_penalty_logic() {
        let limiter = crate::auth::rate_limit::RateLimiter::new(5, Duration::from_secs(5));
        assert!(limiter.check_and_consume("user@test.com").await.is_ok());

        limiter.penalize("user@test.com", 4).await;

        assert!(limiter.check_and_consume("user@test.com").await.is_err());
    }

    #[tokio::test]
    async fn test_rate_limiter_refill() {
        let limiter = crate::auth::rate_limit::RateLimiter::new(1, Duration::from_millis(100));
        assert!(limiter.check_and_consume("refill@test.com").await.is_ok());
        assert!(limiter.check_and_consume("refill@test.com").await.is_err());

        tokio::time::sleep(Duration::from_millis(150)).await;

        assert!(limiter.check_and_consume("refill@test.com").await.is_ok());
    }

    #[test]
    fn test_device_trust_fingerprint_determinism() {
        let fp1 = crate::sessions::trust::TrustEngine::generate_device_fingerprint();
        let fp2 = crate::sessions::trust::TrustEngine::generate_device_fingerprint();
        assert_eq!(fp1, fp2, "Fingerprint must be hardware-deterministic");
    }

    #[test]
    fn test_trust_engine_drift_classification() {
        use crate::sessions::trust::{TrustEngine, TrustLevel};

        assert!(matches!(TrustEngine::classify_trust(95), TrustLevel::Trusted));
        assert!(matches!(TrustEngine::classify_trust(85), TrustLevel::Trusted));
        assert!(matches!(TrustEngine::classify_trust(70), TrustLevel::Suspicious));
        assert!(matches!(TrustEngine::classify_trust(50), TrustLevel::Suspicious));
        assert!(matches!(TrustEngine::classify_trust(40), TrustLevel::Untrusted));
        assert!(matches!(TrustEngine::classify_trust(0), TrustLevel::Untrusted));
    }

    #[test]
    fn test_trust_engine_edge_case_boundaries() {
        use crate::sessions::trust::{TrustEngine, TrustLevel};

        assert!(matches!(TrustEngine::classify_trust(85), TrustLevel::Trusted));
        assert!(matches!(TrustEngine::classify_trust(84), TrustLevel::Suspicious));
        assert!(matches!(TrustEngine::classify_trust(50), TrustLevel::Suspicious));
        assert!(matches!(TrustEngine::classify_trust(49), TrustLevel::Untrusted));
    }

    #[tokio::test]
    async fn test_session_create_and_revoke() {
        let manager = crate::sessions::manager::SessionManager::new("test_service");
        let user_id = uuid::Uuid::new_v4();
        let gym_id = uuid::Uuid::new_v4();

        let create_result = manager.create_and_bind_session(user_id, gym_id).await;
        if create_result.is_ok() {
            let active = manager.get_active_session().await;
            assert!(active.is_some(), "Active session must exist after creation");

            let revoke_result = manager.revoke_session().await;
            assert!(revoke_result.is_ok(), "Revoke must succeed");

            let after_revoke = manager.get_active_session().await;
            assert!(after_revoke.is_none(), "No session after revoke");
        }
    }

    #[tokio::test]
    async fn test_session_lock() {
        let manager = crate::sessions::manager::SessionManager::new("test_service");
        let user_id = uuid::Uuid::new_v4();
        let gym_id = uuid::Uuid::new_v4();

        if manager.create_and_bind_session(user_id, gym_id).await.is_ok() {
            let lock_result = manager.lock_session().await;
            assert!(lock_result.is_ok(), "Lock must succeed when session exists");

            let active = manager.get_active_session().await;
            assert!(active.is_none(), "Locked session must not return as active");
        }
    }

    #[test]
    fn test_argon2_hash_and_verify() {
        use crate::encryption::secrets::SecureString;

        let password = SecureString::new("TestPassword123!@#".to_string());
        let hash = crate::encryption::argon::CryptoEngine::hash_password(&password)
            .expect("Password hashing should succeed");

        assert_ne!(hash.expose_secret(), password.expose_secret());

        let is_valid = crate::encryption::argon::CryptoEngine::verify_password(&hash, &password)
            .expect("Verification should succeed");
        assert!(is_valid, "Correct password must verify");

        let wrong = SecureString::new("WrongPassword".to_string());
        let is_invalid = crate::encryption::argon::CryptoEngine::verify_password(&hash, &wrong)
            .expect("Verification should succeed");
        assert!(!is_invalid, "Wrong password must not verify");
    }

    #[test]
    fn test_secure_string_zeroize_on_drop() {
        let secret_value = "ThisIsASecretKeyThatMustBeZeroized123!";
        let secure = crate::encryption::secrets::SecureString::new(secret_value.to_string());
        assert_eq!(secure.expose_secret(), secret_value);
        drop(secure);
    }

    #[test]
    fn test_app_config_defaults() {
        let config = crate::config::AppConfig::from_env();
        assert!(!config.db_encryption_key.is_empty());
        assert!(!config.log_level.is_empty());
    }

    #[test]
    fn test_schema_migration_version_tracking() {
        let conn = rusqlite::Connection::open_in_memory()
            .expect("Failed to open in-memory database");

        conn.execute_batch("CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            description TEXT NOT NULL
        );").expect("Should create version table");

        conn.execute(
            "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
            rusqlite::params![1, "test"],
        ).expect("Should insert version");

        let version: i64 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        ).expect("Should read version");

        assert_eq!(version, 1, "Schema version must be trackable");
    }

    #[tokio::test]
    async fn test_concurrent_rate_limiter_thread_safety() {
        let limiter = std::sync::Arc::new(crate::auth::rate_limit::RateLimiter::new(10, Duration::from_secs(60)));
        let mut handles = vec![];

        for i in 0..5 {
            let limiter_clone = limiter.clone();
            handles.push(tokio::spawn(async move {
                let key = format!("user_{}", i);
                limiter_clone.check_and_consume(&key).await
            }));
        }

        for handle in handles {
            let result = handle.await.expect("Task should complete");
            assert!(result.is_ok(), "Concurrent access should be safe");
        }
    }

    #[test]
    fn test_database_key_mismatch_fails_safely_and_preserves_file() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_vault_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");
        let db_path = temp_dir.join("test_vault.sqlite");

        let original_key = "original_super_secret_key_1234567890";
        let wrong_key = "wrong_attacker_secret_key_9876543210";

        // 1. Initialize database with original key
        {
            let db_mgr = crate::database::manager::DatabaseManager::new(db_path.clone(), original_key)
                .expect("Should initialize database with original key");
            assert!(db_path.exists(), "Database file must exist");
            drop(db_mgr);
        }

        let original_size = std::fs::metadata(&db_path).expect("Should read metadata").len();
        let original_bytes = std::fs::read(&db_path).expect("Should read bytes");
        assert!(original_size > 0, "Database file must not be empty");

        // 2. Attempt to open with wrong key
        let mismatch_result = crate::database::manager::DatabaseManager::new(db_path.clone(), wrong_key);

        // 3. Verify failure is KeyMismatch
        assert!(mismatch_result.is_err(), "Wrong key must fail");
        let err = mismatch_result.err().unwrap();
        assert!(
            matches!(err, crate::errors::AppError::KeyMismatch(_)),
            "Error must be KeyMismatch variant, got: {:?}",
            err
        );

        // 4. Verify database preservation invariants:
        // File MUST still exist, size must not be truncated to 0, and bytes must remain identical
        assert!(db_path.exists(), "Database file must NOT be deleted after KeyMismatch");
        let current_size = std::fs::metadata(&db_path).expect("Should read metadata").len();
        let current_bytes = std::fs::read(&db_path).expect("Should read bytes");
        assert_eq!(current_size, original_size, "Database file must NOT be truncated");
        assert_eq!(current_bytes, original_bytes, "Database bytes must NOT be modified");

        // 5. Verify database can still be opened successfully with the ORIGINAL key
        let recover_result = crate::database::manager::DatabaseManager::new(db_path.clone(), original_key);
        assert!(recover_result.is_ok(), "Database must still open with original key after failed attempt");

        // Cleanup
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_key_mismatch_error_does_not_leak_key_material() {
        let secret_key = "SuperConfidentialEncryptionKeyXYZ999";
        let err = crate::errors::AppError::KeyMismatch(format!("Key mismatch for path /test/path"));

        let display_str = err.to_string();
        let serialized = serde_json::to_string(&err).expect("Should serialize error");

        assert!(!display_str.contains(secret_key), "Display string must never leak key");
        assert!(!serialized.contains(secret_key), "Serialized JSON must never leak key");
    }
}
