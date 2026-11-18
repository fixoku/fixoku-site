import assert from "node:assert/strict";
import { runOwnerEmailWorker } from "../src/server/domain/owner-email-worker-r394.js";
import { getSmtpConfig } from "../src/server/domain/email-outbox.js";

const env={
 FIXOKU_OWNER_NOTIFICATIONS_ENABLED:"1",
 FIXOKU_OWNER_EMAIL_WORKER_ENABLED:"1",
 FIXOKU_OWNER_NOTIFICATION_EMAIL:"ersinusta@fixoku.com",
 FIXOKU_OWNER_DAILY_SUMMARY_ENABLED:"1",
 FIXOKU_OWNER_DAILY_START_DATE:"2026-11-18",
 EMAIL_PROVIDER:"SMTP",
 SMTP_HOST:"mail.fixoku.com",
 SMTP_PORT:"465",
 SMTP_SECURE:"true",
 SMTP_USER:"bildirim@fixoku.com",
 SMTP_PASS:"synthetic-only",
 MAIL_FROM:"bildirim@fixoku.com"
};

const smtp=getSmtpConfig(env);
assert.equal(smtp.transport.connectionTimeout,10000);
assert.equal(smtp.transport.greetingTimeout,10000);
assert.equal(smtp.transport.socketTimeout,30000);
console.log("SMTP_TIMEOUTS=PASS");

for(const scenario of [
 {day:"2026-11-17",expected:"BEFORE_START_DATE",existing:false,calls:0},
 {day:"2026-11-18",expected:"QUEUED",existing:false,calls:1},
 {day:"2026-11-18",expected:"ALREADY_QUEUED",existing:true,calls:0},
 {day:"2026-11-18",expected:"REVIEW_REQUIRED",existing:false,calls:1,fail:true}
]){
 let calls=0;
 let commits=0;
 let rollbacks=0;
 const client={
  async query(sql,params){
   if(sql.includes("begin isolation")) return {rows:[]};
   if(sql.includes("Europe/Istanbul")) return {rows:[{day:scenario.day}]};
   if(sql.includes("where dedupe_key=$1")){
    assert.equal(params[0],"owner-management:owner-daily-summary:"+scenario.day);
    return {rows:scenario.existing?[{exists:1}]:[]};
   }
   if(sql==="commit"){commits++;return {rows:[]};}
   if(sql==="rollback"){rollbacks++;return {rows:[]};}
   if(sql.includes("group by status")) return {rows:[]};
   if(sql.includes("select count(*)::int as count")) return {rows:[{count:0}]};
   throw Error("UNEXPECTED_SQL");
  }
 };

 const result=await runOwnerEmailWorker({
  client,
  env,
  processor:async(opts)=>{
   assert.equal(opts.ownerOnly,true);
   return {status:"PROCESSED",processed:0};
  },
  dailyProducer:async()=>{
   calls++;
   if(scenario.fail) throw Error("SYNTHETIC_FAILURE");
   return true;
  }
 });

 assert.equal(result.dailySummary,scenario.expected);
 assert.equal(calls,scenario.calls);
 assert.equal(commits,scenario.fail?0:1);
 assert.equal(rollbacks,scenario.fail?1:0);

 console.log("DAILY_SCENARIO_PASS="+scenario.expected);
}

console.log("DAILY_WORKER=4_OF_4_PASS");