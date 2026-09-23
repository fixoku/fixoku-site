-- Family offer persistence foundation.
-- Source-only in this task. Apply only after an explicitly approved shadow run.
-- Draft children are offer-local snapshots; no student profile is created here.

CREATE TABLE IF NOT EXISTS family_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  customer_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  current_revision_number integer NOT NULL DEFAULT 1,
  accepted_order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  materialized_order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_offers_status_chk CHECK (status IN ('DRAFT','SENT','ACCEPTED','CANCELLED','EXPIRED')),
  CONSTRAINT family_offers_title_chk CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  CONSTRAINT family_offers_revision_chk CHECK (current_revision_number >= 1)
);
CREATE INDEX IF NOT EXISTS family_offers_owner_idx ON family_offers (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS family_offers_customer_idx ON family_offers (customer_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS family_offer_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES family_offers(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  draft_children_snapshot jsonb NOT NULL,
  selections_snapshot jsonb NOT NULL,
  pricing_snapshot jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  materialized_order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT family_offer_revisions_uq UNIQUE (offer_id, revision_number),
  CONSTRAINT family_offer_revisions_status_chk CHECK (status IN ('DRAFT','SENT','ACCEPTED','CANCELLED','EXPIRED')),
  CONSTRAINT family_offer_revisions_number_chk CHECK (revision_number >= 1)
);
CREATE INDEX IF NOT EXISTS family_offer_revisions_latest_idx ON family_offer_revisions (offer_id, revision_number DESC);

CREATE TABLE IF NOT EXISTS family_offer_draft_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES family_offer_revisions(id) ON DELETE RESTRICT,
  local_key text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  grade text NOT NULL,
  education_stage education_stage NOT NULL,
  existing_child_profile_id uuid REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT,
  existing_student_profile_id uuid REFERENCES student_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_offer_draft_children_uq UNIQUE (revision_id, local_key),
  CONSTRAINT family_offer_draft_children_name_chk CHECK (length(btrim(first_name)) > 0 AND length(btrim(last_name)) > 0),
  CONSTRAINT family_offer_draft_children_reference_chk CHECK (NOT (existing_child_profile_id IS NOT NULL AND existing_student_profile_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS family_offer_child_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES family_offer_revisions(id) ON DELETE RESTRICT,
  draft_child_id uuid NOT NULL REFERENCES family_offer_draft_children(id) ON DELETE RESTRICT,
  canonical_product_or_component_id uuid NOT NULL,
  package_version_id uuid NOT NULL REFERENCES package_versions(id) ON DELETE RESTRICT,
  package_component_id uuid NOT NULL REFERENCES package_components(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES physical_products(id) ON DELETE RESTRICT,
  product_type text NOT NULL,
  service_mode text,
  program_id uuid,
  title_snapshot text NOT NULL,
  sale_gross_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_offer_child_selections_uq UNIQUE (revision_id, draft_child_id, canonical_product_or_component_id),
  CONSTRAINT family_offer_child_selections_amount_chk CHECK (sale_gross_minor >= 0),
  CONSTRAINT family_offer_child_selections_currency_chk CHECK (currency = 'TRY')
);
CREATE INDEX IF NOT EXISTS family_offer_child_selections_revision_idx ON family_offer_child_selections (revision_id, draft_child_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS family_offer_revision_id uuid REFERENCES family_offer_revisions(id) ON DELETE RESTRICT;
