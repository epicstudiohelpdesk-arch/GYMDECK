-- ==============================================================================
-- GymDeck Cloud Backend - OpenWA WhatsApp Gateway (0006)
--
-- Additive and safe to re-run. OpenWA is an unofficial WhatsApp Web gateway
-- bundled with GymDeck; a gym is connected only after its own OpenWA session
-- reaches READY and the gateway reports the linked phone number.
--
-- The legacy Meta columns stay in place so existing rows remain readable, but
-- new connections use the OpenWA columns below.
-- ==============================================================================

ALTER TABLE "gym_whatsapp_accounts"
  ADD COLUMN IF NOT EXISTS "provider" varchar(16) NOT NULL DEFAULT 'OPENWA';

ALTER TABLE "gym_whatsapp_accounts"
  ADD COLUMN IF NOT EXISTS "openwa_session_id" varchar(64);

ALTER TABLE "gym_whatsapp_accounts"
  ADD COLUMN IF NOT EXISTS "openwa_session_name" varchar(100);

ALTER TABLE "gym_whatsapp_accounts"
  ADD COLUMN IF NOT EXISTS "openwa_webhook_id" varchar(64);

ALTER TABLE "gym_whatsapp_accounts"
  ADD COLUMN IF NOT EXISTS "openwa_status" varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_openwa_session"
  ON "gym_whatsapp_accounts" ("openwa_session_id")
  WHERE "openwa_session_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_provider"
  ON "gym_whatsapp_accounts" ("provider", "connection_status");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_inbound_provider_message"
  ON "whatsapp_inbound_messages" ("gym_id", "provider_message_id")
  WHERE "provider_message_id" IS NOT NULL;

-- Legacy Meta rows cannot send through OpenWA until the owner links a device.
UPDATE "gym_whatsapp_accounts"
SET "connection_status" = 'NOT_CONNECTED',
    "status_reason" = 'WhatsApp now connects through OpenWA. Link the gym phone by scanning a QR code.',
    "webhook_subscribed" = false,
    "token_reference" = NULL,
    "token_expiry" = NULL,
    "updated_at" = now()
WHERE "openwa_session_id" IS NULL
  AND "connection_status" IN ('CONNECTED', 'DEVELOPMENT', 'SANDBOX', 'CONNECTING', 'CONNECTION_EXPIRED', 'REAUTHORIZATION_REQUIRED');

-- OpenWA has no template review step. Locally stored templates are immediately usable.
UPDATE "gym_whatsapp_templates"
SET "approval_status" = 'APPROVED',
    "updated_at" = now()
WHERE "approval_status" = 'NOT_SUBMITTED';
