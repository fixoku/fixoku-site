// R410 D8F: immutable product-cost evidence for an already verified order transaction.
// Caller owns BEGIN/COMMIT and must provide authoritative order component rows.
const fail = (code) => Object.assign(new Error(code), {code, status:409});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeCostLines(lines) {
 if(!Array.isArray(lines)) throw fail('COST_LINES_INVALID');
 const grouped=new Map();
 for(const raw of lines){
  const orderItemId=String(raw?.orderItemId||''), productId=String(raw?.productId||'');
  const qty=raw?.quantity;
  if(!UUID.test(orderItemId)||!UUID.test(productId)||!Number.isSafeInteger(qty)||qty<1||qty>99)throw fail('COST_LINE_INVALID');
  const k=orderItemId+':'+productId;
  const q=(grouped.get(k)?.quantity||0)+qty;
  if(q>99)throw fail('COST_QUANTITY_OVERFLOW');
  grouped.set(k,{orderItemId,productId,quantity:q});
 }
 return [...grouped.values()];
}
export async function recordOrderProductCostSnapshots(client,{orderKind,orderId,lines}){
 if(!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(orderKind)||!UUID.test(String(orderId)))throw fail('COST_ORDER_INVALID');
 const normalized=normalizeCostLines(lines);
 if(!normalized.length)return {status:'NO_COST_PRODUCTS',lines:0,totalCostMinor:0};
 // Serialize identical order replays. This lock participates in caller's transaction.
 await client.query('select pg_advisory_xact_lock(hashtext($1))',[`r410-order-cost:${orderKind}:${orderId}`]);
 const ids=[...new Set(normalized.map(x=>x.productId))];
 const {rows:products}=await client.query(`select p.id,p.product_type,v.version,v.unit_cost_minor
  from public.physical_products p
  left join lateral (select version,unit_cost_minor from public.r410_product_cost_versions where product_id=p.id order by version desc limit 1) v on true
  where p.id=any($1::uuid[])`,[ids]);
 const map=new Map(products.map(p=>[p.id,p]));
 let total=0; const prepared=[]; const missing=[];
 for(const l of normalized){
  const p=map.get(l.productId);
  if(!p||!['PHYSICAL','SOFTWARE'].includes(p.product_type)||p.version==null||p.unit_cost_minor==null){missing.push(l.productId);continue;}
  const unit=Number(p.unit_cost_minor),version=Number(p.version),line=unit*l.quantity;
  if(!Number.isSafeInteger(unit)||unit<0||!Number.isSafeInteger(version)||version<1||!Number.isSafeInteger(line)||!Number.isSafeInteger(total+line))throw fail('COST_AMOUNT_OVERFLOW');
  total+=line;prepared.push({...l,version,unit,total:line});
 }
 if(missing.length) return {status:'INCOMPLETE',lines:normalized.length,totalCostMinor:null,missingProductIds:[...new Set(missing)]};
 // Never silently update immutable snapshots. Duplicate retries must match original records.
 for(const p of prepared){
  const prior=(await client.query(`select order_id,quantity,cost_version,unit_cost_minor,total_cost_minor from public.r410_order_product_cost_snapshots where order_kind=$1 and order_item_id=$2 and product_id=$3`,[orderKind,p.orderItemId,p.productId])).rows[0];
  if(prior){
   if(String(prior.order_id)!==String(orderId)||Number(prior.quantity)!==p.quantity||Number(prior.cost_version)!==p.version||Number(prior.unit_cost_minor)!==p.unit||Number(prior.total_cost_minor)!==p.total)throw fail('COST_REPLAY_CONFLICT');
  }else{
   await client.query(`insert into public.r410_order_product_cost_snapshots(order_kind,order_id,order_item_id,product_id,cost_version,quantity,unit_cost_minor,total_cost_minor) values($1,$2,$3,$4,$5,$6,$7,$8)`,[orderKind,orderId,p.orderItemId,p.productId,p.version,p.quantity,p.unit,p.total]);
  }
 }
 return {status:'COMPLETE',lines:prepared.length,totalCostMinor:total};
}
