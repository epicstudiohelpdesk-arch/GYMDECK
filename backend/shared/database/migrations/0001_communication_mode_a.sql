-- ==============================================================================
-- GymDeck Cloud Backend - Mode A Communications (0001)
-- Owner communication settings, consent flags, and assisted broadcast audit.
-- Message bodies are intentionally NOT stored.
-- ==============================================================================

ALTER TABLE "gym_members" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in" boolean DEFAULT true NOT NULL;
ALTER TABLE "gym_members" ADD COLUMN IF NOT EXISTS "email_opt_in" boolean DEFAULT true NOT NULL;
ALTER TABLE "gym_members" ADD COLUMN IF NOT EXISTS "marketing_opt_in" boolean DEFAULT false NOT NULL;
ALTER TABLE "gym_members" ADD COLUMN IF NOT EXISTS "consent_updated_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "gym_communication_settings" (
  "gym_id" uuid PRIMARY KEY NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "primary_phone" varchar(32),
  "whatsapp_number" varchar(32),
  "official_email" varchar(255),
  "mobile_for_members" boolean DEFAULT true NOT NULL,
  "mobile_sms_allowed" boolean DEFAULT true NOT NULL,
  "mobile_calls_allowed" boolean DEFAULT true NOT NULL,
  "mobile_promos_allowed" boolean DEFAULT false NOT NULL,
  "whatsapp_for_members" boolean DEFAULT true NOT NULL,
  "whatsapp_receipts_allowed" boolean DEFAULT true NOT NULL,
  "whatsapp_reminders_allowed" boolean DEFAULT true NOT NULL,
  "whatsapp_support_allowed" boolean DEFAULT true NOT NULL,
  "whatsapp_promos_allowed" boolean DEFAULT false NOT NULL,
  "email_for_members" boolean DEFAULT true NOT NULL,
  "email_invoices_allowed" boolean DEFAULT true NOT NULL,
  "email_alerts_allowed" boolean DEFAULT true NOT NULL,
  "email_newsletter_allowed" boolean DEFAULT false NOT NULL,
  "quiet_hours_start" varchar(5) DEFAULT '22:00' NOT NULL,
  "quiet_hours_end" varchar(5) DEFAULT '06:00' NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "communication_broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "actor_user_id" uuid,
  "channel" varchar(16) NOT NULL,
  "message_kind" varchar(24) NOT NULL,
  "subject" varchar(200),
  "body_sha256" varchar(64) NOT NULL,
  "body_length" integer NOT NULL,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "queued_count" integer DEFAULT 0 NOT NULL,
  "sent_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "skipped_count" integer DEFAULT 0 NOT NULL,
  "status" varchar(24) DEFAULT 'QUEUED' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "communication_broadcast_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "broadcast_id" uuid NOT NULL REFERENCES "communication_broadcasts"("id") ON DELETE cascade,
  "gym_id" uuid NOT NULL REFERENCES "gyms"("id") ON DELETE cascade,
  "member_id" uuid NOT NULL,
  "channel" varchar(16) NOT NULL,
  "contact_masked" varchar(64),
  "status" varchar(16) DEFAULT 'QUEUED' NOT NULL,
  "skip_reason" varchar(64),
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_comm_broadcasts_gym_created" ON "communication_broadcasts" ("gym_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_comm_broadcasts_expires" ON "communication_broadcasts" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_comm_recipients_broadcast" ON "communication_broadcast_recipients" ("broadcast_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_comm_recipients_unique" ON "communication_broadcast_recipients" ("broadcast_id", "member_id", "channel");
