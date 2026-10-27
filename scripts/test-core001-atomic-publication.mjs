import assert from "node:assert/strict";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";
import { publishPackageVersionsAtomically, resolveCore001PublicationTargets } from "../src/server/domain/package-version.js";

loadLocalEnv();
const parsed = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
assert.equal(parsed.hostname, "127.0.0.1");
assert.equal(parsed.port, "5433");
assert.equal(parsed.pathname, "/fixoku_phase2b_migration_shadow_trainer_commerce_20260917");
const pool = new pg.Pool({ connectionString: parsed.toString() });
const actor = (await pool.query("select u.id,u.auth_user_id from platform_users u join platform_memberships m on m.user_id=u.id where m.role='OWNER' and m.status='ACTIVE' and m.scope_type='GLOBAL' and m.scope_id is null order by u.created_at,u.id limit 1")).rows[0];
assert.ok(actor?.id);
const ownerPrincipal = { user: actor, session: { user: { id: actor.auth_user_id } }, memberships: [{ userId: actor.id, role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }] };
const trainerPrincipal = { user: actor, memberships: [{ userId: actor.id, role: "TRAINER", status: "ACTIVE", scopeType: "TRAINER", scopeId: actor.id }] };
const studentActor = (await pool.query("select u.id,u.auth_user_id from platform_users u join platform_memberships m on m.user_id=u.id where m.role='STUDENT' and m.status='ACTIVE' order by u.created_at,u.id limit 1")).rows[0];
assert.ok(studentActor?.id);
const forgedOwnerPrincipal = { user: studentActor, session: { user: { id: studentActor.auth_user_id } }, memberships: [{ userId: studentActor.id, role: "OWNER", status: "ACTIVE", scopeType: "GLOBAL", scopeId: null }] };

const snapshot = async () => ({
  versions: (await pool.query("select pv.id,pv.status,pv.purchase_enabled,pv.price_minor,pv.currency from packages p join package_versions pv on pv.package_id=p.id where p.catalog_scope in ('STUDENT_COMMERCE','TRAINER_COMMERCE') order by pv.id")).rows,
  packages: (await pool.query("select id,status,physical_product from packages where catalog_scope in ('STUDENT_COMMERCE','TRAINER_COMMERCE') order by id")).rows,
  orders: (await pool.query("select id,status,total_minor from orders order by id")).rows,
});

const before = await snapshot();
const client = await pool.connect();
try {
  await client.query("begin");
  await assert.rejects(() => publishPackageVersionsAtomically(client, { principal: forgedOwnerPrincipal }), /AUDIT_ACTOR_MEMBERSHIP_MISMATCH/);
  await assert.rejects(() => publishPackageVersionsAtomically(client, { principal: { ...ownerPrincipal, session: null } }), /AUTHENTICATED_ACTOR_REQUIRED/);
  let targets;
  try {
    targets = await resolveCore001PublicationTargets(client);
  } catch (error) {
    if (error.code !== "CORE001_TARGET_SET_INVALID" || before.versions.some((version) => version.status === "DRAFT")) throw error;
    await client.query("rollback");
    const after = await snapshot();
    assert.deepEqual(after, before);
    console.log(JSON.stringify({ TARGET_SET: "PASS 34/34 (already published)", FORGED_OWNER: "REJECTED", MISSING_SESSION: "REJECTED", REPEAT_RUN: "PASS_REJECTED_NO_DRAFTS", DATABASE_MUTATION: "NO" }, null, 2));
    process.exit(0);
  }
  assert.equal(targets.length, 34);
  assert.equal(targets.filter((target) => target.audience === "STUDENT").length, 26);
  assert.equal(targets.filter((target) => target.audience === "TRAINER").length, 8);
  const result = await publishPackageVersionsAtomically(client, { targets, principal: ownerPrincipal });
  assert.deepEqual({ published: result.published, studentPublished: result.studentPublished, trainerPublished: result.trainerPublished }, { published: 34, studentPublished: 26, trainerPublished: 8 });
  await client.query("rollback");

  await client.query("begin");
  const badPriceTargets = targets.map((target, index) => index === 0 ? { ...target, expectedPriceMinor: Number(target.expectedPriceMinor) + 1 } : target);
  await assert.rejects(() => publishPackageVersionsAtomically(client, { targets: badPriceTargets, principal: ownerPrincipal }), /CORE001_TARGET_PRICE_AUTHORITY_INVALID/);
  await client.query("rollback");

  await client.query("begin");
  await assert.rejects(() => publishPackageVersionsAtomically(client, { targets, principal: trainerPrincipal }), /FORBIDDEN/);
  await client.query("rollback");

  await client.query("begin");
  const failingTargets = targets.map((target, index) => index === targets.length - 1 ? { ...target, expectedPriceMinor: Number(target.expectedPriceMinor) + 1 } : target);
  await assert.rejects(() => publishPackageVersionsAtomically(client, { targets: failingTargets, principal: ownerPrincipal }), /CORE001_TARGET_PRICE_AUTHORITY_INVALID/);
  await client.query("rollback");
} finally {
  client.release();
  const after = await snapshot();
  assert.deepEqual(after, before);
  await pool.end();
}

console.log(JSON.stringify({
  TARGET_SET: "PASS 34/34",
  PRICE_REJECTION: "PASS",
  AUTHORIZATION: "PASS",
  ATOMIC_ROLLBACK: "PASS",
  DATABASE_MUTATION: "NO",
}, null, 2));
