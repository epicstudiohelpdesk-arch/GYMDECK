use rusqlite::{params, Connection};
use serde_json::Value;
use uuid::Uuid;
use std::path::Path;

use crate::errors::AppError;
use crate::models::inventory::*;
use crate::models::user::AuthenticatedContext;
use crate::services::image_storage::ImageStorageService;

pub struct InventoryRepository;

impl InventoryRepository {
    // ==========================================
    // AUDIT LOG HELPER
    // ==========================================
    pub fn log_audit(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        entity_type: &str,
        entity_id: &str,
        action: &str,
        prev_data: Option<&Value>,
        new_data: Option<&Value>,
    ) -> Result<(), AppError> {
        let id = Uuid::new_v4().to_string();
        let prev_json = prev_data.map(|v| v.to_string());
        let new_json = new_data.map(|v| v.to_string());
        let actor = ctx.user_id.to_string();

        conn.execute(
            "INSERT INTO inventory_audit_logs (id, gym_id, actor_id, entity_type, entity_id, action, previous_data, new_data)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                ctx.gym_id.to_string(),
                actor,
                entity_type,
                entity_id,
                action,
                prev_json,
                new_json
            ],
        )
        .map_err(|e| AppError::Database(format!("Failed to record inventory audit log: {}", e)))?;

        Ok(())
    }

    // ==========================================
    // CATEGORIES
    // ==========================================
    pub fn list_categories(conn: &Connection, ctx: &AuthenticatedContext) -> Result<Vec<InventoryCategory>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, gym_id, name, description, icon, image_reference, is_active, created_at, updated_at
             FROM inventory_categories
             WHERE gym_id = ?1
             ORDER BY name ASC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![ctx.gym_id.to_string()], |row| {
            Ok(InventoryCategory {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                image_reference: row.get(5)?,
                is_active: row.get::<_, i64>(6)? != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut categories = Vec::new();
        for r in rows {
            categories.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(categories)
    }

    pub fn create_category(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        name: &str,
        description: Option<&str>,
        icon: Option<&str>,
    ) -> Result<InventoryCategory, AppError> {
        let trimmed_name = name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Configuration("Category name cannot be empty".into()));
        }

        let cat_id = Uuid::new_v4();
        conn.execute(
            "INSERT INTO inventory_categories (id, gym_id, name, description, icon)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                cat_id.to_string(),
                ctx.gym_id.to_string(),
                trimmed_name,
                description,
                icon
            ],
        ).map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                AppError::Configuration(format!("A category named '{}' already exists in this gym", trimmed_name))
            } else {
                AppError::Database(e.to_string())
            }
        })?;

        Self::log_audit(
            conn,
            ctx,
            "CATEGORY",
            &cat_id.to_string(),
            "CREATE",
            None,
            Some(&serde_json::json!({ "name": trimmed_name })),
        )?;

        let mut list = Self::list_categories(conn, ctx)?;
        list.retain(|c| c.id == cat_id);
        list.into_iter().next().ok_or_else(|| AppError::Database("Category created but not found".into()))
    }

    pub fn update_category(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        id: &Uuid,
        name: &str,
        description: Option<&str>,
        icon: Option<&str>,
        is_active: bool,
    ) -> Result<InventoryCategory, AppError> {
        let trimmed_name = name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Configuration("Category name cannot be empty".into()));
        }

        let rows_affected = conn.execute(
            "UPDATE inventory_categories
             SET name = ?1, description = ?2, icon = ?3, is_active = ?4, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?5 AND gym_id = ?6",
            params![
                trimmed_name,
                description,
                icon,
                if is_active { 1 } else { 0 },
                id.to_string(),
                ctx.gym_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if rows_affected == 0 {
            return Err(AppError::Unauthorized);
        }

        Self::log_audit(
            conn,
            ctx,
            "CATEGORY",
            &id.to_string(),
            "UPDATE",
            None,
            Some(&serde_json::json!({ "name": trimmed_name, "is_active": is_active })),
        )?;

        let mut list = Self::list_categories(conn, ctx)?;
        list.retain(|c| c.id == *id);
        list.into_iter().next().ok_or_else(|| AppError::Database("Category updated but not found".into()))
    }

    // ==========================================
    // SUPPLIERS
    // ==========================================
    pub fn list_suppliers(conn: &Connection, ctx: &AuthenticatedContext) -> Result<Vec<InventorySupplier>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, gym_id, supplier_name, contact_person, phone, email, address, gstin, notes, is_active, created_at, updated_at
             FROM inventory_suppliers
             WHERE gym_id = ?1
             ORDER BY supplier_name ASC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![ctx.gym_id.to_string()], |row| {
            Ok(InventorySupplier {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                supplier_name: row.get(2)?,
                contact_person: row.get(3)?,
                phone: row.get(4)?,
                email: row.get(5)?,
                address: row.get(6)?,
                gstin: row.get(7)?,
                notes: row.get(8)?,
                is_active: row.get::<_, i64>(9)? != 0,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut suppliers = Vec::new();
        for r in rows {
            suppliers.push(r.map_err(|e| AppError::Database(e.to_string()))?);
        }
        Ok(suppliers)
    }

    pub fn create_supplier(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        supplier_name: &str,
        contact_person: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
        gstin: Option<&str>,
        notes: Option<&str>,
    ) -> Result<InventorySupplier, AppError> {
        let trimmed_name = supplier_name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Configuration("Supplier name cannot be empty".into()));
        }

        let supplier_id = Uuid::new_v4();
        conn.execute(
            "INSERT INTO inventory_suppliers (id, gym_id, supplier_name, contact_person, phone, email, address, gstin, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                supplier_id.to_string(),
                ctx.gym_id.to_string(),
                trimmed_name,
                contact_person,
                phone,
                email,
                address,
                gstin,
                notes
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Self::log_audit(
            conn,
            ctx,
            "SUPPLIER",
            &supplier_id.to_string(),
            "CREATE",
            None,
            Some(&serde_json::json!({ "supplier_name": trimmed_name })),
        )?;

        let mut list = Self::list_suppliers(conn, ctx)?;
        list.retain(|s| s.id == supplier_id);
        list.into_iter().next().ok_or_else(|| AppError::Database("Supplier created but not found".into()))
    }

    pub fn update_supplier(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        id: &Uuid,
        supplier_name: &str,
        contact_person: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
        gstin: Option<&str>,
        notes: Option<&str>,
        is_active: bool,
    ) -> Result<InventorySupplier, AppError> {
        let trimmed_name = supplier_name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::Configuration("Supplier name cannot be empty".into()));
        }

        let rows_affected = conn.execute(
            "UPDATE inventory_suppliers
             SET supplier_name = ?1, contact_person = ?2, phone = ?3, email = ?4, address = ?5, gstin = ?6, notes = ?7, is_active = ?8, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?9 AND gym_id = ?10",
            params![
                trimmed_name,
                contact_person,
                phone,
                email,
                address,
                gstin,
                notes,
                if is_active { 1 } else { 0 },
                id.to_string(),
                ctx.gym_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if rows_affected == 0 {
            return Err(AppError::Unauthorized);
        }

        Self::log_audit(
            conn,
            ctx,
            "SUPPLIER",
            &id.to_string(),
            "UPDATE",
            None,
            Some(&serde_json::json!({ "supplier_name": trimmed_name, "is_active": is_active })),
        )?;

        let mut list = Self::list_suppliers(conn, ctx)?;
        list.retain(|s| s.id == *id);
        list.into_iter().next().ok_or_else(|| AppError::Database("Supplier updated but not found".into()))
    }

    // ==========================================
    // PRODUCTS & VARIANTS
    // ==========================================
    pub fn get_product(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: &Uuid,
        app_data_dir: Option<&Path>,
    ) -> Result<Option<InventoryProduct>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT p.id, p.gym_id, p.category_id, p.name, p.brand, p.sku, p.barcode,
                    p.short_description, p.description, p.product_type, p.unit_of_measure,
                    p.cost_price_minor_units, p.selling_price_minor_units, p.mrp_minor_units,
                    p.discount_price_minor_units, p.tax_configuration, p.tax_rate,
                    p.has_variants, p.batch_tracking_enabled, p.expiry_tracking_enabled,
                    p.low_stock_threshold, p.status, p.store_visibility,
                    p.created_at, p.updated_at, p.archived_at,
                    c.name AS category_name,
                    COALESCE(s.available_quantity, 0) AS available_quantity,
                    COALESCE(s.reserved_quantity, 0) AS reserved_quantity
             FROM inventory_products p
             LEFT JOIN inventory_categories c ON p.category_id = c.id
             LEFT JOIN inventory_stock s ON p.id = s.product_id AND s.variant_id IS NULL AND s.gym_id = p.gym_id
             WHERE p.id = ?1 AND p.gym_id = ?2",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let product_opt = stmt.query_row(params![product_id.to_string(), ctx.gym_id.to_string()], |row| {
            let cat_id_str: Option<String> = row.get(2)?;
            Ok(InventoryProduct {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                category_id: cat_id_str.and_then(|s| Uuid::parse_str(&s).ok()),
                name: row.get(3)?,
                brand: row.get(4)?,
                sku: row.get(5)?,
                barcode: row.get(6)?,
                short_description: row.get(7)?,
                description: row.get(8)?,
                product_type: row.get(9)?,
                unit_of_measure: row.get(10)?,
                cost_price_minor_units: row.get(11)?,
                selling_price_minor_units: row.get(12)?,
                mrp_minor_units: row.get(13)?,
                discount_price_minor_units: row.get(14)?,
                tax_configuration: row.get(15)?,
                tax_rate: row.get(16)?,
                has_variants: row.get::<_, i64>(17)? != 0,
                batch_tracking_enabled: row.get::<_, i64>(18)? != 0,
                expiry_tracking_enabled: row.get::<_, i64>(19)? != 0,
                low_stock_threshold: row.get(20)?,
                status: row.get(21)?,
                store_visibility: row.get(22)?,
                created_at: row.get(23)?,
                updated_at: row.get(24)?,
                archived_at: row.get(25)?,
                category_name: row.get(26)?,
                available_quantity: row.get(27)?,
                reserved_quantity: row.get(28)?,
                images: Vec::new(),
                variants: Vec::new(),
                primary_image: None,
            })
        });

        let mut product = match product_opt {
            Ok(p) => p,
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
            Err(e) => return Err(AppError::Database(e.to_string())),
        };

        // Fetch Images
        let mut img_stmt = conn.prepare(
            "SELECT id, gym_id, product_id, storage_key, original_filename, mime_type, file_size, width, height, sort_order, is_primary, created_at
             FROM inventory_product_images
             WHERE product_id = ?1 AND gym_id = ?2
             ORDER BY sort_order ASC, created_at ASC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let img_rows = img_stmt.query_map(params![product_id.to_string(), ctx.gym_id.to_string()], |row| {
            let key: String = row.get(3)?;
            let local_path = app_data_dir.and_then(|dir| {
                ImageStorageService::resolve_image_path(dir, &ctx.gym_id, &key).ok()
                    .map(|p| p.to_string_lossy().to_string())
            });

            Ok(InventoryProductImage {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                storage_key: key,
                original_filename: row.get(4)?,
                mime_type: row.get(5)?,
                file_size: row.get(6)?,
                width: row.get(7)?,
                height: row.get(8)?,
                sort_order: row.get(9)?,
                is_primary: row.get::<_, i64>(10)? != 0,
                created_at: row.get(11)?,
                local_path,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        for img_res in img_rows {
            let img = img_res.map_err(|e| AppError::Database(e.to_string()))?;
            if img.is_primary && product.primary_image.is_none() {
                product.primary_image = Some(img.clone());
            }
            product.images.push(img);
        }

        if product.primary_image.is_none() && !product.images.is_empty() {
            product.primary_image = Some(product.images[0].clone());
        }

        // Fetch Variants if has_variants
        if product.has_variants {
            let mut var_stmt = conn.prepare(
                "SELECT v.id, v.gym_id, v.product_id, v.variant_name, v.attributes_json, v.sku, v.barcode,
                        v.cost_price_minor_units, v.selling_price_minor_units, v.mrp_minor_units,
                        v.low_stock_threshold, v.is_active, v.created_at, v.updated_at,
                        COALESCE(s.available_quantity, 0) AS available_quantity
                 FROM inventory_variants v
                 LEFT JOIN inventory_stock s ON v.id = s.variant_id AND s.gym_id = v.gym_id
                 WHERE v.product_id = ?1 AND v.gym_id = ?2
                 ORDER BY v.variant_name ASC",
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let var_rows = var_stmt.query_map(params![product_id.to_string(), ctx.gym_id.to_string()], |row| {
                Ok(InventoryVariant {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                    product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                    variant_name: row.get(3)?,
                    attributes_json: row.get(4)?,
                    sku: row.get(5)?,
                    barcode: row.get(6)?,
                    cost_price_minor_units: row.get(7)?,
                    selling_price_minor_units: row.get(8)?,
                    mrp_minor_units: row.get(9)?,
                    low_stock_threshold: row.get(10)?,
                    is_active: row.get::<_, i64>(11)? != 0,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                    available_quantity: row.get(14)?,
                })
            }).map_err(|e| AppError::Database(e.to_string()))?;

            for v in var_rows {
                product.variants.push(v.map_err(|e| AppError::Database(e.to_string()))?);
            }

            // Aggregate total variant stock to product level for easy viewing
            let total_variant_stock: i64 = product.variants.iter().map(|v| v.available_quantity).sum();
            product.available_quantity = total_variant_stock;
        }

        Ok(Some(product))
    }

    pub fn list_products(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        app_data_dir: Option<&Path>,
    ) -> Result<Vec<InventoryProduct>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT p.id, p.gym_id, p.category_id, p.name, p.brand, p.sku, p.barcode,
                    p.short_description, p.description, p.product_type, p.unit_of_measure,
                    p.cost_price_minor_units, p.selling_price_minor_units, p.mrp_minor_units,
                    p.discount_price_minor_units, p.tax_configuration, p.tax_rate,
                    p.has_variants, p.batch_tracking_enabled, p.expiry_tracking_enabled,
                    p.low_stock_threshold, p.status, p.store_visibility,
                    p.created_at, p.updated_at, p.archived_at,
                    c.name AS category_name,
                    COALESCE(s.available_quantity, 0) AS available_quantity,
                    COALESCE(s.reserved_quantity, 0) AS reserved_quantity
             FROM inventory_products p
             LEFT JOIN inventory_categories c ON p.category_id = c.id
             LEFT JOIN inventory_stock s ON p.id = s.product_id AND s.variant_id IS NULL AND s.gym_id = p.gym_id
             WHERE p.gym_id = ?1
             ORDER BY p.created_at DESC",
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let rows = stmt.query_map(params![ctx.gym_id.to_string()], |row| {
            let cat_id_str: Option<String> = row.get(2)?;
            Ok(InventoryProduct {
                id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                category_id: cat_id_str.and_then(|s| Uuid::parse_str(&s).ok()),
                name: row.get(3)?,
                brand: row.get(4)?,
                sku: row.get(5)?,
                barcode: row.get(6)?,
                short_description: row.get(7)?,
                description: row.get(8)?,
                product_type: row.get(9)?,
                unit_of_measure: row.get(10)?,
                cost_price_minor_units: row.get(11)?,
                selling_price_minor_units: row.get(12)?,
                mrp_minor_units: row.get(13)?,
                discount_price_minor_units: row.get(14)?,
                tax_configuration: row.get(15)?,
                tax_rate: row.get(16)?,
                has_variants: row.get::<_, i64>(17)? != 0,
                batch_tracking_enabled: row.get::<_, i64>(18)? != 0,
                expiry_tracking_enabled: row.get::<_, i64>(19)? != 0,
                low_stock_threshold: row.get(20)?,
                status: row.get(21)?,
                store_visibility: row.get(22)?,
                created_at: row.get(23)?,
                updated_at: row.get(24)?,
                archived_at: row.get(25)?,
                category_name: row.get(26)?,
                available_quantity: row.get(27)?,
                reserved_quantity: row.get(28)?,
                images: Vec::new(),
                variants: Vec::new(),
                primary_image: None,
            })
        }).map_err(|e| AppError::Database(e.to_string()))?;

        let mut products = Vec::new();
        for r in rows {
            let mut prod = r.map_err(|e| AppError::Database(e.to_string()))?;

            // Fetch primary image or first image
            let mut img_stmt = conn.prepare(
                "SELECT id, storage_key, original_filename, mime_type, file_size, is_primary
                 FROM inventory_product_images
                 WHERE product_id = ?1 AND gym_id = ?2
                 ORDER BY is_primary DESC, sort_order ASC LIMIT 1",
            ).map_err(|e| AppError::Database(e.to_string()))?;

            let primary_res = img_stmt.query_row(params![prod.id.to_string(), ctx.gym_id.to_string()], |irow| {
                let key: String = irow.get(1)?;
                let local_path = app_data_dir.and_then(|dir| {
                    ImageStorageService::resolve_image_path(dir, &ctx.gym_id, &key).ok()
                        .map(|p| p.to_string_lossy().to_string())
                });

                Ok(InventoryProductImage {
                    id: Uuid::parse_str(&irow.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: ctx.gym_id,
                    product_id: prod.id,
                    storage_key: key,
                    original_filename: irow.get(2)?,
                    mime_type: irow.get(3)?,
                    file_size: irow.get(4)?,
                    width: None,
                    height: None,
                    sort_order: 0,
                    is_primary: irow.get::<_, i64>(5)? != 0,
                    created_at: "".into(),
                    local_path,
                })
            });

            if let Ok(p_img) = primary_res {
                prod.primary_image = Some(p_img.clone());
                prod.images.push(p_img);
            }

            // If product has variants, aggregate variant available quantity
            if prod.has_variants {
                let variant_stock: i64 = conn.query_row(
                    "SELECT COALESCE(SUM(s.available_quantity), 0)
                     FROM inventory_variants v
                     LEFT JOIN inventory_stock s ON v.id = s.variant_id AND s.gym_id = v.gym_id
                     WHERE v.product_id = ?1 AND v.gym_id = ?2",
                    params![prod.id.to_string(), ctx.gym_id.to_string()],
                    |r| r.get(0),
                ).unwrap_or(0);
                prod.available_quantity = variant_stock;
            }

            products.push(prod);
        }

        Ok(products)
    }

    /// Creates a complete product, optionally with variants and initial opening stock, inside a single transaction.
    pub fn create_product(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
        app_data_dir: Option<&Path>,
    ) -> Result<InventoryProduct, AppError> {
        let name = payload.get("name").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or("");
        if name.is_empty() {
            return Err(AppError::Configuration("Product name is required".into()));
        }

        let category_id_str = payload.get("categoryId").and_then(|v| v.as_str());
        let category_id = category_id_str.and_then(|s| Uuid::parse_str(s).ok());

        let brand = payload.get("brand").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let sku = payload.get("sku").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let barcode = payload.get("barcode").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let short_description = payload.get("shortDescription").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let description = payload.get("description").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let product_type = payload.get("productType").and_then(|v| v.as_str()).unwrap_or("PHYSICAL");
        let unit_of_measure = payload.get("unitOfMeasure").and_then(|v| v.as_str()).unwrap_or("pcs");

        let cost_price_minor_units = payload.get("costPriceMinorUnits").and_then(|v| v.as_i64());
        let selling_price_minor_units = payload.get("sellingPriceMinorUnits").and_then(|v| v.as_i64()).unwrap_or(0);
        let mrp_minor_units = payload.get("mrpMinorUnits").and_then(|v| v.as_i64());
        let discount_price_minor_units = payload.get("discountPriceMinorUnits").and_then(|v| v.as_i64());
        let tax_configuration = payload.get("taxConfiguration").and_then(|v| v.as_str()).map(|s| s.to_string());
        let tax_rate = payload.get("taxRate").and_then(|v| v.as_f64());

        let has_variants = payload.get("hasVariants").and_then(|v| v.as_bool()).unwrap_or(false);
        let batch_tracking_enabled = payload.get("batchTrackingEnabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let expiry_tracking_enabled = payload.get("expiryTrackingEnabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let low_stock_threshold = payload.get("lowStockThreshold").and_then(|v| v.as_i64()).unwrap_or(5);
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("ACTIVE");
        let store_visibility = payload.get("storeVisibility").and_then(|v| v.as_str()).unwrap_or("HIDDEN");

        let product_id = Uuid::new_v4();

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        // Check category belongs to this gym if provided
        if let Some(cat_id) = &category_id {
            let cat_exists: i64 = tx.query_row(
                "SELECT COUNT(*) FROM inventory_categories WHERE id = ?1 AND gym_id = ?2",
                params![cat_id.to_string(), ctx.gym_id.to_string()],
                |r| r.get(0),
            ).unwrap_or(0);
            if cat_exists == 0 {
                return Err(AppError::Configuration("Selected category does not exist for this gym".into()));
            }
        }

        // Insert product
        tx.execute(
            "INSERT INTO inventory_products (
                id, gym_id, category_id, name, brand, sku, barcode, short_description, description,
                product_type, unit_of_measure, cost_price_minor_units, selling_price_minor_units,
                mrp_minor_units, discount_price_minor_units, tax_configuration, tax_rate,
                has_variants, batch_tracking_enabled, expiry_tracking_enabled, low_stock_threshold,
                status, store_visibility
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
            params![
                product_id.to_string(),
                ctx.gym_id.to_string(),
                category_id.map(|id| id.to_string()),
                name,
                brand,
                sku,
                barcode,
                short_description,
                description,
                product_type,
                unit_of_measure,
                cost_price_minor_units,
                selling_price_minor_units,
                mrp_minor_units,
                discount_price_minor_units,
                tax_configuration,
                tax_rate,
                if has_variants { 1 } else { 0 },
                if batch_tracking_enabled { 1 } else { 0 },
                if expiry_tracking_enabled { 1 } else { 0 },
                low_stock_threshold,
                status,
                store_visibility
            ],
        ).map_err(|e| {
            if e.to_string().contains("idx_inv_products_sku") {
                AppError::Configuration(format!("A product with SKU '{}' already exists in this gym", sku.unwrap_or_default()))
            } else {
                AppError::Database(e.to_string())
            }
        })?;

        // Initialize stock record
        if !has_variants {
            let stock_id = Uuid::new_v4();
            let initial_qty = payload.get("initialStock").and_then(|v| v.as_i64()).unwrap_or(0);

            tx.execute(
                "INSERT INTO inventory_stock (id, gym_id, product_id, variant_id, available_quantity, reserved_quantity)
                 VALUES (?1, ?2, ?3, NULL, ?4, 0)",
                params![stock_id.to_string(), ctx.gym_id.to_string(), product_id.to_string(), initial_qty],
            ).map_err(|e| AppError::Database(e.to_string()))?;

            if initial_qty > 0 {
                let mvt_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO inventory_stock_movements (
                        id, gym_id, product_id, variant_id, batch_id, movement_type,
                        quantity_change, quantity_before, quantity_after, unit_cost_minor_units,
                        reference_type, reference_id, reason, actor_id
                    ) VALUES (?1, ?2, ?3, NULL, NULL, 'OPENING', ?4, 0, ?4, ?5, 'INITIAL_STOCK', ?6, 'Opening stock count', ?7)",
                    params![
                        mvt_id.to_string(),
                        ctx.gym_id.to_string(),
                        product_id.to_string(),
                        initial_qty,
                        cost_price_minor_units,
                        product_id.to_string(),
                        ctx.user_id.to_string(),
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
            }
        } else if let Some(variants_arr) = payload.get("variants").and_then(|v| v.as_array()) {
            // Handle variants
            for v_obj in variants_arr {
                let v_name = v_obj.get("variantName").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or("");
                if v_name.is_empty() {
                    continue;
                }
                let variant_id = Uuid::new_v4();
                let v_sku = v_obj.get("sku").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                let v_barcode = v_obj.get("barcode").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                let v_cost = v_obj.get("costPriceMinorUnits").and_then(|v| v.as_i64()).or(cost_price_minor_units);
                let v_sell = v_obj.get("sellingPriceMinorUnits").and_then(|v| v.as_i64()).unwrap_or(selling_price_minor_units);
                let v_mrp = v_obj.get("mrpMinorUnits").and_then(|v| v.as_i64()).or(mrp_minor_units);
                let v_low_stock = v_obj.get("lowStockThreshold").and_then(|v| v.as_i64()).unwrap_or(low_stock_threshold);
                let v_attrs = v_obj.get("attributes").map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());
                let v_initial_stock = v_obj.get("initialStock").and_then(|v| v.as_i64()).unwrap_or(0);

                tx.execute(
                    "INSERT INTO inventory_variants (
                        id, gym_id, product_id, variant_name, attributes_json, sku, barcode,
                        cost_price_minor_units, selling_price_minor_units, mrp_minor_units,
                        low_stock_threshold, is_active
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)",
                    params![
                        variant_id.to_string(),
                        ctx.gym_id.to_string(),
                        product_id.to_string(),
                        v_name,
                        v_attrs,
                        v_sku,
                        v_barcode,
                        v_cost,
                        v_sell,
                        v_mrp,
                        v_low_stock,
                    ],
                ).map_err(|e| {
                    if e.to_string().contains("idx_inv_variants_sku") {
                        AppError::Configuration(format!("A variant with SKU '{}' already exists in this gym", v_sku.unwrap_or_default()))
                    } else {
                        AppError::Database(e.to_string())
                    }
                })?;

                let v_stock_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO inventory_stock (id, gym_id, product_id, variant_id, available_quantity, reserved_quantity)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0)",
                    params![
                        v_stock_id.to_string(),
                        ctx.gym_id.to_string(),
                        product_id.to_string(),
                        variant_id.to_string(),
                        v_initial_stock
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;

                if v_initial_stock > 0 {
                    let mvt_id = Uuid::new_v4();
                    tx.execute(
                        "INSERT INTO inventory_stock_movements (
                            id, gym_id, product_id, variant_id, batch_id, movement_type,
                            quantity_change, quantity_before, quantity_after, unit_cost_minor_units,
                            reference_type, reference_id, reason, actor_id
                        ) VALUES (?1, ?2, ?3, ?4, NULL, 'OPENING', ?5, 0, ?5, ?6, 'INITIAL_STOCK', ?7, 'Opening variant stock', ?8)",
                        params![
                            mvt_id.to_string(),
                            ctx.gym_id.to_string(),
                            product_id.to_string(),
                            variant_id.to_string(),
                            v_initial_stock,
                            v_cost,
                            variant_id.to_string(),
                            ctx.user_id.to_string(),
                        ],
                    ).map_err(|e| AppError::Database(e.to_string()))?;
                }
            }
        }

        Self::log_audit(
            &tx,
            ctx,
            "PRODUCT",
            &product_id.to_string(),
            "CREATE",
            None,
            Some(&serde_json::json!({ "name": name, "has_variants": has_variants })),
        )?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        Self::get_product(conn, ctx, &product_id, app_data_dir)?
            .ok_or_else(|| AppError::Database("Created product could not be re-read".into()))
    }

    pub fn update_product(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        product_id: &Uuid,
        payload: &Value,
        app_data_dir: Option<&Path>,
    ) -> Result<InventoryProduct, AppError> {
        let name = payload.get("name").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or("");
        if name.is_empty() {
            return Err(AppError::Configuration("Product name is required".into()));
        }

        let category_id_str = payload.get("categoryId").and_then(|v| v.as_str());
        let category_id = category_id_str.and_then(|s| Uuid::parse_str(s).ok());

        let brand = payload.get("brand").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let sku = payload.get("sku").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let barcode = payload.get("barcode").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        let short_description = payload.get("shortDescription").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let description = payload.get("description").and_then(|v| v.as_str()).map(|s| s.trim().to_string());
        let product_type = payload.get("productType").and_then(|v| v.as_str()).unwrap_or("PHYSICAL");
        let unit_of_measure = payload.get("unitOfMeasure").and_then(|v| v.as_str()).unwrap_or("pcs");

        let cost_price_minor_units = payload.get("costPriceMinorUnits").and_then(|v| v.as_i64());
        let selling_price_minor_units = payload.get("sellingPriceMinorUnits").and_then(|v| v.as_i64()).unwrap_or(0);
        let mrp_minor_units = payload.get("mrpMinorUnits").and_then(|v| v.as_i64());
        let discount_price_minor_units = payload.get("discountPriceMinorUnits").and_then(|v| v.as_i64());
        let tax_configuration = payload.get("taxConfiguration").and_then(|v| v.as_str()).map(|s| s.to_string());
        let tax_rate = payload.get("taxRate").and_then(|v| v.as_f64());

        let batch_tracking_enabled = payload.get("batchTrackingEnabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let expiry_tracking_enabled = payload.get("expiryTrackingEnabled").and_then(|v| v.as_bool()).unwrap_or(false);
        let low_stock_threshold = payload.get("lowStockThreshold").and_then(|v| v.as_i64()).unwrap_or(5);
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("ACTIVE");
        let store_visibility = payload.get("storeVisibility").and_then(|v| v.as_str()).unwrap_or("HIDDEN");

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        // Verify product exists and belongs to this gym
        let existing: i64 = tx.query_row(
            "SELECT COUNT(*) FROM inventory_products WHERE id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        if existing == 0 {
            return Err(AppError::Unauthorized);
        }

        tx.execute(
            "UPDATE inventory_products SET
                category_id = ?1, name = ?2, brand = ?3, sku = ?4, barcode = ?5,
                short_description = ?6, description = ?7, product_type = ?8, unit_of_measure = ?9,
                cost_price_minor_units = ?10, selling_price_minor_units = ?11, mrp_minor_units = ?12,
                discount_price_minor_units = ?13, tax_configuration = ?14, tax_rate = ?15,
                batch_tracking_enabled = ?16, expiry_tracking_enabled = ?17, low_stock_threshold = ?18,
                status = ?19, store_visibility = ?20, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?21 AND gym_id = ?22",
            params![
                category_id.map(|id| id.to_string()),
                name,
                brand,
                sku,
                barcode,
                short_description,
                description,
                product_type,
                unit_of_measure,
                cost_price_minor_units,
                selling_price_minor_units,
                mrp_minor_units,
                discount_price_minor_units,
                tax_configuration,
                tax_rate,
                if batch_tracking_enabled { 1 } else { 0 },
                if expiry_tracking_enabled { 1 } else { 0 },
                low_stock_threshold,
                status,
                store_visibility,
                product_id.to_string(),
                ctx.gym_id.to_string(),
            ],
        ).map_err(|e| {
            if e.to_string().contains("idx_inv_products_sku") {
                AppError::Configuration(format!("A product with SKU '{}' already exists in this gym", sku.unwrap_or_default()))
            } else {
                AppError::Database(e.to_string())
            }
        })?;

        // Update / Add variants if provided
        if let Some(variants_arr) = payload.get("variants").and_then(|v| v.as_array()) {
            for v_obj in variants_arr {
                let v_name = v_obj.get("variantName").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or("");
                if v_name.is_empty() {
                    continue;
                }
                let v_sku = v_obj.get("sku").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                let v_barcode = v_obj.get("barcode").and_then(|v| v.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
                let v_cost = v_obj.get("costPriceMinorUnits").and_then(|v| v.as_i64()).or(cost_price_minor_units);
                let v_sell = v_obj.get("sellingPriceMinorUnits").and_then(|v| v.as_i64()).unwrap_or(selling_price_minor_units);
                let v_mrp = v_obj.get("mrpMinorUnits").and_then(|v| v.as_i64()).or(mrp_minor_units);
                let v_low_stock = v_obj.get("lowStockThreshold").and_then(|v| v.as_i64()).unwrap_or(low_stock_threshold);
                let v_attrs = v_obj.get("attributes").map(|a| a.to_string()).unwrap_or_else(|| "{}".to_string());
                let v_active = v_obj.get("isActive").and_then(|v| v.as_bool()).unwrap_or(true);

                if let Some(existing_vid_str) = v_obj.get("id").and_then(|v| v.as_str()) {
                    if let Ok(existing_vid) = Uuid::parse_str(existing_vid_str) {
                        tx.execute(
                            "UPDATE inventory_variants SET
                                variant_name = ?1, attributes_json = ?2, sku = ?3, barcode = ?4,
                                cost_price_minor_units = ?5, selling_price_minor_units = ?6,
                                mrp_minor_units = ?7, low_stock_threshold = ?8, is_active = ?9,
                                updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?10 AND product_id = ?11 AND gym_id = ?12",
                            params![
                                v_name,
                                v_attrs,
                                v_sku,
                                v_barcode,
                                v_cost,
                                v_sell,
                                v_mrp,
                                v_low_stock,
                                if v_active { 1 } else { 0 },
                                existing_vid.to_string(),
                                product_id.to_string(),
                                ctx.gym_id.to_string(),
                            ],
                        ).map_err(|e| AppError::Database(e.to_string()))?;
                        continue;
                    }
                }

                // New variant inserted during edit
                let new_vid = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO inventory_variants (
                        id, gym_id, product_id, variant_name, attributes_json, sku, barcode,
                        cost_price_minor_units, selling_price_minor_units, mrp_minor_units,
                        low_stock_threshold, is_active
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                    params![
                        new_vid.to_string(),
                        ctx.gym_id.to_string(),
                        product_id.to_string(),
                        v_name,
                        v_attrs,
                        v_sku,
                        v_barcode,
                        v_cost,
                        v_sell,
                        v_mrp,
                        v_low_stock,
                        if v_active { 1 } else { 0 },
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;

                let v_stock_id = Uuid::new_v4();
                tx.execute(
                    "INSERT INTO inventory_stock (id, gym_id, product_id, variant_id, available_quantity, reserved_quantity)
                     VALUES (?1, ?2, ?3, ?4, 0, 0)",
                    params![
                        v_stock_id.to_string(),
                        ctx.gym_id.to_string(),
                        product_id.to_string(),
                        new_vid.to_string()
                    ],
                ).map_err(|e| AppError::Database(e.to_string()))?;
            }
        }

        Self::log_audit(
            &tx,
            ctx,
            "PRODUCT",
            &product_id.to_string(),
            "UPDATE",
            None,
            Some(&serde_json::json!({ "name": name, "status": status })),
        )?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        Self::get_product(conn, ctx, product_id, app_data_dir)?
            .ok_or_else(|| AppError::Database("Updated product could not be re-read".into()))
    }

    pub fn archive_product(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: &Uuid,
    ) -> Result<(), AppError> {
        let rows = conn.execute(
            "UPDATE inventory_products
             SET status = 'ARCHIVED', store_visibility = 'HIDDEN', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if rows == 0 {
            return Err(AppError::Unauthorized);
        }

        Self::log_audit(
            conn,
            ctx,
            "PRODUCT",
            &product_id.to_string(),
            "ARCHIVE",
            None,
            None,
        )?;

        Ok(())
    }

    pub fn unarchive_product(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: &Uuid,
    ) -> Result<(), AppError> {
        let rows = conn.execute(
            "UPDATE inventory_products
             SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if rows == 0 {
            return Err(AppError::Unauthorized);
        }

        Self::log_audit(
            conn,
            ctx,
            "PRODUCT",
            &product_id.to_string(),
            "UNARCHIVE",
            None,
            None,
        )?;

        Ok(())
    }

    // ==========================================
    // IMAGES
    // ==========================================
    pub fn add_product_image_record(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: &Uuid,
        storage_key: &str,
        original_filename: &str,
        mime_type: &str,
        file_size: i64,
        width: i64,
        height: i64,
        is_primary: bool,
    ) -> Result<InventoryProductImage, AppError> {
        let image_id = Uuid::new_v4();

        // If is_primary, clear existing primary for this product
        if is_primary {
            conn.execute(
                "UPDATE inventory_product_images SET is_primary = 0 WHERE product_id = ?1 AND gym_id = ?2",
                params![product_id.to_string(), ctx.gym_id.to_string()],
            ).map_err(|e| AppError::Database(e.to_string()))?;
        }

        // Get max sort_order
        let next_sort: i64 = conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM inventory_product_images WHERE product_id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        conn.execute(
            "INSERT INTO inventory_product_images (
                id, gym_id, product_id, storage_key, original_filename, mime_type, file_size,
                width, height, sort_order, is_primary
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                image_id.to_string(),
                ctx.gym_id.to_string(),
                product_id.to_string(),
                storage_key,
                original_filename,
                mime_type,
                file_size,
                width,
                height,
                next_sort,
                if is_primary { 1 } else { 0 }
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Self::log_audit(
            conn,
            ctx,
            "PRODUCT_IMAGE",
            &image_id.to_string(),
            "UPLOAD",
            None,
            Some(&serde_json::json!({ "storage_key": storage_key, "filename": original_filename })),
        )?;

        Ok(InventoryProductImage {
            id: image_id,
            gym_id: ctx.gym_id,
            product_id: *product_id,
            storage_key: storage_key.to_string(),
            original_filename: original_filename.to_string(),
            mime_type: mime_type.to_string(),
            file_size,
            width: Some(width),
            height: Some(height),
            sort_order: next_sort,
            is_primary,
            created_at: chrono::Utc::now().to_rfc3339(),
            local_path: None,
        })
    }

    pub fn delete_product_image_record(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        image_id: &Uuid,
    ) -> Result<String, AppError> {
        let storage_key: String = conn.query_row(
            "SELECT storage_key FROM inventory_product_images WHERE id = ?1 AND gym_id = ?2",
            params![image_id.to_string(), ctx.gym_id.to_string()],
            |r| r.get(0),
        ).map_err(|_| AppError::Unauthorized)?;

        conn.execute(
            "DELETE FROM inventory_product_images WHERE id = ?1 AND gym_id = ?2",
            params![image_id.to_string(), ctx.gym_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Self::log_audit(
            conn,
            ctx,
            "PRODUCT_IMAGE",
            &image_id.to_string(),
            "DELETE",
            Some(&serde_json::json!({ "storage_key": storage_key })),
            None,
        )?;

        Ok(storage_key)
    }

    pub fn set_primary_product_image(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        image_id: &Uuid,
        product_id: &Uuid,
    ) -> Result<(), AppError> {
        let tx = conn.unchecked_transaction().map_err(|e| AppError::Database(e.to_string()))?;

        tx.execute(
            "UPDATE inventory_product_images SET is_primary = 0 WHERE product_id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        let affected = tx.execute(
            "UPDATE inventory_product_images SET is_primary = 1 WHERE id = ?1 AND product_id = ?2 AND gym_id = ?3",
            params![image_id.to_string(), product_id.to_string(), ctx.gym_id.to_string()],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        if affected == 0 {
            return Err(AppError::Unauthorized);
        }

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;
        Ok(())
    }

    // ==========================================
    // STOCK LEDGER & MOVEMENTS
    // ==========================================
    /// Receives stock from a purchase / supplier into a batch or general balance atomically.
    pub fn receive_stock(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<InventoryStockMovement, AppError> {
        let product_id_str = payload.get("productId").and_then(|v| v.as_str()).ok_or_else(|| AppError::Configuration("productId is required".into()))?;
        let product_id = Uuid::parse_str(product_id_str).map_err(|_| AppError::Configuration("Invalid productId".into()))?;

        let variant_id = payload.get("variantId").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
        let supplier_id = payload.get("supplierId").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
        let quantity = payload.get("quantity").and_then(|v| v.as_i64()).ok_or_else(|| AppError::Configuration("quantity is required".into()))?;

        if quantity <= 0 {
            return Err(AppError::Configuration("Received stock quantity must be positive".into()));
        }

        let unit_cost_minor_units = payload.get("unitCostMinorUnits").and_then(|v| v.as_i64());
        let reference_id = payload.get("referenceNumber").or_else(|| payload.get("invoiceNumber")).and_then(|v| v.as_str()).map(|s| s.to_string());
        let notes = payload.get("notes").and_then(|v| v.as_str()).map(|s| s.to_string());

        let batch_number = payload.get("batchNumber").and_then(|v| v.as_str()).map(|s| s.trim()).filter(|s| !s.is_empty());
        let expires_at = payload.get("expiresAt").and_then(|v| v.as_str()).map(|s| s.to_string());
        let manufactured_at = payload.get("manufacturedAt").and_then(|v| v.as_str()).map(|s| s.to_string());

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        // Verify product belongs to gym
        let prod_exists: i64 = tx.query_row(
            "SELECT COUNT(*) FROM inventory_products WHERE id = ?1 AND gym_id = ?2",
            params![product_id.to_string(), ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);
        if prod_exists == 0 {
            return Err(AppError::Unauthorized);
        }

        // Create or get batch if batch_number provided
        let mut created_batch_id: Option<Uuid> = None;
        if let Some(b_num) = batch_number {
            let b_id = Uuid::new_v4();
            tx.execute(
                "INSERT INTO inventory_batches (
                    id, gym_id, product_id, variant_id, supplier_id, batch_number,
                    manufactured_at, expires_at, received_quantity, available_quantity, purchase_cost_minor_units
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10)",
                params![
                    b_id.to_string(),
                    ctx.gym_id.to_string(),
                    product_id.to_string(),
                    variant_id.map(|v| v.to_string()),
                    supplier_id.map(|s| s.to_string()),
                    b_num,
                    manufactured_at,
                    expires_at,
                    quantity,
                    unit_cost_minor_units
                ],
            ).map_err(|e| AppError::Database(e.to_string()))?;
            created_batch_id = Some(b_id);
        }

        // Read current stock balance
        let (stock_id, current_qty): (String, i64) = if let Some(vid) = variant_id {
            tx.query_row(
                "SELECT id, available_quantity FROM inventory_stock WHERE product_id = ?1 AND variant_id = ?2 AND gym_id = ?3",
                params![product_id.to_string(), vid.to_string(), ctx.gym_id.to_string()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).unwrap_or_else(|_| {
                let sid = Uuid::new_v4().to_string();
                let _ = tx.execute(
                    "INSERT INTO inventory_stock (id, gym_id, product_id, variant_id, available_quantity, reserved_quantity)
                     VALUES (?1, ?2, ?3, ?4, 0, 0)",
                    params![sid, ctx.gym_id.to_string(), product_id.to_string(), vid.to_string()],
                );
                (sid, 0)
            })
        } else {
            tx.query_row(
                "SELECT id, available_quantity FROM inventory_stock WHERE product_id = ?1 AND variant_id IS NULL AND gym_id = ?2",
                params![product_id.to_string(), ctx.gym_id.to_string()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).unwrap_or_else(|_| {
                let sid = Uuid::new_v4().to_string();
                let _ = tx.execute(
                    "INSERT INTO inventory_stock (id, gym_id, product_id, variant_id, available_quantity, reserved_quantity)
                     VALUES (?1, ?2, ?3, NULL, 0, 0)",
                    params![sid, ctx.gym_id.to_string(), product_id.to_string()],
                );
                (sid, 0)
            })
        };

        let new_qty = current_qty + quantity;
        tx.execute(
            "UPDATE inventory_stock SET available_quantity = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![new_qty, stock_id],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // Update product/variant last cost if provided
        if let Some(cost) = unit_cost_minor_units {
            if let Some(vid) = variant_id {
                let _ = tx.execute(
                    "UPDATE inventory_variants SET cost_price_minor_units = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND gym_id = ?3",
                    params![cost, vid.to_string(), ctx.gym_id.to_string()],
                );
            } else {
                let _ = tx.execute(
                    "UPDATE inventory_products SET cost_price_minor_units = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2 AND gym_id = ?3",
                    params![cost, product_id.to_string(), ctx.gym_id.to_string()],
                );
            }
        }

        // Record stock movement
        let movement_id = Uuid::new_v4();
        tx.execute(
            "INSERT INTO inventory_stock_movements (
                id, gym_id, product_id, variant_id, batch_id, movement_type,
                quantity_change, quantity_before, quantity_after, unit_cost_minor_units,
                reference_type, reference_id, reason, actor_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, 'PURCHASE', ?6, ?7, ?8, ?9, 'PURCHASE_ORDER', ?10, ?11, ?12)",
            params![
                movement_id.to_string(),
                ctx.gym_id.to_string(),
                product_id.to_string(),
                variant_id.map(|v| v.to_string()),
                created_batch_id.map(|b| b.to_string()),
                quantity,
                current_qty,
                new_qty,
                unit_cost_minor_units,
                reference_id,
                notes,
                ctx.user_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Self::log_audit(
            &tx,
            ctx,
            "STOCK",
            &product_id.to_string(),
            "RECEIVE_PURCHASE",
            Some(&serde_json::json!({ "quantity_before": current_qty })),
            Some(&serde_json::json!({ "quantity_received": quantity, "quantity_after": new_qty })),
        )?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        Ok(InventoryStockMovement {
            id: movement_id,
            gym_id: ctx.gym_id,
            product_id,
            variant_id,
            batch_id: created_batch_id,
            movement_type: "PURCHASE".into(),
            quantity_change: quantity,
            quantity_before: current_qty,
            quantity_after: new_qty,
            unit_cost_minor_units,
            reference_type: Some("PURCHASE_ORDER".into()),
            reference_id,
            reason: notes,
            actor_id: Some(ctx.user_id.to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            product_name: None,
            variant_name: None,
            batch_number: batch_number.map(|s| s.to_string()),
        })
    }

    /// Adjusts stock for inventory corrections, damages, expired goods, loss, etc.
    pub fn adjust_stock(
        conn: &mut Connection,
        ctx: &AuthenticatedContext,
        payload: &Value,
    ) -> Result<InventoryStockMovement, AppError> {
        let product_id_str = payload.get("productId").and_then(|v| v.as_str()).ok_or_else(|| AppError::Configuration("productId is required".into()))?;
        let product_id = Uuid::parse_str(product_id_str).map_err(|_| AppError::Configuration("Invalid productId".into()))?;

        let variant_id = payload.get("variantId").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
        let batch_id = payload.get("batchId").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
        let movement_type = payload.get("movementType").and_then(|v| v.as_str()).unwrap_or("ADJUSTMENT_ADD");
        let quantity_delta = payload.get("quantityChange").and_then(|v| v.as_i64()).ok_or_else(|| AppError::Configuration("quantityChange is required".into()))?;
        let reason = payload.get("reason").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or("");

        // If decreasing stock, reason is strictly required
        if quantity_delta < 0 && reason.is_empty() {
            return Err(AppError::Configuration("A reason is mandatory for negative stock adjustments".into()));
        }

        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;

        // Read current stock
        let (stock_id, current_qty): (String, i64) = if let Some(vid) = variant_id {
            tx.query_row(
                "SELECT id, available_quantity FROM inventory_stock WHERE product_id = ?1 AND variant_id = ?2 AND gym_id = ?3",
                params![product_id.to_string(), vid.to_string(), ctx.gym_id.to_string()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|_| AppError::Configuration("Stock record for product variant not initialized".into()))?
        } else {
            tx.query_row(
                "SELECT id, available_quantity FROM inventory_stock WHERE product_id = ?1 AND variant_id IS NULL AND gym_id = ?2",
                params![product_id.to_string(), ctx.gym_id.to_string()],
                |r| Ok((r.get(0)?, r.get(1)?)),
            ).map_err(|_| AppError::Configuration("Stock record for product not initialized".into()))?
        };

        let new_qty = current_qty + quantity_delta;
        if new_qty < 0 {
            return Err(AppError::Configuration(format!(
                "Adjustment rejected: resulting available quantity cannot be negative (Current: {}, Adjustment: {}, Result: {})",
                current_qty, quantity_delta, new_qty
            )));
        }

        tx.execute(
            "UPDATE inventory_stock SET available_quantity = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![new_qty, stock_id],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        // If batch_id was provided, adjust batch quantity too
        if let Some(b_id) = batch_id {
            let current_batch_qty: i64 = tx.query_row(
                "SELECT available_quantity FROM inventory_batches WHERE id = ?1 AND gym_id = ?2",
                params![b_id.to_string(), ctx.gym_id.to_string()],
                |r| r.get(0),
            ).map_err(|_| AppError::Configuration("Batch record not found".into()))?;

            let new_batch_qty = current_batch_qty + quantity_delta;
            if new_batch_qty < 0 {
                return Err(AppError::Configuration("Batch stock cannot be reduced below zero".into()));
            }

            tx.execute(
                "UPDATE inventory_batches SET available_quantity = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![new_batch_qty, b_id.to_string()],
            ).map_err(|e| AppError::Database(e.to_string()))?;
        }

        let movement_id = Uuid::new_v4();
        tx.execute(
            "INSERT INTO inventory_stock_movements (
                id, gym_id, product_id, variant_id, batch_id, movement_type,
                quantity_change, quantity_before, quantity_after, unit_cost_minor_units,
                reference_type, reference_id, reason, actor_id
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, 'MANUAL_ADJUSTMENT', NULL, ?10, ?11)",
            params![
                movement_id.to_string(),
                ctx.gym_id.to_string(),
                product_id.to_string(),
                variant_id.map(|v| v.to_string()),
                batch_id.map(|b| b.to_string()),
                movement_type,
                quantity_delta,
                current_qty,
                new_qty,
                reason,
                ctx.user_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;

        Self::log_audit(
            &tx,
            ctx,
            "STOCK",
            &product_id.to_string(),
            movement_type,
            Some(&serde_json::json!({ "quantity_before": current_qty })),
            Some(&serde_json::json!({ "delta": quantity_delta, "quantity_after": new_qty, "reason": reason })),
        )?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

        Ok(InventoryStockMovement {
            id: movement_id,
            gym_id: ctx.gym_id,
            product_id,
            variant_id,
            batch_id,
            movement_type: movement_type.to_string(),
            quantity_change: quantity_delta,
            quantity_before: current_qty,
            quantity_after: new_qty,
            unit_cost_minor_units: None,
            reference_type: Some("MANUAL_ADJUSTMENT".into()),
            reference_id: None,
            reason: Some(reason.to_string()),
            actor_id: Some(ctx.user_id.to_string()),
            created_at: chrono::Utc::now().to_rfc3339(),
            product_name: None,
            variant_name: None,
            batch_number: None,
        })
    }

    pub fn list_movements(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: Option<&Uuid>,
        limit: i64,
    ) -> Result<Vec<InventoryStockMovement>, AppError> {
        let query = if let Some(pid) = product_id {
            "SELECT m.id, m.gym_id, m.product_id, m.variant_id, m.batch_id, m.movement_type,
                    m.quantity_change, m.quantity_before, m.quantity_after, m.unit_cost_minor_units,
                    m.reference_type, m.reference_id, m.reason, m.actor_id, m.created_at,
                    p.name AS product_name, v.variant_name, b.batch_number
             FROM inventory_stock_movements m
             JOIN inventory_products p ON m.product_id = p.id
             LEFT JOIN inventory_variants v ON m.variant_id = v.id
             LEFT JOIN inventory_batches b ON m.batch_id = b.id
             WHERE m.gym_id = ?1 AND m.product_id = ?2
             ORDER BY m.created_at DESC LIMIT ?3"
        } else {
            "SELECT m.id, m.gym_id, m.product_id, m.variant_id, m.batch_id, m.movement_type,
                    m.quantity_change, m.quantity_before, m.quantity_after, m.unit_cost_minor_units,
                    m.reference_type, m.reference_id, m.reason, m.actor_id, m.created_at,
                    p.name AS product_name, v.variant_name, b.batch_number
             FROM inventory_stock_movements m
             JOIN inventory_products p ON m.product_id = p.id
             LEFT JOIN inventory_variants v ON m.variant_id = v.id
             LEFT JOIN inventory_batches b ON m.batch_id = b.id
             WHERE m.gym_id = ?1
             ORDER BY m.created_at DESC LIMIT ?2"
        };

        let mut movements = Vec::new();

        if let Some(pid) = product_id {
            let mut stmt = conn.prepare(query).map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt.query_map(params![ctx.gym_id.to_string(), pid.to_string(), limit], |row| {
                let v_str: Option<String> = row.get(3)?;
                let b_str: Option<String> = row.get(4)?;
                Ok(InventoryStockMovement {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                    product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                    variant_id: v_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    batch_id: b_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    movement_type: row.get(5)?,
                    quantity_change: row.get(6)?,
                    quantity_before: row.get(7)?,
                    quantity_after: row.get(8)?,
                    unit_cost_minor_units: row.get(9)?,
                    reference_type: row.get(10)?,
                    reference_id: row.get(11)?,
                    reason: row.get(12)?,
                    actor_id: row.get(13)?,
                    created_at: row.get(14)?,
                    product_name: row.get(15)?,
                    variant_name: row.get(16)?,
                    batch_number: row.get(17)?,
                })
            }).map_err(|e| AppError::Database(e.to_string()))?;

            for m in rows {
                movements.push(m.map_err(|e| AppError::Database(e.to_string()))?);
            }
        } else {
            let mut stmt = conn.prepare(query).map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt.query_map(params![ctx.gym_id.to_string(), limit], |row| {
                let v_str: Option<String> = row.get(3)?;
                let b_str: Option<String> = row.get(4)?;
                Ok(InventoryStockMovement {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                    product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                    variant_id: v_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    batch_id: b_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    movement_type: row.get(5)?,
                    quantity_change: row.get(6)?,
                    quantity_before: row.get(7)?,
                    quantity_after: row.get(8)?,
                    unit_cost_minor_units: row.get(9)?,
                    reference_type: row.get(10)?,
                    reference_id: row.get(11)?,
                    reason: row.get(12)?,
                    actor_id: row.get(13)?,
                    created_at: row.get(14)?,
                    product_name: row.get(15)?,
                    variant_name: row.get(16)?,
                    batch_number: row.get(17)?,
                })
            }).map_err(|e| AppError::Database(e.to_string()))?;

            for m in rows {
                movements.push(m.map_err(|e| AppError::Database(e.to_string()))?);
            }
        }

        Ok(movements)
    }

    // ==========================================
    // BATCHES & EXPIRY TRACKING
    // ==========================================
    pub fn list_batches(
        conn: &Connection,
        ctx: &AuthenticatedContext,
        product_id: Option<&Uuid>,
    ) -> Result<Vec<InventoryBatch>, AppError> {
        let query = if let Some(pid) = product_id {
            "SELECT b.id, b.gym_id, b.product_id, b.variant_id, b.supplier_id, b.batch_number,
                    b.manufactured_at, b.expires_at, b.received_quantity, b.available_quantity,
                    b.purchase_cost_minor_units, b.created_at, b.updated_at,
                    s.supplier_name, p.name AS product_name, v.variant_name
             FROM inventory_batches b
             JOIN inventory_products p ON b.product_id = p.id
             LEFT JOIN inventory_variants v ON b.variant_id = v.id
             LEFT JOIN inventory_suppliers s ON b.supplier_id = s.id
             WHERE b.gym_id = ?1 AND b.product_id = ?2
             ORDER BY b.expires_at ASC"
        } else {
            "SELECT b.id, b.gym_id, b.product_id, b.variant_id, b.supplier_id, b.batch_number,
                    b.manufactured_at, b.expires_at, b.received_quantity, b.available_quantity,
                    b.purchase_cost_minor_units, b.created_at, b.updated_at,
                    s.supplier_name, p.name AS product_name, v.variant_name
             FROM inventory_batches b
             JOIN inventory_products p ON b.product_id = p.id
             LEFT JOIN inventory_variants v ON b.variant_id = v.id
             LEFT JOIN inventory_suppliers s ON b.supplier_id = s.id
             WHERE b.gym_id = ?1
             ORDER BY b.expires_at ASC"
        };

        let mut batches = Vec::new();
        if let Some(pid) = product_id {
            let mut stmt = conn.prepare(query).map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt.query_map(params![ctx.gym_id.to_string(), pid.to_string()], |row| {
                let v_str: Option<String> = row.get(3)?;
                let s_str: Option<String> = row.get(4)?;
                Ok(InventoryBatch {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                    product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                    variant_id: v_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    supplier_id: s_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    batch_number: row.get(5)?,
                    manufactured_at: row.get(6)?,
                    expires_at: row.get(7)?,
                    received_quantity: row.get(8)?,
                    available_quantity: row.get(9)?,
                    purchase_cost_minor_units: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                    supplier_name: row.get(13)?,
                    product_name: row.get(14)?,
                    variant_name: row.get(15)?,
                })
            }).map_err(|e| AppError::Database(e.to_string()))?;

            for b in rows {
                batches.push(b.map_err(|e| AppError::Database(e.to_string()))?);
            }
        } else {
            let mut stmt = conn.prepare(query).map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt.query_map(params![ctx.gym_id.to_string()], |row| {
                let v_str: Option<String> = row.get(3)?;
                let s_str: Option<String> = row.get(4)?;
                Ok(InventoryBatch {
                    id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or_default(),
                    gym_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or_default(),
                    product_id: Uuid::parse_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                    variant_id: v_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    supplier_id: s_str.and_then(|s| Uuid::parse_str(&s).ok()),
                    batch_number: row.get(5)?,
                    manufactured_at: row.get(6)?,
                    expires_at: row.get(7)?,
                    received_quantity: row.get(8)?,
                    available_quantity: row.get(9)?,
                    purchase_cost_minor_units: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                    supplier_name: row.get(13)?,
                    product_name: row.get(14)?,
                    variant_name: row.get(15)?,
                })
            }).map_err(|e| AppError::Database(e.to_string()))?;

            for b in rows {
                batches.push(b.map_err(|e| AppError::Database(e.to_string()))?);
            }
        }

        Ok(batches)
    }

    // ==========================================
    // OVERVIEW STATS & ALERTS
    // ==========================================
    pub fn get_overview_stats(
        conn: &Connection,
        ctx: &AuthenticatedContext,
    ) -> Result<InventoryOverviewStats, AppError> {
        let total_products: i64 = conn.query_row(
            "SELECT COUNT(*) FROM inventory_products WHERE gym_id = ?1 AND status != 'ARCHIVED'",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        let total_units_in_stock: i64 = conn.query_row(
            "SELECT COALESCE(SUM(s.available_quantity), 0)
             FROM inventory_stock s
             JOIN inventory_products p ON s.product_id = p.id
             WHERE s.gym_id = ?1 AND p.status != 'ARCHIVED'",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        let out_of_stock_count: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT p.id)
             FROM inventory_products p
             LEFT JOIN inventory_stock s ON p.id = s.product_id AND s.gym_id = p.gym_id
             WHERE p.gym_id = ?1 AND p.status != 'ARCHIVED'
             GROUP BY p.id
             HAVING COALESCE(SUM(s.available_quantity), 0) <= 0",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        let low_stock_count: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT p.id)
             FROM inventory_products p
             JOIN inventory_stock s ON p.id = s.product_id AND s.gym_id = p.gym_id
             WHERE p.gym_id = ?1 AND p.status != 'ARCHIVED'
             GROUP BY p.id, p.low_stock_threshold
             HAVING COALESCE(SUM(s.available_quantity), 0) > 0 AND COALESCE(SUM(s.available_quantity), 0) <= p.low_stock_threshold",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        // Valuation: calculated as sum(available_quantity * cost_price_minor_units)
        let valuation_minor_units: i64 = conn.query_row(
            "SELECT COALESCE(SUM(
                s.available_quantity * COALESCE(v.cost_price_minor_units, p.cost_price_minor_units, 0)
             ), 0)
             FROM inventory_stock s
             JOIN inventory_products p ON s.product_id = p.id
             LEFT JOIN inventory_variants v ON s.variant_id = v.id
             WHERE s.gym_id = ?1 AND p.status != 'ARCHIVED' AND s.available_quantity > 0",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        let expired_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM inventory_batches
             WHERE gym_id = ?1 AND available_quantity > 0 AND expires_at IS NOT NULL AND date(expires_at) < date('now')",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        let expiring_soon_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM inventory_batches
             WHERE gym_id = ?1 AND available_quantity > 0 AND expires_at IS NOT NULL
               AND date(expires_at) >= date('now') AND date(expires_at) <= date('now', '+30 days')",
            params![ctx.gym_id.to_string()],
            |r| r.get(0),
        ).unwrap_or(0);

        Ok(InventoryOverviewStats {
            total_products,
            total_units_in_stock,
            low_stock_count,
            out_of_stock_count,
            expiring_soon_count,
            expired_count,
            valuation_minor_units,
        })
    }
}
