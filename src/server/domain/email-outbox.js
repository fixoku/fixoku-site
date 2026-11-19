/* global process */
import nodemailer from "nodemailer";
import { renderEmailForEvent, renderLifecycleEmail } from "./email-renderer.js";
import { requireApplicationOrigin } from "../auth/origin.js";
import { isTestEmailCaptureEnabled } from "./test-email-capture.js";

const RETRYABLE_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "SMTP_CONNECTION"]);
const defaultTransportFactory = (config) => nodemailer.createTransport(config);

export function getSmtpConfig(env = process.env) {
  const provider = String(env.EMAIL_PROVIDER || "").trim().toUpperCase();
  const testMode = provider === "TEST" || String(env.EMAIL_TEST_MODE || "") === "1";
  if (provider === "DISABLED") return null;
  if (testMode) return { provider: "TEST", from: String(env.SMTP_FROM || env.MAIL_FROM || "fixoku-local@invalid.test").trim(), transport: { streamTransport: true, buffer: true, newline: "unix" } };
  const host = String(env.SMTP_HOST || "").trim();
  const port = Number(env.SMTP_PORT || 0);
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || env.SMTP_PASSWORD || "");
  const from = String(env.MAIL_FROM || env.SMTP_FROM || "bildirim@fixoku.com").trim();
  const secure = String(env.SMTP_SECURE || "false").toLowerCase();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || !["true", "false"].includes(secure) || port === 465 && secure !== "true" || /[\r\n]/u.test(from)) return null;
  return { provider: "SMTP", from, transport: { host, port, secure: secure === "true", auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000 } };
}

export function getEmailTransportStatus(env = process.env) {
  const config = getSmtpConfig(env);
  if (!config) return { available: false, mode: "UNAVAILABLE", reason: "SMTP_NOT_CONFIGURED" };
  if (config.provider === "TEST" && !isTestEmailCaptureEnabled(env)) {
    return { available: false, mode: "TEST_UNCAPTURED", reason: "TEST_MAIL_SINK_NOT_CONFIGURED" };
  }
  return { available: true, mode: config.provider === "TEST" ? "TEST_CAPTURE" : "SMTP", reason: null };
}

export async function sendTransactionalEmail({ kind, to, url, recipientName, applicationField, env = process.env, transportFactory = defaultTransportFactory, logger = console } = {}) {
  const smtp = getSmtpConfig(env);
  if (!smtp) throw new Error("SMTP_NOT_CONFIGURED");
  if (smtp.provider === "TEST" && !isTestEmailCaptureEnabled(env) && transportFactory === defaultTransportFactory) throw new Error("TEST_MAIL_SINK_NOT_CONFIGURED");
  const renderOptions = { baseUrl: requireApplicationOrigin(env), logoUrl: env.EMAIL_LOGO_URL || undefined };
  const rendered = kind === "reset" || kind === "verification"
    ? renderLifecycleEmail(kind, { url, recipientName }, renderOptions)
    : renderEmailForEvent(kind, { recipientName, applicationField, ctaPath: url || undefined }, renderOptions);
  const info = await transportFactory(smtp.transport).sendMail({
    from: smtp.from,
    to: String(to || ""),
    replyTo: rendered.replyTo,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
  logger.info?.("Transactional email delivered", { kind, recipient: String(to || "").replace(/^(.{1,2}).*(@.*)$/u, "$1***$2"), messageId: info?.messageId || null });
  return { status: "SENT", messageId: info?.messageId || null };
}
export function classifyEmailError(error) {
  const code = String(error?.code || error?.responseCode || "EMAIL_DELIVERY_FAILED").toUpperCase();
  const retryable = RETRYABLE_CODES.has(code) || Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 500;
  return { code, retryable };
}

export async function processOutboxBatch({ client, env = process.env, transportFactory = defaultTransportFactory, now = () => new Date(), maxAttempts = Number(env.EMAIL_OUTBOX_MAX_ATTEMPTS || 5), limit = 10, logger = console, ownerOnly = false } = {}) {
  const smtp = getSmtpConfig(env);
  if (!smtp) return { status: "DISABLED_CONFIG_REQUIRED", processed: 0 };
  if (smtp.provider === "TEST" && !isTestEmailCaptureEnabled(env) && transportFactory === defaultTransportFactory) return { status: "TEST_MAIL_SINK_NOT_CONFIGURED", processed: 0 };
  if (ownerOnly && (
    env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1" ||
    String(env.FIXOKU_OWNER_NOTIFICATION_EMAIL || "").trim().toLowerCase() !== "ersinusta@fixoku.com"
  )) return { status: "OWNER_DELIVERY_DISABLED", processed: 0 };

  if (ownerOnly && smtp.provider !== "SMTP") {
    return { status: "OWNER_SMTP_REQUIRED", processed: 0 };
  }

  const ownerScope = `
    dedupe_key like 'owner-management:%'
    and lower(recipient_email)='ersinusta@fixoku.com'
    and recipient_user_id in (
      select u.id from platform_users u
      join platform_memberships m on m.user_id=u.id
      where lower(u.email)='ersin@fixoku.com'
        and u.email_verified=true
        and m.role='OWNER'
        and m.status='ACTIVE'
        and m.scope_type='GLOBAL'
        and m.scope_id is null
    )
    and `;
  const ownerStart = String(env.FIXOKU_OWNER_EMAIL_START_DATE || "").trim();
  if (ownerOnly && !/^\d{4}-\d{2}-\d{2}$/u.test(ownerStart)) return { status: "OWNER_START_DATE_REQUIRED", processed: 0 };
  const transport = transportFactory(smtp.transport);
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const claimed = (await client.query(`update notification_email_outbox set status='PROCESSING',attempt_count=attempt_count+1,processing_started_at=$1,last_error=null where id=(select id from notification_email_outbox where ${ownerOnly ? ownerScope + "created_at >= cast($2 as date) and " : "(dedupe_key is null or dedupe_key not like 'owner-management:%') and "}(status in ('QUEUED','RETRYABLE') and (next_attempt_at is null or next_attempt_at<= $1) ${ownerOnly ? "" : "or status='PROCESSING' and processing_started_at < $1::timestamptz - interval '15 minutes'"}) order by created_at for update skip locked limit 1) returning *`, ownerOnly ? [now(), ownerStart] : [now()])).rows[0];
    if (!claimed) break;
    processed += 1;
    try {
      const snapshot = claimed.render_snapshot_json && typeof claimed.render_snapshot_json === "object" ? claimed.render_snapshot_json : null;
      if (ownerOnly) {
        if (smtp.provider !== "SMTP") {
          throw new Error("OWNER_SMTP_REQUIRED");
        }
        if (String(claimed.recipient_email).toLowerCase() !== "ersinusta@fixoku.com") {
          throw new Error("OWNER_RECIPIENT_INVALID");
        }
        if (!snapshot?.html || !snapshot?.text || !snapshot?.subject) {
          throw new Error("OWNER_SNAPSHOT_REQUIRED");
        }
        if (snapshot.templateKey !== String(claimed.event_type).toLowerCase().replace(/_/gu, "-")) {
          throw new Error("OWNER_TEMPLATE_MISMATCH");
        }
        if ([snapshot.subject, snapshot.html, snapshot.text].some(value => /\{\{[^}]+\}\}/u.test(value))) {
          throw new Error("OWNER_SNAPSHOT_UNRESOLVED");
        }
      }
      // Legacy rows without a rendered snapshot must never invent a recipient.
      const recipientName = typeof claimed.recipient_name === "string" ? claimed.recipient_name.trim() : "";
      if (!(snapshot?.html && snapshot?.text) && (!recipientName || /^Fixoku\s+(?:müşterisi|kullanıcısı)$/iu.test(recipientName))) {
        throw Object.assign(new Error("EMAIL_RECIPIENT_NAME_REQUIRED"), { code: "EMAIL_RECIPIENT_NAME_REQUIRED" });
      }
      const rendered = snapshot?.html && snapshot?.text
        ? { subject: snapshot.subject || claimed.subject, text: snapshot.text, html: snapshot.html, replyTo: undefined, headers: undefined }
        : renderEmailForEvent(claimed.event_type, {
          recipientName,
          body: claimed.body,
          reference: claimed.id,
          amount: "—",
          packageName: "Fixoku eğitim paketi",
          programName: "Fixoku eğitimi",
          studentName: "Öğrenci",
          earningPeriod: "Fixoku dönemi",
          dueDate: new Date().toISOString().slice(0, 10),
          paymentDate: new Date().toISOString().slice(0, 10),
          completionDate: new Date().toISOString().slice(0, 10),
          sessionDate: new Date().toISOString().slice(0, 10),
          carrierName: "Fixoku taşıyıcı",
          trackingNumber: "KONTROL",
          deliveryDate: new Date().toISOString().slice(0, 10),
          shipmentStatus: "Güncellendi",
          institutionName: "Fixoku kurumu",
          qualificationName: "Fixoku yeterliliği",
          qualificationStatus: "Güncellendi",
          applicationField: claimed.body,
          actionUrl: "/panel/owner",
          ctaPath: "/panel/owner",
        }, { baseUrl: requireApplicationOrigin(env), logoUrl: env.EMAIL_LOGO_URL || undefined });
      const info = await transport.sendMail({
        from: smtp.from || rendered.from,
        to: claimed.recipient_email,
        replyTo: rendered.replyTo,
        subject: claimed.subject || rendered.subject,
        text: rendered.text,
        html: rendered.html,
        headers: rendered.headers,
        // Keep retries tied to one outbox identity. The unique dedupe_key
        // prevents duplicate queue rows; a stable Message-ID also gives an
        // SMTP provider a chance to collapse a retry after an unknown result.
        messageId: `<fixoku-outbox-${String(claimed.id).replace(/[^a-zA-Z0-9_-]/gu, "")}@fixoku.com>`,
      });
      if (ownerOnly && (
        !Array.isArray(info?.accepted) ||
        info.accepted.length !== 1 ||
        String(info.accepted[0]).toLowerCase() !== "ersinusta@fixoku.com" ||
        (info.rejected?.length || 0) !== 0
      )) {
        throw new Error("OWNER_SMTP_ACCEPTANCE_UNCONFIRMED");
      }
      await client.query("update notification_email_outbox set status='SENT',sent_at=$1,provider_message_id=$2,processing_started_at=null,last_error=null where id=$3 and status='PROCESSING'", [now(), info?.messageId || null, claimed.id]);
    } catch (error) {
      const result = classifyEmailError(error);
      const smtpExplicitTemporaryRejection =
        Number(error?.responseCode) >= 400 &&
        Number(error?.responseCode) < 500;

      const ownerUncertainDelivery =
        ownerOnly && !smtpExplicitTemporaryRejection &&
        (result.retryable || error?.message === "OWNER_SMTP_ACCEPTANCE_UNCONFIRMED");

      const terminal = ownerUncertainDelivery ||
        !result.retryable ||
        claimed.attempt_count >= maxAttempts;
      const next = terminal ? null : new Date(now().getTime() + Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(claimed.attempt_count, 8)));
      await client.query("update notification_email_outbox set status=$1,last_error=$2,next_attempt_at=$3,processing_started_at=null where id=$4 and status='PROCESSING'", [terminal ? "FAILED" : "RETRYABLE", (ownerUncertainDelivery ? "OWNER_DELIVERY_REVIEW_REQUIRED:" + result.code : result.code).slice(0, 500), next, claimed.id]);
      logger.error?.("Email outbox delivery failed", { id: claimed.id, code: result.code, retryable: result.retryable });
    }
  }
  return { status: "PROCESSED", processed };
}
