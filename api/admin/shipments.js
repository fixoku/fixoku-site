import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { shippingRuntime } from "../../src/server/shipping/adapter.js";
const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
export default async function handler(req,res){
  if(req.method!=="GET")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
  const p=await resolvePrincipal(new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]))); if(!p)return json(res,401,{error:"UNAUTHENTICATED"});
  const d=requirePermission(p,"shipment.read"); if(d)return json(res,d.status,d.body);
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{
    const rows=(await pool.query(`select s.id,s.order_id as "orderId",s.status,s.beneficiary_student_user_id as "beneficiaryStudentUserId",coalesce(nullif(trim(sp.first_name || ' ' || sp.last_name),''),u.display_name,'Öğrenci') as "beneficiaryStudentName",s.address_snapshot_json as "addressSnapshotJson",s.carrier,s.tracking_number as "trackingNumber",s.label_reference as "labelReference",s.shipping_charge_minor as "shippingChargeMinor",s.actual_shipping_cost_minor as "actualShippingCostMinor",s.provider_enabled as "providerEnabled",s.shipped_at as "shippedAt",s.delivered_at as "deliveredAt",s.created_at as "createdAt" from shipments s left join platform_users u on u.id=s.beneficiary_student_user_id left join student_profiles sp on sp.user_id=s.beneficiary_student_user_id order by s.created_at desc`)).rows;
    for(const row of rows) row.items=(await pool.query('select si.id,si.physical_product_id as "physicalProductId",si.quantity,si.title_snapshot as "titleSnapshot",p.sku from shipment_items si join physical_products p on p.id=si.physical_product_id where si.shipment_id=$1 order by si.id',[row.id])).rows;
    const trainerShipments=(await pool.query(`select s.id,s.order_id as "orderId",s.status,s.trainer_user_id as "trainerUserId",u.display_name as "trainerName",s.address_snapshot_json as "addressSnapshotJson",s.carrier,s.tracking_number as "trackingNumber",s.created_at as "createdAt" from trainer_order_shipments s left join platform_users u on u.id=s.trainer_user_id order by s.created_at desc`)).rows;
    for(const row of trainerShipments) row.items=(await pool.query('select si.id,si.quantity,si.title_snapshot as "titleSnapshot",si.sku_snapshot as "skuSnapshot",si.display_label_snapshot as "displayLabelSnapshot",p.image_reference as "imageReference" from trainer_order_shipment_items si join physical_products p on p.id=si.physical_product_id where si.trainer_order_shipment_id=$1 order by si.id',[row.id])).rows;
    const provider=shippingRuntime(); return json(res,200,{shipments:rows,trainerShipments,provider:{name:provider.provider,enabled:provider.enabled,credentialsConfigured:provider.enabled,runtime:provider.status,runtimeVerified:false,readyForLive:false,providerDispatch:"DISABLED_PENDING_APPROVAL"}});
  }catch{return json(res,503,{error:"SHIPMENTS_UNAVAILABLE"});}finally{await pool.end();}
}
