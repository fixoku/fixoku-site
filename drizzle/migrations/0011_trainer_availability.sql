CREATE TYPE "public"."availability_slot_status" AS ENUM('OPEN','HELD','BOOKED','BLOCKED','CANCELLED');--> statement-breakpoint
CREATE TABLE "availability_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "timezone" text DEFAULT 'Europe/Istanbul' NOT NULL,
  "capacity" integer DEFAULT 1 NOT NULL,
  "status" "availability_slot_status" DEFAULT 'OPEN' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "availability_slots_range_check" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "availability_slots_capacity_check" CHECK ("capacity" > 0 AND "capacity" <= 20)
);--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_trainer_user_id_platform_users_id_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_slots_trainer_start_uq" ON "availability_slots" USING btree ("trainer_user_id","starts_at");
