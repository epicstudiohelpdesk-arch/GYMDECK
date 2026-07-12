use tauri::State;
use serde::{Deserialize, Serialize};
use crate::services::auth_service::AuthService;
use crate::encryption::secrets::SecureString;
use crate::errors::AppError;
use crate::auth::rate_limit::RateLimiter;
use crate::sessions::manager::SessionManager;

// Assume DatabaseManager state is injected by Tauri during setup
// We wrap it securely to prevent direct DB access leaks.
pub struct AppState {
    pub db: crate::database::manager::DatabaseManager,
    pub async_db: crate::database::async_manager::AsyncDbManager,
    pub rate_limiter: RateLimiter,
    pub session_manager: SessionManager,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String, // Kept in memory temporarily, dropped/zeroized via SecureString
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub redirect: String,
}

#[derive(Deserialize)]
pub struct SignupPayload {
    pub gym_name: String,
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct SignupResponse {
    pub success: bool,
    pub redirect: String,
}

#[derive(Deserialize)]
pub struct ReauthPayload {
    pub email: String,
    pub password: String,
}

/// Step-up authentication for sensitive actions.
#[tauri::command]
pub async fn sensitive_action_reauth_command(
    state: State<'_, AppState>,
    payload: ReauthPayload,
) -> Result<bool, AppError> {
    
    if state.rate_limiter.check_and_consume(&payload.email).await.is_err() {
        return Err(AppError::Authentication);
    }

    let secure_password = SecureString::new(payload.password);
    
    match AuthService::login(&state.db, &payload.email, &secure_password) {
        Ok(_) => Ok(true),
        Err(_) => {
            state.rate_limiter.penalize(&payload.email, 2).await;
            Err(AppError::Authentication)
        }
    }
}

/// Hardened IPC Boundary for Signup.
#[tauri::command]
pub async fn signup_command(
    state: State<'_, AppState>,
    payload: SignupPayload,
) -> Result<SignupResponse, AppError> {
    
    if state.rate_limiter.check_and_consume(&payload.email).await.is_err() {
        return Err(AppError::Authentication);
    }

    let secure_password = SecureString::new(payload.password);
    
    let (user_id, gym_id) = AuthService::signup(
        &state.db, 
        &payload.gym_name,
        &payload.name, 
        &payload.email, 
        &secure_password
    )?;

    state.session_manager.create_and_bind_session(user_id, gym_id).await?;

    Ok(SignupResponse {
        success: true,
        redirect: "/login?registered=true".to_string(),
    })
}

/// Hardened IPC Boundary for Login.
#[tauri::command]
pub async fn login_command(
    state: State<'_, AppState>,
    payload: LoginPayload,
) -> Result<LoginResponse, AppError> {
    
    if let Err(_limit_err) = state.rate_limiter.check_and_consume(&payload.email).await {
        return Err(AppError::Authentication);
    }

    let secure_password = SecureString::new(payload.password);
    
    match AuthService::login(&state.db, &payload.email, &secure_password) {
        Ok((user_id, gym_id)) => {
            state.session_manager.create_and_bind_session(user_id, gym_id).await?;
            Ok(LoginResponse {
                success: true,
                redirect: "/dashboard".to_string(),
            })
        },
        Err(e) => {
            state.rate_limiter.penalize(&payload.email, 2).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn restore_session_command(
    state: State<'_, AppState>,
) -> Result<LoginResponse, AppError> {
    // 1. Check in-memory session cache first to avoid redundant keychain/fingerprint checks on redirect
    if state.session_manager.get_active_session().await.is_some() {
        return Ok(LoginResponse { success: true, redirect: "/dashboard".to_string() });
    }

    // 2. Validates trust fingerprint and issues memory-only active token
    match state.session_manager.restore_session().await {
        Ok(_) => Ok(LoginResponse { success: true, redirect: "/dashboard".to_string() }),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn lock_session_command(
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.session_manager.lock_session().await
}

#[tauri::command]
pub async fn logout_command(state: State<'_, AppState>) -> Result<(), AppError> {
    state.session_manager.revoke_session().await?;
    AuthService::logout()
}

#[tauri::command]
pub async fn delete_account_command(
    state: State<'_, AppState>,
    email: String,
) -> Result<(), AppError> {
    let conn = state.db.pool.get()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let user_info: Result<(String, String), _> = conn.query_row(
        "SELECT id, gym_id FROM users WHERE email = ?;",
        [&email],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    );

    let (_user_id, gym_id) = match user_info {
        Ok(info) => info,
        Err(_) => {
            return Err(AppError::Database("User not found".to_string()));
        }
    };

    let _ = conn.execute_batch("DROP TRIGGER IF EXISTS prevent_audit_log_update;");
    let _ = conn.execute_batch("DROP TRIGGER IF EXISTS prevent_audit_log_delete;");

    let _ = conn.execute_batch("BEGIN TRANSACTION;");

    let delete_result = (|| -> Result<(), rusqlite::Error> {
        let mut stmt = conn.prepare("SELECT id FROM users WHERE gym_id = ?;")?;
        let user_ids: Vec<String> = stmt.query_map([&gym_id], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        for uid in &user_ids {
            conn.execute("DELETE FROM sessions WHERE user_id = ?;", [uid])?;
            conn.execute("DELETE FROM device_trust WHERE user_id = ?;", [uid])?;
            conn.execute("DELETE FROM users WHERE id = ?;", [uid])?;
        }

        conn.execute("DELETE FROM gyms WHERE id = ?;", [&gym_id])?;

        Ok(())
    })();

    if delete_result.is_ok() {
        let _ = conn.execute_batch("COMMIT;");
    } else {
        let _ = conn.execute_batch("ROLLBACK;");
    }

    let _ = conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS prevent_audit_log_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;"
    );
    let _ = conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS prevent_audit_log_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;"
    );

    let _ = state.session_manager.revoke_session().await;

    delete_result.map_err(|e| AppError::Database(e.to_string()))
}
