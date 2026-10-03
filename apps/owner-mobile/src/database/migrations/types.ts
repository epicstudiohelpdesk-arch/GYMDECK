/**
 * GymDeck Owner Mobile - Migration System Types
 */

import { DB } from '@op-engineering/op-sqlite';

export interface Migration {
  version: number;
  name: string;
  checksum?: string;
  up: (db: DB) => Promise<void>;
  down?: (db: DB) => Promise<void>;
}
