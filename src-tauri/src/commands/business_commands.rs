use tauri::State;
use crate::commands::auth_commands::AppState;
use crate::models::gym_business::{Member, MembershipPlan, MemberDocument};
use crate::models::user::AuthenticatedContext;
use crate::repositories::member_repo::MemberRepository;
use crate::repositories::plan_repo::PlanRepository;
use crate::errors::AppError;
use uuid::Uuid;

async fn get_auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
    // 1. Check in-memory session first (Optimized, no keyring access)
    if let Some((user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(AuthenticatedContext {
            session_id: Uuid::new_v4(), // Placeholder
            user_id,
            gym_id,
            role: "OWNER".into(),
            permissions: vec![],
        });
    }

    // 2. Fallback to restore from keyring (Decryption & Trust validation)
    let (user_id, gym_id) = state.session_manager.restore_session().await?;
    
    Ok(AuthenticatedContext {
        session_id: Uuid::new_v4(), // Placeholder
        user_id,
        gym_id,
        role: "OWNER".into(),
        permissions: vec![],
    })
}

#[tauri::command]
pub async fn get_members_command(
    state: State<'_, AppState>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Member>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    MemberRepository::get_members(&conn, &ctx, limit, offset)
}

#[tauri::command]
pub async fn get_past_members_command(
    state: State<'_, AppState>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Member>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    MemberRepository::get_past_members(&conn, &ctx, limit, offset)
}

#[tauri::command]
pub async fn get_member_documents_command(
    state: State<'_, AppState>,
    member_id: Uuid,
) -> Result<Vec<MemberDocument>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    MemberRepository::get_member_documents(&conn, &ctx, &member_id)
}

#[tauri::command]
pub async fn create_member_command(
    state: State<'_, AppState>,
    member: Member,
    documents: Vec<MemberDocument>,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        // 1. Create Member
        MemberRepository::create_member(&tx, &ctx, &member)?;
        
        // 2. Save Documents
        for doc in documents {
            MemberRepository::save_document(&tx, &ctx, &doc)?;
        }
        
        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn soft_delete_member_command(
    state: State<'_, AppState>,
    member_id: Uuid,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        MemberRepository::soft_delete_member(&tx, &ctx, &member_id)?;
        
        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn get_plans_command(
    state: State<'_, AppState>,
) -> Result<Vec<MembershipPlan>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    PlanRepository::get_plans(&conn, &ctx)
}
