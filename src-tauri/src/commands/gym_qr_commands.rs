use tauri::State;
use uuid::Uuid;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::repositories::gym_qr_repo::{GymCheckInQr, GymCheckInQrRepository};
use crate::repositories::sync_repo::SyncRepository;

async fn resolve_gym_id(state: &State<'_, AppState>) -> Result<Uuid, AppError> {
    if let Some((_user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(gym_id);
    }
    let (_user_id, gym_id) = state.session_manager.restore_session().await?;
    Ok(gym_id)
}

/// Returns the authenticated gym's permanent attendance QR pass, provisioning it
/// on first access for gyms created before the pass existed.
///
/// The pass is staged into the sync outbox the first time it is seen so the
/// cloud can resolve a scanned pass to this gym for member check-ins.
#[tauri::command]
pub async fn get_gym_checkin_qr_command(
    state: State<'_, AppState>,
) -> Result<GymCheckInQr, AppError> {
    let gym_id = resolve_gym_id(&state).await?;

    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let tx = conn
                .transaction()
                .map_err(|e| AppError::Database(e.to_string()))?;

            let (pass, created) = GymCheckInQrRepository::ensure_for_gym(&tx, &gym_id)?;

            // Stage once, regardless of whether this call created the pass, so
            // pre-existing gyms still reach the cloud.
            let already_staged: i64 = tx
                .query_row(
                    "SELECT COUNT(*) FROM sync_outbox
                     WHERE gym_id = ?1 AND entity_type = 'gym_checkin_qr' AND entity_id = ?2",
                    rusqlite::params![gym_id.to_string(), pass.id.to_string()],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if already_staged == 0 {
                let payload = serde_json::to_string(&pass).unwrap_or_else(|_| "{}".to_string());
                SyncRepository::enqueue_outbox_event(
                    &tx,
                    &gym_id,
                    "gym_checkin_qr",
                    &pass.id,
                    "CREATE",
                    &payload,
                )?;
            }

            if created {
                tracing::info!(
                    "Gym check-in QR ready: gym={}, code={}",
                    gym_id,
                    pass.checkin_code
                );
            }

            tx.commit().map_err(|e| AppError::Database(e.to_string()))
        }))
        .await?;

    let conn = state
        .db
        .pool
        .get()
        .map_err(|e| AppError::Database(e.to_string()))?;

    GymCheckInQrRepository::get(&conn, &gym_id)?.ok_or_else(|| {
        AppError::Database("Gym check-in QR could not be read after provisioning".to_string())
    })
}
