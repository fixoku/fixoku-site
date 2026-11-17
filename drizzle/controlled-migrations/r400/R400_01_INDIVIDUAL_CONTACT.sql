BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.trainer_assignments
 ADD COLUMN contact_status text NOT NULL DEFAULT 'PENDING',
 ADD COLUMN contact_updated_at timestamptz,
 ADD COLUMN agreed_start_at timestamptz,
 ADD CONSTRAINT r400_individual_contact_status_chk CHECK (contact_status IN ('PENDING','UNREACHABLE','CONTACTED','AGREED')),
 ADD CONSTRAINT r400_individual_agreement_chk CHECK (contact_status <> 'AGREED' OR agreed_start_at IS NOT NULL);
COMMIT;
