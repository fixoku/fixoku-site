import { queueOwnerManagementEmail } from "./owner-management-notifications-r390.js";

// Caller must use a verified database and one repeatable-read transaction.
// Pending figures are current snapshots, not reconstructed historical balances.
export async function queueDailyOwnerSummary(client, env = process.env) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1" || env.FIXOKU_OWNER_DAILY_SUMMARY_ENABLED !== "1") return false;
  const day = (await client.query(`select ((now() at time zone 'Europe/Istanbul')::date - 1)::text as day,
    (((now() at time zone 'Europe/Istanbul')::date - 1)::timestamp at time zone 'Europe/Istanbul') as start_at,
    ((now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul') as end_at`)).rows[0];
  const args = [day.start_at, day.end_at];
  const result = (await client.query(`with paid as (
    select 'student' as kind,p.provider as method,p.amount_minor,p.currency from payment_intents p join orders o on o.id=p.order_id
    where p.succeeded_at >= $1 and p.succeeded_at < $2 and p.provider in ('PAYTR','BANK_TRANSFER') and p.status in ('SUCCEEDED','PARTIALLY_REFUNDED','REFUNDED')
    union all select 'trainer',payment_method::text,total_minor,currency from trainer_package_orders
    where completed_at >= $1 and completed_at < $2 and status in ('PAID','REFUNDED') and payment_method in ('PAYTR','BANK_TRANSFER')
  ) select count(*)::int as orders, count(*) filter (where currency <> 'TRY')::int as other_currency,
    coalesce(sum(amount_minor) filter(where kind='student' and currency='TRY'),0) as student,
    coalesce(sum(amount_minor) filter(where kind='trainer' and currency='TRY'),0) as trainer,
    coalesce(sum(amount_minor) filter(where method='PAYTR' and currency='TRY'),0) as card,
    coalesce(sum(amount_minor) filter(where method='BANK_TRANSFER' and currency='TRY'),0) as bank,
    (select coalesce(sum(amount_minor),0) from payment_transactions where transaction_type='REFUND' and status='SUCCEEDED' and currency='TRY' and occurred_at >= $1 and occurred_at < $2) as refunds,
    (select coalesce(sum(amount_minor),0) from trainer_earning_ledger where entry_type='SESSION' and amount_minor>0 and currency='TRY' and occurred_at >= $1 and occurred_at < $2) as earnings,
    (select count(*) from enrollment_completions where completed_at >= $1 and completed_at < $2) as completions,
    (select count(*) from notification_email_outbox where event_type='OWNER_TRAINER_REGISTRATION' and created_at >= $1 and created_at < $2) as trainers,
    (select count(*) from notification_email_outbox where event_type='OWNER_STUDENT_REGISTRATION' and created_at >= $1 and created_at < $2) as students,
    (select count(*) from notification_email_outbox where event_type='OWNER_GUARDIAN_REGISTRATION' and created_at >= $1 and created_at < $2) as guardians,
    (select count(*) from trainer_assignment_requests where status='PENDING') as assignments,
    ((select count(*) from shipments s where status in ('WAITING','PREPARING','PACKED') and exists(select 1 from shipment_items i where i.shipment_id=s.id)) + (select count(*) from trainer_order_shipments s where status in ('WAITING','PREPARING','PACKED') and exists(select 1 from trainer_order_shipment_items i where i.trainer_order_shipment_id=s.id))) as shipments,
    (select count(*) from order_refund_requests where status in ('REQUESTED','OWNER_APPROVED','REFUND_PENDING_PROVIDER')) as pending_refunds,
    ((select coalesce(sum(total_minor),0) from orders where payment_method='BANK_TRANSFER' and status='PAYMENT_REVIEW' and currency='TRY') + (select coalesce(sum(total_minor),0) from trainer_package_orders where payment_method='BANK_TRANSFER' and status='PAYMENT_REVIEW' and currency='TRY')) as pending_bank
    from paid`, args)).rows[0];
  if (!result || Number(result.other_currency)!==0) throw new Error('DAILY_REPORT_CURRENCY_REVIEW_REQUIRED');
  const number = v => { const n=Number(v); if(v==null || !Number.isSafeInteger(n)||n<0) throw new Error('DAILY_REPORT_VALUE_INVALID'); return n; };
  const money = v => new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(number(v)/100)+' ₺';
  const count = v => String(number(v));
  const snapshot = v => count(v)+' (rapor anı)';
  const registered = v => count(v)+' (doğrulanmış kayıt bildirimleri)';
  return queueOwnerManagementEmail(client,{templateKey:'owner-daily-summary',eventId:day.day,metadata:{date:day.day.split('-').reverse().join('.'),amount:money(number(result.student)+number(result.trainer)),studentSales:money(result.student),trainerSales:money(result.trainer),cardReceipts:money(result.card),bankReceipts:money(result.bank),pendingBank:money(result.pending_bank)+' (rapor anı)',refunds:money(result.refunds)+' (öğrenci ödeme kayıtları)',earnings:money(result.earnings),newTrainers:registered(result.trainers),newStudents:registered(result.students),newGuardians:registered(result.guardians),orderCount:count(result.orders),pendingAssignments:snapshot(result.assignments),pendingShipments:snapshot(result.shipments),pendingRefunds:snapshot(result.pending_refunds),completedTrainings:count(result.completions)}},env);
}
