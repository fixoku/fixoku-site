import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { getProfileMediaConfig, readProfilePhoto } from "../../src/server/domain/profile-media.js";

function reply(res,status) {
  res.statusCode=status;
  res.setHeader("Cache-Control","private, no-store");
  res.end();
}

export default async function handler(req,res) {
  if(req.method!=="GET") return reply(res,405);

  let pool;
  try {
    const headers=new Headers(Object.entries(req.headers||{}).map(
      ([k,v])=>[k,Array.isArray(v)?v.join(", "):String(v)]
    ));
    const principal=await resolvePrincipal(headers);
    if(!principal) return reply(res,401);

    const denied=requirePermission(principal,"trainer_package.assign");
    if(denied) return reply(res,denied.status);

    const id=new URL(req.url,"https://fixoku.com").searchParams.get("trainerUserId");

    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||""))
      return reply(res,400);

    pool=new pg.Pool({connectionString:process.env.DATABASE_URL});

    const row=(await pool.query(
      "select tp.photo_storage_key from trainer_profiles tp join platform_memberships m on m.user_id=tp.user_id and m.role='TRAINER' and m.status='ACTIVE' where tp.user_id=$1",
      [id]
    )).rows[0];

    if(!row?.photo_storage_key) return reply(res,404);

    const media=await readProfilePhoto(
      getProfileMediaConfig(),row.photo_storage_key
    );

    if(!media) return reply(res,404);

    res.statusCode=200;
    res.setHeader("Content-Type",media.mime);
    res.setHeader("Cache-Control","private, no-store");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.end(media.buffer);
  } catch {
    reply(res,503);
  } finally {
    if(pool) await pool.end();
  }
}