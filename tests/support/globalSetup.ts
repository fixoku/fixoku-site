import { readFileSync } from "node:fs";
import pg from "pg";

function localEnv(name: string) {
  const value = process.env[name];
  if (value) return value;
  const match = readFileSync(".env.local", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1];
}

export default async function globalSetup() {
  const url = localEnv("DATABASE_URL");
  if (!url) return;
  const parsed = new URL(url);
  if (!(parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") || !["fixoku_platform_dev", "fixoku_platform_test"].includes(parsed.pathname.slice(1))) return;
  const pool = new pg.Pool({ connectionString: url });
  await pool.query("delete from rate_limit");
  await pool.end();
}
