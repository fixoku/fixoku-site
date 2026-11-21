import pg from "../../src/server/db/guarded-pg.js";

import {
  resolvePrincipal,
  requireMembership
} from "../../src/server/auth/authorization.js";

import {
  validateBookParcelProfiles
} from "../../src/server/shipping/book-parcel-profiles-r408.js";

const json = (res,status,data) => {
  res.statusCode = status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, private");
  res.setHeader("X-Content-Type-Options","nosniff");
  return res.end(JSON.stringify(data));
};

const columns = `
  book_count as "bookCount",
  package_count as "packageCount",
  width_cm as "widthCm",
  length_cm as "lengthCm",
  height_cm as "heightCm",
  weight_kg as "weightKg",
  updated_at as "updatedAt"
`;

async function readProfiles(client) {
  const rows = (await client.query(`
    select ${columns}
    from public.book_parcel_profiles_r408
    order by book_count
  `)).rows;

  return validateBookParcelProfiles(rows,false);
}

export default async function handler(req,res) {
  if (!["GET","POST"].includes(req.method))
    return json(res,405,{error:"METHOD_NOT_ALLOWED"});

  if (req.method === "POST") {
    let origin;

    try {
      origin = new URL(process.env.APP_ORIGIN).origin;
    } catch {
      return json(res,503,{error:"ORIGIN_NOT_CONFIGURED"});
    }

    if (req.headers.origin !== origin)
      return json(res,403,{error:"ORIGIN_FORBIDDEN"});
  }

  let principal;

  try {
    principal = await resolvePrincipal(new Headers(
      Object.entries(req.headers || {}).map(
        ([key,value])=>[key,String(value)]
      )
    ));
  } catch {
    return json(res,503,{error:"AUTHORITY_UNAVAILABLE"});
  }

  if (!principal)
    return json(res,401,{error:"UNAUTHENTICATED"});

  const denied = requireMembership(principal,"OWNER");

  if (denied)
    return json(res,denied.status,denied.body);

  if (!principal.user?.id)
    return json(res,403,{error:"OWNER_IDENTITY_REQUIRED"});

  let profiles;

  if (req.method === "POST") {
    try {
      let raw = "";

      for await (const chunk of req) {
        raw += chunk;

        if (Buffer.byteLength(raw)>16384)
          return json(res,413,{error:"REQUEST_TOO_LARGE"});
      }

      const input = JSON.parse(raw);

      profiles = validateBookParcelProfiles(input.profiles);
    } catch(error) {
      return json(res,400,{
        error:error.code || "INVALID_PACKAGING_PROFILES"
      });
    }
  }

  const pool = new pg.Pool({
    connectionString:process.env.DATABASE_URL
  });

  let client;

  try {
    client = await pool.connect();

    if (req.method === "GET")
      return json(res,200,{
        profiles:await readProfiles(client)
      });

    await client.query("begin");

    await client.query(
      "select pg_advisory_xact_lock(hashtext($1))",
      ["R408_BOOK_PARCEL_PROFILES"]
    );

    for (const p of profiles) {
      await client.query(`
        insert into public.book_parcel_profiles_r408(
          book_count,package_count,width_cm,
          length_cm,height_cm,weight_kg,
          updated_by,updated_at
        )
        values($1,1,$2,$3,$4,$5,$6,now())

        on conflict(book_count) do update
        set width_cm=excluded.width_cm,
            length_cm=excluded.length_cm,
            height_cm=excluded.height_cm,
            weight_kg=excluded.weight_kg,
            updated_by=excluded.updated_by,
            updated_at=now()
      `,[
        p.bookCount,p.widthCm,p.lengthCm,
        p.heightCm,p.weightKg,principal.user.id
      ]);
    }

    const saved = await readProfiles(client);

    await client.query("commit");

    return json(res,200,{
      saved:true,
      profiles:saved
    });

  } catch {
    if (client)
      await client.query("rollback").catch(()=>{});

    return json(res,503,{
      error:"PACKAGING_SETTINGS_UNAVAILABLE"
    });
  } finally {
    client?.release();
    await pool.end();
  }
}