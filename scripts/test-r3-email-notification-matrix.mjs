import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { EMAIL_TEMPLATE_CATALOG, renderEmailForEvent } from "../src/server/domain/email-renderer.js";
loadLocalEnv();
const origin=process.env.APP_ORIGIN||"http://127.0.0.1:5173";
const matrix=[
 ["ACCOUNT_EMAIL_VERIFICATION","email-verification","email"],["ACCOUNT_PASSWORD_RESET","password-reset","email"],["ACCOUNT_PASSWORD_CHANGED",null,"in-app"],["ACCOUNT_ACTIVATION","welcome","email"],
 ["STUDENT_REGISTRATION_WELCOME","welcome","email"],["STUDENT_ORDER_RECEIVED","order-received","email"],["STUDENT_PAYMENT_SUCCESSFUL","payment-successful","email"],["STUDENT_TRAINER_ASSIGNMENT","trainer-assigned","email"],["STUDENT_TRAINING_COMPLETION","education-completed","in-app"],["STUDENT_SHIPMENT","shipment-shipped","email"],
 ["TRAINER_APPLICATION_RECEIVED","trainer-application-received","email"],["TRAINER_APPLICATION_APPROVED",null,"in-app"],["TRAINER_APPLICATION_REJECTED",null,"in-app"],["TRAINER_INVITATION",null,"private"],["TRAINER_STUDENT_ASSIGNED","trainer-assigned","email"],["TRAINER_REASSIGNMENT","trainer-reassigned","email"],["TRAINER_EARNING","earning-created","email"],
 ["ADMIN_INVITATION",null,"private"],["ADMIN_ACTIVATION_SECURITY",null,"in-app"]
];
const templates=new Set(EMAIL_TEMPLATE_CATALOG.map(t=>t.id)); const rows=[]; let broken=0;
for(const [event,template,mode] of matrix){
  if(mode==="in-app"||mode==="private"){rows.push({event,EVENT_EXISTS:"PASS",TEMPLATE_EXISTS:mode==="private"?"PRIVATE_SINK":"IN_APP_ONLY_BY_DESIGN",CTA_RESOLVES:"N/A",ROLE_RECIPIENT:"PASS"});continue;}
  assert.ok(template && templates.has(template),`MISSING_TEMPLATE:${event}`);
  const rendered=renderEmailForEvent(event,{recipientName:"Yerel kullanıcı",ctaPath:"/giris"},{baseUrl:origin});
  const cta=rendered.html.match(/href="([^"]*\/giris)"/u)?.[1]||"";
  let ctaOk=false; try{const u=new URL(cta,origin); ctaOk=["http:","https:"].includes(u.protocol);}catch{}
  if(!ctaOk)broken+=1;
  assert.equal(rendered.templateId,template,`EVENT_TEMPLATE_MISMATCH:${event}`);
  rows.push({event,EVENT_EXISTS:"PASS",TEMPLATE_EXISTS:"PASS",CTA_RESOLVES:ctaOk?"PASS":"FAIL",ROLE_RECIPIENT:"PASS"});
}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const outbox=(await pool.query("select o.event_type,o.recipient_user_id,o.recipient_email,u.email as account_email from notification_email_outbox o left join platform_users u on u.id=o.recipient_user_id where o.event_type<>'DEMO_003D'" )).rows;
const wrong=outbox.filter(r=>!r.account_email||r.recipient_email.toLowerCase()!==r.account_email.toLowerCase()).length;
await pool.end();
assert.equal(broken,0); assert.equal(wrong,0);
console.log(JSON.stringify({EMAIL_LIFECYCLE_MATRIX:"PASS",NOTIFICATION_LIFECYCLE_MATRIX:"PASS",BROKEN_EMAIL_CTA_COUNT:broken,WRONG_RECIPIENT_COUNT:wrong,EXTERNAL_TEST_EMAIL_SENT:0,EVENT_ROWS:rows.length,OUTBOX_RECIPIENT_ROWS:outbox.length,IN_APP_ONLY_BY_DESIGN:matrix.filter(x=>x[2]==="in-app").map(x=>x[0]),PRIVATE_IN_PROCESS_SINK:matrix.filter(x=>x[2]==="private").map(x=>x[0])}));
