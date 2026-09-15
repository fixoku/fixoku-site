CREATE TYPE "public"."order_status" AS ENUM('PENDING_PAYMENT','PAID','PARTIALLY_REFUNDED','REFUNDED','CANCELLED','PAYMENT_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('CREATED','PENDING','AUTHORIZED','SUCCEEDED','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_status" AS ENUM('PENDING','SUCCEEDED','FAILED','CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_transaction_type" AS ENUM('AUTHORIZATION','CAPTURE','SETTLEMENT','REFUND','VOID');--> statement-breakpoint
CREATE TYPE "public"."payment_webhook_status" AS ENUM('RECEIVED','VERIFIED','APPLIED','REJECTED','RETRYABLE_ERROR');--> statement-breakpoint
CREATE TYPE "public"."package_entitlement_status" AS ENUM('ACTIVE','REVOKED','EXPIRED');--> statement-breakpoint
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "buyer_user_id" uuid NOT NULL,
  "beneficiary_student_user_id" uuid NOT NULL,
  "beneficiary_student_profile_id" uuid,
  "status" "order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
  "currency" text NOT NULL,
  "subtotal_minor" integer NOT NULL,
  "total_minor" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz,
  "cancelled_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "orders_buyer_idempotency_uq" UNIQUE("buyer_user_id","idempotency_key"),
  CONSTRAINT "orders_subtotal_nonnegative_chk" CHECK ("subtotal_minor" >= 0),
  CONSTRAINT "orders_total_nonnegative_chk" CHECK ("total_minor" >= 0),
  CONSTRAINT "orders_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "package_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "title_snapshot" text NOT NULL,
  "description_snapshot" text NOT NULL,
  "version_number_snapshot" integer NOT NULL,
  "delivery_mode_snapshot" "package_delivery_mode" NOT NULL,
  "unit_price_minor" integer NOT NULL,
  "total_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "entitlement_definitions_snapshot" text NOT NULL DEFAULT '[]',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "order_items_order_version_uq" UNIQUE("order_id","package_version_id"),
  CONSTRAINT "order_items_unit_price_nonnegative_chk" CHECK ("unit_price_minor" >= 0),
  CONSTRAINT "order_items_total_nonnegative_chk" CHECK ("total_minor" >= 0),
  CONSTRAINT "order_items_quantity_positive_chk" CHECK ("quantity" > 0),
  CONSTRAINT "order_items_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE TABLE "payment_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "status" "payment_intent_status" DEFAULT 'CREATED' NOT NULL,
  "provider" text,
  "provider_reference" text,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "succeeded_at" timestamptz,
  "failed_at" timestamptz,
  "cancelled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_intents_order_uq" UNIQUE("order_id"),
  CONSTRAINT "payment_intents_idempotency_uq" UNIQUE("idempotency_key"),
  CONSTRAINT "payment_intents_amount_nonnegative_chk" CHECK ("amount_minor" >= 0),
  CONSTRAINT "payment_intents_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE TABLE "payment_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "payment_intent_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_transaction_id" text NOT NULL,
  "transaction_type" "payment_transaction_type" NOT NULL,
  "status" "payment_transaction_status" NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "metadata_json" text NOT NULL DEFAULT '{}',
  "occurred_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_transactions_provider_ref_type_uq" UNIQUE("provider","provider_transaction_id","transaction_type"),
  CONSTRAINT "payment_transactions_amount_nonnegative_chk" CHECK ("amount_minor" >= 0),
  CONSTRAINT "payment_transactions_currency_chk" CHECK ("currency" ~ '^[A-Z]{3}$')
);--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload_hash" text NOT NULL,
  "payload_summary_json" text NOT NULL DEFAULT '{}',
  "status" "payment_webhook_status" DEFAULT 'RECEIVED' NOT NULL,
  "received_at" timestamptz DEFAULT now() NOT NULL,
  "processed_at" timestamptz,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "error_code" text,
  CONSTRAINT "payment_webhook_events_provider_event_uq" UNIQUE("provider","provider_event_id")
);--> statement-breakpoint
CREATE TABLE "package_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "beneficiary_student_user_id" uuid NOT NULL,
  "beneficiary_student_profile_id" uuid,
  "package_id" uuid NOT NULL,
  "package_version_id" uuid NOT NULL,
  "source_order_id" uuid NOT NULL,
  "source_order_item_id" uuid NOT NULL,
  "status" "package_entitlement_status" DEFAULT 'ACTIVE' NOT NULL,
  "effective_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz,
  "revoked_at" timestamptz,
  "issuance_key" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "package_entitlements_issuance_key_uq" UNIQUE("issuance_key"),
  CONSTRAINT "package_entitlements_source_student_uq" UNIQUE("source_order_item_id","beneficiary_student_user_id")
);--> statement-breakpoint
CREATE TABLE "package_entitlement_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "package_entitlement_id" uuid NOT NULL,
  "enrollment_id" uuid NOT NULL,
  "training_program_id" uuid NOT NULL,
  "source_order_item_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "package_entitlement_enrollments_entitlement_program_uq" UNIQUE("package_entitlement_id","training_program_id")
);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_user_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_beneficiary_user_fk" FOREIGN KEY ("beneficiary_student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_beneficiary_profile_fk" FOREIGN KEY ("beneficiary_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_intent_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_attempt_count_chk" CHECK ("attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_beneficiary_user_fk" FOREIGN KEY ("beneficiary_student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_beneficiary_profile_fk" FOREIGN KEY ("beneficiary_student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_package_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_package_version_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_order_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlements" ADD CONSTRAINT "package_entitlements_order_item_fk" FOREIGN KEY ("source_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlement_enrollments" ADD CONSTRAINT "package_entitlement_enrollments_entitlement_fk" FOREIGN KEY ("package_entitlement_id") REFERENCES "public"."package_entitlements"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlement_enrollments" ADD CONSTRAINT "package_entitlement_enrollments_enrollment_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlement_enrollments" ADD CONSTRAINT "package_entitlement_enrollments_program_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "package_entitlement_enrollments" ADD CONSTRAINT "package_entitlement_enrollments_order_item_fk" FOREIGN KEY ("source_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;--> statement-breakpoint
CREATE INDEX "orders_beneficiary_idx" ON "orders" ("beneficiary_student_user_id");--> statement-breakpoint
CREATE INDEX "order_items_package_version_idx" ON "order_items" ("package_version_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_status_idx" ON "payment_webhook_events" ("status");--> statement-breakpoint
CREATE INDEX "package_entitlements_beneficiary_status_idx" ON "package_entitlements" ("beneficiary_student_user_id","status");
