/**
 * Tauri IPC boundary for Settings → Gym Profile → Contact & Communication.
 *
 * The gym context is resolved from the authenticated desktop session; the
 * renderer never supplies a gym id, so a signed-in gym can only read or write
 * its own locked settings row.
 */

use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::State;
use uuid::Uuid;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::communication_settings_repo::CommunicationSettingsRepository;

async fn auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
    if let Some((user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(AuthenticatedContext {
            session_id: Uuid::new_v4(),
            user_id,
            gym_id,
            role: "OWNER".into(),
            permissions: vec![],
        });
    }
    let (user_id, gym_id) = state.session_manager.restore_session().await?;
    Ok(AuthenticatedContext {
        session_id: Uuid::new_v4(),
        user_id,
        gym_id,
        role: "OWNER".into(),
        permissions: vec![],
    })
}

#[tauri::command]
pub async fn get_gym_communication_settings_command(
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let settings = CommunicationSettingsRepository::get(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": { "settings": settings } }))
}

#[tauri::command]
pub async fn save_gym_communication_settings_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let saved = CommunicationSettingsRepository::upsert(conn, &ctx, &payload)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(saved);
            Ok(())
        }))
        .await?;
    let settings = slot
        .lock()
        .map_err(|_| AppError::Database("Write result lock poisoned".into()))?
        .clone()
        .ok_or_else(|| AppError::Database("Write produced no communication settings result".into()))?;
    Ok(json!({ "success": true, "data": { "settings": settings } }))
}
