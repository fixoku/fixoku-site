ALTER TABLE "digital_entitlements" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
CREATE INDEX IF NOT EXISTS "digital_entitlements_beneficiary_idx" ON "digital_entitlements" ("beneficiary_student_user_id","granted_at");

ALTER TABLE "notification_email_outbox" ADD COLUMN IF NOT EXISTS "attempt_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "notification_email_outbox" ADD COLUMN IF NOT EXISTS "last_error" text;
ALTER TABLE "notification_email_outbox" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamptz;
ALTER TABLE "notification_email_outbox" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;
ALTER TABLE "notification_email_outbox" ADD COLUMN IF NOT EXISTS "provider_message_id" text;
DO $$ BEGIN
  ALTER TABLE "notification_email_outbox" ADD CONSTRAINT "notification_email_outbox_attempt_chk" CHECK ("attempt_count" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "notification_email_outbox_claim_idx" ON "notification_email_outbox" ("status","next_attempt_at","created_at");
