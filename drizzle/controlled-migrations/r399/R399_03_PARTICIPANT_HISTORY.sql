BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $guard$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class c ON c.oid=i.indexrelid
        WHERE c.relname='r6_training_group_participants_uq'
        AND i.indrelid='public.r6_training_group_participants'::regclass
        AND i.indisvalid AND i.indisunique
        AND i.indpred IS NULL
    ) THEN
        RAISE EXCEPTION 'EXPECTED_LEGACY_INDEX_MISSING';
    END IF;
END
$guard$;

CREATE UNIQUE INDEX r399_participant_current_identity_uq
ON public.r6_training_group_participants (
    training_group_id,
    COALESCE(child_profile_id,student_profile_id,student_user_id)
)
WHERE status='ACTIVE' OR status='COMPLETED';

DROP INDEX public.r6_training_group_participants_uq;

COMMIT;
