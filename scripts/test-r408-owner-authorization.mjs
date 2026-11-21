import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Readable } from "node:stream";

let networkCalls=0;

globalThis.fetch=async()=>{
  networkCalls++;
  throw new Error("EXTERNAL_NETWORK_FORBIDDEN");
};

const {executeOwnerTestRequest,default:handler}=await import(
  "../api/owner/paytr-acceptance-r408.js"
);

assert.equal(typeof handler,"function");
assert.equal(typeof executeOwnerTestRequest,"function");
assert.equal(process.env.NODE_ENV,"test");
assert.equal(process.env.PAYTR_ENABLED,"0");
assert.equal(process.env.FIXOKU_PAYTR_OWNER_TEST_ENABLED,"0");
assert.equal(process.env.VERCEL_ENV ?? "","");

let count=0;

function pass(label){
  count++;
  console.log(label+"=PASS");
}

function principal(role,{
  status="ACTIVE",
  scopeType,
  scopeId,
  memberships
}={}){
  const id=crypto.randomUUID();

  return {
    user:{
      id,
      emailVerified:true
    },
    session:{
      user:{
        id,
        twoFactorEnabled:true
      }
    },
    memberships:memberships ?? [{
      role,
      status,
      scopeType:scopeType ?? (
        ["OWNER","SUPER_ADMIN"].includes(role)
          ?"GLOBAL"
          :role==="TRAINER"
            ?"TRAINER"
            :"STUDENT"
      ),
      scopeId:scopeId ?? (
        ["OWNER","SUPER_ADMIN"].includes(role)
          ?null
          :id
      )
    }]
  };
}

async function request(identity,{
  method="GET",
  origin="https://fixoku.com"
}={}){
  const payload=JSON.stringify({
    action:"START_TEST",
    confirmTestOnly:true
  });

  const req=Readable.from(
    method==="POST"?[Buffer.from(payload)]:[]
  );

  req.method=method;
  req.url="/api/owner/paytr-acceptance-r408";
  req.headers={origin};

  let output="";

  const res={
    statusCode:200,
    setHeader(){},
    end(value=""){
      output=String(value);
    }
  };

  await executeOwnerTestRequest(req,res,{
    principalResolver:async()=>identity
  });

  return {
    status:res.statusCode,
    body:JSON.parse(output)
  };
}

let result=await request(null);

assert.equal(result.status,401);
assert.equal(result.body.error,"UNAUTHENTICATED");
pass("UNAUTHENTICATED_GET_REJECTED");

result=await request(null,{method:"POST"});

assert.equal(result.status,401);
pass("UNAUTHENTICATED_POST_REJECTED");

for(const role of [
  "STUDENT",
  "GUARDIAN",
  "TRAINER",
  "SUPER_ADMIN"
]){
  result=await request(principal(role));

  assert.equal(result.status,403);
  pass(role+"_GET_REJECTED");

  result=await request(
    principal(role),{method:"POST"}
  );

  assert.equal(result.status,403);
  pass(role+"_POST_REJECTED");
}

result=await request(
  principal("OWNER",{status:"SUSPENDED"})
);

assert.equal(result.status,403);
pass("INACTIVE_OWNER_REJECTED");

result=await request(
  principal("OWNER",{
    scopeType:"STUDENT",
    scopeId:crypto.randomUUID()
  })
);

assert.equal(result.status,403);
pass("INVALID_OWNER_SCOPE_REJECTED");

result=await request(
  principal("OWNER",{memberships:[]})
);

assert.equal(result.status,403);
pass("EMPTY_MEMBERSHIP_REJECTED");

result=await request(principal("OWNER"));

assert.equal(result.status,503);
assert.equal(result.body.error,"OWNER_PAYTR_TEST_DISABLED");
pass("AUTHORIZED_OWNER_GET_RUNTIME_DISABLED");

result=await request(
  principal("OWNER"),{method:"POST"}
);

assert.equal(result.status,503);
assert.equal(result.body.error,"OWNER_PAYTR_TEST_DISABLED");
pass("AUTHORIZED_OWNER_POST_RUNTIME_DISABLED");

result=await request(
  principal("OWNER"),{
    method:"POST",
    origin:"https://example.invalid"
  }
);

assert.equal(result.status,403);
assert.equal(result.body.error,"ORIGIN_FORBIDDEN");
pass("OWNER_FOREIGN_ORIGIN_REJECTED");

assert.equal(networkCalls,0);
pass("EXTERNAL_FETCH_NOT_USED");

assert.equal(count,17);

console.log("OWNER_AUTHORIZATION_TEST_COUNT="+count);
console.log("SESSION_RESOLVER=CONTROLLED_FIXTURE");
console.log("REAL_ROLE_AUTHORIZATION=TESTED");
console.log("R408_TOPLU_A10_AUTHORIZATION=PASS");