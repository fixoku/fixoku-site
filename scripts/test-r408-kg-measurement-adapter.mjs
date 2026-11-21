import assert from "node:assert/strict";

import {
  createKolayGelsinAdapter
} from "../src/server/shipping/kolaygelsin.js";

import {
  createMockShippingProvider
} from "../src/server/shipping/mock.js";

import {
  buildBookParcelPlan
} from "../src/server/shipping/book-parcel-profiles-r408.js";

globalThis.fetch = () => {
  throw new Error("REAL_NETWORK_FORBIDDEN");
};

delete process.env.SHIPPING_KG_LIVE_DISPATCH_APPROVED;

const profiles = Array.from({length:10},(_,i)=>({
  bookCount:i+1,
  packageCount:1,
  widthCm:25,
  lengthCm:35,
  heightCm:i+1,
  weightKg:(i+1)/2
}));

const referenceNo = "FIXOKU-R408-MEASURE";
const plan = buildBookParcelPlan(24,profiles);

function fixture(response={IsSuccess:true},{
  allowDispatch=true,
  baseUrl="https://apiintg.kolaygelsin.com",
  httpOk=true,
  timeout=false
}={}) {
  const requests=[];

  const provider=createKolayGelsinAdapter({
    token:"SYNTHETIC_TEST_TOKEN",
    baseUrl,
    allowDispatch,

    fetchImpl:async(url,options)=>{
      requests.push({url,options});

      if(timeout)
        throw Object.assign(
          new Error("Synthetic timeout"),
          {name:"AbortError"}
        );

      return {
        ok:httpOk,
        json:async()=>response
      };
    }
  });

  return {provider,requests};
}

let passed=0;

async function test(name,fn) {
  await fn();
  passed++;
  console.log(name+"=PASS");
}

await test("MEASUREMENT_ENDPOINT",async()=>{
  const {provider,requests}=fixture();

  await provider.updateMeasurements(referenceNo,plan);

  assert.equal(
    requests[0].url,
    "https://apiintg.kolaygelsin.com/api/Cargo/CargoMeasurementUpdate"
  );

  assert.equal(requests[0].options.method,"POST");
});

await test("MEASUREMENT_BODY",async()=>{
  const {provider,requests}=fixture();

  await provider.updateMeasurements(referenceNo,plan);

  const body=JSON.parse(requests[0].options.body);

  assert.equal(body.customerReferenceNo,referenceNo);
  assert.equal(body.measurements.length,2);
  assert.deepEqual(
    body.measurements.map(x=>x.quantity),
    [2,1]
  );
});

await test("MEASUREMENT_CONFIRMATION",async()=>{
  const {provider}=fixture();

  assert.deepEqual(
    await provider.updateMeasurements(referenceNo,plan),
    {
      confirmed:true,
      referenceNo,
      packageCount:3
    }
  );
});

await test("NO_CREATE_REQUEST_DURING_MEASUREMENT",async()=>{
  const {provider,requests}=fixture();

  await provider.updateMeasurements(referenceNo,plan);

  assert.equal(requests.length,1);
  assert(!requests[0].url.includes("SetDelivery"));
});

await test("FALSE_PROVIDER_RESULT_BLOCKED",async()=>{
  const {provider}=fixture({IsSuccess:false});

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan)
  );
});

await test("AMBIGUOUS_PROVIDER_RESULT_BLOCKED",async()=>{
  const {provider}=fixture({});

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan),
    /KG_MEASUREMENT_NOT_CONFIRMED/
  );
});

await test("HTTP_ERROR_BLOCKED",async()=>{
  const {provider}=fixture(
    {IsSuccess:true},{httpOk:false}
  );

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan),
    /KG_PROVIDER_REJECTED/
  );
});

await test("TIMEOUT_NOT_AUTOMATICALLY_RETRIED",async()=>{
  const {provider,requests}=fixture(
    {},{timeout:true}
  );

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan),
    /KG_PROVIDER_TIMEOUT/
  );

  assert.equal(requests.length,1);
});

await test("UNAPPROVED_NETWORK_BLOCKED",async()=>{
  const {provider,requests}=fixture(
    {},{allowDispatch:false}
  );

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan),
    /KG_DISPATCH_NOT_APPROVED/
  );

  assert.equal(requests.length,0);
});

await test("UNTRUSTED_HOST_BLOCKED",async()=>{
  const {provider,requests}=fixture(
    {},{baseUrl:"https://example.invalid"}
  );

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,plan)
  );

  assert.equal(requests.length,0);
});

await test("INVALID_PLAN_NO_PROVIDER_REQUEST",async()=>{
  const {provider,requests}=fixture();

  await assert.rejects(
    ()=>provider.updateMeasurements(referenceNo,{
      ...plan,packageCount:100
    })
  );

  assert.equal(requests.length,0);
});

await test("MOCK_MEASUREMENT_SUCCESS",async()=>{
  const mock=createMockShippingProvider();

  await mock.createShipment({referenceNo});

  const result=await mock.updateMeasurements(
    referenceNo,plan
  );

  assert.equal(result.confirmed,true);
  assert.equal(mock.calls.create,1);
  assert.equal(mock.calls.measurement,1);
  assert.equal(
    mock.records.get(referenceNo)
      .measurementPayload.measurements.length,2
  );
});

await test("MOCK_UNKNOWN_REFERENCE_BLOCKED",async()=>{
  const mock=createMockShippingProvider();

  await assert.rejects(
    ()=>mock.updateMeasurements(referenceNo,plan),
    /MOCK_NOT_FOUND/
  );

  assert.equal(mock.calls.create,0);
});

await test("MOCK_TIMEOUT_PRESERVES_EXISTING_SHIPMENT",async()=>{
  const mock=createMockShippingProvider({
    behavior:{measurementError:"KG_PROVIDER_TIMEOUT"}
  });

  await mock.createShipment({referenceNo});

  await assert.rejects(
    ()=>mock.updateMeasurements(referenceNo,plan),
    /KG_PROVIDER_TIMEOUT/
  );

  assert.equal(mock.calls.create,1);
  assert.equal(mock.calls.measurement,1);
  assert(mock.records.has(referenceNo));
});

await test("MOCK_CANCELLED_SHIPMENT_MEASUREMENT_BLOCKED",async()=>{
  const mock=createMockShippingProvider();

  await mock.createShipment({referenceNo});
  await mock.cancelShipment(referenceNo);

  await assert.rejects(
    ()=>mock.updateMeasurements(referenceNo,plan),
    /MOCK_MEASUREMENT_NOT_ALLOWED/
  );

  assert.equal(mock.calls.create,1);
});

assert.equal(passed,15);

console.log("MEASUREMENT_ADAPTER_TESTS=15/15_PASS");
console.log("REAL_PROVIDER_NETWORK=NOT_USED");