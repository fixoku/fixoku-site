/* This endpoint is READ ONLY and NEVER calls the cargo provider. */
import pg from 'pg';
import { resolvePrincipal, requirePermission } from '../../../src/server/auth/authorization.js';
import { preflightOrderShipment } from '../../../src/server/shipping/order-preflight.js';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const respond=(res,code,obj)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(obj));};
export default async function handler(req,res){
  if(req.method!=='GET') return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  let principal;
  try {principal=await resolvePrincipal(new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)])));}
  catch {return respond(res,503,{error:'AUTHORITY_UNAVAILABLE'});}
  if(!principal) return respond(res,401,{error:'UNAUTHENTICATED'});
  const denied=requirePermission(principal,'shipment.manage');
  if(denied) return respond(res,denied.status,denied.body);
  const id=String(req.query?.id||'');
  const audience=String(req.query?.audience||'').toUpperCase();
  if(!ID.test(id)||!['STUDENT','TRAINER'].includes(audience))return respond(res,400,{error:'INVALID_SHIPMENT_SELECTOR'});
  // Package count must be measured by the human packing the box, never inferred from book count.
  const packageCount=Number(req.query?.packageCount);
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  let client;
  try {
    client=await pool.connect();
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const trainer=audience==='TRAINER';
    const sql=trainer
      ? 'select s.id,s.status,s.carrier,s.tracking_number as "trackingNumber",null::text as "labelReference",s.provider_enabled as "providerEnabled",s.address_snapshot_json as "addressSnapshot",o.status as "orderStatus" from trainer_order_shipments s join trainer_package_orders o on o.id=s.order_id where s.id=$1'
      : 'select s.id,s.status,s.carrier,s.tracking_number as "trackingNumber",s.label_reference as "labelReference",s.provider_enabled as "providerEnabled",s.address_snapshot_json as "addressSnapshot",o.status as "orderStatus" from shipments s join orders o on o.id=s.order_id where s.id=$1';
    const row=(await client.query(sql,[id])).rows[0];
    if(!row){await client.query('COMMIT');return respond(res,404,{error:'SHIPMENT_NOT_FOUND'});}
    const itemSql=trainer
      ? 'select si.physical_product_id as "productId",si.quantity,p.product_type as "productType" from trainer_order_shipment_items si join physical_products p on p.id=si.physical_product_id where si.trainer_order_shipment_id=$1'
      : 'select si.physical_product_id as "productId",si.quantity,p.product_type as "productType" from shipment_items si join physical_products p on p.id=si.physical_product_id where si.shipment_id=$1';
    const items=(await client.query(itemSql,[id])).rows;
    await client.query('COMMIT');
    const sender={cityId:process.env.SHIPPING_KG_SENDER_CITY_ID,districtId:process.env.SHIPPING_KG_SENDER_DISTRICT_ID,address:process.env.SHIPPING_KG_SENDER_ADDRESS,phone:process.env.SHIPPING_KG_SENDER_PHONE};
    const check=preflightOrderShipment({audience,shipment:row,orderStatus:row.orderStatus,items,sender,packageCount});
    if(String(process.env.SHIPPING_PROVIDER||'').trim().toUpperCase()!=='KOLAYGELSIN'){
      check.blockers.push('KG_PROVIDER_NOT_SELECTED');check.eligible=false;
    }
    // Never expose personal addresses, phone numbers, tokens or raw provider payload.
    return respond(res,200,{audience,shipmentId:id,eligible:check.eligible,blockers:check.blockers,referenceNo:check.referenceNo,physicalLineCount:check.physicalLineCount,packageCount:check.packageCount,provider:'KOLAYGELSIN',operation:'PREFLIGHT_ONLY_NO_DISPATCH'});
  }catch{if(client)try{await client.query('ROLLBACK');}catch{}return respond(res,503,{error:'SHIPMENT_PREFLIGHT_UNAVAILABLE'});}
  finally{client?.release();await pool.end();}
}
