#[cfg(test)]
mod communication_settings_tests {
    use rusqlite::Connection;
    use serde_json::{json, Value};
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::errors::AppError;
    use crate::models::user::AuthenticatedContext;
    use crate::repositories::communication_settings_repo::CommunicationSettingsRepository;

    fn ctx(gym: Uuid, user: Uuid) -> AuthenticatedContext {
        AuthenticatedContext {
            session_id: Uuid::new_v4(),
            user_id: user,
            gym_id: gym,
            role: "OWNER".into(),
            permissions: vec![],
        }
    }

    fn seed(conn: &Connection, gym: Uuid, user: Uuid, name: &str) {
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, ?3)",
            rusqlite::params![gym.to_string(), name, user.to_string()],
        )
        .unwrap();
    }

    fn settings(phone: &str, email: &str) -> Value {
        json!({
            "primaryPhone": phone,
            "whatsappNumber": phone,
            "officialEmail": email,
            "mobilePromosAllowed": true,
            "emailNewsletterAllowed": true,
            "quietHoursStart": "21:30",
            "quietHoursEnd": "07:00"
        })
    }

    #[test]
    fn settings_are_locked_to_the_signed_in_gym_and_survive_reopen() {
        let dir = std::env::temp_dir().join(format!("gymdeck_comms_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("vault.sqlite");
        let (ga, gb, ua, ub) = (Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4());

        {
            let mut conn = Connection::open(&path).unwrap();
            ensure_schema(&conn).unwrap();
            seed(&conn, ga, ua, "Gym A");
            seed(&conn, gb, ub, "Gym B");
            let context_a = ctx(ga, ua);
            let context_b = ctx(gb, ub);

            // Nothing stored for a gym that has never saved.
            assert!(CommunicationSettingsRepository::get(&conn, &context_a).unwrap().is_none());

            let saved = CommunicationSettingsRepository::upsert(
                &mut conn,
                &context_a,
                &settings("+91 98765 43210", "desk@gyma.in"),
            )
            .unwrap();
            assert_eq!(saved["primaryPhone"], "+91 98765 43210");
            assert_eq!(saved["officialEmail"], "desk@gyma.in");
            assert_eq!(saved["gymId"], ga.to_string());

            // Gym B stays empty: the write was scoped to the session's gym.
            assert!(CommunicationSettingsRepository::get(&conn, &context_b).unwrap().is_none());

            // Saving again replaces the same row instead of appending a second one.
            CommunicationSettingsRepository::upsert(
                &mut conn,
                &context_a,
                &settings("+91 90000 11111", "frontdesk@gyma.in"),
            )
            .unwrap();
            let rows: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM gym_communication_settings WHERE gym_id = ?1",
                    rusqlite::params![ga.to_string()],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(rows, 1, "one locked row per gym");

            // Gym B can hold its own independent record.
            CommunicationSettingsRepository::upsert(
                &mut conn,
                &context_b,
                &settings("+91 91111 22222", "hello@gymb.in"),
            )
            .unwrap();
        }

        // Reopen the vault: the record is intact and still bound to Gym A.
        {
            let mut conn = Connection::open(&path).unwrap();
            let context_a = ctx(ga, ua);
            let stored = CommunicationSettingsRepository::get(&conn, &context_a)
                .unwrap()
                .expect("Gym A settings must survive reopen");
            assert_eq!(stored["primaryPhone"], "+91 90000 11111");
            assert_eq!(stored["officialEmail"], "frontdesk@gyma.in");
            assert_eq!(stored["mobilePromosAllowed"], true);
            assert_eq!(stored["quietHoursStart"], "21:30");
            assert_eq!(stored["quietHoursEnd"], "07:00");

            let other = CommunicationSettingsRepository::get(&conn, &ctx(gb, ub)).unwrap().unwrap();
            assert_eq!(other["officialEmail"], "hello@gymb.in");

            // Defaults land when a field is omitted by the caller.
            let minimal = CommunicationSettingsRepository::upsert(
                &mut conn,
                &ctx(ga, ua),
                &json!({ "primaryPhone": "+91 98765 43210" }),
            )
            .unwrap();
            assert_eq!(minimal["quietHoursStart"], "22:00");
            assert_eq!(minimal["mobileSmsAllowed"], true);
            assert_eq!(minimal["whatsappPromosAllowed"], false);
        }
    }

    #[test]
    fn invalid_contact_details_are_rejected() {
        let dir = std::env::temp_dir().join(format!("gymdeck_comms_validation_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let mut conn = Connection::open(dir.join("vault.sqlite")).unwrap();
        ensure_schema(&conn).unwrap();
        let gym = Uuid::new_v4();
        let user = Uuid::new_v4();
        seed(&conn, gym, user, "Gym A");
        let context = ctx(gym, user);

        let bad_email = CommunicationSettingsRepository::upsert(
            &mut conn,
            &context,
            &json!({ "officialEmail": "not-an-email" }),
        );
        assert!(matches!(bad_email, Err(AppError::Configuration(_))));

        let bad_phone = CommunicationSettingsRepository::upsert(
            &mut conn,
            &context,
            &json!({ "primaryPhone": "12ab" }),
        );
        assert!(matches!(bad_phone, Err(AppError::Configuration(_))));

        let bad_time = CommunicationSettingsRepository::upsert(
            &mut conn,
            &context,
            &json!({ "quietHoursStart": "25:00" }),
        );
        assert!(matches!(bad_time, Err(AppError::Configuration(_))));

        // Rejected writes leave nothing behind.
        assert!(CommunicationSettingsRepository::get(&conn, &context).unwrap().is_none());
    }
}
