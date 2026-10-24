import { twoFactor } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb } from "../db/client";
import { captureLifecycleMail } from "../domain/test-email-capture.js";
import { sendTransactionalEmail } from "../domain/email-outbox.js";
import { requireApplicationOrigin, resolveTrustedOrigins } from "./origin.js";

const { db } = createDb();
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET_MISSING_OR_WEAK");
const appOrigin = requireApplicationOrigin(process.env);
const trustedOrigins = resolveTrustedOrigins(process.env);
function publicPasswordResetUrl(providerUrl: string) {
  let parsed: URL;
  try { parsed = new URL(String(providerUrl || ""), appOrigin); } catch { throw new Error("PASSWORD_RESET_URL_INVALID"); }
  const pathToken = parsed.pathname.match(/\/reset-password\/([^/]+)/u)?.[1] || "";
  const token = parsed.searchParams.get("token") || (pathToken ? decodeURIComponent(pathToken) : "");
  if (!token) throw new Error("PASSWORD_RESET_TOKEN_MISSING");
  const callback = parsed.searchParams.get("callbackURL") || "";
  let area = "";
  try {
    const callbackUrl = new URL(callback, appOrigin);
    const requestedArea = callbackUrl.searchParams.get("alan");
    if (typeof requestedArea === "string" && ["owner", "egitmen", "ogrenci"].includes(requestedArea)) area = `&alan=${requestedArea}`;
  } catch { /* Invalid callback hints are ignored; the safe reset page remains. */ }
  return `${appOrigin}/sifre-sifirla?token=${encodeURIComponent(token)}${area}`;
}
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
    sendResetPassword: async ({ user, url }: { user: { email: string; name?: string | null }; url: string }) => {
    const resetUrl = publicPasswordResetUrl(url);
    if (captureLifecycleMail({ kind: "reset", to: user.email, url: resetUrl, metadata: { recipientName: user.name || null } })) return;
    await sendTransactionalEmail({ kind: "reset", to: user.email, url: resetUrl, recipientName: user.name || undefined });
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
    sendVerificationEmail: async ({ user, url, token }: { user: { email: string; name?: string | null }; url: string; token?: string }) => {
    let area = "";
    try {
      const callback = new URL(url).searchParams.get("callbackURL") || "";
      if (callback.includes("alan=egitmen")) area = "&alan=egitmen";
    } catch { /* Better Auth already supplies a safe yedek URL. */ }
    const verificationUrl = token ? `${appOrigin}/e-posta-dogrula?token=${encodeURIComponent(token)}${area}` : url;
      if (captureLifecycleMail({ kind: "verification", to: user.email, url: verificationUrl, metadata: { recipientName: user.name || null } })) return;
      await sendTransactionalEmail({ kind: "verification", to: user.email, url: verificationUrl, recipientName: user.name || undefined });
    },
  },
  baseURL: appOrigin,
  trustedOrigins,
  rateLimit: authRateLimit,
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  plugins: [twoFactor({ issuer: "Fixoku" })],
});
