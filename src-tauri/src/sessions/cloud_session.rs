use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use keyring::Entry;
use serde::{Serialize, Deserialize};
use crate::errors::AppError;
use crate::auth::cloud_auth::CloudTokensDto;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum EnrollmentState {
    Unenrolled,
    Authenticating,
    Enrolled,
    Syncing,
    Ready,
    AuthExpired,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudEnrollmentMetadata {
    pub user_id: Uuid,
    pub gym_id: Uuid,
    pub gym_name: String,
    pub gym_code: Option<String>,
    pub email: String,
    pub enrolled_at: String,
}

#[derive(Clone)]
pub struct CloudSessionManager {
    service_name: String,
    active_access_token: Arc<RwLock<Option<String>>>,
    active_metadata: Arc<RwLock<Option<CloudEnrollmentMetadata>>>,
    state: Arc<RwLock<EnrollmentState>>,
    refresh_lock: Arc<tokio::sync::Mutex<()>>,
    token_updated_at: Arc<RwLock<chrono::DateTime<chrono::Utc>>>,
    active_worker_flag: Arc<RwLock<Option<Arc<std::sync::atomic::AtomicBool>>>>,
}

impl CloudSessionManager {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            active_access_token: Arc::new(RwLock::new(None)),
            active_metadata: Arc::new(RwLock::new(None)),
            state: Arc::new(RwLock::new(EnrollmentState::Unenrolled)),
            refresh_lock: Arc::new(tokio::sync::Mutex::new(())),
            token_updated_at: Arc::new(RwLock::new(chrono::Utc::now())),
            active_worker_flag: Arc::new(RwLock::new(None)),
        }
    }

    fn get_refresh_token_entry(&self) -> Result<Entry, AppError> {
        Entry::new(&self.service_name, "gymdeck_cloud_refresh_token")
            .map_err(|e| AppError::Configuration(format!("Keychain access error: {}", e)))
    }

    fn get_metadata_entry(&self) -> Result<Entry, AppError> {
        Entry::new(&self.service_name, "gymdeck_cloud_enrollment_meta")
            .map_err(|e| AppError::Configuration(format!("Keychain access error: {}", e)))
    }

    fn get_device_id_entry(&self) -> Result<Entry, AppError> {
        Entry::new(&self.service_name, "gymdeck_device_id")
            .map_err(|e| AppError::Configuration(format!("Keychain access error: {}", e)))
    }

    /// Fetches the persistent, cryptographically random Device ID for this installation.
    /// If none exists in Keyring, generates a fresh UUIDv4 device identity and persists it.
    pub fn get_or_create_device_id(&self) -> String {
        if let Ok(entry) = self.get_device_id_entry() {
            if let Ok(id) = entry.get_password() {
                if !id.trim().is_empty() {
                    return id.trim().to_string();
                }
            }
            let new_id = format!("desktop-node-{}", Uuid::new_v4());
            let _ = entry.set_password(&new_id);
            return new_id;
        }
        format!("desktop-node-{}", Uuid::new_v4())
    }

    /// Registers a background sync worker's cancellation flag, stopping any previous worker.
    pub async fn register_worker_flag(&self, flag: Arc<std::sync::atomic::AtomicBool>) {
        let mut guard = self.active_worker_flag.write().await;
        if let Some(ref old_flag) = *guard {
            old_flag.store(false, std::sync::atomic::Ordering::SeqCst);
            tracing::info!("[CloudSessionManager] Stopped previous sync worker instance.");
        }
        *guard = Some(flag);
    }

    /// Stops any currently active background sync worker.
    pub async fn stop_active_worker(&self) {
        let mut guard = self.active_worker_flag.write().await;
        if let Some(ref flag) = *guard {
            flag.store(false, std::sync::atomic::Ordering::SeqCst);
            tracing::info!("[CloudSessionManager] Background sync worker stopped.");
        }
        *guard = None;
    }

    /// Fetches the volatile in-memory access token if available.
    pub async fn get_access_token(&self) -> Option<String> {
        let token_guard = self.active_access_token.read().await;
        token_guard.clone()
    }

    /// Updates the in-memory access token (e.g. after refresh).
    pub async fn set_access_token(&self, token: String) {
        let mut token_guard = self.active_access_token.write().await;
        *token_guard = Some(token);
        let mut time_guard = self.token_updated_at.write().await;
        *time_guard = chrono::Utc::now();
    }

    /// Concurrency-deduplicated (Single-Flight) access token refresh.
    /// Guarantees that multiple concurrent 401 triggers execute exactly ONE network refresh call.
    pub async fn refresh_access_token_single_flight(
        &self,
        client: &reqwest::Client,
        cloud_url: &str,
    ) -> Result<String, AppError> {
        let _lock = self.refresh_lock.lock().await;

        // Check if another concurrent thread refreshed the token within the last 5 seconds
        let elapsed = chrono::Utc::now().signed_duration_since(*self.token_updated_at.read().await);
        if elapsed.num_seconds() < 5 {
            if let Some(tok) = self.get_access_token().await {
                if !tok.is_empty() {
                    return Ok(tok);
                }
            }
        }

        let refresh_tok = self.get_stored_refresh_token()
            .ok_or(AppError::SessionInvalid)?;

        let new_tokens = crate::auth::cloud_auth::CloudAuthClient::refresh_tokens(
            client,
            cloud_url,
            &refresh_tok,
        ).await.map_err(|e| {
            let _ = self.set_state_sync(EnrollmentState::AuthExpired);
            e
        })?;

        // Update Keyring with rotated refresh token
        if let Ok(entry) = self.get_refresh_token_entry() {
            let _ = entry.set_password(&new_tokens.refresh_token);
        }

        self.set_access_token(new_tokens.access_token.clone()).await;
        self.set_state(EnrollmentState::Ready).await;
        Ok(new_tokens.access_token)
    }

    fn set_state_sync(&self, new_state: EnrollmentState) {
        if let Ok(mut state_guard) = self.state.try_write() {
            *state_guard = new_state;
        }
    }

    /// Fetches the active enrolled metadata.
    pub async fn get_metadata(&self) -> Option<CloudEnrollmentMetadata> {
        let meta_guard = self.active_metadata.read().await;
        meta_guard.clone()
    }

    /// Fetches the active enrollment state.
    pub async fn get_state(&self) -> EnrollmentState {
        let state_guard = self.state.read().await;
        state_guard.clone()
    }

    /// Sets the enrollment state.
    pub async fn set_state(&self, new_state: EnrollmentState) {
        let mut state_guard = self.state.write().await;
        *state_guard = new_state;
    }

    /// Binds new tokens and metadata upon successful cloud login.
    pub async fn bind_enrollment(
        &self,
        tokens: &CloudTokensDto,
        meta: CloudEnrollmentMetadata,
    ) -> Result<(), AppError> {
        // 1. Store Refresh Token in OS Keyring
        let refresh_entry = self.get_refresh_token_entry()?;
        refresh_entry
            .set_password(&tokens.refresh_token)
            .map_err(|e| AppError::Configuration(format!("Failed to store refresh token in keychain: {}", e)))?;

        // 2. Store Metadata in OS Keyring
        let meta_json = serde_json::to_string(&meta)
            .map_err(|e| AppError::Configuration(format!("Failed to serialize metadata: {}", e)))?;
        let meta_entry = self.get_metadata_entry()?;
        meta_entry
            .set_password(&meta_json)
            .map_err(|e| AppError::Configuration(format!("Failed to store metadata in keychain: {}", e)))?;

        // 3. Update memory state
        {
            let mut token_guard = self.active_access_token.write().await;
            *token_guard = Some(tokens.access_token.clone());
        }
        {
            let mut time_guard = self.token_updated_at.write().await;
            *time_guard = chrono::Utc::now();
        }
        {
            let mut meta_guard = self.active_metadata.write().await;
            *meta_guard = Some(meta);
        }
        {
            let mut state_guard = self.state.write().await;
            *state_guard = EnrollmentState::Enrolled;
        }

        tracing::info!("Desktop successfully enrolled into cloud tenant.");
        Ok(())
    }

    /// Restores cloud enrollment metadata from Keyring on app bootstrap.
    pub async fn restore_enrollment(&self) -> Result<Option<CloudEnrollmentMetadata>, AppError> {
        let meta_entry = match self.get_metadata_entry() {
            Ok(e) => e,
            Err(_) => return Ok(None),
        };

        let meta_json = match meta_entry.get_password() {
            Ok(json) => json,
            Err(_) => return Ok(None),
        };

        let meta: CloudEnrollmentMetadata = match serde_json::from_str(&meta_json) {
            Ok(m) => m,
            Err(_) => return Ok(None),
        };

        {
            let mut meta_guard = self.active_metadata.write().await;
            *meta_guard = Some(meta.clone());
        }
        {
            let mut state_guard = self.state.write().await;
            *state_guard = EnrollmentState::Enrolled;
        }

        tracing::info!("Restored cloud enrollment from OS Keychain for gym: {:?}", meta.gym_name);
        Ok(Some(meta))
    }

    /// Reads stored refresh token from Keyring.
    pub fn get_stored_refresh_token(&self) -> Option<String> {
        self.get_refresh_token_entry().ok()?.get_password().ok()
    }

    /// Clears and revokes all cloud tokens and metadata on logout/unenrollment.
    /// Preserves the local database vault completely untouched.
    pub async fn revoke_cloud_session(&self) -> Result<(), AppError> {
        // Stop any running sync worker first
        self.stop_active_worker().await;

        {
            let mut token_guard = self.active_access_token.write().await;
            *token_guard = None;
        }
        {
            let mut meta_guard = self.active_metadata.write().await;
            *meta_guard = None;
        }
        {
            let mut state_guard = self.state.write().await;
            *state_guard = EnrollmentState::Unenrolled;
        }

        if let Ok(entry) = self.get_refresh_token_entry() {
            let _ = entry.delete_credential();
        }
        if let Ok(entry) = self.get_metadata_entry() {
            let _ = entry.delete_credential();
        }

        tracing::info!("Cloud enrollment session cleared from memory and OS Keychain (Local SQLite vault preserved).");
        Ok(())
    }
}
