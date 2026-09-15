ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "guardian_name" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "guardian_phone" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "guardian_email" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "address_line" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "marketing_consent" boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "trainer_applications" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"first_name" text NOT NULL,"last_name" text NOT NULL,"email" text NOT NULL,"phone" text,"city" text,"education_background" text,"experience" text,"description" text,"requested_program" text,"legal_acknowledged" boolean NOT NULL DEFAULT false,"status" text NOT NULL DEFAULT 'RECEIVED',"review_note" text,"invitation_token_hash" text,"invitation_expires_at" timestamptz,"invitation_used_at" timestamptz,"created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "trainer_applications_status_idx" ON "trainer_applications" ("status", "created_at");
CREATE TABLE IF NOT EXISTS "account_closure_requests" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"user_id" uuid NOT NULL REFERENCES "platform_users"("id") ON DELETE RESTRICT,"reason" text,"status" text NOT NULL DEFAULT 'REQUESTED',"review_note" text,"created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "account_closure_requests_user_idx" ON "account_closure_requests" ("user_id", "created_at");

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "twoFactor" ("id" text PRIMARY KEY, "secret" text NOT NULL, "backup_codes" text NOT NULL, "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "verified" boolean NOT NULL DEFAULT true, "failed_verification_count" integer NOT NULL DEFAULT 0, "locked_until" timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_user_id_uq" ON "twoFactor" ("user_id");

CREATE TABLE IF NOT EXISTS "admin_invitations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" text NOT NULL, "intended_role" text NOT NULL DEFAULT 'SUPER_ADMIN', "token_hash" text NOT NULL UNIQUE, "expires_at" timestamptz NOT NULL, "used_at" timestamptz, "created_by" uuid NOT NULL REFERENCES "platform_users"("id") ON DELETE RESTRICT, "created_at" timestamptz NOT NULL DEFAULT now());
