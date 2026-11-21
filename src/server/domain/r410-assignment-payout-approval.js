import {readOwnerPayoutTariff} from "./r410-owner-payout-tariff-store.js";
const fail=(code)=>{throw Object.assign(new Error(code),{status:409,code});};
// Called by an authenticated global Owner, inside the assignment transaction.
export async function assertR410PayoutApproval(client,{supplied,mode,activeStudentCount,compensationMinor}){
  if(!supplied || supplied.approved!==true)fail("R410_PAYOUT_APPROVAL_REQUIRED");
  if(!Number.isInteger(activeStudentCount)||activeStudentCount<0||activeStudentCount>=5)fail("R410_CLASS_CAPACITY_CHANGED");
  const tariff=await readOwnerPayoutTariff(client);
  if(!tariff)fail("R410_TARIFF_REQUIRED");
  const seat=mode==="INDIVIDUAL"?1:activeStudentCount+1;
  const expected=mode==="INDIVIDUAL"?tariff.individualMinor:tariff.groupMinor[seat-1];
  if(!["GROUP","INDIVIDUAL"].includes(mode)||supplied.version!==tariff.version||supplied.seat!==seat||supplied.amountMinor!==expected||compensationMinor!==expected)fail("R410_PAYOUT_STALE_APPROVAL");
  return Object.freeze({tariffVersion:tariff.version,seat,amountMinor:expected});
}
