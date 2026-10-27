import pg from "pg";
import { resolvePrincipal, requireMembership } from "../../src/server/auth/authorization.js";
import { CRITICAL_KEYS, ensureEmailTemplateCatalog, listEmailTemplates, validateEmailTemplateInput } from "../../src/server/domain/email-templates.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const body = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Object.assign(new Error("INVALID_JSON"), { status: 400 });
  return parsed;
};
const errorResponse = (res, error) => json(res, Number(error?.status) || 400, { error: error?.code || error?.message || "EMAIL_TEMPLATE_OPERATION_FAILED" });

function ownerGuard(principal) {
  return requireMembership(principal, "OWNER");
}

async function saveDraft(client, input, ownerId) {
  const key = String(input.templateKey || "").trim().toLowerCase();
  const template = (await client.query("select id,template_key,active,published_revision_id from email_templates where template_key=$1 for update", [key])).rows[0];
  if (!template) return { error: "EMAIL_TEMPLATE_UNKNOWN", status: 404 };
  const validated = validateEmailTemplateInput(input, { templateKey: key, allowInactive: !CRITICAL_KEYS.has(key) });
  const expected = Number(input.expectedRevision || 0);
  if (!Number.isInteger(expected) || expected < 1) return { error: "EMAIL_TEMPLATE_REVISION_REQUIRED", status: 409 };
  const draft = (await client.query("select * from email_template_revisions where template_id=$1 and status='DRAFT' order by revision_number desc limit 1 for update", [template.id])).rows[0];
  const published = template.published_revision_id
    ? (await client.query("select * from email_template_revisions where id=$1", [template.published_revision_id])).rows[0]
    : null;
  const currentRevision = draft || published;
  if (expected && currentRevision && Number(currentRevision.revision_number) !== expected) return { error: "EMAIL_TEMPLATE_REVISION_CONFLICT", status: 409 };
  let revision;
  if (draft) {
    revision = (await client.query(
      `update email_template_revisions set display_name=$1,subject=$2,html_body=$3,text_body=$4,variable_allowlist=$5::jsonb
        where id=$6 and status='DRAFT' returning id,revision_number as "revisionNumber",status`,
      [validated.displayName, validated.subject, validated.htmlBody, validated.textBody, JSON.stringify(validated.variables), draft.id],
    )).rows[0];
  } else {
    const nextNumber = Number(currentRevision?.revision_number || 0) + 1;
    revision = (await client.query(
      `insert into email_template_revisions(template_id,revision_number,status,display_name,subject,html_body,text_body,variable_allowlist,created_by)
       values($1,$2,'DRAFT',$3,$4,$5,$6,$7::jsonb,$8) returning id,revision_number as "revisionNumber",status`,
      [template.id, nextNumber, validated.displayName, validated.subject, validated.htmlBody, validated.textBody, JSON.stringify(validated.variables), ownerId],
    )).rows[0];
  }
  await client.query("update email_templates set active=$1,updated_at=now(),updated_by=$2 where id=$3", [validated.active, ownerId, template.id]);
  await client.query(
    `insert into email_template_revision_events(template_id,revision_id,actor_user_id,action,previous_status,next_status,metadata_json)
     values($1,$2,$3,'DRAFT_SAVED',$4,'DRAFT',$5::jsonb)`,
    [template.id, revision.id, ownerId, currentRevision?.status || null, JSON.stringify({ variables: validated.variables })],
  );
  return { revision };
}

async function publishDraft(client, input, ownerId) {
  const key = String(input.templateKey || "").trim().toLowerCase();
  const template = (await client.query("select id,template_key,active,published_revision_id from email_templates where template_key=$1 for update", [key])).rows[0];
  if (!template) return { error: "EMAIL_TEMPLATE_UNKNOWN", status: 404 };
  const draft = (await client.query("select * from email_template_revisions where template_id=$1 and status='DRAFT' order by revision_number desc limit 1 for update", [template.id])).rows[0];
  if (!draft) return { error: "EMAIL_TEMPLATE_DRAFT_REQUIRED", status: 409 };
  const expected = Number(input.expectedRevision || 0);
  if (!Number.isInteger(expected) || expected < 1) return { error: "EMAIL_TEMPLATE_REVISION_REQUIRED", status: 409 };
  if (expected && Number(draft.revision_number) !== expected) return { error: "EMAIL_TEMPLATE_REVISION_CONFLICT", status: 409 };
  const parsed = validateEmailTemplateInput({ templateKey: key, displayName: draft.display_name, subject: draft.subject, htmlBody: draft.html_body, textBody: draft.text_body, active: input.active === undefined ? true : input.active }, { templateKey: key, allowInactive: !CRITICAL_KEYS.has(key) });
  if (template.published_revision_id) await client.query("update email_template_revisions set status='ARCHIVED' where id=$1 and status='PUBLISHED'", [template.published_revision_id]);
  const published = (await client.query(
    `update email_template_revisions set status='PUBLISHED',display_name=$1,subject=$2,html_body=$3,text_body=$4,variable_allowlist=$5::jsonb,published_by=$6,published_at=now()
      where id=$7 and status='DRAFT' returning id,revision_number as "revisionNumber",status`,
    [parsed.displayName, parsed.subject, parsed.htmlBody, parsed.textBody, JSON.stringify(parsed.variables), ownerId, draft.id],
  )).rows[0];
  await client.query("update email_templates set published_revision_id=$1,active=$2,updated_at=now(),updated_by=$3 where id=$4", [published.id, parsed.active, ownerId, template.id]);
  await client.query(
    `insert into email_template_revision_events(template_id,revision_id,actor_user_id,action,previous_status,next_status,metadata_json)
     values($1,$2,$3,'PUBLISHED','DRAFT','PUBLISHED',$4::jsonb)`,
    [template.id, published.id, ownerId, JSON.stringify({ previousPublishedRevisionId: template.published_revision_id || null })],
  );
  return { revision: published };
}

async function revertDraft(client, input, ownerId) {
  const key = String(input.templateKey || "").trim().toLowerCase();
  const template = (await client.query("select id from email_templates where template_key=$1 for update", [key])).rows[0];
  if (!template) return { error: "EMAIL_TEMPLATE_UNKNOWN", status: 404 };
  const source = (await client.query("select * from email_template_revisions where id=$1 and template_id=$2", [input.revisionId, template.id])).rows[0];
  if (!source) return { error: "EMAIL_TEMPLATE_REVISION_NOT_FOUND", status: 404 };
  const latest = (await client.query("select max(revision_number)::int as number from email_template_revisions where template_id=$1", [template.id])).rows[0];
  const revision = (await client.query(
    `insert into email_template_revisions(template_id,revision_number,status,display_name,subject,html_body,text_body,variable_allowlist,created_by)
     values($1,$2,'DRAFT',$3,$4,$5,$6,$7::jsonb,$8) returning id,revision_number as "revisionNumber",status`,
    [template.id, Number(latest?.number || 0) + 1, source.display_name, source.subject, source.html_body, source.text_body, JSON.stringify(source.variable_allowlist || []), ownerId],
  )).rows[0];
  await client.query(
    `insert into email_template_revision_events(template_id,revision_id,actor_user_id,action,previous_status,next_status,metadata_json)
     values($1,$2,$3,'REVERTED',null,'DRAFT',$4::jsonb)`,
    [template.id, revision.id, ownerId, JSON.stringify({ sourceRevisionId: source.id })],
  );
  return { revision };
}

export default async function handler(req, res) {
  let pool;
  try {
    const principal = await resolvePrincipal(headers(req));
    const denied = ownerGuard(principal);
    if (denied) return json(res, denied.status, denied.body);
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    if (req.method === "GET") {
      const url = new URL(req.url || "/api/owner/email-templates", "http://local");
      const rows = await listEmailTemplates(pool, { templateKey: url.searchParams.get("key") || null, includeHistory: url.searchParams.get("history") === "1", actorUserId: principal.user.id });
      return json(res, 200, { templates: rows, variables: (await import("../../src/server/domain/email-templates.js")).ALLOWED_VARIABLES });
    }
    if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
    const input = await body(req);
    const action = String(input.action || "SAVE").toUpperCase();
    const client = await pool.connect();
    try {
      await client.query("begin");
      await ensureEmailTemplateCatalog(client, principal.user.id);
      const result = action === "SAVE" ? await saveDraft(client, input, principal.user.id)
        : action === "PUBLISH" ? await publishDraft(client, input, principal.user.id)
          : action === "REVERT" ? await revertDraft(client, input, principal.user.id)
            : { error: "EMAIL_TEMPLATE_ACTION_INVALID", status: 400 };
      if (result.error) { await client.query("rollback"); return json(res, result.status || 400, { error: result.error }); }
      await client.query("commit");
      const rows = await listEmailTemplates(pool, { templateKey: input.templateKey, includeHistory: true, actorUserId: principal.user.id });
      return json(res, 200, { ok: true, action, template: rows[0] || null });
    } catch (error) { try { await client.query("rollback"); } catch { /* noop */ } return errorResponse(res, error); }
    finally { client.release(); }
  } catch (error) { return errorResponse(res, error); }
  finally { await pool?.end(); }
}

export { saveDraft, publishDraft, revertDraft };
