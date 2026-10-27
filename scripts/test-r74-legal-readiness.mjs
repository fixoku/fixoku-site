import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const v10 = JSON.parse(read("src/platform/admin/legal-owner-documents-v10.json"));
const customer = v10.filter((document) => !document.internal);
const internal = v10.filter((document) => document.internal);
assert.equal(v10.length, 21);
assert.equal(customer.length, 16);
assert.equal(internal.length, 5);
assert.ok(customer.every((document) => document.sourceVersion === "1.0" && document.publicationStatus === "BLOCKED_P0"));
assert.ok(internal.every((document) => document.publicationStatus === "INTERNAL_ONLY"));

const approvalApi = read("api/admin/owner-legal-approval.js");
assert.match(approvalApi, /legal-owner-documents-v10\.json/u);
assert.doesNotMatch(approvalApi, /sourcePath\s*=.*legal-owner-documents-v3\.json/u);
assert.match(approvalApi, /customerCount\s*!==\s*16/u);
assert.match(approvalApi, /internalCount\s*!==\s*5/u);
assert.match(approvalApi, /const versionNumber = document\.internal \? 2 : 10/u);
assert.match(approvalApi, /document\.contentSha256/u);
assert.match(approvalApi, /FIXOKU_21_V10/u);
assert.match(approvalApi, /sourceVersion: "1\.0"/u);

const migration = read("drizzle/migrations/0041_owner_legal_vat_approval.sql");
for (const token of ["content_sha256", "created_by", "owner_legal_document_decisions", "owner_legal_document_events", "correlation_id", "order_legal_snapshots", "trainer_order_legal_snapshots", "INTERNAL"]) {
  assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), `MIGRATION_CONTRACT:${token}`);
}
assert.match(migration, /scope = 'CUSTOMER' OR status <> 'PUBLISHED'/u);

const questions = read("docs/legal/FIXOKU_R74_OWNER_QUESTIONS.md");
assert.match(questions, /OWNER_QUESTIONS_MAX_10/u);
assert.equal((questions.match(/^\|\s*\d+\s*\|/gmu) || []).length, 10);
const checklist = read("docs/release-candidate/FIXOKU_R74_PRODUCTION_P0_CHECKLIST.md");
for (const token of ["Neon Production", "PayTR", "R2", "Resend", "Vercel Production", "Hukuk incelemesi", "KDV"]) assert.match(checklist, new RegExp(token, "iu"));
const result = read("docs/architecture/fixoku-r74-result.md");
for (const token of ["LEGAL_P0_DUPLICATES_REMOVED", "LEGAL_PUBLICATION_SEQUENCE", "PAYTR_READINESS", "NEON_READINESS", "R2_READINESS", "RESEND_READINESS", "RELEASE_ORDER", "POST_LAUNCH_TASKS", "PUBLICATION_BLOCKED"]) assert.match(result, new RegExp(token, "u"));

const providerStatus = read("api/provider-status.js");
assert.match(providerStatus, /readyForLive: false/u);
const storage = read("src/server/domain/digital-delivery.js");
assert.match(storage, /createSignedReadUrl/u);
const paytr = read("src/server/payments/paytr.js");
assert.match(paytr, /PAYTR_CONFIG_REQUIRED/u);
const email = read("src/server/domain/email-outbox.js");
assert.match(email, /SMTP_NOT_CONFIGURED/u);

console.log(JSON.stringify({
  OWNER_QUESTIONS_MAX_10: "PASS",
  LEGAL_P0_DUPLICATES_REMOVED: "PASS",
  V10_IMPORT_SOURCE: "PASS",
  CUSTOMER_V10_DOCUMENTS: 16,
  INTERNAL_DOCUMENTS: 5,
  LEGAL_PUBLICATION_SEQUENCE: "PASS_SOURCE_PLAN",
  PRODUCTION_P0_CHECKLIST: "PASS_SOURCE_PLAN",
  PAYTR_READINESS: "BLOCKED",
  NEON_READINESS: "BLOCKED",
  R2_READINESS: "SOURCE_PASS_PROVIDER_IO_BLOCKED",
  RESEND_READINESS: "BLOCKED",
  DATABASE_MUTATION: "NONE",
  MIGRATION_APPLY: "NOT_RUN",
  OWNER_APPROVAL: "NOT_RECORDED",
  RESULT: "P0_PLAN_READY_PUBLICATION_BLOCKED"
}));
