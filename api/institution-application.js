import nodemailer from "nodemailer";
import { SITE_ORIGIN } from "../src/config/site.js";
import {
  INSTITUTION_READING_LANDING_PATH,
  institutionTypeOptions,
} from "../src/data/institutionReadingLanding.js";
import { cleanPreviewGateResponse } from "../src/server/auth/preview-contract.js";

export const INSTITUTION_APPLICATION_RECIPIENT = "info@fixoku.com";
export const FORM_RATE_LIMIT_STATUS = "BEST_EFFORT_INSTANCE_LOCAL";

const BODY_LIMIT_BYTES = 24 * 1024;
const MINIMUM_FILL_TIME_MS = 3000;
const MAXIMUM_FILL_TIME_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const productionUrl = new URL(SITE_ORIGIN);
const wwwProductionUrl = new URL(SITE_ORIGIN);
if (!wwwProductionUrl.hostname.startsWith("www.")) {
  wwwProductionUrl.hostname = `www.${wwwProductionUrl.hostname}`;
}

const allowedOrigins = new Set([
  productionUrl.origin,
  wwwProductionUrl.origin,
  "http://localhost:5173",
  "http://localhost:5174",
]);

class RequestError extends Error {
  constructor(statusCode, publicMessage) {
    super(publicMessage);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

function getHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  if (request.body !== undefined) {
    const source = Buffer.isBuffer(request.body)
      ? request.body.toString("utf8")
      : typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body);

    if (Buffer.byteLength(source, "utf8") > BODY_LIMIT_BYTES) {
      throw new RequestError(413, "İstek boyutu sınırı aşıldı.");
    }

    if (typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
      return request.body;
    }

    try {
      return JSON.parse(source);
    } catch {
      throw new RequestError(400, "Form bilgileri doğrulanamadı.");
    }
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > BODY_LIMIT_BYTES) {
      throw new RequestError(413, "İstek boyutu sınırı aşıldı.");
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }
}

function hasHeaderInjection(value) {
  return /[\r\n]/u.test(String(value ?? ""));
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validatePayload(body, currentTime) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }

  if (cleanText(body.website)) {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }

  const startedAt = Number(body.startedAt);
  const elapsed = currentTime - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < MINIMUM_FILL_TIME_MS || elapsed > MAXIMUM_FILL_TIME_MS) {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }

  const payload = {
    fullName: cleanText(body.fullName),
    institutionName: cleanText(body.institutionName),
    email: cleanText(body.email).toLowerCase(),
    phone: cleanText(body.phone),
    city: cleanText(body.city),
    district: cleanText(body.district),
    institutionType: cleanText(body.institutionType),
    studentCount: Number(body.studentCount),
    message: cleanText(body.message),
    consent: body.consent === true,
    route: cleanText(body.route),
  };

  const boundedFields = [
    [payload.fullName, 2, 100],
    [payload.institutionName, 2, 140],
    [payload.email, 6, 160],
    [payload.phone, 7, 24],
    [payload.city, 2, 80],
    [payload.district, 2, 80],
    [payload.message, 10, 2000],
  ];
  if (boundedFields.some(([value, minimum, maximum]) => value.length < minimum || value.length > maximum)) {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }

  if (
    [payload.fullName, payload.institutionName, payload.email].some(hasHeaderInjection) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(payload.email) ||
    !/^[0-9+()\s.-]{7,24}$/u.test(payload.phone) ||
    !institutionTypeOptions.includes(payload.institutionType) ||
    !Number.isInteger(payload.studentCount) ||
    payload.studentCount < 0 ||
    payload.studentCount > 100000 ||
    !payload.consent ||
    payload.route !== INSTITUTION_READING_LANDING_PATH
  ) {
    throw new RequestError(400, "Form bilgileri doğrulanamadı.");
  }

  return payload;
}

function getClientIp(request) {
  const forwarded = getHeader(request, "x-forwarded-for");
  return cleanText(forwarded?.split(",")[0] || request.socket?.remoteAddress || "unknown");
}

function enforceRateLimit(store, key, currentTime) {
  for (const [storedKey, value] of store) {
    if (currentTime - value.windowStartedAt >= RATE_LIMIT_WINDOW_MS) store.delete(storedKey);
  }

  const current = store.get(key);
  if (!current || currentTime - current.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    store.set(key, { count: 1, windowStartedAt: currentTime });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new RequestError(429, "Kısa sürede çok sayıda başvuru denemesi yapıldı.");
  }

  current.count += 1;
}

function getSmtpConfiguration(env) {
  const host = cleanText(env.SMTP_HOST);
  const port = Number(env.SMTP_PORT);
  const secureValue = cleanText(env.SMTP_SECURE).toLowerCase();
  const user = cleanText(env.SMTP_USER);
  const pass = cleanText(env.SMTP_PASS);
  const from = cleanText(env.MAIL_FROM);

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !["true", "false"].includes(secureValue) ||
    !user ||
    !pass ||
    !from ||
    hasHeaderInjection(from)
  ) {
    return null;
  }

  return {
    from,
    transport: {
      host,
      port,
      secure: secureValue === "true",
      auth: { user, pass },
    },
  };
}

function buildMail(payload, from) {
  const subjectInstitution = payload.institutionName.replace(/\s+/gu, " ").slice(0, 120);
  const rows = [
    ["Ad Soyad", payload.fullName],
    ["Kurum Adı", payload.institutionName],
    ["E-posta", payload.email],
    ["Telefon", payload.phone],
    ["İl", payload.city],
    ["İlçe", payload.district],
    ["Kurum Türü", payload.institutionType],
    ["Yaklaşık Öğrenci Sayısı", String(payload.studentCount)],
    ["Mesaj", payload.message],
    ["Aydınlatma Onayı", "Evet"],
    ["Başvuru Route", payload.route],
  ];

  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows.map(([label, value]) => (
    `<tr><th align="left" style="padding:8px;border:1px solid #e6dbea">${escapeHtml(label)}</th>` +
    `<td style="padding:8px;border:1px solid #e6dbea">${escapeHtml(value).replaceAll("\n", "<br>")}</td></tr>`
  )).join("");

  return {
    from,
    to: INSTITUTION_APPLICATION_RECIPIENT,
    replyTo: payload.email,
    subject: `Fixoku Kurum Başvurusu — ${subjectInstitution}`,
    text,
    html: `<table style="border-collapse:collapse;font-family:Arial,sans-serif">${htmlRows}</table>`,
  };
}

export function createInstitutionApplicationHandler({
  env = process.env,
  logger = console,
  now = () => Date.now(),
  rateLimitStore = new Map(),
  transportFactory = (configuration) => nodemailer.createTransport(configuration),
} = {}) {
  return async function institutionApplicationHandler(request, response) {
    if (!cleanPreviewGateResponse(response, env)) return;
    try {
      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { ok: false, error: "Yalnızca POST isteği kabul edilir." });
        return;
      }

      const origin = cleanText(getHeader(request, "origin"));
      if (!allowedOrigins.has(origin)) {
        sendJson(response, 403, { ok: false, error: "İstek kaynağı doğrulanamadı." });
        return;
      }

      const contentType = cleanText(getHeader(request, "content-type")).toLowerCase();
      if (!contentType.startsWith("application/json")) {
        sendJson(response, 400, { ok: false, error: "Form bilgileri doğrulanamadı." });
        return;
      }

      const currentTime = now();
      const body = await readRequestBody(request);
      const payload = validatePayload(body, currentTime);
      enforceRateLimit(rateLimitStore, getClientIp(request), currentTime);

      const smtp = getSmtpConfiguration(env);
      if (!smtp) {
        sendJson(response, 503, { ok: false, error: "Başvuru servisi henüz yapılandırılmamış." });
        return;
      }

      try {
        const transport = transportFactory(smtp.transport);
        await transport.sendMail(buildMail(payload, smtp.from));
      } catch {
        logger.error?.("Institution application delivery failed.");
        sendJson(response, 502, { ok: false, error: "Başvuru şu anda iletilemedi." });
        return;
      }

      sendJson(response, 200, { ok: true });
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.statusCode, { ok: false, error: error.publicMessage });
        return;
      }

      logger.error?.("Institution application request failed.");
      sendJson(response, 500, { ok: false, error: "Başvuru şu anda işlenemedi." });
    }
  };
}

export default createInstitutionApplicationHandler();
