import { randomBytes } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const TEST_DATABASE_PREFIX = "fixoku_test_";

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function assertLoopbackDatabaseUrl(rawUrl) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error("DISPOSABLE_DATABASE_PRODUCTION_FORBIDDEN");
  }
  if (typeof rawUrl !== "string" || !rawUrl) throw new Error("DATABASE_URL_MISSING");
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error("DATABASE_URL_INVALID"); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DISPOSABLE_DATABASE_PROTOCOL_FORBIDDEN");
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error("DISPOSABLE_DATABASE_HOST_FORBIDDEN");
  return parsed;
}

function uniqueDatabaseName() {
  const stamp = Date.now().toString(36);
  const suffix = randomBytes(4).toString("hex");
  return `${TEST_DATABASE_PREFIX}commerce_${stamp}_${suffix}`.toLowerCase();
}

/**
 * Create a uniquely named local database and replay the canonical migration
 * chain. The source URL is used only to authenticate to the local PostgreSQL
 * server; its database is never opened or mutated.
 */
export async function createDisposableDatabase(sourceUrl, options = {}) {
  const source = assertLoopbackDatabaseUrl(sourceUrl);
  const adminUrl = new URL(source.toString());
  adminUrl.pathname = "/postgres";
  const databaseName = uniqueDatabaseName();
  const adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  let databasePool;
  try {
    await adminPool.query(`create database ${quoteIdentifier(databaseName)}`);
    const databaseUrl = new URL(source.toString());
    databaseUrl.pathname = `/${databaseName}`;
    databasePool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 4 });
    const db = drizzle(databasePool);
    await migrate(db, { migrationsFolder: options.migrationsFolder || "drizzle/migrations" });
    return {
      databaseName,
      databaseUrl,
      pool: databasePool,
      async dispose() {
        await databasePool.end();
        databasePool = null;
        await adminPool.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [databaseName]);
        await adminPool.query(`drop database if exists ${quoteIdentifier(databaseName)}`);
        await adminPool.end();
      },
    };
  } catch (error) {
    if (databasePool) await databasePool.end().catch(() => {});
    await adminPool.query("select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid <> pg_backend_pid()", [databaseName]).catch(() => {});
    await adminPool.query(`drop database if exists ${quoteIdentifier(databaseName)}`).catch(() => {});
    await adminPool.end().catch(() => {});
    throw error;
  }
}

export function isDisposableDatabaseName(value) {
  return new RegExp(`^${TEST_DATABASE_PREFIX}commerce_[a-z0-9_]+$`, "u").test(String(value));
}
