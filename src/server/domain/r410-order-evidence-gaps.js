// R410 D8M: read-only order evidence gap diagnostics; NOT certified profit.
import {parseProfitCoverageFilters} from './r410-owner-profit-coverage.js';
const fail=(code,status=503)=>Object.assign(new Error(code),{code,status});
const n=(v,key)=>{const x=Number(v);if(!Number.isSafeInteger(x)||x<0)throw fail('INVALID_'+key);return x;};
export function buildOrderEvidenceGapReport(rows,scopeCount){
 if(!Array.isArray(rows))throw fail('INVALID_ROWS');
 const total=n(scopeCount,'SCOPE_COUNT'), seen=new Set();
 if(total<rows.length)throw fail('SCOPE_COUNT_MISMATCH');
 const items=rows.map(r=>{
  if(!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(r.kind)||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(r.orderId||'')))throw fail('INVALID_ORDER');
  const key=r.kind+':'+r.orderId;if(seen.has(key))throw fail('DUPLICATE_ORDER');seen.add(key);
  const costLines=n(r.costLines,'COST_LINES'),costMinor=n(r.costMinor,'COST_MINOR');
  const paytrAttempts=n(r.paytrAttempts,'PAYTR_ATTEMPTS');
  const payoutRecords=n(r.earningRecords,'EARNING_RECORDS');
  const shipmentRecords=n(r.shipmentRecords,'SHIPMENT_RECORDS');
  if(costLines===0&&costMinor!==0)throw fail('COST_WITHOUT_LINES');
  const blockers=['ORDER_COMPONENT_COVERAGE_UNVERIFIED','VAT_AND_REFUND_ALLOCATION_UNVERIFIED','PAYTR_FEE_AND_BANK_SETTLEMENT_UNVERIFIED','SHIPPING_COST_COVERAGE_UNVERIFIED','TRAINER_EARNING_ALLOCATION_UNVERIFIED','OTHER_EXPENSE_COVERAGE_UNVERIFIED'];
  if(!costLines)blockers.unshift('PRODUCT_COST_MISSING_OR_NOT_APPLICABLE');
  if(r.paymentMethod==='PAYTR'&&!paytrAttempts)blockers.push('PAYTR_ATTEMPT_MISSING');
  return {kind:r.kind,orderId:r.orderId,createdAt:r.createdAt||null,orderStatus:String(r.orderStatus||''),currency:String(r.currency||''),
   paymentMethod:String(r.paymentMethod||''),costLines,recordedCostMinor:costLines?costMinor:null,
   paytrAttempts,earningRecords:payoutRecords,shipmentRecords,blockers,certifiedProfit:false,contributionMinor:null};
 });
 return {status:'EVIDENCE_GAPS',certifiedProfit:false,coverageVerified:false,contributionMinor:null,scopeOrderCount:total,shownOrderCount:items.length,truncated:total>items.length,
  rows:items,disclaimer:'Bu ekran, kanıt varlığını gösterir; giderlerin tam ve doğrulanmış olduğunu kanıtlamaz. Kesin kâr hesaplanmaz.'};
}
export async function readOrderEvidenceGaps(pool,input={}){
 const f=parseProfitCoverageFilters(input);
 if(f.packageId||f.trainerId)return {status:'FILTER_NOT_SUPPORTED',certifiedProfit:false,contributionMinor:null,disclaimer:'Paket veya eğitmen filtresi bu uzlaştırmada henüz desteklenmiyor.'};
 const values=[],where=[];const add=(value,sql)=>{values.push(value);where.push(sql.replace('$N','$'+values.length));};
 if(f.from)add(f.from,"created_at >= ($N::date::timestamp at time zone 'Europe/Istanbul')");
 if(f.to)add(f.to,"created_at < (($N::date+1)::timestamp at time zone 'Europe/Istanbul')");
 add(f.currency,'currency=$N');
 const clause=' where '+where.join(' and ');
 const left=`select 'STUDENT_ORDER'::text as kind,id,created_at,currency,status::text as status,payment_method::text as payment_method from public.orders${clause}`;
 const offset=values.length;const right=`select 'TRAINER_PACKAGE_ORDER'::text as kind,id,created_at,currency,status::text as status,payment_method::text as payment_method from public.trainer_package_orders${clause}`.replace(/\$(\d+)/g,(_,k)=>'$'+(Number(k)+offset));
 const params=[...values,...values];const scoped=`${left} union all ${right}`;
 const counted=await pool.query(`select count(*)::bigint as total from (${scoped}) scoped`,params);
 const total=n(counted.rows[0]?.total,'SCOPE_COUNT');
 const r=await pool.query(`with scoped as (${scoped})
 select s.kind,s.id as "orderId",s.created_at as "createdAt",s.currency,s.status as "orderStatus",s.payment_method as "paymentMethod",
 coalesce(c.lines,0)::integer as "costLines",coalesce(c.amount,0)::bigint as "costMinor",
 (select count(*)::integer from public.paytr_payment_attempts a where a.order_kind::text=s.kind and a.order_id=s.id) as "paytrAttempts",
 case when s.kind='STUDENT_ORDER' then (select count(distinct el.id)::integer from public.order_items oi join public.package_entitlement_enrollments pee on pee.source_order_item_id=oi.id join public.trainer_earning_ledger el on el.enrollment_id=pee.enrollment_id where oi.order_id=s.id) else 0 end as "earningRecords",
 case when s.kind='STUDENT_ORDER' then (select count(*)::integer from public.shipments sh where sh.order_id=s.id) else (select count(*)::integer from public.trainer_order_shipments sh where sh.order_id=s.id) end as "shipmentRecords"
 from scoped s left join lateral (select count(*)::integer as lines,coalesce(sum(total_cost_minor),0)::bigint as amount from public.r410_order_product_cost_snapshots c where c.order_kind::text=s.kind and c.order_id=s.id) c on true
 order by s.created_at desc,s.id desc limit 100`,params);
 return buildOrderEvidenceGapReport(r.rows,total);
}
