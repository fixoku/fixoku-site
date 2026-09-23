import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requireMembership } from "../../src/server/auth/authorization.js";
import {
  assertFamilyOfferEditable,
  evaluateFamilyOfferDraft,
  normalizeFamilyOfferDraftChildren,
} from "../../src/server/domain/family-offers.js";
import { isR6OfferUuid } from "../../src/server/domain/r6-offers.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { code, status }); };
const uuid = (value, code) => { if (!isR6OfferUuid(value)) fail(code, 400); return String(value); };

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = ""; for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { fail("INVALID_JSON"); }
}

function offerIdFrom(req) {
  if (req.query?.id) return String(req.query.id);
  const path = new URL(req.url || "/", "http://local").pathname;
  return path.match(/\/family-offers\/([^/?]+)$/u)?.[1] || null;
}

async function customer(client, value) {
  const id = uuid(value, "FAMILY_CUSTOMER_ID_INVALID");
  const row = (await client.query("select id,email,display_name from platform_users where id=$1", [id])).rows[0];
  if (!row) fail("FAMILY_CUSTOMER_NOT_FOUND", 404);
  return row;
}

async function catalog(client, children, selectionIds) {
  const stages = [...new Set(children.map((child) => child.educationStage))];
  const ids = [...new Set(selectionIds)];
  if (!ids.length) fail("FAMILY_SELECTIONS_REQUIRED");
  const rows = (await client.query(`
    select p.id as "packageId", p.education_stage as "educationStage", p.eligible_grades_json as "eligibleGradesJson",
      p.audience, p.catalog_scope as "catalogScope", p.status as "packageStatus", pv.id as "packageVersionId",
      pv.status as "versionStatus", pv.purchase_enabled as "purchaseEnabled", pc.id as "packageComponentId",
      pc.reference_id as "productId", pc.is_active as "componentActive", pc.quantity,
      prod.is_active as "productActive", prod.title, prod.product_type as "productType",
      prod.r6_product_type as "r6ProductType", prod.service_mode as "serviceMode", prod.service_type as "serviceType",
      prod.list_gross_minor as "productListGrossMinor", prod.currency, r6p.effective_sale_gross_minor as "componentSaleGrossMinor",
      coalesce(r6p.effective_sale_gross_minor, prod.list_gross_minor) as "saleGrossMinor",
      coalesce(r6p.currency, prod.currency, 'TRY') as currency,
      coalesce((select json_agg(scope.education_stage) from r6_product_stage_scopes scope where scope.physical_product_id=prod.id), '[]'::json) as "productStageScopes",
      p.eligible_grades_json as "eligibleGradesJson"
    from package_components pc
    join package_versions pv on pv.id=pc.package_version_id
    join packages p on p.id=pv.package_id
    join physical_products prod on prod.id=coalesce(pc.reference_id,pc.physical_product_id)
    left join r6_package_component_pricing r6p on r6p.package_component_id=pc.id
    where pc.is_active=true and prod.is_active=true and p.audience='STUDENT' and p.catalog_scope='STUDENT_COMMERCE'
      and p.status='PUBLISHED' and pv.status='PUBLISHED' and pv.purchase_enabled=true
      and p.education_stage = any($1::education_stage[]) and (pc.id=any($2::uuid[]) or prod.id=any($2::uuid[]))
  `, [stages, ids])).rows;
  return rows.map((row) => ({ ...row, eligibleGrades: JSON.parse(row.eligibleGradesJson || "[]"), productStageScopes: row.productStageScopes || stages }));
}

function selectionIds(input) { return (input?.selections || []).map((selection) => String(selection.canonicalProductOrComponentId ?? selection.productId ?? "")); }

async function readFamilyOffer(client, id, ownerId) {
  const offer = (await client.query("select * from family_offers where id=$1 and owner_user_id=$2", [id, ownerId])).rows[0];
  if (!offer) return null;
  const revision = (await client.query("select * from family_offer_revisions where offer_id=$1 and revision_number=$2", [id, offer.current_revision_number])).rows[0];
  if (!revision) fail("FAMILY_REVISION_NOT_FOUND", 409);
  const children = (await client.query("select * from family_offer_draft_children where revision_id=$1 order by created_at,id", [revision.id])).rows;
  const selections = (await client.query("select * from family_offer_child_selections where revision_id=$1 order by created_at,id", [revision.id])).rows;
  return { id: offer.id, ownerUserId: offer.owner_user_id, customerUserId: offer.customer_user_id, title: offer.title, status: offer.status, currentRevisionNumber: Number(offer.current_revision_number), revision: { id: revision.id, revisionNumber: Number(revision.revision_number), status: revision.status, children, selections, pricing: JSON.parse(revision.pricing_snapshot) } };
}

async function persistRevision(client, { offerId, ownerId, customerId, title, draft, expectedRevisionNumber = null }) {
  const children = normalizeFamilyOfferDraftChildren(draft.children);
  const catalogRows = await catalog(client, children, selectionIds(draft));
  const evaluated = evaluateFamilyOfferDraft({ ...draft, children }, catalogRows);
  const current = offerId ? (await client.query("select * from family_offers where id=$1 and owner_user_id=$2 for update", [offerId, ownerId])).rows[0] : null;
  if (offerId && !current) fail("FAMILY_OFFER_NOT_FOUND", 404);
  if (current) {
    assertFamilyOfferEditable({ status: current.status, acceptedOrderId: current.accepted_order_id, materializedOrderId: current.materialized_order_id });
    if (expectedRevisionNumber == null || Number(expectedRevisionNumber) !== Number(current.current_revision_number)) fail("FAMILY_REVISION_STALE", 409);
  }
  const id = current?.id || (await client.query("insert into family_offers(owner_user_id,customer_user_id,title) values($1,$2,$3) returning id", [ownerId, customerId, String(title || "Aile Teklifi").trim().slice(0, 240) || "Aile Teklifi"])).rows[0].id;
  const revisionNumber = current ? Number(current.current_revision_number) + 1 : 1;
  const revision = (await client.query("insert into family_offer_revisions(offer_id,revision_number,status,draft_children_snapshot,selections_snapshot,pricing_snapshot,created_by) values($1,$2,'DRAFT',$3,$4,$5,$6) returning id", [id, revisionNumber, JSON.stringify(evaluated.children), JSON.stringify(evaluated.selections), JSON.stringify(evaluated.pricing), ownerId])).rows[0];
  const childIds = new Map();
  for (const child of evaluated.children) {
    const row = (await client.query("insert into family_offer_draft_children(revision_id,local_key,first_name,last_name,grade,education_stage,existing_child_profile_id,existing_student_profile_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning id", [revision.id, child.localKey, child.firstName, child.lastName, child.grade, child.educationStage, child.existingChildProfileId, child.existingStudentProfileId])).rows[0];
    childIds.set(child.localKey, row.id);
  }
  for (const selection of evaluated.selections) await client.query("insert into family_offer_child_selections(revision_id,draft_child_id,canonical_product_or_component_id,package_version_id,package_component_id,product_id,product_type,service_mode,program_id,title_snapshot,sale_gross_minor,currency) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [revision.id, childIds.get(selection.localKey), selection.canonicalProductOrComponentId, selection.packageVersionId, selection.packageComponentId, selection.productId, selection.r6ProductType, selection.serviceMode, selection.programId, selection.title, selection.saleGrossMinor, evaluated.currency]);
  await client.query("update family_offers set customer_user_id=$1,title=$2,current_revision_number=$3,updated_at=now() where id=$4", [customerId, String(title || current?.title || "Aile Teklifi").trim().slice(0, 240) || "Aile Teklifi", revisionNumber, id]);
  return { id, revisionNumber, evaluated };
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  const denied = requireMembership(principal, "OWNER");
  if (denied) return json(res, denied.status, denied.body);
  const id = offerIdFrom(req);
  if (id && !isR6OfferUuid(id)) return json(res, 400, { error: "FAMILY_OFFER_ID_INVALID" });
  if (!id && req.method === "GET") return json(res, 200, { offers: (await (async () => { const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect(); try { return (await client.query("select id,customer_user_id,title,status,current_revision_number,updated_at from family_offers where owner_user_id=$1 order by updated_at desc", [principal.user.id])).rows; } finally { client.release(); await pool.end(); } })()) });
  if (req.method === "GET") { const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect(); try { const result = await readFamilyOffer(client, id, principal.user.id); return result ? json(res, 200, { offer: result }) : json(res, 404, { error: "FAMILY_OFFER_NOT_FOUND" }); } finally { client.release(); await pool.end(); } }
  if (!["POST", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const body = await readBody(req); const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try { await client.query("begin"); if (id) await client.query("select pg_advisory_xact_lock(hashtext($1))", [`family-offer:${id}`]); const account = await customer(client, body.customerUserId); const result = await persistRevision(client, { offerId: id, ownerId: principal.user.id, customerId: account.id, title: body.title, draft: body.draft || body, expectedRevisionNumber: body.expectedRevisionNumber }); await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,'family_offer.revision_saved','family_offer',$2,'SUCCESS',$3,$4)", [principal.user.id, result.id, crypto.randomUUID(), JSON.stringify({ revisionNumber: result.revisionNumber, customerUserId: account.id })]); await client.query("commit"); return json(res, id ? 200 : 201, { offerId: result.id, revisionNumber: result.revisionNumber, preview: result.evaluated }); } catch (error) { try { await client.query("rollback"); } catch { /* preserve original error */ } return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "FAMILY_OFFER_CONFLICT" : error.code || error.message || "FAMILY_OFFER_UNAVAILABLE" }); } finally { client.release(); await pool.end(); }
}
