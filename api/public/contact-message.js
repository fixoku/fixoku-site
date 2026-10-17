/* Fixoku public contact email endpoint. Disabled until server SMTP and Turnstile are configured. */
import nodemailer from "nodemailer";
import { getSmtpConfig } from "../../src/server/domain/email-outbox.js";

const RECIPIENT = "destek@fixoku.com";
const SUBJECTS = new Set([
  "Öğrenci eğitimi hakkında bilgi almak istiyorum",
  "Fixoku eğitmeni olmak istiyorum",
  "Kurum / okul iş birliği hakkında görüşmek istiyorum",
  "Yazılım kullanımı hakkında destek istiyorum",
]);
const json = (res, code, data) => res.status(code).setHeader("Cache-Control", "no-store").json(data);
const clean = (s, max) => typeof s === "string" ? s.trim().slice(0, max + 1) : "";
const safeText = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(s) && s.length <= 254;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  if (process.env.FIXOKU_CONTACT_MAIL_ENABLED !== "1") {
    return json(res, 503, { ok: false, error: "MAIL_NOT_CONFIGURED" });
  }
  const host = String(req.headers.host || "");
  const origin = String(req.headers.origin || "");
  const allowedOrigin = String(process.env.FIXOKU_CONTACT_ALLOWED_ORIGIN || "").replace(/\/$/u, "");
  let originValid = false;
  try {
    const parsed = new URL(origin);
    originValid = allowedOrigin
      ? origin === allowedOrigin
      : (parsed.host === host && parsed.protocol === "https:");
  } catch { /* Request without acceptable Origin is not allowed. */ }
  if (!originValid || !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(String(req.headers["content-type"] || ""))) {
    return json(res, 403, { ok: false, error: "REQUEST_REJECTED" });
  }
  const declaredLength = Number(req.headers["content-length"] || 0);
  if (!Number.isFinite(declaredLength) || declaredLength > 10000) {
    return json(res, 413, { ok: false, error: "PAYLOAD_TOO_LARGE" });
  }
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(res, 400, { ok: false, error: "INVALID_BODY" });
  }
  if (clean(body.website, 300)) return json(res, 400, { ok: false, error: "REQUEST_REJECTED" });
  const fullName = clean(body.fullName, 100);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 20).replace(/\D/gu, "");
  const subject = clean(body.subject, 150);
  const message = clean(body.message, 1500);
  if (fullName.length < 2 || fullName.length > 100 || !validEmail(email)
    || (phone && !/^0\d{10}$/u.test(phone))
    || (subject && !SUBJECTS.has(subject)) || message.length < 5 || message.length > 1500) {
    return json(res, 400, { ok: false, error: "VALIDATION_FAILED" });
  }
  const secret = process.env.FIXOKU_CONTACT_TURNSTILE_SECRET;
  const token = clean(body.captchaToken, 2048);
  if (!secret || !token || token.length < 10) {
    return json(res, 503, { ok: false, error: "CAPTCHA_NOT_CONFIGURED" });
  }
  try {
    const cf = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const verified = cf.ok ? await cf.json() : {};
    if (verified.success !== true || verified.action !== "contact") {
      return json(res, 400, { ok: false, error: "CAPTCHA_FAILED" });
    }
    const expectedHostname = String(process.env.FIXOKU_CONTACT_TURNSTILE_HOSTNAME || new URL(origin).hostname);
    if (verified.hostname !== expectedHostname) {
      return json(res, 400, { ok: false, error: "CAPTCHA_HOST_MISMATCH" });
    }
  } catch {
    return json(res, 503, { ok: false, error: "CAPTCHA_UNAVAILABLE" });
  }
  const smtp = getSmtpConfig(process.env);
  if (!smtp || smtp.provider !== "SMTP" || !smtp.from || !smtp.transport) {
    return json(res, 503, { ok: false, error: "SMTP_NOT_CONFIGURED" });
  }
  const transport = nodemailer.createTransport({
    ...smtp.transport, logger: false, debug: false,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  try {
    const mailInfo = await transport.sendMail({
      from: smtp.from,
      to: RECIPIENT,
      replyTo: email,
      subject: "[Fixoku İletişim] Yeni ziyaretçi mesajı",
      text: [
        "Fixoku iletişim sayfasından yeni destek talebi:", "",
        `Ad Soyad: ${safeText(fullName)}`,
        `Telefon: ${phone || "Belirtilmedi"}`,
        `E-posta: ${safeText(email)}`,
        `Konu: ${safeText(subject) || "Belirtilmedi"}`,
        "Mesaj:", safeText(message), "",
        "Kaynak: /iletisim",
      ].join("\n"),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const accepted = Array.isArray(mailInfo?.accepted) && mailInfo.accepted.some((v) => String(v).toLowerCase() === RECIPIENT);
    const rejected = Array.isArray(mailInfo?.rejected) && mailInfo.rejected.some((v) => String(v).toLowerCase() === RECIPIENT);
    if (!accepted || rejected) return json(res, 502, { ok: false, error: "MAIL_NOT_CONFIRMED" });
    return json(res, 200, { ok: true, status: "SMTP_ACCEPTED" });
  } catch {
    return json(res, 502, { ok: false, error: "SMTP_OUTCOME_UNKNOWN" });
  } finally {
    try { transport.close(); } catch { /* Suppress transport shutdown errors. */ }
  }
}
