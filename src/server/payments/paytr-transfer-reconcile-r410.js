import { decimalMinor } from "./paytr-finance-r410.js";
// Provider reports are not independent bank statement evidence.
function date(v) {
  if(typeof v!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10)!==v) throw new Error("SETTLEMENT_DATE_INVALID");
  return v;
}
function amount(v) { return decimalMinor(v); }
function currency(v) { if(!["TL","TRY"].includes(v)) throw new Error("SETTLEMENT_CURRENCY_UNSUPPORTED"); return "TRY"; }
// Accept one normalized merchant summary row, not a raw API envelope.
export function normalizePaytrTransfer(row) {
  const paidDate=date(row.date_paid), c=currency(row.currency);
  const sales=amount(row.sales), refunds=amount(row.return), net=amount(row.net);
  if(sales-refunds!==net) throw new Error("SETTLEMENT_TOTAL_MISMATCH");
  return {paidDate,currency:c,salesMinor:sales,refundMinor:refunds,netMinor:net};
}
export function reconcileTransferDay({summary,details,bankEvidence=null}) {
  const s=normalizePaytrTransfer(summary);
  if(!Array.isArray(details)) throw new Error("SETTLEMENT_DETAILS_REQUIRED");
  let total=0; const seen=new Set();
  for(const row of details){
    currency(row.currency);
    if(typeof row.merchant_oid!=="string" || !/^[a-zA-Z0-9]{1,64}$/.test(row.merchant_oid)) throw new Error("SETTLEMENT_REFERENCE_INVALID");
    if(seen.has(row.merchant_oid)) return {...s,status:"DETAIL_REVIEW_REQUIRED",bankConfirmed:false};
    seen.add(row.merchant_oid);total+=amount(row.payment);
    if(!Number.isSafeInteger(total)) throw new Error("SETTLEMENT_OVERFLOW");
  }
  // Refunds and provider adjustments can differ from gross detail totals.
  // Never infer a transfer when the detail basis is unclear.
  if(!details.length || s.refundMinor!==0 || total!==s.netMinor) return {...s,status:"DETAIL_REVIEW_REQUIRED",bankConfirmed:false};
  if(!bankEvidence) return {...s,status:"PROVIDER_REPORTED_BANK_PENDING",bankConfirmed:false};
  // Bank evidence is normalized by a future authorized import/review layer.
  if(bankEvidence.currency!=="TRY" || date(bankEvidence.date)!==s.paidDate || !Number.isSafeInteger(bankEvidence.amountMinor) || bankEvidence.amountMinor!==s.netMinor) return {...s,status:"BANK_MISMATCH",bankConfirmed:false};
  // Amount/date agreement alone never establishes actual bank receipt.
  return {...s,status:"BANK_AMOUNT_MATCH_REVIEW_REQUIRED",bankConfirmed:false};
}