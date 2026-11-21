BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.shipment_dispatches
 ADD COLUMN measurement_status_r408 text NOT NULL DEFAULT 'NOT_REQUIRED',
 ADD COLUMN measurement_started_at_r408 timestamptz,
 ADD COLUMN measurement_finished_at_r408 timestamptz,
 ADD CONSTRAINT shipment_measurement_status_r408_chk CHECK (measurement_status_r408 IN ('NOT_REQUIRED','PENDING','IN_PROGRESS','CONFIRMED','REVIEW_REQUIRED'));
COMMIT;
