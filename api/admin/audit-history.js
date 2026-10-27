import pg from "pg";
import { z } from "zod";
import { resolvePrincipal, requirePermission, validScopeType } from "../../src/server/auth/authorization.js";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s);
const querySchema = z.object({
  search: z.string().trim().max(100).default(""),
  result: z.string().trim().max(40).optional(),
  action: z.string().trim().max(120).optional(),
  category: z.enum(["all", "owner", "admin", "trainer", "student", "guardian", "system", "other"]).default("all"),
  domain: z.enum(["sales", "shipping", "finance", "training", "access", "test", "account"]).optional(),
  startDate: isoDay.optional(),
  endDate: isoDay.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
  export: z.enum(["0", "1"]).default("0"),
  exportSnapshot: z.string().datetime({ offset: true }).optional(),
  sort: z.enum(["createdAt", "action", "result"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).refine(x => !x.startDate || !x.endDate || x.startDate <= x.endDate);
const domainConditions = Object.freeze({
  sales: "(ae.action like '%order.%' or ae.action like '%package.%' or ae.action like 'r6.custom_offer.%')",
  shipping: "(ae.action like 'shipment.%' or ae.action like 'inventory.%')",
  training: "(ae.action like 'education.%' or ae.action like 'trainer.assignment.%' or ae.action like 'trainer.qualification.%' or ae.action like 'trainer.availability.%' or ae.action like 'r6.training_group.%' or ae.action like 'r6.training_participant.%' or ae.action like 'r6.qualification.%')",
  access: "(ae.action like 'owner_%' or ae.action like 'admin.%' or ae.action like 'permission.%' or ae.action like 'membership.manage')",
  test: "(ae.action like 'qa.%' or ae.action like 'staging.%' or ae.action like 'test.%')",
  account: "(ae.action like 'auth.%' or ae.action like 'account.%' or ae.action like 'user.session.%' or ae.action = 'membership.create')",
  finance: "(ae.action like '%payment.%' or ae.action like '%payout%' or ae.action like '%refund%' or ae.action like '%bank_transfer%')",
});
const sortColumns = Object.freeze({ createdAt: "ae.occurred_at", action: "ae.action", result: "ae.result" });
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = req => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
const isGlobalAdmin = principal => principal?.memberships?.some(m => ["OWNER", "SUPER_ADMIN"].includes(m.role) && validScopeType(m) && m.scopeType === "GLOBAL" && m.scopeId == null);

// V9: An event is assigned to exactly ONE actor group using ACTIVE CURRENT
// memberships, not the event action. Historical roles are not claimed.
// Precedence resolves multi-role accounts deterministically:
// OWNER > SUPER_ADMIN > TRAINER > STUDENT > GUARDIAN > unknown.
// The lateral aggregate reads roles ONCE per actor; NULL actor means system.
const actorGroupCase = `case
  when ae.actor_user_id is null then 'system'
  when 'OWNER' = any(coalesce(actor_group.roles, array[]::text[])) then 'owner'
  when 'SUPER_ADMIN' = any(coalesce(actor_group.roles, array[]::text[])) then 'admin'
  when 'TRAINER' = any(coalesce(actor_group.roles, array[]::text[])) then 'trainer'
  when 'STUDENT' = any(coalesce(actor_group.roles, array[]::text[])) then 'student'
  when 'GUARDIAN' = any(coalesce(actor_group.roles, array[]::text[])) then 'guardian'
  else 'other' end`;

// Topic filter does not change the actor group. One event can be both an
// Owner action and a training-related event, but only has ONE primary actor.

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "audit.read");
    if (denied) return json(res, denied.status, denied.body);
    if (!isGlobalAdmin(principal)) return json(res, 403, { error: "FORBIDDEN" });
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url || "/api/admin/audit-history", "http://local").searchParams));
    if (!parsed.success) return json(res, 400, { error: "INVALID_QUERY" });
    const { search, result, action, category, domain, startDate, endDate, page, pageSize, sort, direction } = parsed.data;
    // Stable upper time boundary for multi-page exports. No later inserts may shift the exported pages.
    const exportSnapshot = parsed.data.export === "1" ? (parsed.data.exportSnapshot || new Date().toISOString()) : null;
    const conditions = [];
    const values = [];
    if (exportSnapshot) { values.push(exportSnapshot); conditions.push(`ae.occurred_at <= $${values.length}::timestamptz`); }
    if (result) { values.push(result); conditions.push(`ae.result = $${values.length}`); }
    if (action) { values.push(`%${action}%`); conditions.push(`ae.action ilike $${values.length}`); }
    if (search) { values.push(`%${search}%`); const i = values.length; conditions.push(`(coalesce(actor.display_name,'') ilike $${i} or coalesce(actor.email,'') ilike $${i} or ae.action ilike $${i} or ae.subject_type ilike $${i} or ae.subject_id ilike $${i} or ae.correlation_id ilike $${i} or ae.id::text ilike $${i})`); }
    if (startDate) { values.push(startDate); conditions.push(`ae.occurred_at >= ($${values.length}::date::timestamp at time zone 'Europe/Istanbul')`); }
    if (endDate) { values.push(endDate); conditions.push(`ae.occurred_at < (($${values.length}::date + interval '1 day') at time zone 'Europe/Istanbul')`); }
    if (domain) conditions.push(domainConditions[domain]);
    const baseWhere = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const from = `from platform_audit_events ae
      left join platform_users actor on actor.id=ae.actor_user_id
      left join lateral (
        select coalesce(array_agg(distinct m.role::text), array[]::text[]) as roles
        from platform_memberships m
        where m.user_id = ae.actor_user_id and m.status = 'ACTIVE'
      ) actor_group on true`;
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 2 });
    try {
      // Özet ve sekme sayıları aynı tarih/arama/sonuç filtresini taşır; kategori toplamları değiştirilmez.
      const aggregate = (await pool.query(`select count(*)::int as total,
        count(*) filter (where ae.result = 'SUCCESS')::int as success,
        count(*) filter (where ae.result in ('FAILED','REJECTED'))::int as attention,
        count(*) filter (where (${actorGroupCase}) = 'owner')::int as owner,
        count(*) filter (where (${actorGroupCase}) = 'guardian')::int as guardian,
        count(*) filter (where (${actorGroupCase}) = 'other')::int as other,
        count(*) filter (where (${actorGroupCase}) = 'student')::int as student,
        count(*) filter (where (${actorGroupCase}) = 'trainer')::int as trainer,
        count(*) filter (where (${actorGroupCase}) = 'admin')::int as admin,
        count(*) filter (where (${actorGroupCase}) = 'system')::int as system,
        count(*) filter (where ${domainConditions.sales})::int as sales,
        count(*) filter (where ${domainConditions.shipping})::int as shipping,
        count(*) filter (where ${domainConditions.finance})::int as finance
        ${from} ${baseWhere}`, values)).rows[0];
      const scopedConditions = [...conditions];
      const scopedValues = [...values];
      if (category !== "all") { scopedValues.push(category); scopedConditions.push(`(${actorGroupCase}) = $${scopedValues.length}`); }
      const where = scopedConditions.length ? `where ${scopedConditions.join(" and ")}` : "";
      const count = (await pool.query(`select count(*)::int as total,
        count(*) filter (where ae.result = 'SUCCESS')::int as success,
        count(*) filter (where ae.result in ('FAILED','REJECTED'))::int as attention
        ${from} ${where}`, scopedValues)).rows[0];
      const listValues = [...scopedValues, pageSize, (page - 1) * pageSize];
      const events = (await pool.query(`select ae.id, ae.occurred_at as "createdAt", ae.actor_user_id as "actorUserId",
        actor.display_name as "actorName", actor.email as "actorEmail", ae.action,
        ae.subject_type as "subjectType", ae.subject_id as "subjectId", ae.result,
        ae.correlation_id as "correlationId", (${actorGroupCase}) as category,
        case when ae.actor_user_id is not null and (
          exists (select 1 from trainer_profiles tp where tp.user_id=ae.actor_user_id and tp.photo_storage_key is not null)
          or exists (select 1 from student_profiles sp where sp.user_id=ae.actor_user_id and sp.photo_storage_key is not null)
        ) then '/api/admin/audit-actor-photo?userId=' || ae.actor_user_id::text else null end as "actorPhotoUrl",
        actor_group.roles as "currentRoles"
        ${from} ${where} order by ${sortColumns[sort]} ${direction === "asc" ? "asc" : "desc"}, ae.id desc
        limit $${listValues.length - 1} offset $${listValues.length}`, listValues)).rows;
      const total = Number(count?.total || 0);
      // metadata_json asla istemciye gönderilmez: finansal, çocuk veya iletişim verileri içerebilir.
      // Counters must be exhaustive and disjoint for the active topic scope.
      const sumGroups = ['owner','admin','trainer','student','guardian','system','other']
        .reduce((sum, key) => sum + Number(aggregate?.[key] || 0), 0);
      if (sumGroups !== Number(aggregate?.total || 0))
        return json(res, 503, { error: 'AUDIT_ROLE_COUNT_MISMATCH' });
      return json(res, 200, { events, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }, summary: {
        total, success: Number(count?.success || 0), attention: Number(count?.attention || 0),
        categories: { owner: Number(aggregate?.owner || 0), guardian: Number(aggregate?.guardian || 0), other: Number(aggregate?.other || 0), student: Number(aggregate?.student || 0), trainer: Number(aggregate?.trainer || 0), admin: Number(aggregate?.admin || 0), system: Number(aggregate?.system || 0) }, domains: { sales: Number(aggregate?.sales || 0), shipping: Number(aggregate?.shipping || 0), finance: Number(aggregate?.finance || 0) }
      }, scope: { category, domain: domain || "all", actorRoleBasis: "CURRENT_ACTIVE_MEMBERSHIP", timezone: "Europe/Istanbul", historicalRoleAvailable: false, coverage: "RECORDED_AUDIT_EVENTS_ONLY", exportSnapshot } });
    } finally { await pool.end(); }
  } catch { return json(res, 503, { error: "AUDIT_HISTORY_UNAVAILABLE" }); }
}
