/**
 * GymDeck Owner Mobile - Migration V2: Outbox & Sync Metadata Foundation
 *
 * Implements:
 * 1. Canonical outbox columns (schema_version, device_id, base_server_sequence, client_timestamp)
 * 2. Sync metadata on all core domain tables (server_version, sync_status)
 * 3. Financial auditability support (linked_payment_id for refunds)
 * 4. Soft deletion tombstones on memberships and PT packages/sessions (deleted_at)
 * 5. Device identity support in vault_metadata
 *
 * Non-destructive: preserves all existing data and tables.
 */

import { DB } from '@op-engineering/op-sqlite';
import { Migration } from './types';
import { Logger } from '../../observability';

async function safeAddColumn(
  db: DB,
  table: string,
  column: string,
  typeAndConstraint: string
): Promise<void> {
  try {
    const tableInfo = await db.execute(`PRAGMA table_info(${table});`);
    const exists = tableInfo.rows?.some((r: any) => r.name === column);
    if (!exists) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeAndConstraint};`);
    }
  } catch (err: any) {
    Logger.warn(`[Migration V2] Column check/alter warning for ${table}.${column}:`, {
      error: err?.message,
    });
  }
}

export const v2OutboxAndSyncMetadata: Migration = {
  version: 2,
  name: 'v2_outbox_and_sync_metadata',
  checksum: 'v2_sha256_outbox_and_sync_metadata',
  up: async (db: DB): Promise<void> => {
    // 1. sync_outbox enhancements for Canonical Event Contract
    await safeAddColumn(db, 'sync_outbox', 'schema_version', 'INTEGER NOT NULL DEFAULT 1');
    await safeAddColumn(db, 'sync_outbox', 'device_id', "TEXT NOT NULL DEFAULT ''");
    await safeAddColumn(db, 'sync_outbox', 'base_server_sequence', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'sync_outbox', 'client_timestamp', "TEXT NOT NULL DEFAULT ''");

    // Indexes for high-throughput outbox queue operations
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_sync_outbox_queue ON sync_outbox(gym_id, status, created_at ASC);`
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity_lookup ON sync_outbox(gym_id, entity_type, entity_id);`
    );

    // 2. Vault Metadata: persistent device identity binding
    await safeAddColumn(db, 'vault_metadata', 'device_id', 'TEXT DEFAULT NULL');

    // 3. Gym Members: sync status and server sequence tracking
    await safeAddColumn(db, 'gym_members', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'gym_members', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_gym_members_sync_status ON gym_members(gym_id, sync_status);`
    );

    // 4. Membership Plans
    await safeAddColumn(db, 'membership_plans', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'membership_plans', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    // 5. Member Memberships
    await safeAddColumn(db, 'member_memberships', 'deleted_at', 'TEXT DEFAULT NULL');
    await safeAddColumn(db, 'member_memberships', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'member_memberships', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    // 6. Attendance Logs
    await safeAddColumn(db, 'attendance_logs', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'attendance_logs', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    // 7. Payments: discrete linked refund pointer + sync metadata
    await safeAddColumn(db, 'payments', 'linked_payment_id', 'TEXT DEFAULT NULL');
    await safeAddColumn(db, 'payments', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'payments', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_payments_linked_refund ON payments(gym_id, linked_payment_id);`
    );

    // 8. Trainers
    await safeAddColumn(db, 'trainers', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'trainers', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    // 9. PT Packages
    await safeAddColumn(db, 'pt_packages', 'deleted_at', 'TEXT DEFAULT NULL');
    await safeAddColumn(db, 'pt_packages', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'pt_packages', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    // 10. PT Sessions
    await safeAddColumn(db, 'pt_sessions', 'deleted_at', 'TEXT DEFAULT NULL');
    await safeAddColumn(db, 'pt_sessions', 'server_version', 'INTEGER DEFAULT NULL');
    await safeAddColumn(db, 'pt_sessions', 'sync_status', "TEXT NOT NULL DEFAULT 'SYNCED'");

    Logger.info('[Migration V2] Applied outbox and sync metadata columns successfully');
  },
};
