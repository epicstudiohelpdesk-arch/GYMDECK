-- GymDeck Cloud Database Migration: 0008_email_dispatch_attempts_and_leases.sql
-- Durable dispatch attempt state machine, zombie recovery leases, and reconciliation

-- 1. Create durable email_dispatch_attempts table
CREATE TABLE IF NOT EXISTS email_dispatch_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    outbox_id UUID NOT NULL REFERENCES email_outbox(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    attempt_status VARCHAR(48) NOT NULL DEFAULT 'PREPARED', -- PREPARED | DISPATCHING | ACCEPTED | REJECTED | UNKNOWN_OUTCOME | RECONCILIATION_REQUIRED | FAILED_PERMANENT
    provider VARCHAR(32) NOT NULL DEFAULT 'POSTAL',
    provider_message_id VARCHAR(128),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    recipient_batch_ids JSONB,
    worker_id VARCHAR(64) NOT NULL,
    request_started_at TIMESTAMP WITH TIME ZONE,
    request_completed_at TIMESTAMP WITH TIME ZONE,
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    http_status INTEGER,
    provider_response JSONB,
    error_code VARCHAR(64),
    error_message TEXT,
    reconciliation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraint ensuring an outbox job cannot have duplicate attempt numbers
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_dispatch_attempt_num 
    ON email_dispatch_attempts (outbox_id, attempt_number);

-- Indexes for worker lifecycle, leases, and reconciliation
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_status 
    ON email_dispatch_attempts (attempt_status, lease_expires_at);

CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_provider_msg 
    ON email_dispatch_attempts (provider_message_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_gym_msg 
    ON email_dispatch_attempts (gym_id, email_message_id);

-- 2. Extend email_outbox with lease and heartbeat columns
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS current_attempt_id UUID;

CREATE INDEX IF NOT EXISTS idx_email_outbox_lease 
    ON email_outbox (job_status, lease_expires_at);
