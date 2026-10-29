-- Owner-granted student packages are canonical entitlements without an order.
-- They must never fabricate payment, revenue, payment_intent or shipment rows.
ALTER TABLE package_entitlements
  ALTER COLUMN source_order_id DROP NOT NULL,
  ALTER COLUMN source_order_item_id DROP NOT NULL;

ALTER TABLE package_entitlements
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'ORDER',
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS revoke_reason text;

DO $$ BEGIN
  ALTER TABLE package_entitlements
    ADD CONSTRAINT package_entitlements_source_type_chk CHECK (source_type IN ('ORDER','OWNER_MANUAL'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE package_entitlement_enrollments
  ALTER COLUMN source_order_item_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS package_entitlements_owner_manual_active_uq
  ON package_entitlements (beneficiary_student_user_id, package_version_id)
  WHERE source_type='OWNER_MANUAL' AND status='ACTIVE';

CREATE INDEX IF NOT EXISTS package_entitlements_source_type_idx
  ON package_entitlements (source_type, beneficiary_student_user_id, status);
