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
    delete_account_command, check_email_exists_command, AppState
};
use commands::business_commands::{
    get_members_command, create_member_command, get_plans_command, create_plan_command, delete_plan_command, get_member_documents_command, soft_delete_member_command, permanent_delete_member_command, permanent_delete_members_command, get_past_members_command,
    download_document_command, save_member_documents_command, update_member_command, upload_photo_command, get_document_temp_path_command
};
use auth::rate_limit::default_auth_limiter;
use sessions::manager::SessionManager;
use config::AppConfig;
use chrono::Timelike;

fn schedule_daily_backup(db_path: std::path::PathBuf) {
    tauri::async_runtime::spawn(async move {
        loop {
            // Check every hour whether it's time for daily backup
            tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;

            let now = chrono::Local::now();
            // Run backup at 3:00 AM daily
            if now.hour() == 3 && now.minute() < 5 {
                let backup_dir = db_path.parent()
                    .unwrap_or(&std::path::PathBuf::from("."))
                    .join("backups");
                std::fs::create_dir_all(&backup_dir).ok();

                let date_str = now.format("%Y-%m-%d").to_string();
                let backup_path = backup_dir.join(format!("gymdeck_backup_{}.sqlite", date_str));

                if backup_path.exists() {
                    tracing::info!("Backup already exists for today: {:?}", backup_path);
                    continue;
                }

                // Use VACUUM INTO for safe online backup
                match rusqlite::Connection::open(&db_path) {
                    Ok(conn) => {
                        let vacuum_sql = format!("VACUUM INTO '{}';", backup_path.display().to_string().replace('\'', "''"));
                        match conn.execute_batch(&vacuum_sql) {
                            Ok(_) => tracing::info!("Daily backup created: {:?}", backup_path),
                            Err(e) => tracing::error!("Daily backup failed: {}", e),
                        }
                    }
                    Err(e) => tracing::error!("Daily backup: failed to open DB: {}", e),
                }

                // Wait an hour before checking again to avoid re-triggering
                tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app_config = AppConfig::from_env();

  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(move |app| {
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

      let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
      std::fs::create_dir_all(&app_dir).ok();
      let db_path = app_dir.join("gymdeck_secure_vault.sqlite");

      if !app_config.is_production_mode() {
        tracing::warn!("Running with development database key. Set GYMDECK_DB_KEY env var for production.");
      }

      let database_manager = database::manager::DatabaseManager::new(
        db_path.clone(),
        &app_config.db_encryption_key,
      ).expect("Failed to initialize encrypted database vault");

      let write_conn = rusqlite::Connection::open(&db_path)
          .expect("Failed to open dedicated write connection");

      let pragma_key = format!("PRAGMA key = '{}';", &app_config.db_encryption_key);
      let _ = write_conn.execute_batch(&pragma_key);
      let _ = write_conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

      let async_db = database::async_manager::AsyncDbManager::new(write_conn);

      let rate_limiter = default_auth_limiter();
      let session_manager = SessionManager::new("com.gymdeck.desktop");

      app.manage(AppState {
          db: database_manager,
          async_db,
          rate_limiter,
          session_manager,
      });

      // Schedule automated daily backups
      schedule_daily_backup(db_path.clone());

      // Spawn splash screen timer to close splashscreen and show main window after 8s
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
          tokio::time::sleep(tokio::time::Duration::from_secs(8)).await;

          if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
              let _ = splashscreen.close();
          }

          if let Some(main_window) = app_handle.get_webview_window("main") {
              let _ = main_window.show();
              let _ = main_window.set_focus();
          }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        login_command,
        logout_command,
        signup_command,
        delete_account_command,
        sensitive_action_reauth_command,
        restore_session_command,
        lock_session_command,
        check_email_exists_command,
        get_members_command,
        create_member_command,
        get_plans_command,
        create_plan_command,
        delete_plan_command,
        get_member_documents_command,
        soft_delete_member_command,
        permanent_delete_member_command,
        permanent_delete_members_command,
        get_past_members_command,
        download_document_command,
        save_member_documents_command,
        update_member_command,
        upload_photo_command,
        get_document_temp_path_command
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
