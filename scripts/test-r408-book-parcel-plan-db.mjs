import assert from "node:assert/strict";

import {
  calculateShipmentParcelPlan
} from "../src/server/shipping/book-parcel-plan-db-r408.js";

globalThis.fetch = () => {
  throw new Error("NETWORK_FORBIDDEN");
};

const id = "123e4567-e89b-42d3-a456-426614174000";
const orderId = "123e4567-e89b-42d3-a456-426614174001";

const profiles = Array.from({length:10},(_,i)=>({
  bookCount:i+1,
  packageCount:1,
  widthCm:"20.000",
  lengthCm:"30.000",
  heightCm:String(i+1),
  weightKg:String((i+1)/2)
}));

const book = quantity => ({
  quantity,
  productType:"PHYSICAL",
  r6ProductType:"BOOK"
});

function database({
  exists=true,
  paid=true,
  items=[book(4)],
  settings=profiles
}={}) {
  const queries=[];

  return {
    queries,
    async query(sql,args) {
      queries.push({sql,args});

      if (/\b(insert|update|delete|alter|drop)\b/i.test(sql))
        throw new Error("UNEXPECTED_DATABASE_WRITE");

      if (sql.includes('as "orderStatus"'))
        return {rows:exists ? [{
          id,orderId,
          status:"PREPARING",
          orderStatus:paid?"PAID":"PENDING_PAYMENT"
        }] : []};

      if (sql.includes('as "r6ProductType"'))
        return {rows:items};

      if (sql.includes("book_parcel_profiles_r408"))
        return {rows:settings};

      throw new Error("UNEXPECTED_QUERY");
    }
  };
}

let passed=0;

async function test(name,fn) {
  await fn();
  passed++;
  console.log(name+"=PASS");
}

await test("STUDENT_ORDER_BOOK_COUNT",async()=>{
  const db=database();
  const p=await calculateShipmentParcelPlan(db,"STUDENT",id);
  assert.equal(p.bookCount,4);
  assert.equal(p.packageCount,1);
  assert.equal(p.totalWeightKg,2);
});

await test("TRAINER_ORDER_BOOK_COUNT",async()=>{
  const db=database({items:[book(24)]});
  const p=await calculateShipmentParcelPlan(db,"TRAINER",id);

  assert.deepEqual(
    p.parcels.map(x=>x.bookCount),
    [10,10,4]
  );

  assert(db.queries.some(
    x=>x.sql.includes("trainer_order_shipment_items")
  ));
});

await test("MULTIPLE_BOOK_LINES_SUMMED",async()=>{
  const db=database({items:[book(3),book(5)]});
  const p=await calculateShipmentParcelPlan(db,"STUDENT",id);
  assert.equal(p.bookCount,8);
});

await test("DIGITAL_LINES_EXCLUDED",async()=>{
  const db=database({items:[
    book(2),
    {quantity:7,r6ProductType:"SOFTWARE",productType:"DIGITAL"}
  ]});

  const p=await calculateShipmentParcelPlan(db,"STUDENT",id);
  assert.equal(p.bookCount,2);
});

await test("UNPAID_ORDER_BLOCKED",async()=>{
  const db=database({paid:false});

  await assert.rejects(
    ()=>calculateShipmentParcelPlan(db,"STUDENT",id),
    /PAYMENT_NOT_SETTLED/
  );

  assert.equal(db.queries.length,1);
});

await test("UNKNOWN_SHIPMENT_BLOCKED",async()=>{
  await assert.rejects(
    ()=>calculateShipmentParcelPlan(
      database({exists:false}),"STUDENT",id
    ),
    /SHIPMENT_NOT_FOUND/
  );
});

await test("EMPTY_SHIPMENT_BLOCKED",async()=>{
  await assert.rejects(
    ()=>calculateShipmentParcelPlan(
      database({items:[]}),"STUDENT",id
    ),
    /PHYSICAL_ITEMS_REQUIRED/
  );
});

await test("DIGITAL_ONLY_SHIPMENT_BLOCKED",async()=>{
  await assert.rejects(
    ()=>calculateShipmentParcelPlan(
      database({items:[
        {quantity:1,r6ProductType:"SOFTWARE"}
      ]}),"STUDENT",id
    ),
    /BOOK_SHIPMENT_NOT_REQUIRED/
  );
});

await test("UNKNOWN_PHYSICAL_ITEM_BLOCKED",async()=>{
  await assert.rejects(
    ()=>calculateShipmentParcelPlan(
      database({items:[
        {quantity:1,productType:"PHYSICAL"}
      ]}),"TRAINER",id
    ),
    /NON_BOOK_PHYSICAL_ITEM_REVIEW_REQUIRED/
  );
});

await test("MISSING_OWNER_PROFILE_BLOCKED",async()=>{
  await assert.rejects(
    ()=>calculateShipmentParcelPlan(
      database({settings:[]}),"STUDENT",id
    ),
    /BOOK_PARCEL_PROFILE_MISSING/
  );
});

await test("INVALID_SHIPMENT_KIND_BLOCKED",async()=>{
  const db=database();

  await assert.rejects(
    ()=>calculateShipmentParcelPlan(db,"INVALID",id),
    /SHIPMENT_REFERENCE_INVALID/
  );

  assert.equal(db.queries.length,0);
});

await test("INVALID_SHIPMENT_ID_BLOCKED",async()=>{
  const db=database();

  await assert.rejects(
    ()=>calculateShipmentParcelPlan(db,"STUDENT","invalid"),
    /SHIPMENT_REFERENCE_INVALID/
  );

  assert.equal(db.queries.length,0);
});

await test("ORDER_ID_BOUND_IN_PLAN",async()=>{
  const p=await calculateShipmentParcelPlan(
    database(),"STUDENT",id
  );

  assert.equal(p.shipmentId,id);
  assert.equal(p.orderId,orderId);
  assert.equal(p.source,"OWNER_BOOK_PARCEL_PROFILES");
});

await test("READ_ONLY_QUERIES",async()=>{
  const db=database();

  await calculateShipmentParcelPlan(db,"STUDENT",id);

  assert.equal(db.queries.length,3);

  for (const q of db.queries)
    assert.match(q.sql.trim(),/^select\b/i);
});

assert.equal(passed,14);

console.log("PARCEL_QUERY_CONTRACT_TESTS=14/14_PASS");
console.log("DATABASE_DRIVER=SIMULATED");
console.log("REAL_PROVIDER_NETWORK=NOT_USED");