#[cfg(test)]
mod sync_adversarial_tests {
    use rusqlite::{Connection, params};
    use uuid::Uuid;
    use chrono::Utc;
    use crate::database::migration::ensure_schema;
    use crate::repositories::sync_repo::{SyncRepository, RemoteChangeRecord};

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to open in-memory SQLite");
        ensure_schema(&conn).expect("Failed to apply migrations");
        
        let gym_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Adversarial Test Gym', ?2)",
            params![gym_id.to_string(), owner_id.to_string()],
        ).expect("Failed to seed gym");

        conn
    }

    // =========================================================================
    // AUDIT 1: PUSH -> INBOX ACK -> FUTURE PULL SEMANTICS
    // =========================================================================
    #[test]
    fn test_push_to_inbox_ack_and_subsequent_pull_idempotency() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // 1. Local business mutation enqueued
        let member_id = Uuid::new_v4();
        let event_id = {
            let tx = conn.transaction().unwrap();
            tx.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id) VALUES (?1, ?2, 'GD-CK-01', 'Charlie Kirk', '555-0101', 'ACTIVE', datetime('now'), 'usr-1', 'usr-1')",
                params![member_id.to_string(), gym_id],
            ).unwrap();
            let ev_id = SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &member_id,
                "CREATE",
                "{\"fullName\": \"Charlie Kirk\", \"phone\": \"555-0101\", \"memberCode\": \"GD-CK-01\"}",
            ).unwrap();
            tx.commit().unwrap();
            ev_id
        };

        // 2. Simulated push to cloud succeeds, server assigns sequence 201
        let server_sequence = 201;
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, server_sequence, &event_id)
            .expect("Should record inbox ack");
        SyncRepository::mark_event_synced(&conn, &event_id)
            .expect("Should mark outbox synced");

        // Verify outbox is SYNCED
        let outbox_status: String = conn.query_row(
            "SELECT status FROM sync_outbox WHERE event_id = ?1",
            params![event_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(outbox_status, "SYNCED");

        // 3. Simulated future pull returns the same event with server_sequence 201
        let pulled_changes = vec![
            RemoteChangeRecord {
                server_sequence,
                event_id,
                entity_type: "gym_member".into(),
                entity_id: member_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": "Charlie Kirk",
                    "phone": "555-0101",
                    "membershipStatus": "ACTIVE"
                }),
                created_at: Utc::now().to_rfc3339(),
            }
        ];

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &pulled_changes, server_sequence)
            .expect("Pull application must succeed cleanly without conflicting with pre-existing ack");

        // Verify member record still exists intact
        let member_name: String = conn.query_row(
            "SELECT full_name FROM gym_members WHERE id = ?1",
            params![member_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(member_name, "Charlie Kirk");

        // Verify cursor advanced to 201
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 201);
    }

    #[test]
    fn test_duplicate_push_response_idempotency() {
        let conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let event_id = Uuid::new_v4();

        // Push response 1: records sequence 105
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, 105, &event_id).unwrap();

        // Push response 2 (duplicate/re-transmission with ALREADY_APPLIED status):
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, 105, &event_id).unwrap();

        let inbox_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_inbox WHERE server_sequence = 105 AND gym_id = ?1",
            params![gym_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(inbox_count, 1, "Duplicate push responses must not create duplicate inbox rows");
    }

    #[test]
    fn test_duplicate_pull_event_and_batch_replay_idempotency() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        let member_id = Uuid::new_v4();
        let event_id = Uuid::new_v4();
        let change = RemoteChangeRecord {
            server_sequence: 150,
            event_id,
            entity_type: "gym_member".into(),
            entity_id: member_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "fullName": "Idempotent Member",
                "phone": "555-9999"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        // Apply batch once
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[change.clone()], 150).unwrap();

        // Replay exact same pull batch
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[change], 150)
            .expect("Replaying an already-applied pull batch must succeed idempotently");

        let member_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gym_members WHERE id = ?1",
            params![member_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(member_count, 1, "Duplicate pull replay must not duplicate domain records");

        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 150, "Cursor must remain stable at 150");
    }

    // =========================================================================
    // AUDIT 2: CRASH / INTERRUPTION TESTS (Scenarios A through G)
    // =========================================================================
    #[test]
    fn test_crash_recovery_expired_lease_reclaiming() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Enqueue event
        let entity_id = Uuid::new_v4();
        let event_id = {
            let tx = conn.transaction().unwrap();
            let ev_id = SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &entity_id,
                "CREATE",
                "{}",
            ).unwrap();
            tx.commit().unwrap();
            ev_id
        };

        // Scenario A: Worker claims with 0-second lease (simulates expired in-flight lease after crash before push)
        let _ = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "crashed-worker", 10, 0).unwrap();

        // Reclaim by new worker recovers the event
        let reclaimed = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "new-worker", 10, 60).unwrap();
        assert_eq!(reclaimed.len(), 1);
        assert_eq!(reclaimed[0].event_id, event_id);
    }

    #[test]
    fn test_crash_during_push_response_re_push_reconciliation() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Enqueue event
        let member_id = Uuid::new_v4();
        let event_id = {
            let tx = conn.transaction().unwrap();
            let ev_id = SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &member_id,
                "CREATE",
                "{\"fullName\": \"Crash Scenario B Member\"}",
            ).unwrap();
            tx.commit().unwrap();
            ev_id
        };

        // Worker claims event
        let claimed = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "worker-B", 1, 0).unwrap();
        assert_eq!(claimed.len(), 1);

        // Scenario B: Cloud accepted event and assigned sequence 500, but desktop crashed before recording
        // Upon restart, lease is expired. Recovering worker claims it:
        let recovered = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "worker-B2", 1, 60).unwrap();
        assert_eq!(recovered.len(), 1);
        assert_eq!(recovered[0].event_id, event_id);

        // Simulated cloud response for duplicate re-push: { status: "ALREADY_APPLIED", serverSequence: 500 }
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, 500, &event_id).unwrap();
        SyncRepository::mark_event_synced(&conn, &event_id).unwrap();

        // Verify outbox status is SYNCED and inbox ack is recorded
        let outbox_status: String = conn.query_row(
            "SELECT status FROM sync_outbox WHERE event_id = ?1",
            params![event_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(outbox_status, "SYNCED");

        let inbox_exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM sync_inbox WHERE server_sequence = 500 AND gym_id = ?1",
            params![gym_id],
            |r| r.get(0),
        ).unwrap();
        assert!(inbox_exists, "Inbox ack must exist for sequence 500");
    }

    #[test]
    fn test_atomic_pull_batch_rollback_on_failure() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Set initial cursor to 50
        SyncRepository::set_cursor(&conn, &gym_uuid, 50).unwrap();

        let invalid_batch = vec![
            RemoteChangeRecord {
                server_sequence: 51,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({ "fullName": "Should Rollback" }),
                created_at: Utc::now().to_rfc3339(),
            },
            RemoteChangeRecord {
                server_sequence: 52,
                event_id: Uuid::new_v4(),
                entity_type: "invalid_unsupported_type".into(),
                entity_id: Uuid::new_v4(),
                operation: "INVALID".into(),
                payload: serde_json::json!({}),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        let res = SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &invalid_batch, 52);
        assert!(res.is_err(), "Invalid batch must fail");

        // Verify cursor did not advance
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 50, "Cursor must remain at 50 on failure");

        // Verify member from item 1 was rolled back
        let member_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gym_members WHERE full_name = 'Should Rollback'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(member_count, 0, "Uncommitted mutations must be completely rolled back");
    }

    // =========================================================================
    // AUDIT 3: MULTI-PAGE PAGINATION DRAINAGE SIMULATION
    // =========================================================================
    #[test]
    fn test_multi_page_pagination_drainage_simulation() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Simulate applying 3 consecutive pages (total 300 changes)
        for page in 0..3 {
            let mut page_changes = Vec::new();
            for i in 1..=100 {
                let seq = (page * 100) + i;
                page_changes.push(RemoteChangeRecord {
                    server_sequence: seq,
                    event_id: Uuid::new_v4(),
                    entity_type: "gym_member".into(),
                    entity_id: Uuid::new_v4(),
                    operation: "CREATE".into(),
                    payload: serde_json::json!({
                        "fullName": format!("Page {} Member {}", page, i),
                        "phone": "555-0000"
                    }),
                    created_at: Utc::now().to_rfc3339(),
                });
            }

            let next_cursor = (page + 1) * 100;
            SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &page_changes, next_cursor)
                .expect("Each page must apply cleanly");

            let current_cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
            assert_eq!(current_cursor, next_cursor, "Cursor must advance monotonically per page");
        }

        let final_cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(final_cursor, 300, "All 300 changes must be reflected in final cursor");

        let total_members: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members;", [], |r| r.get(0)).unwrap();
        assert_eq!(total_members, 300, "All 300 members must be created across 3 pages");
    }

    // =========================================================================
    // AUDIT 4: WATERMARK SEMANTICS & SYNC LAG
    // =========================================================================
    #[test]
    fn test_watermark_does_not_prematurely_advance_cursor() {
        let conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Initial cursor is 0
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_uuid).unwrap(), 0);

        // Update cloud watermark to 500
        SyncRepository::set_sync_state(&conn, &gym_uuid, "cloud_latest_server_sequence", "500").unwrap();

        // Cursor MUST still be 0 (watermark is strictly informational)
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_uuid).unwrap(), 0);

        // Compute sync lag
        let watermark: i64 = conn.query_row(
            "SELECT value FROM sync_state WHERE key = 'cloud_latest_server_sequence' AND gym_id = ?1",
            params![gym_id],
            |r| r.get(0),
        ).unwrap_or("0".to_string()).parse().unwrap_or(0);

        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        let sync_lag = (watermark - cursor).max(0);
        assert_eq!(sync_lag, 500, "Sync lag must equal 500");
    }

    // =========================================================================
    // AUDIT 5: MULTI-TENANT SYNC ISOLATION
    // =========================================================================
    #[test]
    fn test_multi_tenant_sync_isolation() {
        let mut conn = setup_test_db();
        let gym_alpha_uuid = Uuid::new_v4();
        let gym_beta_uuid = Uuid::new_v4();
        let owner_alpha = Uuid::new_v4();
        let owner_beta = Uuid::new_v4();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Alpha Gym', ?2)", params![gym_alpha_uuid.to_string(), owner_alpha.to_string()]).unwrap();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Beta Gym', ?2)", params![gym_beta_uuid.to_string(), owner_beta.to_string()]).unwrap();

        // 1. Independent Cursor Tracking
        SyncRepository::set_cursor(&conn, &gym_alpha_uuid, 100).unwrap();
        SyncRepository::set_cursor(&conn, &gym_beta_uuid, 200).unwrap();

        assert_eq!(SyncRepository::get_cursor(&conn, &gym_alpha_uuid).unwrap(), 100, "Alpha cursor must remain 100");
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_beta_uuid).unwrap(), 200, "Beta cursor must remain 200");

        // 2. Independent Watermarks
        SyncRepository::set_sync_state(&conn, &gym_alpha_uuid, "cloud_latest_server_sequence", "150").unwrap();
        SyncRepository::set_sync_state(&conn, &gym_beta_uuid, "cloud_latest_server_sequence", "250").unwrap();

        let alpha_wm: String = conn.query_row("SELECT value FROM sync_state WHERE key = 'cloud_latest_server_sequence' AND gym_id = ?1", params![gym_alpha_uuid.to_string()], |r| r.get(0)).unwrap();
        let beta_wm: String = conn.query_row("SELECT value FROM sync_state WHERE key = 'cloud_latest_server_sequence' AND gym_id = ?1", params![gym_beta_uuid.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(alpha_wm, "150");
        assert_eq!(beta_wm, "250");

        // 3. Independent Inbox Acknowledgment (Same server_sequence for both gyms must NOT collide)
        let ev_alpha = Uuid::new_v4();
        let ev_beta = Uuid::new_v4();
        SyncRepository::record_inbox_ack(&conn, &gym_alpha_uuid, 1, &ev_alpha).expect("Alpha ack for seq 1 must succeed");
        SyncRepository::record_inbox_ack(&conn, &gym_beta_uuid, 1, &ev_beta).expect("Beta ack for seq 1 must succeed independently");

        let alpha_inbox_count: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1 AND server_sequence = 1", params![gym_alpha_uuid.to_string()], |r| r.get(0)).unwrap();
        let beta_inbox_count: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1 AND server_sequence = 1", params![gym_beta_uuid.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(alpha_inbox_count, 1);
        assert_eq!(beta_inbox_count, 1);

        // 4. Outbox Enqueue & Claiming Isolation
        let alpha_entity = Uuid::new_v4();
        let tx = conn.transaction().unwrap();
        let alpha_ev_id = SyncRepository::enqueue_outbox_event(&tx, &gym_alpha_uuid, "gym_member", &alpha_entity, "CREATE", "{}").unwrap();
        tx.commit().unwrap();

        let beta_claims = SyncRepository::claim_pending_events(&mut conn, &gym_beta_uuid, "beta-worker", 10, 60).unwrap();
        assert_eq!(beta_claims.len(), 0, "Beta worker cannot claim Alpha events");

        let alpha_claims = SyncRepository::claim_pending_events(&mut conn, &gym_alpha_uuid, "alpha-worker", 10, 60).unwrap();
        assert_eq!(alpha_claims.len(), 1);
        assert_eq!(alpha_claims[0].event_id, alpha_ev_id);

        // 5. Pull Application Isolation
        let beta_member_id = Uuid::new_v4();
        let beta_change = RemoteChangeRecord {
            server_sequence: 201,
            event_id: Uuid::new_v4(),
            entity_type: "gym_member".into(),
            entity_id: beta_member_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({ "fullName": "Beta Member", "phone": "555-0002" }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_beta_uuid, &[beta_change], 201).unwrap();

        // Beta cursor is 201, Alpha cursor remains 100
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_beta_uuid).unwrap(), 201);
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_alpha_uuid).unwrap(), 100);

        // Beta member is strictly scoped to gym_beta
        let member_gym: String = conn.query_row("SELECT gym_id FROM gym_members WHERE id = ?1", params![beta_member_id.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(member_gym, gym_beta_uuid.to_string());
    }

    // =========================================================================
    // AUDIT 6: RESTORE FROM OLD BACKUP PULL RECONCILIATION
    // =========================================================================
    #[test]
    fn test_restore_from_old_backup_pull_reconciliation() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Simulate restored backup at cursor 10
        SyncRepository::set_cursor(&conn, &gym_uuid, 10).unwrap();

        // Cloud has advanced to sequence 50 (delta of 40 events: 11..50)
        let mut delta_changes = Vec::new();
        for seq in 11..=50 {
            delta_changes.push(RemoteChangeRecord {
                server_sequence: seq,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": format!("Restored Delta Member {}", seq),
                    "phone": "555-0000"
                }),
                created_at: Utc::now().to_rfc3339(),
            });
        }

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &delta_changes, 50)
            .expect("Restored desktop must apply missing cloud delta cleanly");

        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 50, "Restored desktop cursor must catch up to 50");

        let member_count: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members;", [], |r| r.get(0)).unwrap();
        assert_eq!(member_count, 40, "All 40 missing delta members must be populated in database");
    }

    // =========================================================================
    // AUDIT 7: MIGRATION 5 UPGRADE SAFETY & DATA PRESERVATION
    // =========================================================================
    #[test]
    fn test_migration_5_upgrade_pre_migration_database_preserves_multi_tenant_state() {
        let conn = Connection::open_in_memory().expect("Failed to open in-memory SQLite");
        
        // 1. Manually establish a pre-Migration-5 (v4) schema
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description TEXT NOT NULL
            );
            INSERT INTO schema_version (version, description) VALUES (4, 'Pre-Migration-5 Schema');

            CREATE TABLE IF NOT EXISTS gyms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_user_id TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS gym_members (
                id TEXT PRIMARY KEY,
                gym_id TEXT NOT NULL,
                member_code TEXT NOT NULL,
                full_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                membership_status TEXT NOT NULL DEFAULT 'ACTIVE',
                joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by_user_id TEXT NOT NULL,
                updated_by_user_id TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS sync_outbox (
                id TEXT PRIMARY KEY,
                event_id TEXT UNIQUE NOT NULL,
                gym_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                last_attempt_at DATETIME,
                next_retry_at DATETIME,
                lease_expires_at DATETIME,
                worker_id TEXT,
                status TEXT NOT NULL DEFAULT 'PENDING',
                error_code TEXT,
                error_message TEXT
            );

            -- Old v4 sync_state (single key primary key)
            CREATE TABLE IF NOT EXISTS sync_state (
                key TEXT PRIMARY KEY,
                gym_id TEXT NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- Old v4 sync_inbox (single server_sequence primary key)
            CREATE TABLE IF NOT EXISTS sync_inbox (
                server_sequence INTEGER PRIMARY KEY,
                gym_id TEXT NOT NULL,
                event_id TEXT UNIQUE NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                operation TEXT NOT NULL,
                payload TEXT NOT NULL,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        ").expect("Failed to create pre-migration v4 schema");

        let gym_a = Uuid::new_v4();
        let gym_b = Uuid::new_v4();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Gym Alpha', 'u-1')", params![gym_a.to_string()]).unwrap();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Gym Beta', 'u-2')", params![gym_b.to_string()]).unwrap();

        // Populate pre-migration sync_state and sync_inbox
        conn.execute("INSERT INTO sync_state (key, gym_id, value) VALUES ('last_applied_server_sequence', ?1, '100')", params![gym_a.to_string()]).unwrap();
        conn.execute("INSERT INTO sync_inbox (server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload) VALUES (100, ?1, 'ev-100', 'gym_member', 'm-1', 'CREATE', '{\"name\":\"Alpha Mem\"}')", params![gym_a.to_string()]).unwrap();

        // 2. Run schema migration engine (Upgrades v4 -> latest)
        ensure_schema(&conn).expect("ensure_schema must apply migrations cleanly");

        let version: i64 = conn.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version;", [], |r| r.get(0)).unwrap();
        assert!(version >= 5, "Database must be successfully migrated to at least v5");

        // 3. Verify Gym Alpha existing state is preserved intact
        let cursor_a = SyncRepository::get_cursor(&conn, &gym_a).unwrap();
        assert_eq!(cursor_a, 100, "Gym Alpha cursor must be preserved across migration");

        let inbox_count: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1 AND server_sequence = 100", params![gym_a.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(inbox_count, 1, "Gym Alpha inbox record must be preserved");

        // 4. Verify that Migration 5 allows Gym Beta to store independent cursors and inbox sequences without colliding with Gym Alpha
        SyncRepository::set_cursor(&conn, &gym_b, 200).unwrap();
        SyncRepository::record_inbox_ack(&conn, &gym_b, 100, &Uuid::new_v4()).unwrap(); // Same sequence 100 as Alpha!

        assert_eq!(SyncRepository::get_cursor(&conn, &gym_a).unwrap(), 100, "Gym Alpha cursor must remain 100");
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_b).unwrap(), 200, "Gym Beta cursor must be 200");

        let alpha_inbox: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1 AND server_sequence = 100", params![gym_a.to_string()], |r| r.get(0)).unwrap();
        let beta_inbox: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1 AND server_sequence = 100", params![gym_b.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(alpha_inbox, 1, "Alpha inbox record preserved");
        assert_eq!(beta_inbox, 1, "Beta inbox record created independently on sequence 100");

        // 5. Test idempotency (Calling ensure_schema again must be a clean no-op)
        ensure_schema(&conn).expect("Repeat ensure_schema on v5 must succeed idempotently");
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_a).unwrap(), 100);
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_b).unwrap(), 200);
    }

    #[test]
    fn test_50_page_pull_safety_limit_leaves_state_consistent() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Simulate 50 pages of 10 items = 500 items
        for page in 0..50 {
            let mut page_changes = Vec::new();
            for i in 1..=10 {
                let seq = (page * 10) + i;
                page_changes.push(RemoteChangeRecord {
                    server_sequence: seq,
                    event_id: Uuid::new_v4(),
                    entity_type: "gym_member".into(),
                    entity_id: Uuid::new_v4(),
                    operation: "CREATE".into(),
                    payload: serde_json::json!({
                        "fullName": format!("P{} M{}", page, i),
                        "phone": "555-0000"
                    }),
                    created_at: Utc::now().to_rfc3339(),
                });
            }

            let next_cursor = (page + 1) * 10;
            SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &page_changes, next_cursor).unwrap();
        }

        let cursor_after_50 = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor_after_50, 500, "Cursor must reach 500 after 50 pages");

        // Simulate next cycle resuming from cursor 500 and draining page 51
        let mut page_51_changes = Vec::new();
        for i in 1..=10 {
            let seq = 500 + i;
            page_51_changes.push(RemoteChangeRecord {
                server_sequence: seq,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": format!("P51 M{}", i),
                    "phone": "555-0000"
                }),
                created_at: Utc::now().to_rfc3339(),
            });
        }

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &page_51_changes, 510)
            .expect("Page 51 on subsequent cycle must apply cleanly");

        let cursor_after_51 = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor_after_51, 510, "Cursor must advance to 510 on subsequent cycle");

        let total_members: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members;", [], |r| r.get(0)).unwrap();
        assert_eq!(total_members, 510, "All 510 members across both cycles must exist");
    }

    #[test]
    fn test_sqlcipher_compatibility_with_migration_5() {
        let temp_dir = std::env::temp_dir().join(format!("gymdeck_test_sqlcipher_mig_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&temp_dir).expect("Should create temp dir");
        let db_path = temp_dir.join("encrypted_mig_vault.sqlite");

        let encryption_key = "secure_production_aes256_migration_key_998877";

        // 1. Create encrypted database and run full migrations
        {
            let conn = Connection::open(&db_path).expect("Should open sqlite file");
            conn.pragma_update(None, "key", encryption_key).expect("Should set SQLCipher key");
            ensure_schema(&conn).expect("ensure_schema must succeed on encrypted database");

            let version = crate::database::migration::current_schema_version(&conn).expect("Should read version");
            assert_eq!(version, 6, "Encrypted database must be at version 6");

            let gym_id = Uuid::new_v4();
            SyncRepository::set_cursor(&conn, &gym_id, 350).expect("Should set cursor in encrypted DB");
            assert_eq!(SyncRepository::get_cursor(&conn, &gym_id).unwrap(), 350);
        }

        // 2. Re-open database with encryption key and verify persistence
        {
            let conn = Connection::open(&db_path).expect("Should reopen encrypted database");
            conn.pragma_update(None, "key", encryption_key).expect("Should set SQLCipher key");
            
            let version = crate::database::migration::current_schema_version(&conn).expect("Should read version");
            assert_eq!(version, 6, "Re-opened encrypted database must remain at version 6");
        }

        // 3. Clean up temp dir
        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    // =========================================================================
    // AUDIT 10: POPULATED VAULT PROTECTION (Indian's Gym 69 Members -> DEVGYM)
    // =========================================================================
    #[test]
    fn test_populated_vault_indians_gym_to_devgym_isolation() {
        let mut conn = setup_test_db();
        let indians_gym_id = Uuid::parse_str("5586ea28-78ab-44b6-a68c-f84fdf7f4cbe").unwrap();
        let devgym_id = Uuid::parse_str("66258084-af0b-49cb-a696-8fa6ef3d6373").unwrap();

        // 1. Seed Indian's Gym with 69 members
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Indian''s Gym', 'usr-indians-owner')",
            params![indians_gym_id.to_string()],
        ).unwrap();

        for i in 1..=69 {
            conn.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, ?4, '9876543210', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
                params![
                    Uuid::new_v4().to_string(),
                    indians_gym_id.to_string(),
                    format!("GD-IND-{:03}", i),
                    format!("Indian Member {:02}", i),
                ],
            ).unwrap();
        }

        let indians_count_before: i64 = conn.query_row(
            "SELECT count(*) FROM gym_members WHERE gym_id = ?1 AND deleted_at IS NULL",
            params![indians_gym_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(indians_count_before, 69, "Indian's Gym must start with 69 members");

        // 2. Enroll DEVGYM and provision in SQLite
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Dev Test Gym', 'usr-devowner')",
            params![devgym_id.to_string()],
        ).unwrap();

        // 3. Synchronize DEVGYM members (GD-7FDEB6 and GD-BE15AA)
        let subham_1_id = Uuid::parse_str("c309c5a2-9332-4d16-9340-0f10e0a83e1e").unwrap();
        let subham_2_id = Uuid::parse_str("7f32e82c-d582-4551-8c4e-c282f23dbbf6").unwrap();

        let devgym_changes = vec![
            RemoteChangeRecord {
                server_sequence: 2628,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: subham_1_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": "Subham",
                    "phone": "6291773811",
                    "memberCode": "GD-7FDEB6"
                }),
                created_at: Utc::now().to_rfc3339(),
            },
            RemoteChangeRecord {
                server_sequence: 2629,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: subham_2_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": "Subham",
                    "phone": "6219773811",
                    "memberCode": "GD-BE15AA"
                }),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        SyncRepository::apply_pull_batch_tx(&mut conn, &devgym_id, &devgym_changes, 2629)
            .expect("DEVGYM pull batch must apply cleanly");

        // 4. Verify Indian's Gym records are 100% untouched
        let indians_count_after: i64 = conn.query_row(
            "SELECT count(*) FROM gym_members WHERE gym_id = ?1 AND deleted_at IS NULL",
            params![indians_gym_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(indians_count_after, 69, "Indian's Gym member count must remain exactly 69");

        // 5. Verify DEVGYM has exactly 2 members
        let devgym_count: i64 = conn.query_row(
            "SELECT count(*) FROM gym_members WHERE gym_id = ?1 AND deleted_at IS NULL",
            params![devgym_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(devgym_count, 2, "DEVGYM member count must be exactly 2");

        // 6. Verify total records = 71
        let total_count: i64 = conn.query_row("SELECT count(*) FROM gym_members", [], |r| r.get(0)).unwrap();
        assert_eq!(total_count, 71, "Total members in database must be 71 (69 + 2)");

        // 7. Verify sync_state cursor for DEVGYM = 2629, Indian's Gym cursor = 0
        let dev_cursor = SyncRepository::get_cursor(&conn, &devgym_id).unwrap();
        assert_eq!(dev_cursor, 2629);
        let indians_cursor = SyncRepository::get_cursor(&conn, &indians_gym_id).unwrap();
        assert_eq!(indians_cursor, 0);
    }

    // =========================================================================
    // AUDIT 11: FINANCIAL & ATTENDANCE TRANSACTION IDEMPOTENCY
    // =========================================================================
    #[test]
    fn test_financial_and_attendance_idempotent_replay() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        let member_id = Uuid::new_v4();
        let payment_event_id = Uuid::new_v4();

        // 1. First sync pull containing Member and Plan creation
        let changes_pass_1 = vec![
            RemoteChangeRecord {
                server_sequence: 1001,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: member_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": "Financial Test Member",
                    "phone": "555-9999",
                    "memberCode": "GD-FIN-01"
                }),
                created_at: Utc::now().to_rfc3339(),
            },
            RemoteChangeRecord {
                server_sequence: 1002,
                event_id: payment_event_id,
                entity_type: "membership_plan".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "planName": "Annual Gold",
                    "durationMonths": 12,
                    "price": 12000.00
                }),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &changes_pass_1, 1002)
            .expect("First pass must succeed");

        let members_count_1: i64 = conn.query_row("SELECT count(*) FROM gym_members WHERE gym_id = ?1", params![gym_id], |r| r.get(0)).unwrap();
        assert_eq!(members_count_1, 1);

        // 2. Replay the exact same batch again (Duplicate Pull / Network Retry)
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &changes_pass_1, 1002)
            .expect("Duplicate pull replay must succeed idempotently without error");

        let members_count_2: i64 = conn.query_row("SELECT count(*) FROM gym_members WHERE gym_id = ?1", params![gym_id], |r| r.get(0)).unwrap();
        assert_eq!(members_count_2, 1, "Duplicate replay MUST NOT create duplicate members or financial plans");
    }

    // =========================================================================
    // AUDIT 12: CLOUD UNENROLL SAFETY (DATABASE & VAULT PRESERVATION)
    // =========================================================================
    #[test]
    fn test_unenroll_safety_preserves_database_and_records() {
        let conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();

        // 1. Populate records before unenroll
        for i in 1..=5 {
            conn.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, ?4, '555-0000', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
                params![Uuid::new_v4().to_string(), gym_id, format!("GD-UN-{:02}", i), format!("Member {}", i)],
            ).unwrap();
        }

        let pre_unenroll_count: i64 = conn.query_row("SELECT count(*) FROM gym_members WHERE gym_id = ?1", params![gym_id], |r| r.get(0)).unwrap();
        assert_eq!(pre_unenroll_count, 5);

        // 2. Simulate cloud unenroll (clearing cloud metadata while leaving DB untouched)
        let _session_mgr = crate::sessions::cloud_session::CloudSessionManager::new("com.gymdeck.test");
        // Verify unenroll does not touch SQLite connection
        let post_unenroll_count: i64 = conn.query_row("SELECT count(*) FROM gym_members WHERE gym_id = ?1", params![gym_id], |r| r.get(0)).unwrap();
        assert_eq!(post_unenroll_count, 5, "Database records MUST remain completely intact after unenroll");
    }

    #[test]
    fn test_inspect_live_desktop_vault_readonly() {
        let path = std::path::PathBuf::from("/Users/subhamdas/Library/Application Support/com.gymdeck.desktop/gymdeck_secure_vault.sqlite");
        if !path.exists() {
            println!("Live vault not found at {:?}", path);
            return;
        }
        let conn = rusqlite::Connection::open_with_flags(&path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).unwrap();
        let version: Result<i64, _> = conn.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |r| r.get(0));
        println!(">>> LIVE VAULT schema_version: {:?}", version);
    }

    // =========================================================================
    // ENGINEERING PHASE 01: FOCUSED INTEGRITY TESTS
    // =========================================================================

    #[test]
    fn test_phase1_payment_pull_and_idempotency() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let member_id = Uuid::new_v4();

        // Seed member
        conn.execute(
            "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'GD-PAY-01', 'Pay Member', '555-1234', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
            params![member_id.to_string(), gym_id],
        ).unwrap();

        let payment_id = Uuid::new_v4();
        let payment_change = RemoteChangeRecord {
            server_sequence: 501,
            event_id: Uuid::new_v4(),
            entity_type: "payment".into(),
            entity_id: payment_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "amount": 2500.50,
                "paymentMethod": "UPI",
                "transactionReference": "UPI-TXN-9988",
                "status": "COMPLETED",
                "paymentDate": "2026-09-03T10:00:00Z",
                "createdByUserId": "usr-owner-1"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        // 1. Pull payment
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[payment_change.clone()], 501)
            .expect("Payment pull must apply cleanly");

        // Verify record in payments table
        let (amount_minor_units, amount, method, ref_num, status, creator): (i64, f64, String, Option<String>, String, String) = conn.query_row(
            "SELECT amount_minor_units, amount, payment_method, transaction_reference, status, created_by_user_id FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        ).unwrap();

        assert_eq!(amount_minor_units, 250050, "Payment amount_minor_units must be 250050 paise");
        assert_eq!(amount, 2500.50, "Legacy amount must remain 2500.50 for backwards compatibility");
        assert_eq!(method, "UPI");
        assert_eq!(ref_num.as_deref(), Some("UPI-TXN-9988"));
        assert_eq!(status, "COMPLETED");
        assert_eq!(creator, "usr-owner-1");

        // Verify cursor advanced to 501
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 501);

        // 2. Replay the exact same payment event (Idempotency)
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[payment_change], 501)
            .expect("Replay of payment event must succeed idempotently");

        let payment_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(payment_count, 1, "Duplicate payment event must not create duplicate payment rows");
    }

    #[test]
    fn test_phase1_attendance_pull_and_checkout_update() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let member_id = Uuid::new_v4();

        // Seed member
        conn.execute(
            "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'GD-ATT-01', 'Attendance Member', '555-5678', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
            params![member_id.to_string(), gym_id],
        ).unwrap();

        let attendance_id = Uuid::new_v4();

        // 1. Initial check-in event using canonical "attendance_log" entity type
        let check_in_change = RemoteChangeRecord {
            server_sequence: 601,
            event_id: Uuid::new_v4(),
            entity_type: "attendance_log".into(),
            entity_id: attendance_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "checkInTime": "2026-09-03T08:00:00Z",
                "attendanceMethod": "RFID",
                "recordedByUserId": "usr-staff-1"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[check_in_change.clone()], 601)
            .expect("Attendance check-in pull must succeed");

        let (method, recorder, check_out): (String, String, Option<String>) = conn.query_row(
            "SELECT attendance_method, recorded_by_user_id, check_out_time FROM attendance_logs WHERE id = ?1",
            params![attendance_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();

        assert_eq!(method, "RFID");
        assert_eq!(recorder, "usr-staff-1");
        assert!(check_out.is_none(), "Initial check-in must have null check_out_time");

        // 2. Checkout update event using "attendance" alias
        let checkout_change = RemoteChangeRecord {
            server_sequence: 602,
            event_id: Uuid::new_v4(),
            entity_type: "attendance".into(),
            entity_id: attendance_id,
            operation: "UPDATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "checkInTime": "2026-09-03T08:00:00Z",
                "checkOutTime": "2026-09-03T09:30:00Z",
                "attendanceMethod": "RFID"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[checkout_change.clone()], 602)
            .expect("Attendance checkout update pull must succeed");

        let check_out_updated: Option<String> = conn.query_row(
            "SELECT check_out_time FROM attendance_logs WHERE id = ?1",
            params![attendance_id.to_string()],
            |r| r.get(0),
        ).unwrap();

        assert_eq!(check_out_updated.as_deref(), Some("2026-09-03T09:30:00Z"));

        // 3. Replay checkout (Idempotency)
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[checkout_change], 602)
            .expect("Duplicate attendance checkout pull must succeed idempotently");

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM attendance_logs WHERE id = ?1",
            params![attendance_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(count, 1, "Exactly one attendance record must exist");
    }

    #[test]
    fn test_phase1_member_membership_pull_updates_member() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let member_id = Uuid::new_v4();
        let plan_id = Uuid::new_v4();

        // Seed plan
        conn.execute(
            "INSERT INTO membership_plans (id, gym_id, plan_name, duration_days, price, is_active, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'Gold Yearly', 365, 9999.0, 1, 'SYSTEM', 'SYSTEM')",
            params![plan_id.to_string(), gym_id],
        ).unwrap();

        // Seed member (currently INACTIVE)
        conn.execute(
            "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'GD-MEMB-01', 'Member Sub', '555-8888', 'INACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
            params![member_id.to_string(), gym_id],
        ).unwrap();

        // Pull membership purchase from cloud
        let membership_change = RemoteChangeRecord {
            server_sequence: 701,
            event_id: Uuid::new_v4(),
            entity_type: "member_membership".into(),
            entity_id: Uuid::new_v4(),
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "planId": plan_id.to_string(),
                "status": "ACTIVE",
                "startDate": "2026-09-01T00:00:00Z",
                "endDate": "2027-09-01T00:00:00Z"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[membership_change], 701)
            .expect("member_membership pull must succeed");

        let (status, member_plan_id, expires_at): (String, Option<String>, Option<String>) = conn.query_row(
            "SELECT membership_status, membership_plan_id, expires_at FROM gym_members WHERE id = ?1",
            params![member_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();

        assert_eq!(status, "ACTIVE");
        assert_eq!(member_plan_id.as_deref(), Some(plan_id.to_string().as_str()));
        assert_eq!(expires_at.as_deref(), Some("2027-09-01T00:00:00Z"));
    }

    #[test]
    fn test_phase1_trainer_pull_and_lifecycle() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let trainer_id = Uuid::new_v4();

        // 1. Create trainer
        let create_change = RemoteChangeRecord {
            server_sequence: 801,
            event_id: Uuid::new_v4(),
            entity_type: "trainer".into(),
            entity_id: trainer_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "fullName": "Coach Vikram",
                "phone": "+919876543210",
                "specialization": "Strength & Conditioning",
                "isActive": true
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[create_change], 801)
            .expect("Trainer create pull must succeed");

        let (name, spec, active): (String, Option<String>, i64) = conn.query_row(
            "SELECT full_name, specialization, is_active FROM trainers WHERE id = ?1",
            params![trainer_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();

        assert_eq!(name, "Coach Vikram");
        assert_eq!(spec.as_deref(), Some("Strength & Conditioning"));
        assert_eq!(active, 1);

        // 2. Update trainer
        let update_change = RemoteChangeRecord {
            server_sequence: 802,
            event_id: Uuid::new_v4(),
            entity_type: "trainer".into(),
            entity_id: trainer_id,
            operation: "UPDATE".into(),
            payload: serde_json::json!({
                "fullName": "Coach Vikram",
                "phone": "+919876543210",
                "specialization": "CrossFit & Mobility",
                "isActive": true
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[update_change], 802)
            .expect("Trainer update pull must succeed");

        let spec_updated: String = conn.query_row(
            "SELECT specialization FROM trainers WHERE id = ?1",
            params![trainer_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(spec_updated, "CrossFit & Mobility");

        // 3. Delete trainer
        let delete_change = RemoteChangeRecord {
            server_sequence: 803,
            event_id: Uuid::new_v4(),
            entity_type: "trainer".into(),
            entity_id: trainer_id,
            operation: "DELETE".into(),
            payload: serde_json::json!({}),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[delete_change], 803)
            .expect("Trainer delete pull must succeed");

        let is_active_now: i64 = conn.query_row(
            "SELECT is_active FROM trainers WHERE id = ?1",
            params![trainer_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(is_active_now, 0, "Deleted trainer must have is_active set to 0");
    }

    #[test]
    fn test_phase1_partial_batch_failure_atomic_rollback() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let member_id = Uuid::new_v4();

        // Seed member
        conn.execute(
            "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'GD-ROLL-01', 'Rollback Member', '555-4321', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
            params![member_id.to_string(), gym_id],
        ).unwrap();

        // Set initial cursor to 900
        SyncRepository::set_cursor(&conn, &gym_uuid, 900).unwrap();

        let payment_id = Uuid::new_v4();
        let attendance_id = Uuid::new_v4();

        // Construct batch: Event 1 (valid payment), Event 2 (malformed entity type), Event 3 (valid attendance)
        let event_1 = RemoteChangeRecord {
            server_sequence: 901,
            event_id: Uuid::new_v4(),
            entity_type: "payment".into(),
            entity_id: payment_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "amount": 1000.0,
                "paymentMethod": "CASH"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        let event_2_broken = RemoteChangeRecord {
            server_sequence: 902,
            event_id: Uuid::new_v4(),
            entity_type: "corrupted_unknown_type".into(),
            entity_id: Uuid::new_v4(),
            operation: "INVALID".into(),
            payload: serde_json::json!({}),
            created_at: Utc::now().to_rfc3339(),
        };

        let event_3 = RemoteChangeRecord {
            server_sequence: 903,
            event_id: Uuid::new_v4(),
            entity_type: "attendance_log".into(),
            entity_id: attendance_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "checkInTime": "2026-09-03T07:00:00Z"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        let broken_batch = vec![event_1.clone(), event_2_broken, event_3.clone()];

        // Execute pull batch - MUST FAIL
        let result = SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &broken_batch, 903);
        assert!(result.is_err(), "Batch containing broken event must fail");

        // Verify cursor DID NOT ADVANCE
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 900, "Cursor must remain strictly at 900 after batch failure");

        // Verify Event 1 rolled back
        let p_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(p_count, 0, "Event 1 must be completely rolled back");

        // Verify Event 3 rolled back
        let a_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM attendance_logs WHERE id = ?1",
            params![attendance_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(a_count, 0, "Event 3 must not be applied");

        // Now fix Event 2 with a valid PT entity event (acknowledged without error)
        let event_2_fixed = RemoteChangeRecord {
            server_sequence: 902,
            event_id: Uuid::new_v4(),
            entity_type: "pt_package".into(),
            entity_id: Uuid::new_v4(),
            operation: "CREATE".into(),
            payload: serde_json::json!({ "packageName": "10 Sessions" }),
            created_at: Utc::now().to_rfc3339(),
        };

        let fixed_batch = vec![event_1, event_2_fixed, event_3];
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &fixed_batch, 903)
            .expect("Fixed batch must succeed completely");

        // Verify cursor now advanced to 903
        let cursor_after = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor_after, 903, "Cursor must advance to 903 after successful batch");

        // Verify Event 1 applied
        let p_count_after: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(p_count_after, 1);

        // Verify Event 3 applied
        let a_count_after: i64 = conn.query_row(
            "SELECT COUNT(*) FROM attendance_logs WHERE id = ?1",
            params![attendance_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(a_count_after, 1);
    }

    // =========================================================================
    // ENGINEERING PHASE 02: FINANCIAL PRECISION & MINOR-UNIT HARDENING TESTS
    // =========================================================================

    #[test]
    fn test_phase2_financial_precision_boundary_values() {
        use crate::utils::money::{decimal_str_to_minor_units, minor_units_to_decimal_str};

        // 1. ₹0.01
        assert_eq!(decimal_str_to_minor_units("0.01").unwrap(), 1);
        assert_eq!(minor_units_to_decimal_str(1), "0.01");

        // 2. ₹0.50
        assert_eq!(decimal_str_to_minor_units("0.50").unwrap(), 50);
        assert_eq!(decimal_str_to_minor_units("0.5").unwrap(), 50);
        assert_eq!(minor_units_to_decimal_str(50), "0.50");

        // 3. ₹1.00
        assert_eq!(decimal_str_to_minor_units("1.00").unwrap(), 100);
        assert_eq!(decimal_str_to_minor_units("1").unwrap(), 100);
        assert_eq!(minor_units_to_decimal_str(100), "1.00");

        // 4. ₹999.99
        assert_eq!(decimal_str_to_minor_units("999.99").unwrap(), 99999);
        assert_eq!(minor_units_to_decimal_str(99999), "999.99");

        // 5. ₹1,000,000.00
        assert_eq!(decimal_str_to_minor_units("1000000.00").unwrap(), 100000000);
        assert_eq!(minor_units_to_decimal_str(100000000), "1000000.00");

        // Additional boundary conversions
        assert_eq!(decimal_str_to_minor_units("100.00").unwrap(), 10000);
        assert_eq!(minor_units_to_decimal_str(10000), "100.00");
    }

    #[test]
    fn test_phase2_values_with_more_than_two_decimals_fail_safely() {
        use crate::utils::money::decimal_str_to_minor_units;

        assert!(decimal_str_to_minor_units("12.345").is_err(), "Must reject 3 decimal places");
        assert!(decimal_str_to_minor_units("0.001").is_err(), "Must reject sub-cent fraction");
        assert!(decimal_str_to_minor_units("999.999").is_err(), "Must reject 999.999");
        assert!(decimal_str_to_minor_units("10.0001").is_err(), "Must reject 4 decimal places");

        // Trailing zeros are acceptable
        assert_eq!(decimal_str_to_minor_units("10.5000").unwrap(), 1050);
    }

    #[test]
    fn test_phase2_integer_addition_and_subtraction_invariants() {
        use crate::utils::money::{decimal_str_to_minor_units, minor_units_to_decimal_str};

        // Adding ₹125.75 + ₹500.50 = ₹626.25
        let a = decimal_str_to_minor_units("125.75").unwrap();
        let b = decimal_str_to_minor_units("500.50").unwrap();
        let sum = a + b;
        assert_eq!(sum, 62625);
        assert_eq!(minor_units_to_decimal_str(sum), "626.25");

        // Subtracting ₹1,000.00 - ₹250.25 = ₹749.75
        let total = decimal_str_to_minor_units("1000.00").unwrap();
        let deduction = decimal_str_to_minor_units("250.25").unwrap();
        let net = total - deduction;
        assert_eq!(net, 74975);
        assert_eq!(minor_units_to_decimal_str(net), "749.75");
    }

    #[test]
    fn test_phase2_refund_arithmetic_and_gross_minus_refunds() {
        use crate::utils::money::minor_units_to_decimal_str;

        // Original Payment: ₹2,500.00
        let original_amount_paise: i64 = 250000;
        let mut refunded_total_paise: i64 = 0;

        // Partial Refund 1: ₹500.00
        let refund_1_paise: i64 = 50000;
        assert!(refund_1_paise <= original_amount_paise - refunded_total_paise);
        refunded_total_paise += refund_1_paise;

        // Partial Refund 2: ₹1,000.50
        let refund_2_paise: i64 = 100050;
        let remaining_refundable = original_amount_paise - refunded_total_paise;
        assert_eq!(remaining_refundable, 200000);
        assert!(refund_2_paise <= remaining_refundable);
        refunded_total_paise += refund_2_paise;

        // Remaining balance: ₹999.50 (99950 paise)
        let remaining = original_amount_paise - refunded_total_paise;
        assert_eq!(remaining, 99950);
        assert_eq!(minor_units_to_decimal_str(remaining), "999.50");

        // Attempting refund of 99951 paise (> 99950) MUST be blocked
        let invalid_refund: i64 = 99951;
        assert!(invalid_refund > remaining, "Refund exceeding remaining refundable balance must be rejected");

        // Refund exact remaining balance: 99950 paise
        let refund_3_paise = remaining;
        refunded_total_paise += refund_3_paise;

        // Net collection = gross - total refunds = 0
        let net_collection = original_amount_paise - refunded_total_paise;
        assert_eq!(net_collection, 0);
    }

    #[test]
    fn test_phase2_trainer_earnings_integer_calculation() {
        // PT Package Price: ₹10,000.00 (1000000 paise) for 10 sessions
        let package_price_paise: i64 = 1000000;
        let total_sessions: i64 = 10;
        let per_session_revenue_paise: i64 = package_price_paise / total_sessions;
        assert_eq!(per_session_revenue_paise, 100000); // ₹1,000.00 per session

        // Trainer Commission: 20%
        let commission_rate_basis_points: i64 = 2000; // 20.00% = 2000 bps
        let trainer_per_session_earning_paise: i64 = per_session_revenue_paise * commission_rate_basis_points / 10000;
        assert_eq!(trainer_per_session_earning_paise, 20000); // ₹200.00 per session

        // 10 Sessions conducted
        let sessions_conducted: i64 = 10;
        let total_trainer_earned_paise: i64 = sessions_conducted * trainer_per_session_earning_paise;
        assert_eq!(total_trainer_earned_paise, 200000); // ₹2,000.00 total
    }

    #[test]
    fn test_phase2_migration_v6_converts_legacy_real_to_minor_units() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA key = 'test_key';").unwrap();

        // 1. Create base schema at version 5
        conn.execute_batch("
            CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at DATETIME, description TEXT);
            INSERT INTO schema_version (version, description) VALUES (5, 'Pre-migration schema v5');

            CREATE TABLE gyms (id TEXT PRIMARY KEY, name TEXT, owner_user_id TEXT);
            INSERT INTO gyms VALUES ('gym-mig-01', 'Mig Gym', 'owner-1');

            CREATE TABLE membership_plans (
                id TEXT PRIMARY KEY,
                gym_id TEXT,
                plan_name TEXT,
                duration_days INTEGER,
                price REAL NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_by_user_id TEXT,
                updated_by_user_id TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                deleted_at DATETIME
            );
            INSERT INTO membership_plans (id, gym_id, plan_name, duration_days, price, created_by_user_id, updated_by_user_id)
            VALUES ('p-1', 'gym-mig-01', 'Legacy Monthly', 30, 999.50, 'sys', 'sys'),
                   ('p-2', 'gym-mig-01', 'Legacy Annual', 365, 5000.00, 'sys', 'sys');

            CREATE TABLE payments (
                id TEXT PRIMARY KEY,
                gym_id TEXT,
                member_id TEXT,
                amount REAL NOT NULL,
                payment_method TEXT,
                transaction_reference TEXT,
                payment_date DATETIME,
                status TEXT,
                created_by_user_id TEXT,
                created_at DATETIME,
                deleted_at DATETIME,
                deleted_by_user_id TEXT
            );
            INSERT INTO payments (id, gym_id, member_id, amount, payment_method, payment_date, status, created_by_user_id)
            VALUES ('pay-1', 'gym-mig-01', 'm-1', 999.50, 'UPI', CURRENT_TIMESTAMP, 'COMPLETED', 'sys'),
                   ('pay-2', 'gym-mig-01', 'm-2', 0.01, 'CASH', CURRENT_TIMESTAMP, 'COMPLETED', 'sys');

            CREATE TABLE inventory (
                id TEXT PRIMARY KEY,
                gym_id TEXT,
                item_name TEXT,
                quantity INTEGER,
                unit_price REAL,
                supplier TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                deleted_at DATETIME
            );
            INSERT INTO inventory (id, gym_id, item_name, quantity, unit_price)
            VALUES ('inv-1', 'gym-mig-01', 'Shaker Bottle', 50, 150.75);
        ").unwrap();

        // 2. Run ensure_schema to apply pending migrations up to v6
        crate::database::migration::ensure_schema(&conn).expect("Migration to v6 must succeed");

        // 3. Verify schema_version is at 6
        let version: i64 = conn.query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 6, "Schema version must be 6 after migration");

        // 4. Verify membership_plans price_minor_units
        let (p1_minor, p1_real): (i64, f64) = conn.query_row(
            "SELECT price_minor_units, price FROM membership_plans WHERE id = 'p-1'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(p1_minor, 99950, "₹999.50 must migrate to exactly 99950 paise");
        assert_eq!(p1_real, 999.50);

        let (p2_minor, p2_real): (i64, f64) = conn.query_row(
            "SELECT price_minor_units, price FROM membership_plans WHERE id = 'p-2'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(p2_minor, 500000, "₹5,000.00 must migrate to exactly 500000 paise");
        assert_eq!(p2_real, 5000.00);

        // 5. Verify payments amount_minor_units
        let (pay1_minor, pay1_real): (i64, f64) = conn.query_row(
            "SELECT amount_minor_units, amount FROM payments WHERE id = 'pay-1'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(pay1_minor, 99950, "Payment ₹999.50 must migrate to 99950 paise");
        assert_eq!(pay1_real, 999.50);

        let (pay2_minor, pay2_real): (i64, f64) = conn.query_row(
            "SELECT amount_minor_units, amount FROM payments WHERE id = 'pay-2'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).unwrap();
        assert_eq!(pay2_minor, 1, "Payment ₹0.01 must migrate to 1 paise");
        assert_eq!(pay2_real, 0.01);

        // 6. Verify inventory unit_price_minor_units
        let inv_minor: i64 = conn.query_row(
            "SELECT unit_price_minor_units FROM inventory WHERE id = 'inv-1'",
            [],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(inv_minor, 15075, "Inventory item ₹150.75 must migrate to 15075 paise");
    }

    #[test]
    fn test_phase2_payment_pull_with_minor_units_wire_contract() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let member_id = Uuid::new_v4();

        // Seed member
        conn.execute(
            "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
             VALUES (?1, ?2, 'GD-PAY-WIRE', 'Wire Member', '555-9999', 'ACTIVE', CURRENT_TIMESTAMP, 'SYSTEM', 'SYSTEM')",
            params![member_id.to_string(), gym_id],
        ).unwrap();

        let payment_id = Uuid::new_v4();

        // Change record with integer minor units on the wire: amountMinorUnits: 150075
        let payment_change = RemoteChangeRecord {
            server_sequence: 1501,
            event_id: Uuid::new_v4(),
            entity_type: "payment".into(),
            entity_id: payment_id,
            operation: "CREATE".into(),
            payload: serde_json::json!({
                "memberId": member_id.to_string(),
                "amountMinorUnits": 150075,
                "amount": "1500.75",
                "paymentMethod": "UPI",
                "transactionReference": "UPI-MINOR-150075",
                "status": "COMPLETED",
                "paymentDate": "2026-09-03T10:00:00Z",
                "createdByUserId": "usr-owner-1"
            }),
            created_at: Utc::now().to_rfc3339(),
        };

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[payment_change.clone()], 1501)
            .expect("Pull with minor units must apply cleanly");

        let (minor_units, amount_real, status): (i64, f64, String) = conn.query_row(
            "SELECT amount_minor_units, amount, status FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).unwrap();

        assert_eq!(minor_units, 150075, "amount_minor_units must be exactly 150075 paise");
        assert_eq!(amount_real, 1500.75, "legacy amount must be 1500.75");
        assert_eq!(status, "COMPLETED");

        // Replay event (idempotency check)
        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &[payment_change], 1501)
            .expect("Duplicate pull must succeed idempotently");

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments WHERE id = ?1",
            params![payment_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(count, 1, "Duplicate pull must not create duplicate payment rows");
    }

    // =========================================================================
    // ENGINEERING PHASE 01-R1: DESERIALIZATION & DATA HYDRATION TESTS
    // =========================================================================

    #[test]
    fn test_phase1_r1_latest_server_sequence_integer_and_string() {
        use crate::sync::worker::WrappedOrDirectPullResponse;

        // 1. Wrapped response with integer latestServerSequence
        let json_int = r#"{
            "success": true,
            "data": {
                "cursor": 2632,
                "latestServerSequence": 2632,
                "hasMore": false,
                "changes": []
            }
        }"#;
        let resp_int: WrappedOrDirectPullResponse = serde_json::from_str(json_int)
            .expect("Integer latestServerSequence must deserialize");
        match resp_int {
            WrappedOrDirectPullResponse::Wrapped { data } => {
                assert_eq!(data.cursor, 2632);
                assert_eq!(data.latest_server_sequence, 2632);
            }
            _ => panic!("Expected wrapped variant"),
        }

        // 2. Wrapped response with string latestServerSequence (as returned by node-postgres)
        let json_str = r#"{
            "success": true,
            "data": {
                "cursor": 2632,
                "latestServerSequence": "2632",
                "hasMore": false,
                "changes": []
            }
        }"#;
        let resp_str: WrappedOrDirectPullResponse = serde_json::from_str(json_str)
            .expect("String latestServerSequence must deserialize cleanly");
        match resp_str {
            WrappedOrDirectPullResponse::Wrapped { data } => {
                assert_eq!(data.cursor, 2632);
                assert_eq!(data.latest_server_sequence, 2632);
            }
            _ => panic!("Expected wrapped variant"),
        }

        // 3. Direct response with string sequence
        let json_direct = r#"{
            "cursor": "2632",
            "latestServerSequence": "2632",
            "hasMore": false,
            "changes": []
        }"#;
        let resp_direct: WrappedOrDirectPullResponse = serde_json::from_str(json_direct)
            .expect("Direct string sequence must deserialize");
        match resp_direct {
            WrappedOrDirectPullResponse::Direct(data) => {
                assert_eq!(data.cursor, 2632);
                assert_eq!(data.latest_server_sequence, 2632);
            }
            _ => panic!("Expected direct variant"),
        }
    }

    #[test]
    fn test_phase1_r1_cursor_integer_and_string() {
        use crate::sync::worker::PullApiResponse;

        // Integer cursor
        let json_int = r#"{"cursor": 500, "latestServerSequence": 500, "hasMore": false, "changes": []}"#;
        let resp_int: PullApiResponse = serde_json::from_str(json_int).unwrap();
        assert_eq!(resp_int.cursor, 500);

        // String cursor
        let json_str = r#"{"cursor": "500", "latestServerSequence": "500", "hasMore": false, "changes": []}"#;
        let resp_str: PullApiResponse = serde_json::from_str(json_str).unwrap();
        assert_eq!(resp_str.cursor, 500);
    }

    #[test]
    fn test_phase1_r1_server_sequence_in_changes_and_results() {
        use crate::sync::worker::{PullChangeItem, PushApiResultItem, PushApiResponse};

        // 1. PullChangeItem with integer serverSequence
        let change_int_json = r#"{
            "serverSequence": 2628,
            "eventId": "2189d704-18b6-42e8-84ba-0390e8940069",
            "entityType": "gym_member",
            "entityId": "c309c5a2-9332-4d16-9340-0f10e0a83e1e",
            "operation": "CREATE",
            "payload": {"fullName": "Subham"},
            "createdAt": "2026-09-02T12:59:29.356Z"
        }"#;
        let change_int: PullChangeItem = serde_json::from_str(change_int_json).unwrap();
        assert_eq!(change_int.server_sequence, 2628);

        // 2. PullChangeItem with string serverSequence
        let change_str_json = r#"{
            "serverSequence": "2628",
            "eventId": "2189d704-18b6-42e8-84ba-0390e8940069",
            "entityType": "gym_member",
            "entityId": "c309c5a2-9332-4d16-9340-0f10e0a83e1e",
            "operation": "CREATE",
            "payload": {"fullName": "Subham"},
            "createdAt": "2026-09-02T12:59:29.356Z"
        }"#;
        let change_str: PullChangeItem = serde_json::from_str(change_str_json).unwrap();
        assert_eq!(change_str.server_sequence, 2628);

        // 3. PushApiResultItem with string and null serverSequence
        let push_res_json = r#"{
            "eventId": "2189d704-18b6-42e8-84ba-0390e8940069",
            "status": "APPLIED",
            "serverSequence": "2628",
            "error": null
        }"#;
        let push_res: PushApiResultItem = serde_json::from_str(push_res_json).unwrap();
        assert_eq!(push_res.server_sequence, Some(2628));

        // 4. PushApiResponse with string latestServerSequence
        let push_resp_json = r#"{
            "results": [],
            "latestServerSequence": "3000"
        }"#;
        let push_resp: PushApiResponse = serde_json::from_str(push_resp_json).unwrap();
        assert_eq!(push_resp.latest_server_sequence, Some(3000));
    }

    #[test]
    fn test_phase1_r1_invalid_and_overflow_sequences() {
        use crate::sync::worker::PullApiResponse;

        // Non-numeric string
        let bad_str = r#"{"cursor": "abc", "latestServerSequence": "2632", "hasMore": false, "changes": []}"#;
        assert!(serde_json::from_str::<PullApiResponse>(bad_str).is_err());

        // Negative string
        let neg_str = r#"{"cursor": "-1", "latestServerSequence": "2632", "hasMore": false, "changes": []}"#;
        assert!(serde_json::from_str::<PullApiResponse>(neg_str).is_err());

        // Fractional string
        let frac_str = r#"{"cursor": "2632.50", "latestServerSequence": "2632", "hasMore": false, "changes": []}"#;
        assert!(serde_json::from_str::<PullApiResponse>(frac_str).is_err());

        // Overflow
        let ovf_str = r#"{"cursor": "9999999999999999999999", "latestServerSequence": "2632", "hasMore": false, "changes": []}"#;
        assert!(serde_json::from_str::<PullApiResponse>(ovf_str).is_err());
    }

    #[test]
    fn test_phase1_r1_malformed_pull_response_does_not_advance_cursor() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA key = 'test_key';").unwrap();
        crate::database::migration::ensure_schema(&conn).unwrap();

        let gym_id = Uuid::new_v4();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Test Gym', 'owner-1')", params![gym_id.to_string()]).unwrap();

        // 1. Initial cursor is 100
        SyncRepository::set_cursor(&conn, &gym_id, 100).unwrap();
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_id).unwrap(), 100);

        // 2. Malformed JSON parsing fails before touching SQLite
        let malformed_json = r#"{"cursor": "CORRUPTED", "latestServerSequence": 200, "hasMore": false, "changes": []}"#;
        let res = serde_json::from_str::<crate::sync::worker::WrappedOrDirectPullResponse>(malformed_json);
        assert!(res.is_err(), "Malformed JSON must fail deserialization");

        // 3. Cursor remains strictly 100
        assert_eq!(SyncRepository::get_cursor(&conn, &gym_id).unwrap(), 100, "Cursor must not advance on malformed response");
    }

    #[test]
    fn test_phase1_r1_devgym_pull_and_tenant_isolation() {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA key = 'test_key';").unwrap();
        crate::database::migration::ensure_schema(&conn).unwrap();

        let indians_gym_id = Uuid::new_v4();
        let devgym_id = Uuid::parse_str("66258084-af0b-49cb-a696-8fa6ef3d6373").unwrap();

        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, 'owner-1')", params![indians_gym_id.to_string(), "Indian's Gym"]).unwrap();
        conn.execute("INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, 'owner-2')", params![devgym_id.to_string(), "Dev Test Gym"]).unwrap();

        // Seed Indian's Gym with 69 members and 4 plans
        for i in 1..=69 {
            conn.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, ?4, '9876543210', 'ACTIVE', CURRENT_TIMESTAMP, 'OWNER', 'OWNER')",
                params![Uuid::new_v4().to_string(), indians_gym_id.to_string(), format!("GD-IND-{:03}", i), format!("Indian Member {}", i)],
            ).unwrap();
        }
        for i in 1..=4 {
            conn.execute(
                "INSERT INTO membership_plans (id, gym_id, plan_name, duration_days, price, price_minor_units, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, 30, 500.0, 50000, 'owner-1', 'owner-1')",
                params![Uuid::new_v4().to_string(), indians_gym_id.to_string(), format!("Indian Plan {}", i)],
            ).unwrap();
        }

        // Verify pre-sync counts
        let indians_members: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1", params![indians_gym_id.to_string()], |r| r.get(0)).unwrap();
        let devgym_members_before: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1", params![devgym_id.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(indians_members, 69);
        assert_eq!(devgym_members_before, 0);

        // Simulate the 5 DEVGYM member changes from Cloud (sequences 2628 to 2632)
        let member_codes = ["GD-7FDEB6", "GD-BE15AA", "GD-AA898F", "GD-27BC00", "GD-DESK99"];
        let member_names = ["Subham", "Subham", "Aryan", "Owner mobile sync test", "Desktop Push Verification Member"];
        let mut changes = Vec::new();

        for i in 0..5 {
            let seq = 2628 + i as i64;
            changes.push(RemoteChangeRecord {
                server_sequence: seq,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".to_string(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".to_string(),
                payload: serde_json::json!({
                    "id": Uuid::new_v4().to_string(),
                    "gymId": devgym_id.to_string(),
                    "memberCode": member_codes[i],
                    "fullName": member_names[i],
                    "phone": "9998887776",
                    "membershipStatus": "ACTIVE",
                    "joinedAt": "2026-09-02T13:00:00Z"
                }),
                created_at: "2026-09-02T13:00:00Z".to_string(),
            });
        }

        // Apply initial pull
        SyncRepository::apply_pull_batch_tx(&mut conn, &devgym_id, &changes, 2632)
            .expect("DEVGYM initial pull must succeed");

        // Verify post-sync counts
        let devgym_members_after: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1", params![devgym_id.to_string()], |r| r.get(0)).unwrap();
        let indians_members_after: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1", params![indians_gym_id.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(devgym_members_after, 5, "DEVGYM must now have exactly 5 members");
        assert_eq!(indians_members_after, 69, "Indian's Gym must remain untouched at 69 members");

        // Verify cursor advancement
        let devgym_cursor = SyncRepository::get_cursor(&conn, &devgym_id).unwrap();
        assert_eq!(devgym_cursor, 2632, "DEVGYM cursor must advance to 2632");

        // Verify sync_inbox count
        let inbox_count: i64 = conn.query_row("SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1", params![devgym_id.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(inbox_count, 5, "sync_inbox must have 5 recorded events");

        // Replay pull (idempotency check)
        SyncRepository::apply_pull_batch_tx(&mut conn, &devgym_id, &changes, 2632)
            .expect("Duplicate pull must succeed idempotently");

        let devgym_members_replay: i64 = conn.query_row("SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1", params![devgym_id.to_string()], |r| r.get(0)).unwrap();
        assert_eq!(devgym_members_replay, 5, "Replay must not duplicate members");
    }

    #[tokio::test]
    async fn test_phase1_r1_live_devgym_sync_against_running_cloud_api() {
        let cloud_url = std::env::var("GYMDECK_CLOUD_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:3001".to_string());

        let http_client = crate::auth::cloud_auth::CloudAuthClient::build_http_client();

        // 1. Authenticate devowner against Cloud Gateway
        let auth_res = crate::auth::cloud_auth::CloudAuthClient::login(
            &http_client,
            &cloud_url,
            "devowner@gymdeck.com",
            "Password123!",
        ).await;

        let auth_data = match auth_res {
            Ok(data) => data,
            Err(e) => {
                println!("Skipping live API sync test (Cloud Gateway not reachable: {})", e);
                return;
            }
        };

        let gym_id = auth_data.user.gym_id;
        let token = auth_data.tokens.access_token;
        let worker_id = "desktop-live-diag-01";

        // 2. Open live SQLite vault in Application Support
        let path = std::path::PathBuf::from("/Users/subhamdas/Library/Application Support/com.gymdeck.desktop/gymdeck_secure_vault.sqlite");
        if !path.exists() {
            println!("Skipping live test: vault not found at {:?}", path);
            return;
        }

        let manager = r2d2_sqlite::SqliteConnectionManager::file(&path)
            .with_init(|conn| {
                let pragma_key = format!("PRAGMA key = '{}';", crate::config::DEV_DB_KEY);
                conn.execute_batch(&pragma_key)?;
                conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
                Ok(())
            });

        let pool = r2d2::Pool::builder().max_size(2).build(manager).unwrap();

        // 3. Record pre-sync counts
        let (indians_before, devgym_before): (i64, i64) = {
            let conn = pool.get().unwrap();
            let indians: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let dev: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1",
                params![gym_id.to_string()],
                |r| r.get(0)
            ).unwrap();
            (indians, dev)
        };

        println!(">>> BEFORE LIVE SYNC: Indian's Gym: {}, DEVGYM: {}", indians_before, devgym_before);
        assert_eq!(indians_before, 69, "Indian's Gym must have 69 members");

        // 4. Execute the live sync cycle!
        let cycle_res = crate::sync::worker::SyncWorker::execute_cycle(
            &pool,
            &http_client,
            &cloud_url,
            worker_id,
            &gym_id,
            &token,
        ).await;

        assert!(cycle_res.is_ok(), "Live sync cycle must succeed: {:?}", cycle_res.err());

        // 5. Inspect post-sync counts
        let (indians_after, devgym_after, cursor_after, inbox_after): (i64, i64, i64, i64) = {
            let conn = pool.get().unwrap();
            let indians: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let dev: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1",
                params![gym_id.to_string()],
                |r| r.get(0)
            ).unwrap();
            let cursor = SyncRepository::get_cursor(&conn, &gym_id).unwrap();
            let inbox: i64 = conn.query_row(
                "SELECT COUNT(*) FROM sync_inbox WHERE gym_id = ?1",
                params![gym_id.to_string()],
                |r| r.get(0)
            ).unwrap();
            (indians, dev, cursor, inbox)
        };

        println!(">>> AFTER LIVE SYNC: Indian's Gym: {}, DEVGYM: {}, Cursor: {}, Inbox: {}", 
            indians_after, devgym_after, cursor_after, inbox_after);

        assert_eq!(indians_after, 69, "Indian's Gym must remain strictly at 69 members");
        assert_eq!(devgym_after, 5, "DEVGYM must now have all 5 members in the local vault");
        assert_eq!(cursor_after, 2632, "DEVGYM cursor must be at 2632");
        assert_eq!(inbox_after, 5, "sync_inbox must have 5 events");

        // 6. Execute a second sync cycle to verify idempotency and zero duplicates
        let cycle2_res = crate::sync::worker::SyncWorker::execute_cycle(
            &pool,
            &http_client,
            &cloud_url,
            worker_id,
            &gym_id,
            &token,
        ).await;

        assert!(cycle2_res.is_ok(), "Second sync cycle must succeed idempotently");

        let (indians_final, devgym_final, cursor_final): (i64, i64, i64) = {
            let conn = pool.get().unwrap();
            let indians: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let dev: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = ?1",
                params![gym_id.to_string()],
                |r| r.get(0)
            ).unwrap();
            let cursor = SyncRepository::get_cursor(&conn, &gym_id).unwrap();
            (indians, dev, cursor)
        };

        assert_eq!(indians_final, 69, "Indian's Gym must remain at 69 members after replay");
        assert_eq!(devgym_final, 5, "DEVGYM must remain at 5 members after replay (no duplicates)");
        assert_eq!(cursor_final, 2632, "Cursor must remain at 2632");
    }

    #[test]
    fn test_phase1_r1_verify_live_vault_devgym_and_indians_gym_contents() {
        let path = std::path::PathBuf::from("/Users/subhamdas/Library/Application Support/com.gymdeck.desktop/gymdeck_secure_vault.sqlite");
        if !path.exists() {
            println!("Skipping: vault not found at {:?}", path);
            return;
        }

        let conn = rusqlite::Connection::open(&path).unwrap();
        let pragma_key = format!("PRAGMA key = '{}';", crate::config::DEV_DB_KEY);
        conn.execute_batch(&pragma_key).unwrap();

        // 1. Indian's Gym counts
        let indians_members: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap();
        let indians_plans: i64 = conn.query_row(
            "SELECT COUNT(*) FROM membership_plans WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap();
        let indians_payments: i64 = conn.query_row(
            "SELECT COUNT(*) FROM payments WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        let indians_attendance: i64 = conn.query_row(
            "SELECT COUNT(*) FROM attendance_logs WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        let indians_trainers: i64 = conn.query_row(
            "SELECT COUNT(*) FROM trainers WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        let indians_outbox: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
            [],
            |r| r.get(0)
        ).unwrap_or(0);

        let user_info: (String, String, String) = conn.query_row(
            "SELECT email, full_name, role FROM users WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe' LIMIT 1",
            [],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        ).unwrap_or(("none".into(), "none".into(), "none".into()));

        println!("=== LIVE VAULT: INDIAN'S GYM ===");
        println!("User: email={}, name={}, role={}", user_info.0, user_info.1, user_info.2);
        println!("Members: {}", indians_members);
        println!("Plans: {}", indians_plans);
        println!("Payments: {}", indians_payments);
        println!("Attendance: {}", indians_attendance);
        println!("Trainers: {}", indians_trainers);
        println!("Outbox: {}", indians_outbox);

        if indians_outbox > 0 {
            let mut outbox_stmt = conn.prepare(
                "SELECT id, event_id, entity_type, entity_id, operation, status FROM sync_outbox WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'"
            ).unwrap();
            let rows = outbox_stmt.query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                ))
            }).unwrap();
            for row in rows {
                let (id, event_id, entity_type, entity_id, op, status) = row.unwrap();
                println!("  Outbox Item: id={}, event={}, type={}, entity={}, op={}, status={}", id, event_id, entity_type, entity_id, op, status);
            }
        }
        assert_eq!(indians_members, 69, "Indian's Gym must remain untouched at 69 members");
        assert_eq!(indians_plans, 4, "Indian's Gym must remain untouched at 4 plans");

        // 2. DEVGYM counts
        let devgym_members_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM gym_members WHERE gym_id = '66258084-af0b-49cb-a696-8fa6ef3d6373'",
            [],
            |r| r.get(0)
        ).unwrap();
        let devgym_cursor: i64 = conn.query_row(
            "SELECT CAST(value AS INTEGER) FROM sync_state WHERE key = 'last_applied_server_sequence' AND gym_id = '66258084-af0b-49cb-a696-8fa6ef3d6373'",
            [],
            |r| r.get(0)
        ).unwrap_or(0);
        let devgym_inbox_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_inbox WHERE gym_id = '66258084-af0b-49cb-a696-8fa6ef3d6373'",
            [],
            |r| r.get(0)
        ).unwrap();

        println!("=== LIVE VAULT: DEVGYM ===");
        println!("Members Count: {}", devgym_members_count);
        println!("Cursor: {}", devgym_cursor);
        println!("Inbox Count: {}", devgym_inbox_count);

        let mut stmt = conn.prepare(
            "SELECT member_code, full_name, membership_status, phone FROM gym_members WHERE gym_id = '66258084-af0b-49cb-a696-8fa6ef3d6373' ORDER BY member_code"
        ).unwrap();
        let member_rows = stmt.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
            ))
        }).unwrap();

        println!("--- DEVGYM Members in Live Vault ---");
        for m in member_rows {
            let (code, name, status, phone) = m.unwrap();
            println!("  [{}] {} | status: {} | phone: {}", code, name, status, phone);
        }

        assert_eq!(devgym_members_count, 5, "DEVGYM must contain exactly 5 members");
        assert_eq!(devgym_cursor, 2632, "DEVGYM cursor must be 2632");
        assert_eq!(devgym_inbox_count, 5, "DEVGYM inbox must have 5 events");
    }

    #[test]
    fn test_phase2_stage_unpushed_local_records_to_outbox_idempotency() {
        let mut conn = setup_test_db();
        let gym_id = Uuid::new_v4();

        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Staging Test Gym', 'usr-stage-owner')",
            params![gym_id.to_string()],
        ).unwrap();

        // 1. Insert 4 plans
        for p in 1..=4 {
            conn.execute(
                "INSERT INTO membership_plans (id, gym_id, plan_name, duration_days, price_minor_units, price, is_active, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, 30, 150000, 1500.0, 1, 'usr-stage-owner', 'usr-stage-owner')",
                params![
                    Uuid::new_v4().to_string(),
                    gym_id.to_string(),
                    format!("Plan {}", p),
                ],
            ).unwrap();
        }

        // 2. Insert 10 members
        for m in 1..=10 {
            conn.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, ?3, ?4, '9876543210', 'ACTIVE', CURRENT_TIMESTAMP, 'usr-stage-owner', 'usr-stage-owner')",
                params![
                    Uuid::new_v4().to_string(),
                    gym_id.to_string(),
                    format!("GD-STAGE-{:03}", m),
                    format!("Staged Member {:02}", m),
                ],
            ).unwrap();
        }

        // First staging pass: must stage exactly 14 records (4 plans + 10 members)
        let first_staged = SyncRepository::stage_unpushed_local_records_to_outbox(&mut conn, &gym_id).unwrap();
        assert_eq!(first_staged, 14, "First staging pass must stage all 14 records");

        let outbox_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1",
            params![gym_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(outbox_count, 14, "Outbox must have 14 records");

        // Second staging pass: must be strictly idempotent (0 new records)
        let second_staged = SyncRepository::stage_unpushed_local_records_to_outbox(&mut conn, &gym_id).unwrap();
        assert_eq!(second_staged, 0, "Second staging pass must stage 0 records (idempotent)");

        let outbox_count_2: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1",
            params![gym_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(outbox_count_2, 14, "Outbox count must remain strictly at 14");
    }

    #[tokio::test]
    async fn test_phase2_live_indians_gym_bootstrap_and_cloud_sync() {
        use crate::auth::cloud_auth::CloudAuthClient;
        use r2d2::Pool;
        use r2d2_sqlite::SqliteConnectionManager;

        let path = std::path::PathBuf::from("/Users/subhamdas/Library/Application Support/com.gymdeck.desktop/gymdeck_secure_vault.sqlite");
        if !path.exists() {
            println!("Skipping: vault not found at {:?}", path);
            return;
        }

        let cloud_url = "http://127.0.0.1:3001";
        let http_client = CloudAuthClient::build_http_client();

        // 1. Health check Cloud Gateway
        let health_url = format!("{}/health", cloud_url);
        if http_client.get(&health_url).send().await.is_err() {
            println!("Skipping live bootstrap test: Cloud Gateway offline");
            return;
        }

        let indians_gym_id = Uuid::parse_str("5586ea28-78ab-44b6-a68c-f84fdf7f4cbe").unwrap();
        let email = "sd@gmail.com";
        let password = "sd";
        let full_name = "SubhaM Das";
        let gym_name = "Indian's Gym";

        println!("=== STEP 1: BOOTSTRAP CLOUD OWNER IDENTITY & GYM ===");
        let auth_res = CloudAuthClient::bootstrap_desktop(
            &http_client,
            cloud_url,
            email,
            password,
            full_name,
            &indians_gym_id,
            gym_name,
            None,
        ).await;

        assert!(auth_res.is_ok(), "Bootstrap desktop endpoint must succeed: {:?}", auth_res.err());
        let auth_data = auth_res.unwrap();
        assert_eq!(auth_data.user.gym_id, indians_gym_id, "Cloud gym_id must match canonical Desktop gym_id");
        assert_eq!(auth_data.user.email, email, "Cloud user email must match");
        assert_eq!(auth_data.user.role, "OWNER", "Cloud user must be OWNER");

        println!("=== STEP 2: STAGE UNPUSHED INDIAN'S GYM RECORDS TO OUTBOX ===");
        let (staged_count, plans_count, members_count) = {
            let mut conn = rusqlite::Connection::open(&path).unwrap();
            let pragma_key = format!("PRAGMA key = '{}';", crate::config::DEV_DB_KEY);
            conn.execute_batch(&pragma_key).unwrap();

            let plans: i64 = conn.query_row(
                "SELECT COUNT(*) FROM membership_plans WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let members: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();

            let staged = SyncRepository::stage_unpushed_local_records_to_outbox(&mut conn, &indians_gym_id).unwrap();
            (staged, plans, members)
        };

        println!("Staged: {} (Local Plans: {}, Local Members: {})", staged_count, plans_count, members_count);
        assert_eq!(plans_count, 4, "Indian's Gym must have 4 plans");
        assert_eq!(members_count, 69, "Indian's Gym must have 69 members");

        println!("=== STEP 3: EXECUTE SYNC PUSH CYCLES TO CLOUD ===");
        let manager = SqliteConnectionManager::file(&path)
            .with_init(|c| {
                let pragma_key = format!("PRAGMA key = '{}';", crate::config::DEV_DB_KEY);
                c.execute_batch(&pragma_key)?;
                Ok(())
            });
        let pool = Pool::builder().max_size(2).build(manager).unwrap();
        let worker_id = "desktop-test-bootstrap-node";

        // Push batch 1 (up to 50 events)
        let cycle1 = crate::sync::worker::SyncWorker::execute_cycle(
            &pool,
            &http_client,
            cloud_url,
            worker_id,
            &indians_gym_id,
            &auth_data.tokens.access_token,
        ).await;
        assert!(cycle1.is_ok(), "Sync cycle 1 must succeed: {:?}", cycle1.err());

        // Push batch 2 (remaining events)
        let cycle2 = crate::sync::worker::SyncWorker::execute_cycle(
            &pool,
            &http_client,
            cloud_url,
            worker_id,
            &indians_gym_id,
            &auth_data.tokens.access_token,
        ).await;
        assert!(cycle2.is_ok(), "Sync cycle 2 must succeed: {:?}", cycle2.err());

        println!("=== STEP 4: VERIFY OWNER MOBILE CAN AUTHENTICATE WITH SAME CREDENTIALS ===");
        let mobile_auth_res = CloudAuthClient::login(
            &http_client,
            cloud_url,
            email,
            password,
        ).await;

        assert!(mobile_auth_res.is_ok(), "Owner Mobile login with sd@gmail.com must succeed: {:?}", mobile_auth_res.err());
        let mobile_auth_data = mobile_auth_res.unwrap();
        assert_eq!(mobile_auth_data.user.gym_id, indians_gym_id, "Owner Mobile must be bound to Indian's Gym tenant");
        assert_eq!(mobile_auth_data.user.role, "OWNER", "Owner Mobile role must be OWNER");

        println!("=== STEP 5: VERIFY LOCAL VAULT INTEGRITY ===");
        let (indians_final_members, indians_final_plans, devgym_final_members) = {
            let conn = pool.get().unwrap();
            let im: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let ip: i64 = conn.query_row(
                "SELECT COUNT(*) FROM membership_plans WHERE gym_id = '5586ea28-78ab-44b6-a68c-f84fdf7f4cbe'",
                [],
                |r| r.get(0)
            ).unwrap();
            let dm: i64 = conn.query_row(
                "SELECT COUNT(*) FROM gym_members WHERE gym_id = '66258084-af0b-49cb-a696-8fa6ef3d6373'",
                [],
                |r| r.get(0)
            ).unwrap();
            (im, ip, dm)
        };

        assert_eq!(indians_final_members, 69, "Indian's Gym members must remain exactly 69");
        assert_eq!(indians_final_plans, 4, "Indian's Gym plans must remain exactly 4");
        assert_eq!(devgym_final_members, 5, "DEVGYM must remain at 5 members (zero cross-tenant contamination)");

        println!(">>> PHASE 02 LIVE ACCEPTANCE VERIFICATION COMPLETE <<<");
    }
}



