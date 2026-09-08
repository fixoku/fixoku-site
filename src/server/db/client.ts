import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as authSchema from "../auth/auth-schema";

export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  const pool = new Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
  return { pool, db: drizzle(pool, { schema: { ...schema, ...authSchema } }) };
}
