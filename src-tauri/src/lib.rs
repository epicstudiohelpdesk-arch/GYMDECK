pub mod auth;
pub mod database;
pub mod encryption;
pub mod sessions;
pub mod audit;
pub mod permissions;
pub mod commands;
pub mod models;
pub mod repositories;
pub mod services;
pub mod errors;
pub mod config;
pub mod utils;
pub mod diagnostics;

#[cfg(test)]
pub mod chaos_tests;
#[cfg(test)]
pub mod security_tests;

use tauri::Manager;
use commands::auth_commands::{
    login_command, logout_command, signup_command, 
    sensitive_action_reauth_command, restore_session_command, lock_session_command,
    AppState
};
use commands::business_commands::{
    get_members_command, create_member_command, get_plans_command, get_member_documents_command, soft_delete_member_command, get_past_members_command
};
use auth::rate_limit::default_auth_limiter;
use sessions::manager::SessionManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // 1. Initialize enterprise crash reporting and sanitization
  // This replaces the standard panic hook with a structured, zero-leak implementation.
  
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      // Initialize Structured Crash Reporting
      let log_dir = app.path().app_log_dir().unwrap_or_else(|_| std::path::PathBuf::from("./logs"));
      std::fs::create_dir_all(&log_dir).ok();
      diagnostics::telemetry::TelemetryEngine::initialize_crash_reporting(log_dir);

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 2. Initialize Enterprise Components
      let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
      std::fs::create_dir_all(&app_dir).ok();
      let db_path = app_dir.join("gymdeck_secure_vault.sqlite");
      
      let database_manager = database::manager::DatabaseManager::new(db_path.clone(), "static_dev_key_x0000000000000000000000000")
        .expect("Failed to initialize encrypted database vault");

      // Initialize the Dedicated Write-Worker for Async DB operations
      // We open a separate connection for the writer to avoid pool contention
      let write_conn = rusqlite::Connection::open(&db_path)
          .expect("Failed to open dedicated write connection");
      
      // Apply PRAGMAs to the write connection as well
      let _ = write_conn.execute_batch("PRAGMA key = 'static_dev_key_x0000000000000000000000000';");
      let _ = write_conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

      let async_db = database::async_manager::AsyncDbManager::new(write_conn);

      let rate_limiter = default_auth_limiter();
      let session_manager = SessionManager::new("com.gymdeck.desktop");

      // 3. Inject into Tauri State
      app.manage(AppState {
          db: database_manager,
          async_db,
          rate_limiter,
          session_manager,
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        login_command,
        logout_command,
        signup_command,
        sensitive_action_reauth_command,
        restore_session_command,
        lock_session_command,
        get_members_command,
        create_member_command,
        get_plans_command,
        get_member_documents_command,
        soft_delete_member_command,
        get_past_members_command
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
