import test from "node:test";
import assert from "node:assert/strict";
import { APPROVED_AUDIT_POLICIES, getApprovedAuditPolicy, recordApprovedAuditEvent } from "../src/server/domain/fixoku-audit-policy.js";

test("79 independent policy items and unique IDs", () => {
  assert.equal(APPROVED_AUDIT_POLICIES.length,79);
  assert.equal(new Set(APPROVED_AUDIT_POLICIES.map(x=>x.id)).size,79);
  assert(APPROVED_AUDIT_POLICIES.every(x=>x.approved));
});
test("non-audit analytics explicitly excluded", () => {
  assert.equal(getApprovedAuditPolicy(39).mode,"ANALYTICS_ONLY");
  assert.equal(getApprovedAuditPolicy(79).mode,"ANALYTICS_ONLY");
});
test("unknown and analytics-only events are blocked", async () => {
  const client={query:async()=>{throw new Error("MUST_NOT_EXECUTE")}};
  await assert.rejects(recordApprovedAuditEvent(client,{policyId:79}),/AUDIT_POLICY_NOT_ALLOWED/);
  await assert.rejects(recordApprovedAuditEvent(client,{policyId:999}),/AUDIT_POLICY_NOT_ALLOWED/);
});
test("transaction-scoped audit records never accept raw metadata", async () => {
  const calls=[];
  const client={query:async(sql,values)=>{calls.push([sql,values])}};
  await recordApprovedAuditEvent(client,{
    policyId:47,
    actorUserId:"11111111-1111-4111-8111-111111111111",
    action:"trainer.commerce.bank_transfer.review.approved",
    subjectType:"trainer_package_order",
    subjectId:"22222222-2222-4222-8222-222222222222",
    metadata:{iban:"MUST_NOT_LOG"},
  });
  assert.equal(calls.length,1);
  assert.equal(calls[0][1].length,4);
  assert(!JSON.stringify(calls).includes("MUST_NOT_LOG"));
});
