// R410 D8G: opt-in, transaction-bound order product-cost capture.
// Feature remains OFF until controlled migration, staging acceptance and explicit enablement.
import {recordOrderProductCostSnapshots} from './r410-order-cost-snapshot.js';
const fail=code=>Object.assign(new Error(code),{code,status:409});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function captureOrderProductCosts(client,orderKind,orderId,{enabled=process.env.FIXOKU_R410_ORDER_COST_SNAPSHOTS_ENABLED==='1'}={}){
 if(!['STUDENT_ORDER','TRAINER_PACKAGE_ORDER'].includes(orderKind)||!UUID.test(String(orderId)))throw fail('COST_ORDER_INVALID');
 if(!enabled)return {status:'DISABLED',costMinor:null};
 // On enabled environments a missing migration is an error, never a silent zero-cost sale.
 const schema=(await client.query("select to_regclass('public.r410_product_cost_versions') is not null and to_regclass('public.r410_order_product_cost_snapshots') is not null as ready")).rows[0];
 if(schema?.ready!==true)throw fail('R410_COST_MIGRATION_REQUIRED');
 const sql=orderKind==='STUDENT_ORDER' ? `
  select oi.id as "orderItemId",s.physical_product_id as "productId",s.quantity::int as quantity
  from public.order_items oi
  join public.r6_order_component_snapshots s on s.order_item_id=oi.id
  join public.physical_products p on p.id=s.physical_product_id
  where oi.order_id=$1 and p.product_type in ('PHYSICAL','SOFTWARE')
  order by oi.id,s.line_order` : `
  select oi.id as "orderItemId",p.id as "productId",(oi.quantity*pc.quantity)::int as quantity
  from public.trainer_package_order_items oi
  join public.package_components pc on pc.package_version_id=oi.package_version_id and pc.is_active=true
  join public.physical_products p on p.id=coalesce(pc.physical_product_id,pc.reference_id)
  where oi.order_id=$1 and p.product_type in ('PHYSICAL','SOFTWARE')
  order by oi.id,pc.display_order,pc.id`;
 const {rows}=await client.query(sql,[orderId]);
 const result=await recordOrderProductCostSnapshots(client,{orderKind,orderId,lines:rows});
 // INCOMPLETE must never be treated as zero cost or as certified profit.
 return result;
}
