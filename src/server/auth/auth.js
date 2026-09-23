/* global process */
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client.js";
import { users, memberships, studentProfiles } from "../db/schema.js";
import { captureLifecycleMail } from "../domain/test-email-capture.js";
import { sendTransactionalEmail } from "../domain/email-outbox.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
const appOrigin = process.env.NODE_ENV === "production"
  ? (process.env.APP_ORIGIN || "https://fixoku.com")
  : "http://127.0.0.1:5173";
const authRateLimit = { enabled: true, storage: "database", window: 10, max: 100, customRules: {
  "/sign-in/email": async (request, currentRule) => request.url.startsWith("http://local/") && request.headers.get("x-fixoku-local-review-proof") === secret ? { ...currentRule, window: 900, max: 50 } : { window: 900, max: 5 },
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
    disableSignUp: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
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
    sendVerificationEmail: async ({ user, url }) => {
      if (captureLifecycleMail({ kind: "verification", to: user.email, url })) return;
      await sendTransactionalEmail({ kind: "verification", to: user.email, url });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const { db: hookDb, pool: hookPool } = createDb();
          try {
            const platform = await hookDb.insert(users).values({
              authUserId: createdUser.id,
              email: createdUser.email,
              displayName: createdUser.name,
              emailVerified: Boolean(createdUser.emailVerified),
            }).onConflictDoNothing({ target: users.authUserId }).returning({ id: users.id });
            const platformUserId = platform[0]?.id;
            if (!platformUserId) return;
            await hookDb.insert(memberships).values({
              userId: platformUserId,
              scopeType: "STUDENT",
              scopeId: platformUserId,
              role: "STUDENT",
              status: "ACTIVE",
            }).onConflictDoNothing();
            await hookDb.insert(studentProfiles).values({
              userId: platformUserId,
              firstName: createdUser.name.split(/\s+/u)[0] || createdUser.name,
              lastName: createdUser.name.split(/\s+/u).slice(1).join(" ") || null,
            }).onConflictDoNothing({ target: studentProfiles.userId });
          } finally {
            await hookPool.end();
          }
        },
      },
    },
  },
  trustedOrigins: [appOrigin],
  rateLimit: authRateLimit,
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [twoFactor({ issuer: "Fixoku" })],
});
