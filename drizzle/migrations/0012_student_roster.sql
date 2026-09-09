CREATE TYPE "public"."student_profile_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "student_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "grade" text,
  "school" text,
  "status" "student_profile_status" DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint
CREATE TABLE "trainer_student_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trainer_user_id" uuid NOT NULL,
  "student_user_id" uuid NOT NULL,
  "status" "student_profile_status" DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_platform_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_student_links" ADD CONSTRAINT "trainer_student_links_trainer_user_id_platform_users_id_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_student_links" ADD CONSTRAINT "trainer_student_links_student_user_id_platform_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trainer_student_links_trainer_student_uq" ON "trainer_student_links" USING btree ("trainer_user_id", "student_user_id");
