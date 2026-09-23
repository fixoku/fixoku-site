import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, readTrainerCatalog } from "../../src/server/domain/trainer-commerce.js";

const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([key,value])=>[key,String(value)]));
export default async function handler(req,res){
  if(req.method!=="GET")return json(res,405,{error:"METHOD_NOT_ALLOWED"});
  const principal=await resolvePrincipal(headers(req));if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  try{const user=await assertTrainerPrincipal(principal);const packages=await readTrainerCatalog(pool,user.id);const cart=await pool.query("select count(*)::int as count from trainer_cart_items where trainer_user_id=$1",[user.id]);return json(res,200,{packages,cartCount:Number(cart.rows[0]?.count||0)});}catch(error){return json(res,error.status||503,{error:error.code||error.message||"TRAINER_PACKAGES_UNAVAILABLE"});}finally{await pool.end();}
}
