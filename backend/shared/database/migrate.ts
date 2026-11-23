#!/usr/bin/env tsx
/**
 * Authoritative GymDeck PostgreSQL migration runner.
 *
 * `drizzle-kit generate` remains the schema-diff authoring tool. Applying
 * migrations is done exclusively by this runner (npm run db:migrate).
 *
 * Modes:
 *   --baseline   record every discovered migration as applied without executing
 *                it. Use ONCE for a legacy database whose history predates this
 *                runner; it never deletes or rewrites existing objects.
 *   --status     print applied/pending versions and exit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const MIGRATION_TABLE = 'gymdeck_schema_migrations';
const args = new Set(process.argv.slice(2));
const baseline = args.has('--baseline');
const statusOnly = args.has('--status');

function migrationDirectory(): string {
  const candidates = [
    process.env.GYMDECK_MIGRATIONS_DIR,
    path.join(process.cwd(), 'shared', 'database', 'migrations'),
    path.join(process.cwd(), 'backend', 'shared', 'database', 'migrations'),
    path.join(__dirname, 'migrations'),
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => /^\d{4}_.*\.sql$/.test(f))) return dir;
  }
  throw new Error(`Migration directory not found. Tried: ${candidates.join(', ')}`);
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required for migrations.');
  return url;
}

async function main(): Promise<void> {
  const dir = migrationDirectory();
  const files = fs.readdirSync(dir)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
  if (files.length === 0) throw new Error(`No migrations found in ${dir}`);

  const pool = new Pool({
    connectionString: connectionString(),
    max: 1,
    ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
    statement_timeout: 120000,
    query_timeout: 120000,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        version varchar(16) PRIMARY KEY,
        filename text NOT NULL,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await pool.query<{ version: string }>(`SELECT version FROM ${MIGRATION_TABLE}`);
    const applied = new Set(rows.map((r) => r.version));

    if (statusOnly) {
      for (const file of files) {
        console.log(`${applied.has(file.slice(0, 4)) ? 'APPLIED ' : 'PENDING '} ${file}`);
      }
      return;
    }

    if (baseline) {
      for (const file of files) {
        const version = file.slice(0, 4);
        if (applied.has(version)) continue;
        await pool.query(
          `INSERT INTO ${MIGRATION_TABLE} (version, filename, checksum) VALUES ($1,$2,$3)`,
          [version, file, 'baseline'],
        );
        console.log(`BASELINED ${version} ${file}`);
      }
      return;
    }

    for (const file of files) {
      const version = file.slice(0, 4);
      if (applied.has(version)) {
        console.log(`SKIP     ${version} ${file}`);
        continue;
      }
      // Historical prerequisite: 0002 references the legacy `payments` table
      // created by bootstrap.ts inline DDL, not by 0000. Create it additively.
      if (version === '0002') {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
            member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
            membership_id UUID REFERENCES member_memberships(id) ON DELETE SET NULL,
            amount NUMERIC(10,2) NOT NULL,
            payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
            transaction_reference VARCHAR(128),
            receipt_number VARCHAR(64),
            idempotency_key VARCHAR(128),
            type VARCHAR(32) NOT NULL DEFAULT 'PAYMENT',
            status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
            notes TEXT,
            paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const checksum = require('node:crypto').createHash('sha256').update(sql).digest('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATION_TABLE} (version, filename, checksum) VALUES ($1,$2,$3)`,
          [version, file, checksum],
        );
        await client.query('COMMIT');
        console.log(`APPLIED  ${version} ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed; transaction rolled back: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
    console.log('Migrations complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`FATAL: ${(err as Error).message}`);
  process.exit(1);
});
