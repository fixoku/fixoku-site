import crypto from "node:crypto";
import pg from "pg";
import { resolvePrincipal } from "../../../src/server/auth/authorization.js";
import { resolveBeneficiary } from "../../../src/server/domain/commerce.js";
import { createSignedReadUrl, fetchPrivateObject, getDigitalStorageConfig, inspectPrivateFile } from "../../../src/server/domain/digital-delivery.js";
const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
export default async function handler(req,res){
  if(req.method!=="GET") return json(res,405,{error:"METHOD_NOT_ALLOWED"});
  const p=await resolvePrincipal(new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]))); if(!p) return json(res,401,{error:"UNAUTHENTICATED"}); if(!p.user) return json(res,403,{error:"FORBIDDEN"});
  const requestUrl = new URL(req.url || "", "http://local");
  const id=requestUrl.pathname.split("/").pop(); const requestedChildProfileId=requestUrl.searchParams.get("childProfileId") || null;
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL}); const c=await pool.connect();
  try {
    const beneficiary=await resolveBeneficiary(c,p,requestedChildProfileId);
    const row=(await c.query("select de.id,de.beneficiary_student_user_id,de.download_count,de.download_limit,de.expires_at,df.title,df.version,df.storage_key,df.revoked_at,oi.beneficiary_child_profile_id from digital_entitlements de join digital_files df on df.id=de.file_id left join order_items oi on oi.id=de.source_order_item_id where de.id=$1 and de.beneficiary_student_user_id=$2 and (($3::uuid is null and oi.beneficiary_child_profile_id is null) or oi.beneficiary_child_profile_id=$3) and (de.source_order_item_id is null or exists (select 1 from package_entitlements pe where pe.source_order_item_id=de.source_order_item_id and pe.beneficiary_student_user_id=$2 and pe.status='ACTIVE' and pe.revoked_at is null and (($3::uuid is null and pe.beneficiary_child_profile_id is null) or pe.beneficiary_child_profile_id=$3) and (pe.expires_at is null or pe.expires_at>now()))) and de.revoked_at is null and (de.expires_at is null or de.expires_at>now()) and df.revoked_at is null",[id,beneficiary.studentUserId,beneficiary.childProfileId||null])).rows[0];
    if(!row||beneficiary.childProfileId && String(row.beneficiary_child_profile_id||"")!==String(beneficiary.childProfileId)) return json(res,403,{error:"DIGITAL_ENTITLEMENT_FORBIDDEN"});
    const storage = getDigitalStorageConfig();
    const file = await inspectPrivateFile(storage,row.storage_key);
    const remote = storage.provider === "S3" || storage.provider === "R2";
    if(!file && !remote) { await c.query("insert into digital_download_audits(entitlement_id,actor_user_id,result) values($1,$2,'DELIVERY_UNAVAILABLE')",[id,p.user.id]); return json(res,503,{error:storage.reason||"DIGITAL_FILE_UNAVAILABLE"}); }
    if (remote) {
      const exists = await fetchPrivateObject(storage, row.storage_key, { method: "HEAD" });
      if (!exists.ok) { await c.query("insert into digital_download_audits(entitlement_id,actor_user_id,result) values($1,$2,'DELIVERY_UNAVAILABLE')",[id,p.user.id]); return json(res,503,{error:"DIGITAL_FILE_UNAVAILABLE"}); }
    }
    const ipHash=crypto.createHash("sha256").update(String(req.headers?.["x-forwarded-for"]||"local")).digest("hex");
    await c.query("begin");
    const granted=(await c.query("update digital_entitlements set download_count=download_count+1 where id=$1 and revoked_at is null and (expires_at is null or expires_at>now()) and (download_limit is null or download_count<download_limit) returning download_count",[id])).rows[0];
    if(!granted){ await c.query("rollback"); await c.query("insert into digital_download_audits(entitlement_id,actor_user_id,result,ip_hash) values($1,$2,'LIMIT_REACHED',$3)",[id,p.user.id,ipHash]);return json(res,403,{error:"DOWNLOAD_LIMIT_REACHED"}); }
    await c.query("insert into digital_download_audits(entitlement_id,actor_user_id,result,ip_hash) values($1,$2,'GRANTED',$3)",[id,p.user.id,ipHash]);
    await c.query("commit");
    const safeName=String(row.title||"download").replace(/[\r\n"\\/]/gu," ").trim().slice(0,180)||"download";
    if (remote) {
      res.statusCode=302; res.setHeader("Location", createSignedReadUrl(storage, row.storage_key)); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`); res.setHeader("Cache-Control","private, no-store"); res.setHeader("Referrer-Policy", "no-referrer"); return res.end();
    }
    res.statusCode=200; res.setHeader("Content-Type", "application/octet-stream"); res.setHeader("Content-Length", String(file.size)); res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`); res.setHeader("Cache-Control","private, no-store");
    const stream = (await import("node:fs")).createReadStream(file.filePath); stream.on("error",()=>{if(!res.headersSent) json(res,503,{error:"DIGITAL_FILE_UNAVAILABLE"});}); stream.pipe(res);
  } catch(e){ try{await c.query("rollback")}catch{/* preserve original error */} return json(res,e.status||503,{error:e.code||"DOWNLOAD_UNAVAILABLE"});} finally{c.release();await pool.end();}
}
