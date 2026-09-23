-- Source-only family-offer cart item extension for FIXOKU_FAMILY_CART_001.
-- Do not apply to a real or shadow database in this task.
ALTER TABLE student_cart_items
  ALTER COLUMN package_version_id DROP NOT NULL;

ALTER TABLE student_cart_items
  ADD COLUMN IF NOT EXISTS family_offer_id uuid REFERENCES family_offers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS family_offer_revision_number integer;

ALTER TABLE student_cart_items
  ADD CONSTRAINT student_cart_items_family_shape_chk
  CHECK ((family_offer_id IS NULL AND package_version_id IS NOT NULL)
      OR (family_offer_id IS NOT NULL AND package_version_id IS NULL
          AND family_offer_revision_number IS NOT NULL AND quantity = 1));

CREATE UNIQUE INDEX IF NOT EXISTS student_cart_items_buyer_family_offer_uq
  ON student_cart_items (buyer_user_id, family_offer_id)
  WHERE beneficiary_student_profile_id IS NULL AND family_offer_id IS NOT NULL;
