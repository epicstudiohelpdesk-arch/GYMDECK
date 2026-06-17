use std::time::{Instant, Duration};
use tokio::sync::Mutex;
use std::collections::HashMap;

/// Enterprise Token Bucket Rate Limiter
/// Protects expensive endpoints (like Argon2id login) from IPC flooding and brute-force amplification.
pub struct RateLimiter {
    capacity: usize,
    refill_rate: Duration,
    buckets: Mutex<HashMap<String, (usize, Instant)>>,
}

impl RateLimiter {
    pub fn new(capacity: usize, refill_rate: Duration) -> Self {
        Self {
            capacity,
            refill_rate,
            buckets: Mutex::new(HashMap::new()),
        }
    }

    /// Checks if a request is allowed for a given identifier (e.g., email or IP).
    /// Consumes 1 token if allowed.
    pub async fn check_and_consume(&self, identifier: &str) -> Result<(), &'static str> {
        let mut buckets = self.buckets.lock().await;
        let now = Instant::now();

        let (tokens, last_refill) = buckets.entry(identifier.to_string()).or_insert((self.capacity, now));

        // Refill tokens based on elapsed time
        let elapsed = now.duration_since(*last_refill);
        let tokens_to_add = (elapsed.as_millis() / self.refill_rate.as_millis()) as usize;

        if tokens_to_add > 0 {
            *tokens = std::cmp::min(self.capacity, *tokens + tokens_to_add);
            *last_refill = now;
        }

        if *tokens > 0 {
            *tokens -= 1;
            Ok(())
        } else {
            Err("Rate limit exceeded. Please try again later.")
        }
    }

    /// Explicitly penalize an identifier (e.g., on a failed login) by draining tokens faster.
    pub async fn penalize(&self, identifier: &str, penalty: usize) {
        let mut buckets = self.buckets.lock().await;
        if let Some((tokens, _)) = buckets.get_mut(identifier) {
            *tokens = tokens.saturating_sub(penalty);
        }
    }
}

/// Global configuration for Auth Rate Limiter
/// - 5 attempts max burst
/// - 1 attempt refilled every 5 seconds
pub fn default_auth_limiter() -> RateLimiter {
    RateLimiter::new(5, Duration::from_secs(5))
}
