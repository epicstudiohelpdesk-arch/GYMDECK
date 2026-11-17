use rusqlite::Transaction;
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::repositories::sync_repo::RemoteChangeRecord;

/// Apply a cloud-originated gym check-in QR change inside the pull transaction.
///
/// A gym has exactly one pass. The cloud row is the replicated authority (the
/// desktop that minted the pass pushes it there first), so a pulled change
/// converges any local copy onto the same code and token instead of leaving two
/// different passes in circulation for the same facility.
pub fn apply_gym_checkin_qr_pull(
    tx: &Transaction,
    gym_id: &Uuid,
    change: &RemoteChangeRecord,
) -> Result<(), AppError> {
    let p: &Value = &change.payload;
    let now = chrono::Utc::now().to_rfc3339();

    let field = |name: &str| p.get(name).and_then(|v| v.as_str());

    let checkin_code = field("checkinCode")
        .or_else(|| field("checkin_code"))
        .unwrap_or("")
        .to_string();
    let qr_token = field("qrToken")
        .or_else(|| field("qr_token"))
        .unwrap_or("")
        .to_string();

    if checkin_code.is_empty() || qr_token.is_empty() {
        tracing::warn!(
            "[GymCheckInQrSync] Ignoring malformed check-in QR change for gym {}",
            gym_id
        );
        return Ok(());
    }

    let qr_payload = field("qrPayload")
        .or_else(|| field("qr_payload"))
        .map(str::to_string)
        .unwrap_or_else(|| {
            format!(
                "https://gymdeck.app/checkin?gym_id={}&code={}&token={}",
                gym_id, checkin_code, qr_token
            )
        });

    let version = p.get("version").and_then(|v| v.as_i64()).unwrap_or(1);
    let is_active = p.get("isActive").and_then(|v| v.as_bool()).unwrap_or(true);

    tx.execute(
        "INSERT INTO gym_checkin_qr (
            id, gym_id, checkin_code, qr_token, qr_payload, version,
            is_active, created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
         ON CONFLICT(gym_id) DO UPDATE SET
            checkin_code = excluded.checkin_code,
            qr_token = excluded.qr_token,
            qr_payload = excluded.qr_payload,
            version = excluded.version,
            is_active = excluded.is_active,
            updated_at = excluded.updated_at",
        rusqlite::params![
            change.entity_id.to_string(),
            gym_id.to_string(),
            checkin_code,
            qr_token,
            qr_payload,
            version,
            is_active as i64,
            now,
        ],
    )
    .map_err(|e| AppError::Database(format!("Failed to apply gym check-in QR: {}", e)))?;

    Ok(())
}
