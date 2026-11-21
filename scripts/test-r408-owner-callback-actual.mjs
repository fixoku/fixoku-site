import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import {
  createOwnerTestReference
} from "../src/server/payments/paytr-owner-test-r408.js";

const url=new URL(process.env.R408_TEST_DATABASE_URL);

assert.equal(url.hostname,"127.0.0.1");
assert.equal(url.port,"51880");
assert.equal(url.pathname,"/postgres");
assert.equal(process.env.NODE_ENV,"test");
assert.equal(process.env.VERCEL_ENV ?? "","");
assert.equal(process.env.PAYTR_ENABLED,"0");

globalThis.fetch=async()=>{
  throw new Error("EXTERNAL_NETWORK_FORBIDDEN");
};

const admin=new pg.Pool({
  connectionString:url.toString(),
  max:1
});

const name="fixoku_test_r408_a8_"+
  crypto.randomBytes(6).toString("hex");

let db;
let created=false;
let count=0;

function pass(label){
  count++;
  console.log(label+"=PASS");
}

const quote=s=>'"'+String(s).replaceAll('"','""')+'"';

try {
  const identity=(await admin.query(
    "select current_database() as db,current_user as usr"
  )).rows[0];

  assert.equal(identity.db,"postgres");
  assert.equal(identity.usr,"fixoku_test");

  await admin.query(
    `create database ${quote(name)} template "r405_acceptance_20261119_1915"`
  );

  created=true;

  url.pathname="/"+name;

  db=new pg.Pool({
    connectionString:url.toString(),
    max:8
  });

  assert.equal(
    (await db.query("select current_database() as db"))
      .rows[0].db,name
  );

  await db.query(fs.readFileSync(
    "drizzle/controlled-migrations/r408/R408_01_PAYTR_OWNER_TEST.sql",
    "utf8"
  ));

  const owner=(await db.query(
    "select id from platform_users order by id limit 1"
  )).rows[0];

  assert.ok(owner?.id);

  const tables=[
    "orders",
    "trainer_package_orders",
    "shipments",
    "trainer_order_shipments",
    "package_entitlements",
    "owner_finance_ledger"
  ];

  async function snapshot(){
    const data={};

    for(const table of tables){
      data[table]=(await db.query(`
        select count(*)::text as count,
          md5(coalesce(string_agg(
            md5(to_jsonb(t)::text),''
            order by md5(to_jsonb(t)::text)
          ),'')) as digest
        from public.${quote(table)} t
      `)).rows[0];
    }

    return data;
  }

  const before=await snapshot();

  const { executeOwnerTestCallback } = await import(
    "../src/server/payments/paytr-owner-callback-r408.js"
  );

  const env={
    NODE_ENV:"production",
    VERCEL_ENV:"production",
    APP_ORIGIN:"https://fixoku.com",
    FIXOKU_PAYTR_OWNER_TEST_ENABLED:"1",
    FIXOKU_PRODUCTION_RUNTIME_ENABLED:"1",
    PAYTR_ENABLED:"1",
    PAYTR_TEST_MODE:"1",
    PAYTR_LIVE_APPROVED:"0",
    PAYTR_LIVE_RUNTIME_VERIFIED:"0",
    PAYTR_MERCHANT_ID:"999999",
    PAYTR_MERCHANT_KEY:crypto.randomBytes(32).toString("hex"),
    PAYTR_MERCHANT_SALT:crypto.randomBytes(32).toString("hex"),
    PAYTR_CALLBACK_URL:"https://fixoku.com/api/paytr/callback",
    PAYTR_OK_URL:"https://fixoku.com/api/paytr/return-success",
    PAYTR_FAIL_URL:"https://fixoku.com/api/paytr/return-failure"
  };

  let providerCalls=0;

  const provider={
    status:"success",
    test_mode:"1",
    payment_amount:"1.00",
    payment_total:"1.00",
    currency:"TL",
    taksit:"0",
    odeme_tipi:"KART",
    returns:[]
  };

  const deps={
    env,
    injectedPool:db,
    statusRequester:async()=>{
      providerCalls++;
      return {...provider};
    }
  };

  function signed(oid,status="success",amount="100"){
    const hash=crypto.createHmac(
      "sha256",env.PAYTR_MERCHANT_KEY
    ).update(
      oid+env.PAYTR_MERCHANT_SALT+status+amount
    ).digest("base64");

    return {
      merchant_oid:oid,
      status,
      total_amount:amount,
      test_mode:"1",
      hash
    };
  }

  async function newAttempt(){
    const oid=createOwnerTestReference();

    await db.query(`
      insert into paytr_owner_test_attempts
        (owner_user_id,merchant_oid,status)
      values($1,$2,'TOKEN_READY')
    `,[owner.id,oid]);

    return oid;
  }

  async function read(oid){
    return (await db.query(`
      select * from paytr_owner_test_attempts
      where merchant_oid=$1
    `,[oid])).rows[0];
  }

  const oid=await newAttempt();

  const invalid=await executeOwnerTestCallback(
    {...signed(oid),hash:"invalid"},deps
  );

  assert.equal(invalid.status,401);
  assert.equal(providerCalls,0);
  pass("ACTUAL_INVALID_SIGNATURE_REJECTED");

  const wrongAmount=await executeOwnerTestCallback(
    signed(oid,"success","200"),deps
  );

  assert.notEqual(wrongAmount.status,200);
  assert.equal(providerCalls,0);
  assert.equal((await read(oid)).status,"TOKEN_READY");
  pass("ACTUAL_WRONG_AMOUNT_REJECTED");

  const unknown=await executeOwnerTestCallback(
    signed(createOwnerTestReference()),deps
  );

  assert.equal(unknown.status,404);
  assert.equal(providerCalls,0);
  pass("ACTUAL_UNKNOWN_ATTEMPT_REJECTED");

  await db.query(`
    update paytr_owner_test_attempts
    set created_at=now()-interval '31 minutes',
        expires_at=now()-interval '1 minute'
    where merchant_oid=$1
  `,[oid]);

  const results=await Promise.all(
    Array.from({length:20},()=>
      executeOwnerTestCallback(signed(oid),deps)
    )
  );

  assert.ok(results.every(
    result=>result.status===200&&result.body==="OK"
  ));

  const row=await read(oid);

  assert.equal(row.status,"SUCCEEDED");
  assert.equal(row.callback_count,20);
  assert.equal(row.provider_verified,true);
  assert.equal(row.collected_amount_minor,100);
  assert.equal(providerCalls,1);

  pass("ACTUAL_TWENTY_CALLBACKS_SINGLE_PROVIDER_VERIFICATION");

  assert.ok(
    new Date(row.callback_received_at)>
    new Date(row.expires_at)
  );

  pass("ACTUAL_LATE_CALLBACK_ACCEPTED");

  const conflict=await executeOwnerTestCallback(
    signed(oid,"failed","0"),deps
  );

  assert.equal(conflict.status,409);

  const preserved=await read(oid);

  assert.equal(preserved.status,"SUCCEEDED");
  assert.equal(preserved.last_error_code,"CONFLICTING_CALLBACK");
  assert.equal(preserved.collected_amount_minor,100);
  assert.equal(
    String(preserved.completed_at),
    String(row.completed_at)
  );

  pass("ACTUAL_CONFLICT_PRESERVES_SUCCESS");

  const uncertainOid=await newAttempt();

  const uncertain=await executeOwnerTestCallback(
    signed(uncertainOid),
    {
      ...deps,
      statusRequester:async()=>{
        throw new Error("SIMULATED_PROVIDER_TIMEOUT");
      }
    }
  );

  assert.equal(uncertain.status,503);
  assert.equal(
    (await read(uncertainOid)).status,
    "REVIEW_REQUIRED"
  );

  pass("ACTUAL_PROVIDER_TIMEOUT_REVIEW_REQUIRED");

  const reconciled=await executeOwnerTestCallback(
    signed(uncertainOid),deps
  );

  assert.equal(reconciled.status,200);
  assert.equal((await read(uncertainOid)).status,"SUCCEEDED");

  pass("ACTUAL_VALID_RETRY_RESOLVES_UNCERTAIN_CALLBACK");

  const modeOid=await newAttempt();

  const modeResult=await executeOwnerTestCallback(
    signed(modeOid),
    {
      ...deps,
      statusRequester:async()=>({
        ...provider,
        test_mode:"0"
      })
    }
  );

  assert.equal(modeResult.status,503);
  assert.equal((await read(modeOid)).status,"REVIEW_REQUIRED");

  pass("ACTUAL_LIVE_PROVIDER_MODE_REJECTED");

  const failedOid=await newAttempt();

  const failure=await executeOwnerTestCallback(
    signed(failedOid,"failed","0"),deps
  );

  assert.equal(failure.status,200);
  assert.equal((await read(failedOid)).status,"FAILED");

  pass("ACTUAL_FAILED_CALLBACK_RECORDED");

  assert.deepEqual(await snapshot(),before);

  pass("COMMERCIAL_RECORD_CONTENT_UNCHANGED");

  assert.equal(count,11);

  console.log("ACTUAL_CALLBACK_TEST_COUNT="+count);
  console.log("REAL_PROVIDER_NETWORK=NOT_USED");
  console.log("R408_TOPLU_A9_ACTUAL_CALLBACK=PASS");
}finally{
  if(db) await db.end();

  if(created){
    await admin.query(`drop database ${quote(name)}`);
    console.log("DISPOSABLE_DATABASE_CLEANUP=PASS");
  }

  await admin.end();
}