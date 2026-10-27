-- R64 child identity isolation. Apply only after a verified disposable-DB preflight.
-- This migration never deletes or rewrites existing enrollment/participant rows.

-- The historical 0029 migration created the participant uniqueness as a UNIQUE
-- constraint. Some environments may instead contain a standalone unique index
-- with a different name, so discover the legacy object from its definition.
DO $$
DECLARE
  legacy_constraint text;
  legacy_index text;
BEGIN
  IF to_regclass('public.r6_training_group_participants') IS NULL THEN
    RAISE EXCEPTION 'R64_PARTICIPANT_TABLE_MISSING';
  END IF;

  SELECT c.conname
    INTO legacy_constraint
    FROM pg_constraint c
   WHERE c.conrelid = 'public.r6_training_group_participants'::regclass
     AND c.contype = 'u'
     AND pg_get_constraintdef(c.oid) = 'UNIQUE (training_group_id, student_user_id)'
   LIMIT 1;

  IF legacy_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.r6_training_group_participants DROP CONSTRAINT %I',
      legacy_constraint
    );
  END IF;

  FOR legacy_index IN
    SELECT indexname
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'r6_training_group_participants'
       AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
       AND indexdef ILIKE '%(training_group_id, student_user_id)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', legacy_index);
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS r6_training_group_participants_uq
  ON r6_training_group_participants (
    training_group_id,
    COALESCE(child_profile_id, student_profile_id, student_user_id)
  );

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS beneficiary_child_profile_id uuid;

DO $$
DECLARE
  child_attnum smallint;
  child_type text;
BEGIN
  IF to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'R64_ENROLLMENTS_TABLE_MISSING';
  END IF;
  IF to_regclass('public.r6_student_child_profiles') IS NULL THEN
    RAISE EXCEPTION 'R64_CHILD_PROFILE_TABLE_MISSING';
  END IF;

  SELECT a.attnum
       , format_type(a.atttypid, a.atttypmod)
    INTO child_attnum, child_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.enrollments'::regclass
     AND a.attname = 'beneficiary_child_profile_id'
     AND NOT a.attisdropped;

  IF child_attnum IS NULL THEN
    RAISE EXCEPTION 'R64_CHILD_COLUMN_MISSING';
  END IF;
  IF child_type <> 'uuid' THEN
    RAISE EXCEPTION 'R64_CHILD_COLUMN_TYPE_INVALID: %', child_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
     WHERE c.conrelid = 'public.enrollments'::regclass
       AND c.contype = 'f'
       AND c.confrelid = 'public.r6_student_child_profiles'::regclass
       AND c.conkey = ARRAY[child_attnum]::smallint[]
       AND c.confdeltype = 'r'
  ) THEN
    ALTER TABLE public.enrollments
      ADD CONSTRAINT enrollments_beneficiary_child_profile_id_r6_student_child_profiles_id_fk
      FOREIGN KEY (beneficiary_child_profile_id)
      REFERENCES public.r6_student_child_profiles(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

-- Remove the legacy account-level enrollment uniqueness by definition. This
-- handles both the historical UNIQUE constraint and a standalone index whose
-- name differs between environments.
DO $$
DECLARE
  legacy_constraint text;
  legacy_index text;
BEGIN
  SELECT c.conname
    INTO legacy_constraint
    FROM pg_constraint c
   WHERE c.conrelid = 'public.enrollments'::regclass
     AND c.contype = 'u'
     AND pg_get_constraintdef(c.oid) = 'UNIQUE (student_user_id, training_program_id)'
   LIMIT 1;

  IF legacy_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.enrollments DROP CONSTRAINT %I',
      legacy_constraint
    );
  END IF;

  FOR legacy_index IN
    SELECT indexname
      FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'enrollments'
       AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
       AND indexdef ILIKE '%(student_user_id, training_program_id)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', legacy_index);
  END LOOP;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS enrollments_beneficiary_program_uq
  ON enrollments (
    student_user_id,
    training_program_id,
    COALESCE(beneficiary_child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
