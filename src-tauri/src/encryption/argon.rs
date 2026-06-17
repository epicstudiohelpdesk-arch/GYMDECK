use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2, Params,
};
use crate::encryption::secrets::SecureString;
use crate::errors::AppError;

pub struct CryptoEngine;

impl CryptoEngine {
    /// Returns a pre-configured Argon2id instance tailored for production security.
    fn get_argon2() -> Argon2<'static> {
        // High memory cost (64MB), 3 iterations, 4 lanes
        let params = Params::new(65536, 3, 4, None).unwrap();
        Argon2::new(
            argon2::Algorithm::Argon2id,
            argon2::Version::V0x13,
            params
        )
    }

    /// Hashes a SecureString password and returns a new SecureString containing the PHC format hash.
    pub fn hash_password(password: &SecureString) -> Result<SecureString, AppError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Self::get_argon2();
        
        let password_hash = argon2
            .hash_password(password.expose_secret().as_bytes(), &salt)
            .map_err(|e| AppError::Crypto(e.to_string()))?
            .to_string();
        
        Ok(SecureString::new(password_hash))
    }

    /// Constant-time verification of a plaintext password attempt against a stored hash.
    pub fn verify_password(stored_hash: &SecureString, attempt: &SecureString) -> Result<bool, AppError> {
        let parsed_hash = PasswordHash::new(stored_hash.expose_secret())
            .map_err(|e| AppError::Crypto(e.to_string()))?;
        
        let argon2 = Self::get_argon2();
        
        // Argon2 automatically uses constant-time comparison
        let is_valid = argon2
            .verify_password(attempt.expose_secret().as_bytes(), &parsed_hash)
            .is_ok();
            
        Ok(is_valid)
    }
}
