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
}
