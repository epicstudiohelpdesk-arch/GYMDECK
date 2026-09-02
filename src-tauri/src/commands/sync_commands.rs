use tauri::State;
use crate::commands::auth_commands::AppState;
use crate::models::user::AuthenticatedContext;
use crate::repositories::sync_repo::{SyncRepository, SyncStats, SyncOutboxRecord, RemoteChangeRecord};
use crate::errors::AppError;
use uuid::Uuid;

async fn get_auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
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
pub async fn get_sync_status_command(
    state: State<'_, AppState>,
) -> Result<SyncStats, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::get_outbox_stats(&conn, &ctx.gym_id)
}

#[tauri::command]
pub async fn claim_pending_sync_events_command(
    state: State<'_, AppState>,
    worker_id: String,
    limit: i64,
    lease_duration_secs: Option<i64>,
) -> Result<Vec<SyncOutboxRecord>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let mut conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let lease_secs = lease_duration_secs.unwrap_or(60);
    
    SyncRepository::claim_pending_events(&mut conn, &ctx.gym_id, &worker_id, limit, lease_secs)
}

#[tauri::command]
pub async fn get_pending_sync_events_command(
    state: State<'_, AppState>,
    limit: i64,
) -> Result<Vec<SyncOutboxRecord>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::get_pending_events(&conn, &ctx.gym_id, limit)
}

#[tauri::command]
pub async fn mark_sync_event_synced_command(
    state: State<'_, AppState>,
    event_id: Uuid,
) -> Result<(), AppError> {
    let _ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::mark_event_synced(&conn, &event_id)
}

#[tauri::command]
pub async fn mark_sync_event_failed_command(
    state: State<'_, AppState>,
    event_id: Uuid,
    error_code: String,
    error_message: String,
    is_permanent: bool,
) -> Result<(), AppError> {
    let _ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::mark_event_failed(&conn, &event_id, &error_code, &error_message, is_permanent)
}

#[tauri::command]
pub async fn update_sync_cursor_command(
    state: State<'_, AppState>,
    sequence: i64,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::set_cursor(&conn, &ctx.gym_id, sequence)
}

#[tauri::command]
pub async fn apply_pull_batch_command(
    state: State<'_, AppState>,
    changes: Vec<RemoteChangeRecord>,
    next_cursor: i64,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    let mut conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    SyncRepository::apply_pull_batch_tx(&mut conn, &ctx.gym_id, &changes, next_cursor)
}
