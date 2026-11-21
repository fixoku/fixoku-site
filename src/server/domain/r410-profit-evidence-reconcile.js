// R410 D8K. Owner-only finance proof synthesis. No database or network I/O.
// An indicative contribution is not an audited or certified net profit.
const REQUIRED = Object.freeze(['netRevenueMinor','refundNetMinor','productCostMinor','trainerEarnedMinor','shippingExpenseMinor','paymentFeeMinor','otherExpenseMinor']);
const ERROR = (code) => Object.assign(new Error(code), {code});
const KIND = new Set(['STUDENT_ORDER','TRAINER_PACKAGE_ORDER']);
function amount(v, name) {
  if (v === null || v === undefined) return null;
  if (!Number.isSafeInteger(v) || v < 0) throw ERROR('INVALID_AMOUNT:'+name);
  return v;
}
function checkedAdd(a,b) {
 const n=a+b;
 if (!Number.isSafeInteger(n)) throw ERROR('AMOUNT_OVERFLOW');
 return n;
}
function normalizeOrder(o) {
 if (!o || typeof o !== 'object' || !KIND.has(o.kind) || typeof o.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(o.id)) throw ERROR('ORDER_IDENTITY_INVALID');
 if (typeof o.finalized !== 'boolean' || typeof o.coverageVerified !== 'boolean') throw ERROR('ORDER_EVIDENCE_FLAG_REQUIRED');
 const m={};
 for(const k of REQUIRED) m[k]=amount(o[k],k);
 if (o.trainerPayoutPaidMinor !== undefined && o.trainerPayoutPaidMinor !== null) amount(o.trainerPayoutPaidMinor,'trainerPayoutPaidMinor');
 if (o.finalized && o.netRevenueMinor !== null && o.refundNetMinor !== null && o.refundNetMinor>o.netRevenueMinor) throw ERROR('REFUND_EXCEEDS_REVENUE');
 const missing=REQUIRED.filter(k=>m[k]===null);
 const blockers=[...missing.map(k=>'MISSING_'+k.toUpperCase())];
 if(!o.finalized) blockers.push('ORDER_NOT_FINALIZED');
 if(!o.coverageVerified) blockers.push('EVIDENCE_COVERAGE_NOT_VERIFIED');
 let contributionMinor=null;
 if(!blockers.length) {
   // Settlement of an accrued trainer earning is NOT another expense.
   contributionMinor=m.netRevenueMinor;
   for(const k of REQUIRED.slice(1)) contributionMinor=checkedAdd(contributionMinor,-m[k]);
 }
 return {id:o.id,kind:o.kind,complete:!blockers.length,contributionMinor,blockers,
  // Settlement is shown separately from the expense calculation.
  trainerPayoutPaidMinor:o.trainerPayoutPaidMinor??null};
}
export function reconcileOwnerProfitEvidence(orders, {overallCoverageVerified=false}={}) {
 if (!Array.isArray(orders) || typeof overallCoverageVerified!=='boolean') throw ERROR('INVALID_REPORT_INPUT');
 const ids=new Set();const output=[];let total=0,allComplete=orders.length>0;
 for(const raw of orders){
  const row=normalizeOrder(raw);
  const key=row.kind+':'+row.id;
  if(ids.has(key)) throw ERROR('DUPLICATE_ORDER_EVIDENCE');
  ids.add(key);output.push(row);
  if(row.complete) total=checkedAdd(total,row.contributionMinor);
  else allComplete=false;
 }
 const canShowIndicative=overallCoverageVerified&&allComplete;
 return {status:canShowIndicative?'INDICATIVE_CONTRIBUTION':'INCOMPLETE_EVIDENCE',
  certifiedProfit:false,overallCoverageVerified,orderCount:orders.length,
  completeOrderCount:output.filter(x=>x.complete).length,
  indicativeContributionMinor:canShowIndicative?total:null,
  orders:output,
  disclaimer:'Katkı tutarı kesin net kâr değildir. KDV, iade, ürün, eğitmen, kargo, komisyon ve işletme giderlerinin tüm kapsamı ayrıca doğrulanmalıdır.'};
}
