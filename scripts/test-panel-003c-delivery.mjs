import assert from "node:assert/strict";
import { getDigitalStorageConfig, resolvePrivateStoragePath } from "../src/server/domain/digital-delivery.js";
import { classifyEmailError, getSmtpConfig, processOutboxBatch } from "../src/server/domain/email-outbox.js";

assert.equal(resolvePrivateStoragePath("C:/private-files", "lesson.pdf"), "C:\\private-files\\lesson.pdf");
assert.equal(resolvePrivateStoragePath("C:/private-files", "../secret.txt"), null);
assert.equal(resolvePrivateStoragePath("C:/private-files", "/absolute.txt"), null);
assert.deepEqual(getDigitalStorageConfig({ DIGITAL_STORAGE_PROVIDER: "S3" }), { provider: "S3", enabled: false, reason: "S3_RUNTIME_NOT_CONFIGURED" });
assert.equal(getDigitalStorageConfig({ DIGITAL_STORAGE_PROVIDER: "LOCAL" }).enabled, false);
assert.equal(getSmtpConfig({ SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "no-reply@test", SMTP_SECURE: "false" }).transport.port, 587);
assert.equal(getSmtpConfig({ SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "bad\nheader", SMTP_SECURE: "false" }), null);
assert.deepEqual(classifyEmailError({ code: "ETIMEDOUT" }), { code: "ETIMEDOUT", retryable: true });
assert.deepEqual(classifyEmailError({ responseCode: 550 }), { code: "550", retryable: false });
const updates = [];
let claimCount = 0;
const client = { query: async (sql) => {
  if (sql.startsWith("update notification_email_outbox set status='PROCESSING'")) {
    if (claimCount++) return { rows: [] };
    return { rows: [{ id: "mail-1", recipient_email: "test@example.test", subject: "Konu", body: "Gövde", attempt_count: 1 }] };
  }
  updates.push(sql);
  return { rows: [] };
} };
const workerResult = await processOutboxBatch({ client, env: { SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "no-reply@test", SMTP_SECURE: "false" }, transportFactory: () => ({ sendMail: async () => ({ messageId: "provider-1" }) }) });
assert.equal(workerResult.processed, 1);
assert.ok(updates.some((sql) => sql.includes("status='SENT'")));
console.log("Panel 003C delivery contract tests passed: private path, storage fail-closed, SMTP validation, retry classification.");
