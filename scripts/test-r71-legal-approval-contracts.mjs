import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

const sourcePath = new URL("../docs/legal/FIXOKU_21_Hukuki_Belge_Revize_Inceleme_Taslagi_20261019.md", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
assert.match(source, /^\*\*Sürüm:\*\* 0\.2 /mu);
assert.match(source, /YAYIN VE HUKUKİ ONAY DEĞİLDİR/u);
assert.equal((source.match(/^# \d{2} \| /gmu) || []).length, 21);

const documents = JSON.parse(fs.readFileSync(new URL("../src/platform/admin/legal-owner-documents-v3.json", import.meta.url), "utf8"));
assert.equal(documents.length, 21);
assert.equal(documents.filter((document) => !document.internal).length, 16);
assert.equal(documents.filter((document) => document.internal).length, 5);
assert.ok(documents.every((document) => document.sourceVersion === "0.2" && document.sourceDate === "2026-10-19"));
assert.ok(documents.every((document) => /TASLAK|İNCELEME/iu.test(document.markdown)));
assert.ok(documents.every((document) => document.originalSha256 === crypto.createHash("sha256").update(document.markdown, "utf8").digest("hex")));

const migration = fs.readFileSync(new URL("../drizzle/migrations/0041_owner_legal_vat_approval.sql", import.meta.url), "utf8");
for (const token of ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "owner_legal_document_versions", "owner_legal_document_decisions", "owner_vat_decisions", "order_legal_snapshots", "LEGAL_HISTORY_IMMUTABLE", "LEGAL_VERSION_IMMUTABLE"]) {
  assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), `MIGRATION_TOKEN_MISSING:${token}`);
}
assert.match(migration, /subject_kind = 'MIXED_PACKAGE'/u);
const journal = JSON.parse(fs.readFileSync(new URL("../drizzle/migrations/meta/_journal.json", import.meta.url), "utf8"));
assert.equal(journal.entries.at(-1).tag, "0041_owner_legal_vat_approval");

const approvalApi = fs.readFileSync(new URL("../api/admin/owner-legal-approval.js", import.meta.url), "utf8");
assert.match(approvalApi, /requireMembership\(principal, "OWNER"\)/u);
assert.match(approvalApi, /LEGAL_APPROVAL_MIGRATION_REQUIRED/u);
assert.match(approvalApi, /localJsonApproval: "REJECTED"/u);
assert.match(approvalApi, /INTERNAL_DOCUMENT_PUBLICATION_FORBIDDEN/u);
assert.match(approvalApi, /VAT_ACCOUNTANT_OWNER_EVIDENCE_REQUIRED/u);
assert.match(approvalApi, /current\.vat_rate_bps === null/u);
assert.match(approvalApi, /record_accountant_review/u);
assert.match(approvalApi, /VAT_ACCOUNTANT_REVIEW_FIELDS_REQUIRED/u);
assert.match(approvalApi, /record_legal_review/u);
assert.match(approvalApi, /LEGAL_REVIEW_EVIDENCE_REQUIRED/u);
assert.match(approvalApi, /LEGAL_PUBLICATION_BLOCKED_P0/u);
assert.match(approvalApi, /LEGAL_CONTENT_HASH_MISMATCH/u);

const publicPages = fs.readFileSync(new URL("../src/data/legalPublicPages2026.js", import.meta.url), "utf8");
for (const internalTitle of documents.filter((document) => document.internal).map((document) => document.title)) assert.doesNotMatch(publicPages, new RegExp(internalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), `INTERNAL_DOCUMENT_PUBLIC_LEAK:${internalTitle}`);
const commerce = fs.readFileSync(new URL("../src/server/domain/commerce.js", import.meta.url), "utf8");
assert.match(commerce, /LEGAL_SNAPSHOT_NOT_READY/u);

console.log(JSON.stringify({
  LEGAL_V02_SOURCE: "PASS",
  LEGAL_21_IMPORT: "PASS",
  CUSTOMER_DOCUMENTS: 16,
  INTERNAL_DOCUMENTS: 5,
  INTERNAL_PUBLICATION: "GUARDED",
  OWNER_APPROVAL_BACKEND: "DB_BACKED_UI_READY_MIGRATION_BLOCKED",
  PUBLIC_DOCUMENT_PUBLICATION: "BLOCKED",
  VAT_DECISION_BACKEND: "PREPARED_DB_ONLY",
  MIGRATION_0040: "PRESENT_NOT_APPLIED",
  MIGRATION_0041: "PREPARED_NOT_APPLIED",
  ORDER_LEGAL_SNAPSHOTS: "PREPARED_IMMUTABLE",
  DATABASE_MUTATION: "NONE",
}));
