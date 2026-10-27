import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal, requireMembership } from "../../src/server/auth/authorization.js";
import { inspectOwnerLegalSource, legalDocumentKey, legalDocumentScope } from "../../src/server/domain/owner-legal-source.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
// R74: the approval import must use the cleaned v1.0 customer package. The
// v0.2 review source remains available for comparison, but must never become
// the source of a future server-side approval draft.
const sourcePath = path.resolve(process.cwd(), "src/platform/admin/legal-owner-documents-v10.json");
const validTransitions = new Map([
  ["DRAFT", new Set(["REVIEW"])],
  ["REVIEW", new Set(["APPROVED"])],
  ["APPROVED", new Set(["PUBLISHED"])],
  ["PUBLISHED", new Set(["ARCHIVED"])],
]);
const readBody = async (req) => {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 200_000) throw Object.assign(new Error("PAYLOAD_TOO_LARGE"), { status: 413 });
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw Object.assign(new Error("INVALID_JSON"), { status: 400 }); }
};
const migrationRequired = (error) => error?.code === "42P01" || error?.code === "42704";
const blocked = (res) => json(res, 503, { error: "LEGAL_APPROVAL_MIGRATION_REQUIRED", serverSideApproval: "BLOCKED", localJsonApproval: "REJECTED" });

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  const denied = requireMembership(principal, "OWNER");
  if (denied) return json(res, denied.status, denied.body);
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      try {
        const documents = (await client.query(`select v.id,v.document_key as "documentKey",v.source_document_id as "sourceDocumentId",v.version_number as "versionNumber",v.status,v.title,v.scope,v.markdown,v.content_sha256 as "contentSha256",v.created_by as "createdBy",v.created_at as "createdAt",v.updated_at as "updatedAt",coalesce(json_agg(json_build_object('decisionType',d.decision_type,'actorUserId',d.actor_user_id,'actorDisplayName',actor.display_name,'decisionNote',d.decision_note,'evidenceReference',d.evidence_reference,'createdAt',d.created_at) order by d.created_at) filter (where d.id is not null),'[]') as decisions from owner_legal_document_versions v left join owner_legal_document_decisions d on d.document_version_id=v.id left join platform_users actor on actor.id=d.actor_user_id group by v.id order by v.source_document_id,v.version_number desc`)).rows;
        const events = (await client.query(`select e.id,e.document_version_id as "documentVersionId",e.previous_status as "previousStatus",e.next_status as "nextStatus",e.actor_user_id as "actorUserId",actor.display_name as "actorDisplayName",e.event_note as "eventNote",e.correlation_id as "correlationId",e.created_at as "createdAt" from owner_legal_document_events e left join platform_users actor on actor.id=e.actor_user_id order by e.created_at,e.id`)).rows;
        const audit = (await client.query(`select a.id,a.subject_id as "subjectId",a.action,a.result,a.correlation_id as "correlationId",a.metadata_json as "metadataJson",a.actor_user_id as "actorUserId",actor.display_name as "actorDisplayName",a.occurred_at as "createdAt" from platform_audit_events a left join platform_users actor on actor.id=a.actor_user_id where a.subject_type in ('owner_legal_document_version','owner_legal_document_package') order by a.occurred_at,a.id`)).rows;
        const eventMap = new Map();
        for (const event of events) eventMap.set(String(event.documentVersionId), [...(eventMap.get(String(event.documentVersionId)) || []), event]);
        const auditMap = new Map();
        for (const row of audit) auditMap.set(String(row.subjectId), [...(auditMap.get(String(row.subjectId)) || []), row]);
        for (const document of documents) {
          document.events = eventMap.get(String(document.id)) || [];
          document.auditRecords = auditMap.get(String(document.id)) || [];
        }
        const vat = (await client.query(`select id,subject_kind as "subjectKind",subject_id as "subjectId",status,vat_rate_bps as "vatRateBps",component_rates_json as "componentRatesJson",currency,effective_from as "effectiveFrom",evidence_reference as "evidenceReference",accountant_name as "accountantName",accountant_reviewed_at as "accountantReviewedAt",owner_user_id as "ownerUserId",owner_decided_at as "ownerDecidedAt",decision_note as "decisionNote" from owner_vat_decisions order by created_at desc`)).rows;
        return json(res, 200, { documents, events, auditRecords: audit, vatDecisions: vat, source: "DATABASE", localJsonApproval: "REJECTED", publication: "BLOCKED_P0" });
      } catch (error) { if (migrationRequired(error)) return blocked(res); throw error; }
    }

    const body = await readBody(req);
    const action = String(body.action || "");
    if (action === "import_drafts") {
      const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
      const sourceInspection = inspectOwnerLegalSource(source);
      const customerCount = sourceInspection.customerCount;
      const internalCount = sourceInspection.internalCount;
      if (!Array.isArray(source) || source.length !== 21) return json(res, 409, { error: "LEGAL_SOURCE_DOCUMENT_COUNT_INVALID" });
      if (!sourceInspection.ok || customerCount !== 16 || internalCount !== 5) return json(res, 409, { error: "LEGAL_V10_SOURCE_PACKAGE_INVALID" });
      await client.query("begin");
      try {
        for (const document of source) {
          const key = legalDocumentKey(document);
          const versionNumber = document.internal ? 2 : 10;
          const contentSha256 = document.contentSha256 || document.originalSha256 || crypto.createHash("sha256").update(document.markdown, "utf8").digest("hex");
          await client.query(`insert into owner_legal_document_versions(document_key,source_document_id,version_number,status,title,scope,markdown,content_sha256,created_by) values($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8) on conflict(document_key,version_number) do nothing`, [key, document.id, versionNumber, document.title, legalDocumentScope(document), document.markdown, contentSha256, principal.user.id]);
        }
        await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'legal.document.draft_imported','owner_legal_document_package','FIXOKU_21_V10','SUCCESS',$2,$3)`, [principal.user.id, crypto.randomUUID(), JSON.stringify({ documentCount: source.length, customerCount, internalCount, sourceVersion: "1.0", sourceFile: path.basename(sourcePath), publicationStatus: "BLOCKED_P0" })]);
        await client.query("commit");
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
      return json(res, 201, { action, documentCount: 21, customerCount, internalCount, importedCustomerVersion: 10, status: "DRAFT", approvalCreated: false, published: false });
    }

    if (action === "record_legal_review") {
      const versionId = String(body.documentVersionId || "");
      const reviewerName = String(body.legalReviewerName || "").trim();
      const evidenceReference = String(body.evidenceReference || "").trim();
      const reviewedAt = String(body.reviewedAt || "").trim();
      const note = String(body.note || "").trim();
      if (!versionId || !reviewerName || !evidenceReference || !reviewedAt || !note) return json(res, 400, { error: "LEGAL_REVIEW_FIELDS_REQUIRED" });
      if (Number.isNaN(Date.parse(reviewedAt))) return json(res, 400, { error: "LEGAL_REVIEW_DATE_INVALID" });
      await client.query("begin");
      try {
        const current = (await client.query("select id,status,markdown,content_sha256 from owner_legal_document_versions where id=$1 for update", [versionId])).rows[0];
        if (!current) { await client.query("rollback"); return json(res, 404, { error: "LEGAL_DOCUMENT_VERSION_NOT_FOUND" }); }
        if (crypto.createHash("sha256").update(String(current.markdown), "utf8").digest("hex") !== current.content_sha256) { await client.query("rollback"); return json(res, 409, { error: "LEGAL_CONTENT_HASH_MISMATCH" }); }
        if (current.status !== "REVIEW") { await client.query("rollback"); return json(res, 409, { error: "LEGAL_REVIEW_REQUIRES_REVIEW_STATE" }); }
        await client.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,'LEGAL_REVIEW',$2,$3,$4)", [versionId, principal.user.id, `${reviewerName} · ${reviewedAt} · ${note}`, evidenceReference]);
        await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'legal.document.review_recorded','owner_legal_document_version',$2,'SUCCESS',$3,$4)", [principal.user.id, versionId, crypto.randomUUID(), JSON.stringify({ reviewerName, reviewedAt, evidenceReference })]);
        await client.query("commit");
        return json(res, 200, { documentVersionId: versionId, legalReviewRecorded: true, status: current.status, approvalCreated: false });
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
    }

    if (action === "transition_document") {
      const versionId = String(body.documentVersionId || "");
      const nextStatus = String(body.nextStatus || "").toUpperCase();
      const note = String(body.note || "").trim();
      const evidenceReference = body.evidenceReference == null ? null : String(body.evidenceReference).trim();
      if (!versionId || !nextStatus || !note) return json(res, 400, { error: "DOCUMENT_TRANSITION_FIELDS_REQUIRED" });
      if (nextStatus === "PUBLISHED") return json(res, 409, { error: "LEGAL_PUBLICATION_BLOCKED_P0", published: false, publication: "BLOCKED_P0" });
      await client.query("begin");
      try {
        const current = (await client.query("select * from owner_legal_document_versions where id=$1 for update", [versionId])).rows[0];
        if (!current) { await client.query("rollback"); return json(res, 404, { error: "LEGAL_DOCUMENT_VERSION_NOT_FOUND" }); }
        const currentHash = crypto.createHash("sha256").update(String(current.markdown), "utf8").digest("hex");
        if (currentHash !== current.content_sha256) { await client.query("rollback"); return json(res, 409, { error: "LEGAL_CONTENT_HASH_MISMATCH" }); }
        if (!validTransitions.get(current.status)?.has(nextStatus)) { await client.query("rollback"); return json(res, 409, { error: "LEGAL_DOCUMENT_INVALID_STATE_TRANSITION", currentStatus: current.status, nextStatus }); }
        if (nextStatus === "PUBLISHED" && current.scope !== "CUSTOMER") { await client.query("rollback"); return json(res, 409, { error: "INTERNAL_DOCUMENT_PUBLICATION_FORBIDDEN" }); }
        if (["APPROVED", "PUBLISHED"].includes(nextStatus) && !evidenceReference) { await client.query("rollback"); return json(res, 409, { error: "LEGAL_EVIDENCE_REQUIRED" }); }
        if (nextStatus === "APPROVED") {
          const review = (await client.query("select 1 from owner_legal_document_decisions where document_version_id=$1 and decision_type='LEGAL_REVIEW' and evidence_reference is not null limit 1", [versionId])).rows[0];
          if (!review) { await client.query("rollback"); return json(res, 409, { error: "LEGAL_REVIEW_EVIDENCE_REQUIRED" }); }
        }
        await client.query("update owner_legal_document_versions set status=$1,updated_at=now() where id=$2", [nextStatus, versionId]);
        const decisionType = nextStatus === "APPROVED" ? "OWNER_APPROVAL" : nextStatus === "ARCHIVED" ? "REVOKED" : null;
        if (decisionType) await client.query("insert into owner_legal_document_decisions(document_version_id,decision_type,actor_user_id,decision_note,evidence_reference) values($1,$2,$3,$4,$5)", [versionId, decisionType, principal.user.id, note, evidenceReference]);
        await client.query("insert into owner_legal_document_events(document_version_id,previous_status,next_status,actor_user_id,event_note,correlation_id) values($1,$2,$3,$4,$5,$6)", [versionId, current.status, nextStatus, principal.user.id, note, crypto.randomUUID()]);
        await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'owner_legal_document_version','' || $3,'SUCCESS',$4,$5)", [principal.user.id, `legal.document.${nextStatus.toLowerCase()}`, versionId, crypto.randomUUID(), JSON.stringify({ previousStatus: current.status, nextStatus, evidenceReference })]);
        await client.query("commit");
        return json(res, 200, { documentVersionId: versionId, previousStatus: current.status, status: nextStatus, approvalActorUserId: nextStatus === "APPROVED" ? principal.user.id : null, published: nextStatus === "PUBLISHED" });
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
    }

    if (action === "create_vat") {
      const subjectKind = String(body.subjectKind || "").toUpperCase();
      const allowedSubjects = new Set(["BOOK", "DIGITAL_SOFTWARE", "STUDENT_PACKAGE", "TRAINER_PACKAGE", "MIXED_PACKAGE", "SHIPPING"]);
      const vatRateBps = body.vatRateBps == null ? null : Number(body.vatRateBps);
      if (!allowedSubjects.has(subjectKind) || (vatRateBps !== null && (!Number.isInteger(vatRateBps) || vatRateBps < 0 || vatRateBps > 10000))) return json(res, 400, { error: "VAT_DRAFT_FIELDS_INVALID" });
      const componentRates = body.componentRatesJson && typeof body.componentRatesJson === "object" ? body.componentRatesJson : {};
      await client.query("begin");
      try {
        const row = (await client.query(`insert into owner_vat_decisions(subject_kind,subject_id,status,vat_rate_bps,component_rates_json,currency,basis_reference,evidence_reference,decision_note,created_by) values($1,$2,'DRAFT',$3,$4,$5,$6,$7,$8,$9) returning id,subject_kind as "subjectKind",subject_id as "subjectId",status,vat_rate_bps as "vatRateBps",component_rates_json as "componentRatesJson",currency`, [subjectKind, body.subjectId == null ? null : String(body.subjectId), vatRateBps, JSON.stringify(componentRates), String(body.currency || "TRY").toUpperCase(), body.basisReference == null ? null : String(body.basisReference), body.evidenceReference == null ? null : String(body.evidenceReference), body.note == null ? null : String(body.note), principal.user.id])).rows[0];
        await client.query(`insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'vat.decision.draft_created','owner_vat_decision',$2,'SUCCESS',$3,$4)`, [principal.user.id, row.id, crypto.randomUUID(), JSON.stringify({ subjectKind, vatRateBps, componentRates })]);
        await client.query("commit");
        return json(res, 201, { vatDecision: row, effective: false });
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
    }

    if (action === "record_accountant_review") {
      const decisionId = String(body.vatDecisionId || "");
      const accountantName = String(body.accountantName || "").trim();
      const evidenceReference = String(body.evidenceReference || "").trim();
      const reviewedAt = String(body.accountantReviewedAt || "").trim();
      const note = String(body.note || "").trim();
      if (!decisionId || !accountantName || !evidenceReference || !reviewedAt || !note) return json(res, 400, { error: "VAT_ACCOUNTANT_REVIEW_FIELDS_REQUIRED" });
      if (Number.isNaN(Date.parse(reviewedAt))) return json(res, 400, { error: "VAT_ACCOUNTANT_REVIEW_DATE_INVALID" });
      await client.query("begin");
      try {
        const current = (await client.query("select id,status from owner_vat_decisions where id=$1 for update", [decisionId])).rows[0];
        if (!current) { await client.query("rollback"); return json(res, 404, { error: "VAT_DECISION_NOT_FOUND" }); }
        if (["EFFECTIVE", "ARCHIVED"].includes(current.status)) { await client.query("rollback"); return json(res, 409, { error: "VAT_DECISION_IMMUTABLE_AFTER_EFFECTIVE" }); }
        await client.query("update owner_vat_decisions set accountant_name=$1,accountant_reviewed_at=$2,evidence_reference=$3,updated_at=now() where id=$4", [accountantName, reviewedAt, evidenceReference, decisionId]);
        await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'vat.decision.accountant_review_recorded','owner_vat_decision',$2,'SUCCESS',$3,$4)", [principal.user.id, decisionId, crypto.randomUUID(), JSON.stringify({ accountantName, accountantReviewedAt: reviewedAt, evidenceReference, note })]);
        await client.query("commit");
        return json(res, 200, { vatDecisionId: decisionId, accountantReviewRecorded: true, effective: false });
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
    }

    if (action === "transition_vat") {
      const decisionId = String(body.vatDecisionId || "");
      const nextStatus = String(body.nextStatus || "").toUpperCase();
      const note = String(body.note || "").trim();
      const evidenceReference = body.evidenceReference == null ? null : String(body.evidenceReference).trim();
      if (!decisionId || !nextStatus || !note) return json(res, 400, { error: "VAT_TRANSITION_FIELDS_REQUIRED" });
      if (nextStatus === "EFFECTIVE" && !evidenceReference) return json(res, 409, { error: "VAT_EVIDENCE_REQUIRED" });
      await client.query("begin");
      try {
        const current = (await client.query("select * from owner_vat_decisions where id=$1 for update", [decisionId])).rows[0];
        if (!current) { await client.query("rollback"); return json(res, 404, { error: "VAT_DECISION_NOT_FOUND" }); }
        const allowed = { DRAFT: ["REVIEW"], REVIEW: ["APPROVED"], APPROVED: ["EFFECTIVE"], EFFECTIVE: ["ARCHIVED"] };
        if (!allowed[current.status]?.includes(nextStatus)) { await client.query("rollback"); return json(res, 409, { error: "VAT_INVALID_STATE_TRANSITION", currentStatus: current.status, nextStatus }); }
        if (nextStatus === "APPROVED" && (!current.accountant_name || !current.accountant_reviewed_at || !current.evidence_reference)) { await client.query("rollback"); return json(res, 409, { error: "VAT_ACCOUNTANT_REVIEW_REQUIRED" }); }
        const effectiveFrom = nextStatus === "EFFECTIVE" ? (body.effectiveFrom || new Date().toISOString()) : null;
        const componentRatesPresent = current.component_rates_json && Object.keys(current.component_rates_json).length > 0;
        if (nextStatus === "EFFECTIVE" && (!current.accountant_reviewed_at || !current.owner_user_id || !current.owner_decided_at || (current.vat_rate_bps === null || current.vat_rate_bps === undefined) && !(current.subject_kind === "MIXED_PACKAGE" && componentRatesPresent))) { await client.query("rollback"); return json(res, 409, { error: "VAT_ACCOUNTANT_OWNER_EVIDENCE_REQUIRED" }); }
        await client.query("update owner_vat_decisions set status=$1,evidence_reference=coalesce($2,evidence_reference),effective_from=coalesce($3::timestamptz,effective_from),owner_user_id=coalesce(owner_user_id,$4),owner_decided_at=coalesce(owner_decided_at,now()),updated_at=now() where id=$5", [nextStatus, evidenceReference, effectiveFrom, principal.user.id, decisionId]);
        await client.query("insert into owner_vat_decision_events(vat_decision_id,previous_status,next_status,actor_user_id,event_note,correlation_id) values($1,$2,$3,$4,$5,$6)", [decisionId, current.status, nextStatus, principal.user.id, note, crypto.randomUUID()]);
        await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'owner_vat_decision',$3,'SUCCESS',$4,$5)", [principal.user.id, `vat.decision.${nextStatus.toLowerCase()}`, decisionId, crypto.randomUUID(), JSON.stringify({ previousStatus: current.status, nextStatus, evidenceReference })]);
        await client.query("commit");
        return json(res, 200, { vatDecisionId: decisionId, previousStatus: current.status, status: nextStatus, effectiveFrom });
      } catch (error) { await client.query("rollback"); if (migrationRequired(error)) return blocked(res); throw error; }
    }

    return json(res, 400, { error: "UNKNOWN_OWNER_LEGAL_ACTION" });
  } catch (error) {
    if (migrationRequired(error)) return blocked(res);
    return json(res, error.status || 503, { error: error.code || error.message || "OWNER_LEGAL_APPROVAL_FAILED" });
  } finally { client.release(); await pool.end(); }
}
