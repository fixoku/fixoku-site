/* global process */
import { createHash } from "node:crypto";
import { EMAIL_EDITORIAL_V1 } from "./email-editorial-v1.js";
import { EMAIL_TEMPLATE_CATALOG, escapeHtml, renderEmail } from "./email-renderer.js";

const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_SUBJECT = 240;
const MAX_BODY = 20_000;
const CRITICAL_KEYS = new Set(["email-verification", "password-reset"]);
const ALLOWED_VARIABLES = Object.freeze([
  "recipientName", "packageName", "orderNumber", "reference", "amount", "paymentMethod",
  "programName", "trainerName", "studentName", "date", "completionDate", "earningPeriod",
  "dueDate", "paymentDate", "sessionDate", "applicationField", "qualificationName",
  "qualificationStatus", "carrierName", "trackingNumber", "deliveryDate", "shipmentStatus",
  "campaignTitle", "actionUrl", "ctaPath", "supportEmail",
]);
const VARIABLE_SET = new Set(ALLOWED_VARIABLES);

// Event names are domain contracts. Several operational events intentionally
// share an existing canonical template so the renderer remains one catalog.
export const EMAIL_EVENT_TEMPLATE_MAP = Object.freeze({
  ACCOUNT_EMAIL_VERIFICATION: "email-verification",
  ACCOUNT_PASSWORD_RESET: "password-reset",
  ACCOUNT_ACTIVATION: "welcome",
  STUDENT_REGISTRATION_WELCOME: "welcome",
  STUDENT_REGISTRATION_RECEIVED: "welcome",
  STUDENT_ORDER_RECEIVED: "order-received",
  STUDENT_PAYMENT_SUCCESSFUL: "payment-successful",
  STUDENT_PAYMENT_SUCCEEDED: "payment-successful",
  OWNER_PAYMENT_APPROVED: "payment-successful",
  OWNER_TRAINER_PAYMENT_APPROVED: "payment-successful",
  STUDENT_TRAINER_ASSIGNMENT: "trainer-assigned",
  STUDENT_TRAINING_COMPLETION: "education-completed",
  STUDENT_SHIPMENT: "shipment-shipped",
  TRAINER_APPLICATION_RECEIVED: "trainer-application-received",
  TRAINER_APPLICATION_APPROVED: "trainer-qualification-approved",
  TRAINER_APPLICATION_REJECTED: "trainer-qualification-suspended",
  TRAINER_STUDENT_ASSIGNED: "trainer-assigned",
  TRAINER_ASSIGNMENT: "trainer-assigned",
  TRAINER_REASSIGNMENT: "trainer-reassigned",
  TRAINER_EARNING: "earning-created",
  TRAINER_EARNING_CREATED: "earning-created",
  TRAINER_PACKAGE_ACTIVATED: "package-activated",
  TRAINER_EXPERTISE_ACTIVATED: "trainer-qualification-approved",
  TRAINER_PAYOUT_PAID: "payout-completed",
  TRAINER_PAYOUT_RECONCILED: "payout-completed",
  TRAINER_BANK_TRANSFER_ORDER: "order-received",
  EDUCATION_ENTITLEMENT_ACTIVATED: "package-activated",
  EDUCATION_COMPLETED: "education-completed",
  ENTITLEMENTS_REVOKED: "payment-failed",
  ORDER_REFUNDED: "order-received",
  REFUND_COMPLETED: "order-received",
  OWNER_APPROVED: "payment-successful",
  PROVIDER_VERIFIED: "payment-successful",
  PAYOUT_RECONCILED: "payout-completed",
  REJECTED: "payment-failed",
  REQUESTED: "order-received",
  TRAINER_INVITATION: "trainer-welcome",
  ADMIN_INVITATION: "welcome",
  TRAINING_REVIEW_SUBMITTED: "support-request-received",
  R6_TRAINING_COMPLETED: "education-completed",
  R6_CUSTOM_OFFER_SENT: "order-received",
});

const catalogById = new Map(EMAIL_TEMPLATE_CATALOG.map((template) => [template.id, template]));

function stringValue(value) { return value == null ? "" : String(value); }
function normalizeKey(value) {
  const key = stringValue(value).trim().toLowerCase();
  if (!KEY_RE.test(key)) throw Object.assign(new Error("EMAIL_TEMPLATE_KEY_INVALID"), { code: "EMAIL_TEMPLATE_KEY_INVALID", status: 400 });
  return key;
}
function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }); }

function safeHref(value) {
  const raw = stringValue(value).trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, "https://fixoku.com");
    if (!(["https:", "http:"].includes(url.protocol) && url.origin === "https://fixoku.com")) return null;
    return url.toString();
  } catch { return null; }
}

/** Strip executable markup and unsafe links while keeping the small editorial subset. */
export function sanitizeEmailHtml(value) {
  let html = stringValue(value).slice(0, MAX_BODY);
  if (/<script|<iframe|<object|<embed|javascript\s*:/iu.test(html)) fail("EMAIL_TEMPLATE_HTML_UNSAFE");
  html = html.replace(/<!--([\s\S]*?)-->/gu, "");
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "");
  html = html.replace(/\s+(?:style|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "");
  html = html.replace(/\s+(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu, (_full, name, quoted1, quoted2, bare) => {
    const safe = safeHref(quoted1 || quoted2 || bare);
    return safe ? ` ${name.toLowerCase()}="${escapeHtml(safe)}"` : "";
  });
  html = html.replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/giu, (tag, name) => {
    const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3"]);
    return allowed.has(name.toLowerCase()) ? tag : "";
  });
  return html.trim();
}

function variablesIn(...values) {
  const found = new Set();
  for (const value of values) {
    for (const match of stringValue(value).matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)) {
      if (!VARIABLE_SET.has(match[1])) fail("EMAIL_TEMPLATE_VARIABLE_NOT_ALLOWED");
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

export function validateEmailTemplateInput(input = {}, { templateKey, allowInactive = true } = {}) {
  const key = normalizeKey(templateKey || input.templateKey);
  const yedek = catalogById.get(key);
  if (!yedek) fail("EMAIL_TEMPLATE_UNKNOWN", 404);
  const subject = stringValue(input.subject).trim();
  const displayName = stringValue(input.displayName || yedek.title).trim();
  const textBody = stringValue(input.textBody || input.body).trim();
  const htmlBody = sanitizeEmailHtml(input.htmlBody || `<p>${escapeHtml(textBody)}</p>`);
  if (!subject || subject.length > MAX_SUBJECT) fail("EMAIL_TEMPLATE_SUBJECT_INVALID");
  if (!displayName || displayName.length > 180) fail("EMAIL_TEMPLATE_DISPLAY_NAME_INVALID");
  if (!textBody || textBody.length > MAX_BODY) fail("EMAIL_TEMPLATE_TEXT_INVALID");
  if (!htmlBody || htmlBody.length > MAX_BODY) fail("EMAIL_TEMPLATE_HTML_INVALID");
  const variables = variablesIn(subject, textBody, htmlBody);
  const active = input.active === undefined ? true : Boolean(input.active);
  if (!allowInactive && !active) fail("EMAIL_TEMPLATE_DEACTIVATION_REQUIRED_GUARD");
  return { key, category: yedek.category, displayName, subject, htmlBody, textBody, variables, active };
}

function staticRecord(template) {
  const editorial = EMAIL_EDITORIAL_V1[template.id];
  const textBody = template.body;
  return {
    templateKey: template.id,
    displayName: template.title,
    category: template.category,
    active: true,
    publishedRevisionId: null,
    revisionId: null,
    revisionNumber: 0,
    revisionStatus: "STATIC_FALLBACK",
    subject: template.subject,
    htmlBody: `<p>${textBody.split(/\n\n/gu).map((part) => escapeHtml(part)).join("</p><p>")}</p>`,
    textBody,
    variableAllowlist: [...(editorial?.fields || []).map((field) => field.key)].sort(),
    source: "STATIC_FALLBACK",
  };
}

export function staticTemplateRecord(templateKey) {
  const template = catalogById.get(normalizeKey(templateKey));
  if (!template) fail("EMAIL_TEMPLATE_UNKNOWN", 404);
  return staticRecord(template);
}

async function insertStaticTemplate(client, template, actorUserId = null) {
  const inserted = (await client.query(
    `insert into email_templates(template_key,display_name,category,active,updated_by)
     values($1,$2,$3,true,$4) on conflict(template_key) do update set updated_at=now()
     returning id,template_key,display_name,category,active,published_revision_id`,
    [template.id, template.title, template.category, actorUserId || null],
  )).rows[0];
  const existingRevision = (await client.query("select id from email_template_revisions where template_id=$1 and status='PUBLISHED' limit 1", [inserted.id])).rows[0];
  if (!existingRevision) {
    const seed = staticRecord(template);
    const revision = (await client.query(
      `insert into email_template_revisions(template_id,revision_number,status,display_name,subject,html_body,text_body,variable_allowlist,created_by,published_by,published_at)
       values($1,1,'PUBLISHED',$2,$3,$4,$5,$6::jsonb,$7,$7,now()) returning id`,
      [inserted.id, seed.displayName, seed.subject, seed.htmlBody, seed.textBody, JSON.stringify(seed.variableAllowlist), actorUserId || null],
    )).rows[0];
    await client.query("update email_templates set published_revision_id=$1,updated_at=now() where id=$2", [revision.id, inserted.id]);
    await client.query(
      `insert into email_template_revision_events(template_id,revision_id,actor_user_id,action,previous_status,next_status,metadata_json)
       values($1,$2,$3,'SEEDED',null,'PUBLISHED',$4::jsonb)`,
      [inserted.id, revision.id, actorUserId || null, JSON.stringify({ source: "STATIC_FALLBACK" })],
    );
  }
  return inserted.id;
}

export async function ensureEmailTemplateCatalog(client, actorUserId = null) {
  for (const template of EMAIL_TEMPLATE_CATALOG) await insertStaticTemplate(client, template, actorUserId);
}

export async function listEmailTemplates(client, { templateKey = null, includeHistory = false, actorUserId = null } = {}) {
  await ensureEmailTemplateCatalog(client, actorUserId);
  const params = templateKey ? [normalizeKey(templateKey)] : [];
  const rows = (await client.query(
    `select t.id,t.template_key as "templateKey",t.display_name as "displayName",t.category,t.active,t.published_revision_id as "publishedRevisionId",
            p.id as "revisionId",p.revision_number as "revisionNumber",p.status as "revisionStatus",p.display_name as "revisionDisplayName",p.subject,p.html_body as "htmlBody",p.text_body as "textBody",p.variable_allowlist as "variableAllowlist"
       from email_templates t left join email_template_revisions p on p.id=t.published_revision_id
      ${templateKey ? "where t.template_key=$1" : ""} order by t.category,t.display_name`, params,
  )).rows;
  const result = [];
  for (const row of rows) {
    const draft = (await client.query(
      `select id as "revisionId",revision_number as "revisionNumber",status,display_name as "displayName",subject,html_body as "htmlBody",text_body as "textBody",variable_allowlist as "variableAllowlist"
         from email_template_revisions where template_id=(select id from email_templates where template_key=$1) and status='DRAFT' order by revision_number desc limit 1`, [row.templateKey],
    )).rows[0] || null;
    const record = { ...row, draft };
    if (includeHistory) record.history = (await client.query(
      `select id as "revisionId",revision_number as "revisionNumber",status,display_name as "displayName",subject,html_body as "htmlBody",text_body as "textBody",variable_allowlist as "variableAllowlist",created_at as "createdAt",published_at as "publishedAt"
         from email_template_revisions where template_id=(select id from email_templates where template_key=$1) order by revision_number desc`, [row.templateKey],
    )).rows;
    result.push(record);
  }
  return result;
}

export async function getPublishedEmailTemplate(client, eventType, actorUserId = null) {
  const key = EMAIL_EVENT_TEMPLATE_MAP[String(eventType || "").toUpperCase()] || null;
  if (!key) return null;
  await insertStaticTemplate(client, catalogById.get(key), actorUserId);
  const row = (await client.query(
    `select t.template_key as "templateKey",t.active,p.id as "revisionId",p.revision_number as "revisionNumber",p.status,p.display_name as "displayName",p.subject,p.html_body as "htmlBody",p.text_body as "textBody",p.variable_allowlist as "variableAllowlist"
       from email_templates t join email_template_revisions p on p.id=t.published_revision_id where t.template_key=$1`, [key],
  )).rows[0];
  if (!row || !row.active || row.status !== "PUBLISHED") return null;
  return row;
}

export function templateRevisionOverride(record) {
  if (!record) return undefined;
  return { subject: record.subject, title: record.displayName, body: record.textBody, htmlBody: record.htmlBody, revisionId: record.revisionId };
}

export function buildEmailSnapshot({ eventType, record, metadata = {}, body = "" } = {}) {
  const templateKey = record?.templateKey || EMAIL_EVENT_TEMPLATE_MAP[String(eventType || "").toUpperCase()];
  if (!templateKey) return null;
  const data = {
    recipientName: String(metadata.recipientName || "Fixoku kullanıcısı"),
    actionUrl: String(metadata.actionUrl || metadata.path || "/giris"),
    ctaPath: String(metadata.path || "/giris"),
    reference: String(metadata.reference || eventType || "FIXOKU_EVENT"),
    amount: String(metadata.amount || "—"),
    packageName: String(metadata.packageName || metadata.programName || "Fixoku eğitim paketi"),
    programName: String(metadata.programName || metadata.packageName || "Fixoku eğitimi"),
    completionDate: String(metadata.completionDate || metadata.date || "—"),
    earningPeriod: String(metadata.earningPeriod || metadata.date || "—"),
    paymentDate: String(metadata.paymentDate || metadata.date || "—"),
    applicationField: String(metadata.applicationField || body || "Fixoku platform işlemi"),
    qualificationName: String(metadata.qualificationName || "Fixoku eğitmen yeterliliği"),
    qualificationStatus: String(metadata.qualificationStatus || "Güncellendi"),
    studentName: String(metadata.studentName || "Öğrenci"),
    trainerName: String(metadata.trainerName || "Eğitmen"),
    sessionDate: String(metadata.sessionDate || metadata.date || "—"),
    dueDate: String(metadata.dueDate || metadata.date || "—"),
    paymentMethod: String(metadata.paymentMethod || "Havale/EFT"),
  };
  const rendered = renderEmail(templateKey, data, { baseUrl: process.env.APP_ORIGIN || "https://fixoku.com", templateOverride: templateRevisionOverride(record) });
  return { templateKey, revisionId: record?.revisionId || null, revisionNumber: record?.revisionNumber || null, subject: rendered.subject, text: rendered.text, html: rendered.html, contentSha256: createHash("sha256").update(`${rendered.subject}\n${rendered.text}\n${rendered.html}`).digest("hex") };
}

export { ALLOWED_VARIABLES, CRITICAL_KEYS, catalogById };
