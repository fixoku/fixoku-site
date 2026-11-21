BEGIN;

SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE public.r410_paytr_finance (
    attempt_id uuid PRIMARY KEY
        REFERENCES public.paytr_payment_attempts(id)
        ON DELETE RESTRICT,
    merchant_oid text NOT NULL UNIQUE,
    order_kind text NOT NULL
        CHECK (order_kind IN (
            'STUDENT_ORDER',
            'TRAINER_PACKAGE_ORDER'
        )),
    order_id uuid NOT NULL,
    currency text NOT NULL CHECK (currency='TRY'),
    order_amount_minor bigint NOT NULL
        CHECK (order_amount_minor>0),
    collected_amount_minor bigint NOT NULL,
    deduction_minor bigint NOT NULL
        CHECK (deduction_minor>=0),
    provider_net_minor bigint NOT NULL
        CHECK (provider_net_minor>=0),
    customer_difference_minor bigint NOT NULL
        CHECK (customer_difference_minor>=0),
    merchant_payment_cost_minor bigint NOT NULL,
    installment_count integer NOT NULL
        CHECK (installment_count BETWEEN 1 AND 12),
    installment_category text NOT NULL
        CHECK (installment_category IN (
            'SINGLE',
            'TWO_NO_CUSTOMER_SURCHARGE',
            'CUSTOMER_SURCHARGE',
            'OTHER_NO_CUSTOMER_SURCHARGE'
        )),
    evidence_sha256 text NOT NULL
        CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
    payment_at timestamptz NOT NULL,
    verified_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(order_kind,order_id),
    CHECK (
        collected_amount_minor =
        deduction_minor + provider_net_minor
    ),
    CHECK (
        collected_amount_minor =
        order_amount_minor + customer_difference_minor
    ),
    CHECK (
        merchant_payment_cost_minor =
        deduction_minor - customer_difference_minor
    )
);

CREATE INDEX r410_paytr_finance_period_idx
ON public.r410_paytr_finance(payment_at,currency);

CREATE TABLE public.r410_paytr_finance_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id uuid NOT NULL
        REFERENCES public.paytr_payment_attempts(id)
        ON DELETE RESTRICT,
    event_type text NOT NULL CHECK (
        event_type IN (
            'VERIFIED',
            'CONFLICT_REVIEW_REQUIRED'
        )
    ),
    evidence_sha256 text NOT NULL
        CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(attempt_id,event_type,evidence_sha256)
);

COMMIT;