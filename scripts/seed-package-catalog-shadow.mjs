import assert from "node:assert/strict";
import pg from "pg";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";
import { loadLocalEnv } from "./local-env.mjs";

loadLocalEnv();
if (process.env.FIXOKU_SHADOW_REPLAY !== "1") throw new Error("SHADOW_REPLAY_REQUIRED");
const url = assertSafeSeedDatabaseUrl(process.env.SEED_DATABASE_URL || process.env.DATABASE_URL);
const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
if (!/^fixoku_phase2b_migration_shadow_[a-z0-9_]+$/u.test(database)) throw new Error("SHADOW_DATABASE_REQUIRED");
const pool = new pg.Pool({ connectionString: url.toString() });
const client = await pool.connect();
try {
  await client.query("begin");
  const program = (await client.query("select id from training_programs where slug='phase2b-acceptance-student-program' and audience='STUDENT' and status='PUBLISHED'")).rows[0];
  assert.ok(program, "PHASE2B_STUDENT_PROGRAM_REQUIRED");
  const packageRow = (await client.query("insert into packages(slug,audience,status) values('phase2b-test-commerce-package','STUDENT','PUBLISHED') on conflict(slug) do update set audience='STUDENT',status='PUBLISHED',updated_at=now() returning id")).rows[0];
  const version = (await client.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status,published_at) values($1,1,'Test Ortaokul Paketi','Yerel Phase 2B shadow acceptance paketi.',125000,'TRY','PUBLISHED',now()) on conflict(package_id,version_number) do update set title=excluded.title,description=excluded.description,price_minor=excluded.price_minor,currency=excluded.currency,status='PUBLISHED',published_at=coalesce(package_versions.published_at,now()),updated_at=now() returning id", [packageRow.id])).rows[0];
  await client.query("insert into package_entitlement_definitions(package_version_id,training_program_id,delivery_mode) values($1,$2,'TRAINER_LED') on conflict(package_version_id,training_program_id) do update set delivery_mode='TRAINER_LED'", [version.id, program.id]);
  await client.query("commit");
  console.log(JSON.stringify({ packageCatalog: "PASS", packageId: packageRow.id, packageVersionId: version.id, environment: "LOCAL_SHADOW_TEST_ONLY", commercialAuthority: "NON_FINAL_TEST_DATA" }));
} catch (error) { await client.query("rollback"); throw error; } finally { client.release(); await pool.end(); }
