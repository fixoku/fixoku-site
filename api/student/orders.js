import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createStudentCommerceOrder } from "../../src/server/domain/student-commerce.js";
import { devSettlementAllowed } from "../../src/server/domain/commerce.js";
const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([key,value])=>[key,String(value)]));
async function read(req){if(req.body&&typeof req.body==="object")return req.body;let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
async function readOrderSummary(client,order,buyerUserId) {
  const saved=(await client.query(`
    select id,status,payment_method,currency,
           subtotal_minor,shipping_minor,total_minor,
           shipping_address_snapshot_json is not null
             as requires_shipping
    from orders
    where id=$1
      and buyer_user_id=$2
      and catalog_scope_snapshot='STUDENT_COMMERCE'
  `,[order.id,buyerUserId])).rows[0];

  if(!saved)
    throw Object.assign(
      new Error("ORDER_SUMMARY_UNAVAILABLE"),
      {status:503}
    );

  const items=(await client.query(`
    select title_snapshot as title,
           total_minor as "totalMinor",
           quantity,currency
    from order_items
    where order_id=$1
    order by created_at,id
  `,[saved.id])).rows.map(item=>({
    title:item.title,
    totalMinor:Number(item.totalMinor),
    quantity:Number(item.quantity),
    currency:item.currency
  }));

  if(!items.length)
    throw Object.assign(
      new Error("ORDER_SUMMARY_UNAVAILABLE"),
      {status:503}
    );

  const subtotalMinor=Number(saved.subtotal_minor);
  const shippingMinor=Number(saved.shipping_minor);
  const totalMinor=Number(saved.total_minor);

  if(
    ![subtotalMinor,shippingMinor,totalMinor]
      .every(n=>Number.isSafeInteger(n)&&n>=0) ||
    items.some(item=>
      !Number.isSafeInteger(item.totalMinor) ||
      item.totalMinor<0 ||
      item.currency!==saved.currency
    ) ||
    items.reduce((sum,item)=>sum+item.totalMinor,0)
      !==subtotalMinor ||
    subtotalMinor+shippingMinor!==totalMinor
  ) {
    throw Object.assign(
      new Error("ORDER_SUMMARY_AMOUNT_MISMATCH"),
      {status:503}
    );
  }

  return {
    id:saved.id,
    status:saved.status,
    paymentMethod:saved.payment_method,
    currency:saved.currency,
    subtotalMinor,
    shippingMinor,
    totalMinor,
    requiresShipping:saved.requires_shipping===true,
    items
  };
}
export default async function handler(req,res){const principal=await resolvePrincipal(headers(req));if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});const denied=requirePermission(principal,"order.create");if(denied)return json(res,denied.status,denied.body);const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const client=await pool.connect();try{if(req.method==="GET"){const url=new URL(req.url||"/","http://local");const orderId=String(url.searchParams.get("orderId")||"");if(!orderId)return json(res,400,{error:"ORDER_ID_REQUIRED"});const row=(await client.query("select id,status,payment_method,currency,subtotal_minor,shipping_minor,total_minor,shipping_address_snapshot_json is not null as requires_shipping from orders where id=$1 and buyer_user_id=$2 and catalog_scope_snapshot='STUDENT_COMMERCE'",[orderId,principal.user.id])).rows[0];if(!row)return json(res,404,{error:"ORDER_NOT_FOUND"});const items=(await client.query("select title_snapshot as title,total_minor as \"totalMinor\",quantity,currency from order_items where order_id=$1 order by created_at,id",[orderId])).rows.map(item=>({...item,totalMinor:Number(item.totalMinor),quantity:Number(item.quantity)}));const shipment=(await client.query("select s.id,s.status,s.carrier,s.tracking_number as \"trackingNumber\",s.tracking_url as \"trackingUrl\",d.dispatch_status as \"dispatchStatus\",d.provider_name as \"providerName\",d.provider_tracking_number as \"providerTrackingNumber\",d.provider_tracking_url as \"providerTrackingUrl\" from shipments s left join shipment_dispatches d on d.shipment_id=s.id where s.order_id=$1 limit 1",[orderId])).rows[0]||null;return json(res,200,{order:{id:row.id,status:row.status,paymentMethod:row.payment_method,currency:row.currency,subtotalMinor:Number(row.subtotal_minor),shippingMinor:Number(row.shipping_minor),totalMinor:Number(row.total_minor),requiresShipping:row.requires_shipping===true,items,shipment}});}if(req.method!=="POST")return json(res,405,{error:"METHOD_NOT_ALLOWED"});const input=await read(req);const result=await createStudentCommerceOrder(client,principal,{...input,idempotencyKey:req.headers["idempotency-key"]||input.idempotencyKey});const orderSummary=await readOrderSummary(client,result.order,principal.user.id);return json(res,result.replay?200:201,{...result,orderSummary,devSettlementAvailable:devSettlementAllowed(req),checkoutState:result.providerConfigured?"PROVIDER_HANDOFF_REQUIRED":"PAYMENT_PROVIDER_NOT_CONFIGURED"});}catch(error){return json(res,error.status||409,{error:error.code||error.message||"STUDENT_ORDER_FAILED"});}finally{client.release();await pool.end();}}
