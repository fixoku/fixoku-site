import process from "node:process";
import pg from "pg";
import { assertSafeDatabaseUrl } from "./runtime-guard.js";

function guardedConfig(config) {
  if (
    process.env.VERCEL_ENV === "production" ||
    (process.env.VERCEL_ENV === "preview" && (process.env.VERCEL_GIT_COMMIT_REF === "codex/fixoku-r404-development" || process.env.VERCEL_GIT_COMMIT_REF === "codex/fixoku-r405-staging-20261119")) ||
    (process.env.VERCEL === "1" && process.env.NODE_ENV === "production")
  ) {
    if (config && typeof config === "object") {
      const allowed = new Set([
        "connectionString",
        "max",
        "min",
        "connectionTimeoutMillis",
        "idleTimeoutMillis",
        "maxLifetimeSeconds",
        "maxUses",
        "allowExitOnIdle",
        "statement_timeout",
        "query_timeout",
        "application_name"
      ]);

      const proto = Object.getPrototypeOf(config);
      if (proto !== Object.prototype && proto !== null) {
        throw new Error("DATABASE_PRODUCTION_CONFIG_OVERRIDE_BLOCKED");
      }

      for (const key of Reflect.ownKeys(config)) {
        const descriptor = Object.getOwnPropertyDescriptor(config,key);
        if (
          typeof key !== "string" ||
          !allowed.has(key) ||
          !Object.hasOwn(descriptor,"value")
        ) {
          throw new Error("DATABASE_PRODUCTION_CONFIG_OVERRIDE_BLOCKED");
        }
      }

      config = Object.assign(Object.create(null),config);
    }
  }
  if (typeof config === "string") return assertSafeDatabaseUrl(config);
  if (!config || typeof config !== "object") {
    assertSafeDatabaseUrl("");
  }
  return {
    ...config,
    connectionString: assertSafeDatabaseUrl(config.connectionString),
  };
}

export class GuardedPool extends pg.Pool {
  constructor(config) {
    super(guardedConfig(config));
  }
}

export class GuardedClient extends pg.Client {
  constructor(config) {
    super(guardedConfig(config));
  }
}

export { GuardedPool as Pool, GuardedClient as Client };
export default { ...pg, Pool: GuardedPool, Client: GuardedClient };

