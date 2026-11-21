import pg from "../../src/server/db/guarded-pg.js";
import {resolvePrincipal,requirePermission} from "../../src/server/auth/authorization.js";
import {readOwnerProductCosts,saveOwnerProductCost} from "../../src/server/domain/r410-product-cost-store.js";
const reply=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(", "):String(v)]));
export default async function handler(req,res){
  if(!["GET","POST"].includes(req.method))return reply(res,405,{error:"METHOD_NOT_ALLOWED"});
  const principal=await resolvePrincipal(headers(req));
  if(!principal)return reply(res,401,{error:"UNAUTHENTICATED"});
  const denied=requirePermission(principal,req.method==="GET"?"finance.read":"payout.manage");
  if(denied)return reply(res,denied.status,denied.body);
  const owner=principal.memberships?.some(m=>m.role==="OWNER"&&m.status==="ACTIVE"&&m.scopeType==="GLOBAL"&&m.scopeId==null&&String(m.userId)===String(principal.user.id));
  if(!owner)return reply(res,403,{error:"OWNER_ONLY"});
  if(req.method==="POST"){
    if(!String(req.headers?.["content-type"]||"").toLowerCase().startsWith("application/json"))return reply(res,415,{error:"JSON_REQUIRED"});
    const origin=String(req.headers?.origin||"");const host=String(req.headers?.host||"");
    try {if(!origin||!host||new URL(origin).protocol!=="https:"||new URL(origin).host!==host)return reply(res,403,{error:"ORIGIN_DENIED"});}catch{return reply(res,403,{error:"ORIGIN_DENIED"});}
  }
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{
    if(req.method==="GET")return reply(res,200,{products:await readOwnerProductCosts(pool),ownerOnly:true});
    let body=req.body;
    if(!body||typeof body!=="object"||Array.isArray(body)){
      let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>4000)return reply(res,413,{error:"BODY_TOO_LARGE"});}
      try{body=JSON.parse(raw);}catch{return reply(res,400,{error:"INVALID_JSON"});}
    }
    const client=await pool.connect();
    try{
      await client.query("begin");
      const saved=await saveOwnerProductCost(client,body,principal.user.id);
      await client.query("commit");return reply(res,200,{saved});
    }catch(error){await client.query("rollback").catch(()=>{});return reply(res,error.status||503,{error:error.message||"COST_WRITE_FAILED"});}
    finally{client.release();}
  }catch(error){return reply(res,503,{error:error.code==="42P01"?"MIGRATION_PENDING":"COSTS_UNAVAILABLE"});}
  finally{await pool.end();}
}
