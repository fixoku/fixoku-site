/** Guardrails for local-only authentication seed tooling. */

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const ALLOWED_DATABASES = new Set(["fixoku_platform_dev", "fixoku_platform_test"]);
const SHADOW_DATABASE_PATTERN = /^fixoku_phase2b_migration_shadow_[a-z0-9_]+$/u;

function isProductionEnvironment(env) {
  return String(env.NODE_ENV ?? "").toLowerCase() === "production"
    || env.VERCEL_ENV !== undefined
    || env.VERCEL !== undefined;
}

/** Validate before any database client is created; never logs credentials. */
export function assertSafeSeedDatabaseUrl(rawUrl, env = process.env) {
  if (isProductionEnvironment(env)) throw new Error("PRODUCTION_SEED_FORBIDDEN");
  if (typeof rawUrl !== "string" || rawUrl.length === 0) throw new Error("DATABASE_URL_MISSING");
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error("DATABASE_URL_INVALID"); }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") throw new Error("SEED_DATABASE_PROTOCOL_FORBIDDEN");
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error("SEED_DATABASE_HOST_FORBIDDEN");
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const shadowReplay = env.FIXOKU_SHADOW_REPLAY === "1" && SHADOW_DATABASE_PATTERN.test(database);
  if (!ALLOWED_DATABASES.has(database) && !shadowReplay) throw new Error("SEED_DATABASE_NAME_FORBIDDEN");
  return parsed;
}
