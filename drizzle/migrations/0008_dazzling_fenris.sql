CREATE TYPE "public"."presentation_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"training_program_id" uuid,
	"status" "presentation_status" DEFAULT 'DRAFT' NOT NULL,
	"display_order" text DEFAULT '0' NOT NULL,
	"slide_count" text,
	"video_count" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presentations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "presentations" ADD CONSTRAINT "presentations_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "presentations_training_program_order_uq" ON "presentations" USING btree ("training_program_id","display_order");