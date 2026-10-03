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
    pub cloud_session: std::sync::Arc<crate::sessions::cloud_session::CloudSessionManager>,
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

            let cloud_url = std::env::var("GYMDECK_CLOUD_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:3001".to_string());
            let http_client = crate::auth::cloud_auth::CloudAuthClient::build_http_client();

            let is_enrolled = if let Some(meta) = state.cloud_session.get_metadata().await {
                meta.gym_id == gym_id
            } else {
                false
            };

            if !is_enrolled {
                // Query local full_name and gym_name for bootstrap registration
                let (full_name, gym_name) = if let Ok(conn) = state.db.pool.get() {
                    let fn_res: String = conn.query_row(
                        "SELECT full_name FROM users WHERE id = ?1",
                        rusqlite::params![user_id.to_string()],
                        |r| r.get(0),
                    ).unwrap_or_else(|_| "Owner".to_string());
                    let gn_res: String = conn.query_row(
                        "SELECT name FROM gyms WHERE id = ?1",
                        rusqlite::params![gym_id.to_string()],
                        |r| r.get(0),
                    ).unwrap_or_else(|_| "Gym".to_string());
                    (fn_res, gn_res)
                } else {
                    ("Owner".to_string(), "Gym".to_string())
                };

                // Attempt controlled Cloud Bootstrap / Linking
                if let Ok(auth_data) = crate::auth::cloud_auth::CloudAuthClient::bootstrap_desktop(
                    &http_client,
                    &cloud_url,
                    &payload.email,
                    secure_password.expose_secret(),
                    &full_name,
                    &gym_id,
                    &gym_name,
                    Some(user_id),
                ).await {
                    let cloud_user = auth_data.user;
                    let cloud_tokens = auth_data.tokens;

                    // Bind Cloud Session & OS Keychain
                    let enrollment_meta = crate::sessions::cloud_session::CloudEnrollmentMetadata {
                        user_id: cloud_user.id,
                        gym_id,
                        gym_name: cloud_user.gym_name.clone(),
                        gym_code: cloud_user.gym_code.clone(),
                        email: cloud_user.email.clone(),
                        enrolled_at: chrono::Utc::now().to_rfc3339(),
                    };
                    let _ = state.cloud_session.bind_enrollment(&cloud_tokens, enrollment_meta).await;

                    // Stage all unpushed local business records (plans, members, etc.) into sync_outbox
                    if let Ok(mut conn) = state.db.pool.get() {
                        let _ = crate::repositories::sync_repo::SyncRepository::stage_unpushed_local_records_to_outbox(
                            &mut conn,
                            &gym_id,
                        );
                    }

                    // Execute initial sync cycle to push staged records and pull remote updates
                    let worker_id = state.cloud_session.get_or_create_device_id();
                    let _ = crate::sync::worker::SyncWorker::execute_cycle(
                        &state.db.pool,
                        &http_client,
                        &cloud_url,
                        &worker_id,
                        &gym_id,
                        &cloud_tokens.access_token,
                    ).await;

                    // Start background sync daemon
                    let worker = crate::sync::worker::SyncWorker::new(state.db.pool.clone(), Some(cloud_url));
                    worker.start_with_session(gym_id, state.cloud_session.clone());
                } else {
                    tracing::info!("[Auth] Local login succeeded; cloud gateway unreachable (offline mode retained).");
                }
            } else {
                // Already enrolled; ensure background sync daemon is active
                let worker = crate::sync::worker::SyncWorker::new(state.db.pool.clone(), Some(cloud_url));
                worker.start_with_session(gym_id, state.cloud_session.clone());
            }

            Ok(LoginResponse {
                success: true,
                redirect: "/dashboard".to_string(),
            })
        },
        Err(local_err) => {
            // If local auth fails, attempt seamless Cloud Gateway Owner Login
            let cloud_url = std::env::var("GYMDECK_CLOUD_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:3001".to_string());
            let http_client = crate::auth::cloud_auth::CloudAuthClient::build_http_client();

            match crate::auth::cloud_auth::CloudAuthClient::login(
                &http_client,
                &cloud_url,
                &payload.email,
                secure_password.expose_secret(),
            ).await {
                Ok(auth_data) => {
                    let cloud_user = auth_data.user;
                    let cloud_tokens = auth_data.tokens;
                    let cloud_gym_id = cloud_user.gym_id;

                    // 1. Provision local tenant metadata in SQLite
                    if let Ok(conn) = state.db.pool.get() {
                        let _ = conn.execute(
                            "INSERT INTO gyms (id, name, owner_user_id, created_at, updated_at)
                             VALUES (?1, ?2, ?3, ?4, ?4)
                             ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at;",
                            rusqlite::params![
                                cloud_gym_id.to_string(),
                                cloud_user.gym_name,
                                cloud_user.id.to_string(),
                                chrono::Utc::now().to_rfc3339(),
                            ],
                        );

                        let _ = conn.execute(
                            "INSERT INTO users (id, gym_id, full_name, email, password_hash, role, account_status, created_at, updated_at)
                             VALUES (?1, ?2, ?3, ?4, 'CLOUD_AUTH', 'OWNER', 'ACTIVE', ?5, ?5)
                             ON CONFLICT(id) DO UPDATE SET gym_id = excluded.gym_id, full_name = excluded.full_name, email = excluded.email;",
                            rusqlite::params![
                                cloud_user.id.to_string(),
                                cloud_gym_id.to_string(),
                                cloud_user.full_name,
                                cloud_user.email,
                                chrono::Utc::now().to_rfc3339(),
                            ],
                        );
                    }

                    // 2. Bind Cloud Session & OS Keychain
                    let enrollment_meta = crate::sessions::cloud_session::CloudEnrollmentMetadata {
                        user_id: cloud_user.id,
                        gym_id: cloud_gym_id,
                        gym_name: cloud_user.gym_name.clone(),
                        gym_code: cloud_user.gym_code.clone(),
                        email: cloud_user.email.clone(),
                        enrolled_at: chrono::Utc::now().to_rfc3339(),
                    };
                    let _ = state.cloud_session.bind_enrollment(&cloud_tokens, enrollment_meta).await;

                    // 3. Bind Active Session in SessionManager
                    state.session_manager.create_and_bind_session(cloud_user.id, cloud_gym_id).await?;

                    // 4. Initial sync pull
                    let worker_id = format!("desktop-node-{}", &cloud_user.id.to_string()[..8]);
                    let _ = crate::sync::worker::SyncWorker::execute_cycle(
                        &state.db.pool,
                        &http_client,
                        &cloud_url,
                        &worker_id,
                        &cloud_gym_id,
                        &cloud_tokens.access_token,
                    ).await;

                    // 5. Start background sync daemon
                    let worker = crate::sync::worker::SyncWorker::new(state.db.pool.clone(), Some(cloud_url));
                    worker.start_with_session(cloud_gym_id, state.cloud_session.clone());

                    Ok(LoginResponse {
                        success: true,
                        redirect: "/dashboard".to_string(),
                    })
                }
                Err(_) => {
                    state.rate_limiter.penalize(&payload.email, 2).await;
                    Err(local_err)
                }
            }
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

#[tauri::command]
pub async fn check_email_exists_command(
    state: State<'_, AppState>,
    email: String,
) -> Result<bool, AppError> {
    let conn = state.db.pool.get()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let exists: Result<i64, _> = conn.query_row(
        "SELECT COUNT(*) FROM users WHERE email = ?;",
        [&email],
        |row| row.get(0)
    );

    match exists {
        Ok(count) => Ok(count > 0),
        Err(_) => Ok(false),
    }
}
