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

/// Local-development default, retained so local dev works unchanged.
pub const DEV_CLOUD_URL: &str = "http://127.0.0.1:3001";

/// Canonical production cloud API host (repository evidence: nginx.conf,
/// root .env.example, rollback.sh, mobile configs).
pub const CANONICAL_PRODUCTION_CLOUD_URL: &str = "https://api.gymdeck.com";

/// Resolve the cloud API base URL.
/// Order: payload override -> GYMDECK_CLOUD_URL -> local dev default.
/// Staging/production require an explicit value; plaintext and loopback URLs
/// are rejected there so shipped builds cannot silently use a dev API.
pub fn resolve_cloud_url(override_url: Option<&str>) -> Result<String, AppError> {
    let env_str = env::var("GYMDECK_ENV")
        .or_else(|_| env::var("APP_ENV"))
        .or_else(|_| env::var("NODE_ENV"))
        .ok();
    let environment = AppEnvironment::from_str_or_default(env_str.as_deref());
    let url = match override_url.map(str::trim).filter(|s| !s.is_empty()) {
        Some(u) => u.to_string(),
        None => match env::var("GYMDECK_CLOUD_URL") {
            Ok(v) if !v.trim().is_empty() => v.trim().to_string(),
            _ => match environment {
                AppEnvironment::Development => DEV_CLOUD_URL.to_string(),
                _ => return Err(AppError::Configuration(format!(
                    "Security Configuration Error: GYMDECK_CLOUD_URL is required in {} environment.",
                    environment.as_str()
                ))),
            },
        },
    };
    validate_cloud_url(&url, &environment)?;
    Ok(url)
}

pub fn validate_cloud_url(url: &str, environment: &AppEnvironment) -> Result<(), AppError> {
    let error = |reason: &str| AppError::Configuration(format!(
        "Invalid cloud URL for {} environment: {}", environment.as_str(), reason
    ));
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(error("scheme must be http or https"));
    }
    if matches!(environment, AppEnvironment::Production | AppEnvironment::Staging) {
        if !url.starts_with("https://") {
            return Err(error("https is required"));
        }
        let lower = url.to_ascii_lowercase();
        for host in ["127.0.0.1", "localhost", "0.0.0.0", "[::1]"] {
            if lower.contains(host) {
                return Err(error("loopback hosts are forbidden"));
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn development_allows_loopback_default() {
        assert_eq!(DEV_CLOUD_URL, "http://127.0.0.1:3001");
        assert!(validate_cloud_url(DEV_CLOUD_URL, &AppEnvironment::Development).is_ok());
    }

    #[test]
    fn production_rejects_missing_https_and_loopback() {
        assert!(validate_cloud_url("http://127.0.0.1:3001", &AppEnvironment::Production).is_err());
        assert!(validate_cloud_url("http://api.gymdeck.com", &AppEnvironment::Production).is_err());
        assert!(validate_cloud_url("https://localhost:3001", &AppEnvironment::Staging).is_err());
    }

    #[test]
    fn production_accepts_canonical_host() {
        assert!(validate_cloud_url(CANONICAL_PRODUCTION_CLOUD_URL, &AppEnvironment::Production).is_ok());
    }
}
