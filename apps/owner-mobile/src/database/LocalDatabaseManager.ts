/**
 * GymDeck Owner Mobile - Local Encrypted Database Manager
 *
 * Offline-First V1: Gate 1 — Local Encrypted Database Foundation
 *
 * Responsibilities:
 * - Opens and manages SQLCipher-encrypted SQLite databases via @op-engineering/op-sqlite
 * - Enforces 256-bit encryption key retrieval via native iOS Keychain
 * - Applies mandatory SQLite performance and integrity PRAGMAs (WAL, foreign_keys, synchronous, busy_timeout)
 * - Validates strict tenant isolation against vault_metadata (fails closed on gym_id mismatch)
 * - Deterministically executes forward-only schema migrations
 * - Exposes a single, hardened database access layer
 * - STRICT DATA SAFETY: Never silently recreates on error, never wipes databases, never leaks keys
 */

import {
  open,
  DB,
  QueryResult,
  Scalar,
  SQLBatchTuple,
  BatchQueryResult,
  Transaction,
} from '@op-engineering/op-sqlite';
import { LocalDatabaseKeyManager } from './LocalDatabaseKeyManager';
import { MigrationRunner, ALL_MIGRATIONS } from './migrations';
import {
  DatabaseError,
  DatabaseNotInitializedError,
  TenantMismatchError,
} from './errors';
import { IDatabaseExecutor } from './types';
import { Logger } from '../observability';

export class LocalDatabaseManager implements IDatabaseExecutor {
  private static instance: LocalDatabaseManager | null = null;

  private db: DB | null = null;
  private currentGymId: string | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() { }

  public static getInstance(): LocalDatabaseManager {
    if (!LocalDatabaseManager.instance) {
      LocalDatabaseManager.instance = new LocalDatabaseManager();
    }
    return LocalDatabaseManager.instance;
  }

  /**
   * Sanitizes gymId to form safe, predictable database filenames.
   */
  public static getDatabaseName(gymId: string): string {
    const sanitized = gymId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `gymdeck_vault_${sanitized}.db`;
  }

  /**
   * Returns true if a database connection is currently active.
   */
  public isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Returns the currently active gym tenant identifier.
   */
  public getActiveGymId(): string | null {
    return this.currentGymId;
  }

  /**
   * Returns raw underlying DB connection for repository operations.
   * Throws DatabaseNotInitializedError if not open.
   */
  public getRawConnection(): DB {
    if (!this.db) {
      throw new DatabaseNotInitializedError();
    }
    return this.db;
  }

  /**
   * Initializes and opens the local encrypted database for the given gym tenant.
   */
  public async initialize(gymId: string): Promise<void> {
    if (!gymId || gymId.trim().length === 0) {
      throw new DatabaseError('Cannot initialize local database with empty gymId', 'INVALID_GYM_ID');
    }

    // If already open for the exact same gym, re-use existing connection
    if (this.db && this.currentGymId === gymId) {
      Logger.debug(`[LocalDatabaseManager] Database already open for gym: ${gymId}`);
      return;
    }

    // If already open for a different gym, close the previous one first
    if (this.db && this.currentGymId !== gymId) {
      Logger.warn(
        `[LocalDatabaseManager] Switching active tenant from ${this.currentGymId} to ${gymId}. Closing previous database.`
      );
      await this.close();
    }

    if (this.initPromise) {
      await this.initPromise;
      if (this.db && this.currentGymId === gymId) {
        return;
      }
    }

    this.initPromise = (async () => {
      this.isInitializing = true;

      try {
        const keyManager = LocalDatabaseKeyManager.getInstance();
        const encryptionKey = await keyManager.getOrCreateVaultKey(gymId);

        const dbName = LocalDatabaseManager.getDatabaseName(gymId);
        Logger.info(`[LocalDatabaseManager] Opening encrypted database: ${dbName}`);

        // Open SQLCipher database
        const db = open({
          name: dbName,
          encryptionKey,
        });

        // Configure required PRAGMAs
        this.configurePragmas(db);

        // Verify tenant isolation & run migrations
        await this.validateAndMigrate(db, gymId);

        this.db = db;
        this.currentGymId = gymId;
        Logger.info(`[LocalDatabaseManager] Local encrypted database successfully initialized for gym: ${gymId}`);
      } catch (err: any) {
        // If we failed after opening db, ensure it is closed safely
        if (this.db) {
          try {
            this.db.close();
          } catch {
            // ignore
          }
          this.db = null;
          this.currentGymId = null;
        }

        // Re-throw without leaking sensitive key material
        const message = err?.message || String(err);
        Logger.error('[LocalDatabaseManager] Fatal database initialization failure', {
          error: message,
          gymId,
        });

        if (err instanceof TenantMismatchError) {
          throw err;
        }

        throw new DatabaseError(`Failed to initialize encrypted database: ${message}`, 'INIT_FAILED');
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    await this.initPromise;
  }

  /**
   * Configures mandatory SQLite pragmas on connection open.
   */
  private configurePragmas(db: DB): void {
    // 1. Enforce Foreign Keys
    db.executeSync('PRAGMA foreign_keys = ON;');

    // 2. Enable Write-Ahead Logging for high concurrency
    db.executeSync('PRAGMA journal_mode = WAL;');

    // 3. Set Synchronous to NORMAL for safe, performant disk flushes in WAL mode
    db.executeSync('PRAGMA synchronous = NORMAL;');

    // 4. Set busy timeout to 5000ms to handle concurrent locks
    db.executeSync('PRAGMA busy_timeout = 5000;');

    // 5. Enable SQLCipher memory security where supported
    try {
      db.executeSync('PRAGMA cipher_memory_security = ON;');
    } catch {
      // Non-critical if pragma unavailable on specific build
    }
  }

  /**
   * Validates tenant isolation against vault_metadata and runs pending migrations.
   */
  private async validateAndMigrate(db: DB, expectedGymId: string): Promise<void> {
    // Check if vault_metadata exists
    const tableCheck = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='vault_metadata';"
    );

    const hasVaultMetadata = tableCheck.rows && tableCheck.rows.length > 0;

    if (hasVaultMetadata) {
      const metaResult = await db.execute('SELECT gym_id, vault_version FROM vault_metadata LIMIT 1;');
      if (metaResult.rows && metaResult.rows.length > 0) {
        const persistedGymId = metaResult.rows[0].gym_id as string;
        if (persistedGymId !== expectedGymId) {
          throw new TenantMismatchError(expectedGymId, persistedGymId);
        }
      }
    }

    // Run migrations
    await MigrationRunner.runMigrations(db, ALL_MIGRATIONS);

    // If vault_metadata was empty (e.g. fresh DB after migration V1 created table), insert tenant identity
    const postCheck = await db.execute('SELECT COUNT(*) as count FROM vault_metadata;');
    const rowCount = postCheck.rows?.[0]?.count ?? 0;
    if (rowCount === 0) {
      const now = new Date().toISOString();
      const vaultId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.execute(
        'INSERT INTO vault_metadata (id, gym_id, vault_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
        [vaultId, expectedGymId, 1, now, now]
      );
      Logger.info(`[LocalDatabaseManager] Vault metadata bound to tenant: ${expectedGymId}`);
    }
  }

  /**
   * Executes an asynchronous parameterized SQL statement.
   */
  public async execute(query: string, params?: Scalar[]): Promise<QueryResult> {
    const db = this.getRawConnection();
    try {
      return await db.execute(query, params);
    } catch (err: any) {
      Logger.debug('[LocalDatabaseManager] Query execution error', { error: err?.message, query });
      throw new DatabaseError(`Database execution error: ${err?.message || String(err)}`, 'EXECUTION_ERROR');
    }
  }

  /**
   * Executes a synchronous parameterized SQL statement.
   */
  public executeSync(query: string, params?: Scalar[]): QueryResult {
    const db = this.getRawConnection();
    try {
      return db.executeSync(query, params);
    } catch (err: any) {
      Logger.debug('[LocalDatabaseManager] Sync query execution error', { error: err?.message, query });
      throw new DatabaseError(`Database sync execution error: ${err?.message || String(err)}`, 'EXECUTION_ERROR');
    }
  }

  /**
   * Executes a batch of commands within a transaction.
   */
  public async executeBatch(commands: SQLBatchTuple[]): Promise<BatchQueryResult> {
    const db = this.getRawConnection();
    try {
      return await db.executeBatch(commands);
    } catch (err: any) {
      Logger.debug('[LocalDatabaseManager] Batch execution error', { error: err?.message });
      throw new DatabaseError(`Database batch error: ${err?.message || String(err)}`, 'BATCH_ERROR');
    }
  }

  /**
   * Executes a closure inside an atomic database transaction.
   */
  public async transaction(fn: (tx: Transaction) => Promise<void>): Promise<void> {
    const db = this.getRawConnection();
    try {
      await db.transaction(fn);
    } catch (err: any) {
      Logger.debug('[LocalDatabaseManager] Transaction error', { error: err?.message });
      throw new DatabaseError(`Transaction error: ${err?.message || String(err)}`, 'TRANSACTION_ERROR');
    }
  }

  /**
   * Executes an atomic database transaction returning a typed result.
   * If an exception occurs, the transaction is rolled back completely.
   */
  public async runInTransaction<T>(fn: (executor: IDatabaseExecutor) => Promise<T>): Promise<T> {
    const db = this.getRawConnection();
    let result: T;
    try {
      await db.transaction(async (tx) => {
        result = await fn(tx);
      });
      return result!;
    } catch (err: any) {
      Logger.debug('[LocalDatabaseManager] runInTransaction error', { error: err?.message });
      throw err;
    }
  }


  /**
   * Returns filesystem path of current database.
   */
  public getDbPath(): string {
    const db = this.getRawConnection();
    return db.getDbPath();
  }

  /**
   * Safely closes the database connection.
   * NEVER deletes the database file or wipes data.
   */
  public async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const closingGymId = this.currentGymId;
      await this.db.closeAsync();
      this.db = null;
      this.currentGymId = null;
      Logger.info(`[LocalDatabaseManager] Closed database connection for gym: ${closingGymId}`);
    } catch (err: any) {
      Logger.warn('[LocalDatabaseManager] Error while closing database connection', {
        error: err?.message,
      });
      this.db = null;
      this.currentGymId = null;
    }
  }
}

export const localDatabaseManager = LocalDatabaseManager.getInstance();

export async function initializeLocalDatabase(gymId: string): Promise<LocalDatabaseManager> {
  const manager = LocalDatabaseManager.getInstance();
  await manager.initialize(gymId);
  return manager;
}

export async function closeLocalDatabase(): Promise<void> {
  const manager = LocalDatabaseManager.getInstance();
  await manager.close();
}

export function getLocalDatabaseManager(): LocalDatabaseManager {
  return LocalDatabaseManager.getInstance();
}

export function isDatabaseOpen(): boolean {
  return LocalDatabaseManager.getInstance().isOpen();
}
