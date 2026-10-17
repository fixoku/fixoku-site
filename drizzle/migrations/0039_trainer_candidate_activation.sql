-- R33: Adds a binding between short application and verified candidate account.
-- Apply only after production migration chain certification and an isolated DB replay.
ALTER TABLE trainer_applications ADD COLUMN IF NOT EXISTS candidate_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS trainer_applications_candidate_user_id_uq ON trainer_applications(candidate_user_id) WHERE candidate_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS trainer_applications_email_status_idx ON trainer_applications(lower(email),status);
