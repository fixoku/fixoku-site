import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import pg from "pg";

import {
  createOwnerTestReference,
  assertOwnerTestCallback
} from "../src/server/payments/paytr-owner-test-r408.js";

const source = new URL(process.env.R408_TEST_DATABASE_URL);

assert.equal(source.hostname,"127.0.0.1");
assert.equal(source.port,"51880");
assert.equal(source.pathname,"/postgres");
assert.equal(process.env.NODE_ENV,"test");
assert.equal(process.env.VERCEL_ENV ?? "","");
assert.equal(process.env.PAYTR_ENABLED,"0");

const admin = new pg.Pool({
  connectionString:source.toString(),
  max:1
});

const name = "fixoku_test_r408_" +
  crypto.randomBytes(8).toString("hex");

const quote = value =>
  '"' + String(value).replaceAll('"','""') + '"';

let created = false;
let db;
let count = 0;

function pass(label) {
  count++;
  console.log(label+"=PASS");
}

async function rejected(sql,params,code) {
  let actual;
  try {
    await db.query(sql,params);
  } catch (error) {
    actual=error.code;
  }
  assert.equal(actual,code);
}

try {
  const identity = (await admin.query(
    "select current_database() as db, current_user as usr"
  )).rows[0];

  assert.equal(identity.db,"postgres");
  assert.equal(identity.usr,"fixoku_test");
  pass("LOCAL_DATABASE_IDENTITY");

  const template = "r405_acceptance_20261119_1915";

  const exists = await admin.query(
    "select datname from pg_database where datname=$1",
    [template]
  );

  assert.equal(exists.rowCount,1);

  await admin.query(
    `create database ${quote(name)} template ${quote(template)}`
  );

  created=true;

  const target = new URL(source.toString());
  target.pathname="/"+name;

  db = new pg.Pool({
    connectionString:target.toString(),
    max:4
  });

  const targetIdentity = (await db.query(
    "select current_database() as db"
  )).rows[0];

  assert.equal(targetIdentity.db,name);

  pass("DISPOSABLE_CLONE_IDENTITY");

  const tables = [
    "orders",
    "trainer_package_orders",
    "shipments",
    "trainer_order_shipments",
    "package_entitlements",
    "owner_finance_ledger",
    "platform_users"
  ];

  async function snapshot() {
    const result={};

    for (const table of tables) {
      const row=(await db.query(
        `select count(*)::text as count from public.${quote(table)}`
      )).rows[0];

      result[table]=row.count;
    }

    return result;
  }

  const before=await snapshot();

  await db.query(fs.readFileSync(
    "drizzle/controlled-migrations/r408/R408_01_PAYTR_OWNER_TEST.sql",
    "utf8"
  ));

  pass("R408_ADDITIVE_MIGRATION");

  const user = (await db.query(
    "select id from public.platform_users order by id limit 1"
  )).rows[0];

  assert.ok(user?.id);

  const oid=createOwnerTestReference();

  const insert=`
    insert into public.paytr_owner_test_attempts
      (owner_user_id,merchant_oid)
    values ($1,$2)
    returning *
  `;

  const row=(await db.query(insert,[user.id,oid])).rows[0];

  assert.equal(row.environment,"TEST");
  assert.equal(row.amount_minor,100);
  assert.equal(row.currency,"TRY");
  assert.equal(row.status,"CREATED");

  pass("TEST_RECORD_DEFAULTS");

  const ttl=new Date(row.expires_at).getTime()-
    new Date(row.created_at).getTime();

  assert.equal(ttl,1800000);

  pass("TEST_RECORD_EXPIRY");

  await rejected(insert,[user.id,oid],"23505");
  pass("DUPLICATE_REFERENCE_REJECTED");

  await rejected(insert,[user.id,"INVALID"],"23514");
  pass("NORMAL_REFERENCE_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set environment='LIVE' where id=$1",
    [row.id],"23514"
  );

  pass("LIVE_ENVIRONMENT_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set amount_minor=200 where id=$1",
    [row.id],"23514"
  );

  pass("WRONG_AMOUNT_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set currency='USD' where id=$1",
    [row.id],"23514"
  );

  pass("WRONG_CURRENCY_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set status='PAID' where id=$1",
    [row.id],"23514"
  );

  pass("NORMAL_PAID_STATUS_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set status='SUCCEEDED' where id=$1",
    [row.id],"23514"
  );

  pass("UNVERIFIED_SUCCESS_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set callback_count=-1 where id=$1",
    [row.id],"23514"
  );

  pass("INVALID_CALLBACK_COUNT_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set callback_hash_sha256='invalid' where id=$1",
    [row.id],"23514"
  );

  pass("INVALID_CALLBACK_HASH_REJECTED");

  await rejected(
    "update public.paytr_owner_test_attempts set expires_at=created_at+interval '31 minutes' where id=$1",
    [row.id],"23514"
  );

  pass("INVALID_EXPIRY_REJECTED");

  await db.query(`
    update public.paytr_owner_test_attempts
    set status='SUCCEEDED',
        provider_verified=true,
        callback_hash_sha256=$2,
        callback_received_at=now(),
        completed_at=now(),
        callback_count=1,
        collected_amount_minor=100
    where id=$1
  `,[row.id,"a".repeat(64)]);

  const result=(await db.query(
    "select * from public.paytr_owner_test_attempts where id=$1",
    [row.id]
  )).rows[0];

  assert.equal(result.status,"SUCCEEDED");
  assert.equal(result.provider_verified,true);

  pass("VERIFIED_TEST_RECORD_ACCEPTED");

  assert.deepEqual(await snapshot(),before);

  pass("BUSINESS_TABLE_COUNTS_PRESERVED");

  console.log("DATABASE_TEST_COUNT="+count);

} finally {
  if (db) await db.end();

  if (created) {
    await admin.query(
      `drop database ${quote(name)}`
    );
    console.log("DISPOSABLE_DATABASE_CLEANUP=PASS");
  }

  await admin.end();
}

console.log("R408_TOPLU_A3_DB=PASS");