import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal } from "../../src/server/domain/trainer-commerce.js";
const reply=(res,status,body="")=>{res.statusCode=status;res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");res.end(body);};const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
const videoFiles=[
  "1.mp4",
  "2.mp4",
  "3.mp4",
  "4.mp4",
  "5.mp4",
  "6.mp4",
];
export default async function handler(req,res){if(req.method!=="GET")return reply(res,405);const principal=await resolvePrincipal(headers(req));if(!principal)return reply(res,401);const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const user=await assertTrainerPrincipal(principal);const parsed=new URL(req.url,"http://local");const packageId=parsed.searchParams.get("packageId");const video=Number(parsed.searchParams.get("video"));if(!packageId||!Number.isInteger(video)||video<1||video>videoFiles.length)return reply(res,400);if(!((await pool.query("select 1 from trainer_package_entitlements where trainer_user_id=$1 and package_id=$2 and status='ACTIVE'",[user.id,packageId])).rowCount))return reply(res,403);if(video>1&&!((await pool.query("select 1 from trainer_video_progress where trainer_user_id=$1 and package_id=$2 and video_index=$3 and completed_at is not null",[user.id,packageId,video-1])).rowCount))return reply(res,403);const file=path.resolve("public","videos","teacher-panel","demo","akici-hizli-okuma",videoFiles[video-1]);if(!fs.existsSync(file))return reply(res,404);const stat=fs.statSync(file);const range=String(req.headers.range||"");res.setHeader("Content-Type","video/mp4");res.setHeader("Accept-Ranges","bytes");if(range){const match=/bytes=(\d+)-(\d*)/u.exec(range);if(!match)return reply(res,416);const start=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size)return reply(res,416);res.statusCode=206;res.setHeader("Content-Range",`bytes ${start}-${end}/${stat.size}`);res.setHeader("Content-Length",String(end-start+1));fs.createReadStream(file,{start,end}).pipe(res);return;}res.statusCode=200;res.setHeader("Content-Length",String(stat.size));fs.createReadStream(file).pipe(res);}catch{return reply(res,403);}finally{await pool.end();}}
