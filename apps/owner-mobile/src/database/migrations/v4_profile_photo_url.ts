/**
 * GymDeck Owner Mobile - Migration V4: Add profile_photo_url to gym_members
 *
 * Adds profile_photo_url column to gym_members table if not already present.
 */

import { DB } from '@op-engineering/op-sqlite';
import { Migration } from './types';
import { Logger } from '../../observability';

export const v4ProfilePhotoUrl: Migration = {
  version: 4,
  name: 'v4_profile_photo_url',
  checksum: 'v4_sha256_profile_photo_url',
  up: async (db: DB): Promise<void> => {
    try {
      await db.execute('ALTER TABLE gym_members ADD COLUMN profile_photo_url TEXT;');
      Logger.info('[Migration V4] Added profile_photo_url column to gym_members');
    } catch (err: any) {
      // Column might already exist in newer SQLite definitions
      Logger.info('[Migration V4] profile_photo_url column already exists or skipped', { message: err?.message });
    }
  },
};
