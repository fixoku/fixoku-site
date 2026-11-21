import assert from "node:assert/strict";
import {
  recordPaytrFinance
} from "../src/server/payments/paytr-finance-store-r410.js";

const attempt = {
  id:"11111111-1111-4111-8111-111111111111",
  order_id:"22222222-2222-4222-8222-222222222222",
  order_kind:"STUDENT_ORDER",
  merchant_oid:"a".repeat(32),
  environment:"LIVE",
  status:"SUCCEEDED",
  review_required:false,
  verified_at:"2026-11-20T10:00:00Z",
  succeeded_at:"2026-11-20T10:00:00Z",
  currency:"TRY",
  amount_minor:1000000,
  collected_amount_minor:1000000,
  installment_count:2,
  installment_difference_minor:0
};

const provider = {
  status:"success",
  test_mode:"0",
  currency:"TL",
  odeme_tipi:"KART",
  payment_amount:"10000.00",
  payment_total:"10000.00",
  kesinti_tutari:"500.00",
  net_tutar:"9500.00",
  taksit:"2",
  returns:[]
};

let saved=null;
let insertCount=0;
let events=[];

const client={
  async query(sql,params=[]){
    if(sql.includes("from public.paytr_payment_attempts"))
      return {rows:[attempt]};

    if(sql.includes("pg_advisory_xact_lock"))
      return {rows:[]};

    if(sql.includes("select attempt_id,evidence_sha256"))
      return {rows:saved?[saved]:[]};

    if(sql.includes("insert into public.r410_paytr_finance_events")){
      events.push(params[1]);
      return {rows:[]};
    }

    if(sql.includes("insert into public.r410_paytr_finance(")){
      insertCount++;
      saved={
        attempt_id:params[0],
        evidence_sha256:params[13]
      };
      assert.equal(params[7],50000);
      assert.equal(params[8],950000);
      assert.equal(params[10],50000);
      return {rows:[]};
    }

    throw new Error("UNEXPECTED_SQL");
  }
};

const run=(p=provider)=>recordPaytrFinance(
  client,{
    attemptId:attempt.id,
    providerStatus:p
  }
);

assert.equal((await run()).status,"RECORDED");
assert.equal(insertCount,1);
console.log("FINANCE_RECORD=PASS");

assert.equal((await run()).status,"ALREADY_RECORDED");
assert.equal(insertCount,1);
console.log("FINANCE_REPLAY_DEDUPE=PASS");

assert.equal((await run({
  ...provider,
  kesinti_tutari:"600.00",
  net_tutar:"9400.00"
})).status,"REVIEW_REQUIRED");

assert.equal(insertCount,1);
assert.deepEqual(events,[
  "VERIFIED","CONFLICT_REVIEW_REQUIRED"
]);
console.log("CHANGED_COST_REVIEW=PASS");

attempt.environment="TEST";

await assert.rejects(()=>run());
assert.equal(insertCount,1);
console.log("TEST_PAYMENT_NOT_RECORDED=PASS");

attempt.environment="LIVE";
attempt.review_required=true;

await assert.rejects(()=>run());
assert.equal(insertCount,1);
console.log("REVIEW_PAYMENT_NOT_RECORDED=PASS");

console.log("R410_FINANCE_STORE_MOCK=PASS");
console.log("DATABASE_WRITE=NO");
console.log("PAYTR_NETWORK=NO");