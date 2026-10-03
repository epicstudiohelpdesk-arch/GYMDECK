/**
 * GymDeck Owner Mobile - Vault Repository
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { IVaultRepository } from './interfaces';
import { VaultMetadataRecord } from '../types';
import { generateUUID } from '../utils';

export class VaultRepository implements IVaultRepository {
  constructor(private dbManager: LocalDatabaseManager = LocalDatabaseManager.getInstance()) {}

  public async getMetadata(): Promise<VaultMetadataRecord | null> {
    const result = await this.dbManager.execute('SELECT * FROM vault_metadata LIMIT 1;');
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id as string,
      gym_id: row.gym_id as string,
      vault_version: Number(row.vault_version),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  public async setMetadata(gymId: string, vaultVersion: number = 1): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getMetadata();

    if (existing) {
      await this.dbManager.execute(
        'UPDATE vault_metadata SET gym_id = ?, vault_version = ?, updated_at = ? WHERE id = ?;',
        [gymId, vaultVersion, now, existing.id]
      );
    } else {
      const id = generateUUID();
      await this.dbManager.execute(
        'INSERT INTO vault_metadata (id, gym_id, vault_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
        [id, gymId, vaultVersion, now, now]
      );
    }
  }
}
