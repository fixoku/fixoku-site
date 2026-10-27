import pg from "pg";

const EXPECTED_DATABASE = "fixoku_test_commerce_r96p_final2_mvoiuzes_706c05";
const EXPECTED_HOST = "127.0.0.1";
const EXPECTED_PORT = "55432";
const EXPECTED_SERVER_PORT = "5432";
const EXPECTED_MIGRATIONS = 42;

const fixtureUsers = Object.freeze([
  ["owner.r96p.final2@example.test", "OWNER"],
  ["admin.r96p.final2@example.test", "SUPER_ADMIN"],
  ["trainer.ozlem.r96p.final2@example.test", "TRAINER"],
  ["elif.r96p.final2@example.test", "TRAINER"],
  ["student.r96p.final2@example.test", "STUDENT"],
  ["ali.asaf.usta@fixoku.com.tr", "STUDENT"],
]);

function fail(code) {
  console.error(code);
  process.exitCode = 1;
}

function exactDisposableUrl(value, key) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    throw new Error(`${key}_INVALID`);
  }
  if (!/^postgres(?:ql)?:$/u.test(parsed.protocol)) throw new Error(`${key}_PROTOCOL_INVALID`);
  if (parsed.hostname !== EXPECTED_HOST || parsed.port !== EXPECTED_PORT || parsed.pathname !== `/${EXPECTED_DATABASE}`) {
    throw new Error(`${key}_TARGET_INVALID`);
  }
  if (/prod|production|neon|fixoku_platform_dev|fixoku_owner_local/iu.test(parsed.pathname)) throw new Error(`${key}_PRODUCTION_TARGET`);
  return parsed;
}

const databaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !testDatabaseUrl) {
  fail("R96P_DATABASE_ENV_MISSING");
} else {
  let pool;
  let client;
  try {
    const database = exactDisposableUrl(databaseUrl, "DATABASE_URL");
    const testDatabase = exactDisposableUrl(testDatabaseUrl, "TEST_DATABASE_URL");
    if (database.toString() !== testDatabase.toString()) throw new Error("DATABASE_TARGET_MISMATCH");

    pool = new pg.Pool({ connectionString: database.toString(), connectionTimeoutMillis: 4000, idleTimeoutMillis: 4000, max: 1 });
    client = await pool.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout = '4000ms'");

    const identity = (await client.query("select current_database() as database, current_schema() as schema, current_user as user_name, inet_server_addr()::text as server_address, inet_server_port() as server_port")).rows[0];
    if (identity.database !== EXPECTED_DATABASE || String(identity.server_port) !== EXPECTED_SERVER_PORT) throw new Error("R96P_DATABASE_IDENTITY_MISMATCH");

    const migration = (await client.query("select count(*)::int as count from drizzle.__drizzle_migrations")).rows[0];
    if (migration.count !== EXPECTED_MIGRATIONS) throw new Error("R96P_MIGRATION_COUNT_MISMATCH");

    const emails = fixtureUsers.map(([email]) => email);
    const authRows = (await client.query("select lower(email) as email, email_verified from \"user\" where lower(email) = any($1::text[])", [emails])).rows;
    const platformRows = (await client.query("select lower(u.email) as email, u.email_verified, coalesce(array_agg(distinct m.role::text) filter (where m.status = 'ACTIVE'), '{}') as roles from platform_users u left join platform_memberships m on m.user_id = u.id where lower(u.email) = any($1::text[]) group by u.email, u.email_verified", [emails])).rows;
    const authByEmail = new Map(authRows.map((row) => [row.email, row]));
    const platformByEmail = new Map(platformRows.map((row) => [row.email, row]));
    for (const [email, expectedRole] of fixtureUsers) {
      const auth = authByEmail.get(email);
      const platform = platformByEmail.get(email);
      if (!auth || !platform || !auth.email_verified || !platform.email_verified || !platform.roles.includes(expectedRole)) throw new Error(`R96P_FIXTURE_MISSING_${expectedRole}`);
    }

    const ozlemId = (await client.query("select id from platform_users where lower(email) = $1", ["trainer.ozlem.r96p.final2@example.test"])).rows[0]?.id;
    const qualifications = (await client.query("select count(*)::int as count from r6_trainer_qualification_grants where trainer_user_id = $1 and status = 'ACTIVE'", [ozlemId])).rows[0].count;
    const entitlements = (await client.query("select count(*)::int as count from trainer_package_entitlements where trainer_user_id = $1 and status = 'ACTIVE'", [ozlemId])).rows[0].count;
    const unreadNotifications = (await client.query("select count(*)::int as count from panel_notifications where recipient_user_id = $1 and read_at is null", [ozlemId])).rows[0].count;
    if (qualifications < 6) throw new Error("R96P_OZLEM_QUALIFICATION_FIXTURE_MISSING");
    if (entitlements < 5) throw new Error("R96P_OZLEM_ENTITLEMENT_FIXTURE_MISSING");
    if (unreadNotifications < 1) throw new Error("R96P_OZLEM_NOTIFICATION_FIXTURE_MISSING");

    await client.query("commit");
    console.log(JSON.stringify({
      database: identity.database,
      schema: identity.schema,
      user: identity.user_name,
      server: `${identity.server_address}:${identity.server_port} (loopback host port ${EXPECTED_PORT})`,
      migrations: migration.count,
      fixtureUsers: fixtureUsers.length,
      ozlem: { qualifications, entitlements, unreadNotifications },
      readOnly: true,
    }));
  } catch (error) {
    try { if (client) await client.query("rollback"); } catch { /* best effort */ }
    fail(error instanceof Error ? error.message : "R96P_RUNTIME_VERIFICATION_FAILED");
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}
