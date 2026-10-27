DO $$ BEGIN
  CREATE TYPE "public"."trainer_package_shipping_policy" AS ENUM ('FREE','FIXED_PRICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "icon_reference" text;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "physical_product" boolean NOT NULL DEFAULT true;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "shipping_policy" "trainer_package_shipping_policy" NOT NULL DEFAULT 'FREE';
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "shipping_price_minor" integer NOT NULL DEFAULT 0;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "short_description" text;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "features_json" text NOT NULL DEFAULT '[]';
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "invoice_product_code" text;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "invoice_product_name" text;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "invoice_description" text;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "unit" text NOT NULL DEFAULT 'adet';
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "vat_rate_bps" integer NOT NULL DEFAULT 2000;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "price_net_minor" integer;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "price_gross_minor" integer;
ALTER TABLE "package_versions" ADD COLUMN IF NOT EXISTS "purchase_enabled" boolean NOT NULL DEFAULT true;
DO $$ BEGIN
  ALTER TABLE "packages" ADD CONSTRAINT "packages_shipping_price_chk" CHECK ("shipping_price_minor" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "package_versions" ADD CONSTRAINT "package_versions_vat_rate_chk" CHECK ("vat_rate_bps" >= 0 AND "vat_rate_bps" <= 10000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "packages_audience_status_idx" ON "packages" ("audience","status");
