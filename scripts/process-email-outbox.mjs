import pg from "pg";
import { processOutboxBatch } from "../src/server/domain/email-outbox.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  const result = await processOutboxBatch({ client });
  console.log(JSON.stringify({ EMAIL_OUTBOX_RUNTIME: result.status, processed: result.processed }));
} finally {
  client.release();
  await pool.end();
}
