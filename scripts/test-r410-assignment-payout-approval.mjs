import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertR410PayoutApproval} from '../src/server/domain/r410-assignment-payout-approval.js';
const row={version:2,individual_minor:500000,group_1_minor:400000,group_2_minor:300000,group_3_minor:200000,group_4_minor:150000,group_5_minor:100000,created_at:new Date(),created_by:'00000000-0000-4000-8000-000000000001'};
const c={async query(q){assert.match(q,/r410_owner_payout_tariffs/);return {rows:[row]};}};
const attempt=(mode,active,amount,approval)=>assertR410PayoutApproval(c,{mode,activeStudentCount:active,compensationMinor:amount,supplied:approval});
for(let i=0;i<5;i++){
 const amount=[400000,300000,200000,150000,100000][i];
 const value=await attempt('GROUP',i,amount,{approved:true,version:2,seat:i+1,amountMinor:amount});
 assert.equal(value.seat,i+1);assert.equal(value.amountMinor,amount);
}
console.log('FIVE_STUDENT_SEATS=PASS');
assert.equal((await attempt('INDIVIDUAL',0,500000,{approved:true,version:2,seat:1,amountMinor:500000})).amountMinor,500000);
console.log('INDIVIDUAL_TARIFF=PASS');
for(const x of [
 ['NO_APPROVAL','GROUP',0,400000,{}],
 ['STALE_VERSION','GROUP',0,400000,{approved:true,version:1,seat:1,amountMinor:400000}],
 ['STALE_SEAT','GROUP',1,300000,{approved:true,version:2,seat:1,amountMinor:300000}],
 ['CLIENT_AMOUNT_OVERRIDE','GROUP',0,999999,{approved:true,version:2,seat:1,amountMinor:999999}],
 ['FULL_CLASS','GROUP',5,100000,{approved:true,version:2,seat:5,amountMinor:100000}],
 ['INVALID_MODE','OTHER',0,400000,{approved:true,version:2,seat:1,amountMinor:400000}]
]){await assert.rejects(()=>attempt(x[1],x[2],x[3],x[4]),e=>e?.status===409);console.log(`${x[0]}=PASS`);}
const group=fs.readFileSync('api/admin/r6-training-groups.js','utf8');
const individual=fs.readFileSync('api/admin/assignment-requests/[id].js','utf8');
const ui=fs.readFileSync('src/platform/admin/R6TrainingGroupsPage.tsx','utf8');
assert.ok(group.includes('await assertR410PayoutApproval')&&individual.includes('await assertR410PayoutApproval'));
assert.ok(group.includes("pg_advisory_xact_lock(hashtext('fixoku-r399-class-write'))"));
assert.ok(ui.includes('4. öğrenci')===false || ui.includes('öğrenci için tanımlanan hakediş'));
assert.equal((ui.match(/Hakedişi Onayla/g)||[]).length,2);
console.log('BOTH_ASSIGNMENT_PATHS_WIRED=PASS');
console.log('R410_D8C_OFFLINE=PASS');
