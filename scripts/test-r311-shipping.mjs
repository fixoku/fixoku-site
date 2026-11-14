import assert from "node:assert/strict";
import {
  countPhysicalBooks,
  shippingForStudentCartItems as shipping,
} from "../src/server/domain/book-shipping.js";

const book = (quantity = 1) => ({
  productType: "PHYSICAL",
  r6ProductType: "BOOK",
  quantity,
});
const software = {
  productType: "DIGITAL",
  r6ProductType: "SOFTWARE",
  quantity: 1,
};
const training = {
  productType: "DIGITAL",
  r6ProductType: "TRAINING_SERVICE",
  quantity: 1,
};
const item = (...components) => ({ components });
const bundle = item(book(2), software, training);

const cases = [
  ["one book", [item(book())], 10000],
  ["two books", [item(book(2))], 15000],
  ["three books", [item(book(3))], 0],
  ["four books", [item(book(4))], 0],
  ["platinum bundle", [bundle], 0],
  ["bundle + one standalone", [bundle, item(book())], 10000],
  ["bundle + two standalone", [bundle, item(book(2))], 15000],
  ["bundle + three standalone", [bundle, item(book(3))], 0],
  ["two separate book rows", [item(book()), item(book())], 15000],
  ["software alone", [item(software)], 0],
  ["training alone", [item(training)], 0],
  ["bundle + software + one book", [bundle, item(software), item(book())], 10000],
];

for (const [name, cart, expected] of cases) {
  assert.equal(shipping(cart), expected, name);
  console.log(`PASS ${name}`);
}

assert.equal(countPhysicalBooks([book(2), software]), 2);
assert.throws(
  () => countPhysicalBooks([{
    productType: "PHYSICAL",
    r6ProductType: "OTHER",
    quantity: 1,
  }]),
  /UNSUPPORTED_PHYSICAL_SHIPPING_TYPE/
);
assert.throws(
  () => countPhysicalBooks([book(0)]),
  /BOOK_QUANTITY_INVALID/
);
console.log("R311=PASS; CASES=12; SAFETY_ASSERTIONS=3");