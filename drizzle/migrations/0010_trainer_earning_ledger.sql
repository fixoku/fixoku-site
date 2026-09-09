CREATE TYPE "public"."trainer_earning_entry_type" AS ENUM('SESSION', 'BONUS', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."trainer_earning_status" AS ENUM('EARNED', 'HELD', 'PAID', 'REVERSED');--> statement-breakpoint
CREATE TABLE "trainer_earning_ledger" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "trainer_user_id" uuid NOT NULL,
 "student_user_id" uuid,
 "training_program_id" uuid,
 "entry_type" "trainer_earning_entry_type" NOT NULL,
 "status" "trainer_earning_status" DEFAULT 'EARNED' NOT NULL,
 "amount_minor" integer NOT NULL,
 "currency" text DEFAULT 'TRY' NOT NULL,
 "description" text NOT NULL,
 "source_type" text NOT NULL,
 "source_id" text NOT NULL,
 "idempotency_key" text NOT NULL,
 "hold_reason" text,
 "paid_at" timestamp with time zone,
 "occurred_at" timestamp with time zone NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "trainer_earning_ledger_idempotency_key_uq" UNIQUE("idempotency_key")
);--> statement-breakpoint
ALTER TABLE "trainer_earning_ledger" ADD CONSTRAINT "trainer_earning_ledger_trainer_user_id_platform_users_id_fk" FOREIGN KEY ("trainer_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_earning_ledger" ADD CONSTRAINT "trainer_earning_ledger_student_user_id_platform_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."platform_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_earning_ledger" ADD CONSTRAINT "trainer_earning_ledger_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE restrict ON UPDATE no action;
