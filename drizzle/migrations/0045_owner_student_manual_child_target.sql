-- R80: Owner free student grants are unique per beneficiary target.
-- Account-level and child-level grants for the same package may coexist when
-- they represent different beneficiaries. No existing entitlement rows are
-- rewritten by this migration.
DROP INDEX IF EXISTS package_entitlements_owner_manual_active_uq;

CREATE UNIQUE INDEX IF NOT EXISTS package_entitlements_owner_manual_target_uq
  ON package_entitlements (
    beneficiary_student_user_id,
    package_version_id,
    COALESCE(beneficiary_child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE source_type='OWNER_MANUAL' AND status='ACTIVE';

