import pg from "../../src/server/db/guarded-pg.js";
import {
  resolvePrincipal, requirePermission, validScopeType
} from "../../src/server/auth/authorization.js";
import {
  getProfileMediaConfig, readProfilePhoto,
  createProfilePhotoUrl
} from "../../src/server/domain/profile-media.js";

function reply(res,status) {
  res.statusCode=status;
  res.setHeader("Cache-Control","private, no-store");
  res.end();
}

export default async function handler(req,res) {
  if(req.method!=="GET") return reply(res,405);

  let pool;
  try {
    const headers=new Headers(
      Object.entries(req.headers||{}).map(([k,v])=>
        [k,Array.isArray(v)?v.join(", "):String(v)]
      )
    );
    const principal=await resolvePrincipal(headers);
    if(!principal) return reply(res,401);

    const denied=requirePermission(principal,"student.profile.read");
    if(denied) return reply(res,denied.status);

    const allowed=principal.memberships?.some(m=>
      ["OWNER","SUPER_ADMIN"].includes(m.role) &&
      validScopeType(m) &&
      m.scopeType==="GLOBAL" &&
      m.scopeId==null
    );
    if(!allowed) return reply(res,403);

    const id=new URL(req.url,"https://fixoku.com")
      .searchParams.get("studentProfileId");

    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||""))
      return reply(res,400);

    pool=new pg.Pool({connectionString:process.env.DATABASE_URL});

    const row=(await pool.query(
      `select sp.photo_storage_key
       from student_profiles sp
       where sp.id=$1
       and exists(
         select 1 from platform_memberships m
         where m.user_id=sp.user_id
         and m.role='STUDENT'
         and m.status='ACTIVE'
       )`,
      [id]
    )).rows[0];

    if(!row?.photo_storage_key) return reply(res,404);

    const config=getProfileMediaConfig();

    if(config.provider==="S3" || config.provider==="R2") {
      const signed=createProfilePhotoUrl(config,row.photo_storage_key);
      if(!signed) return reply(res,404);
      res.statusCode=302;
      res.setHeader("Location",signed);
      res.setHeader("Cache-Control","private, no-store");
      res.setHeader("Referrer-Policy","no-referrer");
      return res.end();
    }

    const media=await readProfilePhoto(config,row.photo_storage_key);
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