import pg from "pg";
import { assertSafeDatabaseUrl } from "./runtime-guard.js";

function guardedConfig(config) {
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

