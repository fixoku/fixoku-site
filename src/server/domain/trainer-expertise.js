// Trainer education purchases grant the existing R6 qualifications at settlement.
// Keep the catalog slugs here so a published package version is mapped before
// granting; an unknown trainer package fails closed instead of silently granting nothing.
export const TRAINER_PACKAGE_QUALIFICATIONS = Object.freeze({
  "ilkokul-akici-hizli-okuma-egitimi": ["PRIMARY_FAST"],
  "ortaokul-hizli-okuma-egitimi": ["MIDDLE_FAST"],
  "lise-hizli-okuma-egitimi": ["HIGH_FAST"],
  "yetiskin-hizli-okuma-egitimi": ["ADULT_FAST"],
  "ortaokul-lise-yetiskin-hizli-okuma-egitimi": ["MIDDLE_FAST", "HIGH_FAST", "ADULT_FAST"],
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs": ["MIDDLE_PARAGRAPH"],
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt": ["HIGH_PARAGRAPH"],
  "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set": ["MIDDLE_PARAGRAPH", "HIGH_PARAGRAPH"],
});

// These are the only qualifications that participate in the seven-badge
// projection. Keep this list in the domain layer so profile, student and
// Owner projections apply the same effective-grant rules.
export const TRAINER_BASE_QUALIFICATION_CODES = Object.freeze([
  "PRIMARY_FAST",
  "MIDDLE_FAST",
  "HIGH_FAST",
  "ADULT_FAST",
  "MIDDLE_PARAGRAPH",
  "HIGH_PARAGRAPH",
]);
export const TRAINER_SENIOR_BADGE_CODE = "FIX_OKU_KIDEMLI_UZMAN";

export function projectTrainerQualificationBadges(rows = []) {
  const byCode = new Map();
  for (const row of rows) {
    const code = String(row?.id || row?.code || "").trim().toUpperCase();
    if (!TRAINER_BASE_QUALIFICATION_CODES.includes(code) || byCode.has(code)) continue;
    byCode.set(code, {
      id: code,
      label: String(row?.label || row?.title || code),
    });
  }
  const badges = [...byCode.values()].sort((left, right) => left.label.localeCompare(right.label, "tr"));
  if (TRAINER_BASE_QUALIFICATION_CODES.every((code) => byCode.has(code))) {
    badges.push({ id: TRAINER_SENIOR_BADGE_CODE, label: "Usta Eğitmen" });
  }
  return badges;
}

const fail = (code, status = 409) => Object.assign(new Error(code), { code, status });

export async function mapTrainerPackageVersion(client, { packageId, packageVersionId }) {
  const found = (await client.query(
    `select p.slug,pv.title,
       exists(
         select 1 from package_components pc
         where pc.package_version_id=$2
           and pc.component_type='TRAINER_SERVICE'
           and pc.is_active=true
       ) as has_training_service
     from packages p
     join package_versions pv on pv.id=$2 and pv.package_id=p.id
     where p.id=$1 and p.audience='TRAINER' and p.catalog_scope='TRAINER_COMMERCE'`,
    [packageId, packageVersionId],
  )).rows[0];
  const codes = TRAINER_PACKAGE_QUALIFICATIONS[found?.slug];
  // Standalone books/software may be sold in the trainer domain without
  // granting teaching authority. An education package must have an explicit
  // canonical mapping; silently settling one without expertise is unsafe.
  const educationSignal = Boolean(found?.has_training_service)
    || /(?:eğitmen|egitmen|eğitim|egitim)/iu.test(`${found?.slug || ""} ${found?.title || ""}`);
  if (!codes) {
    if (educationSignal) throw fail("TRAINER_EXPERTISE_MAPPING_MISSING");
    return [];
  }
  const existing = (await client.query(`
    select q.id,q.code,q.title,q.service_type as "serviceType",q.education_stage as "educationStage"
    from r6_trainer_package_qualification_map m
    join r6_qualification_definitions q on q.id=m.qualification_id
    where m.package_version_id=$1 order by q.code
  `, [packageVersionId])).rows;
  if (existing.length === codes.length && existing.every((row) => codes.includes(row.code))) return existing;
  const definitions = (await client.query(
    "select id,code from r6_qualification_definitions where code=any($1::text[])",
    [codes],
  )).rows;
  if (definitions.length !== codes.length || definitions.some((row) => !codes.includes(row.code))) throw fail("TRAINER_EXPERTISE_DEFINITION_MISSING");
  for (const definition of definitions) await client.query(
    "insert into r6_trainer_package_qualification_map(package_version_id,qualification_id) values($1,$2) on conflict(package_version_id,qualification_id) do nothing",
    [packageVersionId, definition.id],
  );
  const mapped = (await client.query(`
    select q.code from r6_trainer_package_qualification_map m
    join r6_qualification_definitions q on q.id=m.qualification_id
    where m.package_version_id=$1
  `, [packageVersionId])).rows.map((row) => row.code);
  if (mapped.length !== codes.length || mapped.some((code) => !codes.includes(code))) throw fail("TRAINER_EXPERTISE_MAPPING_CONFLICT");
  return definitions;
}

export async function grantTrainerOrderExpertise(client, { trainerUserId, orderId, orderItems }) {
  let created = 0;
  for (const item of orderItems) {
    const definitions = await mapTrainerPackageVersion(client, { packageId: item.package_id, packageVersionId: item.package_version_id });
    for (const definition of definitions) {
      const result = await client.query(`
        insert into r6_trainer_qualification_grants
          (trainer_user_id,qualification_id,source,status,source_ref,source_order_id,source_order_item_id,source_package_id)
        values($1,$2,'PURCHASE','ACTIVE',$3,$4,$5,$6)
        on conflict(trainer_user_id,qualification_id,source,source_ref) do nothing
        returning id
      `, [trainerUserId, definition.id, `TRAINER_ORDER_ITEM:${item.id}`, orderId, item.id, item.package_id]);
      created += result.rows.length;
    }
  }
  return created;
}

/**
 * A qualification is effective only when its evidence is still valid.
 * PURCHASE requires a settled order and an active entitlement to the mapped
 * education package; package-based OWNER_MANUAL requires an active Owner gift.
 * An explicit (non-package) Owner grant remains allowed when granted_by is set.
 * This predicate is shared by the profile badges and the teaching permission gate.
 */
export function effectiveTrainerQualificationPredicate(alias = "g") {
  if (!/^[a-z][a-z0-9_]*$/i.test(alias)) throw new Error("INVALID_SQL_ALIAS");
  return `
    ${alias}.status='ACTIVE'
    and ${alias}.revoked_at is null
    and (${alias}.valid_until is null or ${alias}.valid_until > now())
    and (
      (
        ${alias}.source='PURCHASE'
        and exists (
          select 1
          from trainer_package_order_items oi
          join trainer_package_orders o on o.id=oi.order_id
          join trainer_package_entitlements e on e.source_order_id=o.id
          join r6_trainer_package_qualification_map m
            on m.package_version_id=oi.package_version_id
            and m.qualification_id=${alias}.qualification_id
          where oi.id=${alias}.source_order_item_id
            and o.id=${alias}.source_order_id
            and o.trainer_user_id=${alias}.trainer_user_id
            and o.status='PAID'
            and e.trainer_user_id=${alias}.trainer_user_id
            and e.package_id=oi.package_id
            and e.package_version_id=oi.package_version_id
            and e.status='ACTIVE'
            and e.revoked_at is null
        )
      )
      or (
        ${alias}.source='OWNER_MANUAL'
        and ${alias}.source_ref like 'ENTITLEMENT:%'
        and exists (
          select 1
          from trainer_package_entitlements e
          join r6_trainer_package_qualification_map m
            on m.package_version_id=e.package_version_id
            and m.qualification_id=${alias}.qualification_id
          where ${alias}.source_ref='ENTITLEMENT:' || e.id::text
            and e.trainer_user_id=${alias}.trainer_user_id
            and e.status='ACTIVE'
            and e.revoked_at is null
            and e.source='MANUAL_GIFT'
        )
      )
      or (
        ${alias}.source='OWNER_MANUAL'
        and ${alias}.source_ref not like 'ENTITLEMENT:%'
        and ${alias}.granted_by is not null
      )
    )
  `;
}

export async function hasActiveTrainerExpertise(client, trainerUserId, qualificationId) {
  const result = await client.query(`
    select exists(
      select 1 from platform_memberships m
      join r6_trainer_qualification_grants g on g.trainer_user_id=m.user_id
      where m.user_id=$1 and m.role='TRAINER' and m.status='ACTIVE'
        and g.qualification_id=$2
        and ${effectiveTrainerQualificationPredicate("g")}
    ) as eligible
  `, [trainerUserId, qualificationId]);
  return result.rows[0]?.eligible === true;
}

export async function assertActiveTrainerExpertise(client, trainerUserId, qualificationId) {
  if (!await hasActiveTrainerExpertise(client, trainerUserId, qualificationId)) throw fail("R6_TRAINER_NOT_ELIGIBLE", 403);
}
