import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const database = new URL(process.env.DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "5433");
assert.equal(database.pathname, "/fixoku_phase2b_migration_shadow_trainer_commerce_20260917");
const origin = "http://127.0.0.1:5173";
const pool = new pg.Pool({ connectionString: database.toString() });
const snapshot = async () => {
  const rows = (await pool.query("select p.id,p.slug,p.status as package_status,pv.id as version_id,pv.status as version_status,pv.purchase_enabled,pv.price_minor,pv.price_gross_minor,pv.currency from packages p join package_versions pv on pv.package_id=p.id order by p.id,pv.version_number,pv.id")).rows;
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
};
const before = await snapshot();
const target = (await pool.query("select p.id package_id,pv.id version_id from packages p join package_versions pv on pv.package_id=p.id and pv.status='PUBLISHED' where p.catalog_scope='TRAINER_COMMERCE' order by p.slug limit 1")).rows[0];
const admin = (await pool.query("select u.id from platform_users u join platform_memberships m on m.user_id=u.id where u.email=$1 and m.role='SUPER_ADMIN' and m.status='ACTIVE' and m.scope_type='GLOBAL' and m.scope_id is null", ["super-admin.phase1c@example.test"])).rows[0];
assert.ok(target && admin);
const login = async (slug) => {
  const response = await fetch(`${origin}/api/local-review/switch-user`, { method: "POST", headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }, body: JSON.stringify({ slug }) });
  assert.equal(response.status, 200);
  return (response.headers.get("set-cookie") || "").split(";")[0];
};
const request = async (path, cookie, body) => {
  const response = await fetch(`${origin}${path}`, { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};
const ownerCookie = await login("ersin");
const adminCookie = await login("fixoku-super-admin");
const publishAttempt = () => request(`/api/admin/trainer-packages?id=${target.package_id}`, adminCookie, { action: "publish", versionId: target.version_id });
const grantAction = (action) => request("/api/admin/package-permissions", ownerCookie, { adminUserId: admin.id, permission: "PACKAGE_PUBLISH", action });
const active = (await pool.query("select count(*)::int count from owner_admin_package_permissions where admin_user_id=$1 and permission='PACKAGE_PUBLISH' and revoked_at is null", [admin.id])).rows[0].count;
assert.equal(active, 0, "existing grant must not be modified by this test");
const without = await publishAttempt();
assert.deepEqual({ status: without.status, error: without.body.error }, { status: 403, error: "PACKAGE_PERMISSION_REQUIRED" });
let granted = false;
let withGrant;
let revoke;
try {
  const grant = await grantAction("grant");
  assert.equal(grant.status, 201, JSON.stringify(grant.body));
  granted = true;
  withGrant = await publishAttempt();
  assert.equal(withGrant.status, 409, JSON.stringify(withGrant.body));
  assert.equal(withGrant.body.error, "CORE001_PUBLICATION_VALIDATION_FAILED");
} finally {
  if (granted) revoke = await grantAction("revoke");
}
assert.equal(revoke?.status, 200, JSON.stringify(revoke?.body));
const afterRevoke = await publishAttempt();
assert.deepEqual({ status: afterRevoke.status, error: afterRevoke.body.error }, { status: 403, error: "PACKAGE_PERMISSION_REQUIRED" });
const after = await snapshot();
assert.equal(after, before, "package/version/price snapshot changed");
const audit = (await pool.query("select action,count(*)::int count from platform_audit_events where subject_id=$1 and action in ('owner_admin.package_permission.granted','owner_admin.package_permission.revoked') group by action", [admin.id])).rows;
await pool.end();
console.log(JSON.stringify({ ADMIN_WITHOUT_GRANT: without, OWNER_GRANT: "201", ADMIN_WITH_GRANT: withGrant, OWNER_REVOKE: revoke.status, ADMIN_AFTER_REVOKE: afterRevoke, PRICES_UNCHANGED: before === after, packageHash: after, audit }, null, 2));
