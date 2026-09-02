use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use serde::{Serialize, Deserialize};
use crate::repositories::sync_repo::{SyncRepository, RemoteChangeRecord};
use crate::errors::AppError;

#[derive(Debug, Serialize, Deserialize)]
struct PushPayload {
    #[serde(rename = "deviceId")]
    pub device_id: String,
    pub events: Vec<PushEventItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PushEventItem {
    #[serde(rename = "eventId")]
    pub event_id: String,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    #[serde(rename = "entityId")]
    pub entity_id: String,
    pub operation: String,
    pub payload: serde_json::Value,
    #[serde(rename = "clientTimestamp")]
    pub client_timestamp: String,
}

#[derive(Debug, Deserialize)]
struct PushApiResponse {
    pub results: Vec<PushApiResultItem>,
    #[serde(rename = "latestServerSequence")]
    pub latest_server_sequence: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct PushApiResultItem {
    #[serde(rename = "eventId")]
    pub event_id: String,
    pub status: String,
    #[serde(rename = "serverSequence")]
    pub server_sequence: Option<i64>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PullApiResponse {
    pub cursor: i64,
    #[serde(rename = "latestServerSequence")]
    pub latest_server_sequence: i64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
    pub changes: Vec<PullChangeItem>,
}

#[derive(Debug, Deserialize)]
struct PullChangeItem {
    #[serde(rename = "serverSequence")]
    pub server_sequence: i64,
    #[serde(rename = "eventId")]
    pub event_id: String,
    #[serde(rename = "entityType")]
    pub entity_type: String,
    #[serde(rename = "entityId")]
    pub entity_id: String,
    pub operation: String,
    pub payload: serde_json::Value,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

pub struct SyncWorker {
    pub worker_id: String,
    pub db_pool: Pool<SqliteConnectionManager>,
    pub cloud_url: String,
    pub is_running: Arc<AtomicBool>,
    pub client: reqwest::Client,
}

impl SyncWorker {
    pub fn new(
        db_pool: Pool<SqliteConnectionManager>,
        cloud_url: Option<String>,
    ) -> Self {
        let worker_id = format!("desktop-node-{}", Uuid::new_v4().to_string()[..8].to_string());
        let url = cloud_url.unwrap_or_else(|| "http://localhost:8080".to_string());
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        Self {
            worker_id,
            db_pool,
            cloud_url: url,
            is_running: Arc::new(AtomicBool::new(false)),
            client,
        }
    }

    /// Spawns the autonomous background sync worker loop in Tokio runtime with active cloud session.
    pub fn start_with_session(
        &self,
        gym_id: Uuid,
        session_mgr: Arc<crate::sessions::cloud_session::CloudSessionManager>,
    ) -> Arc<AtomicBool> {
        let running_flag = self.is_running.clone();
        running_flag.store(true, Ordering::SeqCst);

        let pool = self.db_pool.clone();
        let worker_id = self.worker_id.clone();
        let cloud_url = self.cloud_url.clone();
        let client = self.client.clone();
        let is_running = running_flag.clone();

        tokio::spawn(async move {
            tracing::info!("[SyncWorker] Autonomous background sync daemon started: worker_id={}, gym_id={}", worker_id, gym_id);

            while is_running.load(Ordering::SeqCst) {
                // 1. Get or refresh access token
                let mut token = session_mgr.get_access_token().await.unwrap_or_default();
                if token.is_empty() {
                    if let Some(refresh_tok) = session_mgr.get_stored_refresh_token() {
                        if let Ok(new_tokens) = crate::auth::cloud_auth::CloudAuthClient::refresh_tokens(
                            &client,
                            &cloud_url,
                            &refresh_tok,
                        ).await {
                            session_mgr.set_access_token(new_tokens.access_token.clone()).await;
                            token = new_tokens.access_token;
                        } else {
                            session_mgr.set_state(crate::sessions::cloud_session::EnrollmentState::AuthExpired).await;
                        }
                    }
                }

                if !token.is_empty() {
                    match Self::execute_cycle(
                        &pool,
                        &client,
                        &cloud_url,
                        &worker_id,
                        &gym_id,
                        &token,
                    ).await {
                        Ok(_) => {
                            session_mgr.set_state(crate::sessions::cloud_session::EnrollmentState::Ready).await;
                        }
                        Err(AppError::Unauthorized) => {
                            // 401 detected: Force token refresh on next cycle
                            tracing::warn!("[SyncWorker] 401 Unauthorized received. Triggering token refresh.");
                            session_mgr.set_access_token("".into()).await;
                        }
                        Err(e) => {
                            tracing::debug!("[SyncWorker] Sync cycle note (normal if offline): {}", e);
                        }
                    }
                }

                // Sleep 5 seconds interval with fast cancellation responsiveness (50 x 100ms)
                for _ in 0..50 {
                    if !is_running.load(Ordering::SeqCst) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }

            tracing::info!("[SyncWorker] Background sync daemon stopped gracefully.");
        });

        running_flag
    }

    /// Spawns the autonomous background sync worker loop in Tokio runtime with static token.
    pub fn start(&self, gym_id: Uuid, auth_token: Option<String>) -> Arc<AtomicBool> {
        let running_flag = self.is_running.clone();
        running_flag.store(true, Ordering::SeqCst);

        let pool = self.db_pool.clone();
        let worker_id = self.worker_id.clone();
        let cloud_url = self.cloud_url.clone();
        let client = self.client.clone();
        let is_running = running_flag.clone();

        tokio::spawn(async move {
            tracing::info!("[SyncWorker] Autonomous background sync daemon started: worker_id={}", worker_id);

            while is_running.load(Ordering::SeqCst) {
                let token = auth_token.clone().unwrap_or_default();
                if let Err(e) = Self::execute_cycle(
                    &pool,
                    &client,
                    &cloud_url,
                    &worker_id,
                    &gym_id,
                    &token,
                ).await {
                    tracing::debug!("[SyncWorker] Sync cycle note (normal if offline): {}", e);
                }

                for _ in 0..50 {
                    if !is_running.load(Ordering::SeqCst) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }

            tracing::info!("[SyncWorker] Background sync daemon stopped gracefully.");
        });

        running_flag
    }

    /// Stops the background sync loop.
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Performs one atomic push and pull synchronization pass.
    pub async fn execute_cycle(
        pool: &Pool<SqliteConnectionManager>,
        client: &reqwest::Client,
        cloud_url: &str,
        worker_id: &str,
        gym_id: &Uuid,
        auth_token: &str,
    ) -> Result<(), AppError> {
        let mut conn = pool.get().map_err(|e| AppError::Database(e.to_string()))?;

        // =========================================================================
        // 1. PUSH PHASE: Claim pending outbox events and transmit to Cloud
        // =========================================================================
        let claimed_events = SyncRepository::claim_pending_events(
            &mut conn,
            gym_id,
            worker_id,
            50, // Batch limit
            60, // 60-second lease
        )?;

        if !claimed_events.is_empty() {
            let push_items: Vec<PushEventItem> = claimed_events
                .iter()
                .map(|e| {
                    let parsed_payload = serde_json::from_str(&e.payload)
                        .unwrap_or(serde_json::json!({}));
                    PushEventItem {
                        event_id: e.event_id.to_string(),
                        entity_type: e.entity_type.clone(),
                        entity_id: e.entity_id.to_string(),
                        operation: e.operation.clone(),
                        payload: parsed_payload,
                        client_timestamp: e.created_at.to_rfc3339(),
                    }
                })
                .collect();

            let payload = PushPayload {
                device_id: worker_id.to_string(),
                events: push_items,
            };

            let push_url = format!("{}/v1/sync/push", cloud_url);
            let response_result = client
                .post(&push_url)
                .bearer_auth(auth_token)
                .json(&payload)
                .send()
                .await;

            match response_result {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(push_resp) = resp.json::<PushApiResponse>().await {
                        // Store cloud sequence watermark if provided
                        if let Some(latest_seq) = push_resp.latest_server_sequence {
                            let _ = SyncRepository::set_sync_state(
                                &conn,
                                gym_id,
                                "cloud_latest_server_sequence",
                                &latest_seq.to_string(),
                            );
                        }

                        for item in push_resp.results {
                            if let Ok(event_id) = Uuid::parse_str(&item.event_id) {
                                if item.status == "APPLIED" || item.status == "ALREADY_APPLIED" {
                                    // Pre-record inbox acknowledgment if server assigned a sequence
                                    if let Some(srv_seq) = item.server_sequence {
                                        let _ = SyncRepository::record_inbox_ack(&conn, gym_id, srv_seq, &event_id);
                                    }
                                    let _ = SyncRepository::mark_event_synced(&conn, &event_id);
                                } else if item.status == "FAILED" {
                                    let err_msg = item.error.unwrap_or_else(|| "Rejected by cloud".into());
                                    let _ = SyncRepository::mark_event_failed(
                                        &conn,
                                        &event_id,
                                        "CLOUD_VALIDATION_ERROR",
                                        &err_msg,
                                        true, // Permanent error
                                    );
                                }
                            }
                        }
                    }
                }
                Ok(resp) => {
                    let status_code = resp.status().as_u16();
                    let is_perm = status_code == 400 || status_code == 422;
                    for event in claimed_events {
                        let _ = SyncRepository::mark_event_failed(
                            &conn,
                            &event.event_id,
                            &format!("HTTP_{}", status_code),
                            "Cloud API rejected push request",
                            is_perm,
                        );
                    }
                }
                Err(err) => {
                    // Network / timeout / offline: schedule exponential backoff with jitter
                    for event in claimed_events {
                        let _ = SyncRepository::mark_event_failed(
                            &conn,
                            &event.event_id,
                            "NETWORK_DISCONNECTED",
                            &err.to_string(),
                            false, // Transient failure -> retry with backoff
                        );
                    }
                }
            }
        }

        // =========================================================================
        // 2. PULL PHASE: Query incremental server sequence changes in pages
        // =========================================================================
        let mut pull_page_count = 0;
        const MAX_PULL_PAGES_PER_CYCLE: usize = 50;

        loop {
            let current_cursor = SyncRepository::get_cursor(&conn, gym_id)?;
            let pull_url = format!(
                "{}/v1/sync/pull?cursor={}&limit=100&deviceId={}",
                cloud_url, current_cursor, worker_id
            );

            let pull_result = client
                .get(&pull_url)
                .bearer_auth(auth_token)
                .send()
                .await;

            match pull_result {
                Ok(resp) if resp.status().is_success() => {
                    if let Ok(pull_resp) = resp.json::<PullApiResponse>().await {
                        // Update authoritative cloud watermark
                        let _ = SyncRepository::set_sync_state(
                            &conn,
                            gym_id,
                            "cloud_latest_server_sequence",
                            &pull_resp.latest_server_sequence.to_string(),
                        );

                        let has_more = pull_resp.has_more;
                        let batch_size = pull_resp.changes.len();

                        if !pull_resp.changes.is_empty() {
                            let remote_changes: Vec<RemoteChangeRecord> = pull_resp
                                .changes
                                .into_iter()
                                .map(|c| RemoteChangeRecord {
                                    server_sequence: c.server_sequence,
                                    event_id: Uuid::parse_str(&c.event_id).unwrap_or_default(),
                                    entity_type: c.entity_type,
                                    entity_id: Uuid::parse_str(&c.entity_id).unwrap_or_default(),
                                    operation: c.operation,
                                    payload: c.payload,
                                    created_at: c.created_at,
                                })
                                .collect();

                            // Atomically apply changes into SQLite and advance cursor
                            SyncRepository::apply_pull_batch_tx(
                                &mut conn,
                                gym_id,
                                &remote_changes,
                                pull_resp.cursor,
                            )?;
                        }

                        pull_page_count += 1;
                        if !has_more || batch_size == 0 || pull_page_count >= MAX_PULL_PAGES_PER_CYCLE {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                _ => break,
            }
        }

        Ok(())
    }
}
