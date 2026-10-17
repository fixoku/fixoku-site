import assert from "node:assert/strict";
import { countPhysicalBooks, shippingForBookCount, shippingForPhysicalBooks } from "../src/server/domain/book-shipping.js";

assert.equal(shippingForBookCount(0), 0);
assert.equal(shippingForBookCount(1), 10_000);
assert.equal(shippingForBookCount(2), 15_000);
assert.equal(shippingForBookCount(3), 0);
assert.equal(shippingForBookCount(99), 0);
const mixed = [
  { productType: "BOOK", quantity: 1 },
  { productType: "PHYSICAL", quantity: 1 },
  { productType: "SOFTWARE", quantity: 10 },
  { productType: "TRAINING_SERVICE", quantity: 2 },
];
assert.equal(countPhysicalBooks(mixed), 2);
assert.equal(shippingForPhysicalBooks(mixed), 15_000);
assert.throws(() => shippingForBookCount(-1), /BOOK_COUNT_INVALID/);
assert.throws(() => countPhysicalBooks([{ productType: "BOOK", quantity: 0 }]), /BOOK_QUANTITY_INVALID/);
console.log(JSON.stringify({ BOOK_SHIPPING_MATRIX: "PASS", DIGITAL_AND_SERVICE_EXCLUDED: "PASS", VAT_INCLUDED_MINOR_UNITS: "PASS" }));
