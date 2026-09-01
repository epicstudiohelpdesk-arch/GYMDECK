use tauri::{State, Manager};
use crate::commands::auth_commands::AppState;
use crate::models::gym_business::{Member, MembershipPlan, MemberDocument};
use crate::models::user::AuthenticatedContext;
use crate::repositories::member_repo::MemberRepository;
use crate::repositories::plan_repo::PlanRepository;
use crate::repositories::sync_repo::SyncRepository;
use crate::errors::AppError;
use uuid::Uuid;
use base64::Engine;

async fn get_auth_context(state: &State<'_, AppState>) -> Result<AuthenticatedContext, AppError> {
    // 1. Check in-memory session first (Optimized, no keyring access)
    if let Some((user_id, gym_id)) = state.session_manager.get_active_session().await {
        return Ok(AuthenticatedContext {
            session_id: Uuid::new_v4(), // Placeholder
            user_id,
            gym_id,
            role: "OWNER".into(),
            permissions: vec![],
        });
    }

    // 2. Fallback to restore from keyring (Decryption & Trust validation)
    let (user_id, gym_id) = state.session_manager.restore_session().await?;
    
    Ok(AuthenticatedContext {
        session_id: Uuid::new_v4(), // Placeholder
        user_id,
        gym_id,
        role: "OWNER".into(),
        permissions: vec![],
    })
}

#[tauri::command]
pub async fn get_members_command(
    state: State<'_, AppState>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Member>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    MemberRepository::get_members(&conn, &ctx, limit, offset)
}

#[tauri::command]
pub async fn get_past_members_command(
    state: State<'_, AppState>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Member>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    MemberRepository::get_past_members(&conn, &ctx, limit, offset)
}

#[tauri::command]
pub async fn get_member_documents_command(
    state: State<'_, AppState>,
    member_id: Uuid,
) -> Result<Vec<MemberDocument>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    let result = MemberRepository::get_member_documents(&conn, &ctx, &member_id);
    
    result
}

fn optimize_uploaded_documents(documents: &mut Vec<MemberDocument>) {
    for doc in documents.iter_mut() {
        // Only run optimizer if document crosses 200kb size
        if doc.file_content.len() > 200 * 1024 
            && (doc.doc_name.to_lowercase().ends_with(".pdf") || doc.file_content.starts_with(b"%PDF")) 
        {
            tracing::info!(
                "GymDeck PDF Optimizer: Found PDF document '{}' exceeding 200KB ({} bytes). Launching compression...",
                doc.doc_name, doc.file_content.len()
            );
            match crate::utils::pdf_optimizer::PdfOptimizer::optimize(&doc.file_content) {
                Ok(optimized_bytes) => {
                    if optimized_bytes.len() < doc.file_content.len() {
                        let original_len = doc.file_content.len();
                        let optimized_len = optimized_bytes.len();
                        doc.file_size = Some(format!("{:.1} KB", optimized_len as f64 / 1024.0));
                        doc.file_content = optimized_bytes;
                        tracing::info!(
                            "GymDeck PDF Optimizer: Compressed '{}' successfully from {} to {} bytes.",
                            doc.doc_name, original_len, optimized_len
                        );
                    } else {
                        tracing::info!(
                            "GymDeck PDF Optimizer: Compressed '{}' but size did not decrease. Retaining original.",
                            doc.doc_name
                        );
                    }
                }
                Err(e) => {
                    tracing::error!("GymDeck PDF Optimizer: Failed to compress document '{}': {:?}", doc.doc_name, e);
                }
            }
        }
    }
}

#[tauri::command]
pub async fn create_member_command(
    state: State<'_, AppState>,
    member: Member,
    mut documents: Vec<MemberDocument>,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // Perform background PDF optimization if needed
    optimize_uploaded_documents(&mut documents);
    
    // Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        // 1. Create Member
        MemberRepository::create_member(&tx, &ctx, &member)?;
        
        // 2. Save Documents
        for doc in documents {
            MemberRepository::save_document(&tx, &ctx, &doc)?;
        }
        
        // 3. Atomically Enqueue Outbox Event
        let payload = serde_json::to_string(&member).unwrap_or_else(|_| "{}".to_string());
        SyncRepository::enqueue_outbox_event(&tx, &ctx.gym_id, "gym_member", &member.id, "CREATE", &payload)?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn soft_delete_member_command(
    state: State<'_, AppState>,
    member_id: Uuid,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        MemberRepository::soft_delete_member(&tx, &ctx, &member_id)?;
        
        // Atomically Enqueue Outbox Event
        SyncRepository::enqueue_outbox_event(&tx, &ctx.gym_id, "gym_member", &member_id, "DELETE", "{}")?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn permanent_delete_member_command(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    member_id: Uuid,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // 1. Delete associated profile photos from the local filesystem
    if let Ok(app_dir) = app.path().app_data_dir() {
        let photos_dir = app_dir.join("photos");
        if photos_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&photos_dir) {
                let id_prefix = format!("{}_", member_id);
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.starts_with(&id_prefix) {
                            let _ = std::fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }
    }
    
    // 2. Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks for database deletion
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        MemberRepository::permanent_delete_member(&tx, &ctx, &member_id)?;
        
        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn permanent_delete_members_command(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    member_ids: Vec<Uuid>,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // 1. Delete associated profile photos from the local filesystem
    if let Ok(app_dir) = app.path().app_data_dir() {
        let photos_dir = app_dir.join("photos");
        if photos_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&photos_dir) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        for member_id in &member_ids {
                            let id_prefix = format!("{}_", member_id);
                            if name.starts_with(&id_prefix) {
                                let _ = std::fs::remove_file(entry.path());
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 2. Dispatch to the dedicated write-worker to avoid SQLITE_BUSY deadlocks for database deletion
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        for member_id in &member_ids {
            MemberRepository::permanent_delete_member(&tx, &ctx, member_id)?;
        }
        
        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn get_plans_command(
    state: State<'_, AppState>,
) -> Result<Vec<MembershipPlan>, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    PlanRepository::get_plans(&conn, &ctx)
}

#[tauri::command]
pub async fn create_plan_command(
    state: State<'_, AppState>,
    plan: MembershipPlan,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        PlanRepository::create_plan(&tx, &ctx, &plan)?;
        
        let payload = serde_json::to_string(&plan).unwrap_or_else(|_| "{}".to_string());
        SyncRepository::enqueue_outbox_event(&tx, &ctx.gym_id, "membership_plan", &plan.id, "CREATE", &payload)?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn delete_plan_command(
    state: State<'_, AppState>,
    plan_id: String,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    let plan_uuid = Uuid::parse_str(&plan_id).unwrap_or_default();
    
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        PlanRepository::delete_plan(&tx, &ctx, &plan_id)?;
        
        SyncRepository::enqueue_outbox_event(&tx, &ctx.gym_id, "membership_plan", &plan_uuid, "DELETE", "{}")?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn save_member_documents_command(
    state: State<'_, AppState>,
    member_id: Uuid,
    mut documents: Vec<MemberDocument>,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    // Perform background PDF optimization if needed
    optimize_uploaded_documents(&mut documents);
    
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        // 1. Save new documents
        for doc in &documents {
            MemberRepository::save_document(&tx, &ctx, doc)?;
        }
        
        // 2. Query all document names for this member to rebuild the list
        let mut doc_names = Vec::new();
        {
            let mut stmt = tx.prepare(
                "SELECT doc_name FROM member_documents WHERE member_id = ?1 AND gym_id = ?2"
            ).map_err(|e| AppError::Database(e.to_string()))?;
            
            let doc_name_iter = stmt.query_map(
                rusqlite::params![member_id.to_string(), ctx.gym_id.to_string()],
                |row| row.get::<_, String>(0)
            ).map_err(|e| AppError::Database(e.to_string()))?;
            
            for name_res in doc_name_iter {
                if let Ok(name) = name_res {
                    if !doc_names.contains(&name) {
                        doc_names.push(name);
                    }
                }
            }
        }
        
        // 3. Update the member's notes field (documents index list)
        let notes_val = doc_names.join(", ");
        tx.execute(
            "UPDATE gym_members SET notes = ?1, updated_at = ?2 WHERE id = ?3 AND gym_id = ?4",
            rusqlite::params![
                notes_val,
                chrono::Utc::now().to_rfc3339(),
                member_id.to_string(),
                ctx.gym_id.to_string(),
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;
        
        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn update_member_command(
    state: State<'_, AppState>,
    member: Member,
) -> Result<(), AppError> {
    let ctx = get_auth_context(&state).await?;
    
    state.async_db.dispatch_write(Box::new(move |conn| {
        let tx = conn.transaction().map_err(|e| AppError::Database(e.to_string()))?;
        
        MemberRepository::update_member(&tx, &ctx, &member)?;
        
        let payload = serde_json::to_string(&member).unwrap_or_else(|_| "{}".to_string());
        SyncRepository::enqueue_outbox_event(&tx, &ctx.gym_id, "gym_member", &member.id, "UPDATE", &payload)?;

        tx.commit().map_err(|e| AppError::Database(e.to_string()))
    })).await
}

#[tauri::command]
pub async fn download_document_command(
    filename: String,
    base64_data: String,
) -> Result<(), AppError> {
    // 1. Extract raw base64 data by stripping dataurl prefix if present
    let clean_base64 = if let Some(index) = base64_data.find(',') {
        &base64_data[index + 1..]
    } else {
        &base64_data
    };
    
    let decoded_bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| AppError::Database(format!("Invalid base64 data: {}", e)))?;
        
    // 2. Open file dialog to save
    let file_path = rfd::FileDialog::new()
        .set_file_name(&filename)
        .save_file();
        
    if let Some(path) = file_path {
        std::fs::write(&path, &decoded_bytes)
            .map_err(|e| AppError::Database(format!("Failed to save file: {}", e)))?;
        Ok(())
    } else {
        Err(AppError::Database("Download cancelled".into()))
    }
}

#[tauri::command]
pub async fn upload_photo_command(
    app: tauri::AppHandle,
    member_id: String,
    filename: String,
    base64_data: String,
) -> Result<String, AppError> {
    let clean_base64 = if let Some(index) = base64_data.find(',') {
        &base64_data[index + 1..]
    } else {
        &base64_data
    };

    let decoded_bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| AppError::Database(format!("Invalid base64 data: {}", e)))?;

    let app_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Database(format!("Failed to get app data dir: {}", e)))?;
    let photos_dir = app_dir.join("photos");
    std::fs::create_dir_all(&photos_dir)
        .map_err(|e| AppError::Database(format!("Failed to create photos dir: {}", e)))?;

    let ext = if filename.to_lowercase().ends_with(".png") { "png" }
              else if filename.to_lowercase().ends_with(".jpg") || filename.to_lowercase().ends_with(".jpeg") { "jpg" }
              else { "webp" };
    let photo_filename = format!("{}_{}.{}", member_id, chrono::Utc::now().timestamp(), ext);
    let photo_path = photos_dir.join(&photo_filename);

    std::fs::write(&photo_path, &decoded_bytes)
        .map_err(|e| AppError::Database(format!("Failed to save photo: {}", e)))?;

    Ok(photo_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_document_temp_path_command(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    document_id: Uuid,
) -> Result<String, AppError> {
    let ctx = get_auth_context(&state).await?;
    let conn = state.db.pool.get().map_err(|e| AppError::Database(e.to_string()))?;
    
    // Query the document name and content from SQLite
    let mut stmt = conn.prepare(
        "SELECT doc_name, file_content FROM member_documents WHERE id = ?1 AND gym_id = ?2"
    ).map_err(|e| AppError::Database(e.to_string()))?;
    
    let (doc_name, file_content): (String, Vec<u8>) = stmt.query_row(
        rusqlite::params![document_id.to_string(), ctx.gym_id.to_string()],
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| AppError::Database(e.to_string()))?;
    
    // Detect binary headers to resolve proper extension
    let ext = if doc_name.to_lowercase().ends_with(".pdf") || file_content.starts_with(b"%PDF") {
        "pdf"
    } else if file_content.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "jpg"
    } else if file_content.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "png"
    } else {
        "bin"
    };
    
    // Resolve app cache path and create directory if missing
    let cache_dir = app.path().app_cache_dir()
        .map_err(|e| AppError::Database(format!("Failed to get cache dir: {}", e)))?;
    let temp_docs_dir = cache_dir.join("temp_docs");
    std::fs::create_dir_all(&temp_docs_dir)
        .map_err(|e| AppError::Database(format!("Failed to create temp_docs dir: {}", e)))?;
        
    let temp_file_path = temp_docs_dir.join(format!("{}.{}", document_id, ext));
    std::fs::write(&temp_file_path, &file_content)
        .map_err(|e| AppError::Database(format!("Failed to write temp document: {}", e)))?;
        
    Ok(temp_file_path.to_string_lossy().to_string())
}
