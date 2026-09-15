import { twoFactor } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client";
import { captureLifecycleMail } from "../domain/test-email-capture.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
const authRateLimit = { enabled: true, storage: "database" as const, window: 10, max: 100, customRules: {
  "/sign-in/email": async (request: Request, currentRule: { window: number; max: number }) => request.url.startsWith("http://local/") && request.headers.get("x-fixoku-local-review-proof") === secret ? { ...currentRule, window: 900, max: 50 } : { window: 900, max: 5 },
  "/sign-up/email": { window: 3600, max: 1 },
} };

export const auth = betterAuth({
  secret,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
    if (captureLifecycleMail({ kind: "reset", to: user.email, url })) return;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP_NOT_CONFIGURED");
    void user; void url;
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      if (captureLifecycleMail({ kind: "verification", to: user.email, url })) return;
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP_NOT_CONFIGURED");
      void user; void url;
    },
  },
  trustedOrigins: [process.env.APP_ORIGIN ?? "http://127.0.0.1:5173"],
  rateLimit: authRateLimit,
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [twoFactor({ issuer: "Fixoku" })],
});
