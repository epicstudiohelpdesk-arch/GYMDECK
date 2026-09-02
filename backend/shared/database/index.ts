/**
 * GymDeck Cloud Backend - PostgreSQL Connection Pool & Drizzle Instance
 */

import { Pool, PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config, isDevelopment } from '../config';
import { logger } from '../logging';
import * as schema from './schema';

let poolInstance: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getDatabasePool(): Pool {
  if (!poolInstance) {
    const isProductionEnv = config.NODE_ENV === 'production';
    const poolConfig: PoolConfig = {
      connectionString: config.DATABASE_URL,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000, // 10-second statement timeout prevents runaway queries
      query_timeout: 10000,
      ssl: isProductionEnv ? { rejectUnauthorized: false } : false,
    };

    poolInstance = new Pool(poolConfig);

    poolInstance.on('error', (err) => {
      logger.error('[PostgreSQL] Unexpected error on idle database client', err);
    });

    if (isDevelopment) {
      poolInstance.on('connect', () => {
        logger.debug('[PostgreSQL] Client connected to pool');
      });
    }
  }

  return poolInstance;
}

export function getDatabase(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    const pool = getDatabasePool();
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export async function checkDatabaseHealth(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const pool = getDatabasePool();
    await pool.query('SELECT 1 AS health');
    const latencyMs = Date.now() - start;
    return { status: 'up', latencyMs };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { status: 'down', error: errorMsg };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (poolInstance) {
    logger.info('[PostgreSQL] Draining database connection pool...');
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
    logger.info('[PostgreSQL] Database pool closed successfully');
  }
}

export const db = getDatabase();
export { schema };
export * from './schema';
export default db;
