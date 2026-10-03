use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Member {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub member_code: String,
    pub full_name: String,
    pub phone: String,
    pub alternate_phone: Option<String>,
    pub email: Option<String>,
    pub gender: Option<String>,
    pub dob: Option<String>, // Using String for simplicity in DATE storage, or NaiveDate
    pub address: Option<String>,
    pub height: Option<String>,
    pub weight: Option<String>,
    pub blood_group: Option<String>,
    pub membership_plan_id: Option<Uuid>,
    pub membership_status: String,
    pub joined_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub profile_photo_path: Option<String>,
    pub notes: Option<String>,
    pub created_by_user_id: Uuid,
    pub updated_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberDocument {
    pub id: Uuid,
    pub member_id: Uuid,
    pub gym_id: Uuid,
    pub doc_name: String,
    pub doc_type: String,
    pub file_content: Vec<u8>, // Stored as BLOB in SQLite
    pub file_size: Option<String>,
    pub upload_date: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MembershipPlan {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub plan_name: String,
    pub duration_days: i32,
    #[serde(alias = "priceMinorUnits", default)]
    pub price_minor_units: i64,
    #[serde(default)]
    pub price: Option<f64>,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_by_user_id: Uuid,
    pub updated_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: Uuid,
    pub gym_id: Uuid,
    pub member_id: Uuid,
    #[serde(alias = "amountMinorUnits", default)]
    pub amount_minor_units: i64,
    #[serde(default)]
    pub amount: Option<f64>,
    pub payment_method: String,
    pub transaction_reference: Option<String>,
    pub payment_date: DateTime<Utc>,
    pub status: String,
    pub created_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub deleted_by_user_id: Option<Uuid>,
}
