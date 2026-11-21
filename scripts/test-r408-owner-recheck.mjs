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

  const { Readable } = await import("node:stream");

  const { executeOwnerTestRequest } = await import(
    "../api/owner/paytr-acceptance-r408.js"
  );

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

  let providerCalls=0;

  const ownerTestPrincipal=id=>({
    user:{id,emailVerified:true},
    session:{user:{id,twoFactorEnabled:true}},
    memberships:[{
      role:"OWNER",
      status:"ACTIVE",
      scopeType:"GLOBAL",
      scopeId:null
    }]
  });

  async function request(oid,{
    id=owner.id,
    confirm=true,
    statusRequester
  }={}){
    const req=Readable.from([
      Buffer.from(JSON.stringify({
        action:"RECHECK_TEST",
        confirmTestOnly:confirm,
        merchantOid:oid
      }))
    ]);

    req.method="POST";
    req.url="/api/owner/paytr-acceptance-r408";
    req.headers={origin:"https://fixoku.com"};

    let output="";

    const res={
      statusCode:200,
      setHeader(){},
      end(value=""){output=String(value);}
    };

    await executeOwnerTestRequest(req,res,{
      env,
      injectedPool:db,
      principalResolver:async()=>ownerTestPrincipal(id),
      statusRequester:async(...args)=>{
        providerCalls++;

        if(statusRequester)
          return statusRequester(...args);

        return {...provider};
      }
    });

    return {
      status:res.statusCode,
      body:JSON.parse(output)
    };
  }

  async function read(oid){
    return (await db.query(`
      select * from paytr_owner_test_attempts
      where merchant_oid=$1
    `,[oid])).rows[0];
  }

  async function prepare(withCallback=true){
    const oid=createOwnerTestReference();

    await db.query(`
      insert into paytr_owner_test_attempts
        (owner_user_id,merchant_oid,status)
      values($1,$2,'TOKEN_READY')
    `,[owner.id,oid]);

    if(withCallback){
      const hash=crypto.createHmac(
        "sha256",env.PAYTR_MERCHANT_KEY
      ).update(
        oid+env.PAYTR_MERCHANT_SALT+"success100"
      ).digest("base64");

      const response=await executeOwnerTestCallback({
        merchant_oid:oid,
        status:"success",
        total_amount:"100",
        test_mode:"1",
        hash
      },{
        env,
        injectedPool:db,
        statusRequester:async()=>{
          throw new Error("SIMULATED_PROVIDER_TIMEOUT");
        }
      });

      assert.equal(response.status,503);
      assert.equal((await read(oid)).status,"REVIEW_REQUIRED");
    }

    return oid;
  }

  const oid=await prepare();

  let result=await request(oid,{confirm:false});

  assert.equal(result.status,400);
  assert.equal(providerCalls,0);
  pass("RECHECK_CONFIRMATION_REQUIRED");

  result=await request(oid,{id:crypto.randomUUID()});

  assert.equal(result.status,404);
  assert.equal(providerCalls,0);
  pass("CROSS_OWNER_RECHECK_REJECTED");

  result=await request(createOwnerTestReference());

  assert.equal(result.status,404);
  assert.equal(providerCalls,0);
  pass("UNKNOWN_REFERENCE_REJECTED");

  const missing=await prepare(false);

  result=await request(missing);

  assert.equal(result.status,409);
  assert.equal(providerCalls,0);
  pass("MISSING_CALLBACK_EVIDENCE_REJECTED");

  const conflict=await prepare();

  await db.query(`
    update paytr_owner_test_attempts
    set last_error_code='CONFLICTING_CALLBACK'
    where merchant_oid=$1
  `,[conflict]);

  result=await request(conflict);

  assert.equal(result.status,409);
  assert.equal(providerCalls,0);
  pass("CONFLICT_AUTOMATIC_RESOLUTION_REJECTED");

  result=await request(oid,{
    statusRequester:async()=>{
      throw new Error("SIMULATED_TIMEOUT");
    }
  });

  assert.equal(result.status,503);
  assert.equal((await read(oid)).status,"REVIEW_REQUIRED");
  pass("RECHECK_TIMEOUT_PRESERVES_REVIEW");

  result=await request(oid,{
    statusRequester:async()=>({
      ...provider,
      payment_amount:"2.00",
      payment_total:"2.00"
    })
  });

  assert.equal(result.status,503);
  assert.equal((await read(oid)).status,"REVIEW_REQUIRED");
  pass("RECHECK_WRONG_AMOUNT_REJECTED");

  result=await request(oid,{
    statusRequester:async()=>({
      ...provider,
      test_mode:"0"
    })
  });

  assert.equal(result.status,503);
  assert.equal((await read(oid)).status,"REVIEW_REQUIRED");
  pass("RECHECK_LIVE_MODE_REJECTED");

  const beforeSuccess=await read(oid);
  const callsBefore=providerCalls;

  const concurrent=await Promise.all(
    Array.from({length:10},()=>request(oid))
  );

  assert.equal(
    concurrent.filter(r=>r.status===200).length,1
  );

  assert.equal(
    concurrent.filter(r=>r.status===409).length,9
  );

  assert.equal(providerCalls-callsBefore,1);

  pass("TEN_CONCURRENT_RECHECKS_SINGLE_VERIFICATION");

  const final=await read(oid);

  assert.equal(final.status,"SUCCEEDED");
  assert.equal(final.provider_verified,true);
  assert.equal(final.collected_amount_minor,100);

  pass("VERIFIED_RECHECK_SUCCEEDED");

  assert.equal(
    final.callback_count,
    beforeSuccess.callback_count
  );

  assert.equal(
    final.callback_hash_sha256,
    beforeSuccess.callback_hash_sha256
  );

  assert.equal(
    String(final.callback_received_at),
    String(beforeSuccess.callback_received_at)
  );

  pass("ORIGINAL_CALLBACK_EVIDENCE_PRESERVED");

  result=await request(oid);

  assert.equal(result.status,409);
  assert.equal(providerCalls-callsBefore,1);
  pass("COMPLETED_RECHECK_CANNOT_REPEAT");

  assert.deepEqual(await snapshot(),before);
  pass("COMMERCIAL_RECORD_CONTENT_UNCHANGED");

  assert.equal(count,13);

  console.log("RECHECK_FUNCTIONAL_TEST_COUNT="+count);
  console.log("REAL_PROVIDER_NETWORK=NOT_USED");
  console.log("R408_TOPLU_A12_RECHECK=PASS");
}finally{
  if(db) await db.end();

  if(created){
    await admin.query(`drop database ${quote(name)}`);
    console.log("DISPOSABLE_DATABASE_CLEANUP=PASS");
  }

  await admin.end();
}