import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSignedReadUrl, fetchPrivateObject, getDigitalStorageConfig, productionPrivateMediaAvailable, resolvePrivateStoragePath } from "../src/server/domain/digital-delivery.js";
import { getSmtpConfig, sendTransactionalEmail } from "../src/server/domain/email-outbox.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const secret = "r75-test-secret-never-log";
const resendEnv = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  EMAIL_PROVIDER: "SMTP",
  SMTP_HOST: "smtp.resend.com",
  SMTP_PORT: "465",
  SMTP_SECURE: "true",
  SMTP_USER: "resend",
  SMTP_PASS: secret,
  MAIL_FROM: "bildirim@fixoku.com",
  APP_ORIGIN: "https://fixoku.com",
  BETTER_AUTH_URL: "https://fixoku.com",
};
const smtp = getSmtpConfig(resendEnv);
assert.equal(smtp.provider, "SMTP");
assert.equal(smtp.transport.host, "smtp.resend.com");
assert.equal(smtp.transport.auth.user, "resend");
assert.equal(smtp.transport.auth.pass, secret);
let delivered;
let logs = "";
await sendTransactionalEmail({
  kind: "verification",
  to: "student@example.test",
  url: "https://fixoku.com/e-posta-dogrula?token=test-token",
  env: resendEnv,
  transportFactory: () => ({ sendMail: async (message) => { delivered = message; return { messageId: "r75-local" }; } }),
  logger: { info: (...args) => { logs += JSON.stringify(args); } },
});
assert.equal(delivered.from, "bildirim@fixoku.com");
assert.ok(!logs.includes(secret));
assert.ok(!logs.includes("student@example.test"));

const r2 = getDigitalStorageConfig({
  NODE_ENV: "production",
  DIGITAL_STORAGE_PROVIDER: "R2",
  S3_ENDPOINT: "https://1234567890abcdef.r2.cloudflarestorage.com",
  S3_REGION: "auto",
  S3_BUCKET: "fixoku-private-media",
  S3_ACCESS_KEY_ID: "r75-access",
  S3_SECRET_ACCESS_KEY: secret,
  DIGITAL_STORAGE_SIGNED_URL_TTL_SECONDS: "300",
});
assert.equal(r2.enabled, true);
assert.equal(productionPrivateMediaAvailable({ NODE_ENV: "production", DIGITAL_STORAGE_PROVIDER: "R2", S3_ENDPOINT: "https://1234567890abcdef.r2.cloudflarestorage.com", S3_REGION: "auto", S3_BUCKET: "fixoku-private-media", S3_ACCESS_KEY_ID: "r75-access", S3_SECRET_ACCESS_KEY: secret }), true);
const signed = createSignedReadUrl(r2, "trainer-curriculum/demo/lesson.mp4", { now: new Date("2026-10-20T10:00:00.000Z") });
assert.match(signed, /X-Amz-Algorithm=AWS4-HMAC-SHA256/u);
assert.match(signed, /X-Amz-Expires=300/u);
assert.ok(!signed.includes(secret));
assert.equal(resolvePrivateStoragePath("C:/private", "../secret"), null);
assert.throws(() => createSignedReadUrl(r2, "../secret"), /PRIVATE_STORAGE_KEY_INVALID/u);
assert.equal(getDigitalStorageConfig({ NODE_ENV: "production", DIGITAL_STORAGE_PROVIDER: "R2", S3_BUCKET: "fixoku-private-media", S3_REGION: "auto", S3_ACCESS_KEY_ID: "x", S3_SECRET_ACCESS_KEY: secret }).reason, "S3_RUNTIME_NOT_CONFIGURED");

const originalFetch = globalThis.fetch;
let fetched;
globalThis.fetch = async (url, options) => { fetched = { url: String(url), options }; return new Response(null, { status: 200 }); };
try {
  const response = await fetchPrivateObject(r2, "trainer-curriculum/demo/manifest.json", { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.equal(fetched.options.method, "HEAD");
  assert.ok(!fetched.url.includes(secret));
} finally {
  globalThis.fetch = originalFetch;
}

const downloads = read("api/student/downloads/[id].js");
const outbox = read("src/server/domain/email-outbox.js");
const trainerVideo = read("api/trainer/video-media.js");
const trainerCurriculum = read("api/trainer/curriculum-media.js");
const shared = read("src/server/domain/trainer-shared-presentations.js");
for (const source of [downloads, trainerVideo, trainerCurriculum, shared]) {
  assert.match(source, /productionPrivateMediaAvailable|resolveBeneficiary|trainer_package_entitlements|e\.status='ACTIVE'/u);
  assert.match(source, /createSignedReadUrl|fetchPrivateObject/u);
}
assert.match(downloads, /beneficiary_child_profile_id/u);
assert.match(downloads, /\$3::uuid is null and oi\.beneficiary_child_profile_id is null/u);
assert.match(downloads, /de\.revoked_at is null/u);
assert.match(downloads, /de\.expires_at is null or de\.expires_at>now\(\)/u);
assert.match(downloads, /package_entitlements pe where pe\.source_order_item_id=de\.source_order_item_id/u);
assert.match(downloads, /pe\.status='ACTIVE'/u);
assert.match(outbox, /messageId: `<fixoku-outbox-/u);
assert.match(trainerVideo, /e\.status='ACTIVE'/u);
assert.match(trainerCurriculum, /e\.status = 'ACTIVE'/u);
assert.match(shared, /membership\.status === "ACTIVE"/u);
assert.match(shared, /membership\.scopeType === "TRAINER"/u);

console.log(JSON.stringify({
  RESEND_SMTP_COMPATIBILITY: "PASS",
  EMAIL_SECRET_LOGGING: "PASS",
  R2_S3_COMPATIBLE_SIGNING: "PASS",
  R2_SIGNED_URL_TTL: 300,
  R2_SECRET_EXPOSURE: "ABSENT",
  R2_TRAVERSAL_GUARD: "PASS",
  STUDENT_ACTIVE_ENTITLEMENT_SCOPE: "PASS_SOURCE_CONTRACT",
  CHILD_SCOPE_GUARD: "PASS_SOURCE_CONTRACT",
  TRAINER_ACTIVE_ENTITLEMENT_SCOPE: "PASS_SOURCE_CONTRACT",
  PUBLIC_PERMANENT_MEDIA_URLS: "ABSENT",
  REAL_PROVIDER_IO: "NOT_RUN",
  DATABASE_MUTATION: "NONE",
}));
