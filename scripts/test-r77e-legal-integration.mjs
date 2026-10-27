import assert from "node:assert/strict";
import fs from "node:fs";
import { inspectOwnerLegalSource, hasMatchingLegalDocumentHash, legalDocumentScope } from "../src/server/domain/owner-legal-source.js";
import { CUSTOMER_LEGAL_DOCUMENT_INTEGRATION, INTERNAL_LEGAL_DOCUMENT_INTEGRATION, PUBLIC_LEGAL_DOCUMENT_BY_ROUTE, inspectLegalDocumentIntegration } from "../src/platform/admin/legal-document-integration-v10.js";
import { publicLegalDocument } from "../src/server/domain/trainer-legal-documents.js";
import { renderTrainerLegalPreview } from "../src/server/domain/trainer-legal-preview.js";

const source = JSON.parse(fs.readFileSync(new URL("../src/platform/admin/legal-owner-documents-v10.json", import.meta.url), "utf8"));
const publicSubset = JSON.parse(fs.readFileSync(new URL("../src/platform/admin/legal-owner-documents-v10-customer.json", import.meta.url), "utf8"));
const sourceInspection = inspectOwnerLegalSource(source);
const integration = inspectLegalDocumentIntegration(source);
assert.equal(sourceInspection.ok, true, sourceInspection.errors.join(","));
assert.equal(integration.ok, true, integration.errors.join(","));
assert.equal(CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.length, 16);
assert.equal(INTERNAL_LEGAL_DOCUMENT_INTEGRATION.length, 5);
assert.equal(publicSubset.length, 16);
assert.equal(publicSubset.some((document) => document.internal === true), false, "INTERNAL_DOCUMENTS_ABSENT_FROM_PUBLIC_BUNDLE_SOURCE");
assert.equal(Object.keys(PUBLIC_LEGAL_DOCUMENT_BY_ROUTE).length, 18, "16_CUSTOMER_ROUTES_WITH_TWO_SAFE_ALIASES");
assert.equal(source.filter((document) => legalDocumentScope(document) === "INTERNAL").every((document) => !PUBLIC_LEGAL_DOCUMENT_BY_ROUTE[`/document-${document.id}`]), true);
assert.ok(source.every(hasMatchingLegalDocumentHash), "V10_HASHES_MATCH");

for (const code of ["SELLER", "PRE_INFO", "DISTANCE", "WITHDRAWAL", "DELIVERY", "DIGITAL", "MEMBERSHIP", "TERMS", "KVKK", "PRIVACY", "TRAINER_KVKK"]) {
  const document = publicLegalDocument(code);
  assert.equal(document.publicationStatus, "LOCAL_SITE_INTEGRATED");
  assert.equal(document.sourceVersion, "1.0");
  assert.ok(document.sourceSha256);
}

const preview = renderTrainerLegalPreview({
  document: publicLegalDocument("DISTANCE"),
  cart: { totalMinor: 125000, shippingMinor: 0, items: [{ title: "Örnek paket", priceGrossMinor: 125000, physicalItems: [] }] },
  shipping: { firstName: "Ayşe", lastName: "Yılmaz", city: "İzmir", district: "Konak", addressLine: "Temsil Plaza" },
  email: "ayse@example.test",
  paymentMethod: "PAYTR",
});
assert.equal(preview.ready, true);
assert.match(preview.markdown, /Ayşe Yılmaz/u);
assert.match(preview.markdown, /Örnek paket/u);
assert.match(preview.markdown, /1\.250,00/u);
assert.equal(preview.publicationStatus, "LOCAL_SITE_INTEGRATED");

const ownerApi = fs.readFileSync(new URL("../api/admin/owner-legal-approval.js", import.meta.url), "utf8");
const ownerUi = fs.readFileSync(new URL("../src/platform/admin/LegalPreparationPage.tsx", import.meta.url), "utf8");
assert.match(ownerApi, /requireMembership\(principal, "OWNER"\)/u);
assert.match(ownerApi, /LEGAL_PUBLICATION_BLOCKED_P0/u);
assert.match(ownerApi, /INTERNAL_DOCUMENT_PUBLICATION_FORBIDDEN/u);
assert.match(ownerUi, /privateInternalDocs/u);
assert.match(ownerUi, /legal-owner-documents-v10-customer\.json/u);
const commerce = fs.readFileSync(new URL("../src/server/domain/student-commerce.js", import.meta.url), "utf8");
assert.match(commerce, /order_legal_snapshots/u);
assert.match(commerce, /snapshotSha256: legalEvidence\.snapshotSha256/u);
assert.match(commerce, /legalAcceptance: legalInput/u);

console.log(JSON.stringify({
  R77E_DOCUMENTS_TOTAL: 21,
  R77E_CUSTOMER_DOCUMENTS: 16,
  R77E_INTERNAL_DOCUMENTS: 5,
  R77E_SOURCE_HASHES: "PASS",
  R77E_PUBLIC_ROUTES: 18,
  R77E_INTERNAL_PUBLIC_EXPOSURE: "PASS_BLOCKED",
  R77E_DYNAMIC_ORDER_PREVIEW: "PASS_SOURCE_REAL_FIELDS",
  R77E_SNAPSHOT_AND_HASH_WIRING: "PASS_SOURCE_CONTRACT",
  R77E_OWNER_AUTHORITY: "PASS_SOURCE_CONTRACT",
  DATABASE_MUTATION: "NONE",
  PROVIDER_IO: "NOT_RUN",
  BROWSER_ACCEPTANCE: "NOT_RUN",
}));
