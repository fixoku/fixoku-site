export type LegalDocumentIntegration = {
  id: number;
  scope: "CUSTOMER" | "INTERNAL";
  route: string | null;
  aliases?: string[];
  surfaces: string[];
};
export declare const LEGAL_DOCUMENT_INTEGRATION_V10: readonly LegalDocumentIntegration[];
export declare const CUSTOMER_LEGAL_DOCUMENT_INTEGRATION: readonly LegalDocumentIntegration[];
export declare const INTERNAL_LEGAL_DOCUMENT_INTEGRATION: readonly LegalDocumentIntegration[];
export declare const PUBLIC_LEGAL_DOCUMENT_BY_ROUTE: Readonly<Record<string, LegalDocumentIntegration>>;
export declare function inspectLegalDocumentIntegration(sourceDocuments: unknown): { ok: boolean; errors: string[]; total?: number; customer?: number; internal?: number; publicRoutes?: Array<string | null> };
