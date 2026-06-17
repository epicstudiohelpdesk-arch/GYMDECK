use sha2::{Sha256, Digest};
use machine_uid;
use sysinfo::System;

/// Evaluates probabilistic trust thresholds and generates device fingerprints.
pub struct TrustEngine;

#[derive(Debug, Clone)]
pub enum TrustLevel {
    Trusted,
    Suspicious,
    Untrusted,
}

impl TrustEngine {
    /// Generates a cryptographic device fingerprint using hardware invariants.
    pub fn generate_device_fingerprint() -> String {
        let mut hasher = Sha256::new();
        
        // 1. Primary Hardware UUID (Stable)
        let hw_uid = machine_uid::get().unwrap_or_else(|_| "UNKNOWN_HW_UID".to_string());
        hasher.update(hw_uid.as_bytes());

        // 2. OS Invariants
        let _sys = System::new_all();
        
        if let Some(os_name) = System::name() {
            hasher.update(os_name.as_bytes());
        }
        if let Some(host_name) = System::host_name() {
            hasher.update(host_name.as_bytes());
        }

        // We explicitly omit highly volatile metrics (RAM usage, network interfaces) 
        // to prevent false-positive trust degradation.

        hex::encode(hasher.finalize())
    }

    /// Evaluates probabilistic trust based on stored fingerprint vs current fingerprint.
    /// In a real system, this compares individual weighted components.
    pub fn evaluate_current_device(stored_fingerprint: &str) -> (String, i32) {
        let current_fingerprint = Self::generate_device_fingerprint();
        
        let trust_score = if current_fingerprint == stored_fingerprint {
            100 // Exact match
        } else {
            // Drift detected (e.g., OS update or hostname change). 
            // In a full implementation, we'd calculate Levenshtein distance or 
            // component-wise match to yield 50-99. Here we simulate a suspicious drift.
            75 
        };
        
        (current_fingerprint, trust_score)
    }

    /// Maps a raw score to an actionable TrustLevel.
    pub fn classify_trust(score: i32) -> TrustLevel {
        match score {
            85..=100 => TrustLevel::Trusted,
            50..=84 => TrustLevel::Suspicious,
            _ => TrustLevel::Untrusted,
        }
    }
}
