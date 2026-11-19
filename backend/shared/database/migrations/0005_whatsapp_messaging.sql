-- ==============================================================================
-- GymDeck Cloud Backend - Multi-Tenant WhatsApp Business Platform (0005)
--
-- Additive and safe to re-run. Nothing here marks a gym as connected; the
-- connection state is written only after an authorised Embedded Signup callback
-- has been verified against the Meta Graph API (or, in explicit sandbox mode,
-- recorded as SANDBOX and surfaced as non-live in the UI).
--
-- Access tokens are NEVER stored in this schema in plaintext. The
-- `whatsapp_credential_vault.ciphertext` column holds AES-256-GCM data produced
-- by the messaging service.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "gym_whatsapp_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "waba_id" varchar(64),
  "phone_number_id" varchar(64),
  "business_phone_number" varchar(32),
  "display_name" varchar(255),
  "meta_business_id" varchar(64),
  "connection_status" varchar(32) DEFAULT 'NOT_CONNECTED' NOT NULL,
  "status_reason" text,
  "token_reference" uuid,
  "token_expiry" timestamp with time zone,
  "account_quality_status" varchar(32),
  "webhook_subscribed" boolean DEFAULT false NOT NULL,
  "last_verified_at" timestamp with time zone,
  "connected_at" timestamp with time zone,
  "disconnected_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_gym" ON "gym_whatsapp_accounts" ("gym_id");
CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_phone_number" ON "gym_whatsapp_accounts" ("phone_number_id");
CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_waba" ON "gym_whatsapp_accounts" ("waba_id");
CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_accounts_status" ON "gym_whatsapp_accounts" ("connection_status");

CREATE TABLE IF NOT EXISTS "whatsapp_credential_vault" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "account_id" uuid NOT NULL REFERENCES "gym_whatsapp_accounts"("id") ON DELETE cascade,
  "ciphertext" text NOT NULL,
  "key_version" varchar(16) DEFAULT 'v1' NOT NULL,
  "expires_at" timestamp with time zone,
  "rotated_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_vault_account" ON "whatsapp_credential_vault" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_vault_gym" ON "whatsapp_credential_vault" ("gym_id");

CREATE TABLE IF NOT EXISTS "whatsapp_signup_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "actor_user_id" uuid,
  "state_hash" varchar(64) NOT NULL,
  "requested_phone_number" varchar(32),
  "status" varchar(24) DEFAULT 'PENDING' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_signup_state" ON "whatsapp_signup_sessions" ("state_hash");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_signup_gym" ON "whatsapp_signup_sessions" ("gym_id", "created_at");

CREATE TABLE IF NOT EXISTS "gym_whatsapp_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "meta_template_id" varchar(64),
  "template_name" varchar(128) NOT NULL,
  "category" varchar(32) DEFAULT 'UTILITY' NOT NULL,
  "language" varchar(16) DEFAULT 'en' NOT NULL,
  "approval_status" varchar(32) DEFAULT 'NOT_SUBMITTED' NOT NULL,
  "template_components" text,
  "variable_keys" text,
  "rejection_reason" text,
  "template_version" integer DEFAULT 1 NOT NULL,
  "is_builtin" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gym_whatsapp_templates_gym_name" ON "gym_whatsapp_templates" ("gym_id", "template_name", "language");
CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_templates_gym_status" ON "gym_whatsapp_templates" ("gym_id", "approval_status");
CREATE INDEX IF NOT EXISTS "idx_gym_whatsapp_templates_meta" ON "gym_whatsapp_templates" ("meta_template_id");

CREATE TABLE IF NOT EXISTS "whatsapp_message_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "batch_id" uuid,
  "member_id" uuid,
  "sender_account_id" uuid NOT NULL REFERENCES "gym_whatsapp_accounts"("id") ON DELETE restrict,
  "recipient_number" varchar(32) NOT NULL,
  "recipient_name" varchar(255),
  "message_type" varchar(24) NOT NULL,
  "environment" varchar(16) DEFAULT 'PRODUCTION' NOT NULL,
  "template_id" uuid REFERENCES "gym_whatsapp_templates"("id") ON DELETE set null,
  "message_payload" text NOT NULL,
  "rendered_preview" text,
  "idempotency_key" varchar(128) NOT NULL,
  "dedupe_key" varchar(160),
  "meta_message_id" varchar(128),
  "delivery_status" varchar(24) DEFAULT 'QUEUED' NOT NULL,
  "failure_code" varchar(64),
  "failure_reason" text,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "processing_lease_expires_at" timestamp with time zone,
  "next_attempt_at" timestamp with time zone,
  "scheduled_at" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "read_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "whatsapp_message_jobs" ADD COLUMN IF NOT EXISTS "environment" varchar(16) DEFAULT 'PRODUCTION' NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_gym_created" ON "whatsapp_message_jobs" ("gym_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_gym_status" ON "whatsapp_message_jobs" ("gym_id", "delivery_status");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_member" ON "whatsapp_message_jobs" ("gym_id", "member_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_sender" ON "whatsapp_message_jobs" ("sender_account_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_due" ON "whatsapp_message_jobs" ("delivery_status", "next_attempt_at", "scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_meta_message" ON "whatsapp_message_jobs" ("meta_message_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_jobs_idempotency" ON "whatsapp_message_jobs" ("gym_id", "idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_jobs_dedupe" ON "whatsapp_message_jobs" ("gym_id", "dedupe_key");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_jobs_batch" ON "whatsapp_message_jobs" ("batch_id");

CREATE TABLE IF NOT EXISTS "whatsapp_customer_windows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL,
  "sender_account_id" uuid NOT NULL REFERENCES "gym_whatsapp_accounts"("id") ON DELETE cascade,
  "last_inbound_message_at" timestamp with time zone NOT NULL,
  "service_window_expires_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_windows_member" ON "whatsapp_customer_windows" ("gym_id", "member_id", "sender_account_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_windows_expiry" ON "whatsapp_customer_windows" ("gym_id", "service_window_expires_at");

CREATE TABLE IF NOT EXISTS "whatsapp_message_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL,
  "consent_status" varchar(24) DEFAULT 'PENDING' NOT NULL,
  "consent_source" varchar(64) DEFAULT 'REGISTRATION' NOT NULL,
  "consent_timestamp" timestamp with time zone,
  "withdrawal_timestamp" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_consents_member" ON "whatsapp_message_consents" ("gym_id", "member_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_consents_status" ON "whatsapp_message_consents" ("gym_id", "consent_status");

CREATE TABLE IF NOT EXISTS "whatsapp_consent_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL,
  "consent_status" varchar(24) NOT NULL,
  "consent_source" varchar(64) NOT NULL,
  "actor_user_id" uuid,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_consent_history_member" ON "whatsapp_consent_history" ("gym_id", "member_id", "recorded_at");

CREATE TABLE IF NOT EXISTS "whatsapp_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_event_id" varchar(255) NOT NULL,
  "sender_account_id" uuid,
  "gym_id" uuid,
  "event_type" varchar(64) NOT NULL,
  "processing_status" varchar(24) DEFAULT 'RECEIVED' NOT NULL,
  "payload_hash" varchar(64),
  "payload" text,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_webhook_events_provider" ON "whatsapp_webhook_events" ("provider_event_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_webhook_events_account" ON "whatsapp_webhook_events" ("sender_account_id");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_webhook_events_status" ON "whatsapp_webhook_events" ("processing_status");

CREATE TABLE IF NOT EXISTS "whatsapp_inbound_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "sender_account_id" uuid NOT NULL REFERENCES "gym_whatsapp_accounts"("id") ON DELETE cascade,
  "member_id" uuid,
  "wa_from" varchar(32) NOT NULL,
  "message_type" varchar(32) DEFAULT 'text' NOT NULL,
  "body_preview" varchar(500),
  "is_opt_out" boolean DEFAULT false NOT NULL,
  "provider_message_id" varchar(128),
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_inbound_gym_received" ON "whatsapp_inbound_messages" ("gym_id", "received_at");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_inbound_from" ON "whatsapp_inbound_messages" ("gym_id", "wa_from");

CREATE TABLE IF NOT EXISTS "whatsapp_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "actor_id" uuid,
  "action" varchar(64) NOT NULL,
  "target_id" varchar(128),
  "metadata" text,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_whatsapp_audit_gym_timestamp" ON "whatsapp_audit_logs" ("gym_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_whatsapp_audit_action" ON "whatsapp_audit_logs" ("gym_id", "action");

CREATE TABLE IF NOT EXISTS "whatsapp_automation_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "rule_type" varchar(64) NOT NULL,
  "offset_days" integer DEFAULT 0 NOT NULL,
  "send_time" varchar(5) DEFAULT '10:00' NOT NULL,
  "is_enabled" boolean DEFAULT false NOT NULL,
  "template_id" uuid REFERENCES "gym_whatsapp_templates"("id") ON DELETE set null,
  "last_run_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_whatsapp_automation_rule" ON "whatsapp_automation_rules" ("gym_id", "rule_type", "offset_days");
