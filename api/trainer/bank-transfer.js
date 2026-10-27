import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { queueRolePanelNotifications } from "../../src/server/domain/panel-notifications.js";

const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function body(req){let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}

export default async function handler(req,res){
  const principal=await resolvePrincipal(headers(req));
  if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{
    const user=await assertTrainerPrincipal(principal);
    if(req.method==="GET"){
      const rows=(await pool.query('select n.id,n.order_id as "orderId",n.status,n.payer_name as "payerName",n.bank_name as "bankName",n.reported_amount_minor as "reportedAmountMinor",n.currency,n.transfer_date as "transferDate",n.reference,n.receipt_reference as "receiptReference",n.review_note as "reviewNote",n.submitted_at as "submittedAt",o.total_minor as "expectedAmountMinor" from trainer_bank_transfer_notifications n join trainer_package_orders o on o.id=n.order_id where n.trainer_user_id=$1 order by n.submitted_at desc',[user.id])).rows;
      return json(res,200,{notifications:rows});
    }
    if(req.method!=="POST")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
    const input=await body(req);
    if(!TRAINER_COMMERCE_UUID.test(String(input.orderId||"")))return json(res,400,{error:"ORDER_ID_INVALID"});
    const order=(await pool.query("select id,trainer_user_id,status,total_minor,currency from trainer_package_orders where id=$1 and trainer_user_id=$2",[input.orderId,user.id])).rows[0];
    if(!order)return json(res,404,{error:"ORDER_NOT_FOUND"});
    if(!["PAYMENT_REVIEW","PENDING_PAYMENT"].includes(order.status))return json(res,409,{error:"ORDER_NOT_REVIEWABLE"});
    const amount=Number(input.reportedAmountMinor);
    if(!Number.isSafeInteger(amount)||amount<=0)return json(res,400,{error:"REPORTED_AMOUNT_INVALID"});
    const payerName=String(input.payerName||"").trim();
    const bankName=String(input.bankName||"").trim();
    const transferDate=String(input.transferDate||"").trim();
    const reference=String(input.reference||"").trim();
    if(!payerName||!bankName||!transferDate||!reference)return json(res,400,{error:"BANK_TRANSFER_FIELDS_REQUIRED"});
    const row=(await pool.query('insert into trainer_bank_transfer_notifications(order_id,trainer_user_id,status,payer_name,bank_name,reported_amount_minor,currency,transfer_date,reference,receipt_reference) values($1,$2,\'SUBMITTED\',$3,$4,$5,$6,$7,$8,$9) on conflict(order_id) do update set payer_name=excluded.payer_name,bank_name=excluded.bank_name,reported_amount_minor=excluded.reported_amount_minor,currency=excluded.currency,transfer_date=excluded.transfer_date,reference=excluded.reference,receipt_reference=excluded.receipt_reference,status=\'SUBMITTED\',updated_at=now() returning *',[order.id,user.id,payerName,bankName,amount,order.currency,transferDate,reference,String(input.receiptReference||"").trim()||null])).rows[0];
    await pool.query("update trainer_package_orders set status='PAYMENT_REVIEW',updated_at=now() where id=$1",[order.id]);
    await pool.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'trainer.commerce.bank_transfer.submitted','trainer_package_order',$2,'SUCCESS',gen_random_uuid(),$3)",[user.id,order.id,JSON.stringify({notificationId:row.id,reportedAmountMinor:amount})]);
    await queueRolePanelNotifications(pool, {
      role: "OWNER",
      scopeType: "GLOBAL",
      eventType: "TRAINER_BANK_TRANSFER_ORDER",
      title: "Yeni eğitmen Havale/EFT bildirimi",
      body: "Eğitmen paketine ait Havale/EFT bildirimi Owner incelemesi bekliyor.",
      metadata: { path: "/panel/admin/egitmen-ticaret", orderId: order.id, notificationId: row.id },
      dedupeKey: `trainer-bank-transfer-order:${order.id}`,
      emailSubject: "Yeni eğitmen Havale/EFT bildirimi",
    });
    return json(res,201,{notification:row,entitlementActivated:false,message:"Ödeme bildiriminiz alınmıştır. Ödemeniz ekibimiz tarafından kontrol edilip onaylandığında eğitim paketiniz otomatik olarak aktif hale getirilecektir. Onay sonrasında panel bildirimi ve e-posta ile bilgilendirileceksiniz."});
  }catch(error){return json(res,error.status||409,{error:error.code||error.message||"BANK_TRANSFER_FAILED"});}
  finally{await pool.end();}
}
