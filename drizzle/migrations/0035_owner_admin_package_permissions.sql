-- Owner-controlled granular package permissions. This migration is source-only
-- until the owner explicitly approves applying it to an integration database.
CREATE TYPE "public"."package_permission_code" AS ENUM ('PACKAGE_READ','PACKAGE_CREATE','PACKAGE_EDIT','PACKAGE_PRICE_EDIT','PACKAGE_PUBLISH');--> statement-breakpoint
CREATE TABLE "public"."owner_admin_package_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_user_id" uuid NOT NULL REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "permission" "public"."package_permission_code" NOT NULL,
  "granted_by" uuid NOT NULL REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  "revoked_by" uuid REFERENCES "public"."platform_users"("id") ON DELETE RESTRICT,
  "revoke_reason" text,
  CONSTRAINT "owner_admin_package_permissions_revoke_pair_chk" CHECK ((revoked_at IS NULL AND revoked_by IS NULL) OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX "owner_admin_package_permissions_active_uq" ON "public"."owner_admin_package_permissions" ("admin_user_id","permission") WHERE "revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "owner_admin_package_permissions_admin_idx" ON "public"."owner_admin_package_permissions" ("admin_user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "owner_admin_package_permissions_granted_by_idx" ON "public"."owner_admin_package_permissions" ("granted_by","granted_at");
