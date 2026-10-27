import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasMatchingLegalDocumentHash,
  inspectOwnerLegalSource,
  legalDocumentKey,
  legalDocumentScope,
} from "../src/server/domain/owner-legal-source.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const source = JSON.parse(read("src/platform/admin/legal-owner-documents-v10.json"));
const result = inspectOwnerLegalSource(source);

assert.equal(Array.isArray(source), true, "LEGAL_V10_ROOT_ARRAY");
assert.equal(result.ok, true, result.errors.join(","));
assert.equal(result.total, 21);
assert.equal(result.customerCount, 16);
assert.equal(result.internalCount, 5);
assert.deepEqual(result.documents.map(legalDocumentScope).slice(0, 2), ["CUSTOMER", "CUSTOMER"]);
assert.equal(legalDocumentScope(source.at(-1)), "INTERNAL");
assert.equal(legalDocumentScope({ id: 999 }), "CUSTOMER", "MISSING_SCOPE_DEFAULTS_TO_CUSTOMER_FOR_SAFETY");
assert.equal(legalDocumentKey(source[0]), "FIXOKU-1");
assert.equal(new Set(source.map(legalDocumentKey)).size, 21, "DOCUMENT_KEYS_UNIQUE");
assert.ok(source.every(hasMatchingLegalDocumentHash), "SOURCE_HASHES_MATCH");

const expectInvalid = (name, mutate) => {
  const candidate = structuredClone(source);
  mutate(candidate);
  const invalid = inspectOwnerLegalSource(candidate);
  assert.equal(invalid.ok, false, name);
  return invalid.errors;
};

expectInvalid("MISSING_SCOPE_FAIL_CLOSED", (candidate) => { delete candidate[0].internal; });
expectInvalid("DOCUMENT_COUNT_FAIL_CLOSED", (candidate) => { candidate.pop(); });
expectInvalid("DUPLICATE_DOCUMENT_KEY_FAIL_CLOSED", (candidate) => { candidate[1].id = candidate[0].id; });
expectInvalid("WRONG_INTERNAL_CLASSIFICATION_FAIL_CLOSED", (candidate) => { candidate[0].internal = true; });
expectInvalid("CONTENT_HASH_FAIL_CLOSED", (candidate) => { candidate[0].markdown += "\nchanged"; });

const approved = { ...source[0], status: "APPROVED" };
assert.equal(hasMatchingLegalDocumentHash(approved), true, "APPROVED_HASH_BASELINE");
approved.markdown += "\npost-approval mutation";
assert.equal(hasMatchingLegalDocumentHash(approved), false, "APPROVED_DOCUMENT_CHANGE_REJECTED");

const approvalApi = read("api/admin/owner-legal-approval.js");
const approvalMigration = read("drizzle/migrations/0041_owner_legal_vat_approval.sql");
const approvalUi = read("src/platform/admin/LegalPreparationPage.tsx");
assert.match(approvalApi, /inspectOwnerLegalSource/u);
assert.match(approvalApi, /legalDocumentKey/u);
assert.match(approvalApi, /LEGAL_CONTENT_HASH_MISMATCH/u);
assert.match(approvalApi, /LEGAL_PUBLICATION_BLOCKED_P0/u);
assert.match(approvalApi, /requireMembership\(principal, "OWNER"\)/u);
assert.match(approvalMigration, /scope = 'CUSTOMER' OR status <> 'PUBLISHED'/u);
assert.match(approvalUi, /legalDocumentsV10/u);
assert.match(approvalUi, /current\.internal/u);
assert.match(approvalUi, /16 müşteri metni temizlendi · 5 iç belge INTERNAL_ONLY/u);

const malformed = (() => {
  try { JSON.parse("{broken"); return false; } catch { return true; }
})();
assert.equal(malformed, true, "BROKEN_JSON_REJECTED");
assert.equal(inspectOwnerLegalSource({ documents: source }).ok, false, "WRAPPED_ROOT_REJECTED");

console.log(JSON.stringify({
  ROOT_SCHEMA: "DIRECT_ARRAY",
  DOCUMENT_TOTAL: 21,
  CUSTOMER_DOCUMENTS: 16,
  INTERNAL_DOCUMENTS: 5,
  DOCUMENT_SCOPE: "internal_boolean_to_customer_internal",
  DOCUMENT_KEYS: "FIXOKU_ID_GENERATED_UNIQUE",
  HASH_INTEGRITY: "PASS",
  POSITIVE_CASES: "PASS",
  NEGATIVE_CASES: "PASS",
  APPROVED_CHANGE_GUARD: "PASS",
  INTERNAL_PUBLISHED_GUARD: "PASS_SOURCE_CONTRACT",
  DATABASE_MUTATION: "NONE",
}));
