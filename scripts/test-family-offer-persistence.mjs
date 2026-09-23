import assert from "node:assert/strict";
import { assertFamilyOfferEditable, evaluateFamilyOfferDraft } from "../src/server/domain/family-offers.js";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const child = { localKey: "c1", firstName: "Ada", lastName: "Fix", grade: "5", educationStage: "MIDDLE" };
const row = { packageVersionId: uuid(1), packageComponentId: uuid(2), productId: uuid(3), packageStatus: "PUBLISHED", versionStatus: "PUBLISHED", purchaseEnabled: true, catalogScope: "STUDENT_COMMERCE", audience: "STUDENT", componentActive: true, productActive: true, educationStage: "MIDDLE", eligibleGrades: [5], productStageScopes: ["MIDDLE"], quantity: 1, r6ProductType: "BOOK", productType: "PHYSICAL", title: "Kitap", saleGrossMinor: 10000, currency: "TRY" };
const draft = { children: [child], selections: [{ localKey: "c1", canonicalProductOrComponentId: row.productId }], pricing: { discountPercentBps: 1000 } };
const evaluated = evaluateFamilyOfferDraft(draft, [row]);
assert.equal(evaluated.normalTotalMinor, 10000);
assert.equal(evaluated.finalFamilyPriceMinor, 9000);
assert.throws(() => evaluateFamilyOfferDraft({ ...draft, selections: [{ ...draft.selections[0] }, { ...draft.selections[0] }] }, [row]), /FAMILY_SELECTION_DUPLICATE/);
assert.throws(() => evaluateFamilyOfferDraft({ ...draft, selections: [{ localKey: "c1", canonicalProductOrComponentId: uuid(99) }] }, [row]), /FAMILY_SELECTION_UNAVAILABLE/);
assert.throws(() => assertFamilyOfferEditable({ status: "ACCEPTED", acceptedOrderId: uuid(4), materializedOrderId: uuid(5) }), /FAMILY_OFFER_IMMUTABLE/);
console.log(JSON.stringify({ FAMILY_DOMAIN_PERSISTENCE_CONTRACT: "PASS", DUPLICATE_SELECTION: "PASS", CANONICAL_PRICE: "PASS", IMMUTABLE_ACCEPTED_REVISION: "PASS", DATABASE_MUTATION: "NONE" }));
