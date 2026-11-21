// R410 D8L: read-only evidence coverage. No automated profit certification.
const ERR = (code, status=400) => Object.assign(new Error(code), {code,status});
const DATE=/^\d{4}-\d{2}-\d{2}$/u;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function validDate(s){const [y,m,d]=s.split('-').map(Number);const a=new Date(Date.UTC(y,m-1,d));return a.getUTCFullYear()===y&&a.getUTCMonth()===m-1&&a.getUTCDate()===d;}
export function parseProfitCoverageFilters(input={}) {
 const from=String(input.from||''),to=String(input.to||''),currency=String(input.currency||'').toUpperCase();
 const packageId=String(input.packageId||''),trainerId=String(input.trainerId||'');
 if((from&&(!DATE.test(from)||!validDate(from)))||(to&&(!DATE.test(to)||!validDate(to))))throw ERR('INVALID_DATE');
 if(from&&to&&from>to)throw ERR('INVALID_DATE_RANGE');
 if(currency&&currency!=='TRY')throw ERR('TRY_ONLY');
 if((packageId&&!UUID.test(packageId))||(trainerId&&!UUID.test(trainerId)))throw ERR('INVALID_FILTER_ID');
 return {from,to,currency:currency||'TRY',packageId,trainerId};
}
const safeInt=(value,name)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw ERR('INVALID_EVIDENCE_'+name,503);return n;};
export function buildProfitCoverageOverview(rows,scopeCount){
 if(!Array.isArray(rows))throw ERR('EVIDENCE_ROWS_INVALID',503);
 const total=safeInt(scopeCount,'SCOPE');
 const seen=new Set();let knownMinor=0,withSnapshot=0,withoutSnapshot=0;
 const orders=rows.map(row=>{
  if(!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(row.orderKind)||!UUID.test(String(row.orderId||'')))throw ERR('ORDER_IDENTITY_INVALID',503);
  const key=row.orderKind+':'+row.orderId;
  if(seen.has(key))throw ERR('DUPLICATE_ORDER',503);seen.add(key);
  if(row.costLines==null||row.costMinor==null)throw ERR('MISSING_EVIDENCE_AMOUNT',503);
  const costLines=safeInt(row.costLines,'LINES');
  const costMinor=safeInt(row.costMinor,'COST');
  if(costLines===0&&costMinor!==0)throw ERR('COST_WITHOUT_LINES',503);
  if(costLines>0)withSnapshot++;else withoutSnapshot++;
  if(!Number.isSafeInteger(knownMinor+costMinor))throw ERR('AMOUNT_OVERFLOW',503);
  knownMinor+=costMinor;
  return {orderKind:row.orderKind,orderId:row.orderId,createdAt:row.createdAt||null,currency:row.currency,
   recordedCostMinor:costLines>0?costMinor:null,costLines,
   costEvidenceStatus:costLines>0?'SNAPSHOT_PRESENT_COVERAGE_UNVERIFIED':'MISSING_OR_NOT_APPLICABLE',
   blockers:['ORDER_COST_SCOPE_UNVERIFIED','VAT_AND_REFUNDS_UNVERIFIED','TRAINER_EARNINGS_UNALLOCATED','PAYTR_FEES_UNALLOCATED','SHIPPING_AND_OTHER_EXPENSES_UNALLOCATED']};
 });
 if(total<orders.length)throw ERR('SCOPE_COUNT_MISMATCH',503);
 return {status:'INCOMPLETE_EVIDENCE',certifiedProfit:false,coverageVerified:false,contributionMinor:null,
  scopeOrderCount:total,shownOrderCount:orders.length,truncated:total>orders.length,withSnapshot,withoutSnapshot,
  recordedCostMinor:knownMinor,orders,
  disclaimer:'Kayıtlı maliyet, kesin kâr değildir. Sipariş kapsamı, KDV, iade, eğitmen hakedişi, kargo, PayTR ve diğer giderler sipariş bazında mutabık olmadıkça katkı ve net kâr gösterilmez.'};
}
export async function readOwnerProfitCoverage(pool,input={}){
 const f=parseProfitCoverageFilters(input);
 // The finance screen offers package/trainer filters. Do not silently ignore them.
 if(f.packageId||f.trainerId)return {status:'FILTER_NOT_SUPPORTED',certifiedProfit:false,coverageVerified:false,contributionMinor:null,disclaimer:'Bu rapor paket veya eğitmen filtresiyle henüz mutabık değil. Kesin kâr hesaplanamaz.'};
 const values=[],where=[];
 const add=(val,expr)=>{values.push(val);where.push(expr.replace('$N','$'+values.length));};
 if(f.from)add(f.from,"created_at >= ($N::date::timestamp at time zone 'Europe/Istanbul')");
 if(f.to)add(f.to,"created_at < (($N::date+1)::timestamp at time zone 'Europe/Istanbul')");
 if(f.currency)add(f.currency,'currency=$N');
 const clause=where.length?' where '+where.join(' and '):'';
 // Status filters do not assume that a successful order implies cash settlement.
 const scoped=`select 'STUDENT_ORDER'::text as kind,id,created_at,currency from public.orders${clause}
 union all select 'TRAINER_PACKAGE_ORDER'::text as kind,id,created_at,currency from public.trainer_package_orders${clause}`;
 // Placeholder numbers in each UNION arm must be disjoint.
 // Build separate scopes below so all bind positions are valid.
 const params=[...values,...values];
 const replace=(part,offset)=>part.replace(/\$(\d+)/g,(_,n)=>'$'+(Number(n)+offset));
 const arms=scoped.split('\n union all ');
 const union=arms.length===2?arms[0]+'\n union all '+replace(arms[1],values.length):null;
 if(!union)throw ERR('QUERY_BUILD_FAILED',503);
 const totalRes=await pool.query(`select count(*)::bigint as total from (${union}) scoped`,params);
 const total=safeInt(totalRes.rows[0]?.total,'SCOPE');
 const {rows}=await pool.query(`with scoped as (${union})
  select s.kind as "orderKind",s.id as "orderId",s.created_at as "createdAt",s.currency,
   coalesce(c.lines,0)::int as "costLines",coalesce(c.cost_minor,0)::bigint as "costMinor"
  from scoped s left join lateral (
   select count(*)::integer as lines,coalesce(sum(total_cost_minor),0)::bigint as cost_minor
   from public.r410_order_product_cost_snapshots snap where snap.order_kind::text=s.kind and snap.order_id=s.id
  ) c on true
  order by s.created_at desc,s.id desc limit 200`,params);
 return buildProfitCoverageOverview(rows,total);
}
