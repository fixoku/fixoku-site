import {validateOwnerPayoutTariff} from './r410-trainer-payout-tariff.js';

const fail=(code)=>{throw Object.assign(new Error(code),{code,status:409});};
const columns='version,individual_minor,group_1_minor,group_2_minor,group_3_minor,group_4_minor,group_5_minor,created_at,created_by';
const convert=(row)=>row?{
  version:Number(row.version),
  individualMinor:Number(row.individual_minor),
  groupMinor:[1,2,3,4,5].map(i=>Number(row[`group_${i}_minor`])),
  createdAt:row.created_at,
}:null;
export async function readOwnerPayoutTariff(client){
  const row=(await client.query(`select ${columns} from public.r410_owner_payout_tariffs order by version desc limit 1`)).rows[0];
  return row?validateOwnerPayoutTariff(convert(row)):null;
}
// Must run in a caller-owned transaction, after global Owner authorization.
export async function saveOwnerPayoutTariff(client,{tariff,ownerId,expectedVersion}){
  if(typeof ownerId!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(ownerId)) fail('R410_OWNER_ID_REQUIRED');
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0) fail('R410_EXPECTED_VERSION_REQUIRED');
  if(!tariff||!Number.isSafeInteger(tariff.individualMinor)||!Array.isArray(tariff.groupMinor)||tariff.groupMinor.length!==5) fail('R410_TARIFF_INVALID');
  const next=validateOwnerPayoutTariff({...tariff,version:expectedVersion+1});
  if(next.individualMinor>2147483647||next.groupMinor.some(x=>x>2147483647)) fail('R410_TARIFF_OUT_OF_RANGE');
  await client.query("select pg_advisory_xact_lock(hashtext('r410-owner-tariff-global'))");
  const latest=await readOwnerPayoutTariff(client);
  if((latest?.version||0)!==expectedVersion) fail('R410_TARIFF_VERSION_CHANGED');
  const row=(await client.query(`insert into public.r410_owner_payout_tariffs(version,individual_minor,group_1_minor,group_2_minor,group_3_minor,group_4_minor,group_5_minor,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning ${columns}`,[next.version,next.individualMinor,...next.groupMinor,ownerId])).rows[0];
  await client.query(`insert into public.platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'r410.payout_tariff.version_created','owner_payout_tariff',$2,'SUCCESS',gen_random_uuid(),$3)`,[ownerId,ownerId,JSON.stringify({version:next.version,individualMinor:next.individualMinor,groupMinor:next.groupMinor})]);
  return convert(row);
}
