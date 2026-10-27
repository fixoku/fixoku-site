import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { createDisposableDatabase } from "./disposable-test-db.mjs";
import { createStudentCommerceOrder } from "../src/server/domain/student-commerce.js";

const root = process.cwd();
const integration = path.resolve(root, "..", "integration");
const envPath = path.join(integration, ".env.local");
assert.ok(fs.existsSync(envPath), "SOURCE_ENV_MISSING");
const env = Object.fromEntries(fs.readFileSync(envPath, "utf8").split(/\r?\n/u).filter((line) => /^[A-Z][A-Z0-9_]*=/u.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
assert.ok(env.DATABASE_URL && env.BETTER_AUTH_SECRET, "SAFE_FIXTURE_ENV_MISSING");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fixoku-family-cart-0037-"));
fs.mkdirSync(path.join(temp, "meta"), { recursive: true });
for (const entry of fs.readdirSync(path.join(root, "drizzle/migrations"))) if (entry.endsWith(".sql")) fs.copyFileSync(path.join(root, "drizzle/migrations", entry), path.join(temp, entry));
fs.copyFileSync(path.join(root, "drizzle/migrations/meta/_journal.json"), path.join(temp, "meta/_journal.json"));

let fixture;
let server;
let output = "";
const port = 5480 + Math.floor(Math.random() * 40);
const origin = `http://127.0.0.1:${port}`;
const password = "Family-Cart-0037-Disposable-9!";
const request = async (cookie, pathname, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("origin", origin);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(origin + pathname, { ...options, headers });
  return { response, body: await response.json().catch(() => ({})) };
};
const login = async (email) => {
  const result = await request("", "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(result.response.status, 200, `login:${email}`);
  const cookie = result.response.headers.get("set-cookie");
  assert.ok(cookie, `cookie:${email}`);
  return cookie.split(";")[0];
};

try {
  fixture = await createDisposableDatabase(env.DATABASE_URL, { migrationsFolder: temp });
  const pool = fixture.pool;
  const c = await pool.connect();
  const platform = {};
  try {
    await c.query("begin");
    const identities = [
      ["family-0037-owner", "family.0037.owner@example.test", "Family 0037 Owner", "OWNER"],
      ["family-0037-student-a", "family.0037.student.a@example.test", "Family 0037 Student A", "STUDENT"],
      ["family-0037-student-b", "family.0037.student.b@example.test", "Family 0037 Student B", "STUDENT"],
    ];
    for (const [authId, email, displayName, role] of identities) {
      await c.query('insert into "user" (id,name,email,email_verified,created_at,updated_at) values($1,$2,$3,true,now(),now())', [authId, displayName, email]);
      await c.query('insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values($1,$2,\'credential\',$2,$3,now(),now())', [`${authId}-credential`, authId, await hashPassword(password)]);
      const user = (await c.query("insert into platform_users(auth_user_id,email,display_name,email_verified) values($1,$2,$3,true) returning id", [authId, email, displayName])).rows[0];
      platform[role === "OWNER" ? "owner" : role === "STUDENT" && !platform.studentA ? "studentA" : "studentB"] = user.id;
      await c.query("insert into platform_memberships(user_id,scope_type,scope_id,role,status) values($1,$2,$3,$4,'ACTIVE')", [user.id, role === "OWNER" ? "GLOBAL" : "STUDENT", role === "OWNER" ? null : user.id, role]);
    }
    const offerSeed = async ({ title, status, revisionStatus, revisionNumber = 1, customerUserId, finalFamilyPriceMinor = 9000 }) => {
      const offer = (await c.query("insert into family_offers(owner_user_id,customer_user_id,title,status,current_revision_number) values($1,$2,$3,$4,$5) returning id", [platform.owner, customerUserId, title, status, revisionNumber])).rows[0];
      const revision = (await c.query("insert into family_offer_revisions(offer_id,revision_number,status,draft_children_snapshot,selections_snapshot,pricing_snapshot,created_by) values($1,$2,$3,$4,$5,$6,$7) returning id", [offer.id, revisionNumber, revisionStatus, JSON.stringify([{ localKey: "one", firstName: "Ada", lastName: "Family", grade: "5", educationStage: "MIDDLE" }]), JSON.stringify([]), JSON.stringify({ normalTotalMinor: 10000, bookCount: 1, shippingMinor: 10000, discountMinor: 1000, finalFamilyPriceMinor, payablePreviewMinor: finalFamilyPriceMinor + 10000, currency: "TRY" }), platform.owner])).rows[0];
      await c.query("insert into family_offer_draft_children(revision_id,local_key,first_name,last_name,grade,education_stage) values($1,'one','Ada','Family','5','MIDDLE')", [revision.id]);
      return offer.id;
    };
    platform.sentOffer = await offerSeed({ title: "Family 0037 SENT", status: "SENT", revisionStatus: "SENT", customerUserId: platform.studentA });
    platform.draftOffer = await offerSeed({ title: "Family 0037 DRAFT", status: "DRAFT", revisionStatus: "DRAFT", customerUserId: platform.studentA, finalFamilyPriceMinor: 8000 });
    platform.otherOffer = await offerSeed({ title: "Family 0037 Other", status: "SENT", revisionStatus: "SENT", customerUserId: platform.studentB });
    await c.query("commit");
  } catch (error) { await c.query("rollback"); throw error; } finally { c.release(); }

  const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  server = spawn(process.execPath, [vite, "--host", "127.0.0.1", "--port", String(port)], { cwd: root, env: { ...process.env, ...env, DATABASE_URL: fixture.databaseUrl.toString(), TEST_DATABASE_URL: fixture.databaseUrl.toString(), APP_ORIGIN: origin, BETTER_AUTH_URL: origin, NODE_ENV: "test", FIXOKU_DEV_LOGIN_ENABLED: "0" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  server.stdout.on("data", (chunk) => { output += chunk.toString(); });
  server.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { try { const response = await fetch(origin + "/"); if (response.status < 500) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 250)); }

  const studentA = await login("family.0037.student.a@example.test");
  const studentB = await login("family.0037.student.b@example.test");
  const owner = await login("family.0037.owner@example.test");

  const initial = await request(studentA, "/api/student/family-offers");
  assert.equal(initial.response.status, 200);
  assert.deepEqual(initial.body.offers.map((offer) => offer.id), [platform.sentOffer]);
  const draft = await request(studentA, "/api/student/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.draftOffer, revisionNumber: 1 }) });
  assert.equal(draft.response.status, 409);
  assert.equal(draft.body.error, "FAMILY_OFFER_NOT_AVAILABLE");
  const isolated = await request(studentB, "/api/student/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.sentOffer, revisionNumber: 1 }) });
  assert.equal(isolated.response.status, 404);
  assert.equal(isolated.body.error, "FAMILY_OFFER_NOT_FOUND");

  const add = await request(studentA, "/api/student/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.sentOffer, revisionNumber: 1 }) });
  assert.equal(add.response.status, 200, JSON.stringify(add.body));
  assert.equal(add.body.items.filter((item) => item.kind === "FAMILY_OFFER").length, 1);
  assert.equal(add.body.items.length, 1);
  assert.equal(add.body.subtotalMinor, 9000);
  assert.equal(add.body.shippingMinor, 10000);
  assert.equal(add.body.totalMinor, 19000);
  assert.equal(add.body.items[0].finalFamilyPriceMinor, 9000);
  const duplicate = await request(studentA, "/api/student/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.sentOffer, revisionNumber: 1 }) });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error, "FAMILY_OFFER_ALREADY_IN_CART");
  const removed = await request(studentA, "/api/student/cart", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.sentOffer }) });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.body.items.length, 0);

  const addAgain = await request(studentA, "/api/student/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyOfferId: platform.sentOffer, revisionNumber: 1 }) });
  assert.equal(addAgain.response.status, 200);
  const principal = { user: { id: platform.studentA, displayName: "Family 0037 Student A", email: "family.0037.student.a@example.test" }, memberships: [] };
  const checkoutClient = await fixture.pool.connect();
  try { await assert.rejects(createStudentCommerceOrder(checkoutClient, principal, { paymentMethod: "PAYTR", idempotencyKey: "family-0037-no-payment" }), (error) => error.code === "FAMILY_OFFER_CHECKOUT_UNAVAILABLE"); } finally { checkoutClient.release(); }

  await fixture.pool.query("update family_offers set current_revision_number=2,updated_at=now() where id=$1", [platform.sentOffer]);
  const stale = await request(studentA, "/api/student/cart");
  assert.equal(stale.response.status, 409);
  assert.equal(stale.body.error, "FAMILY_REVISION_STALE");

  const ownerContext = await request(owner, "/api/panel-context");
  assert.equal(ownerContext.response.status, 200);
  console.log(JSON.stringify({ disposableMigration: "PASS", familyCartDbTests: "PASS", authenticatedHttp: "PASS", accountIsolation: "PASS", staleRevision: "PASS", checkoutBlock: "PASS", draftRejected: "PASS", duplicateRejected: "PASS", wholeOfferRemoved: "PASS", canonicalPricing: "PASS", ownerBetterAuthSession: "PASS" }));
} catch (error) {
  if (output) error.message += `\n${output}`;
  throw error;
} finally {
  if (server && !server.killed) { server.kill(); await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 2000))]); }
  if (fixture) await fixture.dispose();
  fs.rmSync(temp, { recursive: true, force: true });
}
