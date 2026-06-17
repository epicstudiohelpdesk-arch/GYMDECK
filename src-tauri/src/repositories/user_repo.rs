use rusqlite::{Connection, Transaction, OptionalExtension};
use uuid::Uuid;
use crate::models::user::User;
use crate::errors::AppError;

pub struct UserRepository;

impl UserRepository {
    /// Executes an atomic insert of a new user. 
    /// Demands a `&Transaction` instead of a `&Connection` to enforce that 
    /// creation happens within an explicit BEGIN/COMMIT boundary, preventing 
    /// ghost accounts if subsequent steps (like session creation) fail.
    pub fn create_user(tx: &Transaction, user: &User) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO users (
                id, gym_id, full_name, email, phone_number, password_hash, 
                role, account_status, verification_status, failed_login_attempts, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            (
                user.id.to_string(),
                user.gym_id.to_string(),
                &user.full_name,
                &user.email,
                &user.phone_number,
                &user.password_hash,
                &user.role,
                &user.account_status,
                &user.verification_status,
                user.failed_login_attempts,
                user.created_at.to_rfc3339(),
                user.updated_at.to_rfc3339(),
            ),
        ).map_err(|e| {
            tracing::error!("Failed to insert user: {}", e);
            AppError::Database(e.to_string())
        })?;
        
        Ok(())
    }

    /// Fetches a user by email constraint. Can use a standard `&Connection`.
    pub fn get_user_by_email(conn: &Connection, email: &str) -> Result<Option<User>, AppError> {
        let mut stmt = conn.prepare("SELECT * FROM users WHERE email = ?1")
            .map_err(|e| AppError::Database(e.to_string()))?;

        let user = stmt.query_row([email], |row| {
            Ok(User {
                id: Uuid::parse_str(&row.get::<_, String>("id")?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>("gym_id")?).unwrap_or_default(),
                full_name: row.get("full_name")?,
                email: row.get("email")?,
                phone_number: row.get("phone_number")?,
                password_hash: row.get("password_hash")?,
                role: row.get("role")?,
                account_status: row.get("account_status")?,
                verification_status: row.get("verification_status")?,
                failed_login_attempts: row.get("failed_login_attempts")?,
                lockout_until: row.get::<_, Option<String>>("lockout_until")?
                    .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&chrono::Utc))),
                last_login_at: row.get::<_, Option<String>>("last_login_at")?
                    .and_then(|dt| chrono::DateTime::parse_from_rfc3339(&dt).ok().map(|d| d.with_timezone(&chrono::Utc))),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                    .unwrap_or_default().with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
                    .unwrap_or_default().with_timezone(&chrono::Utc),
            })
        }).optional().map_err(|e| AppError::Database(e.to_string()))?;

        Ok(user)
    }
}
