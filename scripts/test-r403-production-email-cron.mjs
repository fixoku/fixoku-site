import assert from "node:assert/strict";
import {
  createProductionEmailCron
} from "../api/internal/production-email-cron-r403.js";

const secret =
  "synthetic-cron-test-secret-012345678901234567890";

const base = {
  VERCEL:"1",
  VERCEL_ENV:"production",
  CRON_SECRET:secret,
  FIXOKU_PRODUCTION_EMAIL_CRON_ENABLED:"1",
  EMAIL_PROVIDER:"SMTP",
  SMTP_HOST:"mail.fixoku.com",
  SMTP_PORT:"465",
  SMTP_SECURE:"true",
  SMTP_USER:"bildirim@fixoku.com",
  SMTP_PASS:"synthetic-test-password",
  MAIL_FROM:"bildirim@fixoku.com",
  DATABASE_URL:"postgresql://fake:fake@invalid.test/neondb", DATABASE_URL_UNPOOLED:"postgresql://fake:fake@ep-test.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require"
};

function recorder() {
  return {
    statusCode:0,
    body:null,
    setHeader(){},
    end(value){
      this.body=JSON.parse(value);
    }
  };
}

const forbidden=()=>{
  throw Error("EXTERNAL_OPERATION_FORBIDDEN");
};

const request={
  method:"GET",
  headers:{
    authorization:"Bearer "+secret
  }
};

for(const [name,env,req,code,status] of [
  [
    "preview",
    {...base,VERCEL_ENV:"preview"},
    request,
    403,
    "PRODUCTION_ONLY"
  ],
  [
    "missing-secret",
    {...base,CRON_SECRET:""},
    request,
    401,
    "UNAUTHORIZED"
  ],
  [
    "wrong-secret",
    base,
    {...request,headers:{
      authorization:"Bearer wrong"
    }},
    401,
    "UNAUTHORIZED"
  ],
  [
    "wrong-method",
    base,
    {...request,method:"POST"},
    405,
    "METHOD_NOT_ALLOWED"
  ],
  [
    "disabled",
    {...base,FIXOKU_PRODUCTION_EMAIL_CRON_ENABLED:"0"},
    request,
    200,
    "DISABLED"
  ],
  [
    "missing-smtp",
    {...base,SMTP_PASS:""},
    request,
    503,
    "SMTP_BLOCKED"
  ],
  [
    "test-smtp",
    {...base,EMAIL_PROVIDER:"TEST"},
    request,
    503,
    "SMTP_BLOCKED"
  ]
]){
  let opens=0;

  const handler=createProductionEmailCron({
    env,
    poolFactory(){
      opens++;
      return forbidden();
    },
    generalWorker:forbidden,
    ownerWorker:forbidden
  });

  const res=recorder();

  await handler(req,res);

  assert.equal(res.statusCode,code,name);
  assert.equal(res.body.status,status,name);
  assert.equal(opens,0,name);
}

console.log("CRON_FAIL_CLOSED=7_OF_7_PASS");

for(const lockAvailable of [false,true]){
  let ownerCalls=0;
  let generalCalls=0;
  let released=0;
  let ended=0;

  const sqlCalls=[];

  const client={
    async query(sql){
      sqlCalls.push(sql);
      return {
        rows:[{locked:lockAvailable}]
      };
    },
    release(){
      released++;
    }
  };

  const handler=createProductionEmailCron({
    env:base,
    poolFactory:(url)=>{ assert.equal(url,base.DATABASE_URL_UNPOOLED); return ({
      connect:async()=>client,
      end:async()=>{
        ended++;
      }
    });},
    ownerWorker:async()=>{
      ownerCalls++;
      return {
        status:"PROCESSED",
        processed:1,
        dailySummary:"QUEUED"
      };
    },
    generalWorker:async(options)=>{
      generalCalls++;
      assert.equal(options.ownerOnly,false);

      return {
        status:"PROCESSED",
        processed:2
      };
    }
  });

  const res=recorder();

  await handler(request,res);

  assert.equal(res.statusCode,200);

  assert.equal(
    res.body.status,
    lockAvailable?"COMPLETED":"ALREADY_RUNNING"
  );

  assert.equal(ownerCalls,lockAvailable?1:0);
  assert.equal(generalCalls,lockAvailable?1:0);
  assert.equal(released,1);
  assert.equal(ended,1);
  assert.equal(
    sqlCalls.length,
    lockAvailable?2:1
  );

  assert(
    !JSON.stringify(res.body).includes(secret)
  );

  assert(
    !JSON.stringify(res.body).includes(base.SMTP_PASS)
  );
}

console.log("CRON_LOCK_AND_WORKERS=2_OF_2_PASS");
console.log("R403_EMAIL_CRON_OFFLINE=PASS");

for (const url of [
  "",
  "postgresql://fake:fake@ep-test-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  "postgresql://fake:fake@ep-test.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=disable"
]) {
  const handler=createProductionEmailCron({
    env:{...base,DATABASE_URL_UNPOOLED:url},
    poolFactory:forbidden,
    ownerWorker:forbidden,
    generalWorker:forbidden
  });
  const res=recorder();
  await handler(request,res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.status,"DIRECT_DATABASE_REQUIRED");
}

console.log("DIRECT_DATABASE_GUARD=3_OF_3_PASS");