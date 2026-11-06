import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { normalizeOwnerNote, assertPackageId } from "../../src/server/domain/h5af-owner-note.mjs";

const respond = (res, status, data) => { res.statusCode=status; res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Cache-Control","no-store, private"); res.end(JSON.stringify(data)); };
const headers = (req) => new Headers(Object.entries(req.headers||{}).map(([k,v]) => [k,Array.isArray(v)?v.join(","):String(v)]));
async function parse(req) { if(req.body && typeof req.body==="object") return req.body; let s=""; for await(const chunk of req) { s+=chunk; if(s.length>16000) throw new Error("NOTE_PAYLOAD_TOO_LARGE"); } return s?JSON.parse(s):{}; }

// Separate endpoint: the standard public/trainer package response never contains owner notes.
export default async function handler(req,res) {
  if(!["GET","PUT"].includes(req.method)) return respond(res,405,{error:"METHOD_NOT_ALLOWED"});
  const principal = await resolvePrincipal(headers(req));
  if(!principal) return respond(res,401,{error:"UNAUTHENTICATED"});
  const denied = requirePermission(principal,"package.manage");
  if(denied) return respond(res,denied.status,denied.body);
  let id;
  try { const url=new URL(req.url,"http://local"); id=assertPackageId(url.searchParams.get("id")); }
  catch(error) {return respond(res,400,{error:error.message});}
  // Always fail closed until a deliberately created and verified isolated database is enabled.
  if(process.env.FIXOKU_H5AF_OWNER_NOTE_DB !== "ENABLED") return respond(res,423,{error:"NEW_NEON_OWNER_NOTE_WRITES_AND_READS_BLOCKED"});
  let note;
  try {if(req.method==="PUT") note=normalizeOwnerNote((await parse(req)).note);}
  catch(error) {return respond(res,400,{error:error.message||"NOTE_INVALID"});}
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try {
    const exists=(await pool.query("select id from packages where id=$1 and audience='TRAINER' and catalog_scope in ('TRAINER_COMMERCE','LEGACY_EDUCATION')",[id])).rows[0];
    if(!exists) return respond(res,404,{error:"TRAINER_PACKAGE_NOT_FOUND"});
    if(req.method==="GET") {
      const rows=(await pool.query("select note,updated_at from r6_trainer_package_owner_notes where package_id=$1",[id])).rows;
      return respond(res,200,{id,note:rows[0]?.note||"",updatedAt:rows[0]?.updated_at||null});
    }
    const saved=(await pool.query("insert into r6_trainer_package_owner_notes (package_id,note,updated_by,updated_at) values ($1,$2,$3,now()) on conflict (package_id) do update set note=excluded.note,updated_by=excluded.updated_by,updated_at=excluded.updated_at returning updated_at",[id,note,principal.user.id])).rows[0];
    return respond(res,200,{saved:true,id,updatedAt:saved.updated_at});
  } catch {return respond(res,500,{error:"OWNER_NOTE_STORAGE_UNAVAILABLE"});}
  finally {await pool.end();}
}
