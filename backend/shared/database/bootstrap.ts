/**
 * GymDeck Cloud Database - Bootstrap & Schema DDL Synchronizer
 */

import { getDatabasePool } from './index';

export async function bootstrapDatabaseSchema(): Promise<void> {
  const pool = getDatabasePool();

  const ddl = `
    CREATE TABLE IF NOT EXISTS gyms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(32) NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      owner_user_id UUID,
      address TEXT,
      contact_phone VARCHAR(32),
      contact_email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gym_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_code VARCHAR(32) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      email VARCHAR(255),
      profile_photo_url TEXT,
      membership_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS member_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone_number VARCHAR(32),
      password_hash VARCHAR(255) NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      plan_name VARCHAR(255) NOT NULL,
      duration_days INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      description TEXT,
      benefits TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out_time TIMESTAMPTZ,
      entry_method VARCHAR(32) NOT NULL DEFAULT 'QR_DYNAMIC',
      device_metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(32) NOT NULL DEFAULT 'CASH',
      transaction_reference VARCHAR(128),
      status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
      notes TEXT,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trainers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(32) NOT NULL,
      specialization VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
      member_id UUID,
      actor_type VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
      action VARCHAR(128) NOT NULL,
      resource VARCHAR(128) NOT NULL,
      resource_id VARCHAR(128),
      request_id VARCHAR(128),
      metadata TEXT,
      ip_address VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sync_change_log (
      server_sequence BIGSERIAL PRIMARY KEY,
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      event_id UUID NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id UUID NOT NULL,
      operation VARCHAR(32) NOT NULL,
      payload JSONB NOT NULL,
      source_device VARCHAR(128) NOT NULL DEFAULT 'DESKTOP',
      actor_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sync_change_log_gym_seq ON sync_change_log(gym_id, server_sequence);

    CREATE TABLE IF NOT EXISTS sync_idempotency_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      event_id UUID NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      entity_id UUID NOT NULL,
      operation VARCHAR(32) NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      server_sequence BIGINT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'APPLIED',
      response_summary TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_idempotency_gym_event ON sync_idempotency_log(gym_id, event_id);

    CREATE TABLE IF NOT EXISTS sync_device_cursors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      device_id VARCHAR(128) NOT NULL,
      last_acknowledged_sequence BIGINT NOT NULL DEFAULT 0,
      device_type VARCHAR(32) NOT NULL DEFAULT 'DESKTOP',
      last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      app_version VARCHAR(32) NOT NULL DEFAULT '1.0.0'
    );

    CREATE INDEX IF NOT EXISTS idx_sync_cursors_gym_device ON sync_device_cursors(gym_id, device_id);
  `;

  await pool.query(ddl);
}
