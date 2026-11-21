BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE public.r410_paytr_finance_checks (
    attempt_id uuid PRIMARY KEY
        REFERENCES public.paytr_payment_attempts(id)
        ON DELETE RESTRICT,
    status text NOT NULL CHECK(status IN (
        'PENDING',
        'VERIFIED',
        'REVIEW_REQUIRED',
        'RETRY_REQUIRED'
    )),
    check_count integer NOT NULL DEFAULT 0
        CHECK(check_count>=0),
    last_checked_at timestamptz,
    next_check_at timestamptz,
    last_error_code text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX r410_paytr_finance_checks_pending_idx
ON public.r410_paytr_finance_checks(
    status,next_check_at
);

COMMIT;