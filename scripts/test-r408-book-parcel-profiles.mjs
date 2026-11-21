import assert from "node:assert/strict";

import {
  normalizeBookParcelProfile,
  validateBookParcelProfiles,
  countShipmentBooks,
  buildBookParcelPlan
} from "../src/server/shipping/book-parcel-profiles-r408.js";

globalThis.fetch = () => {
  throw new Error("EXTERNAL_NETWORK_FORBIDDEN");
};

const profiles = Array.from({ length: 10 }, (_, i) => ({
  bookCount: i + 1,
  packageCount: 1,
  widthCm: 20,
  lengthCm: 30,
  heightCm: i + 1,
  weightKg: (i + 1) / 2
}));

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(name + "=PASS");
}

test("TEN_PROFILES_VALID", () => {
  assert.equal(validateBookParcelProfiles(profiles).length,10);
});

test("SINGLE_BOOK_SINGLE_PARCEL", () => {
  assert.equal(buildBookParcelPlan(1,profiles).packageCount,1);
});

test("TEN_BOOKS_SINGLE_PARCEL", () => {
  assert.equal(buildBookParcelPlan(10,profiles).packageCount,1);
});

test("ELEVEN_BOOKS_TWO_PARCELS", () => {
  assert.deepEqual(
    buildBookParcelPlan(11,profiles).parcels.map(p=>p.bookCount),
    [10,1]
  );
});

test("TWENTY_FOUR_BOOKS_THREE_PARCELS", () => {
  assert.deepEqual(
    buildBookParcelPlan(24,profiles).parcels.map(p=>p.bookCount),
    [10,10,4]
  );
});

test("ZERO_BOOKS_NO_SHIPMENT", () => {
  assert.equal(buildBookParcelPlan(0,[]).packageCount,0);
});

test("DESI_FORMULA", () => {
  assert.equal(
    normalizeBookParcelProfile(profiles[4]).estimatedDesi,1
  );
});

test("TOTAL_WEIGHT", () => {
  assert.equal(buildBookParcelPlan(24,profiles).totalWeightKg,12);
});

test("DIGITAL_AND_SERVICE_EXCLUDED", () => {
  assert.equal(countShipmentBooks([
    {r6ProductType:"BOOK",productType:"PHYSICAL",quantity:4},
    {r6ProductType:"SOFTWARE",quantity:5},
    {r6ProductType:"TRAINING_SERVICE",quantity:8}
  ]),4);
});

test("MISSING_PROFILE_BLOCKED", () => {
  assert.throws(
    ()=>buildBookParcelPlan(4,[]),
    /BOOK_PARCEL_PROFILE_MISSING/
  );
});

test("INVALID_MEASUREMENT_BLOCKED", () => {
  assert.throws(
    ()=>normalizeBookParcelProfile({...profiles[0],heightCm:0}),
    /PARCEL_HEIGHT_INVALID/
  );
});

test("INVALID_WEIGHT_BLOCKED", () => {
  assert.throws(
    ()=>normalizeBookParcelProfile({...profiles[0],weightKg:-1}),
    /PARCEL_WEIGHT_INVALID/
  );
});

test("DUPLICATE_PROFILE_BLOCKED", () => {
  assert.throws(
    ()=>validateBookParcelProfiles([profiles[0],profiles[0]],false),
    /BOOK_PROFILE_DUPLICATE/
  );
});

test("UNKNOWN_PHYSICAL_PRODUCT_BLOCKED", () => {
  assert.throws(
    ()=>countShipmentBooks([{productType:"PHYSICAL",quantity:1}]),
    /NON_BOOK_PHYSICAL_ITEM_REVIEW_REQUIRED/
  );
});

test("DISPATCH_PLAN_SNAPSHOT_INDEPENDENT", () => {
  const plan = buildBookParcelPlan(1,profiles);

  const changed = profiles.map(p=>({...p,weightKg:9}));
  assert.equal(plan.totalWeightKg,0.5);
  assert.equal(buildBookParcelPlan(1,changed).totalWeightKg,9);
});

assert.equal(passed,15);
console.log("BOOK_PARCEL_TEST_COUNT=15/15");
console.log("REAL_PROVIDER_NETWORK=NOT_USED");