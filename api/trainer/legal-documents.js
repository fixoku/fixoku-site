import pg from 'pg';
import { resolvePrincipal } from '../../src/server/auth/authorization.js';
import { assertTrainerPrincipal, readTrainerCart } from '../../src/server/domain/trainer-commerce.js';
import { publicLegalDocument } from '../../src/server/domain/trainer-legal-documents.js';
import { renderTrainerLegalPreview } from '../../src/server/domain/trainer-legal-preview.js';
const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function input(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw Object.assign(new Error('PAYLOAD_TOO_LARGE'),{status:413});}try{return raw?JSON.parse(raw):{};}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400});}}
export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  try{
    const principal=await resolvePrincipal(headers(req));
    if(!principal)return json(res,401,{error:'UNAUTHENTICATED'});
    const trainer=await assertTrainerPrincipal(principal);
    const code=new URL(req.url||'/api/trainer/legal-documents','http://local').searchParams.get('code');
    const doc=publicLegalDocument(code);
    if(!doc)return json(res,404,{error:'DOCUMENT_NOT_FOUND'});
    if(req.method==='GET')return json(res,200,doc);
    if(req.headers.origin){try{if(new URL(req.headers.origin).host!==String(req.headers.host||''))return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return json(res,403,{error:'ORIGIN_INVALID'});}}
    const body=await input(req);
    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    let client;
    try{
      client=await pool.connect();
      await client.query('BEGIN READ ONLY');
      const cart=await readTrainerCart(client,trainer.id);
      await client.query('COMMIT');
      return json(res,200,renderTrainerLegalPreview({document:doc,cart,shipping:body.shippingAddress||{},email:principal.user.email,paymentMethod:body.paymentMethod}));
    }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally{client?.release();await pool.end();}
  }catch(error){return json(res,error.status||503,{error:error.code||error.message||'LEGAL_PREVIEW_UNAVAILABLE'});}
}
