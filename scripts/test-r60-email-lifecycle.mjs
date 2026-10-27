import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderLifecycleEmail } from "../src/server/domain/email-renderer.js";
import { getSmtpConfig, processOutboxBatch, sendTransactionalEmail } from "../src/server/domain/email-outbox.js";
import { resolveApplicationOrigin, resolveTrustedOrigins, requireApplicationOrigin } from "../src/server/auth/origin.js";

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const rewriteSources = new Set((vercel.rewrites || []).map((entry) => entry.source));
assert.equal(rewriteSources.has("/sifre-sifirla"), true);
assert.equal(rewriteSources.has("/e-posta-dogrula"), true);
assert.equal(rewriteSources.has("/ogretmen-aday-aktivasyon"), true);
assert.equal((vercel.rewrites || []).find((entry) => entry.source === "/sifre-sifirla")?.destination, "/index.html");
assert.equal((vercel.rewrites || []).find((entry) => entry.source === "/e-posta-dogrula")?.destination, "/index.html");

const routesSource = await readFile(new URL("../src/AppRoutes.jsx", import.meta.url), "utf8");
const lifecycleSource = await readFile(new URL("../src/pages/AuthLifecycle.jsx", import.meta.url), "utf8");
const lifecycleApiSource = await readFile(new URL("../api/account-lifecycle.js", import.meta.url), "utf8");
const authSource = await readFile(new URL("../src/server/auth/auth.js", import.meta.url), "utf8");
const outboxSource = await readFile(new URL("../src/server/domain/email-outbox.js", import.meta.url), "utf8");
const offerSource = await readFile(new URL("../api/admin/r6-custom-offers.js", import.meta.url), "utf8");
const candidateSource = await readFile(new URL("../api/trainer-candidate.js", import.meta.url), "utf8");
const invitationAcceptSource = await readFile(new URL("../api/invitation-accept.js", import.meta.url), "utf8");
const betterAuthPasswordSource = await readFile(new URL("../node_modules/better-auth/dist/api/routes/password.mjs", import.meta.url), "utf8");
const betterAuthVerificationSource = await readFile(new URL("../node_modules/better-auth/dist/api/routes/email-verification.mjs", import.meta.url), "utf8");
assert.match(routesSource, /path="\/sifre-sifirla"/u);
assert.match(routesSource, /path="\/e-posta-dogrula"/u);
assert.match(lifecycleSource, /new URLSearchParams\(location\.search\)\.get\("token"\)/u);
assert.match(lifecycleSource, /\/api\/auth\/reset-password/u);
assert.match(lifecycleSource, /\/api\/auth\/verify-email/u);
assert.ok(!lifecycleSource.includes('params.get("verified")'));
assert.ok(!lifecycleSource.includes('params.get("error")'));
assert.match(lifecycleApiSource, /callbackURL:'\/e-posta-dogrula\?alan=ogrenci'/u);
assert.match(lifecycleSource, /window\.setTimeout\(\(\) => \{ if \(active\) window\.location\.assign\(loginPath\); \}, 3000\)/u);
assert.match(lifecycleSource, /const loginPath = trainer \? "\/ogretmen-girisi" : "\/ogrenci-girisi"/u);
assert.match(lifecycleSource, /Link to=\{loginPath\}/u);
assert.match(lifecycleSource, /alan=owner/u);
assert.match(lifecycleSource, /loginPath = owner \? "\/seniseviim"/u);
assert.match(lifecycleApiSource, /\/sifre-sifirla\?alan=owner/u);
assert.match(lifecycleApiSource, /\/sifre-sifirla\?alan=egitmen/u);
assert.match(authSource, /e-posta-dogrula\?token=/u);
assert.match(outboxSource, /requireApplicationOrigin/u);
assert.match(offerSource, /requireApplicationOrigin/u);
assert.match(candidateSource, /invitation_used_at is null/u);
assert.match(candidateSource, /invitation_expires_at>now\(\)/u);
assert.match(invitationAcceptSource, /used_at is null/u);
assert.match(invitationAcceptSource, /expires_at>now\(\)/u);
assert.match(betterAuthPasswordSource, /verification\.expiresAt < .*new Date/u);
assert.match(betterAuthVerificationSource, /JWTExpired/u);
const candidateApiSource = await readFile(new URL("../api/account-lifecycle.js", import.meta.url), "utf8");
const invitationSource = await readFile(new URL("../src/server/auth/invitations.js", import.meta.url), "utf8");
assert.match(candidateApiSource, /ogretmen-aday-aktivasyon\?token=/u);
assert.match(invitationSource, /requireApplicationOrigin/u);

const previewOrigin = resolveApplicationOrigin({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-r60-preview.vercel.app",
});
assert.equal(previewOrigin, "https://fixoku-site-r60-preview.vercel.app");
assert.equal(resolveApplicationOrigin({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-r60-preview.vercel.app",
  APP_ORIGIN: "https://fixoku.com",
}), null);
assert.equal(resolveApplicationOrigin({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-r60-preview.vercel.app",
}), "https://fixoku-site-r60-preview.vercel.app");
assert.equal(resolveApplicationOrigin({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-r60-preview.vercel.app",
  APP_ORIGIN: "https://staging.fixoku.com",
}), "https://staging.fixoku.com");
assert.deepEqual(resolveTrustedOrigins({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  VERCEL_URL: "fixoku-site-r60-preview.vercel.app",
  APP_ORIGIN: "https://staging.fixoku.com",
}), ["https://staging.fixoku.com", "https://fixoku-site-r60-preview.vercel.app"]);
for (const unsafe of [
  { VERCEL_ENV: "preview", VERCEL_URL: "https://random.example.test" },
  { VERCEL_ENV: "preview", VERCEL_URL: "http://fixoku-site-r60-preview.vercel.app" },
  { VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app:8443" },
  { VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app", APP_ORIGIN: "https://random.example.test" },
  { VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app", APP_ORIGIN: "https://fixoku.com" },
  { VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app", APP_ORIGIN: "https://user:pass@staging.fixoku.com" },
  { VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app", APP_ORIGIN: "http://10.0.0.4" },
  { VERCEL_ENV: "preview", APP_ORIGIN: "https://staging.fixoku.com", BETTER_AUTH_URL: "https://random.example.test" },
]) assert.equal(resolveApplicationOrigin(unsafe), null);
assert.throws(() => requireApplicationOrigin({ VERCEL_ENV: "preview", VERCEL_URL: "random.example.test" }), /PUBLIC_ORIGIN_NOT_CONFIGURED/u);

const tokenUrl = previewOrigin + "/api/auth/reset-password/one-time-token?callbackURL=%2Fsifre-sifirla";
const rendered = renderLifecycleEmail("reset", { url: tokenUrl, recipientName: "Yusuf Selek" }, { baseUrl: previewOrigin });
assert.equal(rendered.templateId, "password-reset");
assert.match(rendered.html, /Merhaba Yusuf Selek,/u);
assert.match(rendered.html, /one-time-token/u);
assert.match(rendered.text, /one-time-token/u);
assert.ok(!rendered.html.includes("Fixoku kullanıcısı"));
assert.match(rendered.html, /max-width:620px/u);
assert.match(rendered.html, /destek@fixoku\.com/u);
assert.throws(() => renderLifecycleEmail("reset", { url: "https://fixoku.com/sifre-sifirla?token=wrong-origin" }, { baseUrl: previewOrigin }), /LIFECYCLE_URL_ORIGIN_MISMATCH/u);

const verification = renderLifecycleEmail("verification", { url: previewOrigin + "/api/auth/verify-email?token=single-use" }, { baseUrl: previewOrigin });
assert.equal(verification.templateId, "email-verification");
assert.match(verification.html, /Merhaba,/u);
assert.ok(!verification.html.includes("Fixoku kullanıcısı"));
assert.match(verification.text, /single-use/u);

let sent;
await sendTransactionalEmail({
  kind: "reset",
  to: "yusuf@example.invalid",
  url: tokenUrl,
  recipientName: "Yusuf Selek",
  env: { EMAIL_PROVIDER: "TEST", SMTP_FROM: "bildirim@fixoku.com", VERCEL_ENV: "preview", VERCEL_URL: "fixoku-site-r60-preview.vercel.app" },
  transportFactory: () => ({ sendMail: async (message) => { sent = message; return { messageId: "r60-test" }; } }),
  logger: { info() {} },
});
assert.equal(sent.from, "bildirim@fixoku.com");
assert.equal(sent.replyTo, "destek@fixoku.com");
assert.match(sent.html, /Merhaba Yusuf Selek,/u);
assert.match(sent.text, /Yusuf Selek/u);
assert.ok(!sent.html.includes("Fixoku kullanıcısı"));
assert.equal(getSmtpConfig({ SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", SMTP_SECURE: "false" }).from, "bildirim@fixoku.com");

let deliveryAttempts = 0;
const outboxUpdates = [];
const missingNameClient = {
  query: async (sql, params) => {
    if (sql.startsWith("update notification_email_outbox set status='PROCESSING'")) {
      return { rows: outboxUpdates.length ? [] : [{
        id: "r60-missing-name",
        event_type: "PROFILE_COMPLETION",
        recipient_email: "missing-name@example.invalid",
        recipient_name: null,
        reference: "R60",
        body: "Gövde",
        attempt_count: 1,
      }] };
    }
    if (sql.startsWith("update notification_email_outbox set status=$1")) {
      outboxUpdates.push({ sql, params });
    }
    return { rows: [] };
  },
};
const missingNameResult = await processOutboxBatch({
  client: missingNameClient,
  env: { EMAIL_PROVIDER: "TEST" },
  transportFactory: () => ({ sendMail: async () => { deliveryAttempts += 1; return { messageId: "should-not-send" }; } }),
  logger: { error() {} },
});
assert.equal(missingNameResult.processed, 1);
assert.equal(deliveryAttempts, 0);
assert.equal(outboxUpdates[0]?.params?.[0], "FAILED");

console.log(JSON.stringify({
  PREVIEW_ORIGIN: "PASS",
  PREVIEW_CUSTOM_ORIGIN: "PASS",
  PREVIEW_FAIL_CLOSED: "PASS",
  DEEP_LINK_REWRITES: "PASS",
  AUTH_TOKEN_ROUTES: "PASS",
  RESET_TEMPLATE_SHARED: "PASS",
  VERIFICATION_TEMPLATE_SHARED: "PASS",
  REAL_NAME: "PASS",
  PLAIN_TEXT: "PASS",
  MOBILE_MARKUP: "PASS",
  SINGLE_USE_URL_PRESERVED: "PASS",
  LIFECYCLE_ORIGIN_BOUND: "PASS",
  SMTP_FROM: "PASS",
  REPLY_TO: "PASS",
  GENERIC_NAME_FALLBACK: "ABSENT",
  OUTBOX_MISSING_NAME_FAIL_CLOSED: "PASS",
  TOKEN_EXPIRY_SINGLE_USE_CONTRACT: "PASS",
}));
