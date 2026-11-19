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
    (
        7,
        "Add local CCTV cache tables for offline gate pass and camera monitoring",
        "CREATE TABLE IF NOT EXISTS local_cctv_gateways (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            host_local_ip TEXT,
            last_heartbeat_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS local_cctv_cameras (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            recorder_id TEXT,
            channel_number INTEGER NOT NULL,
            name TEXT NOT NULL,
            location_zone TEXT NOT NULL DEFAULT 'GENERAL',
            ip_address TEXT,
            codec TEXT NOT NULL DEFAULT 'H264',
            resolution_main TEXT,
            resolution_sub TEXT,
            fps INTEGER DEFAULT 15,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'IDLE',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_local_cctv_cameras_gym ON local_cctv_cameras(gym_id);",
    ),
    (
        8,
        "Add per-gym local payment accounts for Banking & Settlement persistence",
        "CREATE TABLE IF NOT EXISTS gym_payment_accounts (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            method TEXT NOT NULL CHECK (method IN ('UPI','BANK_TRANSFER')),
            label TEXT,
            status TEXT NOT NULL DEFAULT 'UNVERIFIED',
            is_active INTEGER NOT NULL DEFAULT 1,
            is_primary INTEGER NOT NULL DEFAULT 0,
            beneficiary_name TEXT NOT NULL,
            upi_vpa TEXT,
            bank_name TEXT,
            account_type TEXT,
            account_number TEXT,
            account_number_last4 TEXT,
            ifsc_code TEXT,
            branch_name TEXT,
            branch_city TEXT,
            qr_image_url TEXT,
            instructions TEXT,
            created_by TEXT,
            updated_by TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_gym_payment_accounts_gym ON gym_payment_accounts(gym_id, is_active);",
    ),
    (
        9,
        "Add per-gym permanent attendance QR pass",
        "CREATE TABLE IF NOT EXISTS gym_checkin_qr (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL UNIQUE,
            checkin_code TEXT NOT NULL UNIQUE,
            qr_token TEXT NOT NULL UNIQUE,
            qr_payload TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_gym_checkin_qr_gym ON gym_checkin_qr(gym_id);
        CREATE INDEX IF NOT EXISTS idx_gym_checkin_qr_code ON gym_checkin_qr(checkin_code);",
    ),
    (
        10,
        "Add per-gym locked communication settings row",
        "CREATE TABLE IF NOT EXISTS gym_communication_settings (
            gym_id TEXT PRIMARY KEY,
            primary_phone TEXT,
            whatsapp_number TEXT,
            official_email TEXT,
            mobile_for_members INTEGER NOT NULL DEFAULT 1,
            mobile_sms_allowed INTEGER NOT NULL DEFAULT 1,
            mobile_calls_allowed INTEGER NOT NULL DEFAULT 1,
            mobile_promos_allowed INTEGER NOT NULL DEFAULT 0,
            whatsapp_for_members INTEGER NOT NULL DEFAULT 1,
            whatsapp_receipts_allowed INTEGER NOT NULL DEFAULT 1,
            whatsapp_reminders_allowed INTEGER NOT NULL DEFAULT 1,
            whatsapp_support_allowed INTEGER NOT NULL DEFAULT 1,
            whatsapp_promos_allowed INTEGER NOT NULL DEFAULT 0,
            email_for_members INTEGER NOT NULL DEFAULT 1,
            email_invoices_allowed INTEGER NOT NULL DEFAULT 1,
            email_alerts_allowed INTEGER NOT NULL DEFAULT 1,
            email_newsletter_allowed INTEGER NOT NULL DEFAULT 0,
            quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
            quiet_hours_end TEXT NOT NULL DEFAULT '06:00',
            created_by TEXT,
            updated_by TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );",
    ),
    (
        11,
        "Add per-gym locked gym profile details (General tab + logo/cover images)",
        "CREATE TABLE IF NOT EXISTS gym_profile_details (
            gym_id TEXT PRIMARY KEY,
            display_name TEXT,
            tagline TEXT,
            description TEXT,
            founded_year TEXT,
            business_type TEXT,
            website TEXT,
            address_line TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            opening_hours TEXT,
            closing_hours TEXT,
            weekend_opening TEXT,
            weekend_closing TEXT,
            slot_duration_minutes TEXT,
            auto_holiday_closure INTEGER NOT NULL DEFAULT 1,
            qr_checkin_enabled INTEGER NOT NULL DEFAULT 1,
            qr_turnstile_relay INTEGER NOT NULL DEFAULT 1,
            qr_audible_chime INTEGER NOT NULL DEFAULT 1,
            is_publicly_active INTEGER NOT NULL DEFAULT 1,
            subdomain TEXT,
            custom_domain TEXT,
            logo_data_url TEXT,
            cover_data_url TEXT,
            branches_json TEXT NOT NULL DEFAULT '[]',
            created_by TEXT,
            updated_by TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );",
    ),
    (
        12,
        "Add per-gym broadcast send queue for assisted WhatsApp delivery",
        "CREATE TABLE IF NOT EXISTS gym_broadcasts (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            channel TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP','SMS','EMAIL','PUSH')),
            message_kind TEXT NOT NULL DEFAULT 'CUSTOM',
            title TEXT,
            body TEXT NOT NULL,
            audience_label TEXT,
            recipient_count INTEGER NOT NULL DEFAULT 0,
            sent_count INTEGER NOT NULL DEFAULT 0,
            failed_count INTEGER NOT NULL DEFAULT 0,
            skipped_count INTEGER NOT NULL DEFAULT 0,
            queued_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','IN_PROGRESS','COMPLETED','CANCELLED')),
            created_by TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_gym_broadcasts_gym ON gym_broadcasts(gym_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS gym_broadcast_recipients (
            id TEXT PRIMARY KEY,
            broadcast_id TEXT NOT NULL,
            gym_id TEXT NOT NULL,
            member_id TEXT,
            member_code TEXT,
            member_name TEXT,
            phone_masked TEXT,
            rendered_body TEXT NOT NULL DEFAULT '',
            send_url TEXT,
            status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','SKIPPED')),
            skip_reason TEXT,
            sent_at DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(broadcast_id) REFERENCES gym_broadcasts(id) ON DELETE CASCADE,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_gym_broadcast_recipients_broadcast ON gym_broadcast_recipients(broadcast_id, status);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_broadcast_recipients_member ON gym_broadcast_recipients(broadcast_id, member_id);
        CREATE INDEX IF NOT EXISTS idx_gym_broadcast_recipients_gym ON gym_broadcast_recipients(gym_id);",
    ),
    (
        13,
        "Add production inventory system (categories, suppliers, products, images, variants, batches, stock and movements ledger)",
        "CREATE TABLE IF NOT EXISTS inventory_categories (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            image_reference TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            UNIQUE(gym_id, name)
        );
        CREATE INDEX IF NOT EXISTS idx_inv_categories_gym ON inventory_categories(gym_id, is_active);

        CREATE TABLE IF NOT EXISTS inventory_suppliers (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            gstin TEXT,
            notes TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_inv_suppliers_gym ON inventory_suppliers(gym_id, is_active);

        CREATE TABLE IF NOT EXISTS inventory_products (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            category_id TEXT,
            name TEXT NOT NULL,
            brand TEXT,
            sku TEXT,
            barcode TEXT,
            short_description TEXT,
            description TEXT,
            product_type TEXT NOT NULL DEFAULT 'PHYSICAL',
            unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
            cost_price_minor_units INTEGER,
            selling_price_minor_units INTEGER NOT NULL DEFAULT 0,
            mrp_minor_units INTEGER,
            discount_price_minor_units INTEGER,
            tax_configuration TEXT DEFAULT 'EXEMPT',
            tax_rate REAL DEFAULT 0.0,
            has_variants INTEGER NOT NULL DEFAULT 0,
            batch_tracking_enabled INTEGER NOT NULL DEFAULT 0,
            expiry_tracking_enabled INTEGER NOT NULL DEFAULT 0,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DRAFT','ARCHIVED')),
            store_visibility TEXT NOT NULL DEFAULT 'HIDDEN' CHECK (store_visibility IN ('VISIBLE','HIDDEN')),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            archived_at DATETIME,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_inv_products_gym ON inventory_products(gym_id, status);
        CREATE INDEX IF NOT EXISTS idx_inv_products_cat ON inventory_products(gym_id, category_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_products_sku ON inventory_products(gym_id, sku) WHERE sku IS NOT NULL AND sku != '';

        CREATE TABLE IF NOT EXISTS inventory_product_images (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            storage_key TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            width INTEGER,
            height INTEGER,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_primary INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_inv_images_product ON inventory_product_images(product_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_inv_images_gym ON inventory_product_images(gym_id);

        CREATE TABLE IF NOT EXISTS inventory_variants (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_name TEXT NOT NULL,
            attributes_json TEXT NOT NULL DEFAULT '{}',
            sku TEXT,
            barcode TEXT,
            cost_price_minor_units INTEGER,
            selling_price_minor_units INTEGER NOT NULL DEFAULT 0,
            mrp_minor_units INTEGER,
            low_stock_threshold INTEGER NOT NULL DEFAULT 5,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_inv_variants_product ON inventory_variants(product_id, is_active);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_variants_sku ON inventory_variants(gym_id, sku) WHERE sku IS NOT NULL AND sku != '';

        CREATE TABLE IF NOT EXISTS inventory_batches (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            supplier_id TEXT,
            batch_number TEXT NOT NULL,
            manufactured_at DATETIME,
            expires_at DATETIME,
            received_quantity INTEGER NOT NULL DEFAULT 0,
            available_quantity INTEGER NOT NULL DEFAULT 0,
            purchase_cost_minor_units INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
            FOREIGN KEY(variant_id) REFERENCES inventory_variants(id) ON DELETE CASCADE,
            FOREIGN KEY(supplier_id) REFERENCES inventory_suppliers(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_inv_batches_product ON inventory_batches(product_id, expires_at ASC);
        CREATE INDEX IF NOT EXISTS idx_inv_batches_gym_expiry ON inventory_batches(gym_id, expires_at ASC);

        CREATE TABLE IF NOT EXISTS inventory_stock (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            available_quantity INTEGER NOT NULL DEFAULT 0,
            reserved_quantity INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
            FOREIGN KEY(variant_id) REFERENCES inventory_variants(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_stock_product_variant ON inventory_stock(gym_id, product_id, IFNULL(variant_id, ''));

        CREATE TABLE IF NOT EXISTS inventory_stock_movements (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            variant_id TEXT,
            batch_id TEXT,
            movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING','PURCHASE','ADJUSTMENT_ADD','ADJUSTMENT_SUB','SALE','RETURN','DAMAGE','EXPIRY','LOSS','INTERNAL_USE')),
            quantity_change INTEGER NOT NULL,
            quantity_before INTEGER NOT NULL,
            quantity_after INTEGER NOT NULL,
            unit_cost_minor_units INTEGER,
            reference_type TEXT,
            reference_id TEXT,
            reason TEXT,
            actor_id TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES inventory_products(id) ON DELETE CASCADE,
            FOREIGN KEY(variant_id) REFERENCES inventory_variants(id) ON DELETE SET NULL,
            FOREIGN KEY(batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_stock_movements(product_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_inv_movements_gym ON inventory_stock_movements(gym_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS inventory_audit_logs (
            id TEXT PRIMARY KEY,
            gym_id TEXT NOT NULL,
            actor_id TEXT,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            previous_data TEXT,
            new_data TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_inv_audit_logs_gym ON inventory_audit_logs(gym_id, created_at DESC);",
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
