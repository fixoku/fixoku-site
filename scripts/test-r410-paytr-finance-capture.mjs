import assert from "node:assert/strict";
import fs from "node:fs";
import {capturePaytrFinance} from "../src/server/payments/paytr-finance-capture-r410.js";
const attempt={id:"synthetic",environment:"LIVE",status:"SUCCEEDED",review_required:false};
const providerStatus={status:"success"};
let queries=[];
const client={query:async q=>{queries.push(q);}};
const run=async (a,rec)=>{queries=[]; return capturePaytrFinance(client,{attempt:a,providerStatus},rec);};
for(const a of [{...attempt,environment:"TEST"},{...attempt,review_required:true},{...attempt,status:"FAILED"},null]){
 assert.equal((await run(a,()=>{throw new Error("UNEXPECTED")})).status,"SKIPPED"); assert.equal(queries.length,0);
}
console.log("NONCOMMERCIAL_AND_REVIEW_EXCLUDED=PASS");
assert.equal((await run(attempt,async(c,x)=>{assert.equal(c,client);assert.equal(x.providerStatus,providerStatus);return {status:"RECORDED"}})).status,"RECORDED");
assert.deepEqual(queries,["savepoint r410_finance_capture","release savepoint r410_finance_capture"]);
console.log("EXISTING_PROVIDER_RESPONSE_REUSED=PASS");
assert.equal((await run(attempt,async()=>{throw new Error("SQL_OR_EVIDENCE_FAILURE")})).status,"PENDING");
assert.deepEqual(queries,["savepoint r410_finance_capture","rollback to savepoint r410_finance_capture","release savepoint r410_finance_capture"]);
console.log("FINANCE_FAILURE_ISOLATED=PASS");
assert.equal((await run(attempt,async()=>({status:"REVIEW_REQUIRED"}))).status,"REVIEW_REQUIRED");
console.log("CONFLICT_REVIEW_PRESERVED=PASS");
const source=fs.readFileSync("api/paytr/callback.js","utf8");
assert.equal((source.match(/await requestPaytrPaymentStatus\(/g)||[]).length,1);
assert.equal((source.match(/await capturePaytrFinance\(/g)||[]).length,2);
console.log("CALLBACK_SOURCE_WIRING=PASS");