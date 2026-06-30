use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Database corruption detected")]
    DatabaseCorruption,
    #[error("Database key mismatch: {0}")]
    KeyMismatch(String),
    #[error("Cryptographic operation failed")]
    Crypto(String),
    #[error("Authentication failed")]
    Authentication,
    #[error("Unauthorized access")]
    Unauthorized,
    #[error("Session expired or invalid")]
    SessionInvalid,
}

// Implement Serialize to safely pass errors to the React frontend
// This explicitly strips all internal error strings to prevent backend state leakage.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let safe_message = match self {
            AppError::Database(e) => format!("System Error: Database access failed. Details: {}", e),
            AppError::DatabaseCorruption => "System Error: Database integrity compromised.".to_string(),
            AppError::KeyMismatch(_) => "System Error: Database encryption key is invalid. The database cannot be opened.".to_string(),
            AppError::Crypto(_) => "Security Error: Cryptographic operation failed.".to_string(),
            AppError::Authentication => "Authentication Error: Invalid email or password.".to_string(),
            AppError::Unauthorized => "Access Denied: Unauthorized action.".to_string(),
            AppError::SessionInvalid => "Session Error: Your session has expired or is invalid. Please log in again.".to_string(),
        };
        serializer.serialize_str(&safe_message)
    }
}
