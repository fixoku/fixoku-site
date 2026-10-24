/* global process */
import { readOwnerLegalDocuments } from "./owner-legal-revisions.js";
import crypto from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";

// Source of truth: the unchanged Owner > Yasal ve Uyumluluk document library.
const SOURCE = resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v3.json");
const V10_SOURCE = resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v10.json");
const v10Source = JSON.parse(fs.readFileSync(V10_SOURCE, "utf8"));
const IDS = Object.freeze({ SELLER: 1, PRE_INFO: 3, DISTANCE: 4, WITHDRAWAL: 5, DELIVERY: 6, DIGITAL: 7, MEMBERSHIP: 2, TERMS: 2, KVKK: 8, PRIVACY: 11, TRAINER_KVKK: 10 });
const sha = (text) => crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
const publicationStatus = (markdown) => {
  const text = String(markdown || "");
  if (/TASLAK|BEKLENİYOR|DOĞRULANACAK|YAYINA HAZIR DEĞİL/iu.test(text)) return "DRAFT";
  if (/\b(?:PUBLISHED|YAYINDA)\b/iu.test(text)) return "PUBLISHED";
  if (/\b(?:APPROVED|ONAYLANDI)\b/iu.test(text)) return "APPROVED";
  return "UNKNOWN";
};
const assertPublished = (docs) => {
  if (!docs.every((doc) => doc && doc.publicationStatus === "PUBLISHED")) {
    throw Object.assign(new Error("LEGAL_DOCUMENT_NOT_PUBLISHED"), { code: "LEGAL_DOCUMENT_NOT_PUBLISHED", status: 503 });
  }
};
const DOCUMENT_SOURCE_IDS = Object.freeze({ PRE_INFO: 3, DISTANCE: 4, WITHDRAWAL: 5, DELIVERY: 6, DIGITAL: 7, MEMBERSHIP: 2, TERMS: 2, KVKK: 8 });

/**
 * R72 DB authority. A missing 0041 table deliberately returns null so callers
 * retain the existing draft fail-closed behavior; it never promotes local JSON
 * into an approval source.
 */
export async function readPublishedLegalDocuments(client, codes) {
  if (!client?.query) return null;
  const sourceIds = [...new Set(codes.map((code) => DOCUMENT_SOURCE_IDS[String(code || "")]).filter(Boolean))];
  if (!sourceIds.length) return [];
  let rows;
  try {
    rows = (await client.query(`select distinct on (source_document_id) id,source_document_id as "sourceDocumentId",version_number as "versionNumber",status,title,markdown,content_sha256 as "sourceSha256" from owner_legal_document_versions where source_document_id=any($1::int[]) and status='PUBLISHED' order by source_document_id,version_number desc`, [sourceIds])).rows;
  } catch (cause) {
    if (cause?.code === "42P01" || cause?.code === "42704") return null;
    throw cause;
  }
  if (rows.length !== sourceIds.length) throw Object.assign(new Error("LEGAL_DOCUMENT_NOT_PUBLISHED"), { code: "LEGAL_DOCUMENT_NOT_PUBLISHED", status: 503 });
  const bySourceId = new Map(rows.map((row) => [Number(row.sourceDocumentId), row]));
  return codes.map((code) => {
    const row = bySourceId.get(DOCUMENT_SOURCE_IDS[String(code || "")]);
    return { code: String(code), title: row.title, markdown: row.markdown, version: `V${row.versionNumber}`, sourceVersion: String(row.versionNumber), sourceSha256: row.sourceSha256, publicationStatus: "PUBLISHED", documentVersionId: row.id, versionNumber: Number(row.versionNumber), sourceDocumentId: Number(row.sourceDocumentId) };
  });
}

export function legalSnapshotRows(documents, acceptanceByCode = {}) {
  return documents.map((document) => ({
    documentKey: document.code,
    documentVersionId: document.documentVersionId || null,
    documentVersionNumber: Number(document.versionNumber || 0),
    documentStatus: document.publicationStatus,
    contentSha256: document.sourceSha256,
    markdown: document.markdown,
    acceptanceType: acceptanceByCode[document.code] || "PRE_INFORMATION",
  }));
}
export function trainerLegalDocument(code) {
  const id = IDS[String(code || "")];
  if (!id) return null;
  const source = readOwnerLegalDocuments();
  const record = source.find(item => item.id === id && item.internal !== true);
  if (!record || !record.markdown) throw Object.assign(new Error("OWNER_LEGAL_DOCUMENT_MISSING"), { code: "OWNER_LEGAL_DOCUMENT_MISSING", status: 503 });
  const sourceVersion = record.sourceVersion || "0.1";
  const sourceDate = record.sourceDate || "2026-10-10";
  const displayDate = sourceDate.split("-").reverse().join(".");
  return { code: String(code), title: record.title, markdown: record.markdown, version: record.revision ? `V${sourceVersion} / ${displayDate} · Owner Rev ${record.revision}` : `V${sourceVersion} / ${displayDate}`, sourceVersion, sourceDate, sourceSha256: sha(record.markdown), originalSha256: record.originalSha256 || null, publicationStatus: publicationStatus(record.markdown) };
}

// R77E local site integration source. This is deliberately separate from the
// production commerce authority: public pages and authenticated previews may
// show the accepted V1.0 text while order creation still requires a published
// DB version and immutable snapshot.
export function publicLegalDocument(code) {
  const id = IDS[String(code || "")];
  if (!id) return null;
  const record = v10Source.find((document) => Number(document.id) === id && document.internal !== true);
  if (!record?.markdown) throw Object.assign(new Error("OWNER_LEGAL_DOCUMENT_MISSING"), { code: "OWNER_LEGAL_DOCUMENT_MISSING", status: 503 });
  return {
    code: String(code),
    title: record.title,
    markdown: record.markdown,
    version: `V${record.sourceVersion}`,
    sourceVersion: record.sourceVersion,
    sourceDate: record.sourceDate,
    sourceSha256: record.contentSha256,
    originalSha256: record.originalSha256,
    publicationStatus: "LOCAL_SITE_INTEGRATED",
    sourceDocumentId: record.id,
    dynamicFields: record.dynamicFields || [],
  };
}
export function trainerLegalAcceptance(input, { order, trainerUserId, email, shipping, items, documents: publishedDocuments = null }) {
  if (input?.preInformation !== true || input?.distanceSales !== true) throw Object.assign(new Error("LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED"), { code: "LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED", status: 400 });
  const docs = publishedDocuments || [trainerLegalDocument("PRE_INFO"), trainerLegalDocument("DISTANCE")];
  assertPublished(docs);
  if (!docs.every((doc) => doc && input?.documentHashes?.[doc.code] === doc.sourceSha256)) throw Object.assign(new Error("LEGAL_DOCUMENT_VERSION_MISMATCH"), { code: "LEGAL_DOCUMENT_VERSION_MISMATCH", status: 409 });
  const buyer = { name: `${shipping.firstName} ${shipping.lastName}`.trim(), email: String(email || ""), city: shipping.city, district: shipping.district, addressLine: shipping.addressLine };
  const purchase = { orderId: order.id, currency: order.currency, totalMinor: Number(order.total_minor), shippingMinor: Number(order.shipping_minor), items: items.map(item => ({ packageVersionId: item.row.id, title: item.row.title, totalMinor: item.gross })) };
  const documents = docs.map(doc => ({ code: doc.code, title: doc.title, version: doc.version, sourceSha256: doc.sourceSha256, sourceText: doc.markdown }));
  const hash = sha(JSON.stringify({ buyer, purchase, documents }));
  return { event: "trainer.commerce.legal.accepted", evidenceVersion: "fixoku-trainer-v1", acceptedAt: new Date().toISOString(), trainerUserId, buyer, purchase, documents, acceptance: { preInformation: true, distanceSales: true, otherConsents: false }, snapshotSha256: hash, legalPublicationStatus: "PUBLISHED_SOURCE_REQUIRED" };
}

export function studentLegalAcceptance(input, { order, buyer, items, requiresShipping = false, documents: publishedDocuments = null }) {
  if (input?.preInformation !== true || input?.distanceSales !== true || input?.privacy !== true) {
    throw Object.assign(new Error("LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED"), { code: "LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED", status: 400 });
  }
  const docs = publishedDocuments || [trainerLegalDocument("PRE_INFO"), trainerLegalDocument("DISTANCE"), trainerLegalDocument("KVKK")];
  if (!publishedDocuments) {
    if (requiresShipping) docs.push(trainerLegalDocument("DELIVERY"));
    if (input?.commencement === true) docs.push(trainerLegalDocument("DIGITAL"));
  }
  assertPublished(docs);
  const documents = docs.map((doc) => ({ code: doc.code, title: doc.title, version: doc.version, sourceSha256: doc.sourceSha256, sourceText: doc.markdown }));
  const acceptance = {
    preInformation: true,
    distanceSales: true,
    privacy: true,
    marketing: input?.marketing === true,
    commencement: input?.commencement === true,
  };
  const evidence = { event: "student.commerce.legal.accepted", evidenceVersion: "fixoku-student-v1", acceptedAt: new Date().toISOString(), buyer, order: { orderId: order.id, currency: order.currency, subtotalMinor: Number(order.subtotal_minor), shippingMinor: Number(order.shipping_minor || 0), totalMinor: Number(order.total_minor) }, items, documents, acceptance };
  return { ...evidence, snapshotSha256: sha(JSON.stringify(evidence)), legalPublicationStatus: "PUBLISHED" };
}
