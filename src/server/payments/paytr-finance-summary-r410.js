// Read-only financial evidence; never initiates a provider request.
export async function readPaytrFinanceSummary(pool, filters={}) {
  if (filters.packageId || filters.trainerId || (filters.currency && filters.currency !== "TRY")) return {status:"OUT_OF_SCOPE"};
  const values=[];
  const where=["a.environment='LIVE'", "a.status='SUCCEEDED'", "a.currency='TRY'"];
  for (const [key,op,offset] of [["from",">=",""],["to","<"," + 1"]]) {
    if(filters[key]) { values.push(filters[key]); where.push(`coalesce(a.succeeded_at,a.verified_at,a.updated_at) ${op} (($${values.length}::date${offset})::timestamp at time zone 'Europe/Istanbul')`); }
  }
  try {
    const {rows}=await pool.query(`with evidence as (
      select a.id, f.installment_category, f.deduction_minor, f.provider_net_minor,
        f.customer_difference_minor, f.merchant_payment_cost_minor,
        (f.attempt_id is not null and a.review_required=false and a.verified_at is not null and a.succeeded_at is not null
          and f.order_id=a.order_id and f.order_kind=a.order_kind::text and f.merchant_oid=a.merchant_oid
          and f.order_amount_minor=a.amount_minor and f.collected_amount_minor=a.collected_amount_minor
          and f.installment_count=a.installment_count and f.customer_difference_minor=a.installment_difference_minor
          and not exists(select 1 from public.r410_paytr_finance_events e where e.attempt_id=a.id and e.event_type='CONFLICT_REVIEW_REQUIRED')
          and not exists(select 1 from public.r410_paytr_finance_events e join public.paytr_payment_attempts other on other.id=e.attempt_id where other.order_id=a.order_id and other.order_kind=a.order_kind and e.event_type='CONFLICT_REVIEW_REQUIRED')
          and ((a.order_kind='STUDENT_ORDER' and exists(select 1 from orders o where o.id=a.order_id and o.payment_method='PAYTR' and o.status='PAID' and o.currency=a.currency and o.total_minor=a.amount_minor)) or
               (a.order_kind='TRAINER_PACKAGE_ORDER' and exists(select 1 from trainer_package_orders o where o.id=a.order_id and o.payment_method='PAYTR' and o.status='PAID' and o.currency=a.currency and o.total_minor=a.amount_minor)))
        ) is true as usable
      from public.paytr_payment_attempts a left join public.r410_paytr_finance f on f.attempt_id=a.id
      where ${where.join(' and ')}
    ) select count(*)::text as total, count(*) filter(where usable)::text as verified,
      sum(deduction_minor) filter(where usable)::text as deduction,
      sum(provider_net_minor) filter(where usable)::text as net,
      sum(customer_difference_minor) filter(where usable)::text as difference,
      sum(merchant_payment_cost_minor) filter(where usable)::text as merchant_cost,
      sum(merchant_payment_cost_minor) filter(where usable and installment_category='SINGLE')::text as single_cost,
      sum(merchant_payment_cost_minor) filter(where usable and installment_category='TWO_NO_CUSTOMER_SURCHARGE')::text as two_cost
      from evidence`,values);
    const r=rows[0];
    const num=v=>{ if(v==null)return null; const n=Number(v); if(!Number.isSafeInteger(n))throw new Error('FINANCE_SUMMARY_RANGE'); return n; };
    const total=num(r.total), verified=num(r.verified);
    if(total==null || verified==null || verified>total || verified<0) throw new Error('FINANCE_SUMMARY_COUNT');
    return {status:'AVAILABLE',currency:'TRY',totalAttempts:total,verifiedAttempts:verified,unresolvedAttempts:total-verified,
      deductionMinor:num(r.deduction),providerNetMinor:num(r.net),customerDifferenceMinor:num(r.difference),merchantCostMinor:num(r.merchant_cost),singleCostMinor:num(r.single_cost),twoCostMinor:num(r.two_cost)};
  } catch(error) { if(error?.code==='42P01') return {status:'SCHEMA_PENDING'}; throw error; }
}