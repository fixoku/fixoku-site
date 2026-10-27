-- R6 canonical commerce foundation.
-- Additive and replay-safe: this migration extends the existing package,
-- order, inventory, training, and guardian authorities created through 0028.
-- It does not publish drafts, alter historical snapshots, or delete rows.

DO $$ BEGIN
  CREATE TYPE r6_product_service_mode AS ENUM ('INDIVIDUAL','GROUP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_qualification_source AS ENUM ('PURCHASE','OWNER_MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_qualification_status AS ENUM ('ACTIVE','SUSPENDED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_training_group_status AS ENUM ('DRAFT','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_training_participant_status AS ENUM ('ACTIVE','COMPLETED','CANCELLED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_offer_status AS ENUM ('DRAFT','SENT','ACCEPTED','CANCELLED','EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE r6_offer_line_kind AS ENUM ('PACKAGE','PRODUCT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing physical_products is the one shared sellable/inventory authority.
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS list_gross_minor integer NOT NULL DEFAULT 0;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS vat_rate_bps integer NOT NULL DEFAULT 0;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS default_access_days integer;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS service_type text;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS service_mode r6_product_service_mode;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS min_students integer;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS max_students integer;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS legacy_code text;
ALTER TABLE physical_products ADD COLUMN IF NOT EXISTS r6_product_type text;
DO $$ BEGIN
  ALTER TABLE physical_products ADD CONSTRAINT physical_products_r6_list_gross_chk CHECK (list_gross_minor >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE physical_products ADD CONSTRAINT physical_products_r6_vat_bps_chk CHECK (vat_rate_bps >= 0 AND vat_rate_bps <= 10000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE physical_products ADD CONSTRAINT physical_products_r6_access_days_chk CHECK (default_access_days IS NULL OR default_access_days > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE physical_products ADD CONSTRAINT physical_products_r6_capacity_chk CHECK ((min_students IS NULL AND max_students IS NULL) OR (min_students IS NOT NULL AND max_students IS NOT NULL AND min_students > 0 AND max_students >= min_students));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE physical_products ADD CONSTRAINT physical_products_r6_product_type_chk CHECK (r6_product_type IS NULL OR r6_product_type IN ('BOOK','SOFTWARE','TRAINING_SERVICE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS physical_products_r6_commercial_idx ON physical_products (product_type, is_active, vat_rate_bps, sku);

CREATE TABLE IF NOT EXISTS r6_product_stage_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_product_id uuid NOT NULL REFERENCES physical_products(id) ON DELETE RESTRICT,
  education_stage education_stage NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_product_stage_scopes_product_stage_uq UNIQUE (physical_product_id, education_stage)
);
CREATE INDEX IF NOT EXISTS r6_product_stage_scopes_stage_idx ON r6_product_stage_scopes (education_stage, physical_product_id);

CREATE TABLE IF NOT EXISTS r6_package_component_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_component_id uuid NOT NULL REFERENCES package_components(id) ON DELETE RESTRICT,
  list_gross_minor integer NOT NULL,
  effective_sale_gross_minor integer NOT NULL,
  discount_minor integer NOT NULL DEFAULT 0,
  discount_percent_bps integer NOT NULL DEFAULT 0,
  vat_rate_bps integer NOT NULL,
  net_minor integer NOT NULL,
  vat_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_package_component_pricing_component_uq UNIQUE (package_component_id),
  CONSTRAINT r6_package_component_pricing_amounts_chk CHECK (list_gross_minor >= 0 AND effective_sale_gross_minor >= 0 AND effective_sale_gross_minor <= list_gross_minor AND discount_minor = list_gross_minor - effective_sale_gross_minor AND discount_percent_bps BETWEEN 0 AND 10000 AND vat_rate_bps BETWEEN 0 AND 10000 AND net_minor >= 0 AND vat_minor >= 0 AND net_minor + vat_minor = effective_sale_gross_minor),
  CONSTRAINT r6_package_component_pricing_currency_chk CHECK (currency ~ '^[A-Z]{3}$')
);

-- Child profiles are account-owned beneficiaries, while legacy student_profiles
-- remain untouched for existing one-login/one-profile users.
CREATE TABLE IF NOT EXISTS r6_student_child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  legacy_student_profile_id uuid REFERENCES student_profiles(id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  education_stage education_stage,
  grade text,
  status student_profile_status NOT NULL DEFAULT 'ACTIVE',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_student_child_profiles_name_chk CHECK (length(btrim(first_name)) > 0 AND length(btrim(last_name)) > 0),
  CONSTRAINT r6_student_child_profiles_legacy_uq UNIQUE (legacy_student_profile_id)
);
CREATE INDEX IF NOT EXISTS r6_student_child_profiles_owner_idx ON r6_student_child_profiles (owner_user_id, status, created_at);
CREATE TABLE IF NOT EXISTS r6_student_active_profiles (
  owner_user_id uuid PRIMARY KEY REFERENCES platform_users(id) ON DELETE RESTRICT,
  child_profile_id uuid NOT NULL REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT,
  selected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS beneficiary_child_profile_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS list_gross_minor integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_gross_minor integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_minor integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent_bps integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_net_minor integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_minor integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_rate_bps integer;
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_r6_child_profile_fk FOREIGN KEY (beneficiary_child_profile_id) REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS beneficiary_child_profile_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS list_gross_minor integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sale_gross_minor integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_minor integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_percent_bps integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS vat_net_minor integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS vat_minor integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS vat_rate_bps integer;
DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT order_items_r6_child_profile_fk FOREIGN KEY (beneficiary_child_profile_id) REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE package_entitlements ADD COLUMN IF NOT EXISTS beneficiary_child_profile_id uuid;
DO $$ BEGIN
  ALTER TABLE package_entitlements ADD CONSTRAINT package_entitlements_r6_child_profile_fk FOREIGN KEY (beneficiary_child_profile_id) REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE student_cart_items ADD COLUMN IF NOT EXISTS beneficiary_child_profile_id uuid;
DO $$ BEGIN
  ALTER TABLE student_cart_items ADD CONSTRAINT student_cart_items_r6_child_profile_fk FOREIGN KEY (beneficiary_child_profile_id) REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS r6_order_component_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  package_component_id uuid REFERENCES package_components(id) ON DELETE RESTRICT,
  physical_product_id uuid REFERENCES physical_products(id) ON DELETE RESTRICT,
  product_type text NOT NULL,
  education_stage education_stage,
  sku_snapshot text,
  title_snapshot text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  list_gross_minor integer NOT NULL,
  sale_gross_minor integer NOT NULL,
  discount_minor integer NOT NULL DEFAULT 0,
  vat_rate_bps integer NOT NULL,
  net_minor integer NOT NULL,
  vat_minor integer NOT NULL,
  gross_minor integer NOT NULL,
  beneficiary_child_profile_id uuid REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT,
  line_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_order_component_snapshots_line_uq UNIQUE (order_item_id, line_order),
  CONSTRAINT r6_order_component_snapshots_amounts_chk CHECK (quantity > 0 AND list_gross_minor >= 0 AND sale_gross_minor >= 0 AND sale_gross_minor <= list_gross_minor AND discount_minor = list_gross_minor - sale_gross_minor AND vat_rate_bps BETWEEN 0 AND 10000 AND net_minor >= 0 AND vat_minor >= 0 AND gross_minor = net_minor + vat_minor AND gross_minor = sale_gross_minor)
);
CREATE INDEX IF NOT EXISTS r6_order_component_snapshots_product_idx ON r6_order_component_snapshots (physical_product_id, created_at);

CREATE TABLE IF NOT EXISTS r6_training_payout_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_type text NOT NULL,
  student_count integer NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_training_payout_matrix_type_count_uq UNIQUE (training_type, student_count),
  CONSTRAINT r6_training_payout_matrix_amount_chk CHECK (student_count BETWEEN 1 AND 5 AND amount_minor >= 0 AND currency ~ '^[A-Z]{3}$')
);
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS billable_student_count integer;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS payable_at timestamptz;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS payable_period_start date;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS payable_period_end date;
ALTER TABLE trainer_earning_ledger ADD COLUMN IF NOT EXISTS adjustment_of_id uuid;
DO $$ BEGIN
  ALTER TABLE trainer_earning_ledger ADD CONSTRAINT trainer_earning_ledger_r6_adjustment_fk FOREIGN KEY (adjustment_of_id) REFERENCES trainer_earning_ledger(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE trainer_earning_ledger ADD CONSTRAINT trainer_earning_ledger_r6_billable_count_chk CHECK (billable_student_count IS NULL OR billable_student_count BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE trainer_payout_register ADD COLUMN IF NOT EXISTS note text;
CREATE TABLE IF NOT EXISTS r6_trainer_payout_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES trainer_payout_register(id) ON DELETE RESTRICT,
  earning_id uuid NOT NULL REFERENCES trainer_earning_ledger(id) ON DELETE RESTRICT,
  amount_minor integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_trainer_payout_allocations_uq UNIQUE (payout_id, earning_id),
  CONSTRAINT r6_trainer_payout_allocations_amount_chk CHECK (amount_minor > 0)
);

CREATE TABLE IF NOT EXISTS r6_qualification_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  service_type text NOT NULL,
  education_stage education_stage NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS r6_trainer_qualification_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  qualification_id uuid NOT NULL REFERENCES r6_qualification_definitions(id) ON DELETE RESTRICT,
  source r6_qualification_source NOT NULL,
  status r6_qualification_status NOT NULL DEFAULT 'ACTIVE',
  source_ref text NOT NULL,
  granted_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  revoke_reason text,
  CONSTRAINT r6_trainer_qualification_grants_uq UNIQUE (trainer_user_id, qualification_id, source, source_ref)
);
CREATE INDEX IF NOT EXISTS r6_trainer_qualification_grants_active_idx ON r6_trainer_qualification_grants (trainer_user_id, qualification_id, status, valid_until);
CREATE TABLE IF NOT EXISTS r6_trainer_package_qualification_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version_id uuid NOT NULL REFERENCES package_versions(id) ON DELETE RESTRICT,
  qualification_id uuid NOT NULL REFERENCES r6_qualification_definitions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_trainer_package_qualification_map_uq UNIQUE (package_version_id, qualification_id)
);
CREATE TABLE IF NOT EXISTS r6_badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  derivation_type text NOT NULL DEFAULT 'ALL_QUALIFICATIONS',
  required_qualification_count integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO r6_qualification_definitions (code,title,service_type,education_stage)
VALUES
  ('PRIMARY_FAST','İlkokul Uzman Hızlı Okuma Eğitmeni','FAST_READING','PRIMARY'),
  ('MIDDLE_FAST','Ortaokul Uzman Hızlı Okuma Eğitmeni','FAST_READING','MIDDLE'),
  ('HIGH_FAST','Lise Uzman Hızlı Okuma Eğitmeni','FAST_READING','HIGH'),
  ('ADULT_FAST','Yetişkin Uzman Hızlı Okuma Eğitmeni','FAST_READING','ADULT'),
  ('MIDDLE_PARAGRAPH','Ortaokul Uzman Paragraf Eğitmeni','PARAGRAPH','MIDDLE'),
  ('HIGH_PARAGRAPH','Lise Uzman Paragraf Eğitmeni','PARAGRAPH','HIGH')
ON CONFLICT (code) DO UPDATE SET title=excluded.title,service_type=excluded.service_type,education_stage=excluded.education_stage;
INSERT INTO r6_badge_definitions (code,title,derivation_type,required_qualification_count)
VALUES ('FIX_OKU_KIDEMLI_UZMAN','FIX OKU KIDEMLİ UZMAN EĞİTMENİ','ALL_QUALIFICATIONS',6)
ON CONFLICT (code) DO UPDATE SET title=excluded.title,derivation_type=excluded.derivation_type,required_qualification_count=excluded.required_qualification_count;

CREATE TABLE IF NOT EXISTS r6_training_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version_id uuid REFERENCES package_versions(id) ON DELETE RESTRICT,
  training_product_id uuid REFERENCES physical_products(id) ON DELETE RESTRICT,
  required_qualification_id uuid REFERENCES r6_qualification_definitions(id) ON DELETE RESTRICT,
  trainer_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  education_stage education_stage NOT NULL,
  training_type text NOT NULL,
  mode r6_product_service_mode NOT NULL,
  min_students integer NOT NULL,
  max_students integer NOT NULL,
  status r6_training_group_status NOT NULL DEFAULT 'DRAFT',
  projected_payout_minor integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_by uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_training_groups_capacity_chk CHECK (min_students >= 1 AND max_students >= min_students AND max_students <= 5)
);
CREATE INDEX IF NOT EXISTS r6_training_groups_trainer_status_idx ON r6_training_groups (trainer_user_id, status, education_stage);
CREATE TABLE IF NOT EXISTS r6_training_group_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_group_id uuid NOT NULL REFERENCES r6_training_groups(id) ON DELETE RESTRICT,
  child_profile_id uuid REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT,
  student_profile_id uuid REFERENCES student_profiles(id) ON DELETE RESTRICT,
  student_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE RESTRICT,
  status r6_training_participant_status NOT NULL DEFAULT 'ACTIVE',
  billable boolean NOT NULL DEFAULT true,
  refund_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_training_group_participants_target_chk CHECK (child_profile_id IS NOT NULL OR student_profile_id IS NOT NULL),
  CONSTRAINT r6_training_group_participants_uq UNIQUE (training_group_id, student_user_id)
);
CREATE INDEX IF NOT EXISTS r6_training_group_participants_group_idx ON r6_training_group_participants (training_group_id, status, billable);

CREATE TABLE IF NOT EXISTS r6_training_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES r6_training_group_participants(id) ON DELETE RESTRICT,
  student_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  quality_score smallint NOT NULL,
  communication_score smallint NOT NULL,
  satisfaction_score smallint NOT NULL,
  average_score_bps integer NOT NULL,
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_training_reviews_participant_uq UNIQUE (participant_id),
  CONSTRAINT r6_training_reviews_scores_chk CHECK (quality_score BETWEEN 1 AND 5 AND communication_score BETWEEN 1 AND 5 AND satisfaction_score BETWEEN 1 AND 5 AND average_score_bps BETWEEN 10000 AND 50000)
);

CREATE TABLE IF NOT EXISTS r6_custom_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES platform_users(id) ON DELETE RESTRICT,
  customer_user_id uuid REFERENCES platform_users(id) ON DELETE RESTRICT,
  customer_email text NOT NULL,
  title text NOT NULL,
  status r6_offer_status NOT NULL DEFAULT 'DRAFT',
  token_hash text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'TRY',
  list_gross_minor integer NOT NULL DEFAULT 0,
  special_gross_minor integer NOT NULL DEFAULT 0,
  discount_minor integer NOT NULL DEFAULT 0,
  discount_percent_bps integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_custom_offers_amounts_chk CHECK (list_gross_minor >= 0 AND special_gross_minor >= 0 AND special_gross_minor <= list_gross_minor AND discount_minor = list_gross_minor - special_gross_minor AND discount_percent_bps BETWEEN 0 AND 10000 AND currency ~ '^[A-Z]{3}$')
);
CREATE INDEX IF NOT EXISTS r6_custom_offers_customer_idx ON r6_custom_offers (customer_email, status, expires_at);
CREATE TABLE IF NOT EXISTS r6_custom_offer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES r6_custom_offers(id) ON DELETE RESTRICT,
  line_kind r6_offer_line_kind NOT NULL,
  package_version_id uuid REFERENCES package_versions(id) ON DELETE RESTRICT,
  physical_product_id uuid REFERENCES physical_products(id) ON DELETE RESTRICT,
  title_snapshot text NOT NULL,
  sku_snapshot text,
  product_type_snapshot text NOT NULL,
  education_stage education_stage,
  quantity integer NOT NULL DEFAULT 1,
  list_gross_minor integer NOT NULL,
  special_gross_minor integer NOT NULL,
  discount_minor integer NOT NULL DEFAULT 0,
  discount_percent_bps integer NOT NULL DEFAULT 0,
  vat_rate_bps integer NOT NULL,
  net_minor integer NOT NULL,
  vat_minor integer NOT NULL,
  gross_minor integer NOT NULL,
  line_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_custom_offer_lines_order_uq UNIQUE (offer_id, line_order),
  CONSTRAINT r6_custom_offer_lines_reference_chk CHECK (((line_kind='PACKAGE') AND package_version_id IS NOT NULL AND physical_product_id IS NULL) OR ((line_kind='PRODUCT') AND physical_product_id IS NOT NULL AND package_version_id IS NULL)),
  CONSTRAINT r6_custom_offer_lines_amounts_chk CHECK (quantity > 0 AND list_gross_minor >= 0 AND special_gross_minor >= 0 AND special_gross_minor <= list_gross_minor AND discount_minor = list_gross_minor - special_gross_minor AND discount_percent_bps BETWEEN 0 AND 10000 AND vat_rate_bps BETWEEN 0 AND 10000 AND net_minor >= 0 AND vat_minor >= 0 AND gross_minor = net_minor + vat_minor AND gross_minor = special_gross_minor)
);
CREATE TABLE IF NOT EXISTS r6_custom_offer_line_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_line_id uuid NOT NULL REFERENCES r6_custom_offer_lines(id) ON DELETE RESTRICT,
  child_profile_id uuid REFERENCES r6_student_child_profiles(id) ON DELETE RESTRICT,
  student_profile_id uuid REFERENCES student_profiles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT r6_custom_offer_line_beneficiaries_target_chk CHECK (child_profile_id IS NOT NULL OR student_profile_id IS NOT NULL),
  CONSTRAINT r6_custom_offer_line_beneficiaries_quantity_chk CHECK (quantity > 0),
  CONSTRAINT r6_custom_offer_line_beneficiaries_uq UNIQUE (offer_line_id, child_profile_id, student_profile_id)
);
CREATE INDEX IF NOT EXISTS r6_custom_offer_line_beneficiaries_profile_idx ON r6_custom_offer_line_beneficiaries (child_profile_id, student_profile_id);

-- Idempotent R6 commercial backfill. Existing product/package/order identities
-- are reused; only current draft package versions are made editable. Published
-- versions and historical order snapshots are never rewritten.
DO $$
DECLARE
  product jsonb;
  v_product_id uuid;
  v_software_id uuid;
  v_software_sku text;
  package jsonb;
  component jsonb;
  v_package_id uuid;
  v_version_id uuid;
  v_latest_version_id uuid;
  v_next_version integer;
  v_component_id uuid;
  v_component_product_id uuid;
  v_component_type package_component_type;
  component_title text;
  product_kind text;
  product_sku text;
  v_position integer;
  v_package_price integer;
  v_list_total integer;
  v_remaining_discount integer;
  v_line_list integer;
  v_line_discount integer;
  v_line_sale integer;
  v_line_net integer;
  v_line_vat integer;
  v_line_percent integer;
  pricing_row record;
  package_data jsonb := '[
    {"slug":"student-primary-platinum-egitim","price":1500000,"components":[{"kind":"BOOK","sku":"FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-PRIMARY-FAST-INDIVIDUAL"}]},
    {"slug":"student-primary-premium-egitim","price":1250000,"components":[{"kind":"BOOK","sku":"FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-PRIMARY-FAST-GROUP"}]},
    {"slug":"student-primary-akilli-sistem","price":650000,"components":[{"kind":"BOOK","sku":"FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"}]},
    {"slug":"student-primary-dijital-yapay-zeka-sistemi","price":450000,"components":[{"kind":"SOFTWARE"}]},
    {"slug":"student-primary-gelisim","price":125000,"components":[{"kind":"BOOK","sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI"}]},
    {"slug":"student-primary-baslangic","price":230000,"components":[{"kind":"BOOK","sku":"FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI"}]},
    {"slug":"student-middle-platinum-egitim","price":1500000,"components":[{"kind":"BOOK","sku":"FIXOKU-MIDDLE-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL"}]},
    {"slug":"student-middle-premium-egitim","price":1250000,"components":[{"kind":"BOOK","sku":"FIXOKU-MIDDLE-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-MIDDLE-FAST-GROUP"}]},
    {"slug":"student-middle-akilli-sistem","price":660000,"components":[{"kind":"BOOK","sku":"FIXOKU-MIDDLE-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI"},{"kind":"SOFTWARE"}]},
    {"slug":"student-middle-dijital-yapay-zeka-sistemi","price":450000,"components":[{"kind":"SOFTWARE"}]},
    {"slug":"student-middle-gelisim","price":135000,"components":[{"kind":"BOOK","sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI"}]},
    {"slug":"student-middle-baslangic","price":250000,"components":[{"kind":"BOOK","sku":"FIXOKU-MIDDLE-HIZLI-OKUMA"},{"kind":"BOOK","sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI"}]},
    {"slug":"student-middle-paragraf-egitim","price":1050000,"components":[{"kind":"BOOK","sku":"FIXOKU-STUDENT-ORTAOKUL-PARAGRAF"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL"}]},
    {"slug":"student-middle-paragraf-kitabi","price":135000,"components":[{"kind":"BOOK","sku":"FIXOKU-STUDENT-ORTAOKUL-PARAGRAF"}]},
    {"slug":"student-high-platinum-egitim","price":1500000,"components":[{"kind":"BOOK","sku":"FIXOKU-HIGH-HIZLI-OKUMA"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL"}]},
    {"slug":"student-high-premium-egitim","price":1200000,"components":[{"kind":"BOOK","sku":"FIXOKU-HIGH-HIZLI-OKUMA"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-HIGH-FAST-GROUP"}]},
    {"slug":"student-high-akilli-sistem","price":570000,"components":[{"kind":"BOOK","sku":"FIXOKU-HIGH-HIZLI-OKUMA"},{"kind":"SOFTWARE"}]},
    {"slug":"student-high-dijital-yapay-zeka-sistemi","price":450000,"components":[{"kind":"SOFTWARE"}]},
    {"slug":"student-high-baslangic","price":150000,"components":[{"kind":"BOOK","sku":"FIXOKU-HIGH-HIZLI-OKUMA"}]},
    {"slug":"student-high-paragraf-egitim","price":1050000,"components":[{"kind":"BOOK","sku":"FIXOKU-STUDENT-LISE-PARAGRAF"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL"}]},
    {"slug":"student-high-paragraf-kitabi","price":150000,"components":[{"kind":"BOOK","sku":"FIXOKU-STUDENT-LISE-PARAGRAF"}]},
    {"slug":"student-adult-platinum-egitim","price":1500000,"components":[{"kind":"BOOK","sku":"FIXOKU-ADULT-HIZLI-OKUMA"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL"}]},
    {"slug":"student-adult-premium-egitim","price":1200000,"components":[{"kind":"BOOK","sku":"FIXOKU-ADULT-HIZLI-OKUMA"},{"kind":"SOFTWARE"},{"kind":"TRAINING","sku":"FIXOKU-TRAINING-ADULT-FAST-GROUP"}]},
    {"slug":"student-adult-akilli-sistem","price":570000,"components":[{"kind":"BOOK","sku":"FIXOKU-ADULT-HIZLI-OKUMA"},{"kind":"SOFTWARE"}]},
    {"slug":"student-adult-dijital-yapay-zeka-sistemi","price":450000,"components":[{"kind":"SOFTWARE"}]},
    {"slug":"student-adult-baslangic","price":150000,"components":[{"kind":"BOOK","sku":"FIXOKU-ADULT-HIZLI-OKUMA"}]}
  ]'::jsonb;
BEGIN
  -- Canonical books, including the two historical noncanonical rows.
  FOR product IN SELECT * FROM jsonb_array_elements('[
    {"sku":"FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA","title":"İlkokul Akıcı ve Hızlı Okuma Kitabı","gross":125000,"stage":"PRIMARY"},
    {"sku":"FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI","title":"İlkokul Zihin Egzersizleri Kitabı","gross":125000,"stage":"PRIMARY"},
    {"sku":"FIXOKU-MIDDLE-HIZLI-OKUMA","title":"Ortaokul Hızlı Okuma Kitabı","gross":135000,"stage":"MIDDLE"},
    {"sku":"FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI","title":"Ortaokul Zihin Egzersizleri Kitabı","gross":135000,"stage":"MIDDLE"},
    {"sku":"FIXOKU-HIGH-HIZLI-OKUMA","title":"Lise Hızlı Okuma Kitabı","gross":150000,"stage":"HIGH"},
    {"sku":"FIXOKU-ADULT-HIZLI-OKUMA","title":"Yetişkin Hızlı Okuma Kitabı","gross":150000,"stage":"ADULT"},
    {"sku":"FIXOKU-STUDENT-ORTAOKUL-PARAGRAF","title":"Ortaokul Paragraf Kitabı","gross":135000,"stage":"MIDDLE"},
    {"sku":"FIXOKU-STUDENT-LISE-PARAGRAF","title":"Lise Paragraf Kitabı","gross":150000,"stage":"HIGH"},
    {"sku":"FIXOKU-HIGH-ZIHIN-EGZERSIZLERI","title":"Lise Zihin Egzersizleri Kitabı","gross":0,"stage":"HIGH","legacy":true},
    {"sku":"FIXOKU-ADULT-ZIHIN-EGZERSIZLERI","title":"Yetişkin Zihin Egzersizleri Kitabı","gross":0,"stage":"ADULT","legacy":true}
  ]'::jsonb) LOOP
    UPDATE physical_products
       SET title=product->>'title', product_type='PHYSICAL', r6_product_type='BOOK',
           list_gross_minor=(product->>'gross')::integer, vat_rate_bps=0,
           is_active=NOT COALESCE((product->>'legacy')::boolean,false),
           legacy_code=CASE WHEN COALESCE((product->>'legacy')::boolean,false) THEN 'R6_LEGACY_NONCANONICAL' ELSE NULL END,
           updated_at=now()
     WHERE sku=product->>'sku'
     RETURNING id INTO v_product_id;
    IF v_product_id IS NULL AND NOT COALESCE((product->>'legacy')::boolean,false) THEN
      INSERT INTO physical_products (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,r6_product_type,currency)
      VALUES (product->>'sku',product->>'title','R6 canonical book','PHYSICAL',true,(product->>'gross')::integer,0,'BOOK','TRY')
      RETURNING id INTO v_product_id;
    END IF;
    IF v_product_id IS NOT NULL AND product->>'stage' IS NOT NULL THEN
      INSERT INTO r6_product_stage_scopes (physical_product_id,education_stage)
      VALUES (v_product_id,(product->>'stage')::education_stage)
      ON CONFLICT (physical_product_id,education_stage) DO NOTHING;
    END IF;
  END LOOP;

  -- One shared software authority. Prefer an existing canonical SKU, then the
  -- existing Yapay Zeka row, then the existing Akilli Sistem row, otherwise insert.
  SELECT pp.id,pp.sku INTO v_software_id,v_software_sku FROM physical_products pp
   WHERE sku='FIXOKU-SOFTWARE-AI' LIMIT 1;
  IF v_software_id IS NULL THEN
    SELECT pp.id,pp.sku INTO v_software_id,v_software_sku FROM physical_products pp
     WHERE sku IN ('FIXOKU-STUDENT-YAPAY-ZEKA','FIXOKU-STUDENT-AKILLI-SISTEM')
     ORDER BY CASE sku WHEN 'FIXOKU-STUDENT-YAPAY-ZEKA' THEN 1 ELSE 2 END LIMIT 1;
  END IF;
  IF v_software_id IS NULL THEN
    INSERT INTO physical_products (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,default_access_days,r6_product_type,currency)
    VALUES ('FIXOKU-SOFTWARE-AI','Fixoku Yapay Zekâ Destekli Yazılım','R6 canonical software','SOFTWARE',true,450000,2000,365,'SOFTWARE','TRY')
    RETURNING id,sku INTO v_software_id,v_software_sku;
  ELSE
    UPDATE physical_products SET title='Fixoku Yapay Zekâ Destekli Yazılım', product_type='SOFTWARE', is_active=true,
      list_gross_minor=450000, vat_rate_bps=2000, default_access_days=365, r6_product_type='SOFTWARE', legacy_code=NULL, updated_at=now()
      WHERE id=v_software_id;
  END IF;
  UPDATE physical_products SET is_active=false, legacy_code='R6_LEGACY_SOFTWARE', updated_at=now()
   WHERE r6_product_type='SOFTWARE' AND id<>v_software_id;

  -- Stage-specific training products: four fast individual, four fast group,
  -- and two paragraph individual services.
  FOR product IN SELECT * FROM jsonb_array_elements('[
    {"sku":"FIXOKU-TRAINING-PRIMARY-FAST-INDIVIDUAL","title":"İlkokul Hızlı Okuma Bireysel Eğitim Hizmeti","stage":"PRIMARY","service":"FAST_READING","mode":"INDIVIDUAL","gross":1200000,"min":1,"max":1},
    {"sku":"FIXOKU-TRAINING-PRIMARY-FAST-GROUP","title":"İlkokul Hızlı Okuma Grup Eğitim Hizmeti","stage":"PRIMARY","service":"FAST_READING","mode":"GROUP","gross":750000,"min":2,"max":5},
    {"sku":"FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL","title":"Ortaokul Hızlı Okuma Bireysel Eğitim Hizmeti","stage":"MIDDLE","service":"FAST_READING","mode":"INDIVIDUAL","gross":1200000,"min":1,"max":1},
    {"sku":"FIXOKU-TRAINING-MIDDLE-FAST-GROUP","title":"Ortaokul Hızlı Okuma Grup Eğitim Hizmeti","stage":"MIDDLE","service":"FAST_READING","mode":"GROUP","gross":750000,"min":2,"max":5},
    {"sku":"FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL","title":"Lise Hızlı Okuma Bireysel Eğitim Hizmeti","stage":"HIGH","service":"FAST_READING","mode":"INDIVIDUAL","gross":1200000,"min":1,"max":1},
    {"sku":"FIXOKU-TRAINING-HIGH-FAST-GROUP","title":"Lise Hızlı Okuma Grup Eğitim Hizmeti","stage":"HIGH","service":"FAST_READING","mode":"GROUP","gross":750000,"min":2,"max":5},
    {"sku":"FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL","title":"Yetişkin Hızlı Okuma Bireysel Eğitim Hizmeti","stage":"ADULT","service":"FAST_READING","mode":"INDIVIDUAL","gross":1200000,"min":1,"max":1},
    {"sku":"FIXOKU-TRAINING-ADULT-FAST-GROUP","title":"Yetişkin Hızlı Okuma Grup Eğitim Hizmeti","stage":"ADULT","service":"FAST_READING","mode":"GROUP","gross":750000,"min":2,"max":5},
    {"sku":"FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL","title":"Ortaokul Paragraf Bireysel Eğitim Hizmeti","stage":"MIDDLE","service":"PARAGRAPH","mode":"INDIVIDUAL","gross":1000000,"min":1,"max":1},
    {"sku":"FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL","title":"Lise Paragraf Bireysel Eğitim Hizmeti","stage":"HIGH","service":"PARAGRAPH","mode":"INDIVIDUAL","gross":1000000,"min":1,"max":1}
  ]'::jsonb) LOOP
    INSERT INTO physical_products (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,service_type,service_mode,min_students,max_students,r6_product_type,currency)
    VALUES (product->>'sku',product->>'title','R6 canonical training service','SERVICE',true,(product->>'gross')::integer,2000,product->>'service',(product->>'mode')::r6_product_service_mode,(product->>'min')::integer,(product->>'max')::integer,'TRAINING_SERVICE','TRY')
    ON CONFLICT (sku) DO UPDATE SET title=excluded.title,product_type='SERVICE',is_active=true,list_gross_minor=excluded.list_gross_minor,vat_rate_bps=2000,service_type=excluded.service_type,service_mode=excluded.service_mode,min_students=excluded.min_students,max_students=excluded.max_students,r6_product_type='TRAINING_SERVICE',updated_at=now();
    SELECT pp.id INTO v_product_id FROM physical_products pp WHERE pp.sku=product->>'sku';
    INSERT INTO r6_product_stage_scopes (physical_product_id,education_stage) VALUES (v_product_id,(product->>'stage')::education_stage) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Owner-controlled payout matrix (minor units / kuruş).
  INSERT INTO r6_training_payout_matrix (training_type,student_count,amount_minor)
  SELECT * FROM (VALUES
    ('FAST_READING',1,500000),('FAST_READING',2,575000),('FAST_READING',3,675000),('FAST_READING',4,775000),('FAST_READING',5,875000),
    ('PARAGRAPH',1,450000),('PARAGRAPH',2,525000),('PARAGRAPH',3,625000),('PARAGRAPH',4,725000),('PARAGRAPH',5,825000)
  ) AS payout(training_type,student_count,amount_minor)
  ON CONFLICT (training_type,student_count) DO UPDATE SET amount_minor=excluded.amount_minor,updated_at=now();

  -- Exact current package matrix and draft composition.
  FOR package IN SELECT * FROM jsonb_array_elements(package_data) LOOP
    SELECT p.id INTO v_package_id FROM packages p WHERE p.slug=package->>'slug' AND p.catalog_scope='STUDENT_COMMERCE' LIMIT 1;
    IF v_package_id IS NULL THEN CONTINUE; END IF;
    v_package_price := (package->>'price')::integer;
    SELECT pv.id INTO v_version_id FROM package_versions pv WHERE pv.package_id=v_package_id AND pv.status='DRAFT' ORDER BY pv.version_number DESC LIMIT 1;
    IF v_version_id IS NULL THEN
      SELECT pv.id,pv.version_number INTO v_latest_version_id,v_next_version FROM package_versions pv WHERE pv.package_id=v_package_id ORDER BY pv.version_number DESC LIMIT 1;
      v_next_version := COALESCE(v_next_version,0)+1;
      IF v_latest_version_id IS NULL THEN
        INSERT INTO package_versions (package_id,version_number,title,description,short_description,features_json,vat_rate_bps,price_gross_minor,purchase_enabled,price_minor,currency,status)
        VALUES (v_package_id,v_next_version,CASE WHEN package->>'slug'='student-high-paragraf-egitim' THEN 'LİSEL PARAGRAF EĞİTİMİ' ELSE upper(replace(package->>'slug','-',' ')) END,'','', '[]',2000,v_package_price,false,v_package_price,'TRY','DRAFT')
        RETURNING id INTO v_version_id;
      ELSE
        INSERT INTO package_versions (package_id,version_number,title,description,short_description,features_json,sku,invoice_product_code,invoice_product_name,invoice_description,unit,vat_rate_bps,price_net_minor,price_gross_minor,purchase_enabled,price_minor,currency,status)
        SELECT v_package_id,v_next_version,pv.title,pv.description,pv.short_description,pv.features_json,pv.sku,pv.invoice_product_code,pv.invoice_product_name,pv.invoice_description,pv.unit,pv.vat_rate_bps,NULL,v_package_price,false,v_package_price,'TRY','DRAFT' FROM package_versions pv WHERE pv.id=v_latest_version_id RETURNING id INTO v_version_id;
      END IF;
    ELSE
      UPDATE package_versions pv SET price_minor=v_package_price,price_gross_minor=v_package_price,currency='TRY',purchase_enabled=false,title=CASE WHEN package->>'slug'='student-high-paragraf-egitim' THEN 'LİSEL PARAGRAF EĞİTİMİ' ELSE pv.title END,updated_at=now() WHERE pv.id=v_version_id;
    END IF;
    UPDATE packages p SET panel_visible=true,public_web_visible=false,updated_at=now() WHERE p.id=v_package_id;
    UPDATE package_components pc SET is_active=false WHERE pc.package_version_id=v_version_id AND pc.component_type<>'TEXT_ITEM';
    v_position := 0;
    FOR component IN SELECT * FROM jsonb_array_elements(package->'components') LOOP
      product_kind := component->>'kind';
      product_sku := component->>'sku';
      IF product_kind='SOFTWARE' THEN
        v_component_product_id := v_software_id; v_component_type := 'DIGITAL_ACCESS';
      ELSE
        SELECT pp.id,pp.title INTO v_component_product_id,component_title FROM physical_products pp WHERE pp.sku=product_sku LIMIT 1;
        IF v_component_product_id IS NULL THEN RAISE EXCEPTION 'R6_PRODUCT_NOT_FOUND:%',product_sku; END IF;
        v_component_type := CASE WHEN product_kind='BOOK' THEN 'PHYSICAL_PRODUCT' ELSE 'TRAINER_SERVICE' END;
      END IF;
      SELECT pc.id INTO v_component_id FROM package_components pc WHERE pc.package_version_id=v_version_id AND pc.component_type=v_component_type AND COALESCE(pc.physical_product_id,pc.reference_id)=v_component_product_id LIMIT 1;
      IF v_component_id IS NULL THEN
        INSERT INTO package_components (package_version_id,component_type,reference_id,physical_product_id,title_snapshot,display_label,is_active,quantity,display_order,metadata_json)
        SELECT v_version_id,v_component_type,v_component_product_id,CASE WHEN v_component_type='PHYSICAL_PRODUCT' THEN v_component_product_id ELSE NULL END,pp.title,CASE WHEN v_component_type='PHYSICAL_PRODUCT' THEN pp.title ELSE NULL END,true,1,v_position,'{"r6Canonical":true}'::text FROM physical_products pp WHERE pp.id=v_component_product_id RETURNING id INTO v_component_id;
      ELSE
        UPDATE package_components pc SET is_active=true,quantity=1,display_order=v_position,metadata_json='{"r6Canonical":true}' WHERE pc.id=v_component_id;
      END IF;
      v_position := v_position+1;
    END LOOP;
    SELECT COALESCE(sum(pp.list_gross_minor*pc.quantity),0) INTO v_list_total FROM package_components pc JOIN physical_products pp ON pp.id=COALESCE(pc.physical_product_id,pc.reference_id) WHERE pc.package_version_id=v_version_id AND pc.is_active AND pc.component_type<>'TEXT_ITEM';
    IF v_package_price > v_list_total THEN RAISE EXCEPTION 'R6_PACKAGE_PRICE_EXCEEDS_LIST:%',package->>'slug'; END IF;
    v_remaining_discount := v_list_total-v_package_price;
    FOR pricing_row IN SELECT pc.id,pp.list_gross_minor*pc.quantity AS line_list,pp.vat_rate_bps AS vat_rate,pp.r6_product_type,pp.currency FROM package_components pc JOIN physical_products pp ON pp.id=COALESCE(pc.physical_product_id,pc.reference_id) WHERE pc.package_version_id=v_version_id AND pc.is_active AND pc.component_type<>'TEXT_ITEM' ORDER BY CASE WHEN pp.r6_product_type IN ('SOFTWARE','TRAINING_SERVICE') THEN 0 ELSE 1 END,pc.display_order,pc.id LOOP
      v_line_list := pricing_row.line_list;
      v_line_discount := LEAST(v_remaining_discount,v_line_list);
      v_remaining_discount := v_remaining_discount-v_line_discount;
      v_line_sale := v_line_list-v_line_discount;
      v_line_net := ((v_line_sale::bigint*10000::bigint)/(10000::bigint+pricing_row.vat_rate::bigint))::integer;
      v_line_vat := v_line_sale-v_line_net;
      v_line_percent := CASE WHEN v_line_list=0 THEN 0 ELSE ((v_line_discount::bigint*10000::bigint + v_line_list/2)::bigint/v_line_list::bigint)::integer END;
      INSERT INTO r6_package_component_pricing (package_component_id,list_gross_minor,effective_sale_gross_minor,discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency)
      VALUES (pricing_row.id,v_line_list,v_line_sale,v_line_discount,v_line_percent,pricing_row.vat_rate,v_line_net,v_line_vat,pricing_row.currency)
      ON CONFLICT (package_component_id) DO UPDATE SET list_gross_minor=excluded.list_gross_minor,effective_sale_gross_minor=excluded.effective_sale_gross_minor,discount_minor=excluded.discount_minor,discount_percent_bps=excluded.discount_percent_bps,vat_rate_bps=excluded.vat_rate_bps,net_minor=excluded.net_minor,vat_minor=excluded.vat_minor,currency=excluded.currency,updated_at=now();
    END LOOP;
    IF v_remaining_discount<>0 THEN RAISE EXCEPTION 'R6_PACKAGE_DISCOUNT_ALLOCATION_FAILED:%',package->>'slug'; END IF;
  END LOOP;

  -- Canonical trainer-package qualification mapping; bundle grants three quals.
  INSERT INTO r6_trainer_package_qualification_map (package_version_id,qualification_id)
  SELECT pv.id,qd.id FROM package_versions pv JOIN packages p ON p.id=pv.package_id JOIN r6_qualification_definitions qd ON qd.code=CASE
    WHEN p.slug='ilkokul-akici-hizli-okuma-egitimi' THEN 'PRIMARY_FAST'
    WHEN p.slug='ortaokul-hizli-okuma-egitimi' THEN 'MIDDLE_FAST'
    WHEN p.slug='lise-hizli-okuma-egitimi' THEN 'HIGH_FAST'
    WHEN p.slug='yetiskin-hizli-okuma-egitimi' THEN 'ADULT_FAST'
    WHEN p.slug='ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs' THEN 'MIDDLE_PARAGRAPH'
    WHEN p.slug='lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt' THEN 'HIGH_PARAGRAPH'
  END WHERE p.catalog_scope='TRAINER_COMMERCE' AND pv.status IN ('DRAFT','PUBLISHED') AND p.slug NOT LIKE 'ortaokul-lise-yetiskin%'
  ON CONFLICT DO NOTHING;
  INSERT INTO r6_trainer_package_qualification_map (package_version_id,qualification_id)
  SELECT pv.id,qd.id FROM package_versions pv JOIN packages p ON p.id=pv.package_id CROSS JOIN r6_qualification_definitions qd
  WHERE p.catalog_scope='TRAINER_COMMERCE' AND p.slug='ortaokul-lise-yetiskin-hizli-okuma-egitimi' AND pv.status IN ('DRAFT','PUBLISHED') AND qd.code IN ('MIDDLE_FAST','HIGH_FAST','ADULT_FAST')
  ON CONFLICT DO NOTHING;
END $$;
