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
const name='fixoku_test_r410_d8v_'+crypto.randomBytes(5).toString('hex');
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
 console.log('D8V_DISPOSABLE_CLONE=PASS');
 for(const t of ['orders','trainer_package_orders','order_items','trainer_package_order_items']){
  assert.equal((await pool.query(`select count(*)::int n from public.${t}`)).rows[0].n,0,'CLONE_NOT_EMPTY_'+t);
 }
 console.log('D8V_NO_REAL_ORDERS=PASS');
 for(const file of ['drizzle/controlled-migrations/r404/R404_01_PAYTR_PAYMENT_ATTEMPTS.sql','drizzle/controlled-migrations/r410/R410_01_PAYTR_FINANCE.sql','drizzle/controlled-migrations/r410/R410_04_PRODUCT_COST_HISTORY.sql']){
  await pool.query(fs.readFileSync(file,'utf8'));
 }
 console.log('D8V_MIGRATIONS_CLONE_ONLY=PASS');
 const user=async(name)=> (await pool.query('insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id',[uid(),uid()+'@example.invalid',name])).rows[0].id;
 const buyer=await user('D8V disposable buyer');const student=await user('D8V disposable student');const trainer=await user('D8V disposable trainer');
 const packageStatus=await choose(pool,'package_catalog_status',['PUBLISHED','ACTIVE','APPROVED','DRAFT']);
 const delivery=await choose(pool,'package_delivery_mode',['SELF_PACED','INDEPENDENT','DIGITAL','ONLINE','GROUP','ONE_TO_ONE','ASYNC','REMOTE','SELF_STUDY']);
 const studentPayment=await choose(pool,'order_payment_method',['PAYTR','BANK_TRANSFER','BANK_TRANSFER_EFT','EFT','MANUAL']);
 const studentPaid=await choose(pool,'order_status',['PAID']);const trainerPaid=await choose(pool,'trainer_order_status',['PAID']);
 const trainerPayment=await choose(pool,'trainer_payment_method',['PAYTR','BANK_TRANSFER','MANUAL']);
 // This test never opens a payment provider connection or creates an actual payment.
 const suffix=crypto.randomBytes(5).toString('hex');
 const packageFor=async(audience)=>{
  const pk=(await pool.query('insert into packages(slug,audience,status) values($1,$2,$3) returning id',['d8v-'+audience.toLowerCase()+'-'+suffix,audience,packageStatus])).rows[0].id;
  const ver=(await pool.query('insert into package_versions(package_id,version_number,title,description,status,price_gross_minor,vat_rate_bps) values($1,1,$2,$3,$4,$5,2000) returning id',[pk,'D8V synthetic '+audience,'Disposable clone only',packageStatus,120000])).rows[0].id;
  return {pk,ver};
 };
 const sp=await packageFor('STUDENT');const tp=await packageFor('TRAINER');
 const studentOrder=(await pool.query(`insert into orders(buyer_user_id,beneficiary_student_user_id,status,currency,subtotal_minor,total_minor,idempotency_key,request_hash,payment_method,shipping_minor) values($1,$2,$6,'TRY',120000,125000,$3,$4,$5,5000) returning id`,[buyer,student,'d8v-student-'+suffix,'synthetic-d8v-student',studentPayment,studentPaid])).rows[0].id;
 const studentItem=(await pool.query(`insert into order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,version_number_snapshot,delivery_mode_snapshot,unit_price_minor,total_minor,currency) values($1,$2,$3,'D8V student','Synthetic',1,$4,120000,120000,'TRY') returning id`,[studentOrder,sp.pk,sp.ver,delivery])).rows[0].id;
 const trainerOrder=(await pool.query(`insert into trainer_package_orders(trainer_user_id,status,payment_method,currency,subtotal_minor,shipping_minor,tax_minor,total_minor,shipping_address_snapshot_json,billing_snapshot_json,idempotency_key,request_hash) values($1,$4,$2,'TRY',100000,0,20000,120000,'{}','{}',$3,'synthetic-d8v-trainer') returning id`,[trainer,trainerPayment,'d8v-trainer-'+suffix,trainerPaid])).rows[0].id;
 const trainerItem=(await pool.query(`insert into trainer_package_order_items(order_id,package_id,package_version_id,title_snapshot,description_snapshot,sku_snapshot,invoice_product_name_snapshot,vat_rate_bps_snapshot,unit_net_minor,unit_gross_minor,shipping_minor,line_total_minor,currency) values($1,$2,$3,'D8V trainer','Synthetic','D8V-TRAINER','D8V Trainer',2000,100000,120000,0,120000,'TRY') returning id`,[trainerOrder,tp.pk,tp.ver])).rows[0].id;
 assert.ok(studentItem&&trainerItem);
 console.log('D8V_REAL_FK_STUDENT_AND_TRAINER_ORDERS=PASS');
 const book=(await pool.query(`insert into physical_products(sku,title,description,product_type,r6_product_type,list_gross_minor,vat_rate_bps,currency) values($1,'D8V Book','Synthetic','PHYSICAL','BOOK',55000,0,'TRY') returning id`,['D8V-BOOK-'+suffix])).rows[0].id;
 const ai=(await pool.query(`insert into physical_products(sku,title,description,product_type,r6_product_type,list_gross_minor,vat_rate_bps,currency,default_access_days) values($1,'D8V AI','Synthetic','SOFTWARE','SOFTWARE',400000,2000,'TRY',365) returning id`,['D8V-AI-'+suffix])).rows[0].id;
 const client=await pool.connect();
 try{await client.query('begin');await saveOwnerProductCost(client,{productId:book,costMinor:12000,expectedVersion:0,note:'Disposable D8V'},buyer);await saveOwnerProductCost(client,{productId:ai,costMinor:3500,expectedVersion:0,note:'Disposable D8V'},buyer);await client.query('commit');}
 catch(e){await client.query('rollback');throw e;}finally{client.release();}
 const c1=await recordOrderProductCostSnapshots(pool,{orderKind:'STUDENT_ORDER',orderId:studentOrder,lines:[{orderItemId:studentItem,productId:book,quantity:2}]});
 const c2=await recordOrderProductCostSnapshots(pool,{orderKind:'TRAINER_PACKAGE_ORDER',orderId:trainerOrder,lines:[{orderItemId:trainerItem,productId:ai,quantity:3}]});
 assert.equal(c1.totalCostMinor,24000);assert.equal(c2.totalCostMinor,10500);
 console.log('D8V_LINKED_PRODUCT_COST_SNAPSHOTS=PASS');

 // A synthetic refund is stored in the real student payment transaction schema.
 // No provider is contacted and no payment is made.
 const intentStatus=await choose(pool,'payment_intent_status',['SUCCEEDED','PAID','CREATED']);
 const transactionType=await choose(pool,'payment_transaction_type',['REFUND']);
 const transactionStatus=await choose(pool,'payment_transaction_status',['SUCCEEDED']);
 const intent=(await pool.query(`insert into payment_intents(order_id,status,provider,provider_reference,amount_minor,currency,idempotency_key) values($1,$2,'D8V_SYNTHETIC','CLONE_ONLY',125000,'TRY',$3) returning id`,[studentOrder,intentStatus,'d8v-intent-'+suffix])).rows[0].id;
 await pool.query(`insert into payment_transactions(payment_intent_id,provider,provider_transaction_id,transaction_type,status,amount_minor,currency,occurred_at) values($1,'D8V_SYNTHETIC',$2,$3,$4,10000,'TRY',now())`,[intent,'d8v-refund-'+suffix,transactionType,transactionStatus]);
 const refundRows=(await pool.query(`select coalesce(sum(pt.amount_minor),0)::bigint as refund from payment_intents pi join payment_transactions pt on pt.payment_intent_id=pi.id where pi.order_id=$1 and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'`,[studentOrder])).rows;
 assert.equal(Number(refundRows[0].refund),10000);
 assert.equal((await pool.query(`select count(*)::int n from payment_intents where order_id=$1`,[trainerOrder])).rows[0].n,0,'TRAINER_ORDERS_MUST_NOT_BE_STUDENT_PAYMENT_INTENTS');
 console.log('D8V_STUDENT_REFUND_REAL_SQL=PASS');
 // Shipping cost is a recorded expense, shipping_minor is the charged revenue: never conflate them.
 await pool.query(`insert into shipments(order_id,beneficiary_student_user_id,address_snapshot_json,shipping_charge_minor,actual_shipping_cost_minor,provider_enabled) values($1,$2,'{}',5000,8000,false)`,[studentOrder,student]);
 await pool.query(`insert into trainer_order_shipments(order_id,trainer_user_id,address_snapshot_json,shipping_charge_minor,actual_shipping_cost_minor,provider_enabled) values($1,$2,'{}',0,6000,false)`,[trainerOrder,trainer]);
 const shipping=(await pool.query(`select 'STUDENT_ORDER' kind,s.order_id, sum(s.actual_shipping_cost_minor)::bigint cost from shipments s where s.order_id=$1 group by s.order_id union all select 'TRAINER_PACKAGE_ORDER' kind,s.order_id,sum(s.actual_shipping_cost_minor)::bigint cost from trainer_order_shipments s where s.order_id=$2 group by s.order_id`,[studentOrder,trainerOrder])).rows;
 assert.deepEqual(Object.fromEntries(shipping.map(r=>[r.kind,Number(r.cost)])),{STUDENT_ORDER:8000,TRAINER_PACKAGE_ORDER:6000});
 const revenue=(await pool.query(`select shipping_minor as revenue from orders where id=$1`,[studentOrder])).rows[0];
 assert.equal(revenue.revenue,5000);
 console.log('D8V_BOTH_ORDER_SHIPPING_EXPENSES_REAL_SQL=PASS');
 // A refund is never a separate sale, and product costs remain immutable.
 const aggregate=(await pool.query(`select (select count(*)::int from orders where id=$1) student_count,(select count(*)::int from trainer_package_orders where id=$2) trainer_count,(select sum(amount_minor)::bigint from payment_transactions where payment_intent_id=$3 and transaction_type='REFUND' and status='SUCCEEDED') refund_minor`,[studentOrder,trainerOrder,intent])).rows[0];
 assert.equal(aggregate.student_count,1);assert.equal(aggregate.trainer_count,1);assert.equal(Number(aggregate.refund_minor),10000);
 console.log('D8V_REFUND_NOT_NEW_SALE=PASS');

 // IMPORTANT: These are isolated synthetic PAYTR orders without provider receipts yet. They cannot
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
 console.log('D8V_NO_FICTITIOUS_PAYTR_FEE=PASS');
 // Trainer accrual and settlement must not be conflated: settlement is cash movement,
 // while recorded earning is the expense. The two counts are distinct evidence.
 const payoutEvidence=await pool.query(`select
  (select count(*)::int from trainer_earning_ledger where trainer_user_id=$1) earning_count,
  (select count(*)::int from trainer_payout_register where trainer_user_id=$1) settlement_count,
  (select count(*)::int from owner_finance_ledger where entry_type='TRAINER_PAYOUT' and source_type='PAYOUT') ledger_settlements`,[trainer]);
 assert.equal(Number(payoutEvidence.rows[0].earning_count),0);
 assert.equal(Number(payoutEvidence.rows[0].settlement_count),0);
 assert.equal(Number(payoutEvidence.rows[0].ledger_settlements),0);
 console.log('D8V_EARNING_VS_SETTLEMENT_SOURCE_SQL=PASS');

 // D8V: Non-zero financial evidence is inserted ONLY into a disposable clone.
 // Synthetic provider evidence is NOT a real PayTR callback or bank settlement.
 const attemptState=await choose(pool,'paytr_payment_attempt_status',['CREATED','SUCCEEDED','VERIFIED','PAID']);
 const mockAttempt=async(kind,orderId,amount,fee)=>{
  const merchant='D8V-SYNTHETIC-'+crypto.randomBytes(6).toString('hex');
  const studentRef=kind==='STUDENT_ORDER'?orderId:null;
  const trainerRef=kind==='TRAINER_PACKAGE_ORDER'?orderId:null;
  const attempt=(await pool.query(`insert into public.paytr_payment_attempts(order_kind,order_id,student_order_id,trainer_order_id,merchant_oid,status,environment,amount_minor,currency,review_required) values($1,$2,$3,$4,$5,$6,'TEST',$7,'TRY',false) returning id`,[kind,orderId,studentRef,trainerRef,merchant,attemptState,amount])).rows[0].id;
  const evidence=crypto.createHash('sha256').update('D8V:'+kind+':'+merchant+':'+amount+':'+fee).digest('hex');
  await pool.query(`insert into public.r410_paytr_finance(attempt_id,merchant_oid,order_kind,order_id,currency,order_amount_minor,collected_amount_minor,deduction_minor,provider_net_minor,customer_difference_minor,merchant_payment_cost_minor,installment_count,installment_category,evidence_sha256,payment_at) values($1,$2,$3,$4,'TRY',$5,$5,$6,$7,0,$6,1,'SINGLE',$8,now())`,[attempt,merchant,kind,orderId,amount,fee,amount-fee,evidence]);
  await pool.query(`insert into public.r410_paytr_finance_events(attempt_id,event_type,evidence_sha256) values($1,'VERIFIED',$2)`,[attempt,evidence]);
  return {attempt,merchant};
 };
 const stAttempt=await mockAttempt('STUDENT_ORDER',studentOrder,125000,3000);
 const trAttempt=await mockAttempt('TRAINER_PACKAGE_ORDER',trainerOrder,120000,4000);
 const fees=(await pool.query(`select order_kind,order_id,merchant_payment_cost_minor fee,deduction_minor deduction,customer_difference_minor difference,provider_net_minor net from public.r410_paytr_finance where (order_kind='STUDENT_ORDER' and order_id=$1) or (order_kind='TRAINER_PACKAGE_ORDER' and order_id=$2) order by order_kind`,[studentOrder,trainerOrder])).rows;
 assert.equal(fees.length,2);
 assert.equal(Number(fees.find(x=>x.order_kind==='STUDENT_ORDER').fee),3000);
 assert.equal(Number(fees.find(x=>x.order_kind==='TRAINER_PACKAGE_ORDER').fee),4000);
 assert.ok(fees.every(x=>Number(x.fee)===Number(x.deduction)-Number(x.difference)));
 assert.equal((await pool.query(`select count(*)::int n from r410_paytr_finance_events where attempt_id=any($1::uuid[])`,[[stAttempt.attempt,trAttempt.attempt]])).rows[0].n,2);
 console.log('D8V_POSITIVE_PAYTR_MERCHANT_FEES_REAL_SQL=PASS');
 // Earning accrual is an expense; payment and allocation are cash settlement, NOT a new expense.
 const earningType=await choose(pool,'trainer_earning_entry_type',['SESSION','BONUS']);
 const earningState=await choose(pool,'trainer_earning_status',['EARNED','PAYABLE']);
 const earningId=(await pool.query(`insert into trainer_earning_ledger(trainer_user_id,student_user_id,entry_type,status,amount_minor,currency,description,source_type,source_id,idempotency_key,occurred_at) values($1,$2,$3,$4,35000,'TRY','D8V synthetic accrual','D8V_SYNTHETIC_ORDER',$5,$6,now()) returning id`,[trainer,student,earningType,earningState,studentOrder,'D8V-EARN-'+suffix])).rows[0].id;
 const payoutId=(await pool.query(`insert into trainer_payout_register(trainer_user_id,amount_minor,currency,period_start,period_end,payment_date,bank_reference,created_by,approved_by) values($1,12000,'TRY','2026-11-01','2026-11-30','2026-11-21',$2,$3,$3) returning id`,[trainer,'D8V-SYNTHETIC-'+suffix,buyer])).rows[0].id;
 await pool.query(`insert into r6_trainer_payout_allocations(payout_id,earning_id,amount_minor) values($1,$2,12000)`,[payoutId,earningId]);
 await pool.query(`insert into owner_finance_ledger(entry_type,source_type,source_id,amount_minor,currency,metadata_json,created_by) values('TRAINER_PAYOUT','PAYOUT',$1,-12000,'TRY',$2,$3)`,[payoutId,JSON.stringify({synthetic:true,cloneOnly:true}),buyer]);
 await pool.query(`insert into owner_finance_ledger(entry_type,source_type,source_id,amount_minor,currency,metadata_json,created_by) values('ADJUSTMENT','D8V_SYNTHETIC_ORDER',$1,2000,'TRY',$2,$3)`,[studentOrder,JSON.stringify({synthetic:true,expenseEvidence:true,cloneOnly:true}),buyer]);
 const earned=(await pool.query(`select e.amount_minor earned,coalesce(sum(a.amount_minor),0)::bigint allocated from trainer_earning_ledger e left join r6_trainer_payout_allocations a on a.earning_id=e.id where e.id=$1 group by e.id`,[earningId])).rows[0];
 assert.equal(Number(earned.earned),35000);assert.equal(Number(earned.allocated),12000);
 assert.equal(Number(earned.earned)-Number(earned.allocated),23000);
 const settlement=(await pool.query(`select p.amount_minor paid,coalesce(sum(a.amount_minor),0)::bigint allocated from trainer_payout_register p join r6_trainer_payout_allocations a on a.payout_id=p.id where p.id=$1 group by p.id`,[payoutId])).rows[0];
 assert.equal(Number(settlement.paid),12000);assert.equal(Number(settlement.allocated),12000);
 const payoutLedger=(await pool.query(`select amount_minor from owner_finance_ledger where entry_type='TRAINER_PAYOUT' and source_type='PAYOUT' and source_id=$1`,[payoutId])).rows;
 assert.equal(payoutLedger.length,1);assert.equal(Number(payoutLedger[0].amount_minor),-12000);
 console.log('D8V_POSITIVE_EARNING_PARTIAL_PAYOUT_REAL_SQL=PASS');
 const other=(await pool.query(`select sum(amount_minor)::bigint v from owner_finance_ledger where entry_type='ADJUSTMENT' and source_type='D8V_SYNTHETIC_ORDER' and source_id=$1`,[studentOrder])).rows[0];
 assert.equal(Number(other.v),2000);
 console.log('D8V_POSITIVE_OTHER_EXPENSE_EVIDENCE_SQL=PASS');
 // Source-specific read-only order matching, not a blanket assertion that all costs are known.
 const orderEvidence=(await pool.query(`select o.id, f.merchant_payment_cost_minor fee,
  (select sum(amount_minor)::bigint from trainer_earning_ledger where source_type='D8V_SYNTHETIC_ORDER' and source_id=o.id::text) earned,
  (select sum(amount_minor)::bigint from owner_finance_ledger where source_type='D8V_SYNTHETIC_ORDER' and source_id=o.id::text and entry_type='ADJUSTMENT') other
  from orders o join r410_paytr_finance f on f.order_kind='STUDENT_ORDER' and f.order_id=o.id where o.id=$1`,[studentOrder])).rows[0];
 assert.equal(Number(orderEvidence.fee),3000);
 assert.equal(Number(orderEvidence.earned),35000);
 assert.equal(Number(orderEvidence.other),2000);
 const indicativeEvidence={kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,
  netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:Number(orderEvidence.earned),shippingExpenseMinor:8000,paymentFeeMinor:Number(orderEvidence.fee),otherExpenseMinor:Number(orderEvidence.other),trainerPayoutPaidMinor:12000};
 const s1=reconcileOwnerProfitEvidence([indicativeEvidence],{overallCoverageVerified:true});
 const s2=reconcileOwnerProfitEvidence([{...indicativeEvidence,trainerPayoutPaidMinor:35000}],{overallCoverageVerified:true});
 assert.equal(s1.indicativeContributionMinor,43000);
 assert.equal(s2.indicativeContributionMinor,43000);
 assert.equal(s1.certifiedProfit,false);
 console.log('D8V_INDICATIVE_ONLY_NO_DOUBLE_SETTLEMENT=PASS');
 // Even with known, positive amounts, the real system has NOT verified completeness of
 // VAT, refund attribution, other expenses and provider settlements.
 const blocked=reconcileOwnerProfitEvidence([{...indicativeEvidence,coverageVerified:false}],{overallCoverageVerified:false});
 assert.equal(blocked.indicativeContributionMinor,null);assert.equal(blocked.certifiedProfit,false);
 const unknownExpense=reconcileOwnerProfitEvidence([{...indicativeEvidence,otherExpenseMinor:null}],{overallCoverageVerified:true});
 assert.equal(unknownExpense.indicativeContributionMinor,null);
 console.log('D8V_REAL_WORLD_COVERAGE_STILL_FAIL_CLOSED=PASS');

 const missing=reconcileOwnerProfitEvidence([
  {kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:false,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:null,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:null},
  {kind:'TRAINER_PACKAGE_ORDER',id:trainerOrder,finalized:true,coverageVerified:false,netRevenueMinor:120000,refundNetMinor:0,productCostMinor:10500,trainerEarnedMinor:0,shippingExpenseMinor:6000,paymentFeeMinor:null,otherExpenseMinor:null}
 ],{overallCoverageVerified:false});
 assert.equal(missing.certifiedProfit,false);assert.equal(missing.indicativeContributionMinor,null);
 assert.equal(missing.orderCount,2);assert.ok(missing.orders.every(o=>o.blockers.length));
 console.log('D8V_MISSING_FEES_EARNINGS_OTHER_EXPENSE_FAIL_CLOSED=PASS');
 const known={kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:20000,shippingExpenseMinor:8000,paymentFeeMinor:3000,otherExpenseMinor:2000};
 const contribution=reconcileOwnerProfitEvidence([{...known,trainerPayoutPaidMinor:5000}],{overallCoverageVerified:true});
 const paidAgain=reconcileOwnerProfitEvidence([{...known,trainerPayoutPaidMinor:20000}],{overallCoverageVerified:true});
 assert.equal(contribution.status,'INDICATIVE_CONTRIBUTION');
 assert.equal(contribution.indicativeContributionMinor,58000);
 assert.equal(paidAgain.indicativeContributionMinor,58000);
 assert.equal(paidAgain.certifiedProfit,false);
 console.log('D8V_INDICATIVE_ONLY_AND_NO_DOUBLE_PAYOUT=PASS');

 // SQL-derived amounts may feed an INDICATIVE contribution only with explicit evidence.
 // PayTR commission, other expenses and trainer accrual completeness are still unknown.
 assert.equal(c1.totalCostMinor,24000);assert.equal(c2.totalCostMinor,10500);
 const incomplete=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:false,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:c1.totalCostMinor,trainerEarnedMinor:null,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:null,trainerPayoutPaidMinor:0}],{overallCoverageVerified:false});
 assert.equal(incomplete.indicativeContributionMinor,null);assert.equal(incomplete.certifiedProfit,false);
 console.log('D8V_UNKNOWN_COMMISSION_HAKEDIS_OTHER_EXPENSE_FAIL_CLOSED=PASS');

 // Real SQL joins now see synthetic rows as actual orders in the disposable clone.
 const coverage=await readOwnerProfitCoverage(pool,{});const gaps=await readOrderEvidenceGaps(pool,{});
 assert.equal(coverage.scopeOrderCount,2);assert.equal(coverage.withSnapshot,2);assert.equal(coverage.recordedCostMinor,34500);
 assert.equal(gaps.scopeOrderCount,2);assert.equal(gaps.rows.length,2);
 assert.ok(gaps.rows.every(x=>x.costLines>0&&x.recordedCostMinor!==null));
 assert.deepEqual(new Set(gaps.rows.map(x=>x.kind)),new Set(['STUDENT_ORDER','TRAINER_PACKAGE_ORDER']));
 assert.equal(coverage.certifiedProfit,false);assert.equal(gaps.certifiedProfit,false);
 console.log('D8V_SQL_ORDER_COST_COVERAGE=PASS');
 const later=await readOwnerProfitCoverage(pool,{from:'2099-01-01'});
 assert.equal(later.scopeOrderCount,0);assert.equal(later.certifiedProfit,false);
 console.log('D8V_DATE_SCOPE_NO_FALSE_SALES=PASS');
 const tx=await pool.connect();try{await tx.query('begin read only');const r=await readOrderEvidenceGaps(tx,{});assert.equal(r.scopeOrderCount,2);await tx.query('rollback');}finally{tx.release();}
 console.log('D8V_READ_ONLY_REPORT_SQL=PASS');
 const indicative=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:30000,shippingExpenseMinor:8000,paymentFeeMinor:5000,otherExpenseMinor:2000,trainerPayoutPaidMinor:30000}],{overallCoverageVerified:true});
 assert.equal(indicative.indicativeContributionMinor,46000);assert.equal(indicative.certifiedProfit,false);
 const unknown=reconcileOwnerProfitEvidence([{kind:'STUDENT_ORDER',id:studentOrder,finalized:true,coverageVerified:true,netRevenueMinor:125000,refundNetMinor:10000,productCostMinor:24000,trainerEarnedMinor:30000,shippingExpenseMinor:8000,paymentFeeMinor:null,otherExpenseMinor:2000,trainerPayoutPaidMinor:30000}],{overallCoverageVerified:true});
 assert.equal(unknown.indicativeContributionMinor,null);assert.equal(unknown.certifiedProfit,false);
 console.log('D8V_NO_DOUBLE_PAYOUT_AND_FAIL_CLOSED=PASS');
 console.log('R410_D8V_SYNTHETIC_ORDERS_SQL_ACCEPTANCE=PASS');
}finally{
 if(pool)await pool.end();
 if(created){await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()',[name]);await admin.query(`drop database "${name}"`);console.log('D8V_CLONE_CLEANUP=PASS');}
 await admin.end();
}
