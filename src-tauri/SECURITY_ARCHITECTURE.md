# GymDeck Enterprise Security & Authentication Architecture

This document defines the production-grade, offline-first security architecture for the GymDeck native desktop application. It represents the finalized hardening phase, adhering to enterprise-level cryptographic, fault-tolerance, and attack-resistance standards suitable for commercial deployment.

## 1. Advanced Device Fingerprinting System
**Redesign:** Replaced rigid hardware hashing with **Weighted Device Trust Fingerprinting**.
- **Probabilistic Trust Model:** Uses `machine_uid` + `sha2` to hash a weighted combination of OS Identifier, CPU Serial, Motherboard UUID, Disk Identifier, and a secure Installation Token.
- **Drift Tolerance:** Exact matches are not required. If a minor component (e.g., Disk UUID) changes but core components (Motherboard/CPU) remain, the trust score slightly degrades but doesn't immediately lock the user out.
- **Trust Thresholds:** 
  - `> 85`: Trusted Device.
  - `< 85 & > 50`: Suspicious. Requires re-verification (OTP or Master Password prompt).
  - `< 50`: Untrusted. Immediate session revocation.
- **Data Model:** Stored in the `device_trust` table with `trust_score` and `last_validated_at`.

## 2. Encrypted Backup Versioning System
**Architecture:**
- **Snapshot Integrity:** Every backup (`.sqlite.bak`) includes a `.meta` file or dedicated DB table row (`encrypted_backups`) tracking the `schema_version`, `encryption_version`, `timestamp`, and a `SHA-256` integrity checksum.
- **Secure Export:** Uses SQLCipher's native encrypted export functions to prevent plaintext leakage to disk.
- **Rollback Protection:** Restores are heavily validated against the `integrity_checksum`. If the checksum fails or the `schema_version` is newer than the app version, the restore is explicitly denied to prevent silent data corruption.
- **Rotation:** Automated rotation (e.g., Keep last 7 days, 4 weeks, 3 months), executing via an isolated background Tokio task.

## 3. Panic Hook Sanitization
**Architecture:**
- **Custom Hook:** Replaces the default Rust panic hook via `std::panic::set_hook`.
- **Secret Redaction:** Any panic message is passed through a regex/memory sanitization middleware before hitting the terminal or crash log.
- **Omission Strategy:** Stack traces are stripped of local variable values (e.g., no dumping `Password` or `SessionToken` structures).
- **Secure Serialization:** Panics generate a secure JSON crash report mapped to `CrashReport`, strictly logging the module, line, and standard panic message sans secrets.

## 4. Secure Time & Clock Validation
**Threat:** Attackers rolling back the OS clock to resurrect expired sessions, bypass lockouts, or replay OTPs.
**Mitigation:**
- **Monotonic Clocks:** Internally, active session tracking relies on `std::time::Instant` (monotonic) to track elapsed time independent of the OS clock.
- **Drift Detection:** `chrono` is used for DB timestamps. When comparing DB timestamps to `chrono::Utc::now()`, the backend checks for negative elapsed time. If the current OS time is explicitly *before* a recently stored DB `last_validated_at`, a **Clock Tampering Exception** is raised and the app forcefully locks.

## 5. Database Integrity Verification System
**Health Checks:**
- **Startup:** Executes `PRAGMA integrity_check;` and `PRAGMA quick_check;` on the encrypted database during the Tauri `setup()` phase.
- **Quarantine Mode:** If corruption is detected, the app aborts the normal boot sequence and mounts an isolated React "Recovery Mode" UI.
- **WAL Health:** Analyzes WAL file size to detect checkpoint failures and manual bloat limits to prevent starvation.

## 6. App Secret Rotation System
**Key Lifecycle:**
- **Versioned Keys:** The Master Encryption Key (MEK) and Key Encryption Key (KEK) are versioned via the metadata table.
- **Phased Rekeying:** When updating the KEK hashing algorithm (e.g., increasing Argon2 iterations over time), the app decrypts with vN, generates vN+1, and executes `PRAGMA rekey` without blocking the UI.
- **Backward Compatibility:** Keeps obsolete Argon2/KDF parameter configurations isolated so older backups can still be decrypted and upgraded on restore.

## 7. Development vs Production Security Separation
**Environment Hardening:**
- **Compiler Asserts:** `#[cfg(not(debug_assertions))]` heavily restricts what can be logged or bypassed.
- **No Backdoors:** No "admin password bypass" code is ever compiled into the release target.
- **Cryptography:** Production requires strict Argon2 parameters. Development uses highly relaxed Argon2 parameters (e.g., 1 iteration) solely to speed up testing workflows.

## 8. Secure Crash Dump Architecture
**Crash Logging:**
- **Sanitized Dumps:** Memory minidumps are deliberately avoided to prevent heap-scraping of zeroized secrets.
- **Retention:** Encrypted crash logs are kept locally for 14 days and automatically purged. Only explicitly non-sensitive data (OS type, memory usage, thread count, error enum) is retained.

## 9. Database Health Monitoring System
**Async Monitoring:**
- **Long-Query Detection:** Any SQL query exceeding 500ms triggers a `WARN` in the structured logging system to track SQLite lock contention.
- **Deadlock Protection:** Transactions are strictly serialized in the `tokio` thread pool. If the writer channel is blocked for >2 seconds, the system logs a potential deadlock state and rejects new UI writes gracefully with a "System Busy" notification.

## 10. Biometric Authentication Abstraction
**Future-Ready Traits:**
- **Interface:** `trait BiometricProvider { fn request_auth(&self) -> Result<bool, AuthError>; }`
- **Fallback:** Biometrics are strictly used as a convenience UI for session unlocking (transition from `LOCKED` -> `AUTHENTICATED`), NOT as a replacement for the Argon2 master key derivation. If biometrics fail, the system falls back to a PIN or Password prompt.

## 11. Secure Recovery System
**Architecture:**
- **Recovery Bundle:** The recovery phrase provided during setup is hashed and stored separately. 
- **Offline Reset Flow:** Using the phrase, the user can reset their Master Password. The system derives a new MEK/KEK from the new password and re-encrypts the SQLCipher database.
- **Throttling:** Recovery attempts are locally throttled (exponential backoff) to prevent offline brute-force.

## 12. Command Authorization Guard System
**Centralized Middleware:**
- **Guards:** Replaced manual role checks with centralized Tauri command guards mapping to `enum Permission`.
- **Audit Intercept:** The authorization middleware automatically injects denied attempts into the `audit_logs` table (e.g., `event_type = "UNAUTHORIZED_ACTION_ATTEMPT"`).
- **Session Context:** Tauri states safely pass an injected `UserContext` wrapper so the command logic never has to manually query the DB for the user's role.

## 13. Secure Structured Logging System
**Redaction Architecture:**
- **Tracing Subscriber:** Employs the `tracing` crate with a JSON subscriber for structured file logging.
- **Masking:** A custom formatting layer intercepts log attributes. Keys like `password`, `token`, `otp`, `recovery`, `encryption_key` are scrubbed and replaced with `[REDACTED]`.
- **Severities:** Split into `INFO` (lifecycle), `WARN` (health), `ERROR` (exceptions), and `SECURITY` (tampering, lockouts).

## 14. Async Database Manager Refinement
**Concurrency Fixes:**
- **Channel Architecture:** Replaced simple `spawn_blocking` with an MPSC channel architecture for Writers. 
- **Read/Write Separation:** A dedicated connection pool (e.g., `r2d2` + `rusqlite`) manages concurrent readers. A single dedicated Async Task manages the Write Queue to ensure serialized `BEGIN TRANSACTION` operations, entirely avoiding `SQLITE_BUSY` errors without freezing the UI.

## 15. Complete Authentication State Machine
**Final State Flow:**
1. **UNAUTHENTICATED:** Cold start. Requires full credentials.
2. **AUTHENTICATING:** Processing Argon2id/KDF. Heavy CPU load.
3. **AUTHENTICATED:** Session is active. IPC commands permitted.
4. **LOCKED:** Inactivity timeout triggered. Requires PIN/Biometric. Memory zeroized.
5. **SUSPICIOUS:** Fingerprint drift detected. Downgraded trust. Prompts 2FA/Password to restore full trust.
6. **EXPIRED:** Session time limit reached. Hard kick to UNAUTHENTICATED.
7. **RECOVERING:** DB Corruption / Password Reset flow.
8. **REVOKED:** Explicit logout or remote kill. All tokens zeroized. OS Keychain wiped.

---

### Final Production Security Checklist
- [x] Multi-Factor SQLCipher KEK Derivation implemented.
- [x] Argon2id used for all password storage and KDFs.
- [x] `ZeroizeOnDrop` applied to all cryptographic memory.
- [x] SQLite WAL Mode enabled, Async DB Manager architected.
- [x] Immutable `audit_logs` with SQLite Triggers.
- [x] Time-rollback detection via Monotonic checks.
- [x] Panic Hook sanitization enabled to prevent secret leaks.
- [x] Weighted Device Fingerprinting for trust scores.
- [x] `tracing` logging initialized with Secret Redaction layers.
