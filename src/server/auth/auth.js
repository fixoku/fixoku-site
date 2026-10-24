/* global process */
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client.js";
import { users, memberships, studentProfiles } from "../db/schema.js";
import { captureLifecycleMail } from "../domain/test-email-capture.js";
import { sendTransactionalEmail } from "../domain/email-outbox.js";
import { requireApplicationOrigin, resolveTrustedOrigins } from "./origin.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
const appOrigin = requireApplicationOrigin(process.env);
const trustedOrigins = resolveTrustedOrigins(process.env);
function publicPasswordResetUrl(providerUrl) {
  let parsed;
  try { parsed = new URL(String(providerUrl || ""), appOrigin); } catch { throw new Error("PASSWORD_RESET_URL_INVALID"); }
  const pathToken = parsed.pathname.match(/\/reset-password\/([^/]+)/u)?.[1] || "";
  const token = parsed.searchParams.get("token") || (pathToken ? decodeURIComponent(pathToken) : "");
  if (!token) throw new Error("PASSWORD_RESET_TOKEN_MISSING");
  const callback = parsed.searchParams.get("callbackURL") || "";
  let area = "";
  try {
    const callbackUrl = new URL(callback, appOrigin);
    const requestedArea = callbackUrl.searchParams.get("alan");
    if (["owner", "egitmen", "ogrenci"].includes(requestedArea)) area = `&alan=${requestedArea}`;
  } catch { /* Invalid callback hints are ignored; the safe reset page remains. */ }
  return `${appOrigin}/sifre-sifirla?token=${encodeURIComponent(token)}${area}`;
}
const authRateLimit = { enabled: true, storage: "database", window: 10, max: 100, customRules: {
  "/sign-in/email": async (request, currentRule) => request.url.startsWith("http://local/") && request.headers.get("x-fixoku-local-review-proof") === secret ? { ...currentRule, window: 900, max: 50 } : { window: 900, max: 5 },
  "/sign-up/email": { window: 3600, max: 1 },
} };

const authOptions = {
  secret,
  database: drizzleAdapter(db, { provider: "pg" }),
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    // Public signup is denied by the HTTP adapters. Controlled registration
    // and invitation flows create accounts through the in-process handler.
    disableSignUp: false,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const resetUrl = publicPasswordResetUrl(url);
      if (captureLifecycleMail({ kind: "reset", to: user.email, url: resetUrl, metadata: { recipientName: user.name || null } })) return;
      await sendTransactionalEmail({ kind: "reset", to: user.email, url: resetUrl, recipientName: user.name });
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
    sendVerificationEmail: async ({ user, url, token }) => {
      let area = "";
      try {
        const callback = new URL(url).searchParams.get("callbackURL") || "";
        if (callback.includes("alan=egitmen")) area = "&alan=egitmen";
      } catch { /* Better Auth already supplies a safe yedek URL. */ }
      const verificationUrl = token ? `${appOrigin}/e-posta-dogrula?token=${encodeURIComponent(token)}${area}` : url;
      if (captureLifecycleMail({ kind: "verification", to: user.email, url: verificationUrl, metadata: { recipientName: user.name || null } })) return;
      await sendTransactionalEmail({ kind: "verification", to: user.email, url: verificationUrl, recipientName: user.name });
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
  baseURL: appOrigin,
  trustedOrigins,
  rateLimit: authRateLimit,
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
};

// The normal auth surface keeps Better Auth's 2FA plugin for every account.
// The private Owner entry point uses the same database, secret, session,
// CSRF, and rate-limit configuration but intentionally omits the plugin so
// the explicitly approved first Owner can enter with email + password. Server
// authorization still checks the OWNER membership on every panel/API request.
export const auth = betterAuth({ ...authOptions, plugins: [twoFactor({ issuer: "Fixoku" })] });
export const ownerAuth = betterAuth({ ...authOptions, plugins: [] });
// A pending trainer applicant may use the same Better Auth password/session
// checks to reach only the candidate profile area before e-mail verification.
// The HTTP adapter selects this instance only after a server-side application
// lookup; ordinary student, trainer, Owner and admin sign-in keep the strict
// e-mail verification policy above.
export const candidateAuth = betterAuth({
  ...authOptions,
  emailAndPassword: { ...authOptions.emailAndPassword, requireEmailVerification: false },
  plugins: [twoFactor({ issuer: "Fixoku" })],
});
