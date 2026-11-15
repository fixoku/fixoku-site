import { processOutboxBatch, getSmtpConfig } from "./email-outbox.js";
import { queueDailyOwnerSummary } from "./owner-daily-summary-r391.js";

export async function runOwnerEmailWorker({
  client,
  env = process.env,
  processor = processOutboxBatch,
  dailyProducer = queueDailyOwnerSummary,
  now = () => new Date()
} = {}) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") {
    return { status: "OWNER_NOTIFICATIONS_DISABLED", processed: 0 };
  }

  if (env.FIXOKU_OWNER_EMAIL_WORKER_ENABLED !== "1") {
    return { status: "OWNER_WORKER_DISABLED", processed: 0 };
  }

  if (env.FIXOKU_OWNER_NOTIFICATION_EMAIL !== "ersinusta@fixoku.com") {
    return { status: "OWNER_RECIPIENT_BLOCKED", processed: 0 };
  }

  const smtp = getSmtpConfig(env);

  if (
    smtp?.provider !== "SMTP" ||
    smtp.from !== "bildirim@fixoku.com" ||
    smtp.transport.auth.user !== "bildirim@fixoku.com" ||
    smtp.transport.host !== "mail.fixoku.com" ||
    smtp.transport.port !== 465 ||
    smtp.transport.secure !== true
  ) {
    return { status: "OWNER_SMTP_BLOCKED", processed: 0 };
  }

  if (!client || typeof client.query !== "function") {
    throw new Error("OWNER_WORKER_DATABASE_REQUIRED");
  }

  let dailySummary = "DISABLED";

  if (env.FIXOKU_OWNER_DAILY_SUMMARY_ENABLED === "1") {
    const cutoff = String(env.FIXOKU_OWNER_DAILY_START_DATE || "");

    if (!/^\d{4}-\d{2}-\d{2}$/u.test(cutoff)) {
      dailySummary = "START_DATE_REQUIRED";
    } else {
      try {
        await client.query("begin isolation level repeatable read");

        const day = (await client.query(`
          select ((now() at time zone 'Europe/Istanbul')::date - 1)::text as day
        `)).rows[0]?.day;

        if (!day || !/^\d{4}-\d{2}-\d{2}$/u.test(day)) {
          throw new Error("DAILY_REPORT_DATE_INVALID");
        }

        if (day < cutoff) {
          dailySummary = "BEFORE_START_DATE";
        } else {
          const key = "owner-management:owner-daily-summary:" + day;

          const existing = await client.query(`
            select 1
            from notification_email_outbox
            where dedupe_key=$1
            limit 1
          `, [key]);

          if (existing.rows.length) {
            dailySummary = "ALREADY_QUEUED";
          } else {
            const queued = await dailyProducer(client, env);

            if (queued !== true) {
              throw new Error("DAILY_REPORT_NOT_QUEUED");
            }

            dailySummary = "QUEUED";
          }
        }

        await client.query("commit");

      } catch (error) {
        await client.query("rollback");
        dailySummary = "REVIEW_REQUIRED";

        console.warn("FIXOKU_DAILY_REPORT_REVIEW", {
          code: /^[A-Z0-9_]+$/u.test(String(error?.code || ""))
            ? String(error.code)
            : "DAILY_REPORT_FAILED"
        });
      }
    }
  }

  const before = await client.query(`
    select status, count(*)::int as count
    from notification_email_outbox
    where dedupe_key like 'owner-management:%'
    and lower(recipient_email)='ersinusta@fixoku.com'
    group by status
    order by status
  `);

  const result = await processor({
    client,
    env,
    ownerOnly: true,
    limit: 5,
    now
  });

  const after = await client.query(`
    select status, count(*)::int as count
    from notification_email_outbox
    where dedupe_key like 'owner-management:%'
    and lower(recipient_email)='ersinusta@fixoku.com'
    group by status
    order by status
  `);

  const review = await client.query(`
    select count(*)::int as count
    from notification_email_outbox
    where dedupe_key like 'owner-management:%'
    and lower(recipient_email)='ersinusta@fixoku.com'
    and (
      (status='PROCESSING'
        and processing_started_at < $1::timestamptz - interval '15 minutes')
      or (
        status='FAILED'
        and last_error like 'OWNER_DELIVERY_REVIEW_REQUIRED:%'
      )
    )
  `, [now()]);

  return {
    status: result.status,
    processed: result.processed,
    dailySummary,
    before: before.rows,
    after: after.rows,
    reviewRequired: Number(review.rows[0]?.count || 0)
  };
}