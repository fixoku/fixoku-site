import pg from "pg";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const database = new URL(process.env.DATABASE_URL);
if (database.hostname !== "127.0.0.1" || database.port !== "5433" || database.pathname !== "/fixoku_phase2b_migration_shadow_trainer_commerce_20260917") throw new Error("TARGET_DB_FORBIDDEN");
const before = (await pool.query("select (select count(*)::int from package_versions where status=$1) published,(select count(*)::int from package_versions where status=$2) drafts,(select count(*)::int from platform_audit_events) audit,(select count(*)::int from drizzle.__drizzle_migrations) ledger", ["PUBLISHED", "DRAFT"])).rows[0];
const packageId = (await pool.query("select id from packages where catalog_scope=$1 limit 1", ["TRAINER_COMMERCE"])).rows[0].id;
const login = async (slug) => {
  const response = await fetch(`${origin}/api/local-review/switch-user`, { method: "POST", headers: { origin, "content-type": "application/json", "x-fixoku-local-review-proof": process.env.BETTER_AUTH_SECRET }, body: JSON.stringify({ slug }) });
  return { status: response.status, cookie: (response.headers.get("set-cookie") || "").split(";")[0] };
};
const request = async (path, cookie, body = null) => {
  const response = await fetch(`${origin}${path}`, { method: body ? "POST" : "GET", headers: { origin, cookie, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};
const results = {};
for (const slug of ["hatice-kubra-usta", "ozlem-kaplan", "ersin", "fixoku-super-admin"]) {
  const session = await login(slug);
  results[slug] = { login: session.status, packages: await request("/api/admin/packages", session.cookie), grants: await request("/api/admin/package-permissions", session.cookie), publish: await request(`/api/admin/trainer-packages?id=${packageId}`, session.cookie, { action: "publish", versionId: "00000000-0000-4000-8000-000000000000", role: "OWNER" }) };
}
const after = (await pool.query("select (select count(*)::int from package_versions where status=$1) published,(select count(*)::int from package_versions where status=$2) drafts,(select count(*)::int from platform_audit_events) audit,(select count(*)::int from drizzle.__drizzle_migrations) ledger", ["PUBLISHED", "DRAFT"])).rows[0];
await pool.end();
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("SHADOW_MUTATION_DETECTED");
console.log(JSON.stringify({ results, before, after, mutation: "NO" }, null, 2));
