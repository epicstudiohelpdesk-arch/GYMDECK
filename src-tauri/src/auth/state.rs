use serde::{Serialize, Deserialize};

/// Explicit Authentication State Machine for the frontend.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuthState {
    /// Cold start. User must provide full credentials.
    Unauthenticated,
    /// Backend is processing credentials (Argon2id hashing in progress).
    Authenticating,
    /// Session is active and valid. Full access granted.
    Authenticated,
    /// App has been idle. Requires PIN/Biometric to unlock.
    Locked,
    /// Hardware drift detected. Requires master password re-verification.
    Suspicious,
    /// Session time limit reached. Must re-authenticate fully.
    Expired,
    /// User is engaged in a password reset or DB recovery flow.
    Recovering,
    /// Explicit logout or remote kill. All tokens zeroized.
    Revoked,
}
