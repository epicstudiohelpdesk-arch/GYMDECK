-- GymDeck Complete Email Communication System (Multi-tenant, Postal Integration, Outbox & Quotas)

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  created_by_user_id UUID,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sender_display_name VARCHAR(120),
  from_address VARCHAR(255) NOT NULL,
  reply_to_address VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- DRAFT | QUEUED | SENDING | COMPLETED | FAILED | CANCELLED
  idempotency_key VARCHAR(128),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_idempotency 
  ON email_messages (gym_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_messages_gym_created 
  ON email_messages (gym_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_messages_status 
  ON email_messages (status);

CREATE TABLE IF NOT EXISTS email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  member_id UUID REFERENCES gym_members(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- QUEUED | SENT | DELIVERED | BOUNCED | FAILED | SUPPRESSED
  provider_message_id VARCHAR(128),
  provider_token VARCHAR(128),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failure_code VARCHAR(64),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_message 
  ON email_recipients (email_message_id);

CREATE INDEX IF NOT EXISTS idx_email_recipients_gym_member 
  ON email_recipients (gym_id, member_id);

CREATE INDEX IF NOT EXISTS idx_email_recipients_provider_msg 
  ON email_recipients (provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_recipients_email 
  ON email_recipients (recipient_email);

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  job_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSING | COMPLETED | FAILED
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(64),
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_queue 
  ON email_outbox (job_status, next_attempt_at) 
  WHERE job_status IN ('PENDING', 'PROCESSING');

CREATE TABLE IF NOT EXISTS email_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  billing_period VARCHAR(10) NOT NULL, -- e.g. '2026-11'
  allocated_quota INTEGER NOT NULL DEFAULT 300,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  consumed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_gym_billing_period UNIQUE (gym_id, billing_period)
);

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE, -- NULL indicates global suppression across all tenants
  email_address VARCHAR(255) NOT NULL,
  suppression_reason VARCHAR(64) NOT NULL, -- HARD_BOUNCE | COMPLAINT | UNSUBSCRIBE | ADMIN_MANUAL
  source VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_lookup 
  ON email_suppressions (email_address);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  category VARCHAR(64) NOT NULL DEFAULT 'GENERAL', -- RENEWAL | WELCOME | DUE_PAYMENT | ANNOUNCEMENT | GENERAL
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_gym 
  ON email_templates (gym_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  email_recipient_id UUID REFERENCES email_recipients(id) ON DELETE SET NULL,
  provider_event_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL, -- MessageSent | MessageDelivered | MessageBounced | MessageFailed
  event_timestamp TIMESTAMPTZ NOT NULL,
  details TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_provider_event_id UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_email_events_message 
  ON email_delivery_events (email_message_id);
