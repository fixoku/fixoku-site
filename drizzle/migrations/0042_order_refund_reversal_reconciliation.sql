-- R96D-6B: Owner refund request/approval/provider-verification authority.
-- This migration records the state machine; it never calls a payment provider.

CREATE TABLE IF NOT EXISTS order_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'REQUESTED',
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  reason text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  request_hash text NOT NULL,
  approved_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  provider text,
  provider_reference text,
  provider_transaction_id text,
  provider_verification_reference text,
  provider_verified_at timestamptz,
  verified_amount_minor integer,
  entitlement_revoked_at timestamptz,
  payout_reconciled_at timestamptz,
  rejected_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_refund_requests_status_chk CHECK (status IN ('REQUESTED','OWNER_APPROVED','REFUND_PENDING_PROVIDER','REFUNDED','REJECTED','CANCELLED')),
  CONSTRAINT order_refund_requests_amount_chk CHECK (amount_minor > 0),
  CONSTRAINT order_refund_requests_currency_chk CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT order_refund_requests_verified_amount_chk CHECK (verified_amount_minor IS NULL OR verified_amount_minor > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_refund_requests_active_order_uq
  ON order_refund_requests(order_id)
  WHERE status IN ('REQUESTED','OWNER_APPROVED','REFUND_PENDING_PROVIDER');
CREATE INDEX IF NOT EXISTS order_refund_requests_order_idx
  ON order_refund_requests(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_refund_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES order_refund_requests(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  previous_status text,
  next_status text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_refund_request_events_type_chk CHECK (event_type IN ('REQUESTED','OWNER_APPROVED','REJECTED','PROVIDER_VERIFIED','ENTITLEMENTS_REVOKED','PAYOUT_RECONCILED'))
);
CREATE INDEX IF NOT EXISTS order_refund_request_events_request_idx
  ON order_refund_request_events(refund_request_id, created_at, id);
