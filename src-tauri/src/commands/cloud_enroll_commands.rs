use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use crate::commands::auth_commands::AppState;
use crate::auth::cloud_auth::CloudAuthClient;
use crate::sessions::cloud_session::{CloudEnrollmentMetadata, EnrollmentState};
use crate::backup::engine::BackupEngine;
use crate::sync::worker::SyncWorker;
use crate::errors::AppError;

#[derive(Deserialize)]
pub struct CloudEnrollPayload {
    pub email: String,
    pub password: String,
    pub cloud_url: Option<String>,
}

#[derive(Serialize)]
pub struct CloudEnrollResponse {
    pub success: bool,
    #[serde(rename = "gymId")]
    pub gym_id: String,
    #[serde(rename = "gymName")]
    pub gym_name: String,
    #[serde(rename = "gymCode")]
    pub gym_code: Option<String>,
    #[serde(rename = "userName")]
    pub user_name: String,
    pub email: String,
    #[serde(rename = "syncedMembersCount")]
    pub synced_members_count: i64,
    pub message: String,
}

#[derive(Serialize)]
pub struct CloudEnrollmentStatusResponse {
    #[serde(rename = "isEnrolled")]
    pub is_enrolled: bool,
    pub state: String,
    #[serde(rename = "gymId")]
    pub gym_id: Option<String>,
    #[serde(rename = "gymName")]
    pub gym_name: Option<String>,
    #[serde(rename = "gymCode")]
    pub gym_code: Option<String>,
    pub email: Option<String>,
    #[serde(rename = "enrolledAt")]
    pub enrolled_at: Option<String>,
    #[serde(rename = "localMemberCount")]
    pub local_member_count: i64,
}

fn get_effective_cloud_url(override_url: Option<String>) -> String {
    if let Some(ref url) = override_url {
        if !url.trim().is_empty() {
            return url.trim().to_string();
        }
    }
    std::env::var("GYMDECK_CLOUD_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3001".to_string())
}

/// Command to enroll Desktop into a Cloud Gym Tenant using owner credentials.
#[tauri::command]
pub async fn cloud_enroll_command(
    state: State<'_, AppState>,
    payload: CloudEnrollPayload,
) -> Result<CloudEnrollResponse, AppError> {
    let cloud_url = get_effective_cloud_url(payload.cloud_url);
    let client = CloudAuthClient::build_http_client();

    state.cloud_session.set_state(EnrollmentState::Authenticating).await;

    // 1. Authenticate against Cloud Gateway
    let auth_data = CloudAuthClient::login(
        &client,
        &cloud_url,
        &payload.email,
        &payload.password,
    ).await.map_err(|e| {
        let err_str = format!("{}", e);
        let _ = state.cloud_session.set_state(EnrollmentState::Failed(err_str));
        e
    })?;

    let cloud_user = auth_data.user;
    let cloud_tokens = auth_data.tokens;
    let cloud_gym_id = cloud_user.gym_id;

    // 2. Safe Pre-Enrollment Vault Backup
    // If the database contains existing data from another gym (e.g. Indian's Gym), create verified backup first.
    {
        let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
        let backup_dir = state.db.db_path.parent()
            .unwrap_or(&std::path::PathBuf::from("."))
            .join("backups");
        
        let existing_gym_count: i64 = conn.query_row(
            "SELECT count(*) FROM gyms WHERE id != ?1;",
            rusqlite::params![cloud_gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        if existing_gym_count > 0 {
            tracing::info!("Populated vault detected from prior gym. Creating safety archive before cloud enrollment...");
            let _ = BackupEngine::create_encrypted_backup(&conn, &backup_dir, crate::config::DEV_DB_KEY);
        }

        // 3. Initialize/Provision local tenant metadata in SQLite
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at;",
            rusqlite::params![
                cloud_gym_id.to_string(),
                cloud_user.gym_name,
                cloud_user.id.to_string(),
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| AppError::Database(format!("Failed to provision cloud gym locally: {}", e)))?;

        conn.execute(
            "INSERT INTO users (id, gym_id, full_name, email, password_hash, role, account_status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 'CLOUD_AUTH', 'OWNER', 'ACTIVE', ?5, ?5)
             ON CONFLICT(id) DO UPDATE SET gym_id = excluded.gym_id, full_name = excluded.full_name, email = excluded.email;",
            rusqlite::params![
                cloud_user.id.to_string(),
                cloud_gym_id.to_string(),
                cloud_user.full_name,
                cloud_user.email,
                Utc::now().to_rfc3339(),
            ],
        ).map_err(|e| AppError::Database(format!("Failed to provision cloud user locally: {}", e)))?;
    }

    // 4. Bind Cloud Session & OS Keychain Tokens
    let enrollment_meta = CloudEnrollmentMetadata {
        user_id: cloud_user.id,
        gym_id: cloud_gym_id,
        gym_name: cloud_user.gym_name.clone(),
        gym_code: cloud_user.gym_code.clone(),
        email: cloud_user.email.clone(),
        enrolled_at: Utc::now().to_rfc3339(),
    };

    state.cloud_session.bind_enrollment(&cloud_tokens, enrollment_meta).await?;

    // 5. Bind Active Session in SessionManager
    state.session_manager.create_and_bind_session(cloud_user.id, cloud_gym_id).await?;

    // 6. Perform Initial Synchronization Pull
    state.cloud_session.set_state(EnrollmentState::Syncing).await;
    let device_id = state.cloud_session.get_or_create_device_id();
    let _ = SyncWorker::execute_cycle(
        &state.db.pool,
        &client,
        &cloud_url,
        &device_id,
        &cloud_gym_id,
        &cloud_tokens.access_token,
    ).await;

    // 7. Start autonomous background SyncWorker
    let worker = SyncWorker::new(state.db.pool.clone(), Some(cloud_url));
    worker.start_with_session(cloud_gym_id, state.cloud_session.clone());

    state.cloud_session.set_state(EnrollmentState::Ready).await;

    // 8. Query local member count for this cloud gym
    let member_count: i64 = {
        let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
        conn.query_row(
            "SELECT count(*) FROM gym_members WHERE gym_id = ?1 AND deleted_at IS NULL;",
            rusqlite::params![cloud_gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0)
    };

    Ok(CloudEnrollResponse {
        success: true,
        gym_id: cloud_gym_id.to_string(),
        gym_name: cloud_user.gym_name,
        gym_code: cloud_user.gym_code,
        user_name: cloud_user.full_name,
        email: cloud_user.email,
        synced_members_count: member_count,
        message: "Desktop successfully connected and synchronized with cloud tenant.".to_string(),
    })
}

/// Command to query current cloud enrollment status.
#[tauri::command]
pub async fn get_cloud_enrollment_status_command(
    state: State<'_, AppState>,
) -> Result<CloudEnrollmentStatusResponse, AppError> {
    let meta = state.cloud_session.get_metadata().await;
    let enroll_state = state.cloud_session.get_state().await;
    let is_enrolled = meta.is_some() && enroll_state != EnrollmentState::Unenrolled;

    let (gym_id_opt, gym_name_opt, gym_code_opt, email_opt, enrolled_at_opt, member_count) = if let Some(ref m) = meta {
        let count: i64 = if let Ok(conn) = state.db.pool.get() {
            conn.query_row(
                "SELECT count(*) FROM gym_members WHERE gym_id = ?1 AND deleted_at IS NULL;",
                rusqlite::params![m.gym_id.to_string()],
                |r| r.get(0),
            ).unwrap_or(0)
        } else {
            0
        };
        (
            Some(m.gym_id.to_string()),
            Some(m.gym_name.clone()),
            m.gym_code.clone(),
            Some(m.email.clone()),
            Some(m.enrolled_at.clone()),
            count,
        )
    } else {
        (None, None, None, None, None, 0)
    };

    let state_str = match enroll_state {
        EnrollmentState::Unenrolled => "UNENROLLED",
        EnrollmentState::Authenticating => "AUTHENTICATING",
        EnrollmentState::Enrolled => "ENROLLED",
        EnrollmentState::Syncing => "SYNCING",
        EnrollmentState::Ready => "READY",
        EnrollmentState::AuthExpired => "AUTH_EXPIRED",
        EnrollmentState::Failed(ref msg) => msg.as_str(),
    };

    Ok(CloudEnrollmentStatusResponse {
        is_enrolled,
        state: state_str.to_string(),
        gym_id: gym_id_opt,
        gym_name: gym_name_opt,
        gym_code: gym_code_opt,
        email: email_opt,
        enrolled_at: enrolled_at_opt,
        local_member_count: member_count,
    })
}

/// Command to trigger an immediate on-demand synchronization pass.
#[tauri::command]
pub async fn cloud_sync_now_command(
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    let meta = match state.cloud_session.get_metadata().await {
        Some(m) => m,
        None => return Err(AppError::Unauthorized),
    };

    let cloud_url = get_effective_cloud_url(None);
    let client = CloudAuthClient::build_http_client();
    let token = match state.cloud_session.get_access_token().await {
        Some(t) if !t.is_empty() => t,
        _ => state.cloud_session.refresh_access_token_single_flight(&client, &cloud_url).await?,
    };

    let device_id = state.cloud_session.get_or_create_device_id();

    SyncWorker::execute_cycle(
        &state.db.pool,
        &client,
        &cloud_url,
        &device_id,
        &meta.gym_id,
        &token,
    ).await?;

    Ok(true)
}

/// Command to unenroll Desktop from Cloud and revoke cloud session.
#[tauri::command]
pub async fn cloud_unenroll_command(
    state: State<'_, AppState>,
) -> Result<bool, AppError> {
    if let Some(refresh_tok) = state.cloud_session.get_stored_refresh_token() {
        let cloud_url = get_effective_cloud_url(None);
        let client = CloudAuthClient::build_http_client();
        let _ = CloudAuthClient::logout(&client, &cloud_url, &refresh_tok).await;
    }

    state.cloud_session.revoke_cloud_session().await?;
    Ok(true)
}
