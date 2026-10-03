use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::time::Duration;
use crate::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudUserDto {
    pub id: Uuid,
    #[serde(rename = "gymId")]
    pub gym_id: Uuid,
    #[serde(rename = "gymName")]
    pub gym_name: String,
    #[serde(rename = "gymCode")]
    pub gym_code: Option<String>,
    pub email: String,
    #[serde(rename = "fullName")]
    pub full_name: String,
    #[serde(rename = "phoneNumber")]
    pub phone_number: Option<String>,
    pub role: String,
    pub permissions: Vec<String>,
    #[serde(rename = "accountStatus")]
    pub account_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudTokensDto {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudAuthData {
    pub user: CloudUserDto,
    pub tokens: CloudTokensDto,
}

#[derive(Debug, Deserialize)]
struct CloudAuthApiResponse {
    pub success: bool,
    pub data: Option<CloudAuthData>,
    pub error: Option<CloudApiErrorDetail>,
}

#[derive(Debug, Deserialize)]
struct CloudRefreshApiResponse {
    pub success: bool,
    pub data: Option<CloudTokensDto>,
    pub error: Option<CloudApiErrorDetail>,
}

#[derive(Debug, Deserialize)]
struct CloudApiErrorDetail {
    pub code: Option<String>,
    pub message: Option<String>,
}

pub struct CloudAuthClient;

impl CloudAuthClient {
    pub fn build_http_client() -> reqwest::Client {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default()
    }

    /// Authenticates with the Cloud Gateway Owner Login endpoint (/v1/auth/owner/login).
    pub async fn login(
        client: &reqwest::Client,
        cloud_url: &str,
        email: &str,
        password: &str,
    ) -> Result<CloudAuthData, AppError> {
        let endpoint = format!("{}/v1/auth/owner/login", cloud_url.trim_end_matches('/'));
        let payload = serde_json::json!({
            "email": email.trim().to_lowercase(),
            "password": password
        });

        let response = client
            .post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("Failed to connect to Cloud Gateway at {}: {}", endpoint, e)))?;

        let status = response.status();
        if status.is_success() {
            let api_resp = response
                .json::<CloudAuthApiResponse>()
                .await
                .map_err(|e| AppError::Configuration(format!("Invalid response format from cloud auth: {}", e)))?;

            if let Some(data) = api_resp.data {
                Ok(data)
            } else {
                Err(AppError::Authentication)
            }
        } else if status.as_u16() == 401 || status.as_u16() == 403 {
            Err(AppError::Authentication)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Network(format!("Cloud Gateway error (HTTP {}): {}", status.as_u16(), error_text)))
        }
    }

    /// Controlled bootstrap linking of local Desktop owner & gym tenant to Cloud (/v1/auth/owner/bootstrap-desktop).
    pub async fn bootstrap_desktop(
        client: &reqwest::Client,
        cloud_url: &str,
        email: &str,
        password: &str,
        full_name: &str,
        gym_id: &Uuid,
        gym_name: &str,
        user_id: Option<Uuid>,
    ) -> Result<CloudAuthData, AppError> {
        let endpoint = format!("{}/v1/auth/owner/bootstrap-desktop", cloud_url.trim_end_matches('/'));
        let mut payload = serde_json::json!({
            "email": email.trim().to_lowercase(),
            "password": password,
            "fullName": full_name,
            "gymId": gym_id.to_string(),
            "gymName": gym_name,
        });

        if let Some(uid) = user_id {
            payload["userId"] = serde_json::Value::String(uid.to_string());
        }

        let response = client
            .post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("Failed to connect to Cloud Gateway bootstrap at {}: {}", endpoint, e)))?;

        let status = response.status();
        if status.is_success() {
            let api_resp = response
                .json::<CloudAuthApiResponse>()
                .await
                .map_err(|e| AppError::Configuration(format!("Invalid response format from cloud bootstrap: {}", e)))?;

            if let Some(data) = api_resp.data {
                Ok(data)
            } else {
                Err(AppError::Authentication)
            }
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(AppError::Network(format!("Cloud Gateway bootstrap error (HTTP {}): {}", status.as_u16(), error_text)))
        }
    }

    /// Refreshes the Cloud Access Token using the stored Cloud Refresh Token (/v1/auth/owner/refresh).
    pub async fn refresh_tokens(
        client: &reqwest::Client,
        cloud_url: &str,
        refresh_token: &str,
    ) -> Result<CloudTokensDto, AppError> {
        let endpoint = format!("{}/v1/auth/owner/refresh", cloud_url.trim_end_matches('/'));
        let payload = serde_json::json!({
            "refreshToken": refresh_token
        });

        let response = client
            .post(&endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("Failed to connect to Cloud Gateway for token refresh: {}", e)))?;

        let status = response.status();
        if status.is_success() {
            let api_resp = response
                .json::<CloudRefreshApiResponse>()
                .await
                .map_err(|e| AppError::Configuration(format!("Invalid refresh response format: {}", e)))?;

            if let Some(tokens) = api_resp.data {
                Ok(tokens)
            } else {
                Err(AppError::SessionInvalid)
            }
        } else {
            Err(AppError::SessionInvalid)
        }
    }

    /// Revokes the Cloud Refresh Token on the Cloud Gateway (/v1/auth/owner/logout).
    pub async fn logout(
        client: &reqwest::Client,
        cloud_url: &str,
        refresh_token: &str,
    ) -> Result<(), AppError> {
        let endpoint = format!("{}/v1/auth/owner/logout", cloud_url.trim_end_matches('/'));
        let payload = serde_json::json!({
            "refreshToken": refresh_token
        });

        let _ = client.post(&endpoint).json(&payload).send().await;
        Ok(())
    }
}
