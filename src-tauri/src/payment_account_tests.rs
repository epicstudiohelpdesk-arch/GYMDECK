#[cfg(test)]
mod banking_persistence_tests {
    use rusqlite::Connection;
    use serde_json::json;
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::errors::AppError;
    use crate::models::user::AuthenticatedContext;
    use crate::repositories::payment_account_repo::PaymentAccountRepository;

    fn ctx(gym: Uuid, user: Uuid) -> AuthenticatedContext {
        AuthenticatedContext {
            session_id: Uuid::new_v4(), user_id: user, gym_id: gym,
            role: "OWNER".into(), permissions: vec![],
        }
    }

    fn seed(conn: &Connection, gym: Uuid, user: Uuid, name: &str) {
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, ?3)",
            rusqlite::params![gym.to_string(), name, user.to_string()],
        ).unwrap();
    }

    fn upi(vpa: &str) -> serde_json::Value {
        json!({ "method": "UPI", "beneficiaryName": "Test Owner", "upiVpa": vpa, "isPrimary": true })
    }

    #[test]
    fn accounts_are_isolated_per_gym_and_survive_reopen() {
        let dir = std::env::temp_dir().join(format!("gymdeck_banking_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("vault.sqlite");
        let (ga, gb, ua, ub) = (Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4());
        let created_id;

        {
            let mut conn = Connection::open(&path).unwrap();
            ensure_schema(&conn).unwrap();
            seed(&conn, ga, ua, "Gym A");
            seed(&conn, gb, ub, "Gym B");
            let context_a = ctx(ga, ua);
            let context_b = ctx(gb, ub);

            let a = PaymentAccountRepository::create(&mut conn, &context_a, &upi("owner@okhdfcbank")).unwrap();
            created_id = a["id"].as_str().unwrap().to_string();
            PaymentAccountRepository::create(&mut conn, &context_b, &upi("other@ybl")).unwrap();

            assert_eq!(PaymentAccountRepository::list(&conn, &context_a).unwrap().len(), 1);
            assert_eq!(PaymentAccountRepository::list(&conn, &context_b).unwrap().len(), 1);
            assert_eq!(
                PaymentAccountRepository::list(&conn, &context_b).unwrap()[0]["upiVpa"],
                "other@ybl"
            );

            // Each local write also stages a tenant-scoped cloud sync event.
            let queued: i64 = conn.query_row(
                "SELECT COUNT(*) FROM sync_outbox WHERE gym_id = ?1 AND entity_type = 'payment_account' AND status = 'PENDING'",
                rusqlite::params![ga.to_string()],
                |r| r.get(0),
            ).unwrap();
            assert_eq!(queued, 1, "CREATE must enqueue one outbox event");

            // A different gym cannot mutate or remove Gym A's account.
            assert!(matches!(
                PaymentAccountRepository::update(&mut conn, &context_b, &created_id, &json!({ "beneficiaryName": "Hacked" })),
                Err(AppError::Unauthorized)
            ));
            assert!(matches!(
                PaymentAccountRepository::deactivate(&mut conn, &context_b, &created_id),
                Err(AppError::Unauthorized)
            ));
        }

        // Reopen the vault: the account is still there, tied to Gym A.
        {
            let conn = Connection::open(&path).unwrap();
            let context_a = ctx(ga, ua);
            let accounts = PaymentAccountRepository::list(&conn, &context_a).unwrap();
            assert_eq!(accounts.len(), 1);
            assert_eq!(accounts[0]["id"], created_id);
            assert_eq!(accounts[0]["upiVpa"], "owner@okhdfcbank");
        }

        std::fs::remove_dir_all(&dir).ok();
    }
}
