import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import { saveOwnerProductCost } from '../src/server/domain/r410-product-cost-store.js';
import { recordOrderProductCostSnapshots } from '../src/server/domain/r410-order-cost-snapshot.js';
import { readCostEvidence } from '../src/server/domain/r410-finance-cost-evidence.js';
import { readOwnerProfitCoverage } from '../src/server/domain/r410-owner-profit-coverage.js';
import { readOrderEvidenceGaps } from '../src/server/domain/r410-order-evidence-gaps.js';
import { reconcileOwnerProfitEvidence } from '../src/server/domain/r410-profit-evidence-reconcile.js';

const adminUrl = new URL(process.env.TEST_DATABASE_URL || '');
if (adminUrl.hostname !== '127.0.0.1' || adminUrl.port !== '51880' || adminUrl.pathname !== '/postgres') {
  throw Error('BLOCKED=LOCAL_ONLY_DATABASE_GUARD');
}
const dbName = 'fixoku_test_r410_d8o_' + crypto.randomBytes(5).toString('hex');
const template = 'r404_payment_schema_20261119_164712';
const admin = new pg.Pool({ connectionString: adminUrl.toString() });
let db, created = false;
const uuid = () => crypto.randomUUID();
try {
  assert.equal((await admin.query('select count(*)::int as n from pg_database where datname=$1',[template])).rows[0].n,1,'LOCAL_TEMPLATE_MISSING');
  await admin.query(`create database "${dbName}" template "${template}"`);
  created = true;
  adminUrl.pathname = '/' + dbName;
  db = new pg.Pool({ connectionString: adminUrl.toString() });
  assert.equal((await db.query('select current_database() as name')).rows[0].name,dbName);
  console.log('D8O_ISOLATED_CLONE=PASS');
  for (const file of [
    'drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql',
    'drizzle/controlled-migrations/r410/R410_01_PAYTR_FINANCE.sql',
    'drizzle/controlled-migrations/r410/R410_04_PRODUCT_COST_HISTORY.sql',
  ]) {
    await db.query(fs.readFileSync(file,'utf8'));
  }
  console.log('D8O_CLONE_ONLY_MIGRATIONS=PASS');
  const orderCounts = await Promise.all(['orders','trainer_package_orders'].map(t => db.query(`select count(*)::int as n from ${t}`)));
  assert.ok(orderCounts.every(x=>x.rows[0].n===0),'BLOCKED=CLONE_CONTAINS_REAL_ORDERS');
  console.log('D8O_NO_REAL_ORDERS=PASS');

  const owner = (await db.query('insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id',
    [dbName,dbName+'@example.invalid','R410 disposable owner'])).rows[0].id;
  const suffix = crypto.randomBytes(5).toString('hex');
  const book = (await db.query(`insert into physical_products (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,r6_product_type,currency)
    values($1,'D8O synthetic book','Disposable clone only','PHYSICAL',true,55000,0,'BOOK','TRY') returning id`,['D8O-BOOK-'+suffix])).rows[0].id;
  const ai = (await db.query(`insert into physical_products (sku,title,description,product_type,is_active,list_gross_minor,vat_rate_bps,default_access_days,r6_product_type,currency)
    values($1,'D8O synthetic AI','Disposable clone only','SOFTWARE',true,450000,2000,365,'SOFTWARE','TRY') returning id`,['D8O-AI-'+suffix])).rows[0].id;
  const client = await db.connect();
  try {
    await client.query('begin');
    await saveOwnerProductCost(client,{productId:book,costMinor:12000,expectedVersion:0,note:'D8O clone'},owner);
    await saveOwnerProductCost(client,{productId:ai,costMinor:3500,expectedVersion:0,note:'D8O clone'},owner);
    await client.query('commit');
  } catch(e) {await client.query('rollback');throw e;} finally{client.release();}
  console.log('D8O_SYNTHETIC_BOOK_AI_COSTS=PASS');
  const student = uuid(), trainer = uuid();
  const first = await recordOrderProductCostSnapshots(db,{orderKind:'STUDENT_ORDER',orderId:student,lines:[{orderItemId:uuid(),productId:book,quantity:2}]});
  const second = await recordOrderProductCostSnapshots(db,{orderKind:'TRAINER_PACKAGE_ORDER',orderId:trainer,lines:[{orderItemId:uuid(),productId:ai,quantity:3}]});
  assert.equal(first.totalCostMinor,24000); assert.equal(second.totalCostMinor,10500);
  console.log('D8O_BOTH_ORDER_KIND_COST_SNAPSHOTS=PASS');
  const all = await readCostEvidence(db,{});
  assert.equal(all.certifiedProfit,false);assert.equal(all.coverageVerified,false);
  assert.equal(all.knownOrderCount,2);assert.equal(all.knownCostMinor,34500);
  assert.deepEqual(new Set(all.orders.map(x=>x.orderKind)),new Set(['STUDENT_ORDER','TRAINER_PACKAGE_ORDER']));
  console.log('D8O_REAL_SQL_NONEMPTY_COST_EVIDENCE=PASS');
  for (const [kind,expected] of [['STUDENT_ORDER',24000],['TRAINER_PACKAGE_ORDER',10500]]) {
    const scoped=await readCostEvidence(db,{kind});
    assert.equal(scoped.knownOrderCount,1);assert.equal(scoped.knownCostMinor,expected);
  }
  const future=await readCostEvidence(db,{from:'2099-01-01'});
  assert.equal(future.knownOrderCount,0);assert.equal(future.knownCostMinor,0);
  console.log('D8O_ORDER_KIND_AND_DATE_FILTERS=PASS');
  // Synthetic cost-only UUIDs are intentionally NOT actual sale records. Their presence must not inflate order coverage.
  const [coverage,gaps]=await Promise.all([readOwnerProfitCoverage(db,{}),readOrderEvidenceGaps(db,{})]);
  assert.equal(coverage.scopeOrderCount,0);assert.equal(gaps.scopeOrderCount,0);
  assert.equal(coverage.certifiedProfit,false);assert.equal(gaps.certifiedProfit,false);
  assert.equal(coverage.contributionMinor,null);assert.equal(gaps.contributionMinor,null);
  console.log('D8O_ORPHAN_COST_NOT_SALE_OR_PROFIT=PASS');
  // An indicative contribution is valid only when every cost field and overall coverage evidence exist.
  const complete={kind:'STUDENT_ORDER',id:uuid(),finalized:true,coverageVerified:true,netRevenueMinor:150000,
    refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:30000,shippingExpenseMinor:10000,
    paymentFeeMinor:5000,otherExpenseMinor:2000,trainerPayoutPaidMinor:30000};
  const notVerified=reconcileOwnerProfitEvidence([complete]);
  assert.equal(notVerified.indicativeContributionMinor,null);assert.equal(notVerified.certifiedProfit,false);
  const reviewed=reconcileOwnerProfitEvidence([complete],{overallCoverageVerified:true});
  assert.equal(reviewed.indicativeContributionMinor,69000);
  assert.equal(reviewed.certifiedProfit,false);
  const missing=reconcileOwnerProfitEvidence([{...complete,paymentFeeMinor:null}],{overallCoverageVerified:true});
  assert.equal(missing.indicativeContributionMinor,null);
  console.log('D8O_PAYOUT_NOT_DOUBLE_EXPENSE_AND_FAIL_CLOSED=PASS');
  const ro=await db.connect();
  try {await ro.query('begin read only');const report=await readCostEvidence(ro,{});assert.equal(report.knownCostMinor,34500);await ro.query('rollback');}
  finally {ro.release();}
  console.log('D8O_READ_ONLY_FINANCE_SQL=PASS');
  console.log('R410_D8O_POPULATED_ISOLATED_FINANCE_ACCEPTANCE=PASS');
} finally {
  if(db)await db.end();
  if(created){
    await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[dbName]);
    await admin.query(`drop database "${dbName}"`);
    console.log('D8O_TEST_CLONE_CLEANUP=PASS');
  }
  await admin.end();
}
