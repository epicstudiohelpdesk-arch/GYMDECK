use tokio::sync::mpsc;
use rusqlite::Connection;
use crate::errors::AppError;

/// Defines a database write operation that must be executed sequentially.
pub type DbWriteTask = Box<dyn FnOnce(&mut Connection) -> Result<(), AppError> + Send + 'static>;

/// Enterprise Async Database Manager.
/// SQLite WAL mode allows concurrent readers, but writers MUST be serialized to 
/// avoid SQLITE_BUSY deadlocks. We use a dedicated Tokio MPSC queue to funnel all 
/// writes (Transactions) through a single background worker thread.
pub struct AsyncDbManager {
    // The sender channel used by the Tauri command handlers to dispatch writes.
    tx: mpsc::Sender<DbWriteTask>,
}

impl AsyncDbManager {
    /// Initializes the background worker thread.
    pub fn new(mut conn: Connection) -> Self {
        // Create a bounded channel to provide backpressure if the write queue is saturated
        let (tx, mut rx) = mpsc::channel::<DbWriteTask>(100);

        // Spawn a dedicated background thread for synchronous SQLite writes.
        // We use std::thread::spawn to ensure this dedicated worker is independent
        // of the async runtime's pool and can be initialized during synchronous setup.
        std::thread::Builder::new()
            .name("db-write-worker".into())
            .spawn(move || {
                tracing::info!("AsyncDbManager write-worker thread initialized.");
                
                // Listen for incoming write tasks and execute them sequentially.
                // blocking_recv() is safe to call from a dedicated thread.
                while let Some(task) = rx.blocking_recv() {
                    if let Err(e) = task(&mut conn) {
                        tracing::error!("Database write task failed: {}", e);
                    }
                }
                
                tracing::info!("AsyncDbManager write-worker thread shut down.");
            })
            .expect("Failed to spawn database write worker thread");

        Self { tx }
    }

    /// Dispatches a write closure to the dedicated SQLite thread.
    /// Awaits completion (via oneshot channels if a return value is needed).
    pub async fn dispatch_write(&self, task: DbWriteTask) -> Result<(), AppError> {
        self.tx.send(task).await.map_err(|_| {
            AppError::Database("Write queue is closed or saturated".to_string())
        })
    }
}
