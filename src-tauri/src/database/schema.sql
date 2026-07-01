-- GymDeck Enterprise Production Schema (Multi-Tenant Isolated)
-- Enforced via Rust backend with SQLCipher AES-256 encryption.

PRAGMA foreign_keys = ON;

-- 1. GYM TENANTS (The Root of Multi-Tenancy)
CREATE TABLE IF NOT EXISTS gyms (
    id TEXT PRIMARY KEY,               -- UUID v4
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,       -- Primary contact/owner
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS (Staff/Owners bound to a Gym)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,              -- Mandatory Tenant Link
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE,
    password_hash TEXT NOT NULL,       -- Argon2id hash
    role TEXT NOT NULL DEFAULT 'RECEPTIONIST', -- TEMPLATE: OWNER, ADMIN, RECEPTIONIST, TRAINER
    account_status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, SUSPENDED
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until DATETIME,
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_gym ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. MEMBERSHIP PLANS
CREATE TABLE IF NOT EXISTS membership_plans (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_by_user_id TEXT NOT NULL,
    updated_by_user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,               -- Soft Delete
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_gym ON membership_plans(gym_id);

-- 4. GYM MEMBERS
CREATE TABLE IF NOT EXISTS gym_members (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    member_code TEXT NOT NULL,         -- External visible ID (e.g. GD-1001)
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    email TEXT,
    gender TEXT,
    dob DATE,
    address TEXT,
    height TEXT,
    weight TEXT,
    blood_group TEXT,
    membership_plan_id TEXT,
    membership_status TEXT NOT NULL DEFAULT 'INACTIVE', -- ACTIVE, EXPIRED, FROZEN, INACTIVE
    joined_at DATETIME NOT NULL,
    expires_at DATETIME,
    profile_photo_path TEXT,
    notes TEXT,
    created_by_user_id TEXT NOT NULL,
    updated_by_user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,               -- Soft Delete
    deleted_by_user_id TEXT,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY(membership_plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_members_gym ON gym_members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_code ON gym_members(gym_id, member_code);
CREATE INDEX IF NOT EXISTS idx_members_gym_phone ON gym_members(gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_gym_name ON gym_members(gym_id, full_name);
CREATE INDEX IF NOT EXISTS idx_members_gym_deleted ON gym_members(gym_id, deleted_at DESC);

-- 4.1 MEMBER DOCUMENTS (Persistent Storage)
CREATE TABLE IF NOT EXISTS member_documents (
    id TEXT PRIMARY KEY,               -- UUID v4
    member_id TEXT NOT NULL,
    gym_id TEXT NOT NULL,
    doc_name TEXT NOT NULL,            -- e.g. "Aadhaar Card"
    doc_type TEXT NOT NULL,            -- e.g. "id", "residence"
    file_content BLOB NOT NULL,        -- The actual PDF/Image data
    file_size TEXT,
    upload_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'verified',
    FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE CASCADE,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_docs_member ON member_documents(member_id);

-- 5. ATTENDANCE LOGS (High-Frequency Writes)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME,
    attendance_method TEXT DEFAULT 'MANUAL', -- MANUAL, RFID, BIOMETRIC, QR
    recorded_by_user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,               -- Soft Delete (rare for attendance)
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendance_gym_member ON attendance_logs(gym_id, member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_time ON attendance_logs(gym_id, check_in_time);

-- 6. PAYMENTS & REVENUE
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,      -- CASH, CARD, UPI, BANK_TRANSFER
    transaction_reference TEXT,
    payment_date DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, PENDING, REFUNDED
    created_by_user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,               -- Soft Delete
    deleted_by_user_id TEXT,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
    FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_gym_member ON payments(gym_id, member_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON payments(gym_id, payment_date);

-- 7. TRAINERS & STAFF ROLES
CREATE TABLE IF NOT EXISTS trainers (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    specialization TEXT,
    salary_structure TEXT,             -- JSON/String metadata
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- 8. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,               -- UUID v4
    gym_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price REAL,
    supplier TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- 9. NOTIFICATIONS (Internal broadcast)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_scope TEXT DEFAULT 'ALL',   -- ALL, STAFF, MEMBERS
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- 10. AUTH & SECURITY INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,               -- Session UUID v4
    user_id TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    platform_metadata TEXT,
    app_version TEXT NOT NULL,
    trusted_device BOOLEAN NOT NULL DEFAULT 0,
    remember_me BOOLEAN NOT NULL DEFAULT 0,
    revoked BOOLEAN NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_trust (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    trust_score INTEGER NOT NULL DEFAULT 100,
    last_validated_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    gym_id TEXT,                       -- Scoped to gym for multi-tenant audit export
    user_id TEXT,
    event_type TEXT NOT NULL,          
    event_metadata TEXT,               -- JSON
    device_fingerprint TEXT,
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE SET NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TRIGGER IF NOT EXISTS prevent_audit_log_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;
CREATE TRIGGER IF NOT EXISTS prevent_audit_log_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'Audit logs are immutable'); END;

CREATE TABLE IF NOT EXISTS encrypted_backups (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,              -- Scoped backup
    snapshot_version INTEGER NOT NULL,
    integrity_checksum TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);
