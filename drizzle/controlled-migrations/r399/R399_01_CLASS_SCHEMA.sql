BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.r6_training_groups
    ADD COLUMN class_number integer,
    ADD COLUMN scheduled_start_at timestamptz,
    ADD COLUMN schedule_updated_at timestamptz,
    ADD COLUMN schedule_updated_by uuid
        REFERENCES public.platform_users(id)
        ON DELETE RESTRICT;

ALTER TABLE public.r6_training_groups
    ADD CONSTRAINT r399_class_number_positive
    CHECK (class_number IS NULL OR class_number > 0);

WITH numbered AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY trainer_user_id
            ORDER BY created_at,id
        )::integer AS class_no
    FROM public.r6_training_groups
    WHERE trainer_user_id IS NOT NULL
      AND mode = 'GROUP'
)
UPDATE public.r6_training_groups g
SET class_number = n.class_no
FROM numbered n
WHERE g.id = n.id;

CREATE UNIQUE INDEX r399_trainer_class_number_uq
ON public.r6_training_groups (
    trainer_user_id,
    class_number
)
WHERE trainer_user_id IS NOT NULL
  AND class_number IS NOT NULL;

CREATE INDEX r399_class_assignment_search_idx
ON public.r6_training_groups (
    trainer_user_id,
    education_stage,
    training_type,
    status,
    scheduled_start_at
);

ALTER TABLE public.r6_training_group_participants
    ADD COLUMN contact_status text
        NOT NULL DEFAULT 'PENDING',
    ADD COLUMN contact_updated_at timestamptz,
    ADD COLUMN agreed_start_at timestamptz,
    ADD COLUMN removed_at timestamptz,
    ADD COLUMN removed_by uuid
        REFERENCES public.platform_users(id)
        ON DELETE RESTRICT,
    ADD COLUMN removal_reason text;

ALTER TABLE public.r6_training_group_participants
    ADD CONSTRAINT r399_participant_contact_status_chk
    CHECK (
        contact_status IN (
            'PENDING',
            'UNREACHABLE',
            'CONTACTED',
            'AGREED'
        )
    ),
    ADD CONSTRAINT r399_participant_agreement_chk
    CHECK (
        contact_status <> 'AGREED'
        OR agreed_start_at IS NOT NULL
    );

ALTER TABLE public.r6_student_child_profiles
    ADD COLUMN photo_storage_key text,
    ADD COLUMN school text,
    ADD COLUMN class_branch text;

COMMIT;