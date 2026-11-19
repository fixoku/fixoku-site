BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.paytr_payment_attempts
  ADD COLUMN IF NOT EXISTS token_ciphertext text,
  ADD COLUMN IF NOT EXISTS token_iv text,
  ADD COLUMN IF NOT EXISTS token_auth_tag text,
  ADD COLUMN IF NOT EXISTS token_key_version text,
  ADD COLUMN IF NOT EXISTS token_lease_id uuid,
  ADD COLUMN IF NOT EXISTS token_lease_until timestamptz;

ALTER TABLE public.paytr_payment_attempts
  DROP CONSTRAINT IF EXISTS paytr_payment_attempts_order_ref_chk;

ALTER TABLE public.paytr_payment_attempts
  ADD CONSTRAINT paytr_payment_attempts_order_ref_chk CHECK (
    (order_kind = 'STUDENT_ORDER'
      AND student_order_id IS NOT NULL
      AND student_order_id = order_id
      AND trainer_order_id IS NULL)
    OR
    (order_kind = 'TRAINER_PACKAGE_ORDER'
      AND trainer_order_id IS NOT NULL
      AND trainer_order_id = order_id
      AND student_order_id IS NULL)
  );

ALTER TABLE public.paytr_payment_attempts
  ADD CONSTRAINT paytr_payment_attempts_token_material_chk CHECK (
    (token_status NOT IN ('READY', 'EXPIRED') AND token_ciphertext IS NULL AND token_iv IS NULL AND token_auth_tag IS NULL)
    OR
    (token_status = 'READY' AND token_ciphertext IS NOT NULL AND token_iv IS NOT NULL AND token_auth_tag IS NOT NULL)
    OR
    (token_status = 'EXPIRED' AND token_ciphertext IS NOT NULL AND token_iv IS NOT NULL AND token_auth_tag IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS paytr_payment_attempts_token_lease_idx
  ON public.paytr_payment_attempts(token_lease_until, status)
  WHERE status IN ('CREATED', 'TOKEN_PENDING', 'TOKEN_READY', 'FAILED', 'CANCELLED');

CREATE OR REPLACE FUNCTION public.paytr_payment_attempt_status_transition_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status = 'SUPERSEDED' THEN RAISE EXCEPTION 'PAYTR_ATTEMPT_TERMINAL_STATUS'; END IF;
  IF OLD.status = 'SUCCEEDED' AND NEW.status <> 'SUCCEEDED' THEN RAISE EXCEPTION 'PAYTR_ATTEMPT_SUCCEEDED_IMMUTABLE'; END IF;
  IF NOT (
    (OLD.status = 'CREATED' AND NEW.status IN ('TOKEN_PENDING','TOKEN_READY','SUCCEEDED','FAILED','CANCELLED')) OR
    (OLD.status = 'TOKEN_PENDING' AND NEW.status IN ('TOKEN_READY','FAILED','UNKNOWN','REVIEW','CANCELLED')) OR
    (OLD.status = 'TOKEN_READY' AND NEW.status IN ('PAYMENT_PENDING','SUCCEEDED','FAILED','UNKNOWN','REVIEW','CANCELLED')) OR
    (OLD.status = 'PAYMENT_PENDING' AND NEW.status IN ('SUCCEEDED','FAILED','UNKNOWN','REVIEW')) OR
    (OLD.status IN ('UNKNOWN','REVIEW') AND NEW.status IN ('SUCCEEDED','CANCELLED','SUPERSEDED')) OR
    (OLD.status IN ('FAILED','CANCELLED') AND NEW.status IN ('CREATED','SUCCEEDED','SUPERSEDED'))
  ) THEN RAISE EXCEPTION 'PAYTR_ATTEMPT_STATUS_TRANSITION_INVALID'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS paytr_payment_attempt_status_transition ON public.paytr_payment_attempts;
CREATE TRIGGER paytr_payment_attempt_status_transition
BEFORE UPDATE OF status ON public.paytr_payment_attempts
FOR EACH ROW EXECUTE FUNCTION public.paytr_payment_attempt_status_transition_guard();

COMMIT;

-- Rollback is forward-only and data preserving. Disable only the trigger/index
-- on an approved disposable target; never delete token or settlement evidence.
