import pg from '../../src/server/db/guarded-pg.js';
import {resolvePrincipal,requirePermission} from '../../src/server/auth/authorization.js';
import {readOwnerPayoutTariff,saveOwnerPayoutTariff} from '../../src/server/domain/r410-owner-payout-tariff-store.js';
const respond=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
const headerMap=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)]));
export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return respond(res,405,{error:'METHOD_NOT_ALLOWED'});
  const principal=await resolvePrincipal(headerMap(req));
  if(!principal)return respond(res,401,{error:'UNAUTHENTICATED'});
  const denied=requirePermission(principal,'payout.manage');
  if(denied)return respond(res,denied.status,denied.body);
  const owner=principal.memberships?.some(m=>m.role==='OWNER'&&m.status==='ACTIVE'&&m.scopeType==='GLOBAL'&&m.scopeId==null&&String(m.userId)===String(principal.user.id));
  if(!owner)return respond(res,403,{error:'OWNER_ONLY'});
  if(req.method==='POST'){
    const type=String(req.headers?.['content-type']||'').toLowerCase();
    if(!type.startsWith('application/json'))return respond(res,415,{error:'JSON_REQUIRED'});
    const origin=String(req.headers?.origin||'');
    const host=String(req.headers?.host||'');
    if(!origin||!host)return respond(res,403,{error:'ORIGIN_REQUIRED'});
    try {if(new URL(origin).host!==host||new URL(origin).protocol!=='https:')return respond(res,403,{error:'ORIGIN_DENIED'});}catch{return respond(res,403,{error:'ORIGIN_DENIED'});}
  }
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{
    if(req.method==='GET')return respond(res,200,{tariff:await readOwnerPayoutTariff(pool),ownerOnly:true});
    let body=req.body;
    if(!body||typeof body!=='object'){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8000)return respond(res,413,{error:'BODY_TOO_LARGE'});}
      try{body=JSON.parse(raw);}catch{return respond(res,400,{error:'INVALID_JSON'});}
    }
    const client=await pool.connect();
    try{
      await client.query('begin');
      const tariff=await saveOwnerPayoutTariff(client,{tariff:body?.tariff,ownerId:principal.user.id,expectedVersion:body?.expectedVersion});
      await client.query('commit');return respond(res,201,{tariff});
    }catch(err){await client.query('rollback').catch(()=>{});return respond(res,err.status||503,{error:err.code||'TARIFF_SAVE_FAILED'});}
    finally{client.release();}
  }catch(err){return respond(res,503,{error:err?.code==='42P01'?'MIGRATION_PENDING':'TARIFF_UNAVAILABLE'});}
  finally{await pool.end();}
}
