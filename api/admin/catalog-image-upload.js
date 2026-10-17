import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { studentProductImageSlugsV41F, studentPackageKeysV41F } from "../../src/server/domain/fixoku-catalog-assets-v41f.js";

const reply=(res,status,data)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data));};
const requestHeaders=(req)=>new Headers(Object.entries(req.headers||{}).map(([key,val])=>[key,Array.isArray(val)?val.join(","):String(val)]));
const byteMax=2*1024*1024;
async function readLimited(req){
  if(req.body&&typeof req.body==="object")return req.body;
  let content="";
  for await(const chunk of req){content+=chunk.toString();if(content.length>byteMax*1.45+1024)throw Error("RESIM_COK_BUYUK");}
  return JSON.parse(content||"{}");
}
const formats={
 "image/webp":{ext:"webp",valid:b=>b.subarray(0,4).toString()==="RIFF"&&b.subarray(8,12).toString()==="WEBP"},
 "image/png":{ext:"png",valid:b=>b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
 "image/jpeg":{ext:"jpg",valid:b=>b[0]===255&&b[1]===216&&b[2]===255},
};
export default async function handler(req,res){
  if(req.method!=="POST")return reply(res,405,{error:"METHOD_NOT_ALLOWED"});
  if(process.env.VERCEL||process.env.NODE_ENV==="production")return reply(res,503,{error:"Kalici bulut depolama baglanmadan canli sunucuda gorsel yukleme etkin degil. Yerel klasor veya kalici depolama kullanin."});
  const principal=await resolvePrincipal(requestHeaders(req));
  if(!principal)return reply(res,401,{error:"UNAUTHENTICATED"});
  let input;
  try {input=await readLimited(req);}catch{return reply(res,413,{error:"Gecersiz veya cok buyuk resim istegi"});}
  const kind=String(input.kind||"");const key=String(input.id||"");
  if(!["product","package"].includes(kind))return reply(res,400,{error:"MEDIA_KIND_INVALID"});
  const denied=requirePermission(principal,kind==="product"?"product.manage":"package.manage");
  if(denied)return reply(res,denied.status,denied.body);
  const fileName=kind==="product"?studentProductImageSlugsV41F[key]:(studentPackageKeysV41F.has(key)?key:undefined);
  if(!fileName)return reply(res,400,{error:"CATALOG_MEDIA_ID_INVALID"});
  const format=formats[String(input.contentType||"")];
  if(!format||typeof input.base64!=="string"||!(/^[A-Za-z0-9+/=]+$/u.test(input.base64)))return reply(res,400,{error:"UNSUPPORTED_IMAGE"});
  const buffer=Buffer.from(input.base64,"base64");
  if(buffer.length===0||buffer.length>byteMax||!format.valid(buffer))return reply(res,400,{error:"IMAGE_VALIDATION_FAILED"});
  const folder=kind==="product"?"urunler":"paketler";
  const basename=fileName+"-"+randomBytes(5).toString("hex")+"."+format.ext;
  const dir=path.join(process.cwd(),"public","images","fixoku-katalog",folder);
  try {await mkdir(dir,{recursive:true});await writeFile(path.join(dir,basename),buffer,{flag:"wx"});}
  catch{return reply(res,503,{error:"LOCAL_MEDIA_STORAGE_UNAVAILABLE"});}
  return reply(res,201,{imageReference:`/images/fixoku-katalog/${folder}/${basename}`,localOnly:true});
}
