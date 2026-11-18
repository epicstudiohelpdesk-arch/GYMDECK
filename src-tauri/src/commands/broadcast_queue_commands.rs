/**
 * Tauri IPC boundary for the Notification Center's broadcast send queue.
 *
 * These commands back the "assisted WhatsApp" flow: the backend resolves the audience
 * and builds one click-to-chat link per member, and the desktop UI walks that queue and
 * reports each outcome. The gym id always comes from the authenticated session, so a
 * signed-in gym can only see and touch its own runs.
 */

use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::broadcast_queue_repo::BroadcastQueueRepository;

async fn auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
    if let Some((user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(AuthenticatedContext {
            session_id: uuid::Uuid::new_v4(),
            user_id,
            gym_id,
            role: "OWNER".into(),
            permissions: vec![],
        });
    }
    let (user_id, gym_id) = state.session_manager.restore_session().await?;
    Ok(AuthenticatedContext {
        session_id: uuid::Uuid::new_v4(),
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

/// Creates a run for the selected members (or a segment) and returns the send queue.
#[tauri::command]
pub async fn preview_broadcast_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let queued = BroadcastQueueRepository::preview(conn, &ctx, &payload)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(queued);
            Ok(())
        }))
        .await?;
    let queue = take_result(&slot, "broadcast queue")?;
    Ok(json!({ "success": true, "data": queue }))
}

/// Loads one run with its recipients (used to resume an unfinished queue).
#[tauri::command]
pub async fn get_broadcast_command(
    state: State<'_, AppState>,
    broadcast_id: String,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let run = BroadcastQueueRepository::get(&conn, &ctx, &broadcast_id)?;
    Ok(json!({ "success": true, "data": run }))
}

/// Recent runs for this gym, newest first.
#[tauri::command]
pub async fn list_broadcasts_command(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let limit = limit.unwrap_or(100).max(1) as usize;
    let runs = BroadcastQueueRepository::list(&conn, &ctx, limit)?;
    Ok(json!({ "success": true, "data": { "broadcasts": runs } }))
}

/// Records the outcome the owner reported for one member.
#[tauri::command]
pub async fn record_broadcast_result_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let run = BroadcastQueueRepository::record_result(conn, &ctx, &payload)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(run);
            Ok(())
        }))
        .await?;
    let run = take_result(&slot, "broadcast result")?;
    Ok(json!({ "success": true, "data": run }))
}

/// Stops a run, marking everything still queued as skipped.
#[tauri::command]
pub async fn cancel_broadcast_command(
    state: State<'_, AppState>,
    broadcast_id: String,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let run = BroadcastQueueRepository::cancel(conn, &ctx, &broadcast_id)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(run);
            Ok(())
        }))
        .await?;
    let run = take_result(&slot, "broadcast cancel")?;
    Ok(json!({ "success": true, "data": run }))
}

/// Removes a run from this device's history.
#[tauri::command]
pub async fn delete_broadcast_command(
    state: State<'_, AppState>,
    broadcast_id: String,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let result = BroadcastQueueRepository::delete(conn, &ctx, &broadcast_id)?;
            *captured
                .lock()
                .map_err(|_| AppError::Database("Write result lock poisoned".into()))? = Some(result);
            Ok(())
        }))
        .await?;
    let result = take_result(&slot, "broadcast delete")?;
    Ok(json!({ "success": true, "data": result }))
}
