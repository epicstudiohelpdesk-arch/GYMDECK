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

        // 2. Run schema migration engine (Upgrades v4 -> v5)
        ensure_schema(&conn).expect("ensure_schema must apply Migration 5 cleanly");

        let version: i64 = conn.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version;", [], |r| r.get(0)).unwrap();
        assert_eq!(version, 5, "Database must be successfully migrated to v5");

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
            assert_eq!(version, 5, "Encrypted database must be at version 5");

            let gym_id = Uuid::new_v4();
            SyncRepository::set_cursor(&conn, &gym_id, 350).expect("Should set cursor in encrypted DB");
            assert_eq!(SyncRepository::get_cursor(&conn, &gym_id).unwrap(), 350);
        }

        // 2. Re-open database with encryption key and verify persistence
        {
            let conn = Connection::open(&db_path).expect("Should reopen encrypted database");
            conn.pragma_update(None, "key", encryption_key).expect("Should set SQLCipher key");
            
            let version = crate::database::migration::current_schema_version(&conn).expect("Should read version");
            assert_eq!(version, 5, "Re-opened encrypted database must remain at version 5");
        }

        // 3. Clean up temp dir
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}


