-- 0009_email_provider_instance_scoping.sql
-- Phase 5A.2: Additive migration for explicit provider instance identity scoping and quarantine logging.

ALTER TABLE email_recipients 
ADD COLUMN IF NOT EXISTS provider_instance_id VARCHAR(128) DEFAULT 'default';

ALTER TABLE email_dispatch_attempts 
ADD COLUMN IF NOT EXISTS provider_instance_id VARCHAR(128) DEFAULT 'default';

ALTER TABLE email_delivery_events 
ADD COLUMN IF NOT EXISTS provider_instance_id VARCHAR(128) DEFAULT 'default';

-- Create an operational quarantine table for unprocessable, malformed, or missing-UUID webhooks
CREATE TABLE IF NOT EXISTS email_webhook_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64),
  raw_payload JSONB,
  quarantine_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_provider_scoped 
ON email_recipients(provider_instance_id, provider_message_id);

CREATE INDEX IF NOT EXISTS idx_email_webhook_quarantine_created 
ON email_webhook_quarantine(created_at);
