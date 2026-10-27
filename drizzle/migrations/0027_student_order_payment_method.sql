DO $$ BEGIN
  CREATE TYPE "order_payment_method" AS ENUM ('PAYTR', 'BANK_TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" "order_payment_method";
