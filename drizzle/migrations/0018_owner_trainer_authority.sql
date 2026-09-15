-- 003B owner/trainer authority. Append-only and additive; payment/logistics remain untouched.
DO $$ BEGIN ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'OWNER'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE trainer_earning_status ADD VALUE IF NOT EXISTS 'PENDING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE trainer_earning_status ADD VALUE IF NOT EXISTS 'PAYABLE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE trainer_qualification_source AS ENUM ('PACKAGE_COMPLETION','ADMIN_GRANT','LEGACY_IMPORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS source trainer_qualification_source NOT NULL DEFAULT 'ADMIN_GRANT';
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS granted_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS valid_from timestamptz NOT NULL DEFAULT now();
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS valid_until timestamptz;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS status_reason text;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT;
ALTER TABLE trainer_qualifications ADD COLUMN IF NOT EXISTS revoked_reason text;
CREATE TABLE IF NOT EXISTS trainer_qualification_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), qualification_id uuid NOT NULL REFERENCES trainer_qualifications(id) ON DELETE RESTRICT,
 trainer_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
 training_program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE RESTRICT,
 status trainer_qualification_status NOT NULL, source trainer_qualification_source NOT NULL,
 changed_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT, reason text, changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE trainer_assignments ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE trainer_assignments ADD COLUMN IF NOT EXISTS ended_reason text;
CREATE UNIQUE INDEX IF NOT EXISTS trainer_assignments_one_active_per_enrollment_uq ON trainer_assignments(enrollment_id) WHERE status='ACTIVE';
CREATE TABLE IF NOT EXISTS trainer_assignment_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES trainer_assignments(id) ON DELETE RESTRICT,
 enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT, trainer_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
 event_type text NOT NULL, reason text, changed_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT, occurred_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN CREATE TYPE trainer_compensation_type AS ENUM ('FIXED_AMOUNT','PERCENTAGE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS trainer_compensation_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), package_version_id uuid NOT NULL REFERENCES package_versions(id) ON DELETE RESTRICT,
 trainer_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT, type trainer_compensation_type NOT NULL,
 rate_minor integer, percentage_bps integer, calculation_base text NOT NULL DEFAULT 'ORDER_TOTAL', currency text NOT NULL DEFAULT 'TRY',
 created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((type='FIXED_AMOUNT' AND rate_minor IS NOT NULL AND rate_minor>=0 AND percentage_bps IS NULL) OR (type='PERCENTAGE' AND percentage_bps IS NOT NULL AND percentage_bps BETWEEN 0 AND 10000 AND rate_minor IS NULL))
);
CREATE TABLE IF NOT EXISTS trainer_compensation_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL UNIQUE REFERENCES trainer_assignments(id) ON DELETE RESTRICT,
 trainer_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT, enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
 package_version_id uuid REFERENCES package_versions(id) ON DELETE RESTRICT, type trainer_compensation_type NOT NULL,
 rate_minor integer, percentage_bps integer, calculation_base text NOT NULL, currency text NOT NULL, snapshotted_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN CREATE TYPE enrollment_session_status AS ENUM ('SCHEDULED','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS enrollment_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
 assignment_id uuid REFERENCES trainer_assignments(id) ON DELETE RESTRICT, trainer_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
 status enrollment_session_status NOT NULL DEFAULT 'SCHEDULED', progress_percent integer NOT NULL DEFAULT 0, notes text,
 started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS enrollment_completions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE RESTRICT,
 assignment_id uuid REFERENCES trainer_assignments(id) ON DELETE RESTRICT, completed_by uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
 completed_at timestamptz NOT NULL DEFAULT now(), idempotency_key text NOT NULL UNIQUE, metadata_json text NOT NULL DEFAULT '{}'
);
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES trainer_assignments(id) ON DELETE RESTRICT;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS enrollment_id uuid REFERENCES enrollments(id) ON DELETE RESTRICT;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS compensation_snapshot_id uuid REFERENCES trainer_compensation_snapshots(id) ON DELETE RESTRICT;
