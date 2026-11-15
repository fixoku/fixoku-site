import { queueOwnerManagementEmail } from "./owner-management-notifications-r390.js";

const money = n => {
  if (n == null || !Number.isSafeInteger(Number(n)) || Number(n) < 0) return undefined;
  return new Intl.NumberFormat("tr-TR", {minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)/100)+" ₺";
};
export function ownerOrderMetadata(order, items, person, kind, report = null) {
  if (order.currency !== "TRY" || money(order.total_minor) === undefined || !items.length) throw new Error("OWNER_ORDER_METADATA_INVALID");
  const lines = items.map(item => {
    const total = kind === "trainer" ? item.line_total_minor : item.total_minor;
    if (!item.title_snapshot || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity)<1 || money(total)===undefined || item.currency!==order.currency) throw new Error("OWNER_ORDER_ITEM_INVALID");
    return {name:item.title_snapshot, quantity:Number(item.quantity), amount:money(total)};
  });
  return { reference:order.id, personName:person?.display_name, trainerName:kind==="trainer"?person?.display_name:undefined,
    studentName:order.student_name, packageName:lines.map(x=>x.name).join(", "), items:lines,
    date:new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(new Date()),
    paymentMethod:order.payment_method==="BANK_TRANSFER"?"Havale / EFT":order.payment_method==="PAYTR"?"PayTR / Kart":order.payment_method,
    amount:money(order.total_minor), discount:money(order.discount_minor), shipping:money(order.shipping_minor), vat:money(kind==="trainer"?order.tax_minor:order.vat_minor),
    reportedAmount:report?money(report.reported_amount_minor):undefined, payerName:report?.payer_name,
    status:report?"Müşteri ödeme bildirdi; banka onayı bekliyor":order.status==="PAID"?"Ödeme onaylandı":"Havale siparişi oluşturuldu; tahsilat doğrulanmadı" };
}
export async function queueOwnerOrderEvent(client, {kind, orderId, event, report=null}, env=process.env) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") return false;
  if (!["trainer","student"].includes(kind) || !["sale","bank"].includes(event)) throw new Error("OWNER_ORDER_EVENT_INVALID");
  const trainer=kind==="trainer";
  const order=(await client.query(trainer?"select o.*,u.display_name from trainer_package_orders o join platform_users u on u.id=o.trainer_user_id where o.id=$1":"select o.*,u.display_name,coalesce(nullif(concat_ws(' ',cp.first_name,cp.last_name),''),s.display_name) as student_name from orders o join platform_users u on u.id=o.buyer_user_id join platform_users s on s.id=o.beneficiary_student_user_id left join r6_student_child_profiles cp on cp.id=o.beneficiary_child_profile_id where o.id=$1",[orderId])).rows[0];
  if (!order || (event==="sale"?order.status!=="PAID":order.payment_method!=="BANK_TRANSFER"||!["PENDING_PAYMENT","PAYMENT_REVIEW"].includes(order.status))) return false;
  const items=(await client.query(trainer?"select title_snapshot,quantity,currency,line_total_minor from trainer_package_order_items where order_id=$1 order by id":"select title_snapshot,quantity,currency,total_minor from order_items where order_id=$1 order by id",[orderId])).rows;
  return queueOwnerManagementEmail(client,{templateKey:event==="bank"?"owner-bank-review":`owner-${kind}-sale`,eventId:`${kind}:${orderId}`,metadata:ownerOrderMetadata(order,items,order,kind,report)},env);
}
