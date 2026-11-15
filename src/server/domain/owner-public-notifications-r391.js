import { createHash } from "node:crypto";
import pg from "../db/guarded-pg.js";
import { queueOwnerManagementEmail } from "./owner-management-notifications-r390.js";

// The original public SMTP delivery remains authoritative. A secondary
// queue failure must not cause the visitor to resend the original message.
export async function queueAcceptedPublicOwnerEmail(templateKey, metadata, messageId, env=process.env, logger=console) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") return false;
  let pool, client;
  try {
    if (!["owner-contact","owner-institution"].includes(templateKey) || !messageId) throw new Error("PUBLIC_OWNER_EVENT_ID_REQUIRED");
    const eventId=createHash("sha256").update(String(messageId)).digest("hex");
    pool=new pg.Pool({connectionString:env.DATABASE_URL});
    client=await pool.connect();
    await client.query("begin");
    const queued=await queueOwnerManagementEmail(client,{templateKey,eventId,metadata:{...metadata,reference:eventId,date:new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}).format(new Date())}},env);
    await client.query("commit");
    return queued;
  } catch {
    if (client) { try { await client.query("rollback"); } catch {} }
    logger.error?.("OWNER_PUBLIC_NOTIFICATION_QUEUE_FAILED", {templateKey});
    return false;
  } finally {
    client?.release();
    if (pool) { try { await pool.end(); } catch {} }
  }
}
