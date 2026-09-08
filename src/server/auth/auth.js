/* global process */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
export const auth = betterAuth({
  secret,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, disableSignUp: true, revokeSessionsOnPasswordReset: true, sendResetPassword: async ({ user, url }) => {
    if (process.env.NODE_ENV === "test" || process.env.BETTER_AUTH_TEST_MAIL_SINK === "1") return;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP_NOT_CONFIGURED");
    // Production delivery is intentionally deferred until the approved mail transport is configured.
    void user; void url;
  } },
  trustedOrigins: [process.env.APP_ORIGIN ?? "http://127.0.0.1:5173"],
  rateLimit: { enabled: true, storage: "database", window: 10, max: 100, customRules: { "/sign-in/email": { window: 900, max: 5 }, "/sign-up/email": { window: 3600, max: 1 } } },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
});
