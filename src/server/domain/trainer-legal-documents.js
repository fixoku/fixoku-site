import { readOwnerLegalDocuments } from "./owner-legal-revisions.js";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Source of truth: the unchanged Owner > Yasal ve Uyumluluk document library.
const SOURCE = resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v3.json");
const IDS = Object.freeze({ PRE_INFO: 3, DISTANCE: 4, WITHDRAWAL: 5, DELIVERY: 6, DIGITAL: 7, MEMBERSHIP: 2, TERMS: 2, KVKK: 8 });
const sha = (text) => crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
export function trainerLegalDocument(code) {
  const id = IDS[String(code || "")];
  if (!id) return null;
  const source = readOwnerLegalDocuments();
  const record = source.find(item => item.id === id && item.internal !== true);
  if (!record || !record.markdown) throw Object.assign(new Error("OWNER_LEGAL_DOCUMENT_MISSING"), { code: "OWNER_LEGAL_DOCUMENT_MISSING", status: 503 });
  return { code: String(code), title: record.title, markdown: record.markdown, version: record.revision ? `V0.1 / 10.10.2026 · Owner Rev ${record.revision}` : "V0.1 / 10.10.2026", sourceSha256: sha(record.markdown), originalSha256: record.originalSha256 || null };
}
export function trainerLegalAcceptance(input, { order, trainerUserId, email, shipping, items }) {
  if (input?.preInformation !== true || input?.distanceSales !== true) throw Object.assign(new Error("LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED"), { code: "LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED", status: 400 });
  const docs = [trainerLegalDocument("PRE_INFO"), trainerLegalDocument("DISTANCE")];
  if (!docs.every((doc) => doc && input?.documentHashes?.[doc.code] === doc.sourceSha256)) throw Object.assign(new Error("LEGAL_DOCUMENT_VERSION_MISMATCH"), { code: "LEGAL_DOCUMENT_VERSION_MISMATCH", status: 409 });
  const buyer = { name: `${shipping.firstName} ${shipping.lastName}`.trim(), email: String(email || ""), city: shipping.city, district: shipping.district, addressLine: shipping.addressLine };
  const purchase = { orderId: order.id, currency: order.currency, totalMinor: Number(order.total_minor), shippingMinor: Number(order.shipping_minor), items: items.map(item => ({ packageVersionId: item.row.id, title: item.row.title, totalMinor: item.gross })) };
  const documents = docs.map(doc => ({ code: doc.code, title: doc.title, version: doc.version, sourceSha256: doc.sourceSha256, sourceText: doc.markdown }));
  const hash = sha(JSON.stringify({ buyer, purchase, documents }));
  return { event: "trainer.commerce.legal.accepted", evidenceVersion: "fixoku-trainer-v1", acceptedAt: new Date().toISOString(), trainerUserId, buyer, purchase, documents, acceptance: { preInformation: true, distanceSales: true, otherConsents: false }, snapshotSha256: hash, counselApprovalClaimedByOwner: true, legalPublicationStatus: "NOT_INFERRED_FROM_OWNER_CLAIM" };
}
