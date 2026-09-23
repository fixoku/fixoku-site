import crypto from "node:crypto";
import { requirePermission } from "../auth/authorization.js";

const PROTECTED_FIELDS = ["title", "description", "price_minor", "currency"];

const STUDENT_CORE001_PRICES = Object.freeze({
  "student-primary-baslangic": 55000,
  "student-primary-gelisim": 50000,
  "student-primary-dijital-yapay-zeka-sistemi": 350000,
  "student-primary-akilli-sistem": 450000,
  "student-primary-premium-egitim": 1199000,
  "student-primary-platinum-egitim": 1599000,
  "student-middle-baslangic": 55000,
  "student-middle-gelisim": 50000,
  "student-middle-dijital-yapay-zeka-sistemi": 350000,
  "student-middle-akilli-sistem": 450000,
  "student-middle-premium-egitim": 1199000,
  "student-middle-platinum-egitim": 1599000,
  "student-high-baslangic": 55000,
  "student-high-dijital-yapay-zeka-sistemi": 350000,
  "student-high-akilli-sistem": 400000,
  "student-high-premium-egitim": 1199000,
  "student-high-platinum-egitim": 1599000,
  "student-adult-baslangic": 55000,
  "student-adult-dijital-yapay-zeka-sistemi": 350000,
  "student-adult-akilli-sistem": 400000,
  "student-adult-premium-egitim": 1199000,
  "student-adult-platinum-egitim": 1599000,
  "student-middle-paragraf-egitim": 895000,
  "student-middle-paragraf-kitabi": 55000,
  "student-high-paragraf-egitim": 995000,
  "student-high-paragraf-kitabi": 55000,
});

const TRAINER_CORE001_PRICES = Object.freeze({
  "ilkokul-akici-hizli-okuma-egitimi": 1199000,
  "ortaokul-hizli-okuma-egitimi": 1199000,
  "lise-hizli-okuma-egitimi": 1199000,
  "yetiskin-hizli-okuma-egitimi": 1199000,
  "ortaokul-lise-yetiskin-hizli-okuma-egitimi": 1750000,
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs": 899000,
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt": 999000,
  "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set": 1250000,
});

export const CORE001_PUBLICATION_CATALOG = Object.freeze({
  STUDENT_COMMERCE: STUDENT_CORE001_PRICES,
  TRAINER_COMMERCE: TRAINER_CORE001_PRICES,
});

const publicationError = (code, status = 409, details = undefined) => Object.assign(new Error(code), { code, status, details });

function publicationTargets() {
  return [
    ...Object.entries(STUDENT_CORE001_PRICES).map(([slug, expectedPriceMinor]) => ({ slug, audience: "STUDENT", catalogScope: "STUDENT_COMMERCE", expectedPriceMinor })),
    ...Object.entries(TRAINER_CORE001_PRICES).map(([slug, expectedPriceMinor]) => ({ slug, audience: "TRAINER", catalogScope: "TRAINER_COMMERCE", expectedPriceMinor })),
  ];
}

function assertUuid(value, code = "PACKAGE_VERSION_ID_INVALID") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(String(value || ""))) throw publicationError(code, 400);
}

export async function resolveCore001PublicationTargets(client) {
  const expected = publicationTargets();
  const rows = (await client.query(`
    select p.id as package_id, p.slug, p.audience, p.catalog_scope, p.status as package_status,
      pv.id as version_id, pv.version_number, pv.status as version_status,
      coalesce(pv.price_gross_minor, pv.price_minor) as price_minor, pv.currency,
      coalesce((select count(*) from package_components pc where pc.package_version_id=pv.id and pc.is_active=true), 0)::int as active_component_count
    from packages p
    join package_versions pv on pv.package_id=p.id and pv.status='DRAFT'
    where p.slug=any($1::text[]) and p.catalog_scope in ('STUDENT_COMMERCE','TRAINER_COMMERCE')
    order by p.audience, p.slug, pv.version_number desc, pv.id
  `, [expected.map((item) => item.slug)])).rows;
  const bySlug = new Map();
  for (const row of rows) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
  }
  const missing = expected.filter((item) => !bySlug.has(item.slug)).map((item) => item.slug);
  if (missing.length || bySlug.size !== expected.length || rows.length !== expected.length) throw publicationError("CORE001_TARGET_SET_INVALID", 409, { missing, found: [...bySlug.keys()], draftCount: rows.length });
  return expected.map((item) => ({ ...item, ...bySlug.get(item.slug) }));
}

async function lockPublicationRows(client, targets) {
  const versionIds = targets.map((target) => target.version_id);
  const packageIds = [...new Set(targets.map((target) => target.package_id))];
  const lockedVersions = (await client.query(`
    select p.id as package_id, p.slug, p.audience, p.catalog_scope, p.status as package_status,
      pv.id as version_id, pv.version_number, pv.status as version_status,
      coalesce(pv.price_gross_minor, pv.price_minor) as price_minor, pv.currency
    from packages p join package_versions pv on pv.package_id=p.id
    where pv.id=any($1::uuid[]) and p.id=any($2::uuid[])
    order by p.id, pv.id
    for update of p, pv
  `, [versionIds, packageIds])).rows;
  if (lockedVersions.length !== targets.length || new Set(lockedVersions.map((row) => row.version_id)).size !== targets.length) throw publicationError("CORE001_TARGET_LOCK_FAILED");
  await client.query(`select id from package_components where package_version_id=any($1::uuid[]) order by package_version_id, id for update`, [versionIds]);
  return lockedVersions;
}

async function validatePublicationTargets(client, targets, lockedVersions) {
  const byVersion = new Map(lockedVersions.map((row) => [row.version_id, row]));
  const errors = [];
  for (const target of targets) {
    const row = byVersion.get(target.version_id);
    if (!row || row.package_id !== target.package_id || row.slug !== target.slug || row.audience !== target.audience || row.catalog_scope !== target.catalogScope) errors.push({ slug: target.slug, reason: "PACKAGE_IDENTITY_INVALID" });
    if (!row || row.version_status !== "DRAFT") errors.push({ slug: target.slug, reason: "PACKAGE_VERSION_NOT_DRAFT" });
    if (!row || Number(row.price_minor) !== Number(target.expectedPriceMinor) || String(row.currency || "").toUpperCase() !== "TRY") errors.push({ slug: target.slug, reason: "PACKAGE_PRICE_INVALID", actual: row?.price_minor, currency: row?.currency, expected: target.expectedPriceMinor });
  }
  const components = (await client.query(`
    select pc.package_version_id, pc.id, pc.component_type, pc.is_active, pc.quantity,
      coalesce(pc.physical_product_id, pc.reference_id) as product_id,
      pp.product_type, pp.is_active as product_is_active
    from package_components pc
    left join physical_products pp on pp.id=coalesce(pc.physical_product_id, pc.reference_id)
    where pc.package_version_id=any($1::uuid[]) and pc.is_active=true
    order by pc.package_version_id, pc.display_order, pc.id
  `, [targets.map((target) => target.version_id)])).rows;
  const grouped = new Map();
  for (const component of components) {
    if (!grouped.has(component.package_version_id)) grouped.set(component.package_version_id, []);
    grouped.get(component.package_version_id).push(component);
    if (component.component_type !== "TEXT_ITEM" && (!component.product_id || !component.product_is_active || !Number.isSafeInteger(Number(component.quantity)) || Number(component.quantity) < 1)) errors.push({ versionId: component.package_version_id, reason: "ACTIVE_COMPONENT_INVALID" });
  }
  for (const target of targets) {
    const active = grouped.get(target.version_id) || [];
    if (!active.length) errors.push({ slug: target.slug, reason: "ACTIVE_COMPONENTS_REQUIRED" });
    if (!active.some((item) => item.component_type !== "TEXT_ITEM" && item.product_is_active)) errors.push({ slug: target.slug, reason: "PACKAGE_PRODUCTS_REQUIRED" });
    for (const item of active) {
      if (item.component_type === "PHYSICAL_PRODUCT" && item.product_type !== "PHYSICAL") errors.push({ slug: target.slug, reason: "COMPONENT_PRODUCT_TYPE_INVALID" });
      if (item.component_type !== "TEXT_ITEM" && item.component_type !== "PHYSICAL_PRODUCT" && item.component_type !== "DIGITAL_ACCESS" && item.component_type !== "TRAINER_SERVICE") errors.push({ slug: target.slug, reason: "COMPONENT_TYPE_INVALID" });
    }
  }
  if (errors.length) throw publicationError("CORE001_PUBLICATION_VALIDATION_FAILED", 409, { errors });
}

/**
 * Publishes one or all CORE-001 package versions inside the caller's transaction.
 * The caller must issue BEGIN/COMMIT/ROLLBACK on the same client; no mutation is
 * performed until every target is locked and validated.
 */
export async function publishPackageVersionsAtomically(client, { targets = null, principal, correlationId = crypto.randomUUID() } = {}) {
  const denied = requirePermission(principal, "package.manage");
  if (denied || !principal?.memberships?.some((member) => member.status === "ACTIVE" && member.scopeType === "GLOBAL" && ["OWNER", "SUPER_ADMIN"].includes(member.role))) throw publicationError(denied?.body?.error || "FORBIDDEN", denied?.status || 403);
  const actorUserId = principal.user?.id;
  assertUuid(actorUserId, "AUDIT_ACTOR_INVALID");
  const actorMembership = principal.memberships.find((member) =>
    member.status === "ACTIVE"
    && member.scopeType === "GLOBAL"
    && member.scopeId == null
    && ["OWNER", "SUPER_ADMIN"].includes(member.role)
    && String(member.userId || "") === String(actorUserId),
  );
  if (!actorMembership) throw publicationError("AUDIT_ACTOR_MEMBERSHIP_MISMATCH", 403);
  const sessionUserId = principal.session?.user?.id;
  if (!sessionUserId) throw publicationError("AUTHENTICATED_ACTOR_REQUIRED", 403);
  const actorAuthority = (await client.query(`
    select u.id from platform_users u
    join platform_memberships m on m.user_id=u.id
    where u.id=$1 and u.auth_user_id=$2
      and m.user_id=$1 and m.role in ('OWNER','SUPER_ADMIN')
      and m.status='ACTIVE' and m.scope_type='GLOBAL' and m.scope_id is null
    limit 1
  `, [actorUserId, sessionUserId])).rows[0];
  if (!actorAuthority) throw publicationError("AUDIT_ACTOR_MEMBERSHIP_MISMATCH", 403);
  const resolved = targets?.length ? targets : await resolveCore001PublicationTargets(client);
  if (!resolved.length) throw publicationError("CORE001_TARGET_SET_EMPTY");
  const normalized = resolved.map((target) => {
    const catalogScope = target.catalogScope || target.catalog_scope;
    const expectedPriceMinor = CORE001_PUBLICATION_CATALOG[catalogScope]?.[target.slug];
    if (!Number.isSafeInteger(expectedPriceMinor) || target.expectedPriceMinor != null && target.expectedPriceMinor !== expectedPriceMinor) throw publicationError("CORE001_TARGET_PRICE_AUTHORITY_INVALID");
    return { ...target, catalogScope, expectedPriceMinor };
  });
  for (const target of normalized) assertUuid(target.version_id, "PACKAGE_VERSION_ID_INVALID");
  const locked = await lockPublicationRows(client, normalized);
  await validatePublicationTargets(client, normalized, locked);
  const packageIds = [...new Set(normalized.map((target) => target.package_id))];
  await client.query(`update package_versions set status='RETIRED', purchase_enabled=false, updated_at=now() where package_id=any($1::uuid[]) and status='PUBLISHED' and id<>all($2::uuid[])`, [packageIds, normalized.map((target) => target.version_id)]);
  const published = await client.query(`update package_versions set status='PUBLISHED', purchase_enabled=true, published_at=coalesce(published_at, now()), updated_at=now() where id=any($1::uuid[]) and status='DRAFT'`, [normalized.map((target) => target.version_id)]);
  if (published.rowCount !== normalized.length) throw publicationError("CORE001_PUBLISH_COUNT_MISMATCH");
  const packages = await client.query(`update packages p set status='PUBLISHED', physical_product=exists(select 1 from package_versions pv join package_components pc on pc.package_version_id=pv.id join physical_products pp on pp.id=coalesce(pc.physical_product_id,pc.reference_id) where pv.package_id=p.id and pv.id=any($2::uuid[]) and pc.is_active=true and pp.product_type='PHYSICAL'), updated_at=now() where p.id=any($1::uuid[])`, [packageIds, normalized.map((target) => target.version_id)]);
  if (packages.rowCount !== packageIds.length) throw publicationError("CORE001_PACKAGE_COUNT_MISMATCH");
  for (const target of normalized) {
    await client.query(`insert into platform_audit_events(actor_user_id, action, subject_type, subject_id, result, correlation_id, metadata_json) values($1,$2,'package_version',$3,'SUCCESS',$4,$5)`, [actorUserId, `${target.audience === "STUDENT" ? "student" : "trainer"}_commerce.package.published`, target.version_id, correlationId, JSON.stringify({ packageId: target.package_id, slug: target.slug, versionNumber: target.version_number, expectedPriceMinor: target.expectedPriceMinor })]);
  }
  return { published: normalized.length, studentPublished: normalized.filter((target) => target.audience === "STUDENT").length, trainerPublished: normalized.filter((target) => target.audience === "TRAINER").length, correlationId, targets: normalized };
}

export async function updatePackageVersion(client, versionId, patch) {
  const current = (await client.query("select * from package_versions where id=$1 for update", [versionId])).rows[0];
  if (!current) throw Object.assign(new Error("PACKAGE_VERSION_NOT_FOUND"), { code: "PACKAGE_VERSION_NOT_FOUND", status: 404 });
  const changed = PROTECTED_FIELDS.some((field) => patch[field] !== undefined && String(patch[field] ?? "") !== String(current[field] ?? ""));
  if (changed && ["PUBLISHED", "RETIRED"].includes(current.status)) throw Object.assign(new Error("PUBLISHED_VERSION_IMMUTABLE"), { code: "PUBLISHED_VERSION_IMMUTABLE", status: 409 });
  const next = { ...current, ...patch };
  await client.query("update package_versions set title=$1,description=$2,price_minor=$3,currency=$4,updated_at=now() where id=$5", [next.title, next.description, next.price_minor, next.currency, versionId]);
  return (await client.query("select * from package_versions where id=$1", [versionId])).rows[0];
}

export async function createDraftPackageVersion(client, packageId, fields) {
  const next = (await client.query("select coalesce(max(version_number),0)+1 as version from package_versions where package_id=$1", [packageId])).rows[0].version;
  return (await client.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status) values($1,$2,$3,$4,$5,$6,'DRAFT') returning *", [packageId, next, fields.title, fields.description, fields.price_minor ?? null, fields.currency ?? null])).rows[0];
}

export async function publishPackageVersion(client, versionId) {
  return (await client.query("update package_versions set status='PUBLISHED',published_at=now(),updated_at=now() where id=$1 and status='DRAFT' returning *", [versionId])).rows[0] ?? null;
}
