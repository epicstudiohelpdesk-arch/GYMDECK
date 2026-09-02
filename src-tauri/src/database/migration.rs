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
    (
        2,
        "Add composite index on gym_members(gym_id, deleted_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_members_gym_deleted ON gym_members(gym_id, deleted_at DESC);",
    ),
    (
        3,
        "Add transactional sync outbox, state, and inbox tables",
        "CREATE TABLE IF NOT EXISTS sync_outbox (
            id TEXT PRIMARY KEY,
            event_id TEXT UNIQUE NOT NULL,
            gym_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            last_attempt_at DATETIME,
            next_retry_at DATETIME,
            lease_expires_at DATETIME,
            worker_id TEXT,
            status TEXT NOT NULL DEFAULT 'PENDING',
            error_code TEXT,
            error_message TEXT,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(gym_id, status, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_claiming ON sync_outbox(gym_id, status, next_retry_at, lease_expires_at, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_event ON sync_outbox(event_id);
        CREATE TABLE IF NOT EXISTS sync_state (
            key TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sync_inbox (
            server_sequence INTEGER PRIMARY KEY,
            gym_id TEXT NOT NULL,
            event_id TEXT UNIQUE NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );",
    ),
    (
        4,
        "Add lease and exponential backoff columns to sync_outbox",
        "ALTER TABLE sync_outbox ADD COLUMN next_retry_at DATETIME;
        ALTER TABLE sync_outbox ADD COLUMN lease_expires_at DATETIME;
        ALTER TABLE sync_outbox ADD COLUMN worker_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_sync_outbox_claiming ON sync_outbox(gym_id, status, next_retry_at, lease_expires_at, created_at ASC);",
    ),
    (
        5,
        "Enforce multi-tenant composite primary keys on sync_state and sync_inbox",
        "CREATE TABLE IF NOT EXISTS sync_state_v5 (
            key TEXT NOT NULL,
            gym_id TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (key, gym_id)
        );
        INSERT OR IGNORE INTO sync_state_v5 (key, gym_id, value, updated_at) SELECT key, gym_id, value, updated_at FROM sync_state;
        DROP TABLE sync_state;
        ALTER TABLE sync_state_v5 RENAME TO sync_state;

        CREATE TABLE IF NOT EXISTS sync_inbox_v5 (
            server_sequence INTEGER NOT NULL,
            gym_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (gym_id, server_sequence),
            UNIQUE (gym_id, event_id)
        );
        INSERT OR IGNORE INTO sync_inbox_v5 (server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload, applied_at) SELECT server_sequence, gym_id, event_id, entity_type, entity_id, operation, payload, applied_at FROM sync_inbox;
        DROP TABLE sync_inbox;
        ALTER TABLE sync_inbox_v5 RENAME TO sync_inbox;",
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
                    let err_msg = e.to_string();
                    if err_msg.contains("duplicate column name") {
                        info!("Migration v{} columns already present, recording version", version);
                        let _ = conn.execute(
                            "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
                            rusqlite::params![version, description],
                        );
                        let _ = conn.execute_batch("COMMIT");
                    } else {
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
    }

    Ok(())
}

fn apply_full_schema(conn: &Connection) -> Result<(), crate::errors::AppError> {
    let latest_version = MIGRATIONS.iter().map(|(v, _, _)| *v).max().unwrap_or(BASE_SCHEMA_VERSION);
    info!("Applying base schema (latest v{})", latest_version);
    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| crate::errors::AppError::Database(format!("Transaction start failed: {}", e)))?;

    let schema_sql = include_str!("schema.sql");
    match conn.execute_batch(schema_sql) {
        Ok(_) => {
            conn.execute(
                "INSERT INTO schema_version (version, description) VALUES (?1, ?2)",
                rusqlite::params![latest_version, "Base schema with latest migrations"],
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
