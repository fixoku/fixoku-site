import {parseOwnerCost,COST_TYPES} from "./r410-product-cost-core.js";
export async function readOwnerProductCosts(db) {
  const result=await db.query(`select p.id,p.sku,p.title,p.product_type as "productType",p.list_gross_minor as "salePriceMinor",p.vat_rate_bps as "vatRateBps",p.is_active as "isActive",v.version as "costVersion",v.unit_cost_minor as "unitCostMinor",v.created_at as "costUpdatedAt" from public.physical_products p left join lateral (select version,unit_cost_minor,created_at from public.r410_product_cost_versions where product_id=p.id order by version desc limit 1) v on true where p.product_type in ('PHYSICAL','SOFTWARE') order by p.product_type,p.title,p.sku`);
  return result.rows;
}
export async function saveOwnerProductCost(client,raw,ownerId) {
  const v=parseOwnerCost(raw);
  await client.query("select pg_advisory_xact_lock(hashtext($1))",[`r410-cost:${v.productId}`]);
  const product=(await client.query("select id,product_type from public.physical_products where id=$1 for update",[v.productId])).rows[0];
  if (!product || !COST_TYPES.includes(product.product_type)) throw Object.assign(new Error("COST_PRODUCT_NOT_SUPPORTED"),{status:409});
  const latest=(await client.query("select version from public.r410_product_cost_versions where product_id=$1 order by version desc limit 1 for update",[v.productId])).rows[0];
  const current=Number(latest?.version||0);
  if(current!==v.expectedVersion) throw Object.assign(new Error("COST_STALE_VERSION"),{status:409});
  const inserted=(await client.query(`insert into public.r410_product_cost_versions(product_id,version,unit_cost_minor,currency,note,zero_cost_confirmed,created_by) values($1,$2,$3,'TRY',$4,$5,$6) returning product_id as "productId",version,unit_cost_minor as "unitCostMinor"`,[v.productId,current+1,v.costMinor,v.note||null,v.zeroCostConfirmed,ownerId])).rows[0];
  await client.query(`insert into public.platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r410.product.cost.update','physical_product',$2,'SUCCESS',gen_random_uuid(),$3)`,[ownerId,v.productId,JSON.stringify({costVersion:inserted.version,unitCostMinor:v.costMinor,currency:"TRY"})]);
  return inserted;
}
