-- GymDeck Cloud - Email Provider Abstraction Staging Migration (Phase 4H)
-- Adds provider-snapshot columns to email_dispatch_attempts, email_outbox,
-- and email_messages so retries never switch provider silently.
-- Additive; safe to re-run. Applied ONLY when EMAIL_DELIVERY_PROVIDER=brevo
-- on staging, and always rolled back to Postal at the end of the cutover.

BEGIN;

-- Snapshot provider on the dispatch attempt (already populated by the
-- providerRouter dispatch path; this migration surface-ensures the column).
ALTER TABLE email_dispatch_attempts
  ADD COLUMN IF NOT EXISTS provider varchar(32) NOT NULL DEFAULT 'POSTAL',
  ADD COLUMN IF NOT EXISTS provider_message_id varchar(128),
  ADD COLUMN IF NOT EXISTS provider_response jsonb;

-- Provider index on the attempt table for O(1) snapshot lookups.
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_provider
  ON email_dispatch_attempts (provider);

-- Provider-snapshot columns on the outbox row.
ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS provider varchar(32) NOT NULL DEFAULT 'POSTAL',
  ADD COLUMN IF NOT EXISTS provider_message_id varchar(128),
  ADD COLUMN IF NOT EXISTS provider_event_id uuid;

-- Provider index on the outbox row for routing/version reconciliation.
CREATE INDEX IF NOT EXISTS idx_email_outbox_provider
  ON email_outbox (provider);

-- Provider-snapshot on the parent message (derived from the attempt).
ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS provider varchar(32) NOT NULL DEFAULT 'POSTAL',
  ADD COLUMN IF NOT EXISTS provider_message_id varchar(128);

-- Provider index on the parent message for cross-attempt reconciliation.
CREATE INDEX IF NOT EXISTS idx_email_messages_provider
  ON email_messages (provider);

COMMIT;
