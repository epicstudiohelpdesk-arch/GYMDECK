-- ==============================================================================
-- GymDeck Cloud Backend - Initial PostgreSQL Multi-Tenant Domain Schema (0000)
-- Generated for Drizzle ORM
-- ==============================================================================

-- 1. GYM TENANTS
CREATE TABLE IF NOT EXISTS "gyms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"owner_user_id" uuid,
	"address" text,
	"contact_phone" varchar(32),
	"contact_email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gyms_code_unique" UNIQUE("code")
);

CREATE INDEX IF NOT EXISTS "idx_gyms_code" ON "gyms" ("code");
CREATE INDEX IF NOT EXISTS "idx_gyms_status" ON "gyms" ("status");

-- 2. GYM MEMBERS IDENTITY
CREATE TABLE IF NOT EXISTS "gym_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_code" varchar(64) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"alternate_phone" varchar(32),
	"email" varchar(255),
	"gender" varchar(32),
	"dob" date,
	"address" text,
	"profile_photo_url" text,
	"membership_status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "fk_gym_members_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_gym_members_gym_code" ON "gym_members" ("gym_id", "member_code");
CREATE INDEX IF NOT EXISTS "idx_gym_members_gym" ON "gym_members" ("gym_id");
CREATE INDEX IF NOT EXISTS "idx_gym_members_gym_phone" ON "gym_members" ("gym_id", "phone");
CREATE INDEX IF NOT EXISTS "idx_gym_members_gym_email" ON "gym_members" ("gym_id", "email");
CREATE INDEX IF NOT EXISTS "idx_gym_members_status" ON "gym_members" ("gym_id", "membership_status");

-- 3. AUTHENTICATION & CREDENTIALS
CREATE TABLE IF NOT EXISTS "member_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_member_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(32),
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"account_status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "fk_member_accounts_member" FOREIGN KEY ("gym_member_id") REFERENCES "gym_members"("id") ON DELETE cascade,
	CONSTRAINT "fk_member_accounts_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_member_accounts_email" ON "member_accounts" ("email");
CREATE INDEX IF NOT EXISTS "idx_member_accounts_gym_member" ON "member_accounts" ("gym_id", "gym_member_id");

CREATE TABLE IF NOT EXISTS "email_verification_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_email_otps_email_exp" ON "email_verification_otps" ("email", "expires_at");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_account_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_pwd_reset_acc" FOREIGN KEY ("member_account_id") REFERENCES "member_accounts"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_pwd_reset_acc_token" ON "password_reset_tokens" ("member_account_id", "token_hash");

CREATE TABLE IF NOT EXISTS "member_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_account_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"family_id" uuid NOT NULL,
	"device_fingerprint" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_refresh_tokens_acc" FOREIGN KEY ("member_account_id") REFERENCES "member_accounts"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_account" ON "member_refresh_tokens" ("member_account_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_hash" ON "member_refresh_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family" ON "member_refresh_tokens" ("family_id");

-- 4. MEMBERSHIP PLANS & INSTANCES
CREATE TABLE IF NOT EXISTS "membership_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"plan_name" varchar(255) NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"benefits" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "fk_plans_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_plans_gym" ON "membership_plans" ("gym_id", "is_active");

CREATE TABLE IF NOT EXISTS "member_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_member_memberships_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_member_memberships_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade,
	CONSTRAINT "fk_member_memberships_plan" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE restrict
);

CREATE INDEX IF NOT EXISTS "idx_member_memberships_gym_mem" ON "member_memberships" ("gym_id", "member_id");
CREATE INDEX IF NOT EXISTS "idx_member_memberships_status" ON "member_memberships" ("member_id", "status");

-- 5. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS "attendance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"check_in_time" timestamp with time zone DEFAULT now() NOT NULL,
	"check_out_time" timestamp with time zone,
	"entry_method" varchar(32) DEFAULT 'QR_DYNAMIC' NOT NULL,
	"device_metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_attendance_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_attendance_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_attendance_gym_member" ON "attendance_logs" ("gym_id", "member_id", "check_in_time");
CREATE INDEX IF NOT EXISTS "idx_attendance_gym_time" ON "attendance_logs" ("gym_id", "check_in_time");

-- 6. WORKOUT ROUTINES, SESSIONS & LOGS
CREATE TABLE IF NOT EXISTS "workout_routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"assigned_member_id" uuid,
	"trainer_id" uuid,
	"title" varchar(255) NOT NULL,
	"day_of_week" varchar(32),
	"estimated_duration_minutes" integer DEFAULT 45 NOT NULL,
	"target_muscle_groups" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_routines_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_routines_member" FOREIGN KEY ("assigned_member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_routines_gym_member" ON "workout_routines" ("gym_id", "assigned_member_id");

CREATE TABLE IF NOT EXISTS "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"routine_id" uuid NOT NULL,
	"exercise_order" integer DEFAULT 1 NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_muscle" varchar(128) NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"target_reps" varchar(64) DEFAULT '10-12' NOT NULL,
	"suggested_weight_kg" numeric(6, 2),
	"rest_seconds" integer DEFAULT 60 NOT NULL,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_exercises_routine" FOREIGN KEY ("routine_id") REFERENCES "workout_routines"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_exercises_routine_order" ON "workout_exercises" ("routine_id", "exercise_order");

CREATE TABLE IF NOT EXISTS "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"routine_id" uuid,
	"session_name" varchar(255) NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"duration_minutes" integer,
	"total_volume_kg" numeric(10, 2) DEFAULT '0',
	"completed_sets_count" integer DEFAULT 0,
	"status" varchar(32) DEFAULT 'IN_PROGRESS' NOT NULL,
	"idempotency_key" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_sessions_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_sessions_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade,
	CONSTRAINT "fk_sessions_routine" FOREIGN KEY ("routine_id") REFERENCES "workout_routines"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "idx_sessions_gym_member" ON "workout_sessions" ("gym_id", "member_id", "start_time");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sessions_idempotency" ON "workout_sessions" ("idempotency_key");

CREATE TABLE IF NOT EXISTS "workout_logged_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid,
	"exercise_name" varchar(255) NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2) DEFAULT '0' NOT NULL,
	"reps_completed" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_sets_session" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_logged_sets_session" ON "workout_logged_sets" ("session_id", "set_number");

-- 7. PERSONAL TRAINERS & PT PACKAGES
CREATE TABLE IF NOT EXISTS "trainers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32) NOT NULL,
	"specialization" varchar(255),
	"experience_years" integer DEFAULT 1,
	"certifications" text,
	"bio" text,
	"photo_url" text,
	"rating" numeric(3, 2) DEFAULT '5.00',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_trainers_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_trainers_gym" ON "trainers" ("gym_id", "is_active");

CREATE TABLE IF NOT EXISTS "pt_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"package_name" varchar(255) NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"remaining_sessions" integer NOT NULL,
	"expiry_date" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_pt_packages_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_pt_packages_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade,
	CONSTRAINT "fk_pt_packages_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE restrict
);

CREATE INDEX IF NOT EXISTS "idx_pt_packages_gym_member" ON "pt_packages" ("gym_id", "member_id");

CREATE TABLE IF NOT EXISTS "pt_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"trainer_id" uuid NOT NULL,
	"session_date" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"focus_area" varchar(255) NOT NULL,
	"trainer_notes" text,
	"status" varchar(32) DEFAULT 'COMPLETED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_pt_sessions_package" FOREIGN KEY ("package_id") REFERENCES "pt_packages"("id") ON DELETE cascade,
	CONSTRAINT "fk_pt_sessions_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_pt_sessions_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade,
	CONSTRAINT "fk_pt_sessions_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE restrict
);

CREATE INDEX IF NOT EXISTS "idx_pt_sessions_package" ON "pt_sessions" ("package_id");
CREATE INDEX IF NOT EXISTS "idx_pt_sessions_gym_member" ON "pt_sessions" ("gym_id", "member_id", "session_date");

-- 8. MEMBER DOCUMENTS (Metadata Only)
CREATE TABLE IF NOT EXISTS "member_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" varchar(128) DEFAULT 'application/pdf' NOT NULL,
	"file_size_bytes" integer,
	"status" varchar(32) DEFAULT 'VERIFIED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_documents_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_documents_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_member_documents_gym_member" ON "member_documents" ("gym_id", "member_id");

-- 9. NOTIFICATIONS & RECIPIENTS FEED
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"category" varchar(64) DEFAULT 'GENERAL' NOT NULL,
	"target_scope" varchar(32) DEFAULT 'ALL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_notifications_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_notifications_gym" ON "notifications" ("gym_id", "created_at");

CREATE TABLE IF NOT EXISTS "member_notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_notif_recipients_notif" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE cascade,
	CONSTRAINT "fk_notif_recipients_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_notif_recipients_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_notif_recipients_unread" ON "member_notification_recipients" ("gym_id", "member_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notif_recipients_notif_mem" ON "member_notification_recipients" ("notification_id", "member_id");

-- 10. FITNESS PROGRESS, MEASUREMENTS & MILESTONES
CREATE TABLE IF NOT EXISTS "body_weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"logged_date" date NOT NULL,
	"bmi" numeric(4, 1),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_weight_logs_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_weight_logs_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_weight_logs_gym_member_date" ON "body_weight_logs" ("gym_id", "member_id", "logged_date");

CREATE TABLE IF NOT EXISTS "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"measured_date" date NOT NULL,
	"chest_cm" numeric(5, 1),
	"waist_cm" numeric(5, 1),
	"arms_cm" numeric(5, 1),
	"thighs_cm" numeric(5, 1),
	"hips_cm" numeric(5, 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_measurements_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_measurements_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_measurements_gym_mem_date" ON "body_measurements" ("gym_id", "member_id", "measured_date");

CREATE TABLE IF NOT EXISTS "fitness_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"achieved_date" date NOT NULL,
	"badge_icon" varchar(64) DEFAULT 'award' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_milestones_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE cascade,
	CONSTRAINT "fk_milestones_member" FOREIGN KEY ("member_id") REFERENCES "gym_members"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_milestones_gym_member" ON "fitness_milestones" ("gym_id", "member_id");

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" uuid,
	"member_id" uuid,
	"actor_type" varchar(32) DEFAULT 'MEMBER' NOT NULL,
	"action" varchar(128) NOT NULL,
	"resource" varchar(128) NOT NULL,
	"resource_id" varchar(128),
	"request_id" varchar(128),
	"metadata" text,
	"ip_address" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fk_audit_gym" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_gym" ON "audit_logs" ("gym_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs" ("resource", "resource_id");
