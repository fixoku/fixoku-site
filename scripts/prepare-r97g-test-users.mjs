import assert from "node:assert/strict";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";
import { R97G_TEST_IDENTITIES } from "../src/server/auth/r97g-test-identities.js";

const TARGET = Object.freeze({
  project: "damp-night-76577929",
  branch: "br-solitary-scene-ba3d7ejb",
  database: "neondb",
});

const apply = process.argv.includes("--apply");
const password = process.env.R97G_TEST_PASSWORD || process.env.TEST_SEED_PASSWORD || "";

function assertApplyTarget(rawUrl) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.VERCEL_ENV) throw new Error("R97G_STAGING_SEED_PRODUCTION_FORBIDDEN");
  if (process.env.R97G_STAGING_APPROVED !== "1") throw new Error("R97G_STAGING_APPROVAL_REQUIRED");
  if (process.env.R97G_STAGING_PROJECT_ID !== TARGET.project || process.env.R97G_STAGING_BRANCH_ID !== TARGET.branch) throw new Error("R97G_STAGING_IDENTITY_MARKERS_REQUIRED");
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error("R97G_STAGING_DATABASE_URL_INVALID"); }
  if (!/^(postgres|postgresql):$/u.test(parsed.protocol) || !parsed.hostname.endsWith(".neon.tech") || decodeURIComponent(parsed.pathname.slice(1)) !== TARGET.database) throw new Error("R97G_STAGING_DATABASE_TARGET_MISMATCH");
  return parsed;
}

function plan() {
  return {
    plan: "R97G synthetic account seed",
    target: TARGET,
    accounts: R97G_TEST_IDENTITIES.map(({ slug, email, role, name }) => ({ slug, email, role, name })),
    emailVerification: "UNVERIFIED_BY_DEFAULT; verify through Better Auth test-mail flow",
    password: "REDACTED_SECRET_INPUT",
    stagingUsersCreated: "NO",
    apply: "Requires --apply, R97G_STAGING_APPROVED=1, exact project/branch markers, and R97G_TEST_PASSWORD or TEST_SEED_PASSWORD",
  };
}

if (!apply) {
  console.log(JSON.stringify(plan(), null, 2));
  process.exit(0);
}

assert.ok(password.length >= 12, "R97G_TEST_PASSWORD or TEST_SEED_PASSWORD must be at least 12 characters");
const rawUrl = process.env.R97G_STAGING_DATABASE_URL;
const databaseUrl = assertApplyTarget(rawUrl);
const emailVerified = process.env.R97G_SEED_EMAIL_VERIFIED === "1";
const pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 2, connectionTimeoutMillis: 8_000 });
const client = await pool.connect();
let created = 0;
try {
  await client.query("begin");
  for (const identity of R97G_TEST_IDENTITIES) {
    const userId = `r97g-${identity.slug}`;
    const existing = await client.query('select id from "user" where lower(email)=lower($1) or id=$2 limit 1', [identity.email, userId]);
    if (existing.rowCount && existing.rows[0].id !== userId) throw new Error(`R97G_ACCOUNT_COLLISION:${identity.email}`);
    const existingPlatform = await client.query("select auth_user_id from platform_users where lower(email)=lower($1) limit 1", [identity.email]);
    if (existingPlatform.rowCount && existingPlatform.rows[0].auth_user_id !== userId) throw new Error(`R97G_PLATFORM_ACCOUNT_COLLISION:${identity.email}`);
    const passwordHash = await hashPassword(password);
    await client.query(
      'insert into "user" (id,name,email,email_verified,created_at,updated_at) values ($1,$2,$3,$4,now(),now()) on conflict (id) do update set name=excluded.name,email=excluded.email,email_verified=excluded.email_verified,updated_at=now()',
      [userId, identity.name, identity.email, emailVerified],
    );
    await client.query(
      'insert into account (id,account_id,provider_id,user_id,password,created_at,updated_at) values ($1,$2,\'credential\',$3,$4,now(),now()) on conflict (id) do update set password=excluded.password,updated_at=now()',
      [`${userId}-credential`, userId, userId, passwordHash],
    );
    const platform = await client.query(
      "insert into platform_users (id,auth_user_id,email,display_name,email_verified) values (gen_random_uuid(),$1,$2,$3,$4) on conflict (email) do update set auth_user_id=excluded.auth_user_id,display_name=excluded.display_name,email_verified=excluded.email_verified,updated_at=now() returning id",
      [userId, identity.email, identity.name, emailVerified],
    );
    const platformUserId = platform.rows[0]?.id;
    assert.ok(platformUserId, `R97G_PLATFORM_USER_MISSING:${identity.email}`);
    const scopeType = identity.role === "SUPER_ADMIN" ? "GLOBAL" : identity.role;
    const scopeId = identity.role === "SUPER_ADMIN" ? null : platformUserId;
    const membership = await client.query("select id from platform_memberships where user_id=$1 and role=$2 and scope_type=$3 limit 1", [platformUserId, identity.role, scopeType]);
    if (!membership.rowCount) {
      await client.query("insert into platform_memberships (user_id,scope_type,scope_id,role,status) values ($1,$2,$3,$4,'ACTIVE')", [platformUserId, scopeType, scopeId, identity.role]);
    }
    if (identity.role === "STUDENT") {
      await client.query("insert into student_profiles (user_id,first_name,last_name) values ($1,$2,$3) on conflict (user_id) do nothing", [platformUserId, identity.name, null]);
    }
    created += 1;
  }
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}

console.log(JSON.stringify({ plan: "R97G synthetic account seed", target: TARGET, accountsProcessed: created, emailVerified, password: "REDACTED", stagingUsersCreated: "YES" }));
