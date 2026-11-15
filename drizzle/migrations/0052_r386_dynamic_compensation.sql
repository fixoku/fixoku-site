ALTER TABLE public.r6_training_group_participants ADD COLUMN IF NOT EXISTS compensation_minor integer CHECK (compensation_minor > 0);
