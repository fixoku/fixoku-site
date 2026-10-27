ALTER TYPE "public"."package_component_type"
  ADD VALUE IF NOT EXISTS 'TEXT_ITEM';

ALTER TABLE "public"."package_components"
  ADD COLUMN IF NOT EXISTS "physical_product_id" uuid;
ALTER TABLE "public"."package_components"
  ADD COLUMN IF NOT EXISTS "display_label" text;
ALTER TABLE "public"."package_components"
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."package_components"
  ADD CONSTRAINT "package_components_physical_product_fk"
  FOREIGN KEY ("physical_product_id") REFERENCES "public"."physical_products"("id")
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE "public"."package_components"
  ADD CONSTRAINT "package_components_display_label_nonblank_chk"
  CHECK ("display_label" IS NULL OR length(btrim("display_label")) > 0) NOT VALID;
ALTER TABLE "public"."package_components"
  ADD CONSTRAINT "package_components_semantic_reference_chk"
  CHECK (("component_type"='PHYSICAL_PRODUCT' AND "physical_product_id" IS NOT NULL)
      OR ("component_type"<>'PHYSICAL_PRODUCT' AND "physical_product_id" IS NULL)) NOT VALID;
ALTER TABLE "public"."package_components"
  ADD CONSTRAINT "package_components_text_item_reference_chk"
  CHECK ("component_type"::text<>'TEXT_ITEM' OR ("reference_id" IS NULL AND "physical_product_id" IS NULL AND length(btrim("title_snapshot")) > 0)) NOT VALID;

CREATE INDEX IF NOT EXISTS "package_components_version_active_order_idx"
  ON "public"."package_components" ("package_version_id","is_active","display_order","id");
CREATE INDEX IF NOT EXISTS "package_components_product_idx"
  ON "public"."package_components" ("physical_product_id")
  WHERE "physical_product_id" IS NOT NULL;

UPDATE "public"."package_components" pc
SET "physical_product_id"=pc."reference_id"
WHERE pc."component_type"='PHYSICAL_PRODUCT'
  AND pc."physical_product_id" IS NULL
  AND pc."reference_id" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "public"."physical_products" pp WHERE pp."id"=pc."reference_id");

ALTER TABLE "public"."package_components" VALIDATE CONSTRAINT "package_components_physical_product_fk";
ALTER TABLE "public"."package_components" VALIDATE CONSTRAINT "package_components_display_label_nonblank_chk";
ALTER TABLE "public"."package_components" VALIDATE CONSTRAINT "package_components_semantic_reference_chk";
ALTER TABLE "public"."package_components" VALIDATE CONSTRAINT "package_components_text_item_reference_chk";

ALTER TABLE "public"."packages" ADD COLUMN IF NOT EXISTS "panel_visible" boolean;
ALTER TABLE "public"."packages" ADD COLUMN IF NOT EXISTS "public_web_visible" boolean;
UPDATE "public"."packages" SET "panel_visible"=true WHERE "panel_visible" IS NULL;
UPDATE "public"."packages" SET "public_web_visible"=false WHERE "public_web_visible" IS NULL;
ALTER TABLE "public"."packages" ALTER COLUMN "panel_visible" SET DEFAULT true;
ALTER TABLE "public"."packages" ALTER COLUMN "panel_visible" SET NOT NULL;
ALTER TABLE "public"."packages" ALTER COLUMN "public_web_visible" SET DEFAULT false;
ALTER TABLE "public"."packages" ALTER COLUMN "public_web_visible" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "packages_panel_visibility_idx"
  ON "public"."packages" ("audience","catalog_scope","status","panel_visible","display_order");
CREATE INDEX IF NOT EXISTS "packages_public_visibility_idx"
  ON "public"."packages" ("audience","catalog_scope","status","public_web_visible","display_order");

ALTER TABLE "public"."physical_products" ADD COLUMN IF NOT EXISTS "image_reference" text;
ALTER TABLE "public"."physical_products"
  ADD CONSTRAINT "physical_products_image_reference_nonblank_chk"
  CHECK ("image_reference" IS NULL OR length(btrim("image_reference")) > 0) NOT VALID;
ALTER TABLE "public"."physical_products" VALIDATE CONSTRAINT "physical_products_image_reference_nonblank_chk";
CREATE INDEX IF NOT EXISTS "physical_products_image_reference_idx"
  ON "public"."physical_products" ("image_reference") WHERE "image_reference" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "public"."trainer_order_physical_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_package_order_item_id" uuid NOT NULL,
  "package_component_id" uuid NOT NULL,
  "physical_product_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "title_snapshot" text NOT NULL,
  "sku_snapshot" text NOT NULL,
  "display_label_snapshot" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "trainer_order_physical_items_order_component_uq" UNIQUE ("trainer_package_order_item_id","package_component_id"),
  CONSTRAINT "trainer_order_physical_items_quantity_chk" CHECK ("quantity">0),
  CONSTRAINT "trainer_order_physical_items_label_chk" CHECK ("display_label_snapshot" IS NULL OR length(btrim("display_label_snapshot"))>0),
  CONSTRAINT "trainer_order_physical_items_order_item_fk" FOREIGN KEY ("trainer_package_order_item_id") REFERENCES "public"."trainer_package_order_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "trainer_order_physical_items_component_fk" FOREIGN KEY ("package_component_id") REFERENCES "public"."package_components"("id") ON DELETE RESTRICT,
  CONSTRAINT "trainer_order_physical_items_product_fk" FOREIGN KEY ("physical_product_id") REFERENCES "public"."physical_products"("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "trainer_order_physical_items_order_idx" ON "public"."trainer_order_physical_items" ("trainer_package_order_item_id","id");
CREATE INDEX IF NOT EXISTS "trainer_order_physical_items_product_idx" ON "public"."trainer_order_physical_items" ("physical_product_id");

CREATE TABLE IF NOT EXISTS "public"."trainer_order_shipment_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_order_shipment_id" uuid NOT NULL,
  "trainer_order_physical_item_id" uuid NOT NULL,
  "physical_product_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "title_snapshot" text NOT NULL,
  "sku_snapshot" text NOT NULL,
  "display_label_snapshot" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "trainer_order_shipment_items_shipment_physical_uq" UNIQUE ("trainer_order_shipment_id","trainer_order_physical_item_id"),
  CONSTRAINT "trainer_order_shipment_items_quantity_chk" CHECK ("quantity">0),
  CONSTRAINT "trainer_order_shipment_items_label_chk" CHECK ("display_label_snapshot" IS NULL OR length(btrim("display_label_snapshot"))>0),
  CONSTRAINT "trainer_order_shipment_items_shipment_fk" FOREIGN KEY ("trainer_order_shipment_id") REFERENCES "public"."trainer_order_shipments"("id") ON DELETE RESTRICT,
  CONSTRAINT "trainer_order_shipment_items_physical_item_fk" FOREIGN KEY ("trainer_order_physical_item_id") REFERENCES "public"."trainer_order_physical_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "trainer_order_shipment_items_product_fk" FOREIGN KEY ("physical_product_id") REFERENCES "public"."physical_products"("id") ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "trainer_order_shipment_items_shipment_idx" ON "public"."trainer_order_shipment_items" ("trainer_order_shipment_id","id");
CREATE INDEX IF NOT EXISTS "trainer_order_shipment_items_product_idx" ON "public"."trainer_order_shipment_items" ("physical_product_id");
