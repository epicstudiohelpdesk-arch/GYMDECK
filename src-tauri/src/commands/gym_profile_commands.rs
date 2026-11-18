/**
 * Tauri IPC boundary for Settings → Gym Profile → General tab and its brand imagery
 * (logo + cover photo).
 *
 * The gym context comes from the authenticated desktop session, so a signed-in gym
 * can only read or write its own locked profile row.
 */

use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::State;
use uuid::Uuid;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::gym_profile_repo::GymProfileRepository;

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

fn take_result(slot: &Arc<Mutex<Option<Value>>>, label: &str) -> Result<Value, AppError> {
    slot.lock()
        .map_err(|_| AppError::Database("Write result lock poisoned".into()))?
        .clone()
        .ok_or_else(|| AppError::Database(format!("Write produced no {} result", label)))
}

#[tauri::command]
pub async fn get_gym_profile_command(state: State<'_, AppState>) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let profile = GymProfileRepository::get(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": { "profile": profile } }))
}

#[tauri::command]
pub async fn save_gym_profile_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let saved = GymProfileRepository::upsert(conn, &ctx, &payload)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(saved);
            Ok(())
        }))
        .await?;
    let profile = take_result(&slot, "gym profile")?;
    Ok(json!({ "success": true, "data": { "profile": profile } }))
}

/// Persists only the uploaded logo / cover photo so an image is locked to the gym the
/// moment it is picked, independent of the rest of the form.
#[tauri::command]
pub async fn save_gym_profile_media_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;

    // Distinguish "not provided" (None) from "cleared" (Some(None)).
    let logo = payload
        .get("logoDataUrl")
        .map(|value| value.as_str().map(|s| s.to_string()));
    let cover = payload
        .get("coverDataUrl")
        .map(|value| value.as_str().map(|s| s.to_string()));

    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let saved = GymProfileRepository::save_media(conn, &ctx, logo, cover)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(saved);
            Ok(())
        }))
        .await?;
    let profile = take_result(&slot, "gym branding")?;
    Ok(json!({ "success": true, "data": { "profile": profile } }))
}
