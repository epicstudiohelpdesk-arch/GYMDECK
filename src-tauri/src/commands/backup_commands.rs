use tauri::State;
use crate::commands::auth_commands::AppState;
use crate::errors::AppError;
use crate::backup::{
    BackupEngine, BackupVerifier, RestoreEngine,
    BackupMetadata, BackupVerificationResult, RestoreValidationReport,
};
use crate::config::AppConfig;

#[tauri::command]
pub async fn create_backup_command(
    state: State<'_, AppState>,
) -> Result<BackupMetadata, AppError> {
    let app_config = AppConfig::from_env()?;
    let db_path = state.db.db_path.clone();
    let backup_dir = db_path.parent()
        .unwrap_or(&std::path::PathBuf::from("."))
        .join("backups");

    let pool = state.db.pool.clone();
    let conn = pool.get().map_err(|e| AppError::Database(format!("Failed to get connection: {}", e)))?;

    BackupEngine::create_encrypted_backup(&conn, &backup_dir, &app_config.db_encryption_key)
}

#[tauri::command]
pub async fn list_backups_command(
    state: State<'_, AppState>,
) -> Result<Vec<BackupMetadata>, AppError> {
    let db_path = state.db.db_path.clone();
    let backup_dir = db_path.parent()
        .unwrap_or(&std::path::PathBuf::from("."))
        .join("backups");

    BackupEngine::list_backups(&backup_dir)
}

#[tauri::command]
pub async fn verify_backup_command(
    file_name: String,
    state: State<'_, AppState>,
) -> Result<BackupVerificationResult, AppError> {
    // Sanitize filename to prevent directory traversal
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err(AppError::Backup("Invalid backup filename pattern".to_string()));
    }

    let app_config = AppConfig::from_env()?;
    let db_path = state.db.db_path.clone();
    let backup_path = db_path.parent()
        .unwrap_or(&std::path::PathBuf::from("."))
        .join("backups")
        .join(&file_name);

    BackupVerifier::verify_backup_file(&backup_path, &app_config.db_encryption_key, &file_name)
}

#[tauri::command]
pub async fn verify_restore_command(
    file_name: String,
    current_live_seq: i64,
    state: State<'_, AppState>,
) -> Result<RestoreValidationReport, AppError> {
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err(AppError::Restore("Invalid backup filename pattern".to_string()));
    }

    let app_config = AppConfig::from_env()?;
    let db_path = state.db.db_path.clone();
    let backup_path = db_path.parent()
        .unwrap_or(&std::path::PathBuf::from("."))
        .join("backups")
        .join(&file_name);

    RestoreEngine::verify_restore_staging(&backup_path, &app_config.db_encryption_key, current_live_seq)
}
