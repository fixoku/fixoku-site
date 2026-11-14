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

  if (position === previous.completedItems && position > 0) {
    const timing = await client.query(
      `select
         extract(epoch from
           (clock_timestamp()-updated_at)
         ) * 1000 >= 500 as allowed
       from trainer_curriculum_progress
       where trainer_user_id=$1
         and package_id=$2
         and manifest_sha256=$3
       for update`,
      [trainerUserId,packageId,manifestSha256]
    );

    if (timing.rows[0]?.allowed !== true) {
      throw fail("CURRICULUM_PROGRESS_TOO_FAST",429);
    }
  }

  if (position > previous.completedItems)
    throw fail("CURRICULUM_SEQUENCE_REQUIRED");

  if (position < previous.completedItems) {
    return {
      completedItems: previous.completedItems,
      completedAt: previous.completedAt,
      itemCount: items.length
    };
  }

  const completedItems = Math.max(
    previous.completedItems, position + 1
  );

  const result = await client.query(
    `insert into trainer_curriculum_progress
      (trainer_user_id,package_id,manifest_sha256,
       item_count,completed_items,completed_at,updated_at)
     values($1::uuid,$2::uuid,$3::text,$4::integer,$5::integer,
       case when $4::integer=$5::integer
         then clock_timestamp() else null::timestamptz end,
       clock_timestamp())
     on conflict(trainer_user_id,package_id,manifest_sha256)
     do update set
       completed_items=greatest(
         trainer_curriculum_progress.completed_items,
         excluded.completed_items),
       completed_at=coalesce(
         trainer_curriculum_progress.completed_at,
         excluded.completed_at),
       updated_at=clock_timestamp()
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

export async function loadCurrentCurriculumIdentity(slug) {
  if (
    typeof slug !== "string" ||
    !/^[a-z0-9-]+$/.test(slug)
  ) {
    throw fail("CURRICULUM_PACKAGE_INVALID",400);
  }

  const {default:fs} = await import("node:fs/promises");
  const {default:path} = await import("node:path");

  const {
    fetchPrivateObject,
    getDigitalStorageConfig,
    productionPrivateMediaAvailable
  } = await import("./digital-delivery.js");

  if (!productionPrivateMediaAvailable()) {
    throw fail("PRIVATE_MEDIA_UNAVAILABLE",503);
  }

  const storage = getDigitalStorageConfig();
  let manifest;

  try {
    if (["S3","R2"].includes(storage.provider)) {
      const response = await fetchPrivateObject(
        storage,
        `trainer-curriculum/${slug}/manifest.json`
      );

      if (!response.ok) {
        throw fail("CURRICULUM_MANIFEST_UNAVAILABLE",503);
      }

      manifest = await response.json();
    } else {
      const root = storage.provider === "LOCAL" && storage.root
        ? storage.root : "private";

      const file = path.resolve(
        root,
        "trainer-curriculum",
        slug,
        "manifest.json"
      );

      manifest = JSON.parse(
        await fs.readFile(file,"utf8")
      );
    }
  } catch {
    throw fail("CURRICULUM_MANIFEST_UNAVAILABLE",503);
  }

  const items = manifest?.items;

  if (!Array.isArray(items) || !items.length) {
    throw fail("CURRICULUM_MANIFEST_INVALID",503);
  }

  for (const item of items) {
    if (
      !item ||
      !Number.isInteger(Number(item.index)) ||
      !["slide","video"].includes(item.type) ||
      typeof item.file !== "string" ||
      !item.file ||
      path.basename(item.file) !== item.file ||
      (
        item.type === "slide"
          ? !/\.png$/i.test(item.file)
          : !/\.mp4$/i.test(item.file)
      )
    ) {
      throw fail("CURRICULUM_MANIFEST_INVALID",503);
    }
  }

  return {
    manifestSha256: curriculumIdentity(items),
    itemCount: items.length
  };
}
