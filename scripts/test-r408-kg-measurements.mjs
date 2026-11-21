import assert from "node:assert/strict";

import {
  buildBookParcelPlan
} from "../src/server/shipping/book-parcel-profiles-r408.js";

import {
  buildKgMeasurementPayload,
  assertKgMeasurementSuccess
} from "../src/server/shipping/kolaygelsin-measurements-r408.js";

globalThis.fetch = () => {
  throw new Error("NETWORK_FORBIDDEN");
};

const profiles = Array.from({length:10},(_,i)=>({
  bookCount:i+1,
  packageCount:1,
  widthCm:25,
  lengthCm:35,
  heightCm:i+1,
  weightKg:(i+1)/2
}));

const ref="FIXOKU-TEST-MEASUREMENT";

const plan=n=>buildBookParcelPlan(n,profiles);

let passed=0;

function test(name,fn) {
  fn();
  passed++;
  console.log(name+"=PASS");
}

test("SINGLE_BOOK_MEASUREMENT",()=>{
  const p=buildKgMeasurementPayload(ref,plan(1));
  assert.equal(p.measurements[0].quantity,1);
  assert.equal(p.measurements[0].weight,0.5);
});

test("REFERENCE_PRESERVED",()=>{
  assert.equal(
    buildKgMeasurementPayload(ref,plan(1)).customerReferenceNo,
    ref
  );
});

test("TWENTY_BOOKS_TWO_IDENTICAL_PARCELS",()=>{
  const p=buildKgMeasurementPayload(ref,plan(20));
  assert.equal(p.measurements.length,1);
  assert.equal(p.measurements[0].quantity,2);
});

test("TWENTY_FOUR_BOOKS_GROUPED_CORRECTLY",()=>{
  const p=buildKgMeasurementPayload(ref,plan(24));
  assert.equal(p.measurements.length,2);
  assert.deepEqual(
    p.measurements.map(x=>x.quantity),[2,1]
  );
});

test("EXACT_PROVIDER_FIELD_CONTRACT",()=>{
  const p=buildKgMeasurementPayload(ref,plan(1));

  assert.deepEqual(Object.keys(p.measurements[0]).sort(),
    ["quantity","Width","Length","Height","Deci","weight"].sort()
  );
});

test("DESI_CALCULATION",()=>{
  const p=buildKgMeasurementPayload(ref,plan(10));
  assert.equal(p.measurements[0].Deci,2.92);
});

test("DECIMAL_DIMENSIONS_ROUNDED_UP",()=>{
  const original=buildBookParcelPlan(1,profiles.map(
    p=>({...p,widthCm:25.2,lengthCm:35.1,heightCm:1.4})
  ));

  const result=buildKgMeasurementPayload(ref,original);

  assert.equal(result.measurements[0].Width,26);
  assert.equal(result.measurements[0].Length,36);
  assert.equal(result.measurements[0].Height,2);
  assert.equal(result.measurements[0].Deci,0.62);
});

test("ORIGINAL_PLAN_NOT_MUTATED",()=>{
  const original=plan(24);
  const before=JSON.stringify(original);

  buildKgMeasurementPayload(ref,original);

  assert.equal(JSON.stringify(original),before);
});

test("INVALID_REFERENCE_BLOCKED",()=>{
  assert.throws(
    ()=>buildKgMeasurementPayload("",plan(1)),
    /KG_MEASUREMENT_REFERENCE_INVALID/
  );
});

test("EMPTY_PLAN_BLOCKED",()=>{
  assert.throws(
    ()=>buildKgMeasurementPayload(ref,plan(0)),
    /KG_MEASUREMENT_PLAN_INVALID/
  );
});

test("PACKAGE_COUNT_MISMATCH_BLOCKED",()=>{
  assert.throws(
    ()=>buildKgMeasurementPayload(
      ref,{...plan(11),packageCount:1}
    ),
    /KG_MEASUREMENT_PLAN_INVALID/
  );
});

test("BOOK_COUNT_MISMATCH_BLOCKED",()=>{
  assert.throws(
    ()=>buildKgMeasurementPayload(
      ref,{...plan(11),bookCount:12}
    ),
    /KG_MEASUREMENT_BOOK_COUNT_MISMATCH/
  );
});

test("INVALID_PARCEL_SEQUENCE_BLOCKED",()=>{
  const p=plan(1);
  p.parcels[0].parcelNo=2;

  assert.throws(
    ()=>buildKgMeasurementPayload(ref,p),
    /KG_PARCEL_SEQUENCE_INVALID/
  );
});

test("EXPLICIT_PROVIDER_SUCCESS_ACCEPTED",()=>{
  assert.equal(
    assertKgMeasurementSuccess({IsSuccess:true}),true
  );
});

test("FAILED_PROVIDER_RESPONSE_REJECTED",()=>{
  for(const response of [
    {IsSuccess:false},
    {IsSuccess:"true"},
    {},
    null
  ]) {
    assert.throws(
      ()=>assertKgMeasurementSuccess(response),
      /KG_MEASUREMENT_NOT_CONFIRMED/
    );
  }
});

assert.equal(passed,15);

console.log("KG_MEASUREMENT_CONTRACT_TESTS=15/15_PASS");
console.log("REAL_PROVIDER_NETWORK=NOT_USED");