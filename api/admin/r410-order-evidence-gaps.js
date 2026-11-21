import pg from '../../src/server/db/guarded-pg.js';
import {resolvePrincipal,requirePermission} from '../../src/server/auth/authorization.js';
import {readOrderEvidenceGaps} from '../../src/server/domain/r410-order-evidence-gaps.js';
const reply=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)]));
export default async function handler(req,res){
 if(req.method!=='GET')return reply(res,405,{error:'METHOD_NOT_ALLOWED'});
 let principal;try{principal=await resolvePrincipal(headers(req));}catch{return reply(res,401,{error:'UNAUTHENTICATED'});}
 if(!principal)return reply(res,401,{error:'UNAUTHENTICATED'});
 const denied=requirePermission(principal,'finance.read');if(denied)return reply(res,denied.status,denied.body);
 const owner=principal.memberships?.some(m=>m.role==='OWNER'&&m.status==='ACTIVE'&&m.scopeType==='GLOBAL'&&m.scopeId==null&&String(m.userId)===String(principal.user.id));
 if(!owner)return reply(res,403,{error:'OWNER_ONLY'});
 const input=Object.fromEntries(new URL(req.url||'/api/admin/r410-order-evidence-gaps','http://local').searchParams);
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try {
  const migrated=(await pool.query("select to_regclass('public.r410_order_product_cost_snapshots') is not null as ready")).rows[0]?.ready===true;
  if(!migrated)return reply(res,503,{error:'MIGRATION_PENDING'});
  return reply(res,200,await readOrderEvidenceGaps(pool,input));
 }catch(e){return reply(res,e.status||503,{error:e.code==='42P01'?'MIGRATION_PENDING':e.code||'EVIDENCE_GAPS_UNAVAILABLE'});}finally{await pool.end();}
}
