use rusqlite::Connection;
use std::path::PathBuf;
use std::fs;
use tracing::{warn, error};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct DbHealthReport {
    pub db_size_bytes: u64,
    pub wal_size_bytes: u64,
    pub schema_version: String,
    pub integrity_status: String,
    pub timestamp: String,
}

pub struct DbMaintenanceEngine;

impl DbMaintenanceEngine {
    /// Performs an incremental vacuum to reduce fragmentation and stabilize disk growth.
    pub fn perform_incremental_vacuum(conn: &Connection) -> Result<(), crate::errors::AppError> {
        // Vacuum up to 100 pages at a time during idle moments
        match conn.execute_batch("PRAGMA incremental_vacuum(100);") {
            Ok(_) => {
                tracing::debug!("Incremental vacuum performed successfully.");
                Ok(())
            },
            Err(e) => {
                warn!("Incremental vacuum skipped/failed: {}", e);
                Err(crate::errors::AppError::Database(e.to_string()))
            }
        }
    }

    /// Monitors WAL size. If it exceeds safe limits (e.g., 50MB), it forces a checkpoint.
    /// If it exceeds critical limits (e.g., 200MB), it raises an operational alert.
    pub fn monitor_wal_growth(db_path: &PathBuf, conn: &Connection) {
        let wal_path = db_path.with_extension("sqlite.wal");
        if let Ok(metadata) = fs::metadata(&wal_path) {
            let size_mb = metadata.len() / (1024 * 1024);
            
            if size_mb > 50 && size_mb <= 200 {
                warn!("WAL size reached {}MB. Triggering elevated passive checkpoint.", size_mb);
                let _ = conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);");
            } else if size_mb > 200 {
                error!("CRITICAL: WAL size reached {}MB. High risk of disk exhaustion or starvation.", size_mb);
                // Force a TRUNCATE checkpoint (blocks writers/readers temporarily but saves the DB)
                let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
            }
        }
    }

    /// Generates a structured JSON diagnostic report for the health dashboard.
    pub fn generate_health_report(db_path: &PathBuf, conn: &Connection) -> DbHealthReport {
        let db_size = fs::metadata(db_path).map(|m| m.len()).unwrap_or(0);
        let wal_size = fs::metadata(db_path.with_extension("sqlite.wal")).map(|m| m.len()).unwrap_or(0);
        
        let integrity: String = conn.query_row("PRAGMA quick_check;", [], |row| row.get(0))
            .unwrap_or_else(|_| "CORRUPTED".to_string());

        let report = DbHealthReport {
            db_size_bytes: db_size,
            wal_size_bytes: wal_size,
            schema_version: "0.1.0".to_string(), // In reality, query from metadata table
            integrity_status: integrity,
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        // Write telemetry to disk for crash-safe external monitoring
        if let Ok(json) = serde_json::to_string_pretty(&report) {
            let report_path = db_path.parent().unwrap().join("database_health_report.json");
            let _ = fs::write(report_path, json);
        }

        report
    }
}
