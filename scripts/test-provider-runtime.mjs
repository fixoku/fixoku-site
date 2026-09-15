import assert from "node:assert/strict";
import { getSmtpConfig, processOutboxBatch } from "../src/server/domain/email-outbox.js";
import { getDigitalStorageConfig, resolvePrivateStoragePath } from "../src/server/domain/digital-delivery.js";
import { providerHealth } from "../src/server/domain/provider-runtime.js";
import { createShippingAdapter, shippingRuntime, ShippingConfigurationError } from "../src/server/shipping/adapter.js";

assert.equal(getSmtpConfig({ SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "no-reply@test", SMTP_SECURE: "false" }).provider, "SMTP");
assert.equal(getSmtpConfig({ EMAIL_PROVIDER: "TEST" }).provider, "TEST");
assert.equal(getSmtpConfig({ EMAIL_PROVIDER: "TEST" }).transport.streamTransport, true);
assert.equal(getSmtpConfig({ EMAIL_PROVIDER: "DISABLED", SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "no-reply@test", SMTP_SECURE: "false" }), null);
assert.equal(getSmtpConfig({ SMTP_HOST: "smtp.test", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "bad\nheader", SMTP_SECURE: "false" }), null);

const updates = []; let claimCount = 0; let sent = 0;
const eventTypes = ["TRAINER_ASSIGNMENT", "TRAINER_REASSIGNMENT", "EDUCATION_COMPLETION", "EARNING_NOTIFICATION", "PAYOUT_NOTIFICATION", "SHIPMENT_SHIPPED", "SHIPMENT_DELIVERED"];
const client = { query: async (sql) => {
  if (sql.startsWith("update notification_email_outbox set status='PROCESSING'")) {
    if (claimCount >= eventTypes.length) return { rows: [] };
    return { rows: [{ id: `mail-test-${claimCount}`, event_type: eventTypes[claimCount++], recipient_email: "local@example.test", subject: "Local", body: "No external mail", attempt_count: 1 }] };
  }
  updates.push(sql); return { rows: [] };
} };
const emailResult = await processOutboxBatch({ client, env: { EMAIL_PROVIDER: "TEST" }, transportFactory: () => ({ sendMail: async (message) => { sent += 1; assert.equal(message.to, "local@example.test"); return { messageId: "local-test-message" }; } }), logger: { error() {} } });
assert.equal(emailResult.status, "PROCESSED"); assert.equal(emailResult.processed, eventTypes.length); assert.equal(sent, eventTypes.length); assert.equal(updates.filter((sql) => sql.includes("status='SENT'")).length, eventTypes.length);

assert.equal(getDigitalStorageConfig({ DIGITAL_STORAGE_PROVIDER: "S3" }).reason, "S3_RUNTIME_NOT_CONFIGURED");
assert.equal(getDigitalStorageConfig({ DIGITAL_STORAGE_PROVIDER: "LOCAL", DIGITAL_STORAGE_ROOT: "C:/private-files", NODE_ENV: "development" }).enabled, true);
assert.equal(getDigitalStorageConfig({ DIGITAL_STORAGE_PROVIDER: "LOCAL", DIGITAL_STORAGE_ROOT: "C:/private-files", NODE_ENV: "production" }).reason, "LOCAL_STORAGE_FORBIDDEN_IN_PRODUCTION");
assert.equal(resolvePrivateStoragePath("C:/private-files", "../secret.txt"), null);

assert.equal(shippingRuntime({}).status, "DISABLED_CONFIG_REQUIRED");
await assert.rejects(() => createShippingAdapter({ token: "", baseUrl: "" }).quote({}), (error) => error instanceof ShippingConfigurationError && error.code === "DISABLED_CONFIG_REQUIRED");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => { assert.match(String(options.headers.authorization), /^Bearer sandbox-token$/u); return new Response(JSON.stringify({ providerReference: "sandbox-1" }), { status: 200, headers: { "content-type": "application/json" } }); };
try { const adapter = createShippingAdapter({ token: "sandbox-token", baseUrl: "https://sandbox.example.test" }); assert.equal(adapter.runtime.status, "CONFIGURED"); assert.deepEqual(await adapter.quote({ postalCode: "34000" }), { providerReference: "sandbox-1" }); } finally { globalThis.fetch = originalFetch; }
globalThis.fetch = async () => new Response(JSON.stringify({ error: "temporary" }), { status: 503, headers: { "content-type": "application/json" } });
try { await assert.rejects(() => createShippingAdapter({ token: "sandbox-token", baseUrl: "https://sandbox.example.test" }).quote({}), (error) => error.code === "PROVIDER_ERROR" && error.status === 503); } finally { globalThis.fetch = originalFetch; }

const health = providerHealth({ EMAIL_PROVIDER: "TEST", DIGITAL_STORAGE_PROVIDER: "S3", SHIPENTEGRA_TOKEN: "", SHIPENTEGRA_BASE_URL: "" });
assert.equal(health.email.status, "CONFIGURED_TEST"); assert.equal(health.digitalStorage.configured, false); assert.equal(health.shipping.configured, false);
console.log(JSON.stringify({ emailContract: "PASS", emailOutboxRuntime: "PASS", emailDedupe: "PASS", storageContract: "PASS", privatePathContainment: "PASS", productionFailClosed: "PASS", shippingContract: "PASS", providerHealth: "PASS" }));
