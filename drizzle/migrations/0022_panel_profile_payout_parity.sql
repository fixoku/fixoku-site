ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "district" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "education_background" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "experience" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "specialties" text;
ALTER TABLE "trainer_profiles" ADD COLUMN IF NOT EXISTS "photo_storage_key" text;

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "photo_storage_key" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "date_of_birth" date;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "class_branch" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "school_type" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "district" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "guardian_relation" text;

CREATE TABLE IF NOT EXISTS "trainer_payout_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trainer_user_id" uuid NOT NULL UNIQUE REFERENCES "platform_users"("id") ON DELETE RESTRICT,
  "account_holder_name" text NOT NULL,
  "bank_name" text NOT NULL,
  "iban" text NOT NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "trainer_payout_accounts_updated_idx" ON "trainer_payout_accounts" ("updated_at");
