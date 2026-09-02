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

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(32),
      password_hash TEXT NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'OWNER',
      permissions TEXT[],
      account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_gym_email ON users(gym_id, email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    CREATE TABLE IF NOT EXISTS user_refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      family_id UUID NOT NULL,
      device_fingerprint TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_user ON user_refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_hash ON user_refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_refresh_tokens_family ON user_refresh_tokens(family_id);

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

    CREATE TABLE IF NOT EXISTS email_verification_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      otp_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts_count INTEGER NOT NULL DEFAULT 0,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS member_refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_account_id UUID NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      family_id UUID NOT NULL,
      device_fingerprint TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS member_activation_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      gym_member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      display_code VARCHAR(32),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_act_tokens_hash ON member_activation_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_act_tokens_gym_member ON member_activation_tokens(gym_id, gym_member_id);

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

    CREATE TABLE IF NOT EXISTS member_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE member_memberships ADD COLUMN IF NOT EXISTS price_at_purchase NUMERIC(10,2) NOT NULL DEFAULT 0.00;

    CREATE INDEX IF NOT EXISTS idx_member_memberships_gym_mem ON member_memberships(gym_id, member_id);
    CREATE INDEX IF NOT EXISTS idx_member_memberships_status ON member_memberships(member_id, status);

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
    );

    ALTER TABLE payments ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES member_memberships(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(64);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS type VARCHAR(32) NOT NULL DEFAULT 'PAYMENT';

    CREATE INDEX IF NOT EXISTS idx_payments_gym_member ON payments(gym_id, member_id);
    CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON payments(gym_id, paid_at);
    CREATE INDEX IF NOT EXISTS idx_payments_membership ON payments(gym_id, membership_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gym_idempotency ON payments(gym_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_gym_receipt ON payments(gym_id, receipt_number);

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

    CREATE TABLE IF NOT EXISTS pt_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
      package_name VARCHAR(255) NOT NULL,
      total_sessions INTEGER NOT NULL,
      used_sessions INTEGER NOT NULL DEFAULT 0,
      remaining_sessions INTEGER NOT NULL,
      expiry_date TIMESTAMPTZ NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pt_packages_gym_member ON pt_packages(gym_id, member_id);

    CREATE TABLE IF NOT EXISTS pt_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_id UUID NOT NULL REFERENCES pt_packages(id) ON DELETE CASCADE,
      gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
      trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE RESTRICT,
      session_date TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      focus_area VARCHAR(255) NOT NULL,
      trainer_notes TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_pt_sessions_package ON pt_sessions(package_id);
    CREATE INDEX IF NOT EXISTS idx_pt_sessions_gym_member ON pt_sessions(gym_id, member_id, session_date);

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
    DELETE FROM sync_change_log a USING sync_change_log b WHERE a.server_sequence < b.server_sequence AND a.gym_id = b.gym_id AND a.event_id = b.event_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_change_log_event_id ON sync_change_log(gym_id, event_id);

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

    DELETE FROM sync_idempotency_log a USING sync_idempotency_log b WHERE a.processed_at < b.processed_at AND a.gym_id = b.gym_id AND a.event_id = b.event_id;
    DROP INDEX IF EXISTS idx_sync_idempotency_gym_event;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_idempotency_gym_event ON sync_idempotency_log(gym_id, event_id);

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
