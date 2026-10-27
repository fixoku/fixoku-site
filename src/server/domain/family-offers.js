/* Family-offer draft contract. No persistence, profiles, cart, order or payment side effects.
 * `catalog` must be assembled on the server from published package versions,
 * active package components/products and canonical component pricing. Never
 * pass request-body catalog rows to these functions.
 */
const STAGE_GRADES = Object.freeze({ PRIMARY: [3, 4], MIDDLE: [5, 6, 7, 8], HIGH: [9, 10, 11, 12] });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const fail = (code) => { throw Object.assign(new Error(code), { code, status: 400 }); };
const amount = (value, code) => Number.isSafeInteger(value) && value >= 0 ? value : fail(code);

export const FAMILY_OFFER_STORAGE_REQUIREMENTS = Object.freeze({
  draftChildren: ["localKey", "firstName", "lastName", "grade", "educationStage", "existingChildProfileId", "existingStudentProfileId"],
  selections: ["draftChildLocalKey", "canonicalProductOrComponentId", "packageVersionId", "packageComponentId", "productType", "programId", "serviceMode", "saleGrossMinor", "currency"],
  revision: ["offerId", "revisionNumber", "status", "draftChildrenSnapshot", "selectionsSnapshot", "pricingSnapshot", "createdAt"],
  constraints: ["unique(offerId, revisionNumber)", "unique(offerId, draftChildLocalKey, canonicalProductOrComponentId)", "immutable materialized order snapshot"],
});

export function normalizeFamilyOfferDraftChild(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("FAMILY_CHILD_INVALID");
  const localKey = String(input.localKey ?? "").trim();
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  const educationStage = String(input.educationStage ?? "").trim().toUpperCase();
  const grade = String(input.grade ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/u.test(localKey)) fail("FAMILY_CHILD_KEY_INVALID");
  if (!firstName || firstName.length > 120) fail("FAMILY_CHILD_FIRST_NAME_REQUIRED");
  if (!lastName || lastName.length > 120) fail("FAMILY_CHILD_LAST_NAME_REQUIRED");
  if (!grade) fail("FAMILY_CHILD_GRADE_REQUIRED");
  if (!STAGE_GRADES[educationStage]?.includes(Number(grade)) || !/^\d{1,2}$/u.test(grade)) fail("FAMILY_CHILD_STAGE_GRADE_INVALID");
  const existingChildProfileId = input.existingChildProfileId || null;
  const existingStudentProfileId = input.existingStudentProfileId || null;
  if ((existingChildProfileId && !UUID.test(String(existingChildProfileId))) || (existingStudentProfileId && !UUID.test(String(existingStudentProfileId))) || (existingChildProfileId && existingStudentProfileId)) fail("FAMILY_CHILD_PROFILE_REFERENCE_INVALID");
  return { localKey, firstName, lastName, grade: String(Number(grade)), educationStage, existingChildProfileId, existingStudentProfileId };
}

export function normalizeFamilyOfferDraftChildren(input) {
  if (!Array.isArray(input) || !input.length) fail("FAMILY_CHILDREN_REQUIRED");
  const children = input.map(normalizeFamilyOfferDraftChild);
  if (new Set(children.map((child) => child.localKey)).size !== children.length) fail("FAMILY_CHILD_KEY_DUPLICATE");
  return children;
}

/* Canonical catalog shape: packageVersionId, packageStatus, versionStatus,
 * purchaseEnabled, catalogScope, audience, educationStage, eligibleGrades,
 * packageComponentId, productId, componentActive, productActive, quantity,
 * r6ProductType (BOOK/SOFTWARE/TRAINING_SERVICE), productType,
 * serviceMode (GROUP/INDIVIDUAL), programId, saleGrossMinor, currency.
 * An adapter must establish this from the DB; missing facts fail closed.
 */
function eligible(child, row) {
  return row?.catalogScope === "STUDENT_COMMERCE" && row.audience === "STUDENT"
    && row.packageStatus === "PUBLISHED" && row.versionStatus === "PUBLISHED"
    && row.purchaseEnabled === true && row.componentActive === true && row.productActive === true
    && row.educationStage === child.educationStage
    && Array.isArray(row.eligibleGrades) && row.eligibleGrades.map(Number).includes(Number(child.grade))
    && Array.isArray(row.productStageScopes) && row.productStageScopes.includes(child.educationStage)
    && row.quantity === 1 && UUID.test(String(row.packageVersionId || ""))
    && UUID.test(String(row.packageComponentId || "")) && UUID.test(String(row.productId || ""))
    && Number.isSafeInteger(row.saleGrossMinor) && row.saleGrossMinor >= 0 && row.currency === "TRY"
    && (row.r6ProductType === "BOOK" && row.productType === "PHYSICAL"
      || row.r6ProductType === "SOFTWARE" && row.productType !== "PHYSICAL"
      || row.r6ProductType === "TRAINING_SERVICE" && ["GROUP", "INDIVIDUAL"].includes(row.serviceMode) && UUID.test(String(row.programId || "")));
}

export function getEligibleFamilyOfferSelections(child, catalog) {
  const normalized = normalizeFamilyOfferDraftChild(child);
  if (!Array.isArray(catalog)) fail("FAMILY_CATALOG_INVALID");
  return catalog.filter((row) => eligible(normalized, row)).map((row) => ({
    packageVersionId: row.packageVersionId, packageComponentId: row.packageComponentId,
    productId: row.productId, title: row.title, r6ProductType: row.r6ProductType,
    selectionType: row.r6ProductType === "TRAINING_SERVICE" ? (row.serviceMode === "GROUP" ? "GROUP_EDUCATION" : "ONE_TO_ONE_EDUCATION") : row.r6ProductType,
    serviceMode: row.serviceMode ?? null, programId: row.programId ?? null,
    saleGrossMinor: row.saleGrossMinor, currency: row.currency,
  }));
}

/** Client input contains only child keys and canonical product IDs. No quantity or price. */
export function evaluateFamilyOfferDraft(input, catalog) {
  const children = normalizeFamilyOfferDraftChildren(input?.children);
  if (!Array.isArray(input?.selections) || !input.selections.length) fail("FAMILY_SELECTIONS_REQUIRED");
  const byChild = new Map(children.map((child) => [child.localKey, child]));
  const eligibleByChild = new Map(children.map((child) => [child.localKey, getEligibleFamilyOfferSelections(child, catalog)]));
  const seen = new Set();
  const education = new Map();
  let normalTotalMinor = 0;
  let bookCount = 0;
  const selections = input.selections.map((selection) => {
    if (!selection || typeof selection !== "object" || !byChild.has(selection.localKey)) fail("FAMILY_SELECTION_CHILD_INVALID");
    if (Object.keys(selection).some((key) => !["localKey", "productId", "canonicalProductOrComponentId"].includes(key)) || selection.productId != null && selection.canonicalProductOrComponentId != null) fail("FAMILY_SELECTION_FIELDS_INVALID");
    const canonicalProductOrComponentId = String(selection.canonicalProductOrComponentId ?? selection.productId ?? "");
    const key = `${selection.localKey}:${canonicalProductOrComponentId}`;
    if (seen.has(key)) fail("FAMILY_SELECTION_DUPLICATE");
    seen.add(key);
    const matches = eligibleByChild.get(selection.localKey).filter((row) => row.productId === canonicalProductOrComponentId || row.packageComponentId === canonicalProductOrComponentId);
    if (matches.length !== 1) fail("FAMILY_SELECTION_UNAVAILABLE"); // ambiguous variants also fail closed
    const row = matches[0];
    if (row.r6ProductType === "TRAINING_SERVICE") {
      const educationKey = `${selection.localKey}:${row.programId}`;
      const existingMode = education.get(educationKey);
      if (existingMode && existingMode !== row.serviceMode) fail("FAMILY_EDUCATION_MODE_CONFLICT");
      education.set(educationKey, row.serviceMode);
    }
    normalTotalMinor = amount(normalTotalMinor + row.saleGrossMinor, "FAMILY_TOTAL_OVERFLOW");
    if (row.r6ProductType === "BOOK") bookCount = amount(bookCount + 1, "FAMILY_BOOK_COUNT_OVERFLOW");
    return { localKey: selection.localKey, canonicalProductOrComponentId, packageVersionId: row.packageVersionId, packageComponentId: row.packageComponentId, productId: row.productId, r6ProductType: row.r6ProductType, selectionType: row.selectionType, serviceMode: row.serviceMode, programId: row.programId, title: row.title, saleGrossMinor: row.saleGrossMinor };
  });
  const shippingMinor = bookCount === 1 ? 10_000 : bookCount === 2 ? 15_000 : 0;
  const pricing = input?.pricing || {};
  if (Object.keys(pricing).some((key) => !["discountAmountMinor", "discountPercentBps", "finalFamilyPriceMinor"].includes(key))) fail("FAMILY_PRICING_FIELDS_INVALID");
  const methods = [pricing.discountAmountMinor, pricing.discountPercentBps, pricing.finalFamilyPriceMinor].filter((v) => v != null);
  if (methods.length > 1) fail("FAMILY_PRICING_METHOD_CONFLICT");
  let finalFamilyPriceMinor = normalTotalMinor;
  if (pricing.discountAmountMinor != null) finalFamilyPriceMinor -= amount(pricing.discountAmountMinor, "FAMILY_DISCOUNT_INVALID");
  if (pricing.discountPercentBps != null) {
    const bps = amount(pricing.discountPercentBps, "FAMILY_DISCOUNT_INVALID");
    if (bps > 10_000) fail("FAMILY_DISCOUNT_INVALID");
    finalFamilyPriceMinor -= Number((BigInt(normalTotalMinor) * BigInt(bps) + 5_000n) / 10_000n);
  }
  if (pricing.finalFamilyPriceMinor != null) finalFamilyPriceMinor = amount(pricing.finalFamilyPriceMinor, "FAMILY_PRICE_INVALID");
  if (finalFamilyPriceMinor < 0 || finalFamilyPriceMinor > normalTotalMinor) fail("FAMILY_PRICE_INVALID");
  return { children, selections, normalTotalMinor, bookCount, shippingMinor,
    discountMinor: normalTotalMinor - finalFamilyPriceMinor, finalFamilyPriceMinor,
    payablePreviewMinor: amount(finalFamilyPriceMinor + shippingMinor, "FAMILY_TOTAL_OVERFLOW"), currency: "TRY" };
}

export function createFamilyOfferDraft(input, catalog) {
  const evaluated = evaluateFamilyOfferDraft(input, catalog);
  return Object.freeze({
    kind: "FAMILY_OFFER_DRAFT",
    status: "DRAFT",
    revisionNumber: 1,
    children: evaluated.children.map((child) => Object.freeze({ ...child })),
    selections: evaluated.selections.map((selection) => Object.freeze({ ...selection })),
    pricing: Object.freeze({ normalTotalMinor: evaluated.normalTotalMinor, bookCount: evaluated.bookCount, shippingMinor: evaluated.shippingMinor, discountMinor: evaluated.discountMinor, finalFamilyPriceMinor: evaluated.finalFamilyPriceMinor, payablePreviewMinor: evaluated.payablePreviewMinor, currency: evaluated.currency }),
  });
}

export function createFamilyOfferRevision(draft, catalog, revisionNumber) {
  const revision = amount(revisionNumber, "FAMILY_REVISION_INVALID");
  if (revision < 1) fail("FAMILY_REVISION_INVALID");
  const evaluated = evaluateFamilyOfferDraft(draft, catalog);
  return Object.freeze({ ...createFamilyOfferDraft(draft, catalog), revisionNumber: revision, status: "DRAFT", pricing: Object.freeze({ normalTotalMinor: evaluated.normalTotalMinor, bookCount: evaluated.bookCount, shippingMinor: evaluated.shippingMinor, discountMinor: evaluated.discountMinor, finalFamilyPriceMinor: evaluated.finalFamilyPriceMinor, payablePreviewMinor: evaluated.payablePreviewMinor, currency: evaluated.currency }) });
}

/** Same link may resolve latest SENT revision until payment materializes an immutable order. */
export function assertFamilyOfferEditable({ status, acceptedOrderId, materializedOrderId }) {
  if (!["DRAFT", "SENT"].includes(status) || acceptedOrderId || materializedOrderId) fail("FAMILY_OFFER_IMMUTABLE");
}
