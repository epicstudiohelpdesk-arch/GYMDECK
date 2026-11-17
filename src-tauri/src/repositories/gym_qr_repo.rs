use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::AppError;

/// The permanent, unique attendance QR pass belonging to a gym tenant.
///
/// A pass is provisioned exactly once per gym (at signup) and is what members
/// scan with the GymDeck Member App to record attendance at that facility.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GymCheckInQr {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub gym_name: String,
    pub checkin_code: String,
    pub qr_token: String,
    pub qr_payload: String,
    pub version: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

pub struct GymCheckInQrRepository;

impl GymCheckInQrRepository {
    /// Base URL the member app uses to resolve a scanned facility pass.
    const CHECKIN_BASE_URL: &'static str = "https://gymdeck.app/checkin";

    const SELECT_SQL: &'static str = "SELECT q.id, q.gym_id, g.name, q.checkin_code, q.qr_token,
                                             q.qr_payload, q.version, q.is_active,
                                             q.created_at, q.updated_at
                                      FROM gym_checkin_qr q
                                      INNER JOIN gyms g ON g.id = q.gym_id
                                      WHERE q.gym_id = ?1";

    /// The exact string encoded into the QR image.
    fn build_payload(gym_id: &Uuid, checkin_code: &str, qr_token: &str) -> String {
        format!(
            "{}?gym_id={}&code={}&token={}",
            Self::CHECKIN_BASE_URL, gym_id, checkin_code, qr_token
        )
    }

    /// Short human readable facility code printed under the QR, e.g. `GD-7K2M9Q`.
    fn new_checkin_code() -> String {
        let raw = Uuid::new_v4().simple().to_string().to_uppercase();
        format!("GD-{}", &raw[..6])
    }

    /// Reads the gym's pass, if it has already been provisioned.
    pub fn get(conn: &Connection, gym_id: &Uuid) -> Result<Option<GymCheckInQr>, AppError> {
        conn.query_row(Self::SELECT_SQL, params![gym_id.to_string()], |row| {
            Ok(GymCheckInQr {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                gym_name: row.get(2)?,
                checkin_code: row.get(3)?,
                qr_token: row.get(4)?,
                qr_payload: row.get(5)?,
                version: row.get(6)?,
                is_active: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .optional()
        .map_err(|e| AppError::Database(format!("Failed to read gym check-in QR: {}", e)))
    }

    /// Provisions the gym's pass if it does not exist yet.
    ///
    /// Idempotent and safe to call inside the signup transaction (`rusqlite`
    /// `Transaction` derefs to `Connection`). Returns the pass plus whether it
    /// was created by this call.
    pub fn ensure_for_gym(
        conn: &Connection,
        gym_id: &Uuid,
    ) -> Result<(GymCheckInQr, bool), AppError> {
        if let Some(existing) = Self::get(conn, gym_id)? {
            return Ok((existing, false));
        }

        let gym_exists: bool = conn
            .query_row(
                "SELECT 1 FROM gyms WHERE id = ?1",
                params![gym_id.to_string()],
                |_| Ok(true),
            )
            .optional()
            .map_err(|e| AppError::Database(e.to_string()))?
            .unwrap_or(false);

        if !gym_exists {
            return Err(AppError::Database(
                "Gym not found while provisioning check-in QR".to_string(),
            ));
        }

        let now = Utc::now().to_rfc3339();
        let id = Uuid::new_v4();
        // Opaque 128-bit token: the cloud resolves a scanned pass to its gym by this value.
        let qr_token = Uuid::new_v4().simple().to_string();

        for _ in 0..5 {
            let checkin_code = Self::new_checkin_code();
            let qr_payload = Self::build_payload(gym_id, &checkin_code, &qr_token);

            match conn.execute(
                "INSERT INTO gym_checkin_qr (
                    id, gym_id, checkin_code, qr_token, qr_payload, version,
                    is_active, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 1, ?6, ?6)
                 ON CONFLICT(gym_id) DO NOTHING",
                params![
                    id.to_string(),
                    gym_id.to_string(),
                    checkin_code,
                    qr_token,
                    qr_payload,
                    now,
                ],
            ) {
                Ok(1) => {
                    let created = Self::get(conn, gym_id)?.ok_or_else(|| {
                        AppError::Database(
                            "Check-in QR was inserted but could not be read back".to_string(),
                        )
                    })?;
                    tracing::info!(
                        "Provisioned attendance QR pass {} for gym {}",
                        created.checkin_code,
                        gym_id
                    );
                    return Ok((created, true));
                }
                Ok(_) => {
                    // Another writer won the race for this gym.
                    if let Some(existing) = Self::get(conn, gym_id)? {
                        return Ok((existing, false));
                    }
                }
                Err(e) => {
                    let msg = e.to_string();
                    if msg.contains("UNIQUE") {
                        // Either a checkin_code collision (retry) or a concurrent
                        // gym insert (resolved by re-reading on the next pass).
                        if let Some(existing) = Self::get(conn, gym_id)? {
                            return Ok((existing, false));
                        }
                        continue;
                    }
                    return Err(AppError::Database(format!(
                        "Failed to provision gym check-in QR: {}",
                        msg
                    )));
                }
            }
        }

        Err(AppError::Database(
            "Failed to provision a unique gym check-in QR after retries".to_string(),
        ))
    }
}
