/* Limited admin preparation workflow. No provider requests or SHIPPED writes. */
import pg from 'pg';
import { resolvePrincipal, requirePermission } from '../../../src/server/auth/authorization.js';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const respond=(res,code,obj)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(obj));};
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST')return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  let principal;
  try{principal=await resolvePrincipal(new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)])));}
  catch{return respond(res,503,{error:'AUTHORITY_UNAVAILABLE'});}
  if(!principal)return respond(res,401,{error:'UNAUTHENTICATED'});
  const denied=requirePermission(principal,req.method==='GET'?'shipment.read':'shipment.manage');
  if(denied)return respond(res,denied.status,denied.body);
  const id=String(req.query?.id||'');if(!ID.test(id))return respond(res,400,{error:'SHIPMENT_ID_INVALID'});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});let client;
  try{
    client=await pool.connect();
    await client.query('BEGIN');
    const row=(await client.query('select s.id,s.order_id as "orderId",s.status,s.carrier,s.tracking_number as "trackingNumber",o.status as "orderStatus" from trainer_order_shipments s join trainer_package_orders o on o.id=s.order_id where s.id=$1 for update of s',[id])).rows[0];
    if(!row){await client.query('ROLLBACK');return respond(res,404,{error:'SHIPMENT_NOT_FOUND'});}
    if(req.method==='GET'){await client.query('COMMIT');return respond(res,200,{shipment:row,providerDispatch:'DISABLED'});}
    // All admin POSTs have one strict purpose: mark an already paid physical shipment PACKED.
    // Everything involving carrier tracking, SHIPPED, or a live provider is forbidden here.
    const data=await (async()=>{let b='';for await(const c of req){b+=c;if(b.length>1024)throw new Error('REQUEST_TOO_LARGE');}return b?JSON.parse(b):{};})();
    if(data.action!=='PACKED') {await client.query('ROLLBACK');return respond(res,400,{error:'ONLY_PACKED_ALLOWED'});}
    if(row.orderStatus!=='PAID') {await client.query('ROLLBACK');return respond(res,409,{error:'PAYMENT_NOT_SETTLED'});}
    if(row.status==='PACKED'){await client.query('COMMIT');return respond(res,200,{status:'REPLAYED',shipment:{id,status:'PACKED'}});}
    if(row.status!=='PREPARING'){await client.query('ROLLBACK');return respond(res,409,{error:'INVALID_SHIPMENT_TRANSITION'});}
    const count=(await client.query('select count(*)::int as count from trainer_order_shipment_items where trainer_order_shipment_id=$1',[id])).rows[0]?.count||0;
    if(!count){await client.query('ROLLBACK');return respond(res,409,{error:'PHYSICAL_ITEMS_REQUIRED'});}
    const updated=(await client.query("update trainer_order_shipments set status='PACKED',updated_at=now() where id=$1 and status='PREPARING' returning id,status",[id])).rows[0];
    if(!updated)throw new Error('PACK_CONCURRENCY_CONFLICT');
    await client.query('insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,$3,$4,$5,gen_random_uuid(),$6)',[principal.user.id,'trainer.shipment.packed','trainer_order_shipment',id,'SUCCESS',JSON.stringify({itemCount:count})]);
    await client.query('COMMIT');return respond(res,200,{status:'TRANSITIONED',shipment:updated});
  }catch{if(client)try{await client.query('ROLLBACK');}catch{}return respond(res,503,{error:'SHIPMENT_PREPARATION_UNAVAILABLE'});}
  finally{client?.release();await pool.end();}
}
