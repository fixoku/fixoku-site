ALTER TABLE "platform_users" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
UPDATE "platform_users" AS platform_user SET "auth_user_id" = auth_user.id FROM "user" AS auth_user WHERE auth_user.email = platform_user.email;--> statement-breakpoint
UPDATE "platform_users" SET "auth_user_id" = 'legacy-' || id::text WHERE "auth_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "platform_users" ALTER COLUMN "auth_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_users" ADD CONSTRAINT "platform_users_auth_user_id_unique" UNIQUE("auth_user_id");
