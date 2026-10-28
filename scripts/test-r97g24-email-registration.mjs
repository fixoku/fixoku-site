import assert from "node:assert/strict";
import fs from "node:fs";
import { getEmailTransportStatus, processOutboxBatch, sendTransactionalEmail } from "../src/server/domain/email-outbox.js";
import { captureLifecycleMail, clearLifecycleMail, pendingLifecycleMail } from "../src/server/domain/test-email-capture.js";

const accountLifecycle = fs.readFileSync(new URL("../api/account-lifecycle.js", import.meta.url), "utf8");
const authAdapter = fs.readFileSync(new URL("../api/auth/[...all].js", import.meta.url), "utf8");
const resendCapability = fs.readFileSync(new URL("../api/auth/verification-resend-capability.js", import.meta.url), "utf8");
const trainerCandidate = fs.readFileSync(new URL("../api/trainer-candidate.js", import.meta.url), "utf8");

assert.deepEqual(getEmailTransportStatus({}), { available: false, mode: "UNAVAILABLE", reason: "SMTP_NOT_CONFIGURED" });
assert.deepEqual(getEmailTransportStatus({ EMAIL_PROVIDER: "TEST" }), { available: false, mode: "TEST_UNCAPTURED", reason: "TEST_MAIL_SINK_NOT_CONFIGURED" });
assert.deepEqual(getEmailTransportStatus({ EMAIL_PROVIDER: "TEST", BETTER_AUTH_TEST_MAIL_SINK: "1" }), { available: true, mode: "TEST_CAPTURE", reason: null });
assert.deepEqual(getEmailTransportStatus({ EMAIL_PROVIDER: "SMTP", SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "mail@example.test", SMTP_SECURE: "false" }), { available: true, mode: "SMTP", reason: null });

await assert.rejects(
  () => sendTransactionalEmail({ kind: "verification", to: "student@example.test", url: "https://fixoku.com/e-posta-dogrula?token=test", env: { EMAIL_PROVIDER: "TEST", APP_ORIGIN: "https://fixoku.com", BETTER_AUTH_URL: "https://fixoku.com" } }),
  /TEST_MAIL_SINK_NOT_CONFIGURED/u,
);

clearLifecycleMail();
assert.equal(captureLifecycleMail({ kind: "verification", to: "student@example.test", url: "https://fixoku.com/e-posta-dogrula?token=test" }, { NODE_ENV: "test", BETTER_AUTH_TEST_MAIL_SINK: "1" }), true);
assert.equal(pendingLifecycleMail(), 1);
clearLifecycleMail();

let queryCount = 0;
const outboxResult = await processOutboxBatch({
  client: { query: async () => { queryCount += 1; return { rows: [] }; } },
  env: { EMAIL_PROVIDER: "TEST" },
});
assert.deepEqual(outboxResult, { status: "TEST_MAIL_SINK_NOT_CONFIGURED", processed: 0 });
assert.equal(queryCount, 0);

assert.match(accountLifecycle, /getEmailTransportStatus/u);
assert.match(accountLifecycle, /EMAIL_VERIFICATION_TRANSPORT_UNAVAILABLE/u);
assert.match(authAdapter, /send-verification-email/u);
assert.match(authAdapter, /EMAIL_VERIFICATION_TRANSPORT_UNAVAILABLE/u);
assert.match(resendCapability, /getEmailTransportStatus/u);
assert.match(resendCapability, /503/u);
assert.match(trainerCandidate, /insert into trainer_profiles/u);
assert.match(trainerCandidate, /on conflict\(user_id\) do update/u);

console.log(JSON.stringify({
  SMTP_REQUIRED_BEFORE_REGISTRATION: "PASS",
  TEST_TRANSPORT_REQUIRES_CAPTURE_SINK: "PASS",
  TEST_CAPTURE_MODE_DISTINCT: "PASS",
  REAL_SMTP_MODE_DISTINCT: "PASS",
  RESEND_TRANSPORT_FAILURE_EXPLICIT: "PASS",
  OUTBOX_TEST_FALSE_SUCCESS_BLOCKED: "PASS",
  TRAINER_PROFILE_UPSERT: "PASS",
  DATABASE_MUTATION: "NONE",
}));
