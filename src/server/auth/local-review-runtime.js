/* global process */

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const OWNER_LOCAL_ORIGIN = "http://127.0.0.1:5173";
const OWNER_LOCAL_DATABASE = "fixoku_owner_local";
const OWNER_LOCAL_PORT = "55432";

function productionLike(env) {
  return env.NODE_ENV === "production" || env.VERCEL === "1" || String(env.VERCEL_ENV || "").toLowerCase() === "production";
}

function loopbackDatabase(env) {
  try {
    const database = new URL(String(env.DATABASE_URL || ""));
    return ["postgres:", "postgresql:"].includes(database.protocol)
      && LOOPBACK_HOSTS.has(database.hostname.toLowerCase())
      && database.pathname.length > 1;
  } catch {
    return false;
  }
}

export function localReviewRuntimeAllowed(env = process.env) {
  if (productionLike(env) || env.LOCAL_REVIEW_MODE !== "1") return false;
  const origin = String(env.FIXOKU_LOCAL_ORIGIN || env.APP_ORIGIN || env.BETTER_AUTH_URL || "").trim().replace(/\/$/u, "");
  return origin === OWNER_LOCAL_ORIGIN && loopbackDatabase(env);
}

export function ownerLocalFixtureAllowed(env = process.env) {
  if (!localReviewRuntimeAllowed(env) || env.FIXOKU_LOCAL_OWNER_REVIEW !== "1") return false;
  if (!String(env.FIXOKU_LOCAL_OWNER_EMAIL || "").trim() || !String(env.FIXOKU_LOCAL_OWNER_PASSWORD || "")) return false;
  try {
    const database = new URL(String(env.DATABASE_URL || ""));
    const testDatabase = new URL(String(env.TEST_DATABASE_URL || ""));
    return database.hostname.toLowerCase() === "127.0.0.1"
      && database.port === OWNER_LOCAL_PORT
      && database.pathname === `/${OWNER_LOCAL_DATABASE}`
      && testDatabase.toString() === database.toString();
  } catch {
    return false;
  }
}

export const OWNER_LOCAL_REVIEW_ORIGIN = OWNER_LOCAL_ORIGIN;
