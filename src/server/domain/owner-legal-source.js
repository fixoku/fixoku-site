import crypto from "node:crypto";

export const OWNER_LEGAL_SOURCE_COUNTS = Object.freeze({
  total: 21,
  customer: 16,
  internal: 5,
});

export function isInternalLegalDocument(document) {
  return document?.internal === true;
}

export function legalDocumentScope(document) {
  // Missing/unknown scope is treated as CUSTOMER for exposure safety. The
  // source validator still rejects the package so an incomplete record cannot
  // silently pass the 16/5 contract.
  return isInternalLegalDocument(document) ? "INTERNAL" : "CUSTOMER";
}

export function legalDocumentKey(document) {
  return Number.isInteger(document?.id) ? `FIXOKU-${document.id}` : null;
}

export function legalDocumentContentHash(document) {
  return crypto.createHash("sha256").update(String(document?.markdown ?? ""), "utf8").digest("hex");
}

export function hasMatchingLegalDocumentHash(document) {
  const expected = legalDocumentContentHash(document);
  const supplied = isInternalLegalDocument(document) ? document?.originalSha256 : document?.contentSha256;
  return typeof supplied === "string" && supplied === expected;
}

export function inspectOwnerLegalSource(source) {
  const errors = [];
  if (!Array.isArray(source)) {
    return { ok: false, errors: ["ROOT_MUST_BE_DOCUMENT_ARRAY"], total: 0, customerCount: 0, internalCount: 0, documents: [] };
  }

  const documents = source.slice();
  const customerDocuments = documents.filter((document) => legalDocumentScope(document) === "CUSTOMER");
  const internalDocuments = documents.filter((document) => legalDocumentScope(document) === "INTERNAL");
  const ids = new Set();
  const keys = new Set();

  for (const document of documents) {
    const id = document?.id;
    const key = legalDocumentKey(document);
    if (!document || !Number.isInteger(id) || id < 1) errors.push("DOCUMENT_ID_INVALID");
    if (ids.has(id)) errors.push(`DUPLICATE_DOCUMENT_ID:${id}`);
    ids.add(id);
    if (!key || keys.has(key)) errors.push(`DUPLICATE_DOCUMENT_KEY:${key || "MISSING"}`);
    if (key) keys.add(key);
    if (typeof document?.internal !== "boolean") errors.push(`SCOPE_METADATA_INVALID:${id}`);
    if (typeof document?.markdown !== "string" || !document.markdown) errors.push(`MARKDOWN_MISSING:${id}`);
    if (!hasMatchingLegalDocumentHash(document)) errors.push(`CONTENT_HASH_INVALID:${id}`);

    if (legalDocumentScope(document) === "INTERNAL") {
      if (document.sourceVersion !== "0.2" || document.publicationStatus !== "INTERNAL_ONLY") errors.push(`INTERNAL_METADATA_INVALID:${id}`);
    } else if (document.sourceVersion !== "1.0" || document.publicationStatus !== "BLOCKED_P0") {
      errors.push(`CUSTOMER_METADATA_INVALID:${id}`);
    }
  }

  if (documents.length !== OWNER_LEGAL_SOURCE_COUNTS.total) errors.push("DOCUMENT_COUNT_INVALID");
  if (customerDocuments.length !== OWNER_LEGAL_SOURCE_COUNTS.customer) errors.push("CUSTOMER_DOCUMENT_COUNT_INVALID");
  if (internalDocuments.length !== OWNER_LEGAL_SOURCE_COUNTS.internal) errors.push("INTERNAL_DOCUMENT_COUNT_INVALID");

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    total: documents.length,
    customerCount: customerDocuments.length,
    internalCount: internalDocuments.length,
    documents,
  };
}
