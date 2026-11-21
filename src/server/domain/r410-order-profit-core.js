// R410 D8F: profit is not certified if a necessary cost lacks evidence.
const fields=['netRevenueMinor','productCostMinor','trainerEarnedMinor','shippingExpenseMinor','paymentFeeMinor','otherExpenseMinor','refundNetMinor'];
export function computeOrderContribution(input){
 if(!input||typeof input!=='object')throw new Error('PROFIT_INPUT_INVALID');
 const missing=[];
 for(const field of fields){if(input[field]===null||input[field]===undefined)missing.push(field);
  else if(!Number.isSafeInteger(input[field])||input[field]<0)throw new Error('PROFIT_AMOUNT_INVALID:'+field);}
 if(missing.length)return {status:'INCOMPLETE',contributionMinor:null,missingFields:missing};
 // Trainer payout is a settlement of the already accrued earning, not a new expense.
 const {netRevenueMinor,productCostMinor,trainerEarnedMinor,shippingExpenseMinor,paymentFeeMinor,otherExpenseMinor,refundNetMinor}=input;
 const amount=netRevenueMinor-refundNetMinor-productCostMinor-trainerEarnedMinor-shippingExpenseMinor-paymentFeeMinor-otherExpenseMinor;
 if(!Number.isSafeInteger(amount))throw new Error('PROFIT_OVERFLOW');
 return {status:'COMPLETE',contributionMinor:amount,missingFields:[]};
}
