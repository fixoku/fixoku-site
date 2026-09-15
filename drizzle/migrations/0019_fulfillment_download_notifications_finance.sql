CREATE TYPE "public"."package_component_type" AS ENUM('TRAINING_PROGRAM','TRAINER_SERVICE','PHYSICAL_PRODUCT','DIGITAL_DOWNLOAD','DIGITAL_ACCESS','TRAINER_EDUCATION','TRAINER_CERTIFICATION_PATH');--> statement-breakpoint
CREATE TABLE "package_components" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_version_id" uuid NOT NULL,
  "component_type" "package_component_type" NOT NULL,
  "reference_id" uuid,
  "title_snapshot" text NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "metadata_json" text NOT NULL DEFAULT '{}',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "package_components_quantity_chk" CHECK ("quantity">0)
);--> statement-breakpoint
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE INDEX "package_components_version_idx" ON "package_components" ("package_version_id");--> statement-breakpoint
CREATE TABLE "physical_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sku" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "weight_grams" integer,
  "dimensions_json" text,
  "stock_location" text NOT NULL,
  "on_hand" integer NOT NULL DEFAULT 0,
  "reserved" integer NOT NULL DEFAULT 0,
  "low_stock_threshold" integer NOT NULL DEFAULT 0,
  "cost_minor" integer NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'TRY',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "physical_products_stock_chk" CHECK ("on_hand">=0 AND "reserved">=0 AND "reserved"<="on_hand"),
  CONSTRAINT "physical_products_cost_chk" CHECK ("cost_minor">=0),
  CONSTRAINT "physical_products_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('RECEIPT','RESERVATION','RELEASE','SHIPMENT','RETURN','ADJUSTMENT','DAMAGE');--> statement-breakpoint
CREATE TABLE "inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "physical_product_id" uuid NOT NULL,
  "movement_type" "inventory_movement_type" NOT NULL,
  "quantity" integer NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "idempotency_key" text NOT NULL UNIQUE,
  "actor_user_id" uuid,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_movements_quantity_chk" CHECK ("quantity">0)
);--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_fk" FOREIGN KEY ("physical_product_id") REFERENCES "public"."physical_products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE INDEX "inventory_movements_product_time_idx" ON "inventory_movements" ("physical_product_id","occurred_at");--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('WAITING','PREPARING','PACKED','SHIPPED','DELIVERED','RETURNED','CANCELLED');--> statement-breakpoint
CREATE TABLE "shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "beneficiary_student_user_id" uuid NOT NULL,
  "address_snapshot_json" text NOT NULL,
  "carrier" text,
  "tracking_number" text,
  "label_reference" text,
  "shipping_charge_minor" integer NOT NULL DEFAULT 0,
  "actual_shipping_cost_minor" integer,
  "status" "shipment_status" NOT NULL DEFAULT 'WAITING',
  "provider_enabled" boolean NOT NULL DEFAULT false,
  "shipped_at" timestamptz,
  "delivered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "shipments_charge_chk" CHECK ("shipping_charge_minor">=0),
  CONSTRAINT "shipments_actual_cost_chk" CHECK ("actual_shipping_cost_minor" IS NULL OR "actual_shipping_cost_minor">=0)
);--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_beneficiary_fk" FOREIGN KEY ("beneficiary_student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE TABLE "shipment_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shipment_id" uuid NOT NULL,
  "physical_product_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "title_snapshot" text NOT NULL,
  CONSTRAINT "shipment_items_quantity_chk" CHECK ("quantity">0)
);--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_product_fk" FOREIGN KEY ("physical_product_id") REFERENCES "public"."physical_products"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE TABLE "digital_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "storage_key" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "version" text NOT NULL,
  "sha256" text,
  "size_bytes" integer,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "digital_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_id" uuid NOT NULL,
  "beneficiary_student_user_id" uuid NOT NULL,
  "source_order_item_id" uuid,
  "granted_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz,
  "download_count" integer NOT NULL DEFAULT 0,
  "download_limit" integer,
  CONSTRAINT "digital_entitlements_download_chk" CHECK ("download_count">=0 AND ("download_limit" IS NULL OR "download_limit">=0))
);--> statement-breakpoint
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_file_fk" FOREIGN KEY ("file_id") REFERENCES "public"."digital_files"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_beneficiary_fk" FOREIGN KEY ("beneficiary_student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "digital_entitlements" ADD CONSTRAINT "digital_entitlements_order_item_fk" FOREIGN KEY ("source_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE TABLE "digital_download_audits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entitlement_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "downloaded_at" timestamptz DEFAULT now() NOT NULL,
  "result" text NOT NULL,
  "ip_hash" text
);--> statement-breakpoint
ALTER TABLE "digital_download_audits" ADD CONSTRAINT "digital_download_audits_entitlement_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."digital_entitlements"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "digital_download_audits" ADD CONSTRAINT "digital_download_audits_actor_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE TABLE "panel_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_user_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "metadata_json" text NOT NULL DEFAULT '{}',
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "dedupe_key" text NOT NULL UNIQUE
);--> statement-breakpoint
ALTER TABLE "panel_notifications" ADD CONSTRAINT "panel_notifications_recipient_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE INDEX "panel_notifications_recipient_idx" ON "panel_notifications" ("recipient_user_id","created_at");--> statement-breakpoint
CREATE TABLE "owner_finance_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entry_type" text NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "metadata_json" text NOT NULL DEFAULT '{}',
  "reversal_of_id" uuid,
  "created_by" uuid,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "owner_finance_amount_nonzero_chk" CHECK ("amount_minor"<>0),
  CONSTRAINT "owner_finance_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
ALTER TABLE "owner_finance_ledger" ADD CONSTRAINT "owner_finance_reversal_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."owner_finance_ledger"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "owner_finance_ledger" ADD CONSTRAINT "owner_finance_creator_fk" FOREIGN KEY ("created_by") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE INDEX "owner_finance_source_idx" ON "owner_finance_ledger" ("source_type","source_id","occurred_at");--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_rate_bps" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "billing_snapshot_json" text;--> statement-breakpoint
CREATE TABLE "trainer_payout_register" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "payment_date" date NOT NULL,
  "bank_reference" text,
  "created_by" uuid NOT NULL REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "approved_by" uuid REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_payout_amount_chk" CHECK ("amount_minor">=0),
  CONSTRAINT "trainer_payout_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE INDEX "trainer_payout_trainer_period_idx" ON "trainer_payout_register" ("trainer_user_id","period_start","period_end");--> statement-breakpoint
CREATE TABLE "notification_email_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_user_id" uuid NOT NULL REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "event_type" text NOT NULL,
  "recipient_email" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'QUEUED',
  "dedupe_key" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "sent_at" timestamptz
);--> statement-breakpoint
CREATE INDEX "notification_email_outbox_status_idx" ON "notification_email_outbox" ("status","created_at");--> statement-breakpoint
