import pg from "pg";
import { z } from "zod";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const orderStatuses = ["PENDING_PAYMENT", "PAYMENT_FAILED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED", "PAYMENT_REVIEW"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const querySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(orderStatuses).optional(),
  from: z.string().regex(datePattern).optional(),
  to: z.string().regex(datePattern).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "totalMinor", "status"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const ordersDashboardStatuses = [...orderStatuses, "REJECTED"];
const ordersDashboardSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(ordersDashboardStatuses).optional(),
  scope: z.enum(["ALL", "STUDENT", "TRAINER"]).default("ALL"),
  paymentMethod: z.enum(["PAYTR", "BANK_TRANSFER"]).optional(),
  from: z.string().regex(datePattern),
  to: z.string().regex(datePattern),
  prevFrom: z.string().regex(datePattern),
  prevTo: z.string().regex(datePattern),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "totalMinor", "status"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

const sortColumns = Object.freeze({ createdAt: "o.created_at", totalMinor: "o.total_minor", status: "o.status" });
const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));

const n = (value) => Number(value || 0);
const stageLabel = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const cleanStudentTitle = (title, stage) => {
  const patterns = {
    PRIMARY: /^(İLKOKUL|İLK OKUL)\s*[-·:]?\s*/iu,
    MIDDLE: /^(ORTAOKUL|ORTA OKUL)\s*[-·:]?\s*/iu,
    HIGH: /^(LİSEL|LİSE)\s*[-·:]?\s*/iu,
    ADULT: /^(YETİŞKİN)\s*[-·:]?\s*/iu,
  };
  let value = String(title || "Paket");
  if (stage && patterns[stage]) value = value.replace(patterns[stage], "");
  return value.toLocaleLowerCase("tr-TR").split(/\s+/u).map((part) => part ? `${part.slice(0, 1).toLocaleUpperCase("tr-TR")}${part.slice(1)}` : "").join(" ");
};
const changePct = (current, previous) => {
  const c = n(current); const p = n(previous);
  if (p === 0) return c === 0 ? 0 : null;
  return Number((((c - p) / Math.abs(p)) * 100).toFixed(1));
};

function parseOverviewRange(url) {
  const period = ["DAILY", "WEEKLY", "MONTHLY"].includes(String(url.searchParams.get("period") || "").toUpperCase())
    ? String(url.searchParams.get("period")).toUpperCase()
    : "MONTHLY";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const prevFrom = url.searchParams.get("prevFrom");
  const prevTo = url.searchParams.get("prevTo");
  for (const [name, value] of Object.entries({ from, to, prevFrom, prevTo })) {
    if (!value || !datePattern.test(value)) {
      const error = new Error(`INVALID_${name.toUpperCase()}`);
      error.status = 400;
      throw error;
    }
  }
  return { period, from, to, prevFrom, prevTo };
}

function localParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${map.year}-${map.month}-${map.day}`, hour: Number(map.hour || 0) };
}

function trLabel(dateKey, period, hour = null) {
  if (period === "DAILY" && hour !== null) return `${String(hour).padStart(2, "0")}:00`;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" }).format(new Date(`${dateKey}T12:00:00+03:00`));
}

function enumerateDateKeys(from, to) {
  const result = [];
  const cursor = new Date(`${from}T12:00:00+03:00`);
  const end = new Date(`${to}T12:00:00+03:00`);
  while (cursor <= end && result.length < 800) {
    result.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function buildSeries(events, range) {
  if (range.period === "DAILY") {
    const slots = [0, 4, 8, 12, 16, 20];
    const rows = slots.map((hour) => ({ key: `${range.from}-${hour}`, label: trLabel(range.from, "DAILY", hour), studentMinor: 0, trainerMinor: 0, totalMinor: 0 }));
    for (const event of events) {
      const part = localParts(event.createdAt);
      if (part.date !== range.from) continue;
      const hour = Math.min(20, Math.floor(part.hour / 4) * 4);
      const row = rows.find((item) => item.key === `${range.from}-${hour}`);
      if (!row) continue;
      row.studentMinor += event.kind === "STUDENT" ? n(event.netMinor) : 0;
      row.trainerMinor += event.kind === "TRAINER" ? n(event.netMinor) : 0;
      row.totalMinor = row.studentMinor + row.trainerMinor;
    }
    return rows;
  }
  const dateKeys = enumerateDateKeys(range.from, range.to);
  const rows = dateKeys.map((date) => ({ key: date, label: trLabel(date, range.period), studentMinor: 0, trainerMinor: 0, totalMinor: 0 }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const event of events) {
    const part = localParts(event.createdAt);
    const row = byKey.get(part.date);
    if (!row) continue;
    row.studentMinor += event.kind === "STUDENT" ? n(event.netMinor) : 0;
    row.trainerMinor += event.kind === "TRAINER" ? n(event.netMinor) : 0;
    row.totalMinor = row.studentMinor + row.trainerMinor;
  }
  return rows;
}

// FIXOKU OWNER DASHBOARD V5.4 ALL-TIME + QA DATA CONSISTENCY
async function readOverview(pool, range) {
  const studentSummarySql = `
    select
      coalesce(sum(greatest(0,o.total_minor-coalesce((
        select sum(pt.amount_minor)::bigint
        from payment_intents pi
        join payment_transactions pt on pt.payment_intent_id=pi.id
        where pi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'
      ),0))),0)::bigint as "netMinor",
      coalesce(sum(case when o.status in ('PAID','PARTIALLY_REFUNDED') then (
        select coalesce(sum(oi.quantity),0) from order_items oi where oi.order_id=o.id
      ) else 0 end),0)::int as units
    from orders o
    where o.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')
      and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
      and coalesce(o.idempotency_key,'') not ilike 'demo-%'
      and coalesce(o.idempotency_key,'') not ilike 'test-%'
      and not exists (
        select 1 from order_items oi_demo
        where oi_demo.order_id=o.id
          and (
            coalesce(oi_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'qa-%'
          )
      )`;

  const trainerSummarySql = `
    select
      coalesce(sum(case when o.status='PAID' then o.total_minor else 0 end),0)::bigint as "netMinor",
      coalesce(sum(case when o.status='PAID' then (
        select coalesce(sum(i.quantity),0) from trainer_package_order_items i where i.order_id=o.id
      ) else 0 end),0)::int as units
    from trainer_package_orders o
    where o.status in ('PAID','REFUNDED')
      and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
      and coalesce(o.idempotency_key,'') not ilike 'demo-%'
      and coalesce(o.idempotency_key,'') not ilike 'test-%'
      and not exists (
        select 1 from trainer_package_order_items i_demo
        where i_demo.order_id=o.id
          and (
            coalesce(i_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'qa-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'qa-%'
          )
      )`;

  const [
    studentCurrent, studentPrevious, trainerCurrent, trainerPrevious,
    activeStudents, activeTrainers, pendingStudentOrders, pendingTrainerOrders,
    pendingAssignments, unpaidEarnings, unfinishedEnrollments,
    studentEvents, trainerEvents, studentTop, trainerTop, studentRecent, trainerRecent,
  ] = await Promise.all([
    pool.query(studentSummarySql, [range.from, range.to]),
    pool.query(studentSummarySql, [range.prevFrom, range.prevTo]),
    pool.query(trainerSummarySql, [range.from, range.to]),
    pool.query(trainerSummarySql, [range.prevFrom, range.prevTo]),
    pool.query(`
      select count(distinct sp.user_id)::int as count
      from student_profiles sp
      join platform_users u on u.id=sp.user_id
      where sp.status='ACTIVE'
        and u.email_verified=true
        and exists (
          select 1 from platform_memberships m
          where m.user_id=sp.user_id
            and m.role='STUDENT'
            and m.status='ACTIVE'
            and m.scope_type='STUDENT'
            and m.scope_id=sp.user_id
        )
    `),
    pool.query("select count(distinct m.user_id)::int as count from platform_memberships m where m.role='TRAINER' and m.status='ACTIVE'"),
    pool.query(`select count(*)::int as count from orders o where o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW')
      and coalesce(o.idempotency_key,'') not ilike 'demo-%'
      and coalesce(o.idempotency_key,'') not ilike 'test-%'
      and not exists (
        select 1 from order_items oi_demo
        where oi_demo.order_id=o.id
          and (
            coalesce(oi_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'qa-%'
          )
      )`),
    pool.query(`select count(*)::int as count from trainer_package_orders o where o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW')
      and not exists (
        select 1 from trainer_package_order_items i_demo
        where i_demo.order_id=o.id
          and (
            coalesce(i_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'qa-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'qa-%'
          )
      )`),
    pool.query("select count(*)::int as count from trainer_assignment_requests where status='PENDING'"),
    pool.query("select coalesce(sum(amount_minor),0)::bigint as amount from trainer_earning_ledger where status in ('EARNED','PAYABLE')"),
    pool.query("select count(*)::int as count from enrollments where status in ('ACTIVE','PAUSED')"),
    pool.query(`
      select o.created_at as "createdAt",
        greatest(0,o.total_minor-coalesce((
          select sum(pt.amount_minor)::bigint
          from payment_intents pi join payment_transactions pt on pt.payment_intent_id=pi.id
          where pi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'
        ),0))::bigint as "netMinor"
      from orders o
      where o.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')
        and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
        and not exists (
        select 1 from order_items oi_demo
        where oi_demo.order_id=o.id
          and (
            coalesce(oi_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'qa-%'
          )
      )
      order by o.created_at`, [range.from, range.to]),
    pool.query(`
      select o.created_at as "createdAt",
        (case when o.status='PAID' then o.total_minor else 0 end)::bigint as "netMinor"
      from trainer_package_orders o
      where o.status in ('PAID','REFUNDED')
        and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
        and not exists (
        select 1 from trainer_package_order_items i_demo
        where i_demo.order_id=o.id
          and (
            coalesce(i_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'qa-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'qa-%'
          )
      )
      order by o.created_at`, [range.from, range.to]),
    pool.query(`
      select
        oi.package_version_id as "packageVersionId",
        oi.title_snapshot as title,
        p.education_stage as "educationStage",
        sum(case when o.status in ('PAID','PARTIALLY_REFUNDED') then oi.quantity else 0 end)::int as units,
        sum(greatest(0,oi.total_minor - case when o.total_minor > 0 then round(
          coalesce((select sum(pt.amount_minor)::numeric
            from payment_intents pi join payment_transactions pt on pt.payment_intent_id=pi.id
            where pi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'),0)
          * oi.total_minor::numeric / o.total_minor::numeric
        )::bigint else 0 end))::bigint as "netMinor"
      from order_items oi
      join orders o on o.id=oi.order_id
      join packages p on p.id=oi.package_id
      where o.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED')
        and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
        and coalesce(oi.title_snapshot,'') not ilike 'demo-%'
        and coalesce(oi.title_snapshot,'') not ilike 'test-%'
        and coalesce(oi.title_snapshot,'') not ilike 'qa-%'
      group by oi.package_version_id,oi.title_snapshot,p.education_stage`, [range.from, range.to]),
    pool.query(`
      select
        i.package_version_id as "packageVersionId",
        i.title_snapshot as title,
        sum(i.quantity)::int as units,
        sum(i.line_total_minor)::bigint as "netMinor"
      from trainer_package_order_items i
      join trainer_package_orders o on o.id=i.order_id
      where o.status='PAID'
        and o.created_at >= $1::date and o.created_at < ($2::date + interval '1 day')
        and coalesce(i.title_snapshot,'') not ilike 'demo-%'
        and coalesce(i.title_snapshot,'') not ilike 'test-%'
        and coalesce(i.title_snapshot,'') not ilike 'qa-%'
        and coalesce(i.sku_snapshot,'') not ilike 'demo-%'
        and coalesce(i.sku_snapshot,'') not ilike 'test-%'
        and coalesce(i.sku_snapshot,'') not ilike 'qa-%'
      group by i.package_version_id,i.title_snapshot`, [range.from, range.to]),
    pool.query(`
      select o.id,o.created_at as "createdAt",o.status,o.payment_method as "paymentMethod",o.total_minor as "totalMinor",o.currency,
        buyer.display_name as "customerName",
        coalesce(nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),beneficiary.display_name) as "beneficiaryName",
        coalesce((select oi.title_snapshot from order_items oi where oi.order_id=o.id order by oi.created_at,oi.id limit 1),'Paket') as "packageTitle",
        coalesce((select p.education_stage::text from order_items oi join packages p on p.id=oi.package_id where oi.order_id=o.id order by oi.created_at,oi.id limit 1),null) as "educationStage"
      from orders o
      join platform_users buyer on buyer.id=o.buyer_user_id
      join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id
      left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id
      where coalesce(o.idempotency_key,'') not ilike 'demo-%'
        and coalesce(o.idempotency_key,'') not ilike 'test-%'
        and not exists (
        select 1 from order_items oi_demo
        where oi_demo.order_id=o.id
          and (
            coalesce(oi_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(oi_demo.title_snapshot,'') ilike 'qa-%'
          )
      )
      order by o.created_at desc limit 12`),
    pool.query(`
      select o.id,o.created_at as "createdAt",o.status,o.payment_method as "paymentMethod",o.total_minor as "totalMinor",o.currency,
        u.display_name as "customerName",u.display_name as "beneficiaryName",
        coalesce((select i.title_snapshot from trainer_package_order_items i where i.order_id=o.id order by i.created_at,i.id limit 1),'Eğitmen paketi') as "packageTitle"
      from trainer_package_orders o
      join platform_users u on u.id=o.trainer_user_id
      where not exists (
        select 1 from trainer_package_order_items i_demo
        where i_demo.order_id=o.id
          and (
            coalesce(i_demo.title_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.title_snapshot,'') ilike 'qa-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'demo-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'test-%'
            or coalesce(i_demo.sku_snapshot,'') ilike 'qa-%'
          )
      )
      order by o.created_at desc limit 12`),
  ]);

  const sc = studentCurrent.rows[0] || {}; const sp = studentPrevious.rows[0] || {};
  const tc = trainerCurrent.rows[0] || {}; const tp = trainerPrevious.rows[0] || {};
  const current = {
    studentNetMinor: n(sc.netMinor), studentUnits: n(sc.units),
    trainerNetMinor: n(tc.netMinor), trainerUnits: n(tc.units),
  };
  current.totalNetMinor = current.studentNetMinor + current.trainerNetMinor;
  current.totalUnits = current.studentUnits + current.trainerUnits;
  current.averageMinor = current.totalUnits > 0 ? Math.round(current.totalNetMinor / current.totalUnits) : 0;

  const previous = {
    studentNetMinor: n(sp.netMinor), studentUnits: n(sp.units),
    trainerNetMinor: n(tp.netMinor), trainerUnits: n(tp.units),
  };
  previous.totalNetMinor = previous.studentNetMinor + previous.trainerNetMinor;
  previous.totalUnits = previous.studentUnits + previous.trainerUnits;
  previous.averageMinor = previous.totalUnits > 0 ? Math.round(previous.totalNetMinor / previous.totalUnits) : 0;

  const events = [
    ...studentEvents.rows.map((row) => ({ ...row, kind: "STUDENT" })),
    ...trainerEvents.rows.map((row) => ({ ...row, kind: "TRAINER" })),
  ];
  const series = buildSeries(events, range);

  const topPackages = [
    ...studentTop.rows.map((row) => ({
      key: `STUDENT:${row.packageVersionId}`,
      audience: "STUDENT",
      title: `${stageLabel[row.educationStage] || row.educationStage || "Öğrenci"} - ${cleanStudentTitle(row.title, row.educationStage)}`,
      units: n(row.units),
      netMinor: n(row.netMinor),
    })),
    ...trainerTop.rows.map((row) => ({
      key: `TRAINER:${row.packageVersionId}`,
      audience: "TRAINER",
      title: `Eğitmen - ${row.title}`,
      units: n(row.units),
      netMinor: n(row.netMinor),
    })),
  ].filter((item) => item.units > 0 || item.netMinor > 0).sort((a, b) => b.netMinor - a.netMinor).slice(0, 5);

  const recentOrders = [
    ...studentRecent.rows.map((row) => ({ ...row, kind: "STUDENT" })),
    ...trainerRecent.rows.map((row) => ({ ...row, kind: "TRAINER", educationStage: null })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return {
    period: range.period,
    range,
    current,
    previous,
    change: {
      totalRevenuePct: changePct(current.totalNetMinor, previous.totalNetMinor),
      totalUnitsPct: changePct(current.totalUnits, previous.totalUnits),
      studentRevenuePct: changePct(current.studentNetMinor, previous.studentNetMinor),
      studentUnitsPct: changePct(current.studentUnits, previous.studentUnits),
      trainerRevenuePct: changePct(current.trainerNetMinor, previous.trainerNetMinor),
      trainerUnitsPct: changePct(current.trainerUnits, previous.trainerUnits),
      averagePct: changePct(current.averageMinor, previous.averageMinor),
    },
    activeStudents: n(activeStudents.rows[0]?.count),
    activeTrainers: n(activeTrainers.rows[0]?.count),
    pending: {
      payments: n(pendingStudentOrders.rows[0]?.count) + n(pendingTrainerOrders.rows[0]?.count),
      assignments: n(pendingAssignments.rows[0]?.count),
      unpaidEarningsMinor: n(unpaidEarnings.rows[0]?.amount),
      unfinishedTrainings: n(unfinishedEnrollments.rows[0]?.count),
    },
    series,
    topPackages,
    recentOrders,
  };
}


const combinedOrdersSql = `
  select
    'STUDENT'::text as kind,
    o.id,
    o.created_at,
    o.status::text as status,
    o.currency,
    o.total_minor::bigint as total_minor,
    coalesce(o.payment_method::text, case when upper(coalesce(pi.provider,''))='PAYTR' then 'PAYTR' else null end) as payment_method,
    pi.status::text as payment_status,
    buyer.display_name as customer_name,
    buyer.email as customer_email,
    coalesce(nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),beneficiary.display_name) as beneficiary_name,
    coalesce((select oi.title_snapshot from order_items oi where oi.order_id=o.id order by oi.created_at,oi.id limit 1),'Paket') as package_title,
    coalesce((select p.education_stage::text from order_items oi join packages p on p.id=oi.package_id where oi.order_id=o.id order by oi.created_at,oi.id limit 1),null) as education_stage,
    coalesce((select count(*)::int from order_items oi where oi.order_id=o.id),0) as item_count,
    coalesce((select sum(pt.amount_minor)::bigint
      from payment_intents rpi
      join payment_transactions pt on pt.payment_intent_id=rpi.id
      where rpi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'),0)::bigint as refund_minor,
    case when o.status in ('PAID','PARTIALLY_REFUNDED','REFUNDED') then
      greatest(0,o.total_minor - coalesce((select sum(pt.amount_minor)::bigint
        from payment_intents rpi
        join payment_transactions pt on pt.payment_intent_id=rpi.id
        where rpi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'),0))
      else 0 end::bigint as net_minor
  from orders o
  join platform_users buyer on buyer.id=o.buyer_user_id
  join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id
  left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id
  left join payment_intents pi on pi.order_id=o.id
  where coalesce(o.idempotency_key,'') not ilike 'demo-%'
    and coalesce(o.idempotency_key,'') not ilike 'test-%'
    and not exists (
      select 1 from order_items oi_demo
      where oi_demo.order_id=o.id
        and (
          coalesce(oi_demo.title_snapshot,'') ilike 'demo-%'
          or coalesce(oi_demo.title_snapshot,'') ilike 'test-%'
        )
    )

  union all

  select
    'TRAINER'::text as kind,
    o.id,
    o.created_at,
    o.status::text as status,
    o.currency,
    o.total_minor::bigint as total_minor,
    o.payment_method::text as payment_method,
    case
      when o.status='PAID' then 'SUCCEEDED'
      when o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW') then 'PENDING'
      when o.status='REFUNDED' then 'REFUNDED'
      when o.status in ('REJECTED','CANCELLED') then 'FAILED'
      else null
    end::text as payment_status,
    u.display_name as customer_name,
    u.email as customer_email,
    u.display_name as beneficiary_name,
    coalesce((select i.title_snapshot from trainer_package_order_items i where i.order_id=o.id order by i.created_at,i.id limit 1),'Eğitmen paketi') as package_title,
    null::text as education_stage,
    coalesce((select count(*)::int from trainer_package_order_items i where i.order_id=o.id),0) as item_count,
    case when o.status='REFUNDED' then o.total_minor else 0 end::bigint as refund_minor,
    case when o.status='PAID' then o.total_minor else 0 end::bigint as net_minor
  from trainer_package_orders o
  join platform_users u on u.id=o.trainer_user_id
  where coalesce(o.idempotency_key,'') not ilike 'demo-%'
    and coalesce(o.idempotency_key,'') not ilike 'test-%'
    and not exists (
      select 1 from trainer_package_order_items i_demo
      where i_demo.order_id=o.id
        and (
          coalesce(i_demo.title_snapshot,'') ilike 'demo-%'
          or coalesce(i_demo.title_snapshot,'') ilike 'test-%'
          or coalesce(i_demo.sku_snapshot,'') ilike 'demo-%'
          or coalesce(i_demo.sku_snapshot,'') ilike 'test-%'
        )
    )
`;

const combinedSortColumns = Object.freeze({ createdAt: "c.created_at", totalMinor: "c.total_minor", status: "c.status" });

function buildOrdersDashboardWhere(input, from, to, includeStatus = true, includeSearch = true) {
  const values = [from, to];
  const conditions = [
    `c.created_at >= $1::date`,
    `c.created_at < ($2::date + interval '1 day')`,
  ];
  if (input.scope !== "ALL") {
    values.push(input.scope);
    conditions.push(`c.kind = $${values.length}`);
  }
  if (input.paymentMethod) {
    values.push(input.paymentMethod);
    conditions.push(`c.payment_method = $${values.length}`);
  }
  if (includeStatus && input.status) {
    values.push(input.status);
    conditions.push(`c.status = $${values.length}`);
  }
  if (includeSearch && input.search) {
    values.push(`%${input.search}%`);
    const i = values.length;
    conditions.push(`(
      c.id::text ilike $${i}
      or coalesce(c.customer_name,'') ilike $${i}
      or coalesce(c.customer_email,'') ilike $${i}
      or coalesce(c.beneficiary_name,'') ilike $${i}
      or coalesce(c.package_title,'') ilike $${i}
    )`);
  }
  return { values, where: `where ${conditions.join(" and ")}` };
}

async function readOrdersDashboard(pool, input) {
  const currentWhere = buildOrdersDashboardWhere(input, input.from, input.to);
  const previousWhere = buildOrdersDashboardWhere(input, input.prevFrom, input.prevTo);

  const metricSql = (where) => `
    with combined as (${combinedOrdersSql})
    select
      count(*)::int as "totalOrders",
      coalesce(sum(c.net_minor),0)::bigint as "netMinor",
      count(*) filter (where c.status in ('PENDING_PAYMENT','PAYMENT_REVIEW'))::int as "pendingCount",
      count(*) filter (where c.status in ('PAYMENT_FAILED','PARTIALLY_REFUNDED','REFUNDED','CANCELLED','REJECTED'))::int as "issueCount"
    from combined c
    ${where}
  `;

  const [currentMetrics, previousMetrics] = await Promise.all([
    pool.query(metricSql(currentWhere.where), currentWhere.values),
    pool.query(metricSql(previousWhere.where), previousWhere.values),
  ]);

  const countResult = await pool.query(
    `with combined as (${combinedOrdersSql}) select count(*)::int as total from combined c ${currentWhere.where}`,
    currentWhere.values,
  );

  const listValues = [...currentWhere.values, input.pageSize, (input.page - 1) * input.pageSize];
  const rows = (await pool.query(`
    with combined as (${combinedOrdersSql})
    select *
    from combined c
    ${currentWhere.where}
    order by ${combinedSortColumns[input.sort]} ${input.direction === "asc" ? "asc" : "desc"}, c.id desc
    limit $${currentWhere.values.length + 1} offset $${currentWhere.values.length + 2}
  `, listValues)).rows;

  const quick = (await pool.query(`
    with combined as (${combinedOrdersSql})
    select
      count(*) filter (
        where c.created_at >= (current_date at time zone 'Europe/Istanbul')
          and c.created_at < ((current_date + interval '1 day') at time zone 'Europe/Istanbul')
      )::int as "todayOrders",
      count(*) filter (
        where c.payment_method='BANK_TRANSFER'
          and c.status in ('PENDING_PAYMENT','PAYMENT_REVIEW')
      )::int as "pendingBankTransfers",
      count(*) filter (
        where c.status in ('PARTIALLY_REFUNDED','REFUNDED')
      )::int as "refundCount",
      count(*) filter (
        where c.created_at >= now() - interval '7 days'
          and c.status='PAID'
      )::int as "paidLast7",
      count(*) filter (
        where c.created_at >= now() - interval '7 days'
      )::int as "ordersLast7"
    from combined c
  `)).rows[0] || {};

  const total = Number(countResult.rows[0]?.total || 0);
  const current = currentMetrics.rows[0] || {};
  const previous = previousMetrics.rows[0] || {};
  const ordersLast7 = Number(quick.ordersLast7 || 0);
  const paidLast7 = Number(quick.paidLast7 || 0);

  return {
    orders: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      createdAt: row.created_at,
      status: row.status,
      currency: row.currency,
      totalMinor: Number(row.total_minor || 0),
      netMinor: Number(row.net_minor || 0),
      refundMinor: Number(row.refund_minor || 0),
      paymentMethod: row.payment_method || null,
      paymentStatus: row.payment_status || null,
      customerName: row.customer_name || "—",
      customerEmail: row.customer_email || "",
      beneficiaryName: row.beneficiary_name || "—",
      packageTitle: row.package_title || "Paket",
      educationStage: row.education_stage || null,
      itemCount: Number(row.item_count || 0),
    })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
    },
    metrics: {
      totalOrders: Number(current.totalOrders || 0),
      netMinor: Number(current.netMinor || 0),
      pendingCount: Number(current.pendingCount || 0),
      issueCount: Number(current.issueCount || 0),
    },
    previous: {
      totalOrders: Number(previous.totalOrders || 0),
      netMinor: Number(previous.netMinor || 0),
      pendingCount: Number(previous.pendingCount || 0),
      issueCount: Number(previous.issueCount || 0),
    },
    quick: {
      todayOrders: Number(quick.todayOrders || 0),
      pendingBankTransfers: Number(quick.pendingBankTransfers || 0),
      refundCount: Number(quick.refundCount || 0),
      last7ConversionPct: ordersLast7 > 0 ? Number(((paidLast7 / ordersLast7) * 100).toFixed(1)) : 0,
    },
    range: { from: input.from, to: input.to, prevFrom: input.prevFrom, prevTo: input.prevTo },
  };
}


export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
    const denied = requirePermission(principal, "order.read");
    if (denied) return json(res, denied.status, denied.body);
    const url = new URL(req.url || "/api/admin/orders", "http://local");
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      if (url.searchParams.get("ordersDashboard") === "1") {
        const financeDenied = requirePermission(principal, "finance.read");
        if (financeDenied) return json(res, financeDenied.status, financeDenied.body);
        const parsedDashboard = ordersDashboardSchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsedDashboard.success) return json(res, 400, { error: "INVALID_ORDERS_DASHBOARD_QUERY" });
        return json(res, 200, await readOrdersDashboard(pool, parsedDashboard.data));
      }

      if (url.searchParams.get("overview") === "1") {
        const financeDenied = requirePermission(principal, "finance.read");
        if (financeDenied) return json(res, financeDenied.status, financeDenied.body);
        return json(res, 200, await readOverview(pool, parseOverviewRange(url)));
      }

      const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
      if (!parsed.success) return json(res, 400, { error: "INVALID_QUERY" });
      const { search, status, from, to, page, pageSize, sort, direction } = parsed.data;
      const conditions = []; const values = [];
      if (status) { values.push(status); conditions.push(`o.status = $${values.length}`); }
      if (from) { values.push(from); conditions.push(`o.created_at >= $${values.length}::date`); }
      if (to) { values.push(to); conditions.push(`o.created_at < ($${values.length}::date + interval '1 day')`); }
      if (search) { values.push(`%${search}%`); const index = values.length; conditions.push(`(o.id::text ilike $${index} or buyer.display_name ilike $${index} or buyer.email ilike $${index} or beneficiary.display_name ilike $${index} or concat_ws(' ', sp.first_name, sp.last_name) ilike $${index})`); }
      const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
      const countResult = await pool.query(`select count(*)::int as total from orders o join platform_users buyer on buyer.id=o.buyer_user_id join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id ${where}`, values);
      const statusRows = (await pool.query(`select o.status,count(*)::int as count from orders o join platform_users buyer on buyer.id=o.buyer_user_id join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id ${where} group by o.status`, values)).rows;
      const statusSummary = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count || 0)]));
      const listValues = [...values, pageSize, (page - 1) * pageSize];
      const rows = (await pool.query(`select
        o.id,
        o.created_at as "createdAt",
        o.status,
        o.currency,
        o.subtotal_minor as "subtotalMinor",
        o.shipping_minor as "shippingMinor",
        o.total_minor as "totalMinor",
        o.catalog_scope_snapshot as "catalogScopeSnapshot",
        o.payment_method as "paymentMethod",
        buyer.display_name as "buyerName",
        buyer.email as "buyerEmail",
        coalesce(nullif(trim(concat_ws(' ',sp.first_name,sp.last_name)),''),beneficiary.display_name) as "beneficiaryName",
        beneficiary.email as "beneficiaryEmail",
        pi.status as "paymentStatus",
        pi.provider as "paymentProvider",
        coalesce((select count(*)::int from order_items oi where oi.order_id=o.id),0) as "itemCount",
        coalesce((select json_agg(json_build_object(
          'id',oi.id,
          'packageId',oi.package_id,
          'packageVersionId',oi.package_version_id,
          'title',oi.title_snapshot,
          'quantity',oi.quantity,
          'totalMinor',oi.total_minor,
          'currency',oi.currency,
          'educationStage',pkg.education_stage,
          'packageSlug',pkg.slug
        ) order by oi.created_at,oi.id)
          from order_items oi
          join packages pkg on pkg.id=oi.package_id
          where oi.order_id=o.id),'[]'::json) as "items",
        coalesce((select sum(pt.amount_minor)::bigint
          from payment_intents rpi
          join payment_transactions pt on pt.payment_intent_id=rpi.id
          where rpi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'),0)::bigint as "refundMinor",
        greatest(0,o.total_minor - coalesce((select sum(pt.amount_minor)::bigint
          from payment_intents rpi
          join payment_transactions pt on pt.payment_intent_id=rpi.id
          where rpi.order_id=o.id and pt.transaction_type='REFUND' and pt.status='SUCCEEDED'),0))::bigint as "netMinor",
        coalesce((select count(*)::int from package_entitlements pe where pe.source_order_id=o.id and pe.status='ACTIVE'),0) as "activeEntitlementCount",
        coalesce((select count(*)::int from package_entitlement_enrollments pee join package_entitlements pe on pe.id=pee.package_entitlement_id where pe.source_order_id=o.id),0) as "enrollmentCount",
        coalesce((select count(*)::int from trainer_assignments ta join package_entitlement_enrollments pee on pee.enrollment_id=ta.enrollment_id join package_entitlements pe on pe.id=pee.package_entitlement_id where pe.source_order_id=o.id and ta.status='ACTIVE'),0) as "activeAssignmentCount",
        coalesce((select count(*)::int from trainer_assignment_requests tar join package_entitlement_enrollments pee on pee.enrollment_id=tar.enrollment_id join package_entitlements pe on pe.id=pee.package_entitlement_id where pe.source_order_id=o.id and tar.status='PENDING'),0) as "pendingAssignmentCount",
        coalesce((select count(distinct ped.training_program_id)::int from order_items oi join package_entitlement_definitions ped on ped.package_version_id=oi.package_version_id where oi.order_id=o.id),0) as "entitlementDefinitionCount"
      from orders o
      join platform_users buyer on buyer.id=o.buyer_user_id
      join platform_users beneficiary on beneficiary.id=o.beneficiary_student_user_id
      left join student_profiles sp on sp.user_id=o.beneficiary_student_user_id
      left join payment_intents pi on pi.order_id=o.id
      ${where}
      order by ${sortColumns[sort]} ${direction === "asc" ? "asc" : "desc"}
      limit $${values.length + 1} offset $${values.length + 2}`, listValues)).rows;

      return json(res, 200, {
        orders: rows.map((row) => ({
          ...row,
          subtotalMinor: Number(row.subtotalMinor || 0),
          shippingMinor: Number(row.shippingMinor || 0),
          totalMinor: Number(row.totalMinor || 0),
          refundMinor: Number(row.refundMinor || 0),
          netMinor: Number(row.netMinor || 0),
          itemCount: Number(row.itemCount || 0),
          activeEntitlementCount: Number(row.activeEntitlementCount || 0),
          enrollmentCount: Number(row.enrollmentCount || 0),
          activeAssignmentCount: Number(row.activeAssignmentCount || 0),
          pendingAssignmentCount: Number(row.pendingAssignmentCount || 0),
          entitlementDefinitionCount: Number(row.entitlementDefinitionCount || 0),
          items: Array.isArray(row.items) ? row.items.map((item) => ({ ...item, quantity: Number(item.quantity || 0), totalMinor: Number(item.totalMinor || 0) })) : [],
        })),
        statusSummary,
        pagination: { page, pageSize, total: Number(countResult.rows[0]?.total || 0) },
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error("ADMIN_ORDERS_UNAVAILABLE", error);
    return json(res, Number(error?.status || 503), { error: error?.message || "ADMIN_ORDERS_UNAVAILABLE" });
  }
}
