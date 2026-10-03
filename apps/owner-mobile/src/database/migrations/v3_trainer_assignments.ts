/**
 * GymDeck Owner Mobile - Migration V3: Trainer Assignments Foundation
 *
 * Implements:
 * 1. trainer_assignments table for offline coach assignment to members
 * 2. Indexes for fast lookup by gym_id + member_id / trainer_id
 * 3. Non-destructive: preserves existing tables and records
 */

import { DB } from '@op-engineering/op-sqlite';
import { Migration } from './types';
import { Logger } from '../../observability';

export const v3TrainerAssignments: Migration = {
  version: 3,
  name: 'v3_trainer_assignments',
  checksum: 'v3_sha256_trainer_assignments',
  up: async (db: DB): Promise<void> => {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS trainer_assignments (
        id TEXT PRIMARY KEY,
        gym_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        trainer_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        server_version INTEGER DEFAULT NULL,
        sync_status TEXT NOT NULL DEFAULT 'SYNCED',
        FOREIGN KEY(member_id) REFERENCES gym_members(id) ON DELETE RESTRICT,
        FOREIGN KEY(trainer_id) REFERENCES trainers(id) ON DELETE RESTRICT
      );
    `);

    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_trainer_assignments_gym_member ON trainer_assignments(gym_id, member_id, status);'
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_trainer_assignments_gym_trainer ON trainer_assignments(gym_id, trainer_id, status);'
    );

    Logger.info('[Migration V3] Applied trainer_assignments table successfully');
  },
};
