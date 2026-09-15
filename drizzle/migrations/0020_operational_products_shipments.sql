ALTER TABLE "physical_products" ADD COLUMN IF NOT EXISTS "product_type" text NOT NULL DEFAULT 'PHYSICAL';--> statement-breakpoint
ALTER TABLE "physical_products" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "physical_products" ADD CONSTRAINT "physical_products_type_chk" CHECK ("product_type" IN ('PHYSICAL','DIGITAL'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "physical_products_active_idx" ON "physical_products" ("is_active","sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_status_created_idx" ON "shipments" ("status","created_at");--> statement-breakpoint
