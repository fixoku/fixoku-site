// Trainer education packages map to the existing R6 qualifications, but package
// access alone never grants teaching authority. The mapping is used by the
// explicit Owner authority path and by a future verified completion workflow.
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
 * Package payment or package access never proves teaching authority. Completion
 * grants are linked to persisted trainer_video_progress rows; explicit Owner
 * grants remain available through the qualification authority API.
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
        ${alias}.source='OWNER_MANUAL'
        and ${alias}.source_ref like 'COMPLETION:%'
        and ${alias}.granted_by is null
        and exists (
          select 1
          from trainer_video_progress vp
          where vp.trainer_user_id=${alias}.trainer_user_id
            and vp.package_id=${alias}.source_package_id
            and vp.video_index between 1001 and 1000 + split_part(${alias}.source_ref, ':', 3)::integer
            and vp.completed_at is not null
          group by vp.trainer_user_id,vp.package_id
          having count(distinct vp.video_index) >= split_part(${alias}.source_ref, ':', 3)::integer
        )
      )
      or (
        ${alias}.source='OWNER_MANUAL'
        and ${alias}.source_ref not like 'ENTITLEMENT:%'
        and ${alias}.source_ref not like 'COMPLETION:%'
        and ${alias}.granted_by is not null
      )
    )
  `;
}

/** Grant completion evidence without coupling payment or entitlement to expertise. */
export async function grantTrainerPackageCompletionExpertise(client, { trainerUserId, packageId, packageVersionId, lessonsCount }) {
  if (!Number.isInteger(lessonsCount) || lessonsCount < 1 || lessonsCount > 100) throw fail("TRAINER_COMPLETION_LESSONS_INVALID");
  const definitions = await mapTrainerPackageVersion(client, { packageId, packageVersionId });
  const sourceRef = `COMPLETION:${packageId}:${lessonsCount}`;
  let created = 0;
  for (const definition of definitions) {
    const result = await client.query(`
      insert into r6_trainer_qualification_grants
        (trainer_user_id,qualification_id,source,status,source_ref,source_package_id,granted_by)
      values($1,$2,'OWNER_MANUAL','ACTIVE',$3,$4,null)
      on conflict(trainer_user_id,qualification_id,source,source_ref) do nothing
      returning id`, [trainerUserId, definition.id, sourceRef, packageId]);
    created += result.rows.length;
  }
  return { created, sourceRef, definitions };
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
