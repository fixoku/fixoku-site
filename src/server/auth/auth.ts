import { twoFactor } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client";
import { captureLifecycleMail } from "../domain/test-email-capture.js";
import { sendTransactionalEmail } from "../domain/email-outbox.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
const appOrigin = process.env.NODE_ENV === "production"
  ? (process.env.APP_ORIGIN ?? "https://fixoku.com")
  : "http://127.0.0.1:5173";
const authRateLimit = { enabled: true, storage: "database" as const, window: 10, max: 100, customRules: {
  "/sign-in/email": async (request: Request, currentRule: { window: number; max: number }) => request.url.startsWith("http://local/") && request.headers.get("x-fixoku-local-review-proof") === secret ? { ...currentRule, window: 900, max: 50 } : { window: 900, max: 5 },
  "/sign-up/email": { window: 3600, max: 1 },
} };

export const auth = betterAuth({
  secret,
  database: drizzleAdapter(db, { provider: "pg" }),
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    // HTTP adapters deny public signup; controlled server flows remain enabled.
    disableSignUp: false,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
    if (captureLifecycleMail({ kind: "reset", to: user.email, url })) return;
    await sendTransactionalEmail({ kind: "reset", to: user.email, url });
    },
  },
  emailVerification: {
    afterEmailVerification: async (verifiedUser) => {
      // FIXOKU_EMAIL_VERIFICATION_SYNC
      const { pool: syncPool } = createDb();
      try {
        await syncPool.query(
          `update platform_users
             set email=$1,
                 email_verified=$2,
                 updated_at=now()
           where auth_user_id=$3`,
          [verifiedUser.email, Boolean(verifiedUser.emailVerified), verifiedUser.id],
        );
      } finally {
        await syncPool.end();
      }
    },
    sendOnSignUp: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      if (captureLifecycleMail({ kind: "verification", to: user.email, url })) return;
      await sendTransactionalEmail({ kind: "verification", to: user.email, url });
    },
  },
  trustedOrigins: [appOrigin],
  rateLimit: authRateLimit,
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [twoFactor({ issuer: "Fixoku" })],
});
