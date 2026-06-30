use rusqlite::Connection;
use r2d2_sqlite::SqliteConnectionManager;
use r2d2::Pool;
use tracing::{info, warn, error};
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::sleep;

pub type DbPool = Pool<SqliteConnectionManager>;

pub struct DatabaseManager {
    pub pool: DbPool,
    pub db_path: PathBuf,
}

impl DatabaseManager {
    pub fn new(db_path: PathBuf, mek_key: &str) -> Result<Self, crate::errors::AppError> {
        let encryption_key = mek_key.to_string();

        if db_path.exists() {
            match Self::try_initialize(db_path.clone(), &encryption_key) {
                Ok(manager) => Ok(manager),
                Err(e) => {
                    error!(
                        "CRITICAL: Database decryption failed for existing database at {:?}. \
                         This indicates an encryption key mismatch. The database will NOT be deleted. \
                         To recover, set the correct GYMDECK_DB_KEY or manually delete the database file: {}",
                        db_path, e
                    );
                    Err(crate::errors::AppError::KeyMismatch(format!(
                        "Database at {:?} cannot be decrypted with the provided key. \
                         The database has NOT been modified. Set the correct GYMDECK_DB_KEY environment variable, \
                         or manually delete the file to start fresh.",
                        db_path
                    )))
                }
            }
        } else {
            Self::try_initialize(db_path, &encryption_key)
        }
    }

    fn try_initialize(db_path: PathBuf, encryption_key: &str) -> Result<Self, crate::errors::AppError> {
        let key = encryption_key.to_string();
        let manager = SqliteConnectionManager::file(db_path.clone())
            .with_init(move |conn: &mut Connection| {
                let pragma_query = format!("PRAGMA key = '{}';", key);
                conn.execute_batch(&pragma_query)?;

                conn.execute_batch(
                    "
                    PRAGMA journal_mode = WAL;
                    PRAGMA synchronous = NORMAL;
                    PRAGMA foreign_keys = ON;
                    PRAGMA temp_store = MEMORY;
                    PRAGMA secure_delete = ON;
                    PRAGMA cache_size = -64000;
                    PRAGMA wal_autocheckpoint = 1000;
                    PRAGMA auto_vacuum = INCREMENTAL;
                    "
                )?;
                Ok(())
            });

        let pool = r2d2::Pool::builder()
            .max_size(15)
            .build(manager)
            .map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        let conn = pool.get().map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        Self::verify_integrity(&conn)?;

        crate::database::migration::ensure_schema(&conn)?;

        let migrations = [
            ("member_code", "TEXT NOT NULL DEFAULT 'GD-TEMP'"),
            ("alternate_phone", "TEXT"),
            ("email", "TEXT"),
            ("gender", "TEXT"),
            ("dob", "DATE"),
            ("address", "TEXT"),
            ("height", "TEXT"),
            ("weight", "TEXT"),
            ("blood_group", "TEXT"),
            ("membership_plan_id", "TEXT"),
            ("membership_status", "TEXT NOT NULL DEFAULT 'INACTIVE'"),
            ("joined_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"),
            ("expires_at", "DATETIME"),
            ("profile_photo_path", "TEXT"),
            ("notes", "TEXT"),
            ("created_by_user_id", "TEXT NOT NULL DEFAULT 'SYSTEM'"),
            ("updated_by_user_id", "TEXT NOT NULL DEFAULT 'SYSTEM'"),
            ("deleted_at", "DATETIME"),
            ("deleted_by_user_id", "TEXT"),
        ];

        for (col, col_def) in migrations {
            let query = format!("ALTER TABLE gym_members ADD COLUMN {} {}", col, col_def);
            if let Err(e) = conn.execute(&query, []) {
                let err_msg = e.to_string();
                if !err_msg.contains("duplicate column name") {
                    error!("CRITICAL MIGRATION FAILURE for column {}: {}", col, err_msg);
                    return Err(crate::errors::AppError::Database(format!("Failed to add column {}: {}", col, err_msg)));
                }
            } else {
                info!("Successfully added missing column: {}", col);
            }
        }

        let mut stmt = conn.prepare("PRAGMA table_info(gym_members)").map_err(|e| crate::errors::AppError::Database(e.to_string()))?;
        let columns: Vec<String> = stmt.query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| crate::errors::AppError::Database(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        if !columns.contains(&"joined_at".to_string()) {
            error!("SCHEMA CRITICAL: 'joined_at' is still missing after migration! Columns found: {:?}", columns);
            return Err(crate::errors::AppError::Database(format!("Schema integrity failure: 'joined_at' missing. Found: {:?}", columns)));
        }

        Self::spawn_operational_health_monitor(pool.clone(), db_path.clone());

        info!("DatabaseManager successfully initialized.");

        Ok(DatabaseManager { pool, db_path })
    }

    fn spawn_operational_health_monitor(pool: DbPool, db_path: PathBuf) {
        tauri::async_runtime::spawn(async move {
            info!("Enterprise Operational Health Monitor started.");
            loop {
                sleep(Duration::from_secs(60)).await;

                if let Ok(conn) = pool.get() {
                    match conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);") {
                        Ok(_) => tracing::debug!("Routine WAL checkpoint successful."),
                        Err(e) => warn!("WAL checkpoint skipped/failed: {}", e),
                    }

                    let _ = conn.execute_batch("PRAGMA incremental_vacuum(50);");

                    crate::database::maintenance::DbMaintenanceEngine::monitor_wal_growth(&db_path, &conn);
                }
            }
        });
    }

    fn verify_integrity(conn: &Connection) -> Result<(), crate::errors::AppError> {
        let mut stmt = conn.prepare("PRAGMA quick_check;")
            .map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        let result: String = stmt.query_row([], |row| row.get(0))
            .map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        if result != "ok" {
            error!("Database integrity check failed: {}", result);
            return Err(crate::errors::AppError::DatabaseCorruption);
        }

        Ok(())
    }

    pub fn checkpoint_wal(&self) {
        if let Ok(conn) = self.pool.get() {
            if let Err(e) = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);") {
                warn!("WAL checkpoint on shutdown failed: {}", e);
            } else {
                info!("WAL checkpoint completed successfully.");
            }
        }
    }
}

impl Drop for DatabaseManager {
    fn drop(&mut self) {
        info!("DatabaseManager shutting down. Running WAL checkpoint...");
        self.checkpoint_wal();
    }
}
