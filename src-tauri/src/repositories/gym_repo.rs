use rusqlite::Transaction;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct Gym {
    pub id: Uuid,
    pub name: String,
    pub owner_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct GymRepository;

impl GymRepository {
    pub fn create_gym(tx: &Transaction, gym: &Gym) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO gyms (id, name, owner_user_id, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            (
                gym.id.to_string(),
                &gym.name,
                gym.owner_user_id.to_string(),
                gym.created_at.to_rfc3339(),
                gym.updated_at.to_rfc3339(),
            ),
        ).map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }
}
