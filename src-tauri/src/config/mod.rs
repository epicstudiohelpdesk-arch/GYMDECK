use std::env;

const DEV_DB_KEY: &str = "static_dev_key_x0000000000000000000000000";

pub struct AppConfig {
    pub db_encryption_key: String,
    pub updater_pubkey: String,
    pub log_level: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let db_key = env::var("GYMDECK_DB_KEY").unwrap_or_else(|_| {
            tracing::warn!("GYMDECK_DB_KEY not set. Using development key. Set this for production.");
            DEV_DB_KEY.to_string()
        });

        let updater_pubkey = env::var("GYMDECK_UPDATER_PUBKEY")
            .unwrap_or_else(|_| String::from("UPDATE_SIGNING_PUBLIC_KEY_PLACEHOLDER"));

        let log_level = env::var("LOG_LEVEL").unwrap_or_else(|_| String::from("info"));

        Self {
            db_encryption_key: db_key,
            updater_pubkey,
            log_level,
        }
    }

    pub fn is_production_mode(&self) -> bool {
        self.db_encryption_key != DEV_DB_KEY
    }
}
