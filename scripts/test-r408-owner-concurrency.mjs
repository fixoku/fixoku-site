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

  async function start(){
    const client=await db.connect();

    try {
      await client.query("begin");

      await client.query(
        "select pg_advisory_xact_lock(hashtext($1))",
        ["R408_OWNER_PAYTR_TEST_GLOBAL"]
      );

      const active=await client.query(`
        select merchant_oid
        from paytr_owner_test_attempts
        where status in (
          'CREATED','TOKEN_PENDING',
          'TOKEN_READY','REVIEW_REQUIRED'
        )
        or last_error_code='CONFLICTING_CALLBACK'
        limit 1 for update
      `);

      if(active.rowCount){
        await client.query("rollback");
        return null;
      }

      const oid=createOwnerTestReference();

      await client.query(`
        insert into paytr_owner_test_attempts
          (owner_user_id,merchant_oid,status)
        values($1,$2,'TOKEN_PENDING')
      `,[owner.id,oid]);

      await client.query("commit");
      return oid;

    }catch(error){
      await client.query("rollback").catch(()=>{});
      throw error;
    }finally{
      client.release();
    }
  }

  const results=await Promise.all(
    Array.from({length:20},()=>start())
  );

  const accepted=results.filter(Boolean);

  assert.equal(accepted.length,1);
  pass("TWENTY_CONCURRENT_STARTS_SINGLE_RECORD");

  const oid=accepted[0];

  async function read(){
    return (await db.query(`
      select * from paytr_owner_test_attempts
      where merchant_oid=$1
    `,[oid])).rows[0];
  }

  assert.equal((await read()).status,"TOKEN_PENDING");
  pass("SINGLE_PENDING_TEST");

  await db.query(`
    update paytr_owner_test_attempts
    set status='TOKEN_READY',
        created_at=now()-interval '31 minutes',
        expires_at=now()-interval '1 minute'
    where merchant_oid=$1
  `,[oid]);

  assert.equal(await start(),null);
  pass("EXPIRED_UNCERTAIN_TEST_BLOCKS_RETRY");

  const digest="a".repeat(64);

  async function simulateVerifiedCallback(hash,status){
    const client=await db.connect();

    try{
      await client.query("begin");

      const row=(await client.query(`
        select * from paytr_owner_test_attempts
        where merchant_oid=$1 for update
      `,[oid])).rows[0];

      if(["SUCCEEDED","FAILED"].includes(row.status)){
        if(row.callback_hash_sha256===hash){
          await client.query(`
            update paytr_owner_test_attempts
            set callback_count=callback_count+1
            where merchant_oid=$1
          `,[oid]);
        }else{
          await client.query(`
            update paytr_owner_test_attempts
            set last_error_code='CONFLICTING_CALLBACK',
                callback_count=callback_count+1
            where merchant_oid=$1
          `,[oid]);
        }

        await client.query("commit");
        return;
      }

      assert.equal(status,"success");

      await client.query(`
        update paytr_owner_test_attempts
        set status='SUCCEEDED',
            callback_hash_sha256=$2,
            callback_received_at=now(),
            completed_at=now(),
            callback_count=callback_count+1,
            collected_amount_minor=100,
            provider_verified=true
        where merchant_oid=$1
      `,[oid,hash]);

      await client.query("commit");

    }catch(error){
      await client.query("rollback").catch(()=>{});
      throw error;
    }finally{
      client.release();
    }
  }

  await Promise.all(
    Array.from({length:20},
      ()=>simulateVerifiedCallback(digest,"success"))
  );

  const verified=await read();

  assert.equal(verified.status,"SUCCEEDED");
  assert.equal(verified.callback_count,20);
  assert.equal(verified.collected_amount_minor,100);

  pass("TWENTY_CONCURRENT_CALLBACK_RECORD_UPDATES");

  assert.ok(
    new Date(verified.callback_received_at) >
    new Date(verified.expires_at)
  );

  pass("LATE_VERIFIED_RESULT_CAN_BE_PERSISTED");

  const completedAt=String(verified.completed_at);

  await simulateVerifiedCallback("b".repeat(64),"failed");

  const conflict=await read();

  assert.equal(conflict.status,"SUCCEEDED");
  assert.equal(conflict.last_error_code,"CONFLICTING_CALLBACK");
  assert.equal(String(conflict.completed_at),completedAt);
  assert.equal(conflict.collected_amount_minor,100);

  pass("CONFLICT_PRESERVES_SUCCESSFUL_RESULT");

  assert.equal(await start(),null);

  pass("CONFLICT_BLOCKS_NEW_TEST");

  assert.deepEqual(await snapshot(),before);

  pass("COMMERCIAL_RECORD_CONTENT_UNCHANGED");

  console.log("CONCURRENCY_DB_TEST_COUNT="+count);
  console.log("ACTUAL_CALLBACK_HANDLER_TEST=DEFERRED");
  console.log("R408_TOPLU_A8_DB_CONCURRENCY=PASS");

}finally{
  if(db) await db.end();

  if(created){
    await admin.query(`drop database ${quote(name)}`);
    console.log("DISPOSABLE_DATABASE_CLEANUP=PASS");
  }

  await admin.end();
}