/**
 * Tauri IPC boundary for Banking & Settlement accounts.
 *
 * The gym context is always resolved from the authenticated desktop session;
 * the renderer never supplies a gym id, so accounts cannot leak across tenants.
 */

use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::State;
use uuid::Uuid;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::payment_account_repo::PaymentAccountRepository;

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

/// Run a mutating repository operation through the serialized write worker and
/// return its produced DTO to the caller.
async fn write_and_return<F>(state: &State<'_, AppState>, op: F) -> Result<Value, AppError>
where
    F: FnOnce(&mut rusqlite::Connection) -> Result<Value, AppError> + Send + 'static,
{
    let slot = Arc::new(Mutex::new(None::<Value>));
    let captured = Arc::clone(&slot);
    state
        .async_db
        .dispatch_write(Box::new(move |conn| {
            let result = op(conn)?;
            *captured.lock().map_err(|_| AppError::Database("Write result lock poisoned".into()))? =
                Some(result);
            Ok(())
        }))
        .await?;
    let result = slot
        .lock()
        .map_err(|_| AppError::Database("Write result lock poisoned".into()))?
        .clone()
        .ok_or_else(|| AppError::Database("Write produced no payment account result".into()));
    result
}

#[tauri::command]
pub async fn payment_accounts_list_command(
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let accounts = PaymentAccountRepository::list(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": { "accounts": accounts } }))
}

#[tauri::command]
pub async fn payment_accounts_create_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let account = write_and_return(&state, move |conn| {
        PaymentAccountRepository::create(conn, &ctx, &payload)
    })
    .await?;
    Ok(json!({ "success": true, "data": { "account": account } }))
}

#[tauri::command]
pub async fn payment_accounts_update_command(
    state: State<'_, AppState>,
    id: String,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let account = write_and_return(&state, move |conn| {
        PaymentAccountRepository::update(conn, &ctx, &id, &payload)
    })
    .await?;
    Ok(json!({ "success": true, "data": { "account": account } }))
}

#[tauri::command]
pub async fn payment_accounts_set_primary_command(
    state: State<'_, AppState>,
    id: String,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let account = write_and_return(&state, move |conn| {
        PaymentAccountRepository::set_primary(conn, &ctx, &id)
    })
    .await?;
    Ok(json!({ "success": true, "data": { "account": account } }))
}

#[tauri::command]
pub async fn payment_accounts_deactivate_command(
    state: State<'_, AppState>,
    id: String,
) -> Result<Value, AppError> {
    let ctx = auth_context(&state).await?;
    let account = write_and_return(&state, move |conn| {
        PaymentAccountRepository::deactivate(conn, &ctx, &id)
    })
    .await?;
    Ok(json!({ "success": true, "data": { "account": account } }))
}
