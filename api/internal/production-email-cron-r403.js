import crypto from "node:crypto";
import pg from "../../src/server/db/guarded-pg.js";
import {
  getSmtpConfig,
  processOutboxBatch
} from "../../src/server/domain/email-outbox.js";
import {
  runOwnerEmailWorker
} from "../../src/server/domain/owner-email-worker-r394.js";

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function authorized(req, env) {
  const secret = String(env.CRON_SECRET || "");
  if (secret.length < 32) return false;

  const actual = Buffer.from(
    String(req.headers?.authorization || "")
  );

  const expected = Buffer.from("Bearer " + secret);

  return actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected);
}

export function createProductionEmailCron({
  env = process.env,
  poolFactory = connectionString => new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5000
  }),
  generalWorker = processOutboxBatch,
  ownerWorker = runOwnerEmailWorker
} = {}) {
  return async function handler(req, res) {
    if (req.method !== "GET") {
      return reply(res, 405, {
        status:"METHOD_NOT_ALLOWED"
      });
    }

    if (
      env.VERCEL !== "1" ||
      env.VERCEL_ENV !== "production"
    ) {
      return reply(res, 403, {
        status:"PRODUCTION_ONLY"
      });
    }

    if (!authorized(req, env)) {
      return reply(res, 401, {
        status:"UNAUTHORIZED"
      });
    }

    if (
      env.FIXOKU_PRODUCTION_EMAIL_CRON_ENABLED !== "1"
    ) {
      return reply(res, 200, {
        status:"DISABLED"
      });
    }

    const smtp = getSmtpConfig(env);

    if (
      smtp?.provider !== "SMTP" ||
      smtp.from !== "bildirim@fixoku.com" ||
      smtp.transport?.auth?.user !== "bildirim@fixoku.com" ||
      smtp.transport?.host !== "mail.fixoku.com" ||
      smtp.transport?.port !== 465 ||
      smtp.transport?.secure !== true
    ) {
      return reply(res, 503, {
        status:"SMTP_BLOCKED"
      });
    }

    let pool;
    let client;
    let locked = false;

    try {
      const directUrl = String(env.DATABASE_URL_UNPOOLED || "");

      try {
        const target = new URL(directUrl);
        if (
          !["postgres:", "postgresql:"].includes(target.protocol) ||
          !/^ep-[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech$/u.test(target.hostname) ||
          target.hostname.includes("-pooler.") ||
          !target.username ||
          !target.password ||
          !["require","verify-ca","verify-full"].includes(target.searchParams.get("sslmode"))
        ) {
          throw new Error("DIRECT_DATABASE_REQUIRED");
        }
      } catch {
        return reply(res,503,{status:"DIRECT_DATABASE_REQUIRED"});
      }

      pool = poolFactory(directUrl);
      client = await pool.connect();

      const lock = await client.query(
        "select pg_try_advisory_lock(hashtext('fixoku-production-email-cron-r403')) as locked"
      );

      locked = lock.rows[0]?.locked === true;

      if (!locked) {
        return reply(res, 200, {
          status:"ALREADY_RUNNING"
        });
      }

      const owner = await ownerWorker({
        client,
        env
      });

      const general = await generalWorker({
        client,
        env,
        ownerOnly:false,
        limit:5
      });

      if (
        ["REVIEW_REQUIRED","START_DATE_REQUIRED"].includes(owner.dailySummary) ||
        Number(owner.reviewRequired || 0) > 0
      ) {
        return reply(res, 503, {
          status:"REVIEW_REQUIRED"
        });
      }

      return reply(res, 200, {
        status:"COMPLETED",
        ownerStatus:owner.status,
        generalStatus:general.status,
        ownerProcessed:Number(owner.processed || 0),
        generalProcessed:Number(general.processed || 0),
        dailySummary:owner.dailySummary || "DISABLED"
      });

    } catch {
      return reply(res, 503, {
        status:"EMAIL_JOB_FAILED"
      });

    } finally {
      if (client) {
        let destroy = false;

        if (locked) {
          try {
            await client.query(
              "select pg_advisory_unlock(hashtext('fixoku-production-email-cron-r403'))"
            );
          } catch {
            destroy = true;
          }
        }

        client.release(destroy);
      }

      if (pool) await pool.end();
    }
  };
}

export default createProductionEmailCron();