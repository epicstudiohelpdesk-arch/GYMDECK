#[cfg(test)]
mod desktop_sync_verification_tests {
    use rusqlite::Connection;
    use uuid::Uuid;
    use chrono::{Utc, Duration};
    use crate::database::migration::ensure_schema;
    use crate::repositories::sync_repo::{SyncRepository, RemoteChangeRecord};

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to open in-memory SQLite");
        ensure_schema(&conn).expect("Failed to apply migrations");
        
        // Seed test gym
        let gym_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Test Gym', ?2)",
            rusqlite::params![gym_id.to_string(), owner_id.to_string()],
        ).expect("Failed to seed gym");

        conn
    }

    // =========================================================================
    // TEST 3: Desktop outbox concurrent claiming
    // =========================================================================
    #[test]
    fn test_desktop_outbox_concurrent_claiming() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Enqueue 5 events
        {
            let tx = conn.transaction().unwrap();
            for i in 0..5 {
                let entity_id = Uuid::new_v4();
                SyncRepository::enqueue_outbox_event(
                    &tx,
                    &gym_uuid,
                    "gym_member",
                    &entity_id,
                    "CREATE",
                    &format!("{{\"fullName\": \"Member {}\"}}", i),
                ).unwrap();
            }
            tx.commit().unwrap();
        }

        // Worker A claims 3 events
        let worker_a_events = SyncRepository::claim_pending_events(
            &mut conn,
            &gym_uuid,
            "worker-thread-A",
            3,
            60,
        ).unwrap();
        assert_eq!(worker_a_events.len(), 3, "Worker A must claim exactly 3 events");

        // Worker B claims 3 events (only 2 remaining)
        let worker_b_events = SyncRepository::claim_pending_events(
            &mut conn,
            &gym_uuid,
            "worker-thread-B",
            3,
            60,
        ).unwrap();
        assert_eq!(worker_b_events.len(), 2, "Worker B must claim the remaining 2 events");

        // Verify zero overlap between Worker A and Worker B
        let a_ids: std::collections::HashSet<Uuid> = worker_a_events.iter().map(|e| e.event_id).collect();
        for b_event in &worker_b_events {
            assert!(!a_ids.contains(&b_event.event_id), "Workers must never claim the same event simultaneously");
        }
    }

    // =========================================================================
    // TEST 4: IN_FLIGHT lease expiration and recovery
    // =========================================================================
    #[test]
    fn test_in_flight_lease_expiration_and_recovery() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Enqueue 1 event
        {
            let tx = conn.transaction().unwrap();
            SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &Uuid::new_v4(),
                "CREATE",
                "{\"fullName\": \"Crash Candidate\"}",
            ).unwrap();
            tx.commit().unwrap();
        }

        // Worker 1 claims event with 0-second lease (simulating expired lease)
        let claimed_1 = SyncRepository::claim_pending_events(
            &mut conn,
            &gym_uuid,
            "crashed-worker-1",
            1,
            -1, // Already expired in the past
        ).unwrap();
        assert_eq!(claimed_1.len(), 1);

        // Worker 2 attempts claim -> lease expiry recovers the stranded event
        let claimed_2 = SyncRepository::claim_pending_events(
            &mut conn,
            &gym_uuid,
            "recovering-worker-2",
            1,
            60,
        ).unwrap();
        assert_eq!(claimed_2.len(), 1, "Expired in-flight lease must be recovered by new worker");
        assert_eq!(claimed_2[0].event_id, claimed_1[0].event_id);
        assert_eq!(claimed_2[0].worker_id.as_deref(), Some("recovering-worker-2"));
    }

    // =========================================================================
    // TEST 5: Exponential retry backoff
    // =========================================================================
    #[test]
    fn test_exponential_retry_backoff() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        let event_id = {
            let tx = conn.transaction().unwrap();
            let id = SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &Uuid::new_v4(),
                "CREATE",
                "{\"fullName\": \"Backoff Test\"}",
            ).unwrap();
            tx.commit().unwrap();
            id
        };

        // Claim event (attempt 1)
        let _ = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "worker-1", 1, 60).unwrap();

        // Mark failed (transient)
        SyncRepository::mark_event_failed(
            &conn,
            &event_id,
            "NETWORK_TIMEOUT",
            "Simulated timeout",
            false,
        ).unwrap();

        // Check that next_retry_at is set into the future
        let next_retry: Option<String> = conn.query_row(
            "SELECT next_retry_at FROM sync_outbox WHERE event_id = ?1",
            rusqlite::params![event_id.to_string()],
            |r| r.get(0),
        ).unwrap();

        assert!(next_retry.is_some(), "next_retry_at must be scheduled");
        let retry_time = chrono::DateTime::parse_from_rfc3339(&next_retry.unwrap()).unwrap().with_timezone(&Utc);
        assert!(retry_time >= Utc::now() - Duration::seconds(1), "next_retry_at must be in future");

        // Immediate subsequent claim must find 0 eligible events due to backoff
        let immediate_claim = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "worker-1", 1, 60).unwrap();
        assert_eq!(immediate_claim.len(), 0, "Event in backoff must not be immediately re-claimed");
    }

    // =========================================================================
    // TEST 6: Permanent failure remains FAILED
    // =========================================================================
    #[test]
    fn test_permanent_failure_remains_failed() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        let event_id = {
            let tx = conn.transaction().unwrap();
            let id = SyncRepository::enqueue_outbox_event(
                &tx,
                &gym_uuid,
                "gym_member",
                &Uuid::new_v4(),
                "CREATE",
                "{\"invalid\": true}",
            ).unwrap();
            tx.commit().unwrap();
            id
        };

        // Mark permanently failed
        SyncRepository::mark_event_failed(
            &conn,
            &event_id,
            "VALIDATION_ERROR",
            "Invalid member payload",
            true,
        ).unwrap();

        let status: String = conn.query_row(
            "SELECT status FROM sync_outbox WHERE event_id = ?1",
            rusqlite::params![event_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(status, "FAILED", "Status must remain FAILED");

        // Must not be claimed
        let claimed = SyncRepository::claim_pending_events(&mut conn, &gym_uuid, "worker-1", 1, 60).unwrap();
        assert_eq!(claimed.len(), 0, "FAILED event must never be claimed for retry");
    }

    // =========================================================================
    // TEST 7: Pull batch + cursor atomicity
    // =========================================================================
    #[test]
    fn test_pull_batch_cursor_atomicity() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        let member_id = Uuid::new_v4();
        let changes = vec![
            RemoteChangeRecord {
                server_sequence: 101,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: member_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "fullName": "Pulled Member 1",
                    "phone": "+15551234567",
                    "memberCode": "GD-PULL-1"
                }),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &changes, 101).unwrap();

        // Verify member inserted
        let full_name: String = conn.query_row(
            "SELECT full_name FROM gym_members WHERE id = ?1",
            rusqlite::params![member_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(full_name, "Pulled Member 1");

        // Verify cursor advanced to 101
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 101, "Cursor must advance to 101 atomically");
    }

    // =========================================================================
    // TEST 8: Interrupted pull resumes safely (Rollback on failure)
    // =========================================================================
    #[test]
    fn test_interrupted_pull_rollback_safety() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();

        // Initial cursor at 50
        SyncRepository::set_cursor(&conn, &gym_uuid, 50).unwrap();

        let invalid_changes = vec![
            RemoteChangeRecord {
                server_sequence: 51,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({ "fullName": "Valid Before Failure" }),
                created_at: Utc::now().to_rfc3339(),
            },
            // Simulate broken statement / constraint violation in transaction
            RemoteChangeRecord {
                server_sequence: 52,
                event_id: Uuid::new_v4(),
                entity_type: "unsupported_malformed_entity".into(),
                entity_id: Uuid::new_v4(),
                operation: "INVALID".into(),
                payload: serde_json::json!({}),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        // Apply batch
        let _ = SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &invalid_changes, 52);

        // Cursor must not advance if transaction fails
        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 50, "Cursor must stay at 50 on pull failure");
    }

    // =========================================================================
    // TEST 9: Background sync worker start / stop lifecycle
    // =========================================================================
    #[tokio::test]
    async fn test_background_sync_worker_lifecycle() {
        let manager = r2d2_sqlite::SqliteConnectionManager::memory();
        let pool = r2d2::Pool::new(manager).unwrap();
        
        {
            let conn = pool.get().unwrap();
            ensure_schema(&conn).unwrap();
        }

        let gym_id = Uuid::new_v4();
        let worker = crate::sync::worker::SyncWorker::new(pool, Some("http://127.0.0.1:9999".into()));
        
        let flag = worker.start(gym_id, None);
        assert!(flag.load(std::sync::atomic::Ordering::SeqCst), "Worker must be running on start");

        // Stop cleanly
        flag.store(false, std::sync::atomic::Ordering::SeqCst);
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        assert!(!flag.load(std::sync::atomic::Ordering::SeqCst), "Worker must stop cleanly");
    }

    // =========================================================================
    // TEST 10: Push and Pull response metadata, inbox ack, and watermark tracking
    // =========================================================================
    #[test]
    fn test_push_and_pull_response_metadata_and_inbox_ack() {
        let mut conn = setup_test_db();
        let gym_id: String = conn.query_row("SELECT id FROM gyms LIMIT 1", [], |r| r.get(0)).unwrap();
        let gym_uuid = Uuid::parse_str(&gym_id).unwrap();
        let event_id = Uuid::new_v4();

        // 1. Test inbox pre-acknowledgment from push response
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, 105, &event_id).expect("Should record inbox ack");

        let inbox_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_inbox WHERE server_sequence = 105 AND event_id = ?1",
            rusqlite::params![event_id.to_string()],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(inbox_count, 1, "Inbox ack must exist in sync_inbox");

        // Calling again with same sequence must not error (idempotent)
        SyncRepository::record_inbox_ack(&conn, &gym_uuid, 105, &event_id).expect("Duplicate ack must not fail");

        // 2. Test cloud watermark tracking from pull response
        SyncRepository::set_sync_state(&conn, &gym_uuid, "cloud_latest_server_sequence", "250")
            .expect("Should set cloud watermark");

        let watermark: String = conn.query_row(
            "SELECT value FROM sync_state WHERE key = 'cloud_latest_server_sequence' AND gym_id = ?1",
            rusqlite::params![gym_id],
            |r| r.get(0),
        ).unwrap();
        assert_eq!(watermark, "250", "Cloud watermark sequence must match stored value");

        // 3. Test pull batch with pre-acknowledged sequence doesn't conflict
        let pull_changes = vec![
            RemoteChangeRecord {
                server_sequence: 105, // Same sequence as acked push
                event_id,
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({ "fullName": "Acked Member" }),
                created_at: Utc::now().to_rfc3339(),
            },
            RemoteChangeRecord {
                server_sequence: 106,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: Uuid::new_v4(),
                operation: "CREATE".into(),
                payload: serde_json::json!({ "fullName": "New Member" }),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        SyncRepository::apply_pull_batch_tx(&mut conn, &gym_uuid, &pull_changes, 106)
            .expect("Pull batch with pre-existing ack sequence must succeed cleanly");

        let cursor = SyncRepository::get_cursor(&conn, &gym_uuid).unwrap();
        assert_eq!(cursor, 106, "Cursor must advance to 106");
    }

    // =========================================================================
    // TEST 5: Cloud Enrollment & Authoritative Tenant Binding Verification
    // =========================================================================
    #[test]
    fn test_cloud_enrollment_and_tenant_binding() {
        let mut conn = setup_test_db();
        let devgym_id = Uuid::parse_str("66258084-af0b-49cb-a696-8fa6ef3d6373").unwrap();
        let devowner_id = Uuid::parse_str("463a146f-faff-4729-a15b-4b236bc17b3d").unwrap();

        // 1. Provision DEVGYM in SQLite
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Dev Test Gym', ?2)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name",
            rusqlite::params![devgym_id.to_string(), devowner_id.to_string()],
        ).expect("Failed to provision DEVGYM");

        conn.execute(
            "INSERT INTO users (id, gym_id, full_name, email, password_hash, role, account_status)
             VALUES (?1, ?2, 'Dev Gym Owner', 'devowner@gymdeck.com', 'CLOUD_AUTH', 'OWNER', 'ACTIVE')
             ON CONFLICT(id) DO UPDATE SET gym_id = excluded.gym_id",
            rusqlite::params![devowner_id.to_string(), devgym_id.to_string()],
        ).expect("Failed to provision devowner");

        // 2. Simulate Cloud Pull for Owner Mobile created members (Subham GD-7FDEB6 and Subham GD-BE15AA)
        let subham_1_id = Uuid::parse_str("c309c5a2-9332-4d16-9340-0f10e0a83e1e").unwrap();
        let subham_2_id = Uuid::parse_str("7f32e82c-d582-4551-8c4e-c282f23dbbf6").unwrap();

        let remote_changes = vec![
            RemoteChangeRecord {
                server_sequence: 2628,
                event_id: Uuid::new_v4(),
                entity_type: "gym_member".into(),
                entity_id: subham_1_id,
                operation: "CREATE".into(),
                payload: serde_json::json!({
                    "id": subham_1_id.to_string(),
                    "fullName": "Subham",
                    "phone": "6291773811",
                    "memberCode": "GD-7FDEB6",
                    "membershipStatus": "ACTIVE",
                    "gender": "MALE",
                    "notes": "Didi"
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
                    "id": subham_2_id.to_string(),
                    "fullName": "Subham",
                    "phone": "6219773811",
                    "memberCode": "GD-BE15AA",
                    "membershipStatus": "ACTIVE",
                    "gender": "MALE"
                }),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        // 3. Apply initial reconciliation pull batch
        SyncRepository::apply_pull_batch_tx(&mut conn, &devgym_id, &remote_changes, 2629)
            .expect("Initial reconciliation pull must apply cleanly");

        // Verify cursor advanced to 2629 for DEVGYM
        let cursor = SyncRepository::get_cursor(&conn, &devgym_id).unwrap();
        assert_eq!(cursor, 2629, "DEVGYM cursor must advance to 2629");

        // 4. Query members for DEVGYM
        let mut stmt = conn.prepare("SELECT id, member_code, full_name, phone FROM gym_members WHERE gym_id = ?1;").unwrap();
        let dev_members: Vec<(String, String, String, String)> = stmt.query_map(
            rusqlite::params![devgym_id.to_string()],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        ).unwrap().filter_map(|r| r.ok()).collect();

        assert_eq!(dev_members.len(), 2, "DEVGYM must contain exactly 2 synced members");
        assert!(dev_members.iter().any(|m| m.1 == "GD-7FDEB6" && m.2 == "Subham"));
        assert!(dev_members.iter().any(|m| m.1 == "GD-BE15AA" && m.2 == "Subham"));

        // 5. Cross-Tenant Isolation: Ensure Test Gym (gym_1) has 0 members
        let other_gym_id: String = conn.query_row("SELECT id FROM gyms WHERE id != ?1 LIMIT 1", rusqlite::params![devgym_id.to_string()], |r| r.get(0)).unwrap();
        let other_count: i64 = conn.query_row("SELECT count(*) FROM gym_members WHERE gym_id = ?1", rusqlite::params![other_gym_id], |r| r.get(0)).unwrap();
        assert_eq!(other_count, 0, "Other gym must NOT receive DEVGYM members");
    }

    // =========================================================================
    // TEST 6: Bidirectional Synchronization (Desktop Outbox -> Cloud Push)
    // =========================================================================
    #[test]
    fn test_desktop_to_cloud_bidirectional_flow() {
        let mut conn = setup_test_db();
        let devgym_id = Uuid::parse_str("66258084-af0b-49cb-a696-8fa6ef3d6373").unwrap();
        let owner_id = Uuid::new_v4();

        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Dev Test Gym', ?2)",
            rusqlite::params![devgym_id.to_string(), owner_id.to_string()],
        ).unwrap();

        // 1. Desktop creates a new member locally in DEVGYM
        let new_member_id = Uuid::new_v4();
        {
            let tx = conn.transaction().unwrap();
            tx.execute(
                "INSERT INTO gym_members (id, gym_id, member_code, full_name, phone, membership_status, joined_at, created_by_user_id, updated_by_user_id)
                 VALUES (?1, ?2, 'GD-DESK01', 'DesktopToOwner Sync Test', '9876543210', 'ACTIVE', CURRENT_TIMESTAMP, 'DEVOWNER', 'DEVOWNER')",
                rusqlite::params![new_member_id.to_string(), devgym_id.to_string()],
            ).unwrap();

            // Enqueue outbox event
            SyncRepository::enqueue_outbox_event(
                &tx,
                &devgym_id,
                "gym_member",
                &new_member_id,
                "CREATE",
                &serde_json::json!({
                    "id": new_member_id.to_string(),
                    "gymId": devgym_id.to_string(),
                    "memberCode": "GD-DESK01",
                    "fullName": "DesktopToOwner Sync Test",
                    "phone": "9876543210",
                    "membershipStatus": "ACTIVE"
                }).to_string(),
            ).unwrap();
            tx.commit().unwrap();
        }

        // 2. Claim event by Desktop sync worker
        let claimed = SyncRepository::claim_pending_events(
            &mut conn,
            &devgym_id,
            "desktop-node-01",
            10,
            60,
        ).unwrap();
        assert_eq!(claimed.len(), 1, "Must claim 1 outbox event");
        assert_eq!(claimed[0].entity_id, new_member_id);

        // 3. Simulate successful Cloud Push ack at server sequence 2630
        SyncRepository::record_inbox_ack(&conn, &devgym_id, 2630, &claimed[0].event_id).unwrap();
        SyncRepository::mark_event_synced(&conn, &claimed[0].event_id).unwrap();

        // Verify outbox status is SYNCED
        let pending = SyncRepository::get_pending_events(&conn, &devgym_id, 10).unwrap();
        assert_eq!(pending.len(), 0, "No pending outbox events should remain");
    }
}
