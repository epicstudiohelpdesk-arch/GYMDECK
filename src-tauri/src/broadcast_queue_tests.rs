#[cfg(test)]
mod broadcast_queue_tests {
    use rusqlite::Connection;
    use serde_json::json;
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::models::user::AuthenticatedContext;
    use crate::repositories::broadcast_queue_repo::BroadcastQueueRepository;

    fn ctx(gym: Uuid, user: Uuid) -> AuthenticatedContext {
        AuthenticatedContext {
            session_id: Uuid::new_v4(),
            user_id: user,
            gym_id: gym,
            role: "OWNER".into(),
            permissions: vec![],
        }
    }

    fn seed_gym(conn: &Connection, gym: Uuid, user: Uuid, name: &str) {
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, ?3)",
            rusqlite::params![gym.to_string(), name, user.to_string()],
        )
        .unwrap();
    }

    fn seed_member(
        conn: &Connection,
        gym: Uuid,
        user: Uuid,
        code: &str,
        name: &str,
        phone: &str,
        status: &str,
        expires_at: &str,
        plan_id: Option<&str>,
    ) -> String {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO gym_members (
                id, gym_id, member_code, full_name, phone, membership_status, joined_at,
                expires_at, membership_plan_id, created_by_user_id, updated_by_user_id
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10)",
            rusqlite::params![
                id,
                gym.to_string(),
                code,
                name,
                phone,
                status,
                "2025-01-05T00:00:00Z",
                expires_at,
                plan_id,
                user.to_string(),
            ],
        )
        .unwrap();
        id
    }

    fn seed_plan(conn: &Connection, gym: Uuid, user: Uuid, name: &str, price_minor: i64) -> String {
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO membership_plans (
                id, gym_id, plan_name, duration_days, price_minor_units,
                created_by_user_id, updated_by_user_id
             ) VALUES (?1,?2,?3,30,?4,?5,?5)",
            rusqlite::params![id, gym.to_string(), name, price_minor, user.to_string()],
        )
        .unwrap();
        id
    }

    #[test]
    fn preview_renders_member_specific_links_and_skips_unusable_numbers() {
        let dir = std::env::temp_dir().join(format!("gymdeck_broadcast_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("vault.sqlite");
        let (gym, user) = (Uuid::new_v4(), Uuid::new_v4());

        let mut conn = Connection::open(&path).unwrap();
        ensure_schema(&conn).unwrap();
        seed_gym(&conn, gym, user, "Iron Temple");
        let plan_id = seed_plan(&conn, gym, user, "Gold Monthly", 120_000);
        let context = ctx(gym, user);

        let good = seed_member(
            &conn,
            gym,
            user,
            "GD-1001",
            "Rahul Sharma",
            "9876543210",
            "EXPIRED",
            "2026-11-25",
            Some(&plan_id),
        );
        let bad_phone = seed_member(
            &conn,
            gym,
            user,
            "GD-1002",
            "Priya Das",
            "N/A",
            "ACTIVE",
            "2026-12-30",
            None,
        );
        let duplicate = seed_member(
            &conn,
            gym,
            user,
            "GD-1003",
            "Amit Roy",
            "+91 98765 43210",
            "ACTIVE",
            "2026-12-01",
            None,
        );

        let queue = BroadcastQueueRepository::preview(
            &mut conn,
            &context,
            &json!({
                "channel": "WHATSAPP",
                "messageKind": "DUES_REMINDER",
                "title": "Fee reminder",
                "body": "Hi {first_name}, your {plan} fee of {amount} is due on {due_date}. — {gym_name}",
                "audienceLabel": "Pending dues",
                "memberIds": [good, bad_phone, duplicate],
            }),
        )
        .unwrap();

        let broadcast = &queue["broadcast"];
        assert_eq!(broadcast["recipientCount"], 3);
        assert_eq!(broadcast["queuedCount"], 1);
        assert_eq!(broadcast["skippedCount"], 2);
        assert_eq!(broadcast["status"], "QUEUED");
        let recipients = queue["recipients"].as_array().unwrap();
        assert_eq!(recipients.len(), 3);

        let queued = recipients
            .iter()
            .find(|item| item["status"] == "QUEUED")
            .unwrap();
        assert_eq!(queued["memberName"], "Rahul Sharma");
        assert_eq!(queued["phoneMasked"], "+91 ••••• 3210");
        let rendered = queued["renderedBody"].as_str().unwrap();
        assert!(rendered.contains("Hi Rahul,"), "rendered: {}", rendered);
        assert!(rendered.contains("Gold Monthly"), "rendered: {}", rendered);
        assert!(rendered.contains("₹1,200"), "rendered: {}", rendered);
        assert!(rendered.contains("25 Nov 2026"), "rendered: {}", rendered);
        assert!(rendered.contains("Iron Temple"), "rendered: {}", rendered);

        let link = queued["sendUrl"].as_str().unwrap();
        assert!(link.starts_with("https://wa.me/919876543210?text="));
        assert!(link.contains("Hi%20Rahul%2C"));

        let reasons: Vec<&str> = recipients
            .iter()
            .filter(|item| item["status"] == "SKIPPED")
            .map(|item| item["skipReason"].as_str().unwrap())
            .collect();
        assert!(reasons.contains(&"NO_PHONE"));
        assert!(reasons.contains(&"DUPLICATE_PHONE"));

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn recording_results_and_cancelling_keeps_run_counters_honest() {
        let dir = std::env::temp_dir().join(format!("gymdeck_broadcast_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("vault.sqlite");
        let (gym, user) = (Uuid::new_v4(), Uuid::new_v4());

        let mut conn = Connection::open(&path).unwrap();
        ensure_schema(&conn).unwrap();
        seed_gym(&conn, gym, user, "Iron Temple");
        let context = ctx(gym, user);
        let first = seed_member(
            &conn, gym, user, "GD-2001", "Neha Bose", "9000000001", "ACTIVE", "2026-12-05", None,
        );
        let second = seed_member(
            &conn, gym, user, "GD-2002", "Vikram Sen", "9000000002", "ACTIVE", "2026-12-06", None,
        );

        let queue = BroadcastQueueRepository::preview(
            &mut conn,
            &context,
            &json!({
                "body": "Hi {name}, your renewal is due.",
                "memberIds": [first, second],
            }),
        )
        .unwrap();
        let broadcast_id = queue["broadcast"]["id"].as_str().unwrap().to_string();
        let recipients = queue["recipients"].as_array().unwrap();
        let first_recipient = recipients[0]["id"].as_str().unwrap().to_string();
        let second_recipient = recipients[1]["id"].as_str().unwrap().to_string();

        let after_sent = BroadcastQueueRepository::record_result(
            &mut conn,
            &context,
            &json!({ "broadcastId": broadcast_id, "recipientId": first_recipient, "status": "SENT" }),
        )
        .unwrap();
        assert_eq!(after_sent["broadcast"]["sentCount"], 1);
        assert_eq!(after_sent["broadcast"]["queuedCount"], 1);
        assert_eq!(after_sent["broadcast"]["status"], "IN_PROGRESS");

        let after_failed = BroadcastQueueRepository::record_result(
            &mut conn,
            &context,
            &json!({ "broadcastId": broadcast_id, "recipientId": second_recipient, "status": "FAILED" }),
        )
        .unwrap();
        assert_eq!(after_failed["broadcast"]["failedCount"], 1);
        assert_eq!(after_failed["broadcast"]["queuedCount"], 0);
        assert_eq!(after_failed["broadcast"]["status"], "COMPLETED");

        let history = BroadcastQueueRepository::list(&conn, &context, 50).unwrap();
        assert_eq!(history.len(), 1);

        let second_run = BroadcastQueueRepository::preview(
            &mut conn,
            &context,
            &json!({ "body": "Reminder for {first_name}.", "memberIds": [first, second] }),
        )
        .unwrap();
        let run_id = second_run["broadcast"]["id"].as_str().unwrap().to_string();
        let cancelled = BroadcastQueueRepository::cancel(&mut conn, &context, &run_id).unwrap();
        assert_eq!(cancelled["broadcast"]["status"], "CANCELLED");
        assert_eq!(cancelled["broadcast"]["queuedCount"], 0);
        assert_eq!(cancelled["broadcast"]["skippedCount"], 2);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn a_gym_cannot_read_or_delete_another_gyms_queue() {
        let dir = std::env::temp_dir().join(format!("gymdeck_broadcast_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("vault.sqlite");
        let (ga, gb, ua, ub) = (Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4());

        let mut conn = Connection::open(&path).unwrap();
        ensure_schema(&conn).unwrap();
        seed_gym(&conn, ga, ua, "Gym A");
        seed_gym(&conn, gb, ub, "Gym B");
        let member_a = seed_member(
            &conn, ga, ua, "GD-3001", "Sara Khan", "9000000010", "ACTIVE", "2026-12-10", None,
        );

        let queue = BroadcastQueueRepository::preview(
            &mut conn,
            &ctx(ga, ua),
            &json!({ "body": "Hi {first_name}, dues reminder.", "memberIds": [member_a] }),
        )
        .unwrap();
        let run_id = queue["broadcast"]["id"].as_str().unwrap().to_string();

        let other = ctx(gb, ub);
        assert!(BroadcastQueueRepository::get(&conn, &other, &run_id).is_err());
        assert!(BroadcastQueueRepository::delete(&mut conn, &other, &run_id).is_err());
        assert!(BroadcastQueueRepository::list(&conn, &other, 50).unwrap().is_empty());

        BroadcastQueueRepository::delete(&mut conn, &ctx(ga, ua), &run_id).unwrap();
        assert!(BroadcastQueueRepository::list(&conn, &ctx(ga, ua), 50)
            .unwrap()
            .is_empty());

        std::fs::remove_dir_all(&dir).ok();
    }
}
