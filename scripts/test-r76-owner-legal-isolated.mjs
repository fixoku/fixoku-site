import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { requireMembership } from "../src/server/auth/authorization.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceUrl = String(process.env.R76_SOURCE_DATABASE_URL || "").trim();
if (!sourceUrl) {
  console.log(JSON.stringify({
    ISOLATED_0041_MIGRATION_TEST: "BLOCKED_SOURCE_DATABASE_URL_UNSET",
    DATABASE_MUTATION: "NONE",
    PERMANENT_DATABASE: "UNTOUCHED",
  }));
  process.exit(0);
}

const approvalApi = fs.readFileSync(path.join(root, "api/admin/owner-legal-approval.js"), "utf8");
const approvalUi = fs.readFileSync(path.join(root, "src/platform/admin/LegalPreparationPage.tsx"), "utf8");
assert.match(approvalApi, /requireMembership\(principal, "OWNER"\)/u);
assert.match(approvalApi, /LEGAL_PUBLICATION_BLOCKED_P0/u);
assert.match(approvalApi, /LEGAL_CONTENT_HASH_MISMATCH/u);
assert.equal(requireMembership({ memberships: [{ role: "STUDENT", status: "ACTIVE", scopeType: "STUDENT", scopeId: "student" }] }, "OWNER")?.status, 403);
assert.match(approvalUi, /DB durumunu yenile/u);
assert.match(approvalUi, /21 V1\.0 taslağını DB’ye al/u);
assert.match(approvalUi, /Owner olarak APPROVED yap/u);
assert.match(approvalUi, /INTERNAL_ONLY/u);
assert.match(approvalUi, /BLOCKED_P0/u);

const fixture = await createDisposableDatabase(sourceUrl, { migrationsFolder: path.join(root, "drizzle/migrations") });
try {
  const { pool, databaseName } = fixture;
  const current = (await pool.query("select current_database() as database")).rows[0]?.database;
  assert.equal(current, databaseName);
  const migration = fs.readFileSync(path.join(root, "drizzle/migrations/0041_owner_legal_vat_approval.sql"), "utf8");
  assert.match(migration, /owner_legal_document_versions_immutable/u);
  assert.match(migration, /LEGAL_VERSION_IMMUTABLE/u);

  const owner = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r76-owner-auth','r76-owner@example.test','R76 Synthetic Owner',true) returning id")).rows[0].id;
  await pool.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,'GLOBAL',null,'OWNER','ACTIVE')", [owner]);
  const outsider = (await pool.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values('r76-outsider-auth','r76-outsider@example.test','R76 Outsider',true) returning id")).rows[0].id;
  const markdown = "# R76 synthetic customer document\\n\\nApproved test text.";
  const hash = crypto.createHash("sha256").update(markdown, "utf8").digest("hex");
  const version = (await pool.query("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values('FIXOKU-R76-01',1,10,'DRAFT','R76 Synthetic Customer','CUSTOMER',$1,$2,$3) returning id", [markdown, hash, owner])).rows[0].id;

  await pool.query("update owner_legal_document_versions set status='REVIEW',updated_at=now() where id=$1", [version]);
  await pool.query("insert into owner_legal_document_events(document_version_id,previous_status,next_status,actor_user_id,event_note,correlation_id) values($1,'DRAFT','REVIEW',$2,'R76 review started','r76-review-event')", [version, owner]);
  await pool.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'LEGAL_REVIEW',$2,'R76 external legal evidence recorded','R76-LEGAL-EVIDENCE')", [version, owner]);
  await pool.query("update owner_legal_document_versions set status='APPROVED',updated_at=now() where id=$1", [version]);
  await pool.query("insert into owner_legal_document_events(document_version_id,previous_status,next_status,actor_user_id,event_note,correlation_id) values($1,'REVIEW','APPROVED',$2,'R76 Owner approval','r76-approved-event')", [version, owner]);
  await pool.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'OWNER_APPROVAL',$2,'R76 synthetic Owner approval','R76-OWNER-EVIDENCE')", [version, owner]);
  await pool.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'legal.document.approved','owner_legal_document_version',$2,'SUCCESS','r76-audit-event','{}')", [owner, version]);

  const state = (await pool.query("select status,content_sha256,markdown from owner_legal_document_versions where id=$1", [version])).rows[0];
  assert.equal(state.status, "APPROVED");
  assert.equal(state.content_sha256, hash);
  assert.equal(state.content_sha256, crypto.createHash("sha256").update(state.markdown, "utf8").digest("hex"));
  assert.equal(Number((await pool.query("select count(*) from owner_legal_document_decisions where document_version_id=$1", [version])).rows[0].count), 2);
  assert.equal(Number((await pool.query("select count(*) from owner_legal_document_events where document_version_id=$1", [version])).rows[0].count), 2);
  assert.equal(Number((await pool.query("select count(*) from platform_audit_events where subject_id=$1", [version])).rows[0].count), 1);

  await assert.rejects(pool.query("update owner_legal_document_versions set markdown='tampered',content_sha256=$1 where id=$2", [crypto.createHash("sha256").update("tampered").digest("hex"), version]), /LEGAL_VERSION_IMMUTABLE/u);
  await assert.rejects(pool.query("insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values('FIXOKU-R76-INTERNAL',18,2,'PUBLISHED','R76 Internal','INTERNAL','internal', $1,$2)", [crypto.createHash("sha256").update("internal").digest("hex"), owner]), /owner_legal_document_versions_scope_check|violates check constraint/iu);

  console.log(JSON.stringify({
    ISOLATED_0041_MIGRATION_TEST: "PASS",
    ISOLATED_DATABASE: databaseName,
    SYNTHETIC_OWNER_FLOW: "DRAFT_REVIEW_APPROVED_PASS",
    UNAUTHORIZED_OWNER_GUARD: "PASS",
    APPROVED_HASH_PRESERVED: "PASS",
    APPROVAL_DECISIONS: 2,
    STATUS_EVENTS: 2,
    AUDIT_RECORDS: 1,
    APPROVED_VERSION_IMMUTABLE: "PASS",
    INTERNAL_PUBLISHED_GUARD: "PASS",
    PUBLICATION_API: "BLOCKED_P0",
    DATABASE_MUTATION: "DISPOSABLE_ONLY",
  }));
} finally {
  await fixture.dispose();
}
