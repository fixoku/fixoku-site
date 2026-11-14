import crypto from "node:crypto";

const fail = (code, status = 409) =>
  Object.assign(new Error(code), { code, status });

export function curriculumIdentity(items) {
  if (!Array.isArray(items) || !items.length)
    throw fail("CURRICULUM_EMPTY");

  const identity = items.map(item => ({
    index: Number(item.index),
    type: item.type,
    file: String(item.file)
  }));

  if (new Set(identity.map(x => x.index)).size !== identity.length)
    throw fail("CURRICULUM_DUPLICATE_INDEX");

  return crypto.createHash("sha256")
    .update(JSON.stringify(identity))
    .digest("hex");
}

export async function readCurriculumProgress(client, {
  trainerUserId, packageId, manifestSha256
}) {
  const result = await client.query(
    `select completed_items, item_count, completed_at
       from trainer_curriculum_progress
      where trainer_user_id=$1
        and package_id=$2
        and manifest_sha256=$3`,
    [trainerUserId, packageId, manifestSha256]
  );

  const row = result.rows[0];

  return {
    completedItems: Number(row?.completed_items || 0),
    completedAt: row?.completed_at || null
  };
}

export async function recordCurriculumItem(client, {
  trainerUserId, packageId, items, itemIndex
}) {
  const manifestSha256 = curriculumIdentity(items);
  const position = items.findIndex(
    item => Number(item.index) === Number(itemIndex)
  );

  if (position < 0)
    throw fail("CURRICULUM_ITEM_INVALID", 400);

  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`curriculum:${trainerUserId}:${packageId}`]
  );

  const previous = await readCurriculumProgress(client, {
    trainerUserId, packageId, manifestSha256
  });

  if (position > previous.completedItems)
    throw fail("CURRICULUM_SEQUENCE_REQUIRED");

  const completedItems = Math.max(
    previous.completedItems, position + 1
  );

  const result = await client.query(
    `insert into trainer_curriculum_progress
      (trainer_user_id,package_id,manifest_sha256,
       item_count,completed_items,completed_at)
     values($1,$2,$3,$4,$5,
       case when $4=$5 then now() else null end)
     on conflict(trainer_user_id,package_id,manifest_sha256)
     do update set
       completed_items=greatest(
         trainer_curriculum_progress.completed_items,
         excluded.completed_items),
       completed_at=coalesce(
         trainer_curriculum_progress.completed_at,
         excluded.completed_at),
       updated_at=now()
     returning completed_items,completed_at`,
    [trainerUserId,packageId,manifestSha256,
     items.length,completedItems]
  );

  return {
    completedItems: Number(result.rows[0].completed_items),
    completedAt: result.rows[0].completed_at,
    itemCount: items.length
  };
}