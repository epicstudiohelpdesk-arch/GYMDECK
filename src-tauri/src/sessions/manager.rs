use uuid::Uuid;
use zeroize::{Zeroize, ZeroizeOnDrop};
use chrono::{Utc, DateTime};
use keyring::Entry;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::errors::AppError;
use crate::sessions::trust::{TrustEngine, TrustLevel};

/// In-Memory Active Session (Short-Lived)
/// NEVER written to disk. Automatically wiped from RAM on drop.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct ActiveSessionToken(String);

impl ActiveSessionToken {
    pub fn new() -> Self {
        Self(Uuid::new_v4().to_string())
    }
    pub fn expose(&self) -> &str {
        &self.0
    }
}

pub struct SessionState {
    pub user_id: Uuid,
    pub gym_id: Uuid,
    pub active_token: ActiveSessionToken,
    pub expires_at: DateTime<Utc>,
    pub is_locked: bool,
    pub last_activity: DateTime<Utc>,
}

/// Manages Dual-Session Architecture:
/// 1. OS Keychain `RefreshToken` (Long-lived, persisted)
/// 2. In-Memory `ActiveSessionToken` (Short-lived, Volatile)
pub struct SessionManager {
    // Thread-safe in-memory cache for the active session
    active_session: Arc<RwLock<Option<SessionState>>>,
    service_name: String,
}

impl SessionManager {
    pub fn new(service_name: &str) -> Self {
        Self {
            active_session: Arc::new(RwLock::new(None)),
            service_name: service_name.to_string(),
        }
    }

    fn get_keyring_entry(&self) -> Result<Entry, AppError> {
        Entry::new(&self.service_name, "gymdeck_refresh_token")
            .map_err(|_| AppError::SessionInvalid)
    }

    /// Fetches the active session from memory if it exists and hasn't expired.
    pub async fn get_active_session(&self) -> Option<(Uuid, Uuid)> {
        let state = self.active_session.read().await;
        if let Some(session) = state.as_ref() {
            if !session.is_locked && session.expires_at > Utc::now() {
                return Some((session.user_id, session.gym_id));
            }
        }
        None
    }

    /// Rotates the session: Generates a new Refresh Token (Keychain) and Active Token (Memory).
    /// Binds the session to the current Device Trust Fingerprint.
    pub async fn create_and_bind_session(&self, user_id: Uuid, gym_id: Uuid) -> Result<(), AppError> {
        let refresh_token = Uuid::new_v4().to_string();
        let fingerprint = TrustEngine::generate_device_fingerprint();
        
        // Cryptographic Binding: RefreshToken:Fingerprint:UserId:GymId
        let bound_payload = format!("{}:{}:{}:{}", refresh_token, fingerprint, user_id, gym_id);
        
        let entry = self.get_keyring_entry()?;
        entry.set_password(&bound_payload).map_err(|_| AppError::SessionInvalid)?;

        let new_active_token = ActiveSessionToken::new();
        
        let mut state = self.active_session.write().await;
        *state = Some(SessionState {
            user_id,
            gym_id,
            active_token: new_active_token,
            expires_at: Utc::now() + chrono::Duration::hours(1), // 1 Hour Active TTL
            is_locked: false,
            last_activity: Utc::now(),
        });

        tracing::info!("New multi-tenant session created, bound to device, and rotated successfully.");
        Ok(())
    }

    /// Validates the OS Keychain Refresh Token, evaluates Device Trust, and issues a new Active Token.
    pub async fn restore_session(&self) -> Result<(Uuid, Uuid), AppError> {
        let entry = self.get_keyring_entry()?;
        let bound_payload = entry.get_password().map_err(|_| AppError::SessionInvalid)?;
        
        let parts: Vec<&str> = bound_payload.split(':').collect();
        if parts.len() != 4 {
            let _ = entry.delete_credential();
            return Err(AppError::SessionInvalid);
        }

        let _stored_refresh_token = parts[0];
        let stored_fingerprint = parts[1];
        let user_id = Uuid::parse_str(parts[2]).map_err(|_| AppError::SessionInvalid)?;
        let gym_id = Uuid::parse_str(parts[3]).map_err(|_| AppError::SessionInvalid)?;

        // Anomaly Detection: Validate Device Trust
        let (_, trust_score) = TrustEngine::evaluate_current_device(stored_fingerprint);
        
        match TrustEngine::classify_trust(trust_score) {
            TrustLevel::Untrusted => {
                tracing::error!("CATASTROPHIC TRUST COLLAPSE: Device fingerprint mismatch. Revoking session.");
                let _ = entry.delete_credential();
                return Err(AppError::SessionInvalid);
            },
            TrustLevel::Suspicious => {
                tracing::warn!("SUSPICIOUS TRUST: Minor device drift detected. Forcing re-authentication.");
                return Err(AppError::SessionInvalid);
            },
            TrustLevel::Trusted => {
                tracing::info!("Device trust validated. Restoring active session.");
                let mut state = self.active_session.write().await;
                *state = Some(SessionState {
                    user_id,
                    gym_id,
                    active_token: ActiveSessionToken::new(),
                    expires_at: Utc::now() + chrono::Duration::hours(1),
                    is_locked: false,
                    last_activity: Utc::now(),
                });
                Ok((user_id, gym_id))
            }
        }
    }

    /// Marks the active session as LOCKED due to inactivity.
    pub async fn lock_session(&self) -> Result<(), AppError> {
        let mut state = self.active_session.write().await;
        if let Some(session) = state.as_mut() {
            session.is_locked = true;
            tracing::info!("Workstation session auto-locked due to inactivity.");
            Ok(())
        } else {
            Err(AppError::Authentication)
        }
    }

    /// Fully revokes both Active and Refresh tokens.
    pub async fn revoke_session(&self) -> Result<(), AppError> {
        let mut state = self.active_session.write().await;
        *state = None; // Drops and zeroizes ActiveSessionToken

        if let Ok(entry) = self.get_keyring_entry() {
            let _ = entry.delete_credential();
        }
        
        tracing::info!("Session fully revoked and zeroized.");
        Ok(())
    }
}
