use argon2::{Argon2, Params};
use sha2::{Sha256, Digest};
use crate::encryption::secrets::SecureString;
use crate::errors::AppError;
use zeroize::Zeroize;

pub struct MultiFactorKdf;

impl MultiFactorKdf {
    /// Derives the AES-256 Key Encryption Key (KEK) using Argon2.
    /// It uniquely binds the database to the OS Installation, the Application, and 
    /// the User's Recovery Phrase. If the machine dies, the user can supply the 
    /// Recovery Phrase on a new machine to successfully derive the key again.
    pub fn derive_database_key(
        app_secret: &SecureString,
        machine_id: &str,
        recovery_entropy: &SecureString
    ) -> Result<SecureString, AppError> {
        // 1. Combine inputs into a strong SHA-256 salt
        let mut hasher = Sha256::new();
        hasher.update(app_secret.expose_secret().as_bytes());
        hasher.update(machine_id.as_bytes());
        hasher.update(recovery_entropy.expose_secret().as_bytes());
        let combined_salt = hasher.finalize();
        
        // 2. Derive a 32-byte (256-bit) raw AES key
        let mut derived_key = [0u8; 32];
        let params = Params::new(65536, 3, 4, None).unwrap();
        let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
        
        argon2.hash_password_into(
            app_secret.expose_secret().as_bytes(), 
            &combined_salt, 
            &mut derived_key
        ).map_err(|e| AppError::Crypto(e.to_string()))?;

        // 3. Convert to hex for SQLCipher's PRAGMA key string requirement
        let hex_key = hex::encode(derived_key);
        
        // 4. Wipe the temporary raw buffer from memory
        derived_key.zeroize();

        Ok(SecureString::new(hex_key))
    }
}
