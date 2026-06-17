use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gym {
    pub id: Uuid,
    pub name: String,
    pub owner_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone_number: Option<String>,
    pub password_hash: String,
    pub role: String,
    pub account_status: String,
    pub verification_status: String,
    pub failed_login_attempts: i32,
    pub lockout_until: Option<DateTime<Utc>>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct AuthenticatedContext {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub gym_id: Uuid,
    pub role: String,
    pub permissions: Vec<String>,
}
