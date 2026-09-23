import assert from "node:assert/strict";
import fs from "node:fs";

const cartApi = fs.readFileSync(new URL("../api/student/cart.js", import.meta.url), "utf8");
const commerce = fs.readFileSync(new URL("../src/server/domain/student-commerce.js", import.meta.url), "utf8");
const familyApi = fs.readFileSync(new URL("../api/student/family-offers.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../drizzle/migrations/0037_family_offer_cart_item.sql", import.meta.url), "utf8");

assert.match(cartApi, /input\.familyOfferId/u);
assert.match(cartApi, /FAMILY_OFFER_ALREADY_IN_CART/u);
assert.match(cartApi, /family_offer_revision_number/u);
assert.match(cartApi, /familyOfferId\]\);/u);
assert.match(cartApi, /readFamilyOfferCartItem\(client,principal\.user\.id,input\.familyOfferId,input\.revisionNumber\)/u);
assert.match(commerce, /offer\.status !== "SENT"/u);
assert.match(commerce, /current_revision_number/u);
assert.match(commerce, /FAMILY_REVISION_STALE/u);
assert.match(commerce, /kind: "FAMILY_OFFER"/u);
assert.match(familyApi, /status='SENT'/u);
assert.match(commerce, /FAMILY_OFFER_CHECKOUT_UNAVAILABLE/u);
assert.match(fs.readFileSync(new URL("../api/admin/family-offers.js", import.meta.url), "utf8"), /action === "send"/u);
assert.doesNotMatch(cartApi, /priceMinor.*input/u);
assert.match(migration, /family_offer_id uuid/u);
assert.match(migration, /student_cart_items_family_shape_chk/u);
assert.match(migration, /student_cart_items_buyer_family_offer_uq/u);
console.log("FAMILY_CART_CONTRACTS=PASS");
