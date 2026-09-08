/* global process */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as appSchema from "./schema.js";
import * as authSchema from "../auth/auth-schema.js";

export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  const pool = new Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
  return { pool, db: drizzle(pool, { schema: { ...appSchema, ...authSchema } }) };
}
