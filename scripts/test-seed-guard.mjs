import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeSeedDatabaseUrl } from "./local-test-guard.mjs";

const baseEnv = { NODE_ENV: "test" };

test("accepts only loopback PostgreSQL Fixoku databases", () => {
  for (const name of ["fixoku_platform_dev", "fixoku_platform_test"]) {
    const parsed = assertSafeSeedDatabaseUrl(`postgresql://seed:placeholder@127.0.0.1:5433/${name}`, baseEnv);
    assert.equal(parsed.hostname, "127.0.0.1");
    assert.equal(parsed.pathname, `/${name}`);
  }
});

test("rejects production environment before any connection", () => {
  const url = "postgresql://seed:placeholder@127.0.0.1:5433/fixoku_platform_dev";
  assert.throws(() => assertSafeSeedDatabaseUrl(url, { NODE_ENV: "production" }), { message: "PRODUCTION_SEED_FORBIDDEN" });
  assert.throws(() => assertSafeSeedDatabaseUrl(url, { NODE_ENV: "test", VERCEL_ENV: "preview" }), { message: "PRODUCTION_SEED_FORBIDDEN" });
  assert.throws(() => assertSafeSeedDatabaseUrl(url, { NODE_ENV: "test", VERCEL: "1" }), { message: "PRODUCTION_SEED_FORBIDDEN" });
});

test("rejects non-loopback hosts and unapproved database names", () => {
  assert.throws(() => assertSafeSeedDatabaseUrl("postgresql://seed:placeholder@example.com:5432/fixoku_platform_dev", baseEnv), { message: "SEED_DATABASE_HOST_FORBIDDEN" });
  assert.throws(() => assertSafeSeedDatabaseUrl("postgresql://seed:placeholder@127.0.0.1:5433/postgres", baseEnv), { message: "SEED_DATABASE_NAME_FORBIDDEN" });
});

test("shadow replay requires both the explicit flag and a matching loopback name", () => {
  const shadow = "postgresql://seed:placeholder@127.0.0.1:5433/fixoku_phase2b_migration_shadow_20260912";
  assert.throws(() => assertSafeSeedDatabaseUrl(shadow, baseEnv), { message: "SEED_DATABASE_NAME_FORBIDDEN" });
  const parsed = assertSafeSeedDatabaseUrl(shadow, { ...baseEnv, FIXOKU_SHADOW_REPLAY: "1" });
  assert.equal(parsed.pathname, "/fixoku_phase2b_migration_shadow_20260912");
  assert.throws(() => assertSafeSeedDatabaseUrl("postgresql://seed:placeholder@127.0.0.1:5433/fixoku_phase2b_migration_shadow", { ...baseEnv, FIXOKU_SHADOW_REPLAY: "1" }), { message: "SEED_DATABASE_NAME_FORBIDDEN" });
  assert.throws(() => assertSafeSeedDatabaseUrl("postgresql://seed:placeholder@example.com:5432/fixoku_phase2b_migration_shadow_20260912", { ...baseEnv, FIXOKU_SHADOW_REPLAY: "1" }), { message: "SEED_DATABASE_HOST_FORBIDDEN" });
});

test("rejects non-PostgreSQL and malformed URLs", () => {
  assert.throws(() => assertSafeSeedDatabaseUrl("mysql://seed:placeholder@127.0.0.1:3306/fixoku_platform_dev", baseEnv), { message: "SEED_DATABASE_PROTOCOL_FORBIDDEN" });
  assert.throws(() => assertSafeSeedDatabaseUrl("not-a-url", baseEnv), { message: "DATABASE_URL_INVALID" });
  assert.throws(() => assertSafeSeedDatabaseUrl(undefined, baseEnv), { message: "DATABASE_URL_MISSING" });
});
