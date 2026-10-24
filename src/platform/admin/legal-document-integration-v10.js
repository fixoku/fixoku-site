// R77E: accepted V1.0 legal document routing and exposure contract.
export const LEGAL_DOCUMENT_INTEGRATION_V10 = Object.freeze([
  { id: 1, scope: "CUSTOMER", route: "/satici-bilgileri", surfaces: ["footer", "seller_identity", "order_summary"] },
  { id: 2, scope: "CUSTOMER", route: "/uyelik-sozlesmesi", aliases: ["/kullanim-kosullari"], surfaces: ["student_registration", "trainer_registration", "profile"] },
  { id: 3, scope: "CUSTOMER", route: "/on-bilgilendirme-formu", surfaces: ["student_checkout", "trainer_checkout", "order_snapshot"] },
  { id: 4, scope: "CUSTOMER", route: "/mesafeli-satis-sozlesmesi", surfaces: ["student_checkout", "trainer_checkout", "order_snapshot"] },
  { id: 5, scope: "CUSTOMER", route: "/iptal-iade-cayma-politikasi", surfaces: ["footer", "checkout", "support", "order_snapshot"] },
  { id: 6, scope: "CUSTOMER", route: "/teslimat-kargo-politikasi", surfaces: ["footer", "physical_checkout", "order_snapshot"] },
  { id: 7, scope: "CUSTOMER", route: "/dijital-icerik-ve-hizmet-kosullari", surfaces: ["student_packages", "trainer_packages", "checkout", "order_snapshot"] },
  { id: 8, scope: "CUSTOMER", route: "/kvkk-aydinlatma-metni", aliases: ["/kvkk"], surfaces: ["student_registration", "trainer_registration", "checkout", "profile"] },
  { id: 9, scope: "CUSTOMER", route: "/cocuk-ve-kanuni-temsilci-bilgilendirme", surfaces: ["student_registration", "guardian_checkout", "child_profile"] },
  { id: 10, scope: "CUSTOMER", route: "/egitmen-kvkk-aydinlatma", surfaces: ["trainer_registration", "trainer_profile"] },
  { id: 11, scope: "CUSTOMER", route: "/gizlilik-politikasi", surfaces: ["footer", "registration", "checkout", "profile"] },
  { id: 12, scope: "CUSTOMER", route: "/cerez-politikasi", surfaces: ["footer", "consent_manager"] },
  { id: 13, scope: "CUSTOMER", route: "/ticari-elektronik-ileti", surfaces: ["marketing_consent", "profile"] },
  { id: 14, scope: "CUSTOMER", route: "/acik-riza", surfaces: ["optional_consent"] },
  { id: 15, scope: "CUSTOMER", route: "/veri-sahibi-basvuru-formu", surfaces: ["support", "kvkk_request"] },
  { id: 16, scope: "CUSTOMER", route: "/musteri-sikayetleri-ve-uyusmazlik", surfaces: ["support", "footer"] },
  { id: 17, scope: "INTERNAL", route: null, surfaces: ["owner_panel"] },
  { id: 18, scope: "INTERNAL", route: null, surfaces: ["owner_panel"] },
  { id: 19, scope: "INTERNAL", route: null, surfaces: ["owner_panel"] },
  { id: 20, scope: "INTERNAL", route: null, surfaces: ["owner_panel"] },
  { id: 21, scope: "INTERNAL", route: null, surfaces: ["owner_panel"] },
]);
export const CUSTOMER_LEGAL_DOCUMENT_INTEGRATION = Object.freeze(LEGAL_DOCUMENT_INTEGRATION_V10.filter((document) => document.scope === "CUSTOMER"));
export const INTERNAL_LEGAL_DOCUMENT_INTEGRATION = Object.freeze(LEGAL_DOCUMENT_INTEGRATION_V10.filter((document) => document.scope === "INTERNAL"));
export const PUBLIC_LEGAL_DOCUMENT_BY_ROUTE = Object.freeze(Object.fromEntries(LEGAL_DOCUMENT_INTEGRATION_V10.filter((document) => document.scope === "CUSTOMER").flatMap((document) => [document.route, ...(document.aliases || [])].map((route) => [route, document]))));
export function inspectLegalDocumentIntegration(sourceDocuments) {
  const errors = [];
  if (!Array.isArray(sourceDocuments)) return { ok: false, errors: ["SOURCE_NOT_ARRAY"] };
  if (sourceDocuments.length !== LEGAL_DOCUMENT_INTEGRATION_V10.length) errors.push("SOURCE_COUNT_INVALID");
  const sourceIds = new Set(sourceDocuments.map((document) => Number(document?.id)));
  const integrationIds = new Set(LEGAL_DOCUMENT_INTEGRATION_V10.map((document) => document.id));
  if (sourceIds.size !== integrationIds.size || [...integrationIds].some((id) => !sourceIds.has(id))) errors.push("SOURCE_IDS_INVALID");
  if (CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.length !== 16) errors.push("CUSTOMER_COUNT_INVALID");
  if (INTERNAL_LEGAL_DOCUMENT_INTEGRATION.length !== 5) errors.push("INTERNAL_COUNT_INVALID");
  const routes = CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.flatMap((document) => [document.route, ...(document.aliases || [])]);
  if (new Set(routes).size !== routes.length) errors.push("PUBLIC_ROUTE_DUPLICATE");
  if (INTERNAL_LEGAL_DOCUMENT_INTEGRATION.some((document) => document.route || document.aliases?.length)) errors.push("INTERNAL_PUBLIC_ROUTE_FORBIDDEN");
  return { ok: errors.length === 0, errors, total: LEGAL_DOCUMENT_INTEGRATION_V10.length, customer: CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.length, internal: INTERNAL_LEGAL_DOCUMENT_INTEGRATION.length, publicRoutes: routes };
}
