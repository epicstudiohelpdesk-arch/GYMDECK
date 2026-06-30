use rusqlite::Connection;
use tracing::{info, error};

const SCHEMA_VERSION_TABLE: &str = "
    CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        description TEXT NOT NULL
    );
";

const BASE_SCHEMA_VERSION: i64 = 1;

const MIGRATIONS: &[(i64, &str, &str)] = &[
    (
        1,
        "Initial schema",
        include_str!("schema.sql"),
    ),
];

pub fn ensure_schema(conn: &Connection) -> Result<(), crate::errors::AppError> {
    conn.execute_batch(SCHEMA_VERSION_TABLE)
        .map_err(|e| crate::errors::AppError::Database(format!("Failed to create schema_version table: {}", e)))?;

    let current_version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .map_err(|e| crate::errors::AppError::Database(format!("Failed to read schema version: {}", e)))?;

    if current_version == 0 {
        apply_full_schema(conn)?;
        return Ok(());
    }

    for &(version, description, sql) in MIGRATIONS {
        if version > current_version {
            info!("Applying migration v{}: {}", version, description);
            let backup_path = format!("pre_migration_v{}.sqlite.bak", version);
            let _ = conn.execute_batch(&format!("VACUUM INTO '{}'", backup_path));
            conn.execute_batch("BEGIN IMMEDIATE")
                .map_err(|e| crate::errors::AppError::Database(format!("Migration transaction start failed: {}", e)))?;

            match conn.execute_batch(sql) {
                Ok(_) => {
                    conn.execute(
                        "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
                        rusqlite::params![version, description],
                    )
                    .map_err(|e| {
                        error!("Failed to record migration v{}: {}", version, e);
                        crate::errors::AppError::Database(format!("Failed to record migration: {}", e))
                    })?;
                    conn.execute_batch("COMMIT")
                        .map_err(|e| crate::errors::AppError::Database(format!("Migration commit failed: {}", e)))?;
                    info!("Migration v{} applied successfully", version);
                }
                Err(e) => {
                    error!("Migration v{} failed: {}. Rolling back.", version, e);
                    conn.execute_batch("ROLLBACK")
                        .map_err(|_| crate::errors::AppError::Database("Migration rollback failed".to_string()))?;
                    return Err(crate::errors::AppError::Database(format!(
                        "Migration v{} failed: {}", version, e
                    )));
                }
            }
        }
    }

    Ok(())
}

fn apply_full_schema(conn: &Connection) -> Result<(), crate::errors::AppError> {
    info!("Applying base schema (v{})", BASE_SCHEMA_VERSION);
    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| crate::errors::AppError::Database(format!("Transaction start failed: {}", e)))?;

    let schema_sql = include_str!("schema.sql");
    match conn.execute_batch(schema_sql) {
        Ok(_) => {
            conn.execute(
                "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
                rusqlite::params![BASE_SCHEMA_VERSION, "Base schema"],
            )
            .map_err(|e| {
                error!("Failed to record base schema version: {}", e);
                crate::errors::AppError::Database(format!("Failed to record schema version: {}", e))
            })?;
            conn.execute_batch("COMMIT")
                .map_err(|e| crate::errors::AppError::Database(format!("Commit failed: {}", e)))?;
            info!("Base schema applied successfully");
            Ok(())
        }
        Err(e) => {
            error!("Base schema application failed: {}. Rolling back.", e);
            conn.execute_batch("ROLLBACK")
                .map_err(|_| crate::errors::AppError::Database("Rollback failed".to_string()))?;
            Err(crate::errors::AppError::Database(format!(
                "Base schema application failed: {}", e
            )))
        }
    }
}

pub fn current_schema_version(conn: &Connection) -> Result<i64, crate::errors::AppError> {
    conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_version",
        [],
        |row| row.get(0),
    )
    .map_err(|e| crate::errors::AppError::Database(format!("Failed to read schema version: {}", e)))
}
