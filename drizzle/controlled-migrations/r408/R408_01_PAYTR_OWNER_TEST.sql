-- FIXOKU R408 OWNER PAYTR ACCEPTANCE
-- Controlled additive migration.
-- Automatic execution: prohibited.
-- Production execution: requires separate explicit approval.
-- No existing customer order or payment table is modified.
-- Test records must never enter commercial fulfilment.

CREATE TABLE public.paytr_owner_test_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_user_id uuid NOT NULL
        REFERENCES public.platform_users(id)
        ON DELETE RESTRICT,

    merchant_oid varchar(64) NOT NULL UNIQUE,

    environment varchar(8) NOT NULL DEFAULT 'TEST',

    amount_minor integer NOT NULL DEFAULT 100,

    currency varchar(3) NOT NULL DEFAULT 'TRY',

    status varchar(24) NOT NULL DEFAULT 'CREATED',

    created_at timestamptz NOT NULL DEFAULT now(),

    expires_at timestamptz NOT NULL
        DEFAULT (now() + interval '30 minutes'),

    token_requested_at timestamptz,

    callback_received_at timestamptz,

    completed_at timestamptz,

    callback_count integer NOT NULL DEFAULT 0,

    callback_hash_sha256 varchar(64),

    collected_amount_minor integer,

    provider_verified boolean NOT NULL DEFAULT false,

    provider_transaction_reference varchar(160),

    last_error_code varchar(100),

    CONSTRAINT r408_owner_test_reference_chk
        CHECK (merchant_oid ~ '^FIXOKUR408TEST[0-9A-F]{32}$'),

    CONSTRAINT r408_owner_test_environment_chk
        CHECK (environment = 'TEST'),

    CONSTRAINT r408_owner_test_amount_chk
        CHECK (amount_minor = 100 AND currency = 'TRY'),

    CONSTRAINT r408_owner_test_status_chk
        CHECK (status IN (
            'CREATED',
            'TOKEN_PENDING',
            'TOKEN_READY',
            'SUCCEEDED',
            'FAILED',
            'REVIEW_REQUIRED',
            'EXPIRED'
        )),

    CONSTRAINT r408_owner_test_expiry_chk
        CHECK (expires_at > created_at
            AND expires_at <= created_at + interval '30 minutes'),

    CONSTRAINT r408_owner_test_callback_count_chk
        CHECK (callback_count >= 0),

    CONSTRAINT r408_owner_test_collected_chk
        CHECK (collected_amount_minor IS NULL
            OR collected_amount_minor >= 0),

    CONSTRAINT r408_owner_test_hash_chk
        CHECK (callback_hash_sha256 IS NULL
            OR callback_hash_sha256 ~ '^[0-9a-f]{64}$'),

    CONSTRAINT r408_owner_test_success_chk
        CHECK (
            status <> 'SUCCEEDED'
            OR (
                provider_verified IS TRUE
                AND collected_amount_minor IS NOT NULL
                AND collected_amount_minor = 100
                AND callback_received_at IS NOT NULL
                AND callback_hash_sha256 IS NOT NULL
                AND completed_at IS NOT NULL
                AND callback_count > 0
            )
        )
);

CREATE INDEX r408_owner_test_owner_created_idx
    ON public.paytr_owner_test_attempts
    (owner_user_id, created_at DESC);

CREATE INDEX r408_owner_test_status_idx
    ON public.paytr_owner_test_attempts
    (status, created_at DESC);

-- No DROP, TRUNCATE, DELETE or existing-table UPDATE.
-- Rollback strategy: disable the feature and preserve test audit records.