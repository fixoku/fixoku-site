CREATE TYPE "public"."trainer_entitlement_status" AS ENUM('ACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."training_program_audience" AS ENUM('TRAINER', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."training_program_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "trainer_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_user_id" uuid NOT NULL,
	"training_program_id" uuid NOT NULL,
	"status" "trainer_entitlement_status" DEFAULT 'ACTIVE' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"audience" "training_program_audience" NOT NULL,
	"status" "training_program_status" DEFAULT 'DRAFT' NOT NULL,
	"display_order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_programs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "trainer_entitlements" ADD CONSTRAINT "trainer_entitlements_trainer_user_id_platform_users_id_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_entitlements" ADD CONSTRAINT "trainer_entitlements_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trainer_entitlements_trainer_program_start_uq" ON "trainer_entitlements" USING btree ("trainer_user_id","training_program_id","starts_at");