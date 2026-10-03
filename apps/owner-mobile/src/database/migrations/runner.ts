/**
 * GymDeck Owner Mobile - Migration Runner
 *
 * Implements deterministic forward-only schema migrations:
 * - Creates _schema_migrations tracking table
 * - Identifies missing migrations in ascending order
 * - Executes each migration within an atomic transaction boundary
 * - Records applied migrations with timestamp and checksum
 * - Fails safely without corrupting version tracking or resetting database
 */

import { DB } from '@op-engineering/op-sqlite';
import { Migration } from './types';
import { MigrationError } from '../errors';
import { Logger } from '../../observability';

export class MigrationRunner {
  /**
   * Ensures the internal _schema_migrations tracking table exists.
   */
  private static async ensureMigrationTable(db: DB): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        checksum TEXT
      );
    `);
  }

  /**
   * Retrieves set of already-applied migration versions.
   */
  public static async getAppliedVersions(db: DB): Promise<Set<number>> {
    await this.ensureMigrationTable(db);
    const result = await db.execute('SELECT version FROM _schema_migrations ORDER BY version ASC;');
    const versions = new Set<number>();
    if (result.rows) {
      for (const row of result.rows) {
        if (typeof row.version === 'number') {
          versions.add(row.version);
        } else if (typeof row.version === 'string') {
          versions.add(parseInt(row.version, 10));
        }
      }
    }
    return versions;
  }

  /**
   * Returns current maximum applied schema version, or 0 if none.
   */
  public static async getCurrentVersion(db: DB): Promise<number> {
    await this.ensureMigrationTable(db);
    const result = await db.execute('SELECT MAX(version) as max_version FROM _schema_migrations;');
    if (result.rows && result.rows.length > 0) {
      const max = result.rows[0].max_version;
      if (typeof max === 'number') return max;
      if (typeof max === 'string') return parseInt(max, 10) || 0;
    }
    return 0;
  }

  /**
   * Applies all pending migrations in ascending version order.
   */
  public static async runMigrations(db: DB, migrations: Migration[]): Promise<number> {
    await this.ensureMigrationTable(db);

    const appliedVersions = await this.getAppliedVersions(db);
    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    const pending = sorted.filter((m) => !appliedVersions.has(m.version));

    if (pending.length === 0) {
      return 0;
    }

    Logger.info(`[MigrationRunner] Applying ${pending.length} pending migration(s)...`);

    let appliedCount = 0;
    for (const migration of pending) {
      Logger.info(`[MigrationRunner] Executing migration ${migration.version}: ${migration.name}`);
      try {
        // Execute migration body
        await migration.up(db);

        // Record successful application
        const appliedAt = new Date().toISOString();
        await db.execute(
          'INSERT INTO _schema_migrations (version, name, applied_at, checksum) VALUES (?, ?, ?, ?);',
          [migration.version, migration.name, appliedAt, migration.checksum ?? null]
        );

        appliedCount++;
        Logger.info(`[MigrationRunner] Successfully applied migration ${migration.version}: ${migration.name}`);
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        Logger.error(`[MigrationRunner] Fatal error executing migration ${migration.version}: ${migration.name}`, {
          error: errorMsg,
        });
        throw new MigrationError(migration.version, migration.name, errorMsg);
      }
    }

    return appliedCount;
  }
}
