import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { addTrainerCartItem, assertTrainerPrincipal, readTrainerCart, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function body(req){let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
export default async function handler(req,res){
  const principal=await resolvePrincipal(headers(req));if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const client=await pool.connect();
  try{const user=await assertTrainerPrincipal(principal);if(req.method==="GET")return json(res,200,await readTrainerCart(client,user.id));const input=await body(req);if(req.method==="POST"){const item=await addTrainerCartItem(client,user.id,input.packageVersionId);return json(res,201,{item,cart:await readTrainerCart(client,user.id)});}if(req.method==="DELETE"){if(!TRAINER_COMMERCE_UUID.test(String(input.packageVersionId||"")))return json(res,400,{error:"INVALID_PACKAGE_VERSION_ID"});await client.query("delete from trainer_cart_items where trainer_user_id=$1 and package_version_id=$2",[user.id,input.packageVersionId]);return json(res,200,{cart:await readTrainerCart(client,user.id)});}return json(res,405,{error:"METHOD_NOT_ALLOWED"});}catch(error){return json(res,error.status||409,{error:error.code||error.message||"CART_OPERATION_FAILED"});}finally{client.release();await pool.end();}
}
