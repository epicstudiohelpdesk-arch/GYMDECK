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
}

impl CloudSessionManager {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            active_access_token: Arc::new(RwLock::new(None)),
            active_metadata: Arc::new(RwLock::new(None)),
            state: Arc::new(RwLock::new(EnrollmentState::Unenrolled)),
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

    /// Fetches the volatile in-memory access token if available.
    pub async fn get_access_token(&self) -> Option<String> {
        let token_guard = self.active_access_token.read().await;
        token_guard.clone()
    }

    /// Updates the in-memory access token (e.g. after refresh).
    pub async fn set_access_token(&self, token: String) {
        let mut token_guard = self.active_access_token.write().await;
        *token_guard = Some(token);
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
    pub async fn revoke_cloud_session(&self) -> Result<(), AppError> {
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

        tracing::info!("Cloud enrollment session cleared from memory and OS Keychain.");
        Ok(())
    }
}
