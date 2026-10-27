import { resolvePrincipal } from '../../src/server/auth/authorization.js';
import { readOwnerLegalDocuments, saveOwnerLegalDocument } from '../../src/server/domain/owner-legal-revisions.js';
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
export default async function handler(req,res){
  try{
    const principal=await resolvePrincipal(headers(req));
    if(!principal)return json(res,401,{error:'UNAUTHENTICATED'});
    const owner=principal.memberships?.some(m=>m.role==='OWNER'&&m.status==='ACTIVE'&&m.scopeType==='GLOBAL'&&m.scopeId==null);
    if(!owner)return json(res,403,{error:'OWNER_ONLY'});
    if(req.method==='GET')return json(res,200,{documents:readOwnerLegalDocuments(),storage:'LOCAL_VERSIONED_FILES',publicationReady:false});
    if(req.method!=='POST')return json(res,405,{error:'METHOD_NOT_ALLOWED'});
    if(req.headers.origin){try{if(new URL(req.headers.origin).host!==String(req.headers.host||''))return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return json(res,403,{error:'ORIGIN_INVALID'});}}
    if(process.env.NODE_ENV==='production'||process.env.VERCEL)return json(res,409,{error:'OWNER_LEGAL_LOCAL_EDITOR_ONLY'});
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>130000)return json(res,413,{error:'PAYLOAD_TOO_LARGE'});}
    let body;try{body=JSON.parse(raw);}catch{return json(res,400,{error:'INVALID_JSON'});}
    const updated=saveOwnerLegalDocument({id:Number(body.id),markdown:body.markdown,expectedSha256:String(body.expectedSha256||''),actorId:principal.user.id});
    return json(res,200,{document:updated,publicationReady:false});
  }catch(error){return json(res,error.status||503,{error:error.message||'LEGAL_EDITOR_FAILED'});}
}
