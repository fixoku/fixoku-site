import assert from "node:assert/strict";
import { Readable } from "node:stream";

let externalCalls=0;

globalThis.fetch=async()=>{
  externalCalls++;
  throw new Error("EXTERNAL_NETWORK_FORBIDDEN");
};

const owner=(
  await import("../api/owner/paytr-acceptance-r408.js")
).default;

const callback=(
  await import("../api/paytr/callback.js")
).default;

let count=0;

async function request(handler,{
  method="POST",
  headers={},
  payload=""
}={}) {
  const req=Readable.from(
    payload ? [Buffer.from(payload)] : []
  );

  req.method=method;
  req.url="/";
  req.headers=headers;

  const responseHeaders={};

  let output="";

  const res={
    statusCode:200,
    setHeader(key,value){
      responseHeaders[String(key).toLowerCase()]=value;
    },
    end(value=""){
      output=String(value);
    }
  };

  await handler(req,res);

  return {
    status:res.statusCode,
    body:output,
    headers:responseHeaders
  };
}

function pass(label){
  count++;
  console.log(label+"=PASS");
}

function errorCode(response){
  try{
    return JSON.parse(response.body).error;
  }catch{
    return response.body;
  }
}

const unsupported=await request(owner,{
  method:"DELETE"
});

assert.equal(unsupported.status,405);
assert.equal(errorCode(unsupported),"METHOD_NOT_ALLOWED");
pass("OWNER_INVALID_METHOD_REJECTED");

const wrongOrigin=await request(owner,{
  headers:{origin:"https://example.invalid"},
  payload:JSON.stringify({
    action:"START_TEST",
    confirmTestOnly:true
  })
});

assert.equal(wrongOrigin.status,403);
assert.equal(errorCode(wrongOrigin),"ORIGIN_FORBIDDEN");
pass("OWNER_FOREIGN_ORIGIN_REJECTED");

const missingOrigin=await request(owner,{
  payload:JSON.stringify({
    action:"START_TEST",
    confirmTestOnly:true
  })
});

assert.equal(missingOrigin.status,403);
assert.equal(errorCode(missingOrigin),"ORIGIN_FORBIDDEN");
pass("OWNER_MISSING_ORIGIN_REJECTED");

assert.ok(
  String(wrongOrigin.headers["cache-control"])
    .includes("no-store")
);

pass("OWNER_RESPONSE_NOT_CACHEABLE");

const wrongMethod=await request(callback,{
  method:"GET"
});

assert.equal(wrongMethod.status,405);
pass("CALLBACK_GET_REJECTED");

const oid="FIXOKUR408TEST"+"A".repeat(32);

const reserved=await request(callback,{
  payload:new URLSearchParams({
    merchant_oid:oid,
    status:"success",
    total_amount:"100",
    hash:"invalid"
  }).toString()
});

assert.equal(reserved.status,503);
assert.equal(reserved.body,"OWNER_TEST_DISABLED");
pass("RESERVED_TEST_CALLBACK_ISOLATED");

const malformed=await request(callback,{
  payload:new URLSearchParams({
    merchant_oid:"FIXOKUR408TESTINVALID",
    status:"success",
    total_amount:"100",
    hash:"invalid"
  }).toString()
});

assert.equal(malformed.status,503);
assert.equal(malformed.body,"OWNER_TEST_DISABLED");
pass("MALFORMED_TEST_NAMESPACE_ISOLATED");

const normal=await request(callback,{
  payload:new URLSearchParams({
    merchant_oid:"a".repeat(32),
    status:"success",
    total_amount:"100",
    hash:"invalid"
  }).toString()
});

assert.equal(normal.status,503);
assert.equal(normal.body,"PAYTR_RUNTIME_NOT_APPROVED");
pass("NORMAL_PAYMENT_GATE_PRESERVED");

assert.equal(externalCalls,0);
pass("EXTERNAL_FETCH_NOT_USED");

assert.equal(count,9);

console.log("API_BOUNDARY_TEST_COUNT="+count);
console.log("R408_TOPLU_A6_BOUNDARY=PASS");