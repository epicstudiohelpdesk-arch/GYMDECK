use crate::permissions::Permission;
use crate::errors::AppError;

/// Simulates a central authorization middleware block. 
/// In a live system, this wrapper inspects the UserContext/Session before 
/// passing execution to the actual command logic.
pub struct AuthGuard;

impl AuthGuard {
    /// Validates that the active session's role possesses the required permission.
    /// Emits a structured security log and an Audit Log entry if denied.
    pub fn enforce_permission(role: &str, required_permission: &Permission) -> Result<(), AppError> {
        if !crate::permissions::has_permission(role, required_permission) {
            
            // Log highly sensitive security warning to local console/files
            tracing::warn!(
                target: "security_audit",
                role = role,
                permission = ?required_permission,
                "UNAUTHORIZED_ACTION_ATTEMPT"
            );

            // In production, we would inject a `&Transaction` here and insert 
            // a row into `audit_logs` indicating the denied access attempt.

            return Err(AppError::Unauthorized);
        }

        Ok(())
    }
}
