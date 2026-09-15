/* global process */
import nodemailer from "nodemailer";
import { renderEmailForEvent } from "./email-renderer.js";

const RETRYABLE_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "SMTP_CONNECTION"]);

export function getSmtpConfig(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || "").trim().toUpperCase();
  const testMode = provider === "TEST" || String(env.EMAIL_TEST_MODE || "") === "1";
  if (provider === "DISABLED") return null;
  if (testMode) return { provider: "TEST", from: String(env.SMTP_FROM || env.MAIL_FROM || "fixoku-local@invalid.test").trim(), transport: { streamTransport: true, buffer: true, newline: "unix" } };
  const host = String(env.SMTP_HOST || "").trim();
  const port = Number(env.SMTP_PORT || 0);
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || env.SMTP_PASSWORD || "");
  const from = String(env.MAIL_FROM || env.SMTP_FROM || "").trim();
  const secure = String(env.SMTP_SECURE || "false").toLowerCase();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || !["true", "false"].includes(secure) || /[\r\n]/u.test(from)) return null;
  return { provider: "SMTP", from, transport: { host, port, secure: secure === "true", auth: { user, pass } } };
}

export function classifyEmailError(error) {
  const code = String(error?.code || error?.responseCode || "EMAIL_DELIVERY_FAILED").toUpperCase();
  const retryable = RETRYABLE_CODES.has(code) || Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 500;
  return { code, retryable };
}

export async function processOutboxBatch({ client, env = process.env, transportFactory = (config) => nodemailer.createTransport(config), now = () => new Date(), maxAttempts = Number(env.EMAIL_OUTBOX_MAX_ATTEMPTS || 5), limit = 10, logger = console } = {}) {
  const smtp = getSmtpConfig(env);
  if (!smtp) return { status: "DISABLED_CONFIG_REQUIRED", processed: 0 };
  const transport = transportFactory(smtp.transport);
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const claimed = (await client.query(`update notification_email_outbox set status='PROCESSING',attempt_count=attempt_count+1,processing_started_at=$1,last_error=null where id=(select id from notification_email_outbox where (status in ('QUEUED','RETRYABLE') and (next_attempt_at is null or next_attempt_at<= $1) or status='PROCESSING' and processing_started_at < $1 - interval '15 minutes') order by created_at for update skip locked limit 1) returning *`, [now()])).rows[0];
    if (!claimed) break;
    processed += 1;
    try {
      const rendered = renderEmailForEvent(claimed.event_type, {
        recipientName: claimed.recipient_name || "Fixoku kullanıcısı",
        body: claimed.body,
        reference: claimed.reference || claimed.id,
        ctaPath: claimed.cta_path || "/panel/owner",
      }, { baseUrl: env.APP_ORIGIN || "https://fixoku.com", logoUrl: env.EMAIL_LOGO_URL || undefined });
      const info = await transport.sendMail({
        from: smtp.from || rendered.from,
        to: claimed.recipient_email,
        replyTo: rendered.replyTo,
        subject: claimed.subject || rendered.subject,
        text: rendered.text,
        html: rendered.html,
        headers: rendered.headers,
      });
      await client.query("update notification_email_outbox set status='SENT',sent_at=$1,provider_message_id=$2,processing_started_at=null,last_error=null where id=$3 and status='PROCESSING'", [now(), info?.messageId || null, claimed.id]);
    } catch (error) {
      const result = classifyEmailError(error);
      const terminal = !result.retryable || claimed.attempt_count >= maxAttempts;
      const next = terminal ? null : new Date(now().getTime() + Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(claimed.attempt_count, 8)));
      await client.query("update notification_email_outbox set status=$1,last_error=$2,next_attempt_at=$3,processing_started_at=null where id=$4 and status='PROCESSING'", [terminal ? "FAILED" : "RETRYABLE", result.code.slice(0, 500), next, claimed.id]);
      logger.error?.("Email outbox delivery failed", { id: claimed.id, code: result.code, retryable: result.retryable });
    }
  }
  return { status: "PROCESSED", processed };
}
