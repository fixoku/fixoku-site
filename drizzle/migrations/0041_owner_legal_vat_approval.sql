-- FIXOKU R71: server-side legal document, VAT decision, and order snapshot authority.
-- Prepared only. Apply in the approved disposable PostgreSQL runner after duplicate/
-- orphan preflight; never apply this migration to Owner local, Neon staging, or
-- production from this checkout.

DO $$ BEGIN
  CREATE TYPE owner_legal_document_status AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE owner_legal_decision_type AS ENUM ('LEGAL_REVIEW', 'OWNER_APPROVAL', 'REJECTED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE owner_vat_decision_status AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'EFFECTIVE', 'ARCHIVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE owner_vat_subject_kind AS ENUM ('BOOK', 'DIGITAL_SOFTWARE', 'STUDENT_PACKAGE', 'TRAINER_PACKAGE', 'MIXED_PACKAGE', 'SHIPPING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS owner_legal_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key text NOT NULL,
  source_document_id integer NOT NULL,
  version_number integer NOT NULL,
  status owner_legal_document_status NOT NULL DEFAULT 'DRAFT',
  title text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('CUSTOMER', 'INTERNAL')),
  markdown text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  previous_version_id uuid REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_key, version_number),
  UNIQUE (source_document_id, version_number),
  CHECK (scope = 'CUSTOMER' OR status <> 'PUBLISHED')
);

CREATE TABLE IF NOT EXISTS owner_legal_document_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid NOT NULL REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  decision_type owner_legal_decision_type NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  decision_note text NOT NULL,
  evidence_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_legal_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid NOT NULL REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  requirement_key text NOT NULL,
  requirement_label text NOT NULL,
  status text NOT NULL CHECK (status IN ('MISSING', 'PROVIDED', 'VERIFIED', 'REJECTED')),
  evidence_reference text,
  verified_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_version_id, requirement_key)
);

CREATE TABLE IF NOT EXISTS owner_legal_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid NOT NULL REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  previous_status owner_legal_document_status,
  next_status owner_legal_document_status NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  event_note text NOT NULL,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Once a document reaches APPROVED, its identity and bytes are immutable. A
-- later status transition may still move APPROVED -> ARCHIVED, but no caller
-- can silently replace the approved text or its hash.
CREATE OR REPLACE FUNCTION fixoku_guard_legal_document_version_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('APPROVED', 'PUBLISHED', 'ARCHIVED')
     AND (
       NEW.document_key IS DISTINCT FROM OLD.document_key
       OR NEW.source_document_id IS DISTINCT FROM OLD.source_document_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.scope IS DISTINCT FROM OLD.scope
       OR NEW.markdown IS DISTINCT FROM OLD.markdown
       OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
       OR NEW.previous_version_id IS DISTINCT FROM OLD.previous_version_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION 'LEGAL_VERSION_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS owner_legal_document_versions_immutable ON owner_legal_document_versions;
CREATE TRIGGER owner_legal_document_versions_immutable
  BEFORE UPDATE ON owner_legal_document_versions
  FOR EACH ROW EXECUTE FUNCTION fixoku_guard_legal_document_version_update();

CREATE TABLE IF NOT EXISTS owner_vat_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind owner_vat_subject_kind NOT NULL,
  subject_id text,
  status owner_vat_decision_status NOT NULL DEFAULT 'DRAFT',
  vat_rate_bps integer,
  component_rates_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'TRY' CHECK (currency ~ '^[A-Z]{3}$'),
  effective_from timestamptz,
  basis_reference text,
  evidence_reference text,
  accountant_name text,
  accountant_reviewed_at timestamptz,
  owner_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  owner_decided_at timestamptz,
  decision_note text,
  created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (vat_rate_bps IS NULL OR (vat_rate_bps >= 0 AND vat_rate_bps <= 10000)),
  CHECK (
    status <> 'EFFECTIVE'
    OR (
      (vat_rate_bps IS NOT NULL OR (subject_kind = 'MIXED_PACKAGE' AND component_rates_json <> '{}'::jsonb))
      AND effective_from IS NOT NULL
      AND evidence_reference IS NOT NULL
      AND accountant_reviewed_at IS NOT NULL
      AND owner_user_id IS NOT NULL
      AND owner_decided_at IS NOT NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS owner_vat_decision_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_decision_id uuid NOT NULL REFERENCES owner_vat_decisions(id) ON DELETE RESTRICT,
  previous_status owner_vat_decision_status,
  next_status owner_vat_decision_status NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  event_note text NOT NULL,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- An order stores the exact document version and bytes accepted at checkout.
-- This table is intentionally separate from the editable document library.
CREATE TABLE IF NOT EXISTS order_legal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  document_key text NOT NULL,
  document_version_id uuid NOT NULL REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  document_version_number integer NOT NULL,
  document_status owner_legal_document_status NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  markdown text NOT NULL,
  acceptance_type text NOT NULL CHECK (acceptance_type IN ('PRE_INFORMATION', 'DISTANCE_SALES', 'DIGITAL_COMMENCEMENT', 'PRIVACY')),
  accepted_by uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (order_id, document_key, acceptance_type)
);

CREATE TABLE IF NOT EXISTS trainer_order_legal_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_order_id uuid NOT NULL REFERENCES trainer_package_orders(id) ON DELETE RESTRICT,
  document_key text NOT NULL,
  document_version_id uuid NOT NULL REFERENCES owner_legal_document_versions(id) ON DELETE RESTRICT,
  document_version_number integer NOT NULL,
  document_status owner_legal_document_status NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  markdown text NOT NULL,
  acceptance_type text NOT NULL CHECK (acceptance_type IN ('PRE_INFORMATION', 'DISTANCE_SALES', 'DIGITAL_COMMENCEMENT', 'PRIVACY')),
  accepted_by uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (trainer_order_id, document_key, acceptance_type)
);

CREATE OR REPLACE FUNCTION fixoku_reject_immutable_legal_row() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'LEGAL_HISTORY_IMMUTABLE';
END;
$$;

DROP TRIGGER IF EXISTS owner_legal_document_events_immutable ON owner_legal_document_events;
CREATE TRIGGER owner_legal_document_events_immutable
  BEFORE UPDATE OR DELETE ON owner_legal_document_events
  FOR EACH ROW EXECUTE FUNCTION fixoku_reject_immutable_legal_row();

DROP TRIGGER IF EXISTS owner_vat_decision_events_immutable ON owner_vat_decision_events;
CREATE TRIGGER owner_vat_decision_events_immutable
  BEFORE UPDATE OR DELETE ON owner_vat_decision_events
  FOR EACH ROW EXECUTE FUNCTION fixoku_reject_immutable_legal_row();

DROP TRIGGER IF EXISTS order_legal_snapshots_immutable ON order_legal_snapshots;
CREATE TRIGGER order_legal_snapshots_immutable
  BEFORE UPDATE OR DELETE ON order_legal_snapshots
  FOR EACH ROW EXECUTE FUNCTION fixoku_reject_immutable_legal_row();

DROP TRIGGER IF EXISTS trainer_order_legal_snapshots_immutable ON trainer_order_legal_snapshots;
CREATE TRIGGER trainer_order_legal_snapshots_immutable
  BEFORE UPDATE OR DELETE ON trainer_order_legal_snapshots
  FOR EACH ROW EXECUTE FUNCTION fixoku_reject_immutable_legal_row();

COMMENT ON TABLE owner_legal_document_versions IS 'R71 server-side legal version authority; local JSON is never an approval source.';
COMMENT ON TABLE owner_legal_document_decisions IS 'R71 real legal/Owner decisions; actor must be authenticated and authorized server-side.';
COMMENT ON TABLE owner_vat_decisions IS 'R71 VAT decisions; EFFECTIVE requires accountant evidence and Owner decision fields.';
COMMENT ON TABLE order_legal_snapshots IS 'R71 immutable order-specific legal acceptance snapshots.';
COMMENT ON TABLE trainer_order_legal_snapshots IS 'R72 immutable trainer-order legal acceptance snapshots.';
