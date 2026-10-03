/**
 * GymDeck Owner Mobile - Migration V1: Initial Encrypted Domain Schema
 *
 * Establishes the core local tables and indexes for:
 * - Multi-tenant vault metadata (fails closed on gym mismatch)
 * - Gym members, membership plans, member memberships
 * - Attendance logs
 * - Payments & revenue (strictly integer paise / minor units)
 * - Trainers, PT packages, and PT sessions
 * - Sync foundation (outbox, inbox, sync_state)
 *
 * Compliant with:
 * - Desktop Tauri SQLite schema
 * - Cloud PostgreSQL Drizzle schema
 * - Strict financial precision (INTEGER NOT NULL minor units, zero floats)
 */

import { DB } from '@op-engineering/op-sqlite';
import { Migration } from './types';

export const v1InitialSchema: Migration = {
  version: 1,
  name: 'v1_initial_schema',
  checksum: 'v1_sha256_gymdeck_initial_schema',
  up: async (db: DB): Promise<void> => {
    const statements = [
      // 1. Vault Metadata (Tenant Identity & Boundary)
      `CREATE TABLE IF NOT EXISTS vault_metadata (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL UNIQUE,
        vault_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      // 2. Gym Members
      `CREATE TABLE IF NOT EXISTS gym_members (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        alternate_phone TEXT,
        email TEXT,
        gender TEXT,
        dob TEXT,
        address TEXT,
        membership_status TEXT NOT NULL DEFAULT 'ACTIVE',
        joined_at TEXT NOT NULL,
        expires_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_gym_members_gym ON gym_members(gym_id);`,
      `CREATE INDEX IF NOT EXISTS idx_gym_members_gym_code ON gym_members(gym_id, member_code);`,
      `CREATE INDEX IF NOT EXISTS idx_gym_members_phone ON gym_members(gym_id, phone);`,
      `CREATE INDEX IF NOT EXISTS idx_gym_members_status ON gym_members(gym_id, membership_status);`,
      `CREATE INDEX IF NOT EXISTS idx_gym_members_deleted ON gym_members(gym_id, deleted_at);`,

      // 3. Membership Plans (Price strictly in integer paise / minor units)
      `CREATE TABLE IF NOT EXISTS membership_plans (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        price_minor_units INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        benefits TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_plans_gym_active ON membership_plans(gym_id, is_active);`,

      // 4. Member Memberships (Active / Expired subscriptions)
      `CREATE TABLE IF NOT EXISTS member_memberships (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        price_at_purchase_minor_units INTEGER NOT NULL DEFAULT 0,
        auto_renew INTEGER NOT NULL DEFAULT 0,
        frozen_at TEXT,
        freeze_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT,
        FOREIGN KEY(plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_member_memberships_gym_mem ON member_memberships(gym_id, member_id);`,
      `CREATE INDEX IF NOT EXISTS idx_member_memberships_status ON member_memberships(member_id, status);`,

      // 5. Attendance Logs
      `CREATE TABLE IF NOT EXISTS attendance_logs (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        check_in_time TEXT NOT NULL,
        check_out_time TEXT,
        entry_method TEXT NOT NULL DEFAULT 'MANUAL',
        device_metadata TEXT,
        notes TEXT,
        recorded_by_user_id TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_gym_member ON attendance_logs(gym_id, member_id, check_in_time);`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_gym_time ON attendance_logs(gym_id, check_in_time);`,

      // 6. Payments & Revenue (Amount strictly in integer paise / minor units)
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        membership_id TEXT,
        amount_minor_units INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL,
        transaction_reference TEXT,
        receipt_number TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        notes TEXT,
        paid_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        deleted_at TEXT,
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT,
        FOREIGN KEY(membership_id) REFERENCES member_memberships(id) ON DELETE SET NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_payments_gym_member ON payments(gym_id, member_id);`,
      `CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON payments(gym_id, paid_at);`,

      // 7. Trainers
      `CREATE TABLE IF NOT EXISTS trainers (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        specialization TEXT,
        experience_years INTEGER,
        bio TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_trainers_gym_active ON trainers(gym_id, is_active);`,

      // 8. Personal Training Packages & Sessions
      `CREATE TABLE IF NOT EXISTS pt_packages (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        trainer_id TEXT NOT NULL,
        package_name TEXT NOT NULL,
        total_sessions INTEGER NOT NULL,
        used_sessions INTEGER NOT NULL DEFAULT 0,
        remaining_sessions INTEGER NOT NULL,
        price_minor_units INTEGER NOT NULL DEFAULT 0,
        expiry_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT,
        FOREIGN KEY(trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_pt_packages_member ON pt_packages(gym_id, member_id);`,

      `CREATE TABLE IF NOT EXISTS pt_sessions (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        trainer_id TEXT NOT NULL,
        session_date TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        focus_area TEXT,
        trainer_notes TEXT,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        created_at TEXT NOT NULL,
        FOREIGN KEY(package_id) REFERENCES pt_packages(id) ON DELETE RESTRICT,
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT,
        FOREIGN KEY(trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT
      );`,

      // 9. Sync Foundation Tables (For future Gates 2 & 3)
      `CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        gym_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        next_retry_at TEXT,
        lease_expires_at TEXT,
        worker_id TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        error_code TEXT,
        error_message TEXT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_sync_outbox_claiming ON sync_outbox(gym_id, status, next_retry_at, lease_expires_at, created_at ASC);`,
      `CREATE INDEX IF NOT EXISTS idx_sync_outbox_event ON sync_outbox(event_id);`,

      `CREATE TABLE IF NOT EXISTS sync_inbox (
        server_sequence INTEGER NOT NULL,
        gym_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        PRIMARY KEY (gym_id, server_sequence),
        UNIQUE (gym_id, event_id)
      );`,

      `CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT NOT NULL,
        gym_id TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (key, gym_id)
      );`,
    ];

    for (const sql of statements) {
      await db.execute(sql);
    }
  },
};
