import {createHash} from "node:crypto";
import {readStudentCart} from "./student-commerce.js";
import {readTrainerCart,assertTrainerPrincipal} from "./trainer-commerce.js";
const fail=(code,status=409)=>Object.assign(new Error(code),{status});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const wire=row=>({id:row.id,reference:row.reference,expectedAmountMinor:Number(row.expected_amount_minor),currency:row.currency});
const orderTable=kind=>kind==="STUDENT"?"orders":"trainer_package_orders";
const orderField=kind=>kind==="STUDENT"?"student_order_id":"trainer_order_id";
const buyerField=kind=>kind==="STUDENT"?"buyer_user_id":"trainer_user_id";
const noticeTable=kind=>kind==="STUDENT"?"student_bank_transfer_notifications":"trainer_bank_transfer_notifications";
export async function lockBankCheckout(client,principal,kind){
  if(kind==="TRAINER") await assertTrainerPrincipal(principal);
  else if(!principal.memberships?.some(m=>["STUDENT","GUARDIAN"].includes(m.role))) throw fail("FORBIDDEN",403);
  await client.query("select pg_advisory_xact_lock(hashtext($1))",[`R405_${kind}_CHECKOUT:${principal.user.id}`]);
}
function legalReady(kind,input){
 const l=input.legalAcceptance;
 if(l?.preInformation!==true||l?.distanceSales!==true||(kind==="STUDENT"&&l?.privacy!==true))throw fail("LEGAL_EXPLICIT_ACCEPTANCE_REQUIRED",400);
 if(kind==="TRAINER"&&(!l.documentHashes?.PRE_INFO||!l.documentHashes?.DISTANCE))throw fail("LEGAL_DOCUMENT_VERSION_MISMATCH",409);
}
export function validateBankTransferDate(value){
 const t=String(value||"").trim(); const d=new Date(t+"T00:00:00Z");
 const now=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 if(!/^\d{4}-\d{2}-\d{2}$/u.test(t)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==t||t>now)throw fail("TRANSFER_DATE_INVALID",400);
 return t;
}
async function snapshot(client,principal,kind,input){
 legalReady(kind,input);
 let cart,scope,lines,amount,currency;
 if(kind==="STUDENT"){
  const requested=input.childProfileId||input.studentProfileId||null;
  if(requested&&!uuid.test(String(requested)))throw fail("STUDENT_PROFILE_ID_INVALID",400);
  cart=await readStudentCart(client,principal,requested,requested?null:input);
  if(cart.items.some(i=>i.kind==="FAMILY_OFFER"))throw fail("FAMILY_OFFER_CHECKOUT_UNAVAILABLE");
  const b=cart.beneficiary;
  scope=`${b.studentUserId}:${b.studentProfileId||"-"}:${b.childProfileId||"-"}:${b.educationStage||"-"}:${b.grade||"-"}`;
  lines=cart.items.map(i=>({id:i.packageVersionId,amount:Number(i.priceMinor),currency:i.currency,stage:i.beneficiary?.educationStage,grade:i.beneficiary?.grade,components:(i.components||[]).map(c=>[c.packageComponentId,c.productId,c.quantity,c.saleGrossMinor,c.vatRateBps])}));
  amount=Number(cart.totalMinor);currency=cart.currency;
 }else{
  cart=await readTrainerCart(client,principal.user.id);
  const offerId=input.customOfferId||null;
  if(offerId&&!uuid.test(String(offerId)))throw fail("TRAINER_OFFER_NOT_AVAILABLE");
  let offer=null;
  if(offerId){
   const rows=(await client.query("select l.id,l.line_kind,l.package_version_id,l.gross_minor,l.net_minor,l.vat_minor,l.vat_rate_bps,l.discount_minor from r6_custom_offers o join r6_custom_offer_lines l on l.offer_id=o.id where o.id=$1 and o.customer_user_id=$2 and o.status='SENT' and (o.expires_at is null or o.expires_at>now()) order by l.line_order,l.id",[offerId,principal.user.id])).rows;
   if(rows.length!==1||rows[0].line_kind!=="PACKAGE"||!cart.items.some(i=>String(i.packageVersionId)===String(rows[0].package_version_id)))throw fail("TRAINER_OFFER_NOT_AVAILABLE");
   offer=rows[0];
  }
  scope=`${principal.user.id}:${offerId||"-"}`;
  lines=cart.items.map(i=>({id:i.packageVersionId,amount:Number(offer&&String(offer.package_version_id)===String(i.packageVersionId)?offer.gross_minor:i.priceGrossMinor),currency:i.currency,components:(i.includedItems||[]).map(c=>[c.componentId,c.quantity,c.productType]),offer:offer&&String(offer.package_version_id)===String(i.packageVersionId)?offer:null}));
  amount=lines.reduce((sum,item)=>sum+item.amount,0)+Number(cart.shippingMinor||0);currency=cart.items[0]?.currency||"TRY";
 }
 lines.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 if(!lines.length||!Number.isSafeInteger(amount)||amount<=0||lines.some(i=>!uuid.test(String(i.id))||!Number.isSafeInteger(i.amount)||i.amount<0||i.currency!==currency))throw fail("BANK_DRAFT_CART_INVALID");
 return {scope,lines,amount,currency,hash:digest({scope,lines,amount,currency,shipping:Number(cart.shippingMinor||0)})};
}
export async function prepareBankDraft(client,principal,kind,input){
 await lockBankCheckout(client,principal,kind);
 const s=await snapshot(client,principal,kind,input);
 const row=(await client.query(`insert into bank_transfer_checkout_drafts(buyer_user_id,checkout_kind,scope_key,cart_sha256,expected_amount_minor,currency) values($1,$2,$3,$4,$5,$6) on conflict(buyer_user_id,checkout_kind,scope_key,cart_sha256) where submitted_at is null do update set cart_sha256=excluded.cart_sha256 returning *`,[principal.user.id,kind,s.scope,s.hash,s.amount,s.currency])).rows[0];
 return wire(row);
}
export async function requireBankDraft(client,principal,kind,input,reportedAmount){
 await lockBankCheckout(client,principal,kind);
 if(!uuid.test(String(input.draftId||"")))throw fail("BANK_DRAFT_REQUIRED",400);
 const row=(await client.query("select * from bank_transfer_checkout_drafts where id=$1 and buyer_user_id=$2 and checkout_kind=$3 for update",[input.draftId,principal.user.id,kind])).rows[0];
 if(!row)throw fail("BANK_DRAFT_NOT_FOUND",404);
 if(reportedAmount!==Number(row.expected_amount_minor))throw fail("BANK_TRANSFER_AMOUNT_MISMATCH");
 const orderId=row[orderField(kind)];
 if(orderId){
  const order=(await client.query(`select * from ${orderTable(kind)} where id=$1 and ${buyerField(kind)}=$2 and payment_method='BANK_TRANSFER'`,[orderId,principal.user.id])).rows[0];
  const notification=(await client.query(`select * from ${noticeTable(kind)} where order_id=$1 and ${buyerField(kind)}=$2`,[orderId,principal.user.id])).rows[0];
  if(!order||!notification)throw fail("BANK_DRAFT_INTEGRITY_ERROR",503);
  return {row,replay:{replay:true,order:{id:order.id,status:order.status,paymentMethod:order.payment_method,totalMinor:Number(order.total_minor),currency:order.currency},notification,bankReference:row.reference,entitlementActivated:order.status==="PAID"}};
 }
 const s=await snapshot(client,principal,kind,input);
 if(row.scope_key!==s.scope||row.cart_sha256!==s.hash||Number(row.expected_amount_minor)!==s.amount||row.currency!==s.currency)throw fail("BANK_DRAFT_CART_CHANGED");
 return {row,snapshot:s,idempotencyKey:`R405-DRAFT-${row.id}`};
}
export async function linkBankDraft(client,principal,kind,draft,order){
 if(Number(order.total_minor)!==draft.snapshot.amount||order.currency!==draft.snapshot.currency||order.payment_method!=="BANK_TRANSFER")throw fail("BANK_DRAFT_ORDER_MISMATCH");
 const table=kind==="STUDENT"?"order_items":"trainer_package_order_items";
 const price=kind==="STUDENT"?"total_minor":"line_total_minor";
 const rows=(await client.query(`select package_version_id as id,${price} as amount,currency from ${table} where order_id=$1 order by package_version_id`,[order.id])).rows;
 const expected=draft.snapshot.lines.map(i=>[String(i.id),i.amount,i.currency]);
 const actual=rows.map(i=>[String(i.id),Number(i.amount),i.currency]);
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw fail("BANK_DRAFT_ORDER_MISMATCH");
 const linked=await client.query(`update bank_transfer_checkout_drafts set ${orderField(kind)}=$1,submitted_at=now() where id=$2 and buyer_user_id=$3 and submitted_at is null`,[order.id,draft.row.id,principal.user.id]);
 if(linked.rowCount!==1)throw fail("BANK_DRAFT_LINK_FAILED");
}
