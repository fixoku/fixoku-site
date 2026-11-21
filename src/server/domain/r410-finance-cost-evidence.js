// R410 D8I: owner-only read model; snapshot evidence is NOT certified profit.
const fail = (code,status=400) => Object.assign(new Error(code),{code,status});
const DATE=/^\d{4}-\d{2}-\d{2}$/u;
export function parseCostEvidenceFilters(input={}){
 const from=String(input.from||''), to=String(input.to||'');
 const kind=String(input.kind||'');
 if((from&&(!DATE.test(from)||!validDate(from)))||(to&&(!DATE.test(to)||!validDate(to))))throw fail('INVALID_DATE');
 if(from&&to&&from>to)throw fail('INVALID_DATE_RANGE');
 if(kind&&!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(kind))throw fail('INVALID_ORDER_KIND');
 return Object.freeze({from,to,kind});
}
function validDate(s){const [y,m,d]=s.split('-').map(Number);const v=new Date(Date.UTC(y,m-1,d));return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;}
export function buildCostEvidence(rows){
 if(!Array.isArray(rows))throw fail('EVIDENCE_ROWS_INVALID');
 let knownCostMinor=0;
 const orders=[];
 for(const row of rows){
  if(row.costMinor===null||row.costMinor===undefined||row.lines===null||row.lines===undefined)throw fail('EVIDENCE_ROW_INVALID',503);
  const n=Number(row.costMinor),lines=Number(row.lines);
  if(!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(lines)||lines<1||!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(row.orderKind))throw fail('EVIDENCE_ROW_INVALID',503);
  if(!/^[0-9a-f-]{36}$/i.test(String(row.orderId||'')))throw fail('EVIDENCE_ROW_INVALID',503);
  if(!Number.isSafeInteger(knownCostMinor+n))throw fail('COST_OVERFLOW',503);
  knownCostMinor+=n;
  orders.push({orderId:row.orderId,orderKind:row.orderKind,recordedAt:row.recordedAt,costMinor:n,lines});
 }
 return {status:'COST_EVIDENCE_ONLY',certifiedProfit:false,coverageVerified:false,knownOrderCount:orders.length,knownCostMinor,orders,disclaimer:'Sipariş kapsamı, eksik ürün maliyetleri, iade, kargo, ödeme komisyonu ve eğitmen hakedişi henüz bu raporda doğrulanmadı. Kâr tutarı hesaplanmaz.'};
}
export async function readCostEvidence(pool,filters){
 const f=parseCostEvidenceFilters(filters),params=[],where=[];
 const add=(value,sql)=>{params.push(value);where.push(sql.replace('$N','$'+params.length));};
 if(f.from)add(f.from,"recorded_at >= $N::date");
 if(f.to)add(f.to,"recorded_at < ($N::date + interval '1 day')");
 if(f.kind)add(f.kind,"order_kind = $N");
 const query=`select order_kind as "orderKind",order_id as "orderId",min(recorded_at) as "recordedAt",count(*)::integer as lines,sum(total_cost_minor)::bigint as "costMinor" from public.r410_order_product_cost_snapshots ${where.length?'where '+where.join(' and '):''} group by order_kind,order_id order by min(recorded_at) desc,order_id limit 500`;
 const rows=(await pool.query(query,params)).rows;
 return buildCostEvidence(rows);
}
