CREATE TYPE "public"."trainer_package_entitlement_status" AS ENUM ('ACTIVE','REVOKED');
CREATE TYPE "public"."trainer_package_entitlement_source" AS ENUM ('PAYMENT','LEGACY_PURCHASE','MANUAL_GIFT');
CREATE TYPE "public"."trainer_order_status" AS ENUM ('PENDING_PAYMENT','PAYMENT_REVIEW','PAID','REJECTED','CANCELLED','REFUNDED');
CREATE TYPE "public"."trainer_payment_method" AS ENUM ('PAYTR','BANK_TRANSFER');
CREATE TYPE "public"."bank_transfer_status" AS ENUM ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED');
CREATE TYPE "public"."trainer_invoice_status" AS ENUM ('PENDING','ISSUED','FAILED','CANCELLED');

CREATE TABLE "trainer_addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" text NOT NULL,
  "city" text NOT NULL,
  "district" text NOT NULL,
  "neighborhood" text,
  "address_line" text NOT NULL,
  "postal_code" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "trainer_addresses" ADD CONSTRAINT "trainer_addresses_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
CREATE INDEX "trainer_addresses_trainer_idx" ON "trainer_addresses" ("trainer_user_id","updated_at");

CREATE TABLE "trainer_cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_cart_items_trainer_version_uq" UNIQUE("trainer_user_id","package_version_id"),
  CONSTRAINT "trainer_cart_items_quantity_chk" CHECK ("quantity" = 1)
);
ALTER TABLE "trainer_cart_items" ADD CONSTRAINT "trainer_cart_items_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_cart_items" ADD CONSTRAINT "trainer_cart_items_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;

CREATE TABLE "trainer_package_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "status" "trainer_order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
  "payment_method" "trainer_payment_method" NOT NULL,
  "currency" text NOT NULL,
  "subtotal_minor" integer NOT NULL,
  "shipping_minor" integer NOT NULL,
  "discount_minor" integer DEFAULT 0 NOT NULL,
  "tax_minor" integer NOT NULL,
  "total_minor" integer NOT NULL,
  "shipping_address_snapshot_json" text NOT NULL,
  "billing_snapshot_json" text NOT NULL,
  "invoice_status" "trainer_invoice_status" DEFAULT 'PENDING' NOT NULL,
  "invoice_reference" text,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_package_orders_trainer_idempotency_uq" UNIQUE("trainer_user_id","idempotency_key"),
  CONSTRAINT "trainer_package_orders_amounts_chk" CHECK ("subtotal_minor" >= 0 AND "shipping_minor" >= 0 AND "discount_minor" >= 0 AND "tax_minor" >= 0 AND "total_minor" >= 0),
  CONSTRAINT "trainer_package_orders_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);
ALTER TABLE "trainer_package_orders" ADD CONSTRAINT "trainer_package_orders_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
CREATE INDEX "trainer_package_orders_trainer_status_idx" ON "trainer_package_orders" ("trainer_user_id","status","created_at");

CREATE TABLE "trainer_package_order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "title_snapshot" text NOT NULL,
  "description_snapshot" text NOT NULL,
  "features_snapshot_json" text DEFAULT '[]' NOT NULL,
  "sku_snapshot" text NOT NULL,
  "invoice_product_code_snapshot" text,
  "invoice_product_name_snapshot" text NOT NULL,
  "invoice_description_snapshot" text,
  "unit_snapshot" text DEFAULT 'adet' NOT NULL,
  "vat_rate_bps_snapshot" integer NOT NULL,
  "unit_net_minor" integer NOT NULL,
  "unit_gross_minor" integer NOT NULL,
  "shipping_minor" integer NOT NULL,
  "discount_minor" integer DEFAULT 0 NOT NULL,
  "line_total_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_package_order_items_order_version_uq" UNIQUE("order_id","package_version_id"),
  CONSTRAINT "trainer_package_order_items_quantity_chk" CHECK ("quantity" = 1),
  CONSTRAINT "trainer_package_order_items_amounts_chk" CHECK ("unit_net_minor" >= 0 AND "unit_gross_minor" >= 0 AND "shipping_minor" >= 0 AND "discount_minor" >= 0 AND "line_total_minor" >= 0)
);
ALTER TABLE "trainer_package_order_items" ADD CONSTRAINT "trainer_package_order_items_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trainer_package_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_order_items" ADD CONSTRAINT "trainer_package_order_items_package_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_order_items" ADD CONSTRAINT "trainer_package_order_items_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;

CREATE TABLE "trainer_package_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "status" "trainer_package_entitlement_status" DEFAULT 'ACTIVE' NOT NULL,
  "source" "trainer_package_entitlement_source" NOT NULL,
  "source_order_id" uuid,
  "assigned_by" uuid,
  "historical_purchase_at" timestamptz,
  "note" text,
  "effective_at" timestamptz DEFAULT now() NOT NULL,
  "revoked_at" timestamptz,
  "revoked_by" uuid,
  "revoke_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_package_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_order_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."trainer_package_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_assigner_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_package_entitlements" ADD CONSTRAINT "trainer_package_entitlements_revoker_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "trainer_package_entitlements_active_uq" ON "trainer_package_entitlements" ("trainer_user_id","package_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "trainer_package_entitlements_trainer_idx" ON "trainer_package_entitlements" ("trainer_user_id","status","effective_at");

CREATE TABLE "trainer_bank_transfer_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "status" "bank_transfer_status" DEFAULT 'SUBMITTED' NOT NULL,
  "payer_name" text NOT NULL,
  "bank_name" text NOT NULL,
  "reported_amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "transfer_date" date NOT NULL,
  "reference" text NOT NULL,
  "receipt_reference" text,
  "review_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_bank_transfer_notifications_order_uq" UNIQUE("order_id"),
  CONSTRAINT "trainer_bank_transfer_notifications_amount_chk" CHECK ("reported_amount_minor" > 0),
  CONSTRAINT "trainer_bank_transfer_notifications_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);
ALTER TABLE "trainer_bank_transfer_notifications" ADD CONSTRAINT "trainer_bank_transfer_notifications_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trainer_package_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_bank_transfer_notifications" ADD CONSTRAINT "trainer_bank_transfer_notifications_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_bank_transfer_notifications" ADD CONSTRAINT "trainer_bank_transfer_notifications_reviewer_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
CREATE INDEX "trainer_bank_transfer_notifications_status_idx" ON "trainer_bank_transfer_notifications" ("status","submitted_at");

CREATE TABLE "trainer_order_shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL UNIQUE,
  "trainer_user_id" uuid NOT NULL,
  "address_snapshot_json" text NOT NULL,
  "carrier" text,
  "tracking_number" text,
  "tracking_url" text,
  "label_reference" text,
  "shipping_charge_minor" integer DEFAULT 0 NOT NULL,
  "actual_shipping_cost_minor" integer,
  "status" "shipment_status" DEFAULT 'PREPARING' NOT NULL,
  "provider_enabled" boolean DEFAULT false NOT NULL,
  "shipped_at" timestamptz,
  "delivered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_order_shipments_charge_chk" CHECK ("shipping_charge_minor" >= 0),
  CONSTRAINT "trainer_order_shipments_actual_cost_chk" CHECK ("actual_shipping_cost_minor" IS NULL OR "actual_shipping_cost_minor" >= 0)
);
ALTER TABLE "trainer_order_shipments" ADD CONSTRAINT "trainer_order_shipments_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."trainer_package_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_order_shipments" ADD CONSTRAINT "trainer_order_shipments_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
CREATE INDEX "trainer_order_shipments_status_idx" ON "trainer_order_shipments" ("status","created_at");

CREATE TABLE "trainer_video_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "video_index" integer NOT NULL,
  "duration_seconds" integer NOT NULL,
  "watched_ranges_json" text DEFAULT '[]' NOT NULL,
  "coverage_bps" integer DEFAULT 0 NOT NULL,
  "last_position_seconds" integer DEFAULT 0 NOT NULL,
  "ended_seen" boolean DEFAULT false NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "trainer_video_progress_trainer_package_video_uq" UNIQUE("trainer_user_id","package_id","video_index"),
  CONSTRAINT "trainer_video_progress_index_chk" CHECK ("video_index" BETWEEN 1 AND 6),
  CONSTRAINT "trainer_video_progress_duration_chk" CHECK ("duration_seconds" > 0),
  CONSTRAINT "trainer_video_progress_coverage_chk" CHECK ("coverage_bps" BETWEEN 0 AND 10000),
  CONSTRAINT "trainer_video_progress_position_chk" CHECK ("last_position_seconds" >= 0)
);
ALTER TABLE "trainer_video_progress" ADD CONSTRAINT "trainer_video_progress_trainer_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;
ALTER TABLE "trainer_video_progress" ADD CONSTRAINT "trainer_video_progress_package_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;
CREATE INDEX "trainer_video_progress_completed_idx" ON "trainer_video_progress" ("trainer_user_id","package_id","completed_at");
