# GymDeck Native Authentication Backend Architecture

## Overview
GymDeck operates as a native, offline-first, security-critical desktop application. The frontend (React 19) serves **only** as a UI layer. The entire authentication engine, database interaction, encryption, and session management are handled by the Rust backend via Tauri v2 secure IPC commands.

## Core Architectural Principles
1. **Rust-Driven Security**: All cryptographic hashing, validation, and session management occur in Rust.
2. **Zero-Trust Frontend**: The React UI has no access to encryption keys, database files, or plaintext passwords in state. 
3. **Encrypted Persistence**: Data is stored locally via SQLite wrapped in SQLCipher (AES-256).
4. **Memory Safety**: Sensitive credentials in Rust are wiped immediately after use using the `zeroize` crate.
5. **Offline-First**: Total functionality without internet connection, with future-ready scaffolding for cloud synchronization.

## System Flow
```text
[ React Frontend ] 
       │ 
       │ (Tauri IPC Commands - e.g., login(email, pass))
       ▼
[ Tauri Commands (src/commands/) ]
       │ 
       │ (Validates input, calls Auth Service)
       ▼
[ Auth Service (src/services/) ]
       │ 
       ├──► [ Encryption Module (src/encryption/) ] -> Argon2id hashing, secure randoms
       ├──► [ Session Module (src/sessions/) ] -> OS Keychain interactions (Keyring)
       │
       ▼
[ Repositories (src/repositories/) ]
       │
       ▼
[ SQLCipher SQLite DB (src/database/) ] -> WAL mode, AES-256 encrypted
```

## Async Database Architecture
SQLite is inherently synchronous. To prevent database IO from blocking the Tauri UI thread, all SQL queries are dispatched to a background thread pool using `tokio::task::spawn_blocking` (or `tokio-rusqlite`). 
- **WAL Mode**: Write-Ahead Logging is enabled, allowing concurrent reads while a write is occurring, maximizing responsiveness.
- **Connection Management**: A single writer thread (or Mutex guard) ensures SQLite is never locked out by simultaneous writes, while readers operate concurrently.

## Database Migrations
Migrations are handled purely in Rust (e.g., using `rusqlite_migration` or embedded SQL scripts). The application runs a schema verification and migration routine automatically on startup *before* mounting the Tauri frontend. This ensures the `.sqlite` schema strictly matches the `models/` Rust structs.

- `commands/`: Tauri command handlers (`#[tauri::command]`). Strictly handles IPC serialization/deserialization. Delegates logic to `services`.
- `services/`: Business logic. Contains `AuthService`, `UserService`, `AuditService`. Enforces RBAC here.
- `repositories/`: Database interaction layer. Converts SQL queries into strongly-typed `models`.
- `models/`: Rust structs mapping to DB tables (`User`, `Session`, `AuditLog`) and request/response payloads.
- `encryption/`: Wraps `argon2` for password hashing and manages database key derivation.
- `sessions/`: Manages the generation of session UUIDs and securely stores/retrieves them using the OS's native secure storage (macOS Keychain, Windows Credential Manager).
- `audit/`: Writes immutable logs for every security-relevant event.
- `permissions/`: Enforces the Role-Based Access Control (RBAC) constants and verification logic.
- `database/`: Manages connection pooling, SQLCipher PRAGMA initialization, migrations, and WAL mode setup.
- `errors/`: Centralized `thiserror` enums to ensure safe, generic error propagation to the frontend without leaking backend state.
- `config/`: Application configuration, constants, and path management.
- `utils/`: Helpers for timing, formatting, and validation.

## Security Controls
- **Password Hashing**: `Argon2id` (memory-hard, resistant to GPU/ASIC cracking).
- **Brute-Force & Enumeration**: Generic error responses ("Invalid email or password"). Account lockout after consecutive failed attempts.
- **Data at Rest**: `SQLCipher` encrypts the entire `.sqlite` file. The key is derived from a machine-specific identifier to bind the DB to the installation environment.
- **Session Tokens**: Stored using the `keyring` crate. The frontend never sees the persistent token, only a session identifier or boolean auth status.

## Future Extensibility
- **JWTs / Cloud Sync**: The system issues local UUID sessions but the `Session` model is extensible to store JWTs later when backend APIs are introduced.
- **Mobile Apps**: The architecture isolates UI from business logic. The `services` layer can easily be exposed via a local HTTP server or gRPC if required for mobile-desktop pairing.
