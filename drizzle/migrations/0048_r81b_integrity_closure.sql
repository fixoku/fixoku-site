-- R81B forward-only integrity closure.
-- This migration refuses to rewrite historical rows. Invalid existing data
-- stops the migration before any new constraint or trigger is installed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM email_templates t
      LEFT JOIN email_template_revisions r ON r.id = t.published_revision_id
     WHERE t.published_revision_id IS NOT NULL
       AND (r.id IS NULL OR r.template_id IS DISTINCT FROM t.id OR r.status <> 'PUBLISHED')
  ) THEN
    RAISE EXCEPTION 'R81B_EMAIL_PUBLISHED_POINTER_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM package_entitlements pe
      JOIN r6_student_child_profiles c ON c.id = pe.beneficiary_child_profile_id
     WHERE c.owner_user_id IS DISTINCT FROM pe.beneficiary_student_user_id
  ) THEN
    RAISE EXCEPTION 'R81B_CHILD_ENTITLEMENT_OWNER_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM enrollments e
      JOIN r6_student_child_profiles c ON c.id = e.beneficiary_child_profile_id
     WHERE c.owner_user_id IS DISTINCT FROM e.student_user_id
  ) THEN
    RAISE EXCEPTION 'R81B_CHILD_ENROLLMENT_OWNER_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM package_entitlement_enrollments pee
      JOIN package_entitlements pe ON pe.id = pee.package_entitlement_id
      JOIN enrollments e ON e.id = pee.enrollment_id
     WHERE pe.beneficiary_student_user_id IS DISTINCT FROM e.student_user_id
        OR pe.beneficiary_child_profile_id IS DISTINCT FROM e.beneficiary_child_profile_id
        OR pee.training_program_id IS DISTINCT FROM e.training_program_id
        OR pee.source_order_item_id IS DISTINCT FROM pe.source_order_item_id
  ) THEN
    RAISE EXCEPTION 'R81B_ENTITLEMENT_ENROLLMENT_LINK_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM package_entitlements
     WHERE status = 'ACTIVE'
     GROUP BY beneficiary_student_user_id, package_version_id,
              COALESCE(beneficiary_child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'R81B_ACTIVE_ENTITLEMENT_DUPLICATE_PRECHECK_FAILED';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS package_entitlements_active_target_uq
  ON package_entitlements (
    beneficiary_student_user_id,
    package_version_id,
    COALESCE(beneficiary_child_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION fixoku_guard_email_template_revision_lifecycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PUBLISHED', 'ARCHIVED') THEN
      RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.template_id IS DISTINCT FROM NEW.template_id
     OR OLD.revision_number IS DISTINCT FROM NEW.revision_number
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
  END IF;

  IF OLD.status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_ARCHIVED';
  ELSIF OLD.status = 'PUBLISHED' THEN
    IF NEW.status NOT IN ('PUBLISHED', 'ARCHIVED')
       OR NEW.published_by IS DISTINCT FROM OLD.published_by
       OR NEW.published_at IS DISTINCT FROM OLD.published_at
       OR OLD.display_name IS DISTINCT FROM NEW.display_name
       OR OLD.subject IS DISTINCT FROM NEW.subject
       OR OLD.html_body IS DISTINCT FROM NEW.html_body
       OR OLD.text_body IS DISTINCT FROM NEW.text_body
       OR OLD.variable_allowlist IS DISTINCT FROM NEW.variable_allowlist THEN
      RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
    END IF;
  ELSIF OLD.status = 'DRAFT' THEN
    IF OLD.published_by IS NOT NULL OR OLD.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
    END IF;
    IF NEW.status = 'DRAFT' THEN
      IF NEW.published_by IS NOT NULL OR NEW.published_at IS NOT NULL THEN
        RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_PUBLICATION_METADATA_INVALID';
      END IF;
    ELSIF NEW.status = 'PUBLISHED' THEN
      IF NEW.published_by IS NULL OR NEW.published_at IS NULL THEN
        RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_PUBLICATION_METADATA_REQUIRED';
      END IF;
    ELSE
      RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_STATUS_INVALID';
    END IF;
  ELSE
    RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_STATUS_INVALID';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_template_revisions_immutable ON email_template_revisions;
CREATE TRIGGER email_template_revisions_immutable
  BEFORE UPDATE OR DELETE ON email_template_revisions
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_email_template_revision_lifecycle();

CREATE OR REPLACE FUNCTION fixoku_guard_child_profile_owner_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'R81B_CHILD_PROFILE_OWNER_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS r81b_child_profile_owner_immutable ON r6_student_child_profiles;
CREATE TRIGGER r81b_child_profile_owner_immutable
  BEFORE UPDATE OF owner_user_id ON r6_student_child_profiles
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_child_profile_owner_immutability();

CREATE OR REPLACE FUNCTION fixoku_guard_package_entitlement_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  child_owner uuid;
BEGIN
  IF NEW.source_type = 'ORDER' THEN
    IF NEW.source_order_id IS NULL OR NEW.source_order_item_id IS NULL THEN
      RAISE EXCEPTION 'R81_ORDER_ENTITLEMENT_SOURCE_REQUIRED';
    END IF;
    IF NOT EXISTS (
      SELECT 1
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = NEW.source_order_id
         AND oi.id = NEW.source_order_item_id
         AND oi.package_id = NEW.package_id
         AND oi.package_version_id = NEW.package_version_id
    ) THEN
      RAISE EXCEPTION 'R81_ORDER_ENTITLEMENT_LINK_INVALID';
    END IF;
  ELSIF NEW.source_type = 'OWNER_MANUAL' THEN
    IF NEW.source_order_id IS NOT NULL OR NEW.source_order_item_id IS NOT NULL OR NEW.assigned_by IS NULL THEN
      RAISE EXCEPTION 'R81_OWNER_MANUAL_FINANCIAL_LINK_FORBIDDEN';
    END IF;
  ELSE
    RAISE EXCEPTION 'R81_ENTITLEMENT_SOURCE_TYPE_INVALID';
  END IF;

  IF NEW.beneficiary_child_profile_id IS NOT NULL THEN
    SELECT owner_user_id INTO child_owner
      FROM r6_student_child_profiles
     WHERE id = NEW.beneficiary_child_profile_id
       AND status = 'ACTIVE';
    IF child_owner IS NULL OR child_owner IS DISTINCT FROM NEW.beneficiary_student_user_id THEN
      RAISE EXCEPTION 'R81_CHILD_ENTITLEMENT_TARGET_MISMATCH';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM 1
      FROM package_entitlement_enrollments
     WHERE package_entitlement_id = OLD.id
     FOR UPDATE;
    IF EXISTS (
      SELECT 1
        FROM package_entitlement_enrollments pee
        JOIN enrollments e ON e.id = pee.enrollment_id
       WHERE pee.package_entitlement_id = OLD.id
         AND (e.student_user_id IS DISTINCT FROM NEW.beneficiary_student_user_id
           OR e.beneficiary_child_profile_id IS DISTINCT FROM NEW.beneficiary_child_profile_id
           OR pee.source_order_item_id IS DISTINCT FROM NEW.source_order_item_id)
    ) THEN
      RAISE EXCEPTION 'R81B_ENTITLEMENT_LINK_TARGET_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS package_entitlements_identity_guard ON package_entitlements;
CREATE TRIGGER package_entitlements_identity_guard
  BEFORE INSERT OR UPDATE OF source_type,source_order_id,source_order_item_id,assigned_by,beneficiary_student_user_id,beneficiary_child_profile_id,package_id,package_version_id
  ON package_entitlements
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_package_entitlement_identity();

CREATE OR REPLACE FUNCTION fixoku_guard_enrollment_target_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM 1
      FROM package_entitlement_enrollments
     WHERE enrollment_id = OLD.id
     FOR UPDATE;
    IF EXISTS (
      SELECT 1
        FROM package_entitlement_enrollments pee
        JOIN package_entitlements pe ON pe.id = pee.package_entitlement_id
       WHERE pee.enrollment_id = OLD.id
         AND (pe.beneficiary_student_user_id IS DISTINCT FROM NEW.student_user_id
           OR pe.beneficiary_child_profile_id IS DISTINCT FROM NEW.beneficiary_child_profile_id
           OR pee.training_program_id IS DISTINCT FROM NEW.training_program_id
           OR pee.source_order_item_id IS DISTINCT FROM pe.source_order_item_id)
    ) THEN
      RAISE EXCEPTION 'R81B_ENROLLMENT_TARGET_IMMUTABLE';
    END IF;
  END IF;

  IF NEW.beneficiary_child_profile_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM r6_student_child_profiles c
        WHERE c.id = NEW.beneficiary_child_profile_id
          AND c.owner_user_id = NEW.student_user_id
          AND c.status = 'ACTIVE'
     ) THEN
    RAISE EXCEPTION 'R81B_CHILD_ENROLLMENT_TARGET_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS r81b_enrollments_target_guard ON enrollments;
CREATE TRIGGER r81b_enrollments_target_guard
  BEFORE INSERT OR UPDATE OF student_user_id,beneficiary_child_profile_id,training_program_id
  ON enrollments
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_enrollment_target_identity();

CREATE OR REPLACE FUNCTION fixoku_guard_package_entitlement_enrollment_target() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  entitlement_row record;
  enrollment_row record;
BEGIN
  SELECT beneficiary_student_user_id,beneficiary_child_profile_id,source_type,source_order_item_id
    INTO entitlement_row
    FROM package_entitlements
   WHERE id = NEW.package_entitlement_id
   FOR KEY SHARE;
  SELECT student_user_id,beneficiary_child_profile_id,training_program_id
    INTO enrollment_row
    FROM enrollments
   WHERE id = NEW.enrollment_id
   FOR KEY SHARE;
  IF entitlement_row IS NULL OR enrollment_row IS NULL
     OR entitlement_row.beneficiary_student_user_id IS DISTINCT FROM enrollment_row.student_user_id
     OR entitlement_row.beneficiary_child_profile_id IS DISTINCT FROM enrollment_row.beneficiary_child_profile_id
     OR NEW.training_program_id IS DISTINCT FROM enrollment_row.training_program_id
     OR NEW.source_order_item_id IS DISTINCT FROM entitlement_row.source_order_item_id THEN
    RAISE EXCEPTION 'R81_ENTITLEMENT_ENROLLMENT_TARGET_MISMATCH';
  END IF;
  IF entitlement_row.source_type = 'OWNER_MANUAL' AND NEW.source_order_item_id IS NOT NULL THEN
    RAISE EXCEPTION 'R81B_OWNER_MANUAL_ENROLLMENT_FINANCIAL_LINK_FORBIDDEN';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS package_entitlement_enrollments_target_guard ON package_entitlement_enrollments;
CREATE TRIGGER package_entitlement_enrollments_target_guard
  BEFORE INSERT OR UPDATE OF package_entitlement_id,enrollment_id,training_program_id,source_order_item_id
  ON package_entitlement_enrollments
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_package_entitlement_enrollment_target();
