DO $$ BEGIN
  CREATE TYPE "public"."education_stage" AS ENUM ('PRIMARY','MIDDLE','HIGH','ADULT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."package_catalog_scope" AS ENUM ('LEGACY_EDUCATION','STUDENT_COMMERCE','TRAINER_COMMERCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."order_status" ADD VALUE 'PAYMENT_FAILED' AFTER 'PENDING_PAYMENT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "education_stage" "education_stage";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_stage_grade_chk" CHECK (
    "education_stage" IS NULL OR
    ("education_stage"='PRIMARY' AND "grade" IN ('3','4')) OR
    ("education_stage"='MIDDLE' AND "grade" IN ('5','6','7','8')) OR
    ("education_stage"='HIGH' AND "grade" IN ('9','10','11','12')) OR
    ("education_stage"='ADULT' AND "grade" IS NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "catalog_scope" "package_catalog_scope" NOT NULL DEFAULT 'LEGACY_EDUCATION';--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "education_stage" "education_stage";--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "eligible_grades_json" text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "packages" SET "catalog_scope"='TRAINER_COMMERCE' WHERE "audience"='TRAINER' AND "catalog_scope"='LEGACY_EDUCATION';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "packages_student_commerce_segment_idx" ON "packages" ("catalog_scope","education_stage","status","display_order");--> statement-breakpoint

ALTER TABLE "physical_products" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "physical_products" ALTER COLUMN "stock_location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "physical_products" DROP CONSTRAINT IF EXISTS "physical_products_type_chk";--> statement-breakpoint
ALTER TABLE "physical_products" ADD CONSTRAINT "physical_products_type_chk" CHECK ("product_type" IN ('PHYSICAL','SOFTWARE','SERVICE','DIGITAL'));--> statement-breakpoint
ALTER TABLE "package_components" ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "package_components_version_order_idx" ON "package_components" ("package_version_id","display_order","id");--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_minor" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "catalog_scope_snapshot" text NOT NULL DEFAULT 'LEGACY_EDUCATION';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_address_snapshot_json" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billing_snapshot_json" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_nonnegative_chk" CHECK ("shipping_minor" >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "components_snapshot_json" text NOT NULL DEFAULT '[]';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "student_cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "buyer_user_id" uuid NOT NULL,
  "beneficiary_student_profile_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "student_cart_items_buyer_profile_version_uq" UNIQUE("buyer_user_id","beneficiary_student_profile_id","package_version_id"),
  CONSTRAINT "student_cart_items_quantity_chk" CHECK ("quantity" = 1),
  CONSTRAINT "student_cart_items_buyer_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  CONSTRAINT "student_cart_items_profile_fk" FOREIGN KEY ("beneficiary_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE RESTRICT,
  CONSTRAINT "student_cart_items_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_cart_items_buyer_profile_idx" ON "student_cart_items" ("buyer_user_id","beneficiary_student_profile_id","updated_at");--> statement-breakpoint

WITH catalog(stage,grades,slug,title,subtitle,display_order) AS (VALUES
  ('PRIMARY'::education_stage,'[3,4]','student-primary-platinum-egitim','PLATINUM EĞİTİM','Akıllı Sistem + Birebir Eğitim',1),
  ('PRIMARY'::education_stage,'[3,4]','student-primary-premium-egitim','PREMIUM EĞİTİM','Akıllı Sistem + Küçük Grup Eğitimi',2),
  ('PRIMARY'::education_stage,'[3,4]','student-primary-akilli-sistem','AKILLI SİSTEM','Kitaplar + Yazılım',3),
  ('PRIMARY'::education_stage,'[3,4]','student-primary-dijital-yapay-zeka-sistemi','DİJİTAL YAPAY ZEKÂ SİSTEMİ','Yapay zekâ Destekli Yazılım',4),
  ('PRIMARY'::education_stage,'[3,4]','student-primary-gelisim','GELİŞİM','Zihin Egzersizleri Kitabı',5),
  ('PRIMARY'::education_stage,'[3,4]','student-primary-baslangic','BAŞLANGIÇ','Akıcı – Hızlı Okuma Dikkat ve Odaklanma Kitabı',6),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-platinum-egitim','PLATINUM EĞİTİM','Akıllı Sistem + Birebir Eğitim',1),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-premium-egitim','PREMIUM EĞİTİM','Akıllı Sistem + Küçük Grup Eğitimi',2),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-akilli-sistem','AKILLI SİSTEM','Kitaplar + Yazılım',3),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-dijital-yapay-zeka-sistemi','DİJİTAL YAPAY ZEKÂ SİSTEMİ','Yapay zekâ Destekli Yazılım',4),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-gelisim','GELİŞİM','Zihin Egzersizleri Kitabı',5),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-baslangic','BAŞLANGIÇ','Hızlı Okuma Dikkat ve Odaklanma Kitabı',6),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-paragraf-egitim','ORTAOKUL PARAGRAF EĞİTİM','Paragraf Kitabı + Birebir Eğitim',7),
  ('MIDDLE'::education_stage,'[5,6,7,8]','student-middle-paragraf-kitabi','ORTAOKUL PARAGRAF KİTABI','Paragraf Kitabı',8),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-platinum-egitim','PLATINUM EĞİTİM','Akıllı Sistem + Birebir Eğitim',1),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-premium-egitim','PREMIUM EĞİTİM','Akıllı Sistem + Küçük Grup Eğitimi',2),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-akilli-sistem','AKILLI SİSTEM','Kitaplar + Yazılım',3),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-dijital-yapay-zeka-sistemi','DİJİTAL YAPAY ZEKÂ SİSTEMİ','Yapay zekâ Destekli Yazılım',4),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-baslangic','BAŞLANGIÇ','Hızlı Okuma Dikkat ve Odaklanma Kitabı',5),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-paragraf-egitim','LİSEL PARAGRAF EĞİTİM','Paragraf Kitabı + Birebir Eğitim',6),
  ('HIGH'::education_stage,'[9,10,11,12]','student-high-paragraf-kitabi','LİSE PARAGRAF KİTABI','Paragraf Kitabı',7),
  ('ADULT'::education_stage,'[]','student-adult-platinum-egitim','PLATINUM EĞİTİM','Akıllı Sistem + Birebir Eğitim',1),
  ('ADULT'::education_stage,'[]','student-adult-premium-egitim','PREMIUM EĞİTİM','Akıllı Sistem + Küçük Grup Eğitimi',2),
  ('ADULT'::education_stage,'[]','student-adult-akilli-sistem','AKILLI SİSTEM','Kitaplar + Yazılım',3),
  ('ADULT'::education_stage,'[]','student-adult-dijital-yapay-zeka-sistemi','DİJİTAL YAPAY ZEKÂ SİSTEMİ','Yapay zekâ Destekli Yazılım',4),
  ('ADULT'::education_stage,'[]','student-adult-baslangic','BAŞLANGIÇ','Hızlı Okuma Dikkat ve Odaklanma Kitabı',5)
), inserted_packages AS (
  INSERT INTO packages(slug,audience,catalog_scope,education_stage,eligible_grades_json,display_order,status,physical_product,shipping_policy,shipping_price_minor)
  SELECT slug,'STUDENT','STUDENT_COMMERCE',stage,grades,display_order,'DRAFT',false,'FREE',0 FROM catalog
  ON CONFLICT(slug) DO NOTHING
  RETURNING id,slug
)
INSERT INTO package_versions(package_id,version_number,title,description,short_description,features_json,purchase_enabled,price_minor,currency,status)
SELECT p.id,1,c.title,c.subtitle,c.subtitle,'[]',false,NULL,NULL,'DRAFT'
FROM catalog c JOIN packages p ON p.slug=c.slug
WHERE p.catalog_scope='STUDENT_COMMERCE' AND NOT EXISTS (SELECT 1 FROM package_versions pv WHERE pv.package_id=p.id);--> statement-breakpoint
