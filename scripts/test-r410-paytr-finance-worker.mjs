import assert from "node:assert/strict";

import {
  runPaytrFinanceWorker
} from "../src/server/payments/paytr-finance-worker-r410.js";

const env={
  FIXOKU_PAYTR_FINANCE_WORKER_ENABLED:"1",
  FIXOKU_PAYTR_FINANCE_LIVE_QUERY_APPROVED:"1",
  VERCEL:"1",
  VERCEL_ENV:"production",
  PAYTR_ENABLED:"1",
  PAYTR_TEST_MODE:"0"
};

const forbidden=()=>{
  throw new Error("UNEXPECTED_EXTERNAL_OPERATION");
};

for(const [key,value] of [
  ["FIXOKU_PAYTR_FINANCE_WORKER_ENABLED","0"],
  ["FIXOKU_PAYTR_FINANCE_LIVE_QUERY_APPROVED","0"],
  ["VERCEL","0"],
  ["VERCEL_ENV","preview"],
  ["PAYTR_ENABLED","0"],
  ["PAYTR_TEST_MODE","1"]
]){
  const result=await runPaytrFinanceWorker({
    env:{...env,[key]:value},
    client:{query:forbidden},
    statusRequester:forbidden
  });

  assert.equal(result.status,"DISABLED");
  console.log("GUARD=PASS:"+key);
}

await assert.rejects(()=>runPaytrFinanceWorker({
  env,
  client:{query:forbidden},
  statusRequester:forbidden,
  limit:6
}));

console.log("BATCH_LIMIT=PASS");

const busy=await runPaytrFinanceWorker({
  env,
  client:{
    query:async()=>({rows:[{locked:false}]})
  },
  statusRequester:forbidden
});

assert.equal(busy.status,"BUSY");
console.log("CONCURRENT_WORKER_BLOCKED=PASS");

let mode="success";
let writes=[];
let unlocked=false;
let inTransaction=false;

const client={
  async query(sql,params=[]){
    const q=sql.trim();

    if(q.includes("pg_try_advisory_lock"))
      return {rows:[{locked:true}]};

    if(q.includes("pg_advisory_unlock")){
      unlocked=true;
      return {rows:[]};
    }

    if(q.includes("select a.id,a.merchant_oid")){
      assert.equal(params[0],5);
      assert.ok(q.includes("a.environment='LIVE'"));
      assert.ok(q.includes("check_count,0)<3"));
      assert.ok(q.includes("f.attempt_id is null"));

      return {rows:[
        {id:"synthetic",merchant_oid:"a".repeat(32)}
      ]};
    }

    if(q==="begin"){
      inTransaction=true;
      return {rows:[]};
    }

    if(q==="commit"||q==="rollback"){
      inTransaction=false;
      return {rows:[]};
    }

    if(q.includes("insert into public.r410_paytr_finance_checks")){
      writes.push(params[1]);
      return {rows:[]};
    }

    throw new Error("UNEXPECTED_SQL");
  }
};

async function run(value){
  mode=value;
  writes=[];
  unlocked=false;

  const result=await runPaytrFinanceWorker({
    client,env,
    statusRequester:async()=>{
      assert.equal(inTransaction,false);

      if(mode==="timeout")
        throw new Error("SYNTHETIC_TIMEOUT");

      return {synthetic:true};
    },
    recorder:async()=>{
      assert.equal(inTransaction,true);

      if(mode==="invalid")
        throw Object.assign(
          new Error("INVALID"),
          {code:"PAYTR_FINANCE_NET_REVIEW_REQUIRED"}
        );

      if(mode==="conflict")
        return {status:"REVIEW_REQUIRED"};

      return {status:"RECORDED"};
    }
  });

  assert.equal(unlocked,true);
  assert.equal(inTransaction,false);

  return result;
}

assert.equal((await run("success")).verified,1);
assert.deepEqual(writes,["VERIFIED"]);
console.log("VERIFIED_COST_WORKFLOW=PASS");

assert.equal((await run("timeout")).retryRequired,1);
assert.deepEqual(writes,["RETRY_REQUIRED"]);
console.log("BOUNDED_RETRY_WORKFLOW=PASS");

assert.equal((await run("invalid")).reviewRequired,1);
assert.deepEqual(writes,["REVIEW_REQUIRED"]);
console.log("INVALID_EVIDENCE_REVIEW=PASS");

assert.equal((await run("conflict")).reviewRequired,1);
assert.deepEqual(writes,["REVIEW_REQUIRED"]);
console.log("CONFLICT_REVIEW_WORKFLOW=PASS");

console.log("WORKER_LOCK_RELEASE=PASS");
console.log("NETWORK_OUTSIDE_TRANSACTION=PASS");
console.log("R410_FINANCE_WORKER_OFFLINE=PASS");