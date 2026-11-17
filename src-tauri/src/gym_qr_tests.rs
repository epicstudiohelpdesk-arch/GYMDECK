#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::repositories::gym_qr_repo::GymCheckInQrRepository;

    fn setup_two_gyms() -> (Connection, Uuid, Uuid) {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        ensure_schema(&conn).expect("schema must apply cleanly");

        let gym_a = Uuid::new_v4();
        let gym_b = Uuid::new_v4();
        for (gym_id, name) in [(gym_a, "Alpha Strength"), (gym_b, "Beta Fitness")] {
            conn.execute(
                "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, ?2, ?3)",
                rusqlite::params![gym_id.to_string(), name, Uuid::new_v4().to_string()],
            )
            .expect("seed gym");
        }

        (conn, gym_a, gym_b)
    }

    #[test]
    fn provisioning_is_idempotent_and_unique_per_gym() {
        let (conn, gym_a, gym_b) = setup_two_gyms();

        let (first, created) =
            GymCheckInQrRepository::ensure_for_gym(&conn, &gym_a).expect("provision gym A");
        assert!(created, "first call must create the pass");

        let (again, created_again) =
            GymCheckInQrRepository::ensure_for_gym(&conn, &gym_a).expect("re-read gym A");
        assert!(!created_again, "second call must reuse the pass");
        assert_eq!(first.qr_token, again.qr_token);
        assert_eq!(first.checkin_code, again.checkin_code);
        assert_eq!(first.qr_payload, again.qr_payload);

        let (other, created_b) =
            GymCheckInQrRepository::ensure_for_gym(&conn, &gym_b).expect("provision gym B");
        assert!(created_b);
        assert_ne!(first.qr_token, other.qr_token);
        assert_ne!(first.checkin_code, other.checkin_code);

        // The encoded payload must carry everything the member app needs.
        assert!(first.qr_payload.contains(&gym_a.to_string()));
        assert!(first.qr_payload.contains(&first.checkin_code));
        assert!(first.qr_payload.contains(&first.qr_token));

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM gym_checkin_qr", [], |r| r.get(0))
            .expect("count passes");
        assert_eq!(count, 2, "exactly one pass per gym");

        let gym_name: String = conn
            .query_row(
                "SELECT gym_name FROM (SELECT g.name AS gym_name FROM gym_checkin_qr q
                  INNER JOIN gyms g ON g.id = q.gym_id WHERE q.gym_id = ?1)",
                rusqlite::params![gym_a.to_string()],
                |r| r.get(0),
            )
            .expect("read gym name");
        assert_eq!(gym_name, "Alpha Strength");
    }

    #[test]
    fn provisioning_requires_an_existing_gym() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        ensure_schema(&conn).expect("schema must apply cleanly");

        let missing = Uuid::new_v4();
        assert!(
            GymCheckInQrRepository::ensure_for_gym(&conn, &missing).is_err(),
            "a pass must not exist without its gym tenant"
        );
    }
}
