use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use image::io::Reader as ImageReader;
use image::GenericImageView;
use uuid::Uuid;

use crate::errors::AppError;

pub struct ImageStorageService;

impl ImageStorageService {
    /// Resolves the absolute directory for inventory images: `<app_data_dir>/inventory_images/<gym_id>/`
    pub fn get_gym_images_dir(app_data_dir: &Path, gym_id: &Uuid) -> Result<PathBuf, AppError> {
        let dir = app_data_dir.join("inventory_images").join(gym_id.to_string());
        fs::create_dir_all(&dir)
            .map_err(|e| AppError::Database(format!("Failed to create inventory image dir: {}", e)))?;
        Ok(dir)
    }

    /// Validates raw image bytes (magic bytes and dimensions), processes them,
    /// saves atomically to disk, and returns storage key and dimensions.
    pub fn save_image(
        app_data_dir: &Path,
        gym_id: &Uuid,
        product_id: &Uuid,
        _filename: &str,
        raw_bytes: &[u8],
    ) -> Result<(String, String, i64, i64, i64, PathBuf), AppError> {
        // Enforce max 10MB file size
        if raw_bytes.len() > 10 * 1024 * 1024 {
            return Err(AppError::Configuration("Image file exceeds maximum 10MB limit.".into()));
        }

        // Validate image magic bytes using the image crate
        let reader = ImageReader::new(Cursor::new(raw_bytes))
            .with_guessed_format()
            .map_err(|e| AppError::Configuration(format!("Failed to parse image header: {}", e)))?;

        let format = reader.format()
            .ok_or_else(|| AppError::Configuration("Unsupported or invalid image format. Only JPEG, PNG and WebP are accepted.".into()))?;

        let (mime_type, ext) = match format {
            image::ImageFormat::Jpeg => ("image/jpeg", "jpg"),
            image::ImageFormat::Png => ("image/png", "png"),
            image::ImageFormat::WebP => ("image/webp", "webp"),
            _ => return Err(AppError::Configuration("Unsupported image format. Allowed formats: JPEG, PNG, WebP.".into())),
        };

        let img = reader.decode()
            .map_err(|e| AppError::Configuration(format!("Image decode failed: {}", e)))?;

        let (width, height) = img.dimensions();
        if width == 0 || height == 0 {
            return Err(AppError::Configuration("Image has invalid dimensions (0x0).".into()));
        }

        let gym_dir = Self::get_gym_images_dir(app_data_dir, gym_id)?;
        
        let image_id = Uuid::new_v4();
        let safe_filename = format!("{}_{}_{}.{}", product_id, image_id, chrono::Utc::now().timestamp_millis(), ext);
        let final_path = gym_dir.join(&safe_filename);

        // Atomic write via temporary file
        let temp_filename = format!(".tmp_{}", safe_filename);
        let temp_path = gym_dir.join(&temp_filename);

        fs::write(&temp_path, raw_bytes)
            .map_err(|e| AppError::Database(format!("Failed to write temporary image file: {}", e)))?;

        fs::rename(&temp_path, &final_path)
            .map_err(|e| {
                let _ = fs::remove_file(&temp_path);
                AppError::Database(format!("Failed to commit image file atomically: {}", e))
            })?;

        // Storage key is relative: `<gym_id>/<safe_filename>`
        let storage_key = format!("{}/{}", gym_id, safe_filename);
        let file_size = raw_bytes.len() as i64;

        Ok((
            storage_key,
            mime_type.to_string(),
            file_size,
            width as i64,
            height as i64,
            final_path,
        ))
    }

    /// Deletes an image file from disk given its relative storage key, ensuring no path traversal.
    pub fn delete_image(app_data_dir: &Path, gym_id: &Uuid, storage_key: &str) -> Result<(), AppError> {
        // Enforce storage key must start with gym_id to prevent cross-tenant deletion or traversal
        let prefix = format!("{}/", gym_id);
        if !storage_key.starts_with(&prefix) {
            return Err(AppError::Unauthorized);
        }

        let relative_path = Path::new(storage_key);
        // Check for .. or suspicious components
        for comp in relative_path.components() {
            if let std::path::Component::ParentDir = comp {
                return Err(AppError::Unauthorized);
            }
        }

        let full_path = app_data_dir.join("inventory_images").join(relative_path);
        if full_path.exists() {
            fs::remove_file(&full_path)
                .map_err(|e| AppError::Database(format!("Failed to remove image file: {}", e)))?;
        }

        Ok(())
    }

    /// Resolves an absolute path for a storage key if it belongs to the given gym
    pub fn resolve_image_path(app_data_dir: &Path, gym_id: &Uuid, storage_key: &str) -> Result<PathBuf, AppError> {
        let prefix = format!("{}/", gym_id);
        if !storage_key.starts_with(&prefix) {
            return Err(AppError::Unauthorized);
        }

        let relative_path = Path::new(storage_key);
        for comp in relative_path.components() {
            if let std::path::Component::ParentDir = comp {
                return Err(AppError::Unauthorized);
            }
        }

        Ok(app_data_dir.join("inventory_images").join(relative_path))
    }
}
