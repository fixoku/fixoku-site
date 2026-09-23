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

const fail = (code, status = 409) => Object.assign(new Error(code), { code, status });

export async function mapTrainerPackageVersion(client, { packageId, packageVersionId }) {
  const found = (await client.query(
    "select slug from packages where id=$1 and audience='TRAINER' and catalog_scope='TRAINER_COMMERCE'",
    [packageId],
  )).rows[0];
  const codes = TRAINER_PACKAGE_QUALIFICATIONS[found?.slug];
  // Fixtures and legacy physical trainer products can remain purchasable while
  // carrying no education qualification mapping. They receive the normal
  // entitlement and no expertise grant; canonical education slugs are strict.
  if (!codes) return [];
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

export async function hasActiveTrainerExpertise(client, trainerUserId, qualificationId) {
  const result = await client.query(`
    select exists(
      select 1 from platform_memberships m
      join r6_trainer_qualification_grants g on g.trainer_user_id=m.user_id
      where m.user_id=$1 and m.role='TRAINER' and m.status='ACTIVE'
        and g.qualification_id=$2 and g.status='ACTIVE'
        and (g.valid_until is null or g.valid_until>now())
    ) as eligible
  `, [trainerUserId, qualificationId]);
  return result.rows[0]?.eligible === true;
}

export async function assertActiveTrainerExpertise(client, trainerUserId, qualificationId) {
  if (!await hasActiveTrainerExpertise(client, trainerUserId, qualificationId)) throw fail("R6_TRAINER_NOT_ELIGIBLE", 403);
}
