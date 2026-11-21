import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import {saveOwnerProductCost} from '../src/server/domain/r410-product-cost-store.js';
import {recordOrderProductCostSnapshots} from '../src/server/domain/r410-order-cost-snapshot.js';
import {readOwnerProfitCoverage} from '../src/server/domain/r410-owner-profit-coverage.js';
import {readOrderEvidenceGaps} from '../src/server/domain/r410-order-evidence-gaps.js';
import {reconcileOwnerProfitEvidence} from '../src/server/domain/r410-profit-evidence-reconcile.js';
import {readPaytrFinanceSummary} from '../src/server/payments/paytr-finance-summary-r410.js';
const url=new URL(process.env.TEST_DATABASE_URL||'');
assert.equal(url.hostname,'127.0.0.1','LOCAL_HOST_ONLY');
assert.equal(url.port,'51880','LOCAL_PORT_ONLY');
assert.equal(url.pathname,'/postgres','LOCAL_ADMIN_ONLY');
const template='r404_payment_schema_20261119_164712';
const name='fixoku_test_r410_d8u_'+crypto.randomBytes(5).toString('hex');
const admin=new pg.Pool({connectionString:url.toString()});
let pool,created=false;
const uid=()=>crypto.randomUUID();
const choose=async(pool,type,wanted)=>{
 const labels=(await pool.query(`select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname=$1 order by e.enumsortorder`,[type])).rows.map(r=>r.enumlabel);
 for(const x of wanted)if(labels.includes(x))return x;
 throw Error('UNSUPPORTED_ENUM_'+type+':'+labels.join(','));
};
try {
 assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[template])).rows[0].n,1,'TEMPLATE_MISSING');
 assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[name])).rows[0].n,0);
 await admin.query(`create database "${name}" template "${template}"`);created=true;
 url.pathname='/'+name;pool=new pg.Pool({connectionString:url.toString()});
 assert.equal((await pool.query('select current_database() db')).rows[0].db,name);
 console.log('D8U_DISPOSABLE_CLONE=PASS');
 for(const t of ['orders','trainer_package_orders','order_items','trainer_package_order_items']){
  assert.equal((await pool.query(`select count(*)::int n from public.${t}`)).rows[0].n,0,'CLONE_NOT_EMPTY_'+t);
 }
 console.log('D8U_NO_REAL_ORDERS=PASS');
 for(const file of ['drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql','drizzle/controlled-migrations/r410/R410_01_PAYTR_FINANCE.sql','drizzle/controlled-migrations/r410/R410_04_PRODUCT_COST_HISTORY.sql']){
  await pool.query(fs.readFileSync(file,'utf8'));
 }
 console.log('D8U_MIGRATIONS_CLONE_ONLY=PASS');
 const user=async(name)=> (await pool.query('insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id',[uid(),uid()+'@example.invalid',name])).rows[0].id;
 const buyer=await user('D8U disposable buyer');const student=await user('D8U disposable student');const trainer=await user('D8U disposable trainer');
 const packageStatus=await choose(pool,'package_catalog_status',['PUBLISHED','ACTIVE','APPROVED','DRAFT']);
 const delivery=await choose(pool,'package_delivery_mode',['SELF_PACED','INDEPENDENT','DIGITAL','ONLINE','GROUP','ONE_TO_ONE','ASYNC','REMOTE','SELF_STUDY']);
 const studentPayment=await choose(pool,'order_payment_method',['BANK_TRANSFER','BANK_TRANSFER_EFT','EFT','PAYTR','MANUAL']);
 const studentPaid=await choose(pool,'order_status',['PAID']);const trainerPaid=await choose(pool,'trainer_order_status',['PAID']);
 const trainerPayment=await choose(pool,'trainer_payment_method',['BANK_TRANSFER','PAYTR','MANUAL']);
 // This test never opens a payment provider connection or creates an actual payment.
 const suffix=crypto.randomBytes(5).toString('hex');
 const packageFor=async(audience)=>{
  const pk=(await pool.query('insert into packages(slug,audience,status) values($1,$2,$3) returning id',['d8u-'+audience.toLowerCase()+'-'+suffix,audience,packageStatus])).rows[0].id;
  const ver=(await pool.query('insert into package_versions(package_id,version_number,title,description,status,price_gross_minor,vat_rate_bps) values($1,1,$2,$3,$4,$5,2000) returning id',[pk,'D8U synthetic '+audience,'Disposable clone only',packageStatus,120000])).rows[0].id;
  return {pk,ver};
 };
 const sp=await packageFor('STUDENT');const tp=await packageFor('TRAINER');
 const studentOrder=(await pool.query(`insert into orders(buyer_user_id,beneficiary_student_user_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash,payment_method,shipping_minor) values($1,$2,$6,'TRY',120000,125000,$3,$4,$5,5000) returning id`,[buyer,student,'d8u-student-'+suffix,'synthetic-d8u-student',studentPayment,studentPaid])).rows[0].id;
 const studentItem=(await pool.query(`insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency) values($1,$2,$3,'D8U student','Synthetic',1,$4,120000,120000,'TRY') returning id`,[studentOrder,sp.pk,sp.ver,delivery])).rows[0].id;
 const trainerOrder=(await pool.query(`insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,$4,$2,'TRY',100000,0,20000,120000,'{}','{}',$3,'synthetic-d8u-trainer') returning id`,[trainer,trainerPayment,'d8u-trainer-'+suffix,trainerPaid])).rows[0].id;
 const trainerItem=(await pool.query(`insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,sku_snapshot,invoice_product_name_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,line_total_minor,currency) values($1,$2,$3,'D8U trainer','Synthetic','D8U-TRAINER','D8U Trainer',2000,100000,120000,0,120000,'TRY') returning id`,[trainerOrder,tp.pk,tp.ver])).rows[0].id;
 assert.ok(studentItem&&trainerItem);
 console.log('D8U_REAL_FK_STUDENT_AND_TRAINER_ORDERS=PASS');
 const book=(await pool.query(`insert into physical_products(sku,title,description,product_type,r6_product_type,list_gross_minor,vat_rate_bps,currency) values($1,'D8U Book','Synthetic','PHYSICAL','BOOK',55000,0,'TRY') returning id`,['D8U-BOOK-'+suffix])).rows[0].id;
 const ai=(await pool.query(`insert into physical_products(sku,title,description,product_type,r6_product_type,list_gross_minor,vat_rate_bps,currency,default_access_days) values($1,'D8U AI','Synthetic','SOFTWARE','SOFTWARE',400000,2000,'TRY',365) returning id`,['D8U-AI-'+suffix])).rows[0].id;
 const client=await pool.connect();
 try{await client.query('begin');await saveOwnerProductCost(client,{productId:book,costMinor:12000,expectedVersion:0,note:'Disposable D8U'},buyer);await saveOwnerProductCost(client,{productId:ai,costMinor:3500,expectedVersion:0,note:'Disposable D8U'},buyer);await client.query('commit');}
 catch(e){await client.query('rollback');throw e;}finally{client.release();}
 const c1=await recordOrderProductCostSnapshots(pool,{orderKind:'STUDENT_ORDER',orderId:studentOrder,lines:[{orderItemId:studentItem,productId:book,quantity:2}]});
 const c2=await recordOrderProductCostSnapshots(pool,{orderKind:'TRAINER_PACKAGE_ORDER',orderId:trainerOrder,lines:[{orderItemId:trainerItem,productId:ai,quantity:3}]});
 assert.equal(c1.totalCostMinor,24000);assert.equal(c2.totalCostMinor,10500);
 console.log('D8U_LINKED_PRODUCT_COST_SNAPSHOTS=PASS');

 // A synthetic refund is stored in the real student payment transaction schema.
 // No provider is contacted and no payment is made.
 const intentStatus=await choose(pool,'payment_intent_status',['SUCCEEDED','PAID','CREATED']);
 const transactionType=await choose(pool,'payment_transaction_type',['REFUND']);
 const transactionStatus=await choose(pool,'payment_transaction_status',['SUCCEEDED']);
 const intent=(await pool.query(`insert into payment_intents(order_id,status,provider,provider_reference,amount_minor,currency,idempotency_key) values($1,$2,'D8U_SYNTHETIC','CLONE_ONLY',125000,'TRY',$3) returning id`,[studentOrder,intentStatus,'d8u-intent-'+suffix])).rows[0].id;
 await pool.query(`insert into payment_transactions(payment_intent_id,provider,provider_transaction_id,transaction_type,status,amount_minor,currency,occurred_at) values($1,'D8U_SYNTHETIC',$2,$3,$4,10000,'TRY',now())`,[intent,'d8u-refund-'+suffix,transactionType,transactionStatus]);
 const refundRows=(await pool.query(`select coalesce(sum(pt.amount_minor),0)::bigint as refund from payment_intents pi join payment_transactions pt on pt.payment_intent_id=pi.id where pi.order_id=$1 and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'`,[studentOrder])).rows;
 assert.equal(Number(refundRows[0].refund),10000);
 assert.equal((await pool.query(`select count(*)::int n from payment_intents where order_id=$1`,[trainerOrder])).rows[0].n,0,'TRAINER_ORDERS_MUST_NOT_BE_STUDENT_PAYMENT_INTENTS');
 console.log('D8U_STUDENT_REFUND_REAL_SQL=PASS');
 // Shipping cost is a recorded expense, shipping_minor is the charged revenue: never conflate them.
 await pool.query(`insert into shipments(order_id,beneficiary_student_user_id,address_snapshot_json,shipping_charge_minor,actual_shipping_cost_minor,provider_enabled) values($1,$2,'{}',5000,8000,false)`,[studentOrder,student]);
 await pool.query(`insert into trainer_order_shipments(order_id,trainer_user_id,address_snapshot_json,shipping_charge_minor,actual_shipping_cost_minor,provider_enabled) values($1,$2,'{}',0,6000,false)`,[trainerOrder,trainer]);
 const shipping=(await pool.query(`select 'STUDENT_ORDER' kind,s.order_id, sum(s.actual_shipping_cost_minor)::bigint cost from shipments s where s.order_id=$1 group by s.order_id union all select 'TRAINER_PACKAGE_ORDER' kind,s.order_id,sum(s.actual_shipping_cost_minor)::bigint cost from trainer_order_shipments s where s.order_id=$2 group by s.order_id`,[studentOrder,trainerOrder])).rows;
 assert.deepEqual(Object.fromEntries(shipping.map(r=>[r.kind,Number(r.cost)])),{STUDENT_ORDER:8000,TRAINER_PACKAGE_ORDER:6000});
 const revenue=(await pool.query(`select shipping_minor as revenue from orders where id=$1`,[studentOrder])).rows[0];
 assert.equal(revenue.revenue,5000);
 console.log('D8U_BOTH_ORDER_SHIPPING_EXPENSES_REAL_SQL=PASS');
 // A refund is never a separate sale, and product costs remain immutable.
 const aggregate=(await pool.query(`select (select count(*)::int from orders where id=$1) student_count,(select count(*)::int from trainer_package_orders where id=$2) trainer_count,(select sum(amount_minor)::bigint from payment_transactions where payment_intent_id=$3 and transaction_type='REFUND' and status='SUCCEEDED') refund_minor`,[studentOrder,trainerOrder,intent])).rows[0];
 assert.equal(aggregate.student_count,1);assert.equal(aggregate.trainer_count,1);assert.equal(Number(aggregate.refund_minor),10000);
 console.log('D8U_REFUND_NOT_NEW_SALE=PASS');

 // IMPORTANT: These are deliberately BANK_TRANSFER synthetic orders. They cannot
 // inherit a PayTR commission from unrelated attempts or from an absent receipt.
 const missingPaytr=await pool.query(`select
  (select count(*)::int from public.paytr_payment_attempts where order_kind='STUDENT_ORDER' and order_id=$1) student_attempts,
  (select count(*)::int from public.paytr_payment_attempts where order_kind='TRAINER_PACKAGE_ORDER' and order_id=$2) trainer_attempts,
  (select count(*)::int from public.r410_paytr_finance where order_kind='STUDENT_ORDER' and order_id=$1) student_finance,
  (select count(*)::int from public.r410_paytr_finance where order_kind='TRAINER_PACKAGE_ORDER' and order_id=$2) trainer_finance`,[studentOrder,trainerOrder]);
 assert.deepEqual(Object.values(missingPaytr.rows[0]).map(Number),[0,0,0,0]);
 const providerSummary=await readPaytrFinanceSummary(pool,{currency:'TRY'});
 assert.equal(providerSummary.status,'AVAILABLE');
 assert.equal(providerSummary.totalAttempts,0);
 assert.equal(providerSummary.merchantCostMinor,null);
 console.log('D8U_NO_FICTITIOUS_PAYTR_FEE=PASS');
 // Trainer accrual and settlement must not be conflated: settlement is cash movement,
 // while recorded earning is the expense. The two counts are distinct evidence.
 const payoutEvidence=await pool.query(`select
  (select count(*)::int from trainer_earning_ledger where trainer_user_id=$1) earning_count,
  (select count(*)::int from trainer_payout_register where trainer_user_id=$1) settlement_count,
  (select count(*)::int from owner_finance_ledger where entry_type='TRAINER_PAYOUT' and source_type='PAYOUT') ledger_settlements`,[trainer]);
 assert.equal(Number(payoutEvidence.rows[0].earning_count),0);
 assert.equal(Number(payoutEvidence.rows[0].settlement_count),0);
 assert.equal(Number(payoutEvidence.rows[0].ledger_settlements),0);
 console.log('D8U_EARNING_VS_SETTLEMENT_SOURCE_SQL=PASS');
 const missing=reconcileOwnerProfitEvidence([
  {kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:false,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:null,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:null},
  {kind:'TRAINER_PACKAGE_ORDER',id:trainerOrder,finalized:true,coverageVerified:false,netRevenueMinor:120000,refundNetMinor:0,productCostMinor:10500,trainerEarnedMinor:0,shippingExpenseMinor:6000,paymentFeeMinor:null,otherExpenseMinor:null}
 ],{overallCoverageVerified:false});
 assert.equal(missing.certifiedProfit,false);assert.equal(missing.indicativeContributionMinor,null);
 assert.equal(missing.orderCount,2);assert.ok(missing.orders.every(o=>o.blockers.length));
 console.log('D8U_MISSING_FEES_EARNINGS_OTHER_EXPENSE_FAIL_CLOSED=PASS');
 const known={kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:20000,shippingExpenseMinor:8000,paymentFeeMinor:3000,otherExpenseMinor:2000};
 const contribution=reconcileOwnerProfitEvidence([{...known,trainerPayoutPaidMinor:5000}],{overallCoverageVerified:true});
 const paidAgain=reconcileOwnerProfitEvidence([{...known,trainerPayoutPaidMinor:20000}],{overallCoverageVerified:true});
 assert.equal(contribution.status,'INDICATIVE_CONTRIBUTION');
 assert.equal(contribution.indicativeContributionMinor,58000);
 assert.equal(paidAgain.indicativeContributionMinor,58000);
 assert.equal(paidAgain.certifiedProfit,false);
 console.log('D8U_INDICATIVE_ONLY_AND_NO_DOUBLE_PAYOUT=PASS');

 // SQL-derived amounts may feed an INDICATIVE contribution only with explicit evidence.
 // PayTR commission, other expenses and trainer accrual completeness are still unknown.
 assert.equal(c1.totalCostMinor,24000);assert.equal(c2.totalCostMinor,10500);
 const incomplete=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:false,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:c1.totalCostMinor,trainerEarnedMinor:null,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:null,trainerPayoutPaidMinor:0}],{overallCoverageVerified:false});
 assert.equal(incomplete.indicativeContributionMinor,null);assert.equal(incomplete.certifiedProfit,false);
 console.log('D8U_UNKNOWN_COMMISSION_HAKEDIS_OTHER_EXPENSE_FAIL_CLOSED=PASS');

 // Real SQL joins now see synthetic rows as actual orders in the disposable clone.
 const coverage=await readOwnerProfitCoverage(pool,{});const gaps=await readOrderEvidenceGaps(pool,{});
 assert.equal(coverage.scopeOrderCount,2);assert.equal(coverage.withSnapshot,2);assert.equal(coverage.recordedCostMinor,34500);
 assert.equal(gaps.scopeOrderCount,2);assert.equal(gaps.rows.length,2);
 assert.ok(gaps.rows.every(x=>x.costLines>0&&x.recordedCostMinor!==null));
 assert.deepEqual(new Set(gaps.rows.map(x=>x.kind)),new Set(['STUDENT_ORDER','TRAINER_PACKAGE_ORDER']));
 assert.equal(coverage.certifiedProfit,false);assert.equal(gaps.certifiedProfit,false);
 console.log('D8U_SQL_ORDER_COST_COVERAGE=PASS');
 const later=await readOwnerProfitCoverage(pool,{from:'2099-01-01'});
 assert.equal(later.scopeOrderCount,0);assert.equal(later.certifiedProfit,false);
 console.log('D8U_DATE_SCOPE_NO_FALSE_SALES=PASS');
 const tx=await pool.connect();try{await tx.query('begin read only');const r=await readOrderEvidenceGaps(tx,{});assert.equal(r.scopeOrderCount,2);await tx.query('rollback');}finally{tx.release();}
 console.log('D8U_READ_ONLY_REPORT_SQL=PASS');
 const indicative=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:30000,shippingExpenseMinor:8000,paymentFeeMinor:5000,otherExpenseMinor:2000,trainerPayoutPaidMinor:30000}],{overallCoverageVerified:true});
 assert.equal(indicative.indicativeContributionMinor,46000);assert.equal(indicative.certifiedProfit,false);
 const unknown=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:30000,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:2000,trainerPayoutPaidMinor:30000}],{overallCoverageVerified:true});
 assert.equal(unknown.indicativeContributionMinor,null);assert.equal(unknown.certifiedProfit,false);
 console.log('D8U_NO_DOUBLE_PAYOUT_AND_FAIL_CLOSED=PASS');
 // Read-only, schema-verified inventory for next non-zero financial transaction fixture.
 const targets=['r410_paytr_finance','r410_paytr_finance_events','paytr_payment_attempts','trainer_earning_ledger','trainer_payout_register','r6_trainer_payout_allocations','owner_finance_ledger','payment_intents','payment_transactions','package_entitlement_enrollments'];
 const lines=['FIXOKU R410 D8U | ISOLATED FINANCE TRANSACTION SCHEMA','NO_REAL_RECORDS=YES','SOURCE_DATABASE=DISPOSABLE_CLONE'];
 for(const table of targets){
  const meta=(await pool.query(`select column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[table])).rows;
  if(!meta.length)throw new Error('MISSING_FINANCE_TABLE:'+table);
  lines.push('=== TABLE: '+table+' ===');
  for(const c of meta)lines.push([c.column_name,c.data_type,c.udt_name,c.is_nullable,c.column_default??''].join(' | '));
  const cons=(await pool.query(`select c.conname,pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace where ns.nspname='public' and t.relname=$1 order by c.conname`,[table])).rows;
  for(const c of cons)lines.push('CONSTRAINT: '+c.conname+' | '+c.definition);
 }
 const enums=(await pool.query(`select t.typname,e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname in ('trainer_earning_entry_type','trainer_earning_status','payment_transaction_type','payment_transaction_status','trainer_order_status','order_status','trainer_payment_method','order_payment_method') order by t.typname,e.enumsortorder`)).rows;
 lines.push('=== ENUM VALUES ===');for(const e of enums)lines.push(e.typname+' | '+e.enumlabel);
 const path=process.env.D8U_REPORT_PATH;
 if(!path||!path.endsWith('FIXOKU_R410_D8U_FINANS_ISLEM_SEMA_KANIT.txt'))throw Error('REPORT_PATH_INVALID');
 fs.writeFileSync(path,lines.join('\n')+'\n',{encoding:'utf8',flag:'wx'});
 console.log('D8U_FINANCE_TRANSACTION_TABLE_COUNT='+targets.length);
 console.log('D8U_REQUIRED_FINANCE_SCHEMA=PASS');
 console.log('D8U_REPORT='+path);

 console.log('R410_D8U_SYNTHETIC_ORDERS_SQL_ACCEPTANCE=PASS');
}finally{
 if(pool)await pool.end();
 if(created){await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[name]);await admin.query(`drop database "${name}"`);console.log('D8U_CLONE_CLEANUP=PASS');}
 await admin.end();
}
