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
    (
        6,
        "Migrate monetary columns to INTEGER minor units (paise)",
        "CREATE TABLE IF NOT EXISTS membership_plans (id TEXT PRIMARY KEY, gym_id TEXT, plan_name TEXT, duration_days INTEGER, price REAL);
        ALTER TABLE membership_plans ADD COLUMN price_minor_units INTEGER;
        UPDATE membership_plans SET price_minor_units = CAST(ROUND(price * 100.0) AS INTEGER) WHERE price_minor_units IS NULL;

        CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, gym_id TEXT, member_id TEXT, amount REAL);
        ALTER TABLE payments ADD COLUMN amount_minor_units INTEGER;
        UPDATE payments SET amount_minor_units = CAST(ROUND(amount * 100.0) AS INTEGER) WHERE amount_minor_units IS NULL;

        CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, gym_id TEXT, item_name TEXT, unit_price REAL);
        ALTER TABLE inventory ADD COLUMN unit_price_minor_units INTEGER;
        UPDATE inventory SET unit_price_minor_units = CAST(ROUND(unit_price * 100.0) AS INTEGER) WHERE unit_price IS NOT NULL AND unit_price_minor_units IS NULL;",
    ),
];

fn validate_legacy_monetary_records(conn: &Connection) -> Result<(), crate::errors::AppError> {
    // 1. Validate membership_plans
    if let Ok(mut plan_stmt) = conn.prepare("SELECT id, plan_name, price FROM membership_plans") {
        let plan_rows = plan_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, f64>(2)?))
        }).map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        for row in plan_rows {
            let (id, name, price) = row.map_err(|e| crate::errors::AppError::Database(e.to_string()))?;
            if let Err(e) = crate::utils::money::legacy_real_to_minor_units(price) {
                return Err(crate::errors::AppError::Database(format!(
                    "Migration v6 aborted: MembershipPlan id={} name='{}' has invalid/imprecise price {}: {}",
                    id, name, price, e
                )));
            }
        }
    }

    // 2. Validate payments
    if let Ok(mut pay_stmt) = conn.prepare("SELECT id, amount FROM payments") {
        let pay_rows = pay_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        }).map_err(|e| crate::errors::AppError::Database(e.to_string()))?;

        for row in pay_rows {
            let (id, amount) = row.map_err(|e| crate::errors::AppError::Database(e.to_string()))?;
            if let Err(e) = crate::utils::money::legacy_real_to_minor_units(amount) {
                return Err(crate::errors::AppError::Database(format!(
                    "Migration v6 aborted: Payment id={} has invalid/imprecise amount {}: {}",
                    id, amount, e
                )));
            }
        }
    }

    Ok(())
}

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

            if version == 6 {
                validate_legacy_monetary_records(conn)?;
            }

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
