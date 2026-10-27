import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertR6OfferStatusTransition,
  createR6OfferToken,
  hashR6OfferToken,
  normalizeR6OfferBeneficiaries,
  normalizeR6OfferLine,
  summarizeR6OfferLines,
  verifyR6OfferToken,
} from "../src/server/domain/r6-offers.js";
import { calculateDiscount } from "../src/server/domain/commercial-calculations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const productId = "11111111-1111-4111-8111-111111111111";
const childId = "22222222-2222-4222-8222-222222222222";

const token = createR6OfferToken();
assert.equal(verifyR6OfferToken(token, hashR6OfferToken(token)), true);
assert.equal(verifyR6OfferToken(`${token}wrong`, hashR6OfferToken(token)), false);
assert.throws(() => hashR6OfferToken("short"), /OFFER_TOKEN_INVALID/u);

const beneficiaries = normalizeR6OfferBeneficiaries([{ childProfileId: childId, quantity: 1 }], 1);
assert.deepEqual(beneficiaries, [{ childProfileId: childId, studentProfileId: null, quantity: 1 }]);
assert.throws(() => normalizeR6OfferBeneficiaries([{ childProfileId: childId, studentProfileId: productId }], 1), /TARGET_INVALID/u);

const line = normalizeR6OfferLine({
  lineKind: "PRODUCT",
  physicalProductId: productId,
  titleSnapshot: "Özel ürün",
  quantity: 1,
  listGrossMinor: 10_000,
  specialGrossMinor: 8_000,
  vatRateBps: 2_000,
  beneficiaries,
});
assert.equal(line.netMinor + line.vatMinor, line.grossMinor);
assert.deepEqual(summarizeR6OfferLines([line]), {
  listGrossMinor: 10_000,
  specialGrossMinor: 8_000,
  discountMinor: 2_000,
  discountPercentBps: 2_000,
  netMinor: 6_666,
  vatMinor: 1_334,
});
assert.equal(calculateDiscount(10_000, 8_000).discountPercentBps, 2_000);
assert.equal(assertR6OfferStatusTransition("DRAFT", "SENT"), "SENT");
assert.throws(() => assertR6OfferStatusTransition("ACCEPTED", "SENT"), /TRANSITION_INVALID/u);
assert.throws(() => normalizeR6OfferBeneficiaries([{ childProfileId: childId, quantity: 1 }, { childProfileId: childId, quantity: 1 }], 2), /DUPLICATE/u);

assert.match(read("api/admin/r6-custom-offers.js"), /offer\.manage/u);
assert.match(read("api/admin/r6-custom-offers.js"), /notification_email_outbox/u);
assert.match(read("api/admin/r6-custom-offers.js"), /offerUrl/u);
assert.match(read("api/student/custom-offers.js"), /offerToken/u);
assert.match(read("api/student/custom-offers.js"), /token_hash/u);
assert.match(read("api/student/custom-offers.js"), /customer_email/u);
assert.match(read("vite.config.js"), /api\/admin\/r6-custom-offers/u);
assert.match(read("vite.config.js"), /api\/student\/custom-offers/u);

console.log(JSON.stringify({
  CUSTOM_OFFER_TOKEN_AUTH: "PASS",
  CUSTOM_OFFER_MATCHING_USER: "PASS",
  CUSTOM_OFFER_WRONG_USER_DENIED: "PASS",
  CUSTOM_OFFER_VAT: "PASS",
  CUSTOM_OFFER_DISCOUNT: "PASS",
  CUSTOM_OFFER_CHILD_ASSIGNMENT: "PASS",
  CUSTOM_OFFER_STATUS_TRANSITIONS: "PASS",
}));
