use crate::database::manager::DatabaseManager;
use crate::repositories::user_repo::UserRepository;
use crate::repositories::gym_repo::{GymRepository, Gym};
use crate::models::user::User;
use crate::encryption::argon::CryptoEngine;
use crate::encryption::secrets::SecureString;
use crate::errors::AppError;
use uuid::Uuid;
use chrono::Utc;

pub struct AuthService;

impl AuthService {
    /// Executes the primary Signup flow transaction.
    /// Creates a Gym and a User linked to it atomically.
    pub fn signup(
        db: &DatabaseManager, 
        gym_name: &str,
        full_name: &str, 
        email: &str, 
        password: &SecureString
    ) -> Result<(Uuid, Uuid), AppError> {
        let mut conn = db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
        
        if UserRepository::get_user_by_email(&conn, email)?.is_some() {
            return Err(AppError::Authentication);
        }

        let hashed_password = CryptoEngine::hash_password(password)?;
        
        let gym_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let now = Utc::now();

        let new_gym = Gym {
            id: gym_id,
            name: gym_name.to_string(),
            owner_user_id: user_id,
            created_at: now,
            updated_at: now,
        };

        let new_user = User {
            id: user_id,
            gym_id,
            full_name: full_name.to_string(),
            email: email.to_string(),
            phone_number: None,
            password_hash: hashed_password.expose_secret().to_string(),
            role: "OWNER".to_string(),
            account_status: "ACTIVE".to_string(),
            verification_status: "UNVERIFIED".to_string(),
            failed_login_attempts: 0,
            lockout_until: None,
            last_login_at: None,
            created_at: now,
            updated_at: now,
        };

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        GymRepository::create_gym(&tx, &new_gym)?;
        UserRepository::create_user(&tx, &new_user)?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        tracing::info!("Successful enterprise signup for gym: {} (Owner: {})", gym_name, email);
        
        Ok((user_id, gym_id))
    }

    /// Executes the primary Login flow.
    pub fn login(db: &DatabaseManager, email: &str, password: &SecureString) -> Result<(Uuid, Uuid), AppError> {
        let conn = db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
        
        let user = UserRepository::get_user_by_email(&conn, email)?
            .ok_or(AppError::Authentication)?;
            
        if user.account_status == "LOCKED" {
            return Err(AppError::Authentication);
        }

        let stored_hash = SecureString::new(user.password_hash.clone());
        if !CryptoEngine::verify_password(&stored_hash, password)? {
            return Err(AppError::Authentication);
        }

        tracing::info!("Successful authentication for user: {} (Gym: {})", user.id, user.gym_id);
        
        Ok((user.id, user.gym_id))
    }

    /// Handles explicit session revocation.
    pub fn logout() -> Result<(), AppError> {
        tracing::info!("User logout requested.");
        Ok(())
    }
}
