-- FIXOKU R173
-- Canonical additive reconciliation for student-commerce order snapshots.
-- Draft only. Requires migration-journal registration and isolated DB tests.
-- Does not insert payments, change prices, or publish packages.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_scope_snapshot text NOT NULL DEFAULT 'LEGACY_EDUCATION',
  ADD COLUMN IF NOT EXISTS shipping_address_snapshot_json text,
  ADD COLUMN IF NOT EXISTS list_gross_minor integer,
  ADD COLUMN IF NOT EXISTS sale_gross_minor integer,
  ADD COLUMN IF NOT EXISTS discount_minor integer,
  ADD COLUMN IF NOT EXISTS discount_percent_bps integer,
  ADD COLUMN IF NOT EXISTS vat_net_minor integer,
  ADD COLUMN IF NOT EXISTS vat_minor integer;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS list_gross_minor integer,
  ADD COLUMN IF NOT EXISTS sale_gross_minor integer,
  ADD COLUMN IF NOT EXISTS discount_minor integer,
  ADD COLUMN IF NOT EXISTS discount_percent_bps integer,
  ADD COLUMN IF NOT EXISTS vat_net_minor integer,
  ADD COLUMN IF NOT EXISTS vat_minor integer,
  ADD COLUMN IF NOT EXISTS vat_rate_bps integer,
  ADD COLUMN IF NOT EXISTS components_snapshot_json text;
