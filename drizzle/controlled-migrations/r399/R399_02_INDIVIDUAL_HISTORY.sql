BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='trainer_assignments_one_active_per_enrollment_uq' AND i.indisunique AND i.indisvalid AND i.indpred IS NOT NULL AND i.indrelid='public.trainer_assignments'::regclass) THEN RAISE EXCEPTION 'ACTIVE_ASSIGNMENT_GUARD_MISSING'; END IF;
END $$;
ALTER TABLE public.trainer_assignments DROP CONSTRAINT IF EXISTS trainer_assignments_trainer_enrollment_uq;
DROP INDEX IF EXISTS public.trainer_assignments_trainer_enrollment_uq;
COMMIT;
