// Build-derived public subset. It contains CUSTOMER records only so INTERNAL
// Owner documents never enter the public browser bundle.
import legalDocumentsV10 from "../platform/admin/legal-owner-documents-v10-customer.json";
import { CUSTOMER_LEGAL_DOCUMENT_INTEGRATION } from "../platform/admin/legal-document-integration-v10.js";

const sourceById = new Map(legalDocumentsV10.filter((document) => !document.internal).map((document) => [document.id, document]));

export const legalSourceContentByRoute = Object.freeze(
  Object.fromEntries(
    CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.flatMap((integration) => {
      const source = sourceById.get(integration.id);
      return [integration.route, ...(integration.aliases || [])].map((route) => [route, source]);
    }),
  ),
);

export function legalSourceDocumentForRoute(route) {
  return legalSourceContentByRoute[route] || null;
}
