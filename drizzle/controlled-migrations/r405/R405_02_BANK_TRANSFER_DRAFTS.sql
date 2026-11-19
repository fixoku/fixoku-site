-- R405_02. Additive only; controlled manual migration.
-- No order, payment, notification or entitlement is created by this table.
CREATE TABLE public.bank_transfer_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL REFERENCES public.platform_users(id) ON DELETE RESTRICT,
  checkout_kind text NOT NULL CHECK (checkout_kind IN ('STUDENT','TRAINER')),
  scope_key text NOT NULL CHECK (char_length(scope_key) BETWEEN 1 AND 160),
  cart_sha256 text NOT NULL CHECK (cart_sha256 ~ '^[0-9a-f]{64}$'),
  reference text NOT NULL UNIQUE DEFAULT ('FIXOKU-' || upper(replace(gen_random_uuid()::text,'-',''))),
  expected_amount_minor bigint NOT NULL CHECK (expected_amount_minor > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  student_order_id uuid UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  trainer_order_id uuid UNIQUE REFERENCES public.trainer_package_orders(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT r405_draft_reference_chk CHECK (reference ~ '^FIXOKU-[0-9A-F]{32}$'),
  CONSTRAINT r405_draft_order_kind_chk CHECK (
    (student_order_id IS NULL AND trainer_order_id IS NULL AND submitted_at IS NULL)
    OR (checkout_kind='STUDENT' AND student_order_id IS NOT NULL AND trainer_order_id IS NULL AND submitted_at IS NOT NULL)
    OR (checkout_kind='TRAINER' AND trainer_order_id IS NOT NULL AND student_order_id IS NULL AND submitted_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX r405_draft_open_cart_uq ON public.bank_transfer_checkout_drafts
 (buyer_user_id,checkout_kind,scope_key,cart_sha256) WHERE submitted_at IS NULL;
CREATE INDEX r405_draft_buyer_idx ON public.bank_transfer_checkout_drafts
 (buyer_user_id,checkout_kind,created_at DESC);