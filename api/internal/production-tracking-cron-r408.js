import crypto from "node:crypto";
import pg from "../../src/server/db/guarded-pg.js";
import {createShippingAdapter} from "../../src/server/shipping/adapter.js";
import {runShipmentTrackingBatchR408} from "../../src/server/shipping/dispatch.js";
export function createTrackingCronR408({env=process.env,poolFactory=connectionString=>new pg.Pool({connectionString,max:1,connectionTimeoutMillis:5000}),providerFactory=()=>createShippingAdapter(),worker=runShipmentTrackingBatchR408}={}){
 return async function(req,res){
  const reply=(code,status)=>{res.statusCode=code;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify({status}));};
  if(req.method!=="GET")return reply(405,"METHOD_NOT_ALLOWED");
  if(env.VERCEL!=="1"||env.VERCEL_ENV!=="production")return reply(403,"PRODUCTION_ONLY");
  const secret=String(env.CRON_SECRET||""), actual=Buffer.from(String(req.headers?.authorization||"")), expected=Buffer.from("Bearer "+secret);
  if(secret.length<32||actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return reply(401,"UNAUTHORIZED");
  if(env.FIXOKU_PRODUCTION_TRACKING_CRON_ENABLED!=="1"||env.SHIPPING_KG_LIVE_DISPATCH_APPROVED!=="1")return reply(200,"DISABLED");
  let pool,client;
  try{
   const direct=String(env.DATABASE_URL_UNPOOLED||""); const u=new URL(direct);
   if(!["postgres:","postgresql:"].includes(u.protocol)||!/^ep-[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech$/u.test(u.hostname)||u.hostname.includes("-pooler.")||!u.username||!u.password||!["require","verify-ca","verify-full"].includes(u.searchParams.get("sslmode")))return reply(503,"DIRECT_DATABASE_REQUIRED");
   const provider=providerFactory();if(provider?.runtime?.provider!=="KOLAYGELSIN"||provider.runtime.enabled!==true)return reply(503,"TRACKING_PROVIDER_DISABLED");
   pool=poolFactory(direct);client=await pool.connect();
   const result=await worker(client,{provider,limit:5});return reply(result.status==="REVIEW_REQUIRED"?503:200,result.status);
  }catch{return reply(503,"TRACKING_JOB_FAILED");}finally{if(client)client.release(true);if(pool)await pool.end();}
 };
}
export default createTrackingCronR408();