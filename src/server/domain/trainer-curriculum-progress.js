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

const approvedCurriculumBridges = Object.freeze({
  "f4b81132280692f97eecf61e629775999bcae4788d008c9c5a80cbeb97a87421": {
    "previousIdentity": "6326313ccf716b414b2ceaf02687b34d0f672206bb02f5dbb45efa3b1695cc3e",
    "previousCount": 210,
    "itemCount": 208,
    "positions": [
      1,
      2,
      3,
      4,
      5,
      6,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120,
      121,
      122,
      123,
      124,
      125,
      126,
      127,
      128,
      129,
      130,
      131,
      132,
      133,
      134,
      135,
      136,
      137,
      138,
      139,
      140,
      141,
      142,
      143,
      144,
      145,
      146,
      147,
      148,
      149,
      150,
      151,
      152,
      153,
      154,
      155,
      156,
      157,
      158,
      159,
      160,
      161,
      162,
      163,
      164,
      165,
      166,
      167,
      168,
      169,
      170,
      171,
      172,
      173,
      174,
      175,
      176,
      177,
      178,
      179,
      180,
      181,
      182,
      183,
      184,
      185,
      186,
      187,
      188,
      189,
      190,
      191,
      192,
      193,
      194,
      195,
      196,
      197,
      198,
      199,
      200,
      201,
      202,
      203,
      204,
      205,
      206,
      207,
      208,
      209,
      210
    ]
  },
  "6652e7538d15b4808e1d51d9d3ac6e587e8c09e05b16b57b06630db6ef3ae5d4": {
    "previousIdentity": "8245db31fdff89da3a003e290f3cc050c49d66c4f15b13097a10af259623c157",
    "previousCount": 258,
    "itemCount": 256,
    "positions": [
      1,
      2,
      3,
      0,
      5,
      6,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120,
      121,
      122,
      123,
      124,
      125,
      126,
      127,
      128,
      129,
      130,
      131,
      132,
      133,
      134,
      135,
      136,
      137,
      138,
      139,
      140,
      141,
      142,
      143,
      144,
      145,
      146,
      147,
      148,
      149,
      150,
      151,
      152,
      153,
      154,
      155,
      156,
      157,
      158,
      159,
      160,
      161,
      162,
      163,
      164,
      165,
      166,
      167,
      168,
      169,
      170,
      171,
      172,
      173,
      174,
      175,
      176,
      177,
      178,
      179,
      180,
      181,
      182,
      183,
      184,
      185,
      186,
      187,
      188,
      189,
      190,
      191,
      192,
      193,
      194,
      195,
      196,
      197,
      198,
      199,
      200,
      201,
      202,
      203,
      204,
      205,
      206,
      207,
      208,
      209,
      210,
      211,
      212,
      213,
      214,
      215,
      216,
      217,
      218,
      219,
      220,
      221,
      222,
      223,
      224,
      225,
      226,
      227,
      228,
      229,
      230,
      231,
      232,
      233,
      234,
      235,
      236,
      237,
      238,
      239,
      240,
      241,
      242,
      243,
      244,
      245,
      246,
      247,
      248,
      249,
      250,
      251,
      252,
      253,
      254,
      255,
      256,
      257,
      258
    ]
  },
  "9ad0fab8b8d38df48fa84b103c0cd1b86e15ce94914fe1866eba63de847c03ff": {
    "previousIdentity": "3b9ac2d8d885d1a25a75464687a31135cab90dd630d10ee93d8a84922f135fef",
    "previousCount": 259,
    "itemCount": 257,
    "positions": [
      1,
      2,
      3,
      0,
      5,
      6,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51,
      52,
      53,
      54,
      55,
      56,
      57,
      58,
      59,
      60,
      61,
      62,
      63,
      64,
      65,
      66,
      67,
      68,
      69,
      70,
      71,
      72,
      73,
      74,
      75,
      76,
      77,
      78,
      79,
      80,
      81,
      82,
      83,
      84,
      85,
      86,
      87,
      88,
      89,
      90,
      91,
      92,
      93,
      94,
      95,
      96,
      97,
      98,
      99,
      100,
      101,
      102,
      103,
      104,
      105,
      106,
      107,
      108,
      109,
      110,
      111,
      112,
      113,
      114,
      115,
      116,
      117,
      118,
      119,
      120,
      121,
      122,
      123,
      124,
      125,
      126,
      127,
      128,
      129,
      130,
      131,
      132,
      133,
      134,
      135,
      136,
      137,
      138,
      139,
      140,
      141,
      142,
      143,
      144,
      145,
      146,
      147,
      148,
      149,
      150,
      151,
      152,
      153,
      154,
      155,
      156,
      157,
      158,
      159,
      160,
      161,
      162,
      163,
      164,
      165,
      166,
      167,
      168,
      169,
      170,
      171,
      172,
      173,
      174,
      175,
      176,
      177,
      178,
      179,
      180,
      181,
      182,
      183,
      184,
      185,
      186,
      187,
      188,
      189,
      190,
      191,
      192,
      193,
      194,
      195,
      196,
      197,
      198,
      199,
      200,
      201,
      202,
      203,
      204,
      205,
      206,
      207,
      208,
      209,
      210,
      211,
      212,
      213,
      214,
      215,
      216,
      217,
      218,
      219,
      220,
      221,
      222,
      223,
      224,
      225,
      226,
      227,
      228,
      229,
      230,
      231,
      232,
      233,
      234,
      235,
      236,
      237,
      238,
      239,
      240,
      241,
      242,
      243,
      244,
      245,
      246,
      247,
      248,
      249,
      250,
      251,
      252,
      253,
      254,
      255,
      256,
      257,
      258,
      259
    ]
  }
});

async function readPreviousCurriculumCredit(client, {
  trainerUserId, packageId, manifestSha256
}) {
  if (!Object.hasOwn(
    approvedCurriculumBridges, manifestSha256
  )) return null;

  const bridge = approvedCurriculumBridges[manifestSha256];

  const result = await client.query(
    `select completed_items,item_count
       from trainer_curriculum_progress
      where trainer_user_id=$1
        and package_id=$2
        and manifest_sha256=$3`,
    [trainerUserId,packageId,bridge.previousIdentity]
  );

  const row = result.rows[0];

  if (!row) return null;

  const completed = Number(row.completed_items);

  if (
    Number(row.item_count)!==bridge.previousCount ||
    !Number.isInteger(completed) ||
    completed<0 ||
    completed>bridge.previousCount
  ) throw fail("CURRICULUM_PREVIOUS_PROGRESS_INVALID");

  return {bridge,completed};
}

function extendVerifiedCurriculumCredit(position,credit) {
  if (!credit) return position;

  const {bridge,completed} = credit;
  let next = position;

  while (
    next<bridge.itemCount &&
    bridge.positions[next]>0 &&
    bridge.positions[next]<=completed
  ) next++;

  return next;
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

  const credit = await readPreviousCurriculumCredit(
    client,{trainerUserId,packageId,manifestSha256}
  );

  const stored = Number(row?.completed_items || 0);

  return {
    completedItems: extendVerifiedCurriculumCredit(stored,credit),
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

    if (timing.rows.length>0 &&
        timing.rows[0]?.allowed !== true) {
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

  const credit = await readPreviousCurriculumCredit(
    client,{trainerUserId,packageId,manifestSha256}
  );

  const completedItems = extendVerifiedCurriculumCredit(
    Math.max(previous.completedItems,position+1),
    credit
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
