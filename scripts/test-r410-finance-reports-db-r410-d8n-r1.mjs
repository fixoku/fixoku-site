import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import { readOrderEvidenceGaps } from '../src/server/domain/r410-order-evidence-gaps.js';
import { readOwnerProfitCoverage } from '../src/server/domain/r410-owner-profit-coverage.js';
const url=new URL(process.env.TEST_DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='51880'||url.pathname!=='/postgres') throw Error('BLOCKED=LOCAL_ONLY_DATABASE_GUARD');
const name='fixoku_test_r410_d8n_r1_'+crypto.randomBytes(5).toString('hex');
const template='r404_payment_schema_20261119_164712';
const admin=new pg.Pool({connectionString:url.toString()});
let clone=null,created=false,ok=false;
try {
 const templates=await admin.query('select datname from pg_database where datname=$1',[template]);
 assert.equal(templates.rowCount,1,'BLOCKED=LOCAL_TEMPLATE_MISSING');
 await admin.query(`create database "${name}" template "${template}"`);created=true;
 url.pathname='/'+name;
 clone=new pg.Pool({connectionString:url.toString()});
 assert.equal((await clone.query('select current_database() as db')).rows[0].db,name);
 console.log('D8N_ISOLATED_CLONE=PASS');
 const required=['public.orders','public.trainer_package_orders','public.trainer_earning_ledger','public.shipments','public.trainer_order_shipments','public.order_items','public.package_entitlement_enrollments'];
 for(const table of required) {
  const available=(await clone.query('select to_regclass($1) is not null as ready',[table])).rows[0].ready;
  assert.equal(available,true,`BLOCKED=CLONE_SCHEMA_MISSING:${table}`);
 }
 console.log('D8N_EXISTING_COMMERCE_SCHEMA=PASS');
 for(const [table,filename] of [
  ['public.paytr_payment_attempts','drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql'],
  [null,'drizzle/controlled-migrations/r410/R410_01_PAYTR_FINANCE.sql'],
  ['public.r410_order_product_cost_snapshots','drizzle/controlled-migrations/r410/R410_04_PRODUCT_COST_HISTORY.sql']
 ]) {
  const has=table ? (await clone.query('select to_regclass($1) is not null as ready',[table])).rows[0].ready : false;
  if(!has) {
   assert.equal(fs.existsSync(filename),true,`BLOCKED=MIGRATION_FILE_MISSING:${filename}`);
   await clone.query(fs.readFileSync(filename,'utf8'));
  }
  if(table) assert.equal((await clone.query('select to_regclass($1) is not null as ready',[table])).rows[0].ready,true,`BLOCKED=MIGRATION_TABLE_MISSING:${table}`);
 }
 console.log('D8N_R404_PAYTR_PREREQUISITE=PASS');
  console.log('D8N_CLONE_ONLY_MIGRATIONS=PASS');
 const n=await clone.query('select count(*)::int as c from orders');
 const t=await clone.query('select count(*)::int as c from trainer_package_orders');
 assert.equal(Number(n.rows[0].c),0,'BLOCKED=CLONE_HAS_LIVE_STUDENT_ORDERS');
 assert.equal(Number(t.rows[0].c),0,'BLOCKED=CLONE_HAS_LIVE_TRAINER_ORDERS');
 console.log('D8N_NO_REAL_ORDERS_IN_CLONE=PASS');
 const filterCases=[{}, {currency:'TRY'}, {currency:'TRY',from:'2026-11-01',to:'2026-11-30'}];
 for(const filters of filterCases){
  const gaps=await readOrderEvidenceGaps(clone,filters);
  assert.equal(gaps.certifiedProfit,false);assert.equal(gaps.contributionMinor,null);
  assert.equal(gaps.scopeOrderCount,0);assert.deepEqual(gaps.rows,[]);
  const cov=await readOwnerProfitCoverage(clone,filters);
  assert.equal(cov.certifiedProfit,false);assert.equal(cov.contributionMinor,null);
  assert.equal(cov.scopeOrderCount,0);assert.deepEqual(cov.orders,[]);
 }
 console.log('D8N_REAL_SQL_EMPTY_AND_DATE_FILTERS=PASS');
 const f={currency:'TRY',packageId:crypto.randomUUID()};
 const gaps=await readOrderEvidenceGaps(clone,f);
 const cov=await readOwnerProfitCoverage(clone,f);
 assert.equal(gaps.status,'FILTER_NOT_SUPPORTED');assert.equal(cov.status,'FILTER_NOT_SUPPORTED');
 assert.equal(gaps.certifiedProfit,false);assert.equal(cov.certifiedProfit,false);
 console.log('D8N_UNSUPPORTED_FILTER_FAIL_CLOSED=PASS');
 // Verify both read paths have no write privilege dependence and never issue DML.
 const readonly=await clone.connect();
 try{
  await readonly.query('begin read only');
  const result=await readOrderEvidenceGaps(readonly,{});
  assert.equal(result.certifiedProfit,false);
  const coverage=await readOwnerProfitCoverage(readonly,{});
  assert.equal(coverage.certifiedProfit,false);
  await readonly.query('rollback');
 }finally{readonly.release();}
 console.log('D8N_READ_ONLY_TRANSACTION=PASS');
 console.log('R410_D8N_R1_ISOLATED_SQL_REPORT_ACCEPTANCE=PASS');ok=true;
} finally {
 if(clone)await clone.end();
 if(created){
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[name]);
  await admin.query(`drop database "${name}"`);
  console.log('D8N_TEST_CLONE_CLEANUP=PASS');
 }
 await admin.end();
}
if(!ok)throw Error('BLOCKED=D8N_SQL_ACCEPTANCE_INCOMPLETE');
