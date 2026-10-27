import pg from "pg";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { assertTrainerPrincipal, TRAINER_COMMERCE_UUID } from "../../src/server/domain/trainer-commerce.js";
import { resolveTurkeyLocation } from "../../src/data/turkeyLocations.js";
const json=(res,status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,String(v)]));
async function body(req){let raw="";for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
const value=(input,key)=>String(input?.[key]||"").trim();
export const normalizeTrMobile=(input)=>{
  let digits=String(input||"").replace(/\D/gu,"");
  if(digits.length===12&&digits.startsWith("90")) digits=digits.slice(2);
  if(digits.length===11&&digits.startsWith("0")) digits=digits.slice(1);
  return /^5\d{9}$/u.test(digits)?`+90${digits}`:null;
};
export const validateAddress=(input)=>{
  const errors={};
  const required=["title","firstName","lastName","phone","city","district","addressLine"];
  for(const key of required) if(!value(input,key)) errors[key]="Bu alan zorunludur.";
  const limits={title:80,firstName:80,lastName:80,city:80,district:80,addressLine:500,neighborhood:120,postalCode:32};
  for(const [key,max] of Object.entries(limits)) if(value(input,key).length>max) errors[key]="Alan uzunluğu geçersiz.";
  if(value(input,"phone")&&!normalizeTrMobile(value(input,"phone"))) errors.phone="5 ile başlayan 10 haneli Türkiye cep telefonu girin.";
  if(value(input,"city")||value(input,"district")){
    const location=resolveTurkeyLocation(value(input,"city"),value(input,"district"));
    if(!location){ errors.city="İl ve ilçe eşleşmesi geçersiz."; errors.district="İl ve ilçe eşleşmesi geçersiz."; }
  }
  return errors;
};
export default async function handler(req,res){const principal=await resolvePrincipal(headers(req));if(!principal)return json(res,401,{error:"UNAUTHENTICATED"});const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const user=await assertTrainerPrincipal(principal);if(req.method==="GET"){const rows=(await pool.query('select id,title,first_name as "firstName",last_name as "lastName",phone,city,district,neighborhood,address_line as "addressLine",postal_code as "postalCode" from trainer_addresses where trainer_user_id=$1 order by updated_at desc',[user.id])).rows;return json(res,200,{addresses:rows});}if(!["POST","PATCH","DELETE"].includes(req.method))return json(res,405,{error:"METHOD_NOT_ALLOWED"});const input=await body(req);if(req.method==="DELETE"){if(!TRAINER_COMMERCE_UUID.test(String(input.id||"")))return json(res,400,{error:"ADDRESS_ID_INVALID"});const deleted=await pool.query("delete from trainer_addresses where id=$1 and trainer_user_id=$2",[input.id,user.id]);if(!deleted.rowCount)return json(res,404,{error:"ADDRESS_NOT_FOUND"});return json(res,200,{deleted:true});}const errors=validateAddress(input);if(Object.keys(errors).length)return json(res,400,{error:"VALIDATION_ERROR",errors});const location=resolveTurkeyLocation(value(input,"city"),value(input,"district"));const params=[user.id,value(input,"title"),value(input,"firstName"),value(input,"lastName"),normalizeTrMobile(value(input,"phone")),location.city,location.district,value(input,"addressLine"),value(input,"neighborhood")||null,value(input,"postalCode")||null];let row;if(req.method==="PATCH"){if(!TRAINER_COMMERCE_UUID.test(String(input.id||"")))return json(res,400,{error:"ADDRESS_ID_INVALID"});row=(await pool.query('update trainer_addresses set title=$3,first_name=$4,last_name=$5,phone=$6,city=$7,district=$8,address_line=$9,neighborhood=$10,postal_code=$11,updated_at=now() where id=$1 and trainer_user_id=$2 returning id,title,first_name as "firstName",last_name as "lastName",phone,city,district,neighborhood,address_line as "addressLine",postal_code as "postalCode"',[input.id,user.id,...params.slice(1)])).rows[0];}else row=(await pool.query('insert into trainer_addresses(trainer_user_id,title,first_name,last_name,phone,city,district,address_line,neighborhood,postal_code) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,title,first_name as "firstName",last_name as "lastName",phone,city,district,neighborhood,address_line as "addressLine",postal_code as "postalCode"',params)).rows[0];return json(res,row?200:404,{address:row});}catch(error){return json(res,error.status||503,{error:error.code||error.message||"ADDRESS_OPERATION_FAILED"});}finally{await pool.end();}}
