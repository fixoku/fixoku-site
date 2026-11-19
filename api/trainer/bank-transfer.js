import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, createTrainerOrder, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { normalizeBankReference } from "../../src/server/domain/bank-reference-guard.js";
import {prepareBankDraft,requireBankDraft,linkBankDraft,validateBankTransferDate} from "../../src/server/domain/bank-checkout-drafts.js";
import { queueOwnerOrderEvent } from "../../src/server/domain/owner-order-notifications-r390.js";
import { queueRolePanelNotifications } from "../../src/server/domain/panel-notifications.js";

const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function body(req){if(req.body&&typeof req.body==="object")return req.body; if(typeof req.body==="string")return JSON.parse(req.body);let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
function amountMinor(value){if(Number.isSafeInteger(value)&&value>0)return value;const text=String(value??"").trim().replace(",",".");if(!/^\d{1,10}(?:\.\d{1,2})?$/u.test(text))throw Object.assign(new Error("REPORTED_AMOUNT_INVALID"),{status:400});const amount=Math.round(Number(text)*100);if(!Number.isSafeInteger(amount)||amount<=0)throw Object.assign(new Error("REPORTED_AMOUNT_INVALID"),{status:400});return amount;}
function requiredText(value,code,max=180){const text=String(value||"").trim();if(!text||text.length>max)throw Object.assign(new Error(code),{status:400});return text;}


export default async function handler(req,res){
  const principal=await resolvePrincipal(headers(req));if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});let client;
  try{
    const user=await assertTrainerPrincipal(principal);
    if(req.method==="GET"){
      const rows=(await pool.query('select n.id,n.order_id as "orderId",n.status,n.payer_name as "payerName",n.bank_name as "bankName",n.reported_amount_minor as "reportedAmountMinor",n.currency,n.transfer_date as "transferDate",n.reference,n.receipt_reference as "receiptReference",n.review_note as "reviewNote",n.submitted_at as "submittedAt",o.total_minor as "expectedAmountMinor" from trainer_bank_transfer_notifications n join trainer_package_orders o on o.id=n.order_id where n.trainer_user_id=$1 order by n.submitted_at desc',[user.id])).rows;return json(res,200,{notifications:rows});
    }
    if(req.method!=="POST")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
    const input=await body(req);
    client=await pool.connect();await client.query("begin");
    if(input.action==="PREPARE_DRAFT"){const draft=await prepareBankDraft(client,principal,"TRAINER",input);await client.query("commit");return json(res,200,{draft});}
    const payerName=requiredText(input.payerName,"PAYER_NAME_REQUIRED");const bankName=requiredText(input.bankName,"BANK_NAME_REQUIRED");const reference=normalizeBankReference(input.reference);const transferDate=validateBankTransferDate(input.transferDate);const reportedAmountMinor=amountMinor(input.reportedAmountMinor);
    let order;
    if(!input.orderId){
      const draft=await requireBankDraft(client,principal,"TRAINER",input,reportedAmountMinor);
      if(draft.replay){await client.query("commit");return json(res,200,draft.replay);}
      const result=await createTrainerOrder(client,principal,{...input,paymentMethod:"BANK_TRANSFER",idempotencyKey:draft.idempotencyKey},{manageTransaction:false});order=result.order;
      if(reportedAmountMinor!==Number(order.total_minor))throw Object.assign(new Error("BANK_TRANSFER_AMOUNT_MISMATCH"),{status:409});
      const notification=(await client.query(`insert into trainer_bank_transfer_notifications(order_id,trainer_user_id,status,payer_name,bank_name,reported_amount_minor,currency,transfer_date,reference) values($1,$2,'SUBMITTED',$3,$4,$5,$6,$7,$8) on conflict(order_id) do update set payer_name=excluded.payer_name,bank_name=excluded.bank_name,reported_amount_minor=excluded.reported_amount_minor,currency=excluded.currency,transfer_date=excluded.transfer_date,reference=excluded.reference,status='SUBMITTED',updated_at=now() where trainer_bank_transfer_notifications.status in ('SUBMITTED','IN_REVIEW') returning *`,[order.id,user.id,payerName,bankName,reportedAmountMinor,order.currency,transferDate,reference])).rows[0];
      if(!notification)throw Object.assign(new Error("BANK_TRANSFER_NOTIFICATION_NOT_REVIEWABLE"),{status:409});
      await linkBankDraft(client,principal,"TRAINER",draft,order);
      await queueRolePanelNotifications(client,{role:"OWNER",scopeType:"GLOBAL",eventType:"TRAINER_BANK_TRANSFER_ORDER",title:"Yeni eğitmen Havale/EFT bildirimi",body:"Eğitmen paketine ait Havale/EFT bildirimi Owner incelemesi bekliyor.",metadata:{path:"/panel/admin/egitmen-ticaret",orderId:order.id,notificationId:notification.id},dedupeKey:`trainer-bank-transfer-order:${order.id}`,emailSubject:"Yeni eğitmen Havale/EFT bildirimi"});
      await queueOwnerOrderEvent(client,{kind:"trainer",orderId:order.id,event:"bank",report:notification});await client.query("commit");
      return json(res,result.replay?200:201,{replay:Boolean(result.replay),order:{id:order.id,status:order.status,paymentMethod:order.payment_method,totalMinor:Number(order.total_minor),currency:order.currency},notification,bankReference:draft.row.reference,entitlementActivated:false,message:"Havale/EFT bildiriminiz alındı. Ödeme Owner tarafından doğrulanana kadar paket erişimi açılmaz."});
    }
    if(!TRAINER_COMMERCE_UUID.test(String(input.orderId)))throw Object.assign(new Error("ORDER_ID_INVALID"),{status:400});
    if((await client.query("select id from bank_transfer_checkout_drafts where trainer_order_id=$1",[input.orderId])).rowCount)throw Object.assign(new Error("BANK_DRAFT_REQUIRED"),{status:409});
    order=(await client.query("select id,trainer_user_id,status,total_minor,currency,payment_method from trainer_package_orders where id=$1 and trainer_user_id=$2 for update",[input.orderId,user.id])).rows[0];if(!order)throw Object.assign(new Error("ORDER_NOT_FOUND"),{status:404});
    if(order.payment_method!=="BANK_TRANSFER"||!["PAYMENT_REVIEW","PENDING_PAYMENT"].includes(order.status))throw Object.assign(new Error("ORDER_NOT_REVIEWABLE"),{status:409});if(reportedAmountMinor!==Number(order.total_minor))throw Object.assign(new Error("BANK_TRANSFER_AMOUNT_MISMATCH"),{status:409});
    const row=(await client.query('insert into trainer_bank_transfer_notifications(order_id,trainer_user_id,status,payer_name,bank_name,reported_amount_minor,currency,transfer_date,reference,receipt_reference) values($1,$2,\'SUBMITTED\',$3,$4,$5,$6,$7,$8,$9) on conflict(order_id) do update set payer_name=excluded.payer_name,bank_name=excluded.bank_name,reported_amount_minor=excluded.reported_amount_minor,currency=excluded.currency,transfer_date=excluded.transfer_date,reference=excluded.reference,status=\'SUBMITTED\',updated_at=now() returning *',[order.id,user.id,payerName,bankName,reportedAmountMinor,order.currency,transferDate,reference,null])).rows[0];await client.query("update trainer_package_orders set status='PAYMENT_REVIEW',updated_at=now() where id=$1",[order.id]);await client.query("commit");return json(res,201,{notification:row,entitlementActivated:false,message:"Ödeme bildiriminiz alınmıştır. Ödemeniz ekibimiz tarafından kontrol edilip onaylandığında eğitim paketiniz aktif hale getirilecektir."});
  }catch(error){if(client)await client.query("rollback").catch(()=>{});return json(res,error.status||409,{error:error.code||error.message||"BANK_TRANSFER_FAILED"});}finally{if(client)client.release();await pool.end();}
}
