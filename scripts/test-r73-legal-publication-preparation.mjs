import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const documents = JSON.parse(read("src/platform/admin/legal-owner-documents-v10.json"));
const sourceV02 = JSON.parse(read("src/platform/admin/legal-owner-documents-v3.json"));
const customer = documents.filter((document) => !document.internal);
const internal = documents.filter((document) => document.internal);
assert.equal(documents.length, 21, "LEGAL_V10_DOCUMENT_COUNT");
assert.equal(customer.length, 16, "LEGAL_V10_CUSTOMER_DOCUMENT_COUNT");
assert.equal(internal.length, 5, "LEGAL_V10_INTERNAL_DOCUMENT_COUNT");
assert.ok(customer.every((document) => document.sourceVersion === "1.0"), "LEGAL_V10_CUSTOMER_VERSION");
assert.ok(customer.every((document) => document.publicationStatus === "BLOCKED_P0"), "LEGAL_V10_CUSTOMER_GATE");
assert.ok(internal.every((document) => document.publicationStatus === "INTERNAL_ONLY"), "LEGAL_V10_INTERNAL_GATE");
assert.ok(customer.every((document) => document.markdown.includes("Mavi Yeşil Ajans Ersin USTA")), "SELLER_NAME_CONSISTENCY");
assert.ok(customer.every((document) => document.markdown.includes("Ege Vergi Dairesi")), "TAX_OFFICE_CONSISTENCY");
assert.ok(customer.every((document) => document.markdown.includes("https://fixoku.com")), "CANONICAL_DOMAIN_CONSISTENCY");
assert.ok(customer.every((document) => document.markdown.includes("2023 118161")), "TRADEMARK_CONSISTENCY");
assert.ok(customer.every((document) => document.markdown.includes("+90 232 462 07 43")), "PHONE_CONSISTENCY");
assert.ok(customer.every((document) => document.markdown.includes("destek@fixoku.com")), "SUPPORT_CONSISTENCY");
const forbiddenCustomerMarkers = /TASLAK|BEKLENİYOR|YAYIN DURUMU|DOĞRULANACAK|İÇ TASLAK|migration|repo\b|API\b|fixoku\.com\.tr/iu;
assert.ok(customer.every((document) => !forbiddenCustomerMarkers.test(document.markdown)), "CUSTOMER_INTERNAL_MARKER_LEAK");
for (const documentId of [2, 3, 4, 5, 7]) {
  const document = customer.find((item) => item.id === documentId);
  assert.ok(document.markdown.includes("PayTR") && document.markdown.includes("Havale/EFT/FAST"), `PAYMENT_MODEL:${documentId}`);
}
for (const documentId of [2, 4, 7, 8, 9, 11]) {
  const document = customer.find((item) => item.id === documentId);
  assert.match(document.markdown, /görüntülü ders(?:ler)? (?:kaydedilmez|kaydı tutulmaz)/iu, `NO_RECORDING_RULE:${documentId}`);
}
assert.ok(customer.some((document) => document.markdown.includes("ilk ders başlamadan") && document.markdown.includes("tam iade")), "TRAINER_REFUND_RULE");
assert.ok(customer.some((document) => document.markdown.includes("çocuk öğrenc") && document.markdown.includes("kanuni temsilci")), "CHILD_REPRESENTATIVE_RULE");
assert.ok(customer.some((document) => document.markdown.includes("Fiziksel kitap ve kargo satışı ilk ticari açılışta")), "PHYSICAL_OPENING_RULE");
assert.ok(customer.every((document) => Array.isArray(document.requiredEvidence) && document.requiredEvidence.length > 0), "P0_EVIDENCE_PER_DOCUMENT");
const v02ById = new Map(sourceV02.map((document) => [document.id, document]));
for (const document of customer) {
  const original = v02ById.get(document.id);
  assert.equal(document.derivedFromVersion, "0.2", `V02_SOURCE:${document.id}`);
  assert.equal(document.originalSha256, crypto.createHash("sha256").update(original.markdown, "utf8").digest("hex"), `V02_HASH:${document.id}`);
  assert.ok(document.contentSha256, `V10_HASH:${document.id}`);
}
const publicPages = read("src/data/legalPublicPages2026.js");
for (const document of internal) assert.doesNotMatch(publicPages, new RegExp(document.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"), `INTERNAL_PUBLIC_LEAK:${document.id}`);
const p0 = read("docs/legal/FIXOKU_R73_P0_Eksik_Bilgi_Raporu.md");
for (const document of customer) assert.match(p0, new RegExp(`\\b0?${document.id}\\b`), `P0_REPORT_MISSING:${document.id}`);
assert.match(p0, /vergi levhası/u);
assert.match(p0, /approved_by/u);
assert.match(p0, /0041 migration/u);
const diff = read("docs/legal/FIXOKU_R73_V02_V10_Diff.md");
assert.match(diff, /V0\.2 → V1\.0/u);
assert.match(diff, /fixoku\.com/u);
const readiness = read("docs/legal/FIXOKU_R73_OWNER_APPROVAL_READINESS.md");
assert.match(readiness, /READY_FOR_OWNER_REVIEW/u);
assert.match(readiness, /PUBLISHED değil/u);
assert.match(readiness, /Gerçek Owner oturumu/u);
const migration = read("drizzle/migrations/0041_owner_legal_vat_approval.sql");
assert.match(migration, /owner_legal_document_versions/u);
const commerce = read("src/server/domain/commerce.js");
assert.match(commerce, /LEGAL_SNAPSHOT_NOT_READY/u);
console.log(JSON.stringify({
  LEGAL_V10_PUBLIC_DOCUMENTS: "PASS",
  LEGAL_V10_INTERNAL_DOCUMENTS: "PASS",
  V02_TO_V10_DIFF: "PASS",
  MISSING_MANDATORY_SELLER_FIELDS: "P0_BLOCKED",
  OWNER_APPROVAL_READINESS: "READY_FOR_OWNER_REVIEW",
  PUBLICATION_GATES: "BLOCKED",
  STUDENT_TRAINER_LEGAL_COMPATIBILITY: "PASS_SOURCE_CONTRACT",
  P0_BLOCKERS: customer.length,
  DATABASE_MUTATION: "NONE",
  OWNER_APPROVAL: "NOT_RECORDED"
}));
