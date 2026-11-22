use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::models::user::AuthenticatedContext;
use crate::repositories::inventory_repo::InventoryRepository;
use crate::services::image_storage::ImageStorageService;

async fn get_auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
    if let Some((user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(AuthenticatedContext {
            session_id: Uuid::new_v4(),
            user_id,
            gym_id,
            role: "OWNER".into(),
            permissions: vec![],
        });
    }

    let (user_id, gym_id) = state.session_manager.restore_session().await?;
    Ok(AuthenticatedContext {
        session_id: Uuid::new_v4(),
        user_id,
        gym_id,
        role: "OWNER".into(),
        permissions: vec![],
    })
}

fn take_result<T: Clone>(slot: &Arc<Mutex<Option<T>>>, label: &str) -> Result<T, AppError> {
    slot.lock()
        .map_err(|_| AppError::Database("Write result lock poisoned".into()))?
        .clone()
        .ok_or_else(|| AppError::Database(format!("Write produced no {} result", label)))
}

// ==========================================
// CATEGORIES
// ==========================================

#[tauri::command]
pub async fn list_inventory_categories_command(
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let categories = InventoryRepository::list_categories(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": categories }))
}

#[tauri::command]
pub async fn create_inventory_category_command(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    icon: Option<String>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let cat = InventoryRepository::create_category(
            conn,
            &ctx,
            &name,
            description.as_deref(),
            icon.as_deref(),
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(cat);
        Ok(())
    })).await?;

    let cat = take_result(&slot, "category")?;
    Ok(json!({ "success": true, "data": cat }))
}

#[tauri::command]
pub async fn update_inventory_category_command(
    state: State<'_, AppState>,
    id: Uuid,
    name: String,
    description: Option<String>,
    icon: Option<String>,
    is_active: bool,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let cat = InventoryRepository::update_category(
            conn,
            &ctx,
            &id,
            &name,
            description.as_deref(),
            icon.as_deref(),
            is_active,
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(cat);
        Ok(())
    })).await?;

    let cat = take_result(&slot, "category")?;
    Ok(json!({ "success": true, "data": cat }))
}

// ==========================================
// SUPPLIERS
// ==========================================

#[tauri::command]
pub async fn list_inventory_suppliers_command(
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let suppliers = InventoryRepository::list_suppliers(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": suppliers }))
}

#[tauri::command]
pub async fn create_inventory_supplier_command(
    state: State<'_, AppState>,
    supplier_name: String,
    contact_person: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    gstin: Option<String>,
    notes: Option<String>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let supplier = InventoryRepository::create_supplier(
            conn,
            &ctx,
            &supplier_name,
            contact_person.as_deref(),
            phone.as_deref(),
            email.as_deref(),
            address.as_deref(),
            gstin.as_deref(),
            notes.as_deref(),
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(supplier);
        Ok(())
    })).await?;

    let supplier = take_result(&slot, "supplier")?;
    Ok(json!({ "success": true, "data": supplier }))
}

#[tauri::command]
pub async fn update_inventory_supplier_command(
    state: State<'_, AppState>,
    id: Uuid,
    supplier_name: String,
    contact_person: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    gstin: Option<String>,
    notes: Option<String>,
    is_active: bool,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let supplier = InventoryRepository::update_supplier(
            conn,
            &ctx,
            &id,
            &supplier_name,
            contact_person.as_deref(),
            phone.as_deref(),
            email.as_deref(),
            address.as_deref(),
            gstin.as_deref(),
            notes.as_deref(),
            is_active,
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(supplier);
        Ok(())
    })).await?;

    let supplier = take_result(&slot, "supplier")?;
    Ok(json!({ "success": true, "data": supplier }))
}

// ==========================================
// PRODUCTS
// ==========================================

#[tauri::command]
pub async fn list_inventory_products_command(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let app_data_dir = app.path().app_data_dir().ok();
    let products = InventoryRepository::list_products(&conn, &ctx, app_data_dir.as_deref())?;
    Ok(json!({ "success": true, "data": products }))
}

#[tauri::command]
pub async fn get_inventory_product_command(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let app_data_dir = app.path().app_data_dir().ok();
    let product = InventoryRepository::get_product(&conn, &ctx, &id, app_data_dir.as_deref())?;
    Ok(json!({ "success": true, "data": product }))
}

#[tauri::command]
pub async fn create_inventory_product_command(
    app: AppHandle,
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let app_data_dir = app.path().app_data_dir().ok();
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let product = InventoryRepository::create_product(
            conn,
            &ctx,
            &payload,
            app_data_dir.as_deref(),
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(product);
        Ok(())
    })).await?;

    let product = take_result(&slot, "product")?;
    Ok(json!({ "success": true, "data": product }))
}

#[tauri::command]
pub async fn update_inventory_product_command(
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let app_data_dir = app.path().app_data_dir().ok();
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let product = InventoryRepository::update_product(
            conn,
            &ctx,
            &id,
            &payload,
            app_data_dir.as_deref(),
        )?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(product);
        Ok(())
    })).await?;

    let product = take_result(&slot, "product")?;
    Ok(json!({ "success": true, "data": product }))
}

#[tauri::command]
pub async fn archive_inventory_product_command(
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    state.async_db.dispatch_write(Box::new(move |conn| {
        InventoryRepository::archive_product(conn, &ctx, &id)
    })).await?;

    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn unarchive_inventory_product_command(
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    state.async_db.dispatch_write(Box::new(move |conn| {
        InventoryRepository::unarchive_product(conn, &ctx, &id)
    })).await?;

    Ok(json!({ "success": true }))
}

// ==========================================
// IMAGES
// ==========================================

#[tauri::command]
pub async fn upload_inventory_product_image_command(
    app: AppHandle,
    state: State<'_, AppState>,
    product_id: Uuid,
    filename: String,
    base64_data: String,
    is_primary: bool,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Database(format!("Failed to resolve app data dir: {}", e)))?;

    // Clean base64 header if present (e.g. data:image/png;base64,...)
    let clean_base64 = if let Some(idx) = base64_data.find(";base64,") {
        &base64_data[idx + 8..]
    } else {
        &base64_data
    };

    use base64::Engine;
    let decoded_bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| AppError::Configuration(format!("Invalid base64 image data: {}", e)))?;

    // Save image atomically to gym's isolated directory
    let (storage_key, mime_type, file_size, width, height, final_path) =
        ImageStorageService::save_image(
            &app_data_dir,
            &ctx.gym_id,
            &product_id,
            &filename,
            &decoded_bytes,
        )?;

    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);
    let s_key = storage_key.clone();
    let f_name = filename.clone();
    let m_type = mime_type.clone();
    let path_clone = final_path.clone();

    state.async_db.dispatch_write(Box::new(move |conn| {
        let mut img = InventoryRepository::add_product_image_record(
            conn,
            &ctx,
            &product_id,
            &s_key,
            &f_name,
            &m_type,
            file_size,
            width,
            height,
            is_primary,
        )?;
        img.local_path = Some(path_clone.to_string_lossy().to_string());
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(img);
        Ok(())
    })).await?;

    let mut img = take_result(&slot, "product image")?;
    img.local_path = Some(final_path.to_string_lossy().to_string());
    Ok(json!({ "success": true, "data": img }))
}

#[tauri::command]
pub async fn delete_inventory_product_image_command(
    app: AppHandle,
    state: State<'_, AppState>,
    image_id: Uuid,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Database(format!("Failed to resolve app data dir: {}", e)))?;

    let slot = Arc::new(Mutex::new(None::<String>));
    let captured = Arc::clone(&slot);
    let ctx_clone = ctx.clone();

    state.async_db.dispatch_write(Box::new(move |conn| {
        let storage_key = InventoryRepository::delete_product_image_record(conn, &ctx_clone, &image_id)?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(storage_key);
        Ok(())
    })).await?;

    let storage_key = take_result(&slot, "storage_key")?;
    let _ = ImageStorageService::delete_image(&app_data_dir, &ctx.gym_id, &storage_key);

    Ok(json!({ "success": true }))
}

#[tauri::command]
pub async fn read_inventory_product_image_data_command(
    app: AppHandle,
    state: State<'_, AppState>,
    storage_key: String,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Database(format!("Failed to resolve app data dir: {}", e)))?;

    let path = ImageStorageService::resolve_image_path(&app_data_dir, &ctx.gym_id, &storage_key)?;
    if !path.exists() {
        return Err(AppError::Configuration("Image file not found on disk".into()));
    }

    let bytes = std::fs::read(&path)
        .map_err(|e| AppError::Database(format!("Failed to read image file: {}", e)))?;

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let mime = if path.extension().and_then(|e| e.to_str()) == Some("png") {
        "image/png"
    } else if path.extension().and_then(|e| e.to_str()) == Some("webp") {
        "image/webp"
    } else {
        "image/jpeg"
    };

    let data_url = format!("data:{};base64,{}", mime, b64);
    Ok(json!({ "success": true, "data": data_url }))
}

#[tauri::command]
pub async fn set_primary_inventory_product_image_command(
    state: State<'_, AppState>,
    image_id: Uuid,
    product_id: Uuid,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    state.async_db.dispatch_write(Box::new(move |conn| {
        InventoryRepository::set_primary_product_image(conn, &ctx, &image_id, &product_id)
    })).await?;

    Ok(json!({ "success": true }))
}

// ==========================================
// STOCK & MOVEMENTS
// ==========================================

#[tauri::command]
pub async fn receive_inventory_stock_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let mvt = InventoryRepository::receive_stock(conn, &ctx, &payload)?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(mvt);
        Ok(())
    })).await?;

    let mvt = take_result(&slot, "stock receipt")?;
    Ok(json!({ "success": true, "data": mvt }))
}

#[tauri::command]
pub async fn adjust_inventory_stock_command(
    state: State<'_, AppState>,
    payload: Value,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let slot = Arc::new(Mutex::new(None));
    let captured = Arc::clone(&slot);

    state.async_db.dispatch_write(Box::new(move |conn| {
        let mvt = InventoryRepository::adjust_stock(conn, &ctx, &payload)?;
        *captured.lock().map_err(|_| AppError::Database("Lock poisoned".into()))? = Some(mvt);
        Ok(())
    })).await?;

    let mvt = take_result(&slot, "stock adjustment")?;
    Ok(json!({ "success": true, "data": mvt }))
}

#[tauri::command]
pub async fn list_inventory_stock_movements_command(
    state: State<'_, AppState>,
    product_id: Option<Uuid>,
    limit: Option<i64>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let movements = InventoryRepository::list_movements(
        &conn,
        &ctx,
        product_id.as_ref(),
        limit.unwrap_or(100),
    )?;
    Ok(json!({ "success": true, "data": movements }))
}

#[tauri::command]
pub async fn list_inventory_batches_command(
    state: State<'_, AppState>,
    product_id: Option<Uuid>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let batches = InventoryRepository::list_batches(&conn, &ctx, product_id.as_ref())?;
    Ok(json!({ "success": true, "data": batches }))
}

// ==========================================
// OVERVIEW STATS
// ==========================================

#[tauri::command]
pub async fn get_inventory_overview_stats_command(
    state: State<'_, AppState>,
) -> Result<Value, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    let stats = InventoryRepository::get_overview_stats(&conn, &ctx)?;
    Ok(json!({ "success": true, "data": stats }))
}
