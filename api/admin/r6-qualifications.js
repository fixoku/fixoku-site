import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { isUuid } from "../../src/server/domain/r6-training.js";
import { effectiveTrainerQualificationPredicate, TRAINER_BASE_QUALIFICATION_CODES } from "../../src/server/domain/trainer-expertise.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
const SOURCE = new Set(["PURCHASE", "OWNER_MANUAL"]);
const ACTION = new Set(["grant", "revoke", "refund"]);
const text = (value, max = 240) => String(value ?? "").trim().slice(0, max);

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const activeGrantPredicate = effectiveTrainerQualificationPredicate;

async function resolveQualification(client, body) {
  const id = text(body.qualificationId, 80);
  const code = text(body.qualificationCode, 80).toUpperCase();
  if (id && !isUuid(id)) throw Object.assign(new Error("QUALIFICATION_ID_INVALID"), { status: 400 });
  if (!id && !code) throw Object.assign(new Error("QUALIFICATION_REQUIRED"), { status: 400 });
  const row = (await client.query("select id,code,title,service_type as \"serviceType\",education_stage as \"educationStage\" from r6_qualification_definitions where ($1::uuid is not null and id=$1) or ($2::text <> '' and code=$2) limit 1", [id || null, code])).rows[0];
  if (!row) throw Object.assign(new Error("QUALIFICATION_NOT_FOUND"), { status: 404 });
  return row;
}

async function readQualificationProjection(client, trainerUserId = null) {
  const trainers = (await client.query(`
    select u.id,u.display_name as "displayName",u.email,
      coalesce(json_agg(json_build_object(
        'id',g.id,'qualificationId',qd.id,'code',qd.code,'title',qd.title,'serviceType',qd.service_type,
        'educationStage',qd.education_stage,'source',g.source,'sourceRef',g.source_ref,'status',g.status,
        'validUntil',g.valid_until,'grantedAt',g.granted_at,'revokedAt',g.revoked_at
      ) order by qd.code,g.source,g.source_ref) filter (where g.id is not null),'[]'::json) as grants,
      count(distinct g.qualification_id) filter (where qd.code = any($2::text[]) and ${activeGrantPredicate("g")})::int as "activeQualificationCount"
    from platform_users u
    join platform_memberships m on m.user_id=u.id and m.role='TRAINER' and m.status='ACTIVE'
    left join r6_trainer_qualification_grants g on g.trainer_user_id=u.id
    left join r6_qualification_definitions qd on qd.id=g.qualification_id
    where ($1::uuid is null or u.id=$1)
    group by u.id,u.display_name,u.email
    order by u.display_name,u.id
  `, [trainerUserId, TRAINER_BASE_QUALIFICATION_CODES])).rows;
  return trainers.map((trainer) => ({ ...trainer, seniorBadge: Number(trainer.activeQualificationCount) === TRAINER_BASE_QUALIFICATION_CODES.length }));
}

export default async function handler(req, res) {
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const manageDenied = requirePermission(principal, "qualification.manage");
  const readDenied = requirePermission(principal, "qualification.read", { role: "TRAINER" });
  const denied = req.method === "GET" ? (manageDenied && readDenied ? manageDenied : null) : manageDenied;
  if (denied) return json(res, denied.status, denied.body);
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const parsed = new URL(req.url || "http://local", "http://local");
      const trainerUserId = parsed.searchParams.get("trainerUserId") || (manageDenied ? principal.user.id : null);
      if (trainerUserId && !isUuid(trainerUserId)) return json(res, 400, { error: "TRAINER_ID_INVALID" });
      if (manageDenied && String(trainerUserId) !== String(principal.user.id)) return json(res, 403, { error: "TRAINER_SCOPE_DENIED" });
      const [trainers, definitions] = await Promise.all([
        readQualificationProjection(client, trainerUserId),
        client.query("select id,code,title,service_type as \"serviceType\",education_stage as \"educationStage\" from r6_qualification_definitions order by code").then((result) => result.rows),
      ]);
      return json(res, 200, { trainers, qualifications: definitions, seniorBadgeCode: "FIX_OKU_KIDEMLI_UZMAN" });
    }

    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: "INVALID_JSON" }); }
    const action = text(body.action || "grant", 20).toLowerCase();
    if (!ACTION.has(action)) return json(res, 400, { error: "INVALID_QUALIFICATION_ACTION" });
    const trainerUserId = text(body.trainerUserId, 80);
    if (!isUuid(trainerUserId)) return json(res, 400, { error: "TRAINER_ID_INVALID" });
    const source = text(body.source || "OWNER_MANUAL", 30).toUpperCase();
    if (!SOURCE.has(source)) return json(res, 400, { error: "INVALID_QUALIFICATION_SOURCE" });
    if (action === "refund" && source !== "PURCHASE") return json(res, 400, { error: "REFUND_SOURCE_MUST_BE_PURCHASE" });
    const sourceRef = text(body.sourceRef, 160);
    if (!sourceRef) return json(res, 400, { error: "SOURCE_REF_REQUIRED" });
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (validUntil && Number.isNaN(validUntil.getTime())) return json(res, 400, { error: "VALID_UNTIL_INVALID" });
    const reason = text(body.reason, 500) || null;

    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`r6-qualification:${trainerUserId}`]);
    const trainer = (await client.query("select id from platform_users where id=$1", [trainerUserId])).rows[0];
    if (!trainer) throw Object.assign(new Error("TRAINER_NOT_FOUND"), { status: 404 });
    const qualification = await resolveQualification(client, body);
    let grant;
    if (action === "grant") {
      grant = (await client.query(`
        insert into r6_trainer_qualification_grants
          (trainer_user_id,qualification_id,source,status,source_ref,granted_by,valid_until,revoked_at,revoked_by,revoke_reason)
        values ($1,$2,$3,'ACTIVE',$4,$5,$6,null,null,null)
        on conflict (trainer_user_id,qualification_id,source,source_ref) do update set
          status='ACTIVE',granted_by=excluded.granted_by,granted_at=now(),valid_until=excluded.valid_until,
          revoked_at=null,revoked_by=null,revoke_reason=null
        returning *
      `, [trainerUserId, qualification.id, source, sourceRef, principal.user.id, validUntil])).rows[0];
    } else {
      grant = (await client.query(`
        update r6_trainer_qualification_grants
        set status='REVOKED',revoked_at=now(),revoked_by=$1,revoke_reason=$2
        where trainer_user_id=$3 and qualification_id=$4 and source=$5 and source_ref=$6
        returning *
      `, [principal.user.id, reason || (action === "refund" ? "PURCHASE_REFUNDED" : "OWNER_REVOKED"), trainerUserId, qualification.id, source, sourceRef])).rows[0];
      if (!grant) throw Object.assign(new Error("QUALIFICATION_GRANT_NOT_FOUND"), { status: 404 });
    }
    const senior = Number((await client.query(`select count(distinct g.qualification_id)::int as count from r6_trainer_qualification_grants g join r6_qualification_definitions qd on qd.id=g.qualification_id where g.trainer_user_id=$1 and qd.code=any($2::text[]) and ${activeGrantPredicate("g")}`, [trainerUserId, TRAINER_BASE_QUALIFICATION_CODES])).rows[0]?.count || 0) === TRAINER_BASE_QUALIFICATION_CODES.length;
    await client.query("insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json) values($1,$2,'r6_trainer_qualification_grant',$3,'SUCCESS',$4,$5)", [principal.user.id, action === "grant" ? "r6.qualification.granted" : "r6.qualification.revoked", grant.id, crypto.randomUUID(), JSON.stringify({ trainerUserId, qualificationCode: qualification.code, source, sourceRef, seniorBadge: senior })]);
    await client.query("commit");
    return json(res, 200, { grant, qualification, seniorBadge: senior, status: grant.status });
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve original error */ }
    return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "QUALIFICATION_GRANT_CONFLICT" : error.message || "QUALIFICATION_UNAVAILABLE" });
  } finally {
    client.release();
    await pool.end();
  }
}

export { activeGrantPredicate, readQualificationProjection };
