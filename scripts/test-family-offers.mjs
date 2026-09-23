import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFamilyOfferDraft, getEligibleFamilyOfferSelections, normalizeFamilyOfferDraftChildren, assertFamilyOfferEditable } from "../src/server/domain/family-offers.js";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const child = (localKey, educationStage, grade) => ({ localKey, firstName: "Ayşe", lastName: "Yılmaz", educationStage, grade });
const primary = child("a", "PRIMARY", "3");
const middle = child("b", "MIDDLE", "7");
const high = child("c", "HIGH", "10");
const row = (n, stage, grade, type, extra = {}) => ({ packageVersionId: id(n + 100), packageComponentId: id(n + 200), productId: id(n), title: `Ürün ${n}`, packageStatus: "PUBLISHED", versionStatus: "PUBLISHED", purchaseEnabled: true, catalogScope: "STUDENT_COMMERCE", audience: "STUDENT", educationStage: stage, eligibleGrades: [grade], productStageScopes: [stage], componentActive: true, productActive: true, quantity: 1, r6ProductType: type, productType: type === "BOOK" ? "PHYSICAL" : "DIGITAL", saleGrossMinor: 55000, currency: "TRY", ...extra });
const book = row(1, "PRIMARY", 3, "BOOK");
const software = row(2, "PRIMARY", 3, "SOFTWARE");
const group = row(3, "PRIMARY", 3, "TRAINING_SERVICE", { serviceMode: "GROUP", programId: id(900) });
const individual = row(4, "PRIMARY", 3, "TRAINING_SERVICE", { serviceMode: "INDIVIDUAL", programId: id(900) });
const catalog = [book, software, group, individual, row(5, "MIDDLE", 7, "BOOK"), row(6, "HIGH", 10, "BOOK"), row(7, "PRIMARY", 4, "BOOK"), row(8, "PRIMARY", 3, "BOOK", { productActive: false }), row(9, "PRIMARY", 3, "BOOK", { versionStatus: "DRAFT" })];
const pick = (localKey, productId) => ({ localKey, productId });
const evaluate = (children, selections, canonical = catalog, other = {}) => evaluateFamilyOfferDraft({ children, selections, ...other }, canonical);

test("stage and grade filter published, active, purchasable catalog only", () => {
  assert.deepEqual(getEligibleFamilyOfferSelections(primary, catalog).map((r) => r.productId), [id(1), id(2), id(3), id(4)]);
  assert.deepEqual(getEligibleFamilyOfferSelections(middle, catalog).map((r) => r.productId), [id(5)]);
  assert.deepEqual(getEligibleFamilyOfferSelections(high, catalog).map((r) => r.productId), [id(6)]);
  for (const patch of [{ purchaseEnabled: false }, { componentActive: false }, { packageStatus: "DRAFT" }, { currency: "USD" }, { quantity: 2 }, { eligibleGrades: null }, { productStageScopes: null }]) assert.equal(getEligibleFamilyOfferSelections(primary, [{ ...book, ...patch }]).length, 0);
});
test("draft children require names/grade, compatible stage and unique local keys", () => {
  assert.throws(() => normalizeFamilyOfferDraftChildren([{ ...primary, firstName: "" }]), { code: "FAMILY_CHILD_FIRST_NAME_REQUIRED" });
  assert.throws(() => normalizeFamilyOfferDraftChildren([{ ...primary, lastName: "" }]), { code: "FAMILY_CHILD_LAST_NAME_REQUIRED" });
  assert.throws(() => normalizeFamilyOfferDraftChildren([{ ...primary, grade: "" }]), { code: "FAMILY_CHILD_GRADE_REQUIRED" });
  assert.throws(() => normalizeFamilyOfferDraftChildren([{ ...primary, grade: "9" }]), { code: "FAMILY_CHILD_STAGE_GRADE_INVALID" });
  assert.throws(() => normalizeFamilyOfferDraftChildren([primary, primary]), { code: "FAMILY_CHILD_KEY_DUPLICATE" });
  assert.equal(normalizeFamilyOfferDraftChildren([primary])[0].existingChildProfileId, null);
});
test("same child/product rejects, same product across distinct children is allowed", () => {
  assert.throws(() => evaluate([primary], [pick("a", id(1)), pick("a", id(1))]), { code: "FAMILY_SELECTION_DUPLICATE" });
  assert.equal(evaluate([primary, { ...primary, localKey: "other" }], [pick("a", id(1)), pick("other", id(1))]).bookCount, 2);
});
test("component id is accepted as the canonical selection key", () => {
  const result = evaluate([primary], [{ localKey: "a", canonicalProductOrComponentId: book.packageComponentId }]);
  assert.equal(result.selections[0].canonicalProductOrComponentId, book.packageComponentId);
});
test("education mode exclusion is per child and program", () => {
  assert.throws(() => evaluate([primary], [pick("a", id(3)), pick("a", id(4))]), { code: "FAMILY_EDUCATION_MODE_CONFLICT" });
  assert.equal(evaluate([primary], [pick("a", id(1)), pick("a", id(2)), pick("a", id(3))]).selections.length, 3);
  assert.equal(evaluate([primary], [pick("a", id(1)), pick("a", id(2)), pick("a", id(4))]).selections.length, 3);
});
test("shipping preview counts physical books per child, not product identity", () => {
  assert.equal(evaluate([primary], [pick("a", id(2))]).shippingMinor, 0);
  assert.equal(evaluate([primary], [pick("a", id(1))]).shippingMinor, 10000);
  assert.equal(evaluate([primary, { ...primary, localKey: "d" }], [pick("a", id(1)), pick("d", id(1))]).shippingMinor, 15000);
  assert.equal(evaluate([primary, { ...primary, localKey: "d" }, { ...primary, localKey: "e" }], [pick("a", id(1)), pick("d", id(1)), pick("e", id(1))]).shippingMinor, 0);
});
test("normal total is server catalog price; forged line properties are rejected", () => {
  assert.equal(evaluate([primary], [pick("a", id(1)), pick("a", id(2))]).normalTotalMinor, 110000);
  assert.throws(() => evaluate([primary], [{ ...pick("a", id(1)), priceMinor: 1 }]), { code: "FAMILY_SELECTION_FIELDS_INVALID" });
  assert.equal(evaluate([primary], [pick("a", id(1))], catalog, { pricing: { finalFamilyPriceMinor: 40000 } }).discountMinor, 15000);
  assert.throws(() => evaluate([primary], [pick("a", id(1))], catalog, { pricing: { finalFamilyPriceMinor: 60000 } }), { code: "FAMILY_PRICE_INVALID" });
  assert.throws(() => evaluate([primary], [pick("a", id(1))], catalog, { pricing: { discountAmountMinor: 1, discountPercentBps: 1 } }), { code: "FAMILY_PRICING_METHOD_CONFLICT" });
});
test("invalid grade/product mismatch and ambiguous canonical rows reject", () => {
  assert.throws(() => evaluate([middle], [pick("b", id(1))]), { code: "FAMILY_SELECTION_UNAVAILABLE" });
  assert.throws(() => evaluate([primary], [pick("a", id(1))], [book, book]), { code: "FAMILY_SELECTION_UNAVAILABLE" });
});
test("pure draft evaluation creates no profile and sent edit ends at materialization", () => {
  const draft = evaluate([primary], [pick("a", id(1))]);
  assert.equal(draft.children[0].existingStudentProfileId, null);
  assert.equal(draft.children[0].existingChildProfileId, null);
  assert.doesNotThrow(() => assertFamilyOfferEditable({ status: "SENT", acceptedOrderId: null }));
  assert.throws(() => assertFamilyOfferEditable({ status: "SENT", materializedOrderId: id(800) }), { code: "FAMILY_OFFER_IMMUTABLE" });
});
