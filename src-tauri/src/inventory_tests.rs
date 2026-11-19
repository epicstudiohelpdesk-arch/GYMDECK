#[cfg(test)]
mod inventory_tests {
    use rusqlite::Connection;
    use serde_json::json;
    use uuid::Uuid;

    use crate::database::migration::ensure_schema;
    use crate::errors::AppError;
    use crate::models::user::AuthenticatedContext;
    use crate::repositories::inventory_repo::InventoryRepository;
    use crate::services::image_storage::ImageStorageService;

    fn ctx(gym: Uuid, user: Uuid) -> AuthenticatedContext {
        AuthenticatedContext {
            session_id: Uuid::new_v4(),
            user_id: user,
            gym_id: gym,
            role: "OWNER".into(),
            permissions: vec![],
        }
    }

    fn seed_gyms(conn: &Connection, ga: Uuid, gb: Uuid, ua: Uuid, ub: Uuid) {
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Gym Alpha', ?2)",
            rusqlite::params![ga.to_string(), ua.to_string()],
        ).unwrap();
        conn.execute(
            "INSERT INTO gyms (id, name, owner_user_id) VALUES (?1, 'Gym Beta', ?2)",
            rusqlite::params![gb.to_string(), ub.to_string()],
        ).unwrap();
    }

    #[test]
    fn test_inventory_full_lifecycle_and_tenant_isolation() {
        let dir = std::env::temp_dir().join(format!("gymdeck_inv_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("vault.sqlite");

        let (ga, gb, ua, ub) = (Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4(), Uuid::new_v4());
        let ctx_a = ctx(ga, ua);
        let ctx_b = ctx(gb, ub);

        let mut conn = Connection::open(&db_path).unwrap();
        ensure_schema(&conn).unwrap();
        seed_gyms(&conn, ga, gb, ua, ub);

        // 1. Categories
        let cat_a = InventoryRepository::create_category(&conn, &ctx_a, "Supplements", Some("Proteins & Creatine"), Some("pill")).unwrap();
        assert_eq!(cat_a.name, "Supplements");
        assert_eq!(cat_a.gym_id, ga);

        // Gym B cannot see Gym A category
        let cats_b = InventoryRepository::list_categories(&conn, &ctx_b).unwrap();
        assert!(cats_b.is_empty());

        let cats_a = InventoryRepository::list_categories(&conn, &ctx_a).unwrap();
        assert_eq!(cats_a.len(), 1);

        // 2. Suppliers
        let sup_a = InventoryRepository::create_supplier(
            &conn,
            &ctx_a,
            "Apex Nutrition Corp",
            Some("Rajesh Kumar"),
            Some("+91 98765 43210"),
            Some("sales@apexnutri.com"),
            Some("Sector 18, Gurugram"),
            Some("07AAAAA0000A1Z5"),
            Some("Primary protein distributor"),
        ).unwrap();
        assert_eq!(sup_a.supplier_name, "Apex Nutrition Corp");

        // Gym B cannot see Gym A suppliers
        let sups_b = InventoryRepository::list_suppliers(&conn, &ctx_b).unwrap();
        assert!(sups_b.is_empty());

        // 3. Product creation with initial opening stock
        let prod_payload = json!({
            "name": "Gold Whey Isolate 1kg",
            "brand": "Optimum Elite",
            "categoryId": cat_a.id.to_string(),
            "sku": "OPT-WHEY-1KG",
            "barcode": "8901234567890",
            "shortDescription": "100% Pure Whey Isolate 30g protein",
            "costPriceMinorUnits": 220000, // Rs 2,200.00
            "sellingPriceMinorUnits": 320000, // Rs 3,200.00
            "mrpMinorUnits": 380000, // Rs 3,800.00
            "initialStock": 15,
            "lowStockThreshold": 5,
            "status": "ACTIVE",
            "storeVisibility": "VISIBLE"
        });

        let prod = InventoryRepository::create_product(&mut conn, &ctx_a, &prod_payload, Some(&dir)).unwrap();
        assert_eq!(prod.name, "Gold Whey Isolate 1kg");
        assert_eq!(prod.available_quantity, 15);
        assert_eq!(prod.selling_price_minor_units, 320000);

        // 4. Verify opening stock movement was recorded atomically
        let movements = InventoryRepository::list_movements(&conn, &ctx_a, Some(&prod.id), 10).unwrap();
        assert_eq!(movements.len(), 1);
        assert_eq!(movements[0].movement_type, "OPENING");
        assert_eq!(movements[0].quantity_change, 15);
        assert_eq!(movements[0].quantity_after, 15);

        // 5. Tenant Isolation Check on Products
        let prod_b_view = InventoryRepository::get_product(&conn, &ctx_b, &prod.id, Some(&dir)).unwrap();
        assert!(prod_b_view.is_none(), "Gym B must not be able to get Gym A's product");

        let prods_b = InventoryRepository::list_products(&conn, &ctx_b, Some(&dir)).unwrap();
        assert!(prods_b.is_empty(), "Gym B must have 0 products");

        // Cross-gym edit attempt must be rejected
        let update_attempt = json!({ "name": "Hacked Product" });
        let edit_err = InventoryRepository::update_product(&mut conn, &ctx_b, &prod.id, &update_attempt, Some(&dir));
        assert!(matches!(edit_err, Err(AppError::Unauthorized)));

        // 6. Stock Receipts with Batch and Expiry
        let receive_payload = json!({
            "productId": prod.id.to_string(),
            "supplierId": sup_a.id.to_string(),
            "quantity": 10,
            "unitCostMinorUnits": 215000,
            "referenceNumber": "PO-2026-089",
            "batchNumber": "BATCH-2026-X1",
            "expiresAt": "2027-12-31",
            "notes": "Delivered in fresh condition"
        });

        let r_mvt = InventoryRepository::receive_stock(&mut conn, &ctx_a, &receive_payload).unwrap();
        assert_eq!(r_mvt.quantity_change, 10);
        assert_eq!(r_mvt.quantity_before, 15);
        assert_eq!(r_mvt.quantity_after, 25);

        // Re-read product and verify available quantity
        let updated_prod = InventoryRepository::get_product(&conn, &ctx_a, &prod.id, Some(&dir)).unwrap().unwrap();
        assert_eq!(updated_prod.available_quantity, 25);

        // 7. Stock Adjustments (Physical count correction & negative damage)
        let adj_pos = json!({
            "productId": prod.id.to_string(),
            "movementType": "ADJUSTMENT_ADD",
            "quantityChange": 2,
            "reason": "Physical count surplus"
        });
        let adj_mvt = InventoryRepository::adjust_stock(&mut conn, &ctx_a, &adj_pos).unwrap();
        assert_eq!(adj_mvt.quantity_after, 27);

        let adj_neg = json!({
            "productId": prod.id.to_string(),
            "movementType": "DAMAGE",
            "quantityChange": -1,
            "reason": "Damaged seal during shelf handling"
        });
        let neg_mvt = InventoryRepository::adjust_stock(&mut conn, &ctx_a, &adj_neg).unwrap();
        assert_eq!(neg_mvt.quantity_after, 26);

        // Negative adjustment without reason must be rejected
        let invalid_neg = json!({
            "productId": prod.id.to_string(),
            "quantityChange": -1,
            "reason": ""
        });
        assert!(InventoryRepository::adjust_stock(&mut conn, &ctx_a, &invalid_neg).is_err());

        // Excessive negative adjustment resulting in negative balance must be rejected
        let excessive_neg = json!({
            "productId": prod.id.to_string(),
            "quantityChange": -100,
            "reason": "Total loss"
        });
        assert!(InventoryRepository::adjust_stock(&mut conn, &ctx_a, &excessive_neg).is_err());

        // 8. Overview Stats & Valuation Integrity
        let stats = InventoryRepository::get_overview_stats(&conn, &ctx_a).unwrap();
        assert_eq!(stats.total_products, 1);
        assert_eq!(stats.total_units_in_stock, 26);
        assert_eq!(stats.out_of_stock_count, 0);
        assert_eq!(stats.low_stock_count, 0);
        // Valuation = 26 units * 215000 paise = 5590000 paise (Rs 55,900.00)
        assert_eq!(stats.valuation_minor_units, 26 * 215000);

        // Gym B overview stats must be zero
        let stats_b = InventoryRepository::get_overview_stats(&conn, &ctx_b).unwrap();
        assert_eq!(stats_b.total_products, 0);
        assert_eq!(stats_b.total_units_in_stock, 0);
        assert_eq!(stats_b.valuation_minor_units, 0);

        // 9. Product Archive and Unarchive
        InventoryRepository::archive_product(&conn, &ctx_a, &prod.id).unwrap();
        let archived = InventoryRepository::get_product(&conn, &ctx_a, &prod.id, Some(&dir)).unwrap().unwrap();
        assert_eq!(archived.status, "ARCHIVED");
        assert_eq!(archived.store_visibility, "HIDDEN");

        InventoryRepository::unarchive_product(&conn, &ctx_a, &prod.id).unwrap();
        let unarchived = InventoryRepository::get_product(&conn, &ctx_a, &prod.id, Some(&dir)).unwrap().unwrap();
        assert_eq!(unarchived.status, "ACTIVE");

        // 10. Clean up test dir
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_image_storage_isolation_and_security() {
        let dir = std::env::temp_dir().join(format!("gymdeck_img_test_{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        let ga = Uuid::new_v4();
        let gb = Uuid::new_v4();
        let pid = Uuid::new_v4();

        // 1x1 valid PNG bytes
        let valid_png: Vec<u8> = vec![
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48,
            0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00,
            0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78,
            0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
        ];

        // Valid upload
        let (key, mime, size, w, h, path) = ImageStorageService::save_image(&dir, &ga, &pid, "product.png", &valid_png).unwrap();
        assert!(key.starts_with(&format!("{}/", ga)));
        assert_eq!(mime, "image/png");
        assert_eq!(size, valid_png.len() as i64);
        assert_eq!(w, 1);
        assert_eq!(h, 1);
        assert!(path.exists());

        // Gym B attempts to resolve or delete Gym A's image key -> MUST FAIL with Unauthorized
        assert!(ImageStorageService::resolve_image_path(&dir, &gb, &key).is_err());
        assert!(ImageStorageService::delete_image(&dir, &gb, &key).is_err());

        // Directory traversal attempt in storage key -> MUST FAIL
        let traversal_key = format!("{}/../../etc/passwd", ga);
        assert!(ImageStorageService::resolve_image_path(&dir, &ga, &traversal_key).is_err());

        // Invalid fake image data -> MUST FAIL
        let fake_data = b"NOT AN IMAGE FILE AT ALL";
        assert!(ImageStorageService::save_image(&dir, &ga, &pid, "fake.jpg", fake_data).is_err());

        // Proper deletion by Gym A
        ImageStorageService::delete_image(&dir, &ga, &key).unwrap();
        assert!(!path.exists());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
