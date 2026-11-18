#[cfg(test)]
mod gym_profile_tests {
    use rusqlite::Connection;
    use serde_json::json;
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::errors::AppError;
    use crate::models::user::AuthenticatedContext;
    use crate::repositories::gym_profile_repo::GymProfileRepository;

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

    const LOGO: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
    const COVER: &str = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

    #[test]
    fn general_details_and_brand_images_are_locked_to_the_signed_in_gym() {
        let dir = std::env::temp_dir().join(format!("gymdeck_profile_test_{}", Uuid::new_v4()));
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

            assert!(GymProfileRepository::get(&conn, &context_a).unwrap().is_none());

            let saved = GymProfileRepository::upsert(
                &mut conn,
                &context_a,
                &json!({
                    "displayName": "Iron Temple Fitness",
                    "tagline": "Strength • Discipline",
                    "description": "Three floors of free weights.",
                    "foundedYear": "2018",
                    "businessType": "Commercial Gym",
                    "website": "https://irontemple.in",
                    "address": "12 Park Street",
                    "city": "Kolkata",
                    "state": "West Bengal",
                    "pincode": "700016",
                    "openingHours": "05:00",
                    "closingHours": "23:00",
                    "weekendOpening": "06:00",
                    "weekendClosing": "22:00",
                    "slotDurationMinutes": "60",
                    "autoHolidayClosure": false,
                    "qrCheckinEnabled": true,
                    "qrTurnstileRelay": false,
                    "qrAudibleChime": false,
                    "isPubliclyActive": true,
                    "subdomain": "IronTemple",
                    "logoDataUrl": LOGO,
                    "coverDataUrl": COVER,
                    "branches": [
                        { "id": "branch-1", "name": "Salt Lake", "isMain": true, "members": 320, "trainers": 6, "secret": "drop me" }
                    ]
                }),
            )
            .unwrap();

            assert_eq!(saved["displayName"], "Iron Temple Fitness");
            assert_eq!(saved["gymId"], ga.to_string());
            assert_eq!(saved["logoDataUrl"], LOGO);
            assert_eq!(saved["coverDataUrl"], COVER);
            assert_eq!(saved["autoHolidayClosure"], false);
            assert_eq!(saved["qrTurnstileRelay"], false);
            assert_eq!(saved["subdomain"], "irontemple", "subdomains are normalised");
            assert_eq!(saved["branches"][0]["name"], "Salt Lake");
            assert!(saved["branches"][0].get("secret").is_none(), "unknown branch keys are dropped");

            // Gym B cannot see Gym A's row.
            assert!(GymProfileRepository::get(&conn, &context_b).unwrap().is_none());

            // Re-saving replaces the single locked row.
            GymProfileRepository::upsert(
                &mut conn,
                &context_a,
                &json!({ "displayName": "Iron Temple HQ", "logoDataUrl": LOGO }),
            )
            .unwrap();
            let rows: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM gym_profile_details WHERE gym_id = ?1",
                    rusqlite::params![ga.to_string()],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(rows, 1, "one locked row per gym");
        }

        // Reopen the vault: General details and the uploaded images come back.
        {
            let conn = Connection::open(&path).unwrap();
            let stored = GymProfileRepository::get(&conn, &ctx(ga, ua))
                .unwrap()
                .expect("gym profile must survive reopen");
            assert_eq!(stored["displayName"], "Iron Temple HQ");
            assert_eq!(stored["logoDataUrl"], LOGO);
            assert_eq!(stored["coverDataUrl"], serde_json::Value::Null, "full write replaced the omitted cover");
        }
    }

    #[test]
    fn media_write_only_touches_the_image_it_receives() {
        let dir = std::env::temp_dir().join(format!("gymdeck_profile_media_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let mut conn = Connection::open(dir.join("vault.sqlite")).unwrap();
        ensure_schema(&conn).unwrap();
        let gym = Uuid::new_v4();
        let user = Uuid::new_v4();
        seed(&conn, gym, user, "Gym A");
        let context = ctx(gym, user);

        // An upload before anything else creates the row with defaults.
        let saved = GymProfileRepository::save_media(&mut conn, &context, Some(Some(LOGO.into())), None).unwrap();
        assert_eq!(saved["logoDataUrl"], LOGO);
        assert_eq!(saved["coverDataUrl"], serde_json::Value::Null);
        assert_eq!(saved["isPubliclyActive"], true);

        // Saving the cover leaves the logo untouched.
        let saved = GymProfileRepository::save_media(&mut conn, &context, None, Some(Some(COVER.into()))).unwrap();
        assert_eq!(saved["logoDataUrl"], LOGO);
        assert_eq!(saved["coverDataUrl"], COVER);

        // Clearing the logo keeps the cover.
        let cleared = GymProfileRepository::save_media(&mut conn, &context, Some(None), None).unwrap();
        assert_eq!(cleared["logoDataUrl"], serde_json::Value::Null);
        assert_eq!(cleared["coverDataUrl"], COVER);

        // A full save writes both images back.
        let updated = GymProfileRepository::upsert(
            &mut conn,
            &context,
            &json!({ "displayName": "Gym A", "logoDataUrl": LOGO, "coverDataUrl": COVER }),
        )
        .unwrap();
        assert_eq!(updated["logoDataUrl"], LOGO);
    }

    #[test]
    fn invalid_profile_details_and_images_are_rejected() {
        let dir = std::env::temp_dir().join(format!("gymdeck_profile_invalid_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let mut conn = Connection::open(dir.join("vault.sqlite")).unwrap();
        ensure_schema(&conn).unwrap();
        let gym = Uuid::new_v4();
        let user = Uuid::new_v4();
        seed(&conn, gym, user, "Gym A");
        let context = ctx(gym, user);

        let blob_logo = GymProfileRepository::upsert(
            &mut conn,
            &context,
            &json!({ "displayName": "Gym A", "logoDataUrl": "blob:http://localhost/123" }),
        );
        assert!(matches!(blob_logo, Err(AppError::Configuration(_))));

        let remote_cover = GymProfileRepository::save_media(
            &mut conn,
            &context,
            None,
            Some(Some("https://example.com/cover.jpg".into())),
        );
        assert!(matches!(remote_cover, Err(AppError::Configuration(_))));

        let bad_website = GymProfileRepository::upsert(
            &mut conn,
            &context,
            &json!({ "displayName": "Gym A", "website": "irontemple.in" }),
        );
        assert!(matches!(bad_website, Err(AppError::Configuration(_))));

        let bad_pincode = GymProfileRepository::upsert(
            &mut conn,
            &context,
            &json!({ "displayName": "Gym A", "pincode": "70A016" }),
        );
        assert!(matches!(bad_pincode, Err(AppError::Configuration(_))));

        let bad_branches = GymProfileRepository::upsert(
            &mut conn,
            &context,
            &json!({ "displayName": "Gym A", "branches": "not-a-list" }),
        );
        assert!(matches!(bad_branches, Err(AppError::Configuration(_))));

        // Rejected writes leave nothing behind.
        assert!(GymProfileRepository::get(&conn, &context).unwrap().is_none());
    }
}
