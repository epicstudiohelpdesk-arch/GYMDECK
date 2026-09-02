use std::env;
use crate::errors::AppError;

pub const DEV_DB_KEY: &str = "static_dev_key_x0000000000000000000000000";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnvironment {
    Development,
    Staging,
    Production,
}

impl AppEnvironment {
    pub fn from_str_or_default(val: Option<&str>) -> Self {
        match val.map(|s| s.trim().to_lowercase()).as_deref() {
            Some("production") | Some("prod") => AppEnvironment::Production,
            Some("staging") | Some("stage") => AppEnvironment::Staging,
            _ => AppEnvironment::Development,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AppEnvironment::Development => "development",
            AppEnvironment::Staging => "staging",
            AppEnvironment::Production => "production",
        }
    }
}

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub environment: AppEnvironment,
    pub db_encryption_key: String,
    pub updater_pubkey: String,
    pub log_level: String,
}

impl AppConfig {
    /// Loads application configuration from the process environment.
    /// In Development: defaults to DEV_DB_KEY if GYMDECK_DB_KEY is not set.
    /// In Staging/Production: GYMDECK_DB_KEY MUST be explicitly configured and MUST NOT equal DEV_DB_KEY.
    pub fn from_env() -> Result<Self, AppError> {
        let env_str = env::var("GYMDECK_ENV")
            .or_else(|_| env::var("APP_ENV"))
            .or_else(|_| env::var("NODE_ENV"))
            .ok();

        let environment = AppEnvironment::from_str_or_default(env_str.as_deref());

        let raw_db_key = env::var("GYMDECK_DB_KEY").ok();

        let db_key = match environment {
            AppEnvironment::Production | AppEnvironment::Staging => {
                match raw_db_key {
                    Some(ref k) if !k.trim().is_empty() && k.trim() != DEV_DB_KEY => {
                        k.trim().to_string()
                    }
                    Some(ref k) if k.trim() == DEV_DB_KEY => {
                        return Err(AppError::Configuration(format!(
                            "Security Violation: {} environment cannot use the static development key. An explicit secure GYMDECK_DB_KEY is required.",
                            environment.as_str()
                        )));
                    }
                    _ => {
                        return Err(AppError::Configuration(format!(
                            "Security Configuration Error: Missing required GYMDECK_DB_KEY for {} environment.",
                            environment.as_str()
                        )));
                    }
                }
            }
            AppEnvironment::Development => {
                match raw_db_key {
                    Some(ref k) if !k.trim().is_empty() => k.trim().to_string(),
                    _ => {
                        tracing::info!("GYMDECK_DB_KEY not set. Using default development key.");
                        DEV_DB_KEY.to_string()
                    }
                }
            }
        };

        let updater_pubkey = env::var("GYMDECK_UPDATER_PUBKEY")
            .unwrap_or_else(|_| String::from("UPDATE_SIGNING_PUBLIC_KEY_PLACEHOLDER"));

        let log_level = env::var("LOG_LEVEL").unwrap_or_else(|_| String::from("info"));

        Ok(Self {
            environment,
            db_encryption_key: db_key,
            updater_pubkey,
            log_level,
        })
    }

    pub fn is_production_mode(&self) -> bool {
        self.environment == AppEnvironment::Production
    }

    pub fn is_staging_mode(&self) -> bool {
        self.environment == AppEnvironment::Staging
    }

    pub fn is_development_mode(&self) -> bool {
        self.environment == AppEnvironment::Development
    }
}
