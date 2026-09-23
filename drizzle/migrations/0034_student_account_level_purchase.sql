-- CORE 001: student packages are purchased by the account. Existing
-- profile-scoped cart rows remain valid; new rows use a NULL beneficiary
-- profile and retain the catalog segment used for eligibility.
ALTER TABLE student_cart_items
  ALTER COLUMN beneficiary_student_profile_id DROP NOT NULL;

ALTER TABLE student_cart_items
  ADD COLUMN IF NOT EXISTS catalog_education_stage education_stage,
  ADD COLUMN IF NOT EXISTS catalog_grade text;

-- Keep the 0026 profile-scoped unique constraint for legacy beneficiary rows.
-- Account rows use a separate partial key because NULL profiles are not
-- interchangeable with an explicitly selected legacy profile.
CREATE UNIQUE INDEX IF NOT EXISTS student_cart_items_buyer_account_version_uq
  ON student_cart_items (buyer_user_id, package_version_id)
  WHERE beneficiary_student_profile_id IS NULL;

CREATE INDEX IF NOT EXISTS student_cart_items_buyer_account_idx
  ON student_cart_items (buyer_user_id, updated_at)
  WHERE beneficiary_student_profile_id IS NULL;
