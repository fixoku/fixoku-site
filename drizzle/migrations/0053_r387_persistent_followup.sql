ALTER TABLE public.trainer_assignments ADD COLUMN IF NOT EXISTS planned_at timestamptz;
ALTER TABLE public.r6_training_group_participants ADD COLUMN IF NOT EXISTS planned_at timestamptz;
