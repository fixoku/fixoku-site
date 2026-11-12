-- R81 forward-only integrity repairs. Existing rows are validated before any
-- constraint is added; an invalid historical row stops the migration instead
-- of being silently rewritten.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM package_entitlements
     WHERE source_type NOT IN ('ORDER', 'OWNER_MANUAL')
        OR (source_type = 'ORDER' AND (source_order_id IS NULL OR source_order_item_id IS NULL))
        OR (source_type = 'OWNER_MANUAL' AND (source_order_id IS NOT NULL OR source_order_item_id IS NOT NULL OR assigned_by IS NULL))
  ) THEN
    RAISE EXCEPTION 'R81_ENTITLEMENT_SOURCE_INTEGRITY_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM package_entitlements pe
      LEFT JOIN orders o ON o.id = pe.source_order_id
      LEFT JOIN order_items oi ON oi.id = pe.source_order_item_id
     WHERE pe.source_type = 'ORDER'
       AND (
         o.id IS NULL
         OR oi.id IS NULL
         OR oi.order_id IS DISTINCT FROM pe.source_order_id
         OR oi.package_id IS DISTINCT FROM pe.package_id
         OR oi.package_version_id IS DISTINCT FROM pe.package_version_id
       )
  ) THEN
    RAISE EXCEPTION 'R81_ORDER_ENTITLEMENT_LINK_PRECHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM package_entitlements pe
      JOIN r6_student_child_profiles child ON child.id = pe.beneficiary_child_profile_id
     WHERE child.owner_user_id IS DISTINCT FROM pe.beneficiary_student_user_id
  ) THEN
    RAISE EXCEPTION 'R81_CHILD_ENTITLEMENT_OWNER_PRECHECK_FAILED';
  END IF;
END
$$;

DO $$
BEGIN
  ALTER TABLE package_entitlements
    ADD CONSTRAINT package_entitlements_source_integrity_chk
    CHECK (
      (source_type = 'ORDER' AND source_order_id IS NOT NULL AND source_order_item_id IS NOT NULL)
      OR
      (source_type = 'OWNER_MANUAL' AND source_order_id IS NULL AND source_order_item_id IS NULL AND assigned_by IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS package_entitlements_identity_guard ON package_entitlements;
CREATE TRIGGER package_entitlements_identity_guard
  BEFORE INSERT OR UPDATE OF source_type,source_order_id,source_order_item_id,assigned_by,beneficiary_student_user_id,beneficiary_child_profile_id,package_id,package_version_id
  ON package_entitlements
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_package_entitlement_identity();

CREATE OR REPLACE FUNCTION fixoku_guard_package_entitlement_enrollment_target() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  entitlement_row record;
  enrollment_row record;
BEGIN
  SELECT beneficiary_student_user_id,beneficiary_child_profile_id
    INTO entitlement_row
    FROM package_entitlements WHERE id = NEW.package_entitlement_id;
  SELECT student_user_id,beneficiary_child_profile_id
    INTO enrollment_row
    FROM enrollments WHERE id = NEW.enrollment_id;
  IF entitlement_row IS NULL OR enrollment_row IS NULL
     OR entitlement_row.beneficiary_student_user_id IS DISTINCT FROM enrollment_row.student_user_id
     OR entitlement_row.beneficiary_child_profile_id IS DISTINCT FROM enrollment_row.beneficiary_child_profile_id THEN
    RAISE EXCEPTION 'R81_ENTITLEMENT_ENROLLMENT_TARGET_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS package_entitlement_enrollments_target_guard ON package_entitlement_enrollments;
CREATE TRIGGER package_entitlement_enrollments_target_guard
  BEFORE INSERT OR UPDATE OF package_entitlement_id,enrollment_id
  ON package_entitlement_enrollments
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_package_entitlement_enrollment_target();

CREATE OR REPLACE FUNCTION fixoku_guard_email_template_revision_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('PUBLISHED', 'ARCHIVED') THEN
      RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status IN ('PUBLISHED', 'ARCHIVED') AND (
    NEW.template_id IS DISTINCT FROM OLD.template_id
    OR NEW.revision_number IS DISTINCT FROM OLD.revision_number
    OR NEW.display_name IS DISTINCT FROM OLD.display_name
    OR NEW.subject IS DISTINCT FROM OLD.subject
    OR NEW.html_body IS DISTINCT FROM OLD.html_body
    OR NEW.text_body IS DISTINCT FROM OLD.text_body
    OR NEW.variable_allowlist IS DISTINCT FROM OLD.variable_allowlist
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'EMAIL_TEMPLATE_REVISION_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_template_revisions_immutable ON email_template_revisions;
CREATE TRIGGER email_template_revisions_immutable
  BEFORE UPDATE OR DELETE ON email_template_revisions
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_email_template_revision_immutability();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'email_templates'::regclass
       AND conname = 'email_templates_published_revision_fk'
  ) THEN
    ALTER TABLE email_templates
      ADD CONSTRAINT email_templates_published_revision_fk
      FOREIGN KEY (published_revision_id)
      REFERENCES email_template_revisions(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION fixoku_guard_email_template_published_pointer() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.published_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM email_template_revisions
     WHERE id = NEW.published_revision_id AND template_id = NEW.id AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'EMAIL_TEMPLATE_PUBLISHED_POINTER_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_published_pointer_guard ON email_templates;
CREATE TRIGGER email_templates_published_pointer_guard
  BEFORE INSERT OR UPDATE OF published_revision_id ON email_templates
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_email_template_published_pointer();

