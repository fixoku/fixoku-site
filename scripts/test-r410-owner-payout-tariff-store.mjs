import assert from 'node:assert/strict';
import {readOwnerPayoutTariff,saveOwnerPayoutTariff} from '../src/server/domain/r410-owner-payout-tariff-store.js';
const ownerId='11111111-1111-4111-8111-111111111111';
const source={individualMinor:500000,groupMinor:[400000,300000,200000,150000,100000]};
let rows=[];let locks=0, audits=0;
const client={async query(sql,params=[]){
  if(sql.includes('pg_advisory_xact_lock')){locks++;return {rows:[]};}
  if(sql.includes('select version,individual_minor'))return {rows:rows.length?[rows.at(-1)]:[]};
  if(sql.includes('insert into public.r410_owner_payout_tariffs')){
    const row={version:params[0],individual_minor:params[1],created_at:new Date().toISOString()};
    for(let i=1;i<=5;i++)row[`group_${i}_minor`]=params[i+1];
    rows.push(row);return {rows:[row]};
  }
  if(sql.includes('insert into public.platform_audit_events')){audits++;return {rows:[]};}
  throw new Error('UNEXPECTED_SQL');
}};
assert.equal(await readOwnerPayoutTariff(client),null);
const first=await saveOwnerPayoutTariff(client,{tariff:source,ownerId,expectedVersion:0});
assert.equal(first.version,1);assert.deepEqual(first.groupMinor,source.groupMinor);
console.log('OWNER_FIVE_SEAT_TARIFF_SAVE=PASS');
await assert.rejects(()=>saveOwnerPayoutTariff(client,{tariff:source,ownerId,expectedVersion:0}),e=>e.code==='R410_TARIFF_VERSION_CHANGED');
assert.equal(rows.length,1);console.log('STALE_OWNER_SAVE_BLOCKED=PASS');
const second=await saveOwnerPayoutTariff(client,{tariff:{...source,groupMinor:[410000,...source.groupMinor.slice(1)]},ownerId,expectedVersion:1});
assert.equal(second.version,2);assert.equal(rows[0].group_1_minor,400000);
console.log('APPEND_ONLY_PREVIOUS_VERSION=PASS');
await assert.rejects(()=>saveOwnerPayoutTariff(client,{tariff:{...source,groupMinor:[0,1,2,3,4]},ownerId,expectedVersion:2}));
await assert.rejects(()=>saveOwnerPayoutTariff(client,{tariff:{...source,individualMinor:2147483648},ownerId,expectedVersion:2}));
console.log('INVALID_TARIFF_BLOCKED=PASS');
assert.equal(audits,2);assert.ok(locks>=3);console.log('OWNER_AUDIT_AND_LOCK=PASS');
console.log('R410_D8B_TARIFF_STORE_MOCK=PASS');
