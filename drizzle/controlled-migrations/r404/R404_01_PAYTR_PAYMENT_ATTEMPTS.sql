BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $$ BEGIN
  CREATE TYPE public.paytr_payment_attempt_kind AS ENUM ('STUDENT_ORDER', 'TRAINER_PACKAGE_ORDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.paytr_payment_attempt_status AS ENUM ('CREATED', 'TOKEN_PENDING', 'TOKEN_READY', 'PAYMENT_PENDING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'REVIEW', 'CANCELLED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.paytr_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_kind public.paytr_payment_attempt_kind NOT NULL,
  order_id uuid NOT NULL,
  student_order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  trainer_order_id uuid REFERENCES public.trainer_package_orders(id) ON DELETE RESTRICT,
  merchant_oid text NOT NULL UNIQUE,
  status public.paytr_payment_attempt_status NOT NULL DEFAULT 'CREATED',
  environment text NOT NULL DEFAULT 'TEST',
  token_status text NOT NULL DEFAULT 'NOT_REQUESTED',
  token_requested_at timestamptz,
  token_expires_at timestamptz,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  collected_amount_minor integer,
  installment_count integer,
  installment_difference_minor integer,
  provider_reference text,
  provider_transaction_id text,
  last_callback_status text,
  last_callback_hash text,
  last_error_code text,
  review_reason text,
  review_required boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  succeeded_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paytr_payment_attempts_order_ref_chk CHECK (
    (order_kind = 'STUDENT_ORDER' AND student_order_id = order_id AND trainer_order_id IS NULL)
    OR
    (order_kind = 'TRAINER_PACKAGE_ORDER' AND trainer_order_id = order_id AND student_order_id IS NULL)
  ),
  CONSTRAINT paytr_payment_attempts_environment_chk CHECK (environment IN ('TEST', 'LIVE')),
  CONSTRAINT paytr_payment_attempts_token_status_chk CHECK (token_status IN ('NOT_REQUESTED', 'PENDING', 'READY', 'EXPIRED', 'FAILED')),
  CONSTRAINT paytr_payment_attempts_amount_chk CHECK (amount_minor > 0),
  CONSTRAINT paytr_payment_attempts_collected_chk CHECK (collected_amount_minor IS NULL OR collected_amount_minor > 0),
  CONSTRAINT paytr_payment_attempts_installments_chk CHECK (installment_count IS NULL OR installment_count BETWEEN 1 AND 12),
  CONSTRAINT paytr_payment_attempts_currency_chk CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS paytr_payment_attempts_student_order_active_uq
  ON public.paytr_payment_attempts(order_id)
  WHERE order_kind = 'STUDENT_ORDER'
    AND status IN ('CREATED', 'TOKEN_PENDING', 'TOKEN_READY', 'PAYMENT_PENDING', 'UNKNOWN', 'REVIEW');

CREATE UNIQUE INDEX IF NOT EXISTS paytr_payment_attempts_trainer_order_active_uq
  ON public.paytr_payment_attempts(order_id)
  WHERE order_kind = 'TRAINER_PACKAGE_ORDER'
    AND status IN ('CREATED', 'TOKEN_PENDING', 'TOKEN_READY', 'PAYMENT_PENDING', 'UNKNOWN', 'REVIEW');

CREATE INDEX IF NOT EXISTS paytr_payment_attempts_order_status_idx
  ON public.paytr_payment_attempts(order_kind, order_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS paytr_payment_attempts_review_idx
  ON public.paytr_payment_attempts(review_required, status, updated_at DESC)
  WHERE review_required = true;

COMMIT;

-- Rollback plan (manual, approved disposable/staging target only):
-- BEGIN;
-- DROP TABLE IF EXISTS public.paytr_payment_attempts;
-- DROP TYPE IF EXISTS public.paytr_payment_attempt_status;
-- DROP TYPE IF EXISTS public.paytr_payment_attempt_kind;
-- COMMIT;
