/**
 * GymDeck Cloud Backend - PostgreSQL Connection Pool & Drizzle Instance
 */

import fs from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { Pool, PoolConfig } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config, isDevelopment } from '../config';
import { logger } from '../logging';
import * as schema from './schema';

export type DatabaseSslMode = 'disable' | 'require' | 'verify';

/** Resolve PostgreSQL TLS settings. Any invalid configuration fails closed. */
export function resolveDatabaseSsl(env: Record<string, string | undefined> = process.env): PoolConfig['ssl'] {
  const production = env.NODE_ENV === 'production';
  const rawMode = env.DATABASE_SSL_MODE || (production ? 'verify' : 'disable');
  const validModes: DatabaseSslMode[] = ['disable', 'require', 'verify'];
  if (!validModes.includes(rawMode as DatabaseSslMode)) {
    throw new Error(`DATABASE_SSL_MODE must be one of ${validModes.join(', ')}; got ${rawMode}.`);
  }
  const mode = rawMode as DatabaseSslMode;
  if (mode === 'disable') {
    if (production) throw new Error('Production requires DATABASE_SSL_MODE=verify with a trusted CA.');
    return false;
  }

  const caPath = env.DATABASE_SSL_CA;
  if (!caPath || !fs.existsSync(caPath)) {
    if (production) throw new Error('Production requires a readable DATABASE_SSL_CA certificate.');
    return { rejectUnauthorized: false };
  }

  const stat = fs.statSync(caPath);
  if (!stat.isFile()) throw new Error('DATABASE_SSL_CA must be a regular file.');
  if (!(stat.mode & 0o400)) throw new Error('DATABASE_SSL_CA is not readable by its owner.');
  if (stat.mode & 0o022) throw new Error('DATABASE_SSL_CA must not be group/world writable.');
  try {
    fs.accessSync(caPath, fs.constants.R_OK);
  } catch {
    throw new Error('DATABASE_SSL_CA is not readable.');
  }

  const ca = fs.readFileSync(caPath, 'utf8');
  const block = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
  if (!block) throw new Error('DATABASE_SSL_CA does not contain a PEM certificate.');
  try {
    new X509Certificate(block[0]);
  } catch (err) {
    throw new Error(`DATABASE_SSL_CA is malformed: ${(err as Error).message}`);
  }
  return { rejectUnauthorized: true, ca };
}

let poolInstance: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

export function getDatabasePool(): Pool {
  if (!poolInstance) {
    const poolConfig: PoolConfig = {
      connectionString: config.DATABASE_URL,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000, // 10-second statement timeout prevents runaway queries
      query_timeout: 10000,
      ssl: resolveDatabaseSsl(),
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
