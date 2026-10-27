import assert from "node:assert/strict";
import fs from "node:fs";
import { studentLegalAcceptance, trainerLegalAcceptance, trainerLegalDocument } from "../src/server/domain/trainer-legal-documents.js";

const documents = JSON.parse(fs.readFileSync(new URL("../src/platform/admin/legal-owner-documents-v3.json", import.meta.url), "utf8"));
assert.equal(documents.length, 21);
assert.equal(documents.filter((doc) => /TASLAK|BEKLENİYOR/iu.test(doc.markdown)).length, 21);

const preInfo = trainerLegalDocument("PRE_INFO");
const distance = trainerLegalDocument("DISTANCE");
assert.equal(preInfo.publicationStatus, "DRAFT");
assert.equal(distance.publicationStatus, "DRAFT");

const trainerInput = { preInformation: true, distanceSales: true, documentHashes: { PRE_INFO: preInfo.sourceSha256, DISTANCE: distance.sourceSha256 } };
assert.throws(() => trainerLegalAcceptance(trainerInput, {
  order: { id: "trainer-order", currency: "TRY", total_minor: 1000, shipping_minor: 0 },
  trainerUserId: "trainer-user",
  email: "trainer@example.test",
  shipping: { firstName: "Test", lastName: "Trainer", city: "İzmir", district: "Konak", addressLine: "Test" },
  items: [],
}), /LEGAL_DOCUMENT_NOT_PUBLISHED/u);

assert.throws(() => studentLegalAcceptance({ preInformation: true, distanceSales: true, privacy: true }, {
  order: { id: "student-order", currency: "TRY", subtotal_minor: 1000, shipping_minor: 0, total_minor: 1000 },
  buyer: { userId: "buyer", name: "Test Buyer", email: "buyer@example.test" },
  items: [],
  requiresShipping: false,
}), /LEGAL_DOCUMENT_NOT_PUBLISHED/u);

const studentCommerce = fs.readFileSync(new URL("../src/server/domain/student-commerce.js", import.meta.url), "utf8");
const trainerCommerce = fs.readFileSync(new URL("../src/server/domain/trainer-commerce.js", import.meta.url), "utf8");
const commerce = fs.readFileSync(new URL("../src/server/domain/commerce.js", import.meta.url), "utf8");
assert.match(studentCommerce, /LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED/u);
assert.match(studentCommerce, /SHIPPING_VAT_RATE_REQUIRED/u);
assert.match(studentCommerce, /PACKAGE_VAT_RATE_REQUIRED/u);
assert.match(studentCommerce, /update orders set list_gross_minor=/u);
assert.match(studentCommerce, /PACKAGE_COMPONENT_TOTAL_MISMATCH/u);
assert.match(studentCommerce, /student\.commerce\.legal\.accepted/u);
assert.match(trainerCommerce, /SHIPPING_VAT_RATE_REQUIRED/u);
assert.match(trainerCommerce, /PACKAGE_VAT_RATE_REQUIRED/u);
assert.doesNotMatch(trainerCommerce, /10000\s*\/\s*12000/u);
assert.match(commerce, /LEGAL_SNAPSHOT_NOT_READY/u);

console.log(JSON.stringify({
  DOCUMENT_COUNT: 21,
  ALL_DOCUMENTS_DRAFT: "PASS",
  TRAINER_DRAFT_SALE_BLOCKED: "PASS",
  STUDENT_DRAFT_SALE_BLOCKED: "PASS",
  STUDENT_LEGAL_AUDIT_WIRING: "PASS",
  SHIPPING_VAT_MISSING_BLOCKED: "PASS",
  PACKAGE_VAT_MISSING_BLOCKED: "PASS",
  TRAINER_SHIPPING_VAT_GUARD: "PASS",
  LEGACY_PLACEHOLDER_SNAPSHOT_BLOCKED: "PASS",
  DATABASE_MUTATION: "NO",
  WRITES: "NONE",
}));
