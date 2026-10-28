import pg from "pg";
import { resolvePrincipal } from "../src/server/auth/authorization.js";
import { createAuthAccount, hashInvitationToken } from "../src/server/auth/invitations.js";
import { readTrainerCatalog } from "../src/server/domain/trainer-commerce.js";

const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):String(v)]));
async function read(req){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req)s+=c;if(s.length>12000)throw Error('BODY_TOO_LARGE');return s?JSON.parse(s):{};}
const profileKeys=['city','district','educationBackground','experience','specialties','bio','profession','institution','phone'];
const compact=x=>String(x||'').trim();
function ready(p){return ['city','district','profession','education_background','experience','specialties','bio'].every(k=>compact(p[k]).length>=2);}
export default async function handler(req,res){
 const url=new URL(req.url||'http://local','http://local');const action=url.searchParams.get('action')||'profile';
 // Candidate access is part of the direct teacher application flow. Keep an
 // explicit emergency kill switch, but do not make the normal Production path
 // depend on an unset feature flag: doing so turns a valid candidate session
 // into the generic “Oturum doğrulanamadı” screen.
 if(process.env.FIXOKU_TRAINER_CANDIDATE_ENABLED === '0')return json(res,503,{error:'TRAINER_CANDIDATE_DISABLED'});
 if(!['GET','POST'].includes(req.method||''))return json(res,405,{error:'METHOD_NOT_ALLOWED'});
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
 try{
  if(action==='preview'&&req.method==='GET'){
   const token=compact(url.searchParams.get('token'));
   if(token.length<20)return json(res,400,{error:'INVALID_TOKEN'});
   const row=(await pool.query(`select email,first_name,last_name from trainer_applications where invitation_token_hash=$1
      and invitation_used_at is null and invitation_expires_at>now() and candidate_user_id is null and status in ('RECEIVED','REVIEWING') limit 1`,[hashInvitationToken(token)])).rows[0];
   return row?json(res,200,{invitation:{kind:'candidate',email:row.email,name:`${row.first_name} ${row.last_name}`.trim()}}):json(res,400,{error:'INVITATION_INVALID_OR_USED'});
  }
  if(action==='activate'&&req.method==='POST'){
   const input=await read(req);const token=compact(input.token),password=String(input.password||'');
   if(token.length<20||password.length<12||password.length>128)return json(res,400,{error:'ACTIVATION_INPUT_INVALID'});
   const hash=hashInvitationToken(token);
   const app=(await pool.query(`update trainer_applications set invitation_used_at=now(),updated_at=now()
      where invitation_token_hash=$1 and invitation_used_at is null and invitation_expires_at>now()
      and candidate_user_id is null and status in ('RECEIVED','REVIEWING')
      returning id,email,first_name,last_name,phone`,[hash])).rows[0];
   if(!app)return json(res,400,{error:'INVITATION_INVALID_OR_USED'});
   const email=compact(app.email).toLowerCase();let account;
   try {account=await createAuthAccount({email,name:`${app.first_name} ${app.last_name}`.trim(),password});}
   catch {await pool.query('update trainer_applications set invitation_used_at=null where id=$1 and candidate_user_id is null',[app.id]);return json(res,409,{error:'ACCOUNT_CREATION_FAILED'});}
   const client=await pool.connect();
   try{
    await client.query('begin');
    const platform=(await client.query('select id from platform_users where auth_user_id=$1 for update',[account.id])).rows[0];
    if(!platform)throw Error('ACCOUNT_MAPPING_MISSING');
    await client.query(`update platform_memberships set status='REVOKED',updated_at=now() where user_id=$1 and role='STUDENT'`,[platform.id]);
    // Keep unused student profile for FK integrity; revoked STUDENT role provides no access.
    await client.query(`insert into trainer_profiles(user_id,first_name,last_name,phone)
       values($1,$2,$3,$4) on conflict(user_id) do nothing`,[platform.id,app.first_name,app.last_name,app.phone]);
    await client.query(`update "user" set email_verified=true,updated_at=now() where id=$1`,[account.id]);
    await client.query('update platform_users set email_verified=true,updated_at=now() where id=$1',[platform.id]);
    await client.query(`update trainer_applications set candidate_user_id=$1,invitation_token_hash=null,invitation_expires_at=null,updated_at=now()
       where id=$2 and candidate_user_id is null`,[platform.id,app.id]);
    await client.query('commit');
    return json(res,200,{success:true,candidate:true,emailVerified:true,roleGranted:false});
   }catch{try{await client.query('rollback');}catch { /* Preserve the original activation failure if rollback is unavailable. */ }return json(res,503,{error:'CANDIDATE_ACTIVATION_INCOMPLETE_SUPPORT_REQUIRED'});}
   finally{client.release();}
  }
  const principal=await resolvePrincipal(headers(req));
  if(!principal?.user)return json(res,401,{error:'UNAUTHENTICATED'});
  const app=(await pool.query(`select a.id,a.status,a.first_name,a.last_name,p.email_verified as "emailVerified",
       tp.phone,tp.city,tp.district,tp.profession,tp.institution,tp.education_background,tp.experience,tp.specialties,tp.bio
       from trainer_applications a join platform_users p on p.id=a.candidate_user_id
       left join trainer_profiles tp on tp.user_id=p.id
       where a.candidate_user_id=$1 order by a.created_at desc limit 1`,[principal.user.id])).rows[0];
  if(!app || !['RECEIVED','REVIEWING','PROFILE_READY'].includes(app.status))return json(res,403,{error:'CANDIDATE_ACCESS_REQUIRED'});
  if(app.emailVerified !== true)return json(res,403,{error:'EMAIL_VERIFICATION_REQUIRED'});
  const data={name:`${app.first_name} ${app.last_name}`.trim(),email:principal.user.email,emailVerified:app.emailVerified,
    applicationStatus:app.status,ownerApproved:principal.memberships?.some(m=>m.role==='TRAINER'&&m.status==='ACTIVE')||false,
    profileComplete:ready(app), profile:{phone:app.phone||'',city:app.city||'',district:app.district||'',profession:app.profession||'',institution:app.institution||'',educationBackground:app.education_background||'',experience:app.experience||'',specialties:app.specialties||'',bio:app.bio||''}};
  if(action==='profile'&&req.method==='GET')return json(res,200,data);
  if(action==='catalog'&&req.method==='GET'){
    // Candidate view is read-only: no membership, entitlement or cart changes.
    // Reuse published-panel catalog query; expose only public-facing metadata.
    const rows=await readTrainerCatalog(pool, principal.user.id);
    const catalog=rows.map(row=>({
      packageId:row.packageId, slug:row.slug, title:row.title,
      description:row.description, shortDescription:row.shortDescription,
      priceGrossMinor:row.priceGrossMinor, currency:row.currency,
      features:Array.isArray(row.features)?row.features:[],
      components:Array.isArray(row.components)?row.components
        .filter(item=>item.componentType==='TEXT_ITEM')
        .map(item=>({title:item.title,displayOrder:item.displayOrder})):[],
    }));
    return json(res,200,{packages:catalog});
  }
  if(action==='profile'&&req.method==='POST'){
   if(!app.emailVerified)return json(res,403,{error:'EMAIL_VERIFICATION_REQUIRED'});
   if(!['RECEIVED','REVIEWING','PROFILE_READY'].includes(app.status))return json(res,409,{error:'APPLICATION_NOT_EDITABLE'});
   const input=await read(req);
   if(!input||typeof input!=='object'||Object.keys(input).some(k=>!profileKeys.includes(k)))return json(res,400,{error:'INVALID_PROFILE_FIELDS'});
   const out={};for(const key of profileKeys){const value=input[key];if(value!==undefined){if(typeof value!=='string'||value.length>500)return json(res,400,{error:'INVALID_PROFILE_FIELD'});out[key]=value.trim();}}
   if(out.phone&& !/^\+?\d{10,13}$/u.test(out.phone.replace(/\s/gu,'')))return json(res,400,{error:'INVALID_PHONE'});
   const columns={city:'city',district:'district',educationBackground:'education_background',experience:'experience',specialties:'specialties',bio:'bio',profession:'profession',institution:'institution',phone:'phone'};
   const updates=Object.entries(out).map(([key],i)=>`${columns[key]}=$${i+2}`);
   if(updates.length) {
    const profileValues = [principal.user.id, ...Object.values(out)];
    const profileColumns = Object.keys(out).map((key) => columns[key]);
    const insertColumns = ['user_id', ...profileColumns];
    const insertValues = insertColumns.map((_, index) => `$${index + 1}`);
    const assignments = profileColumns.map((column) => `${column}=excluded.${column}`);
    await pool.query(`insert into trainer_profiles(${insertColumns.join(',')}) values(${insertValues.join(',')}) on conflict(user_id) do update set ${assignments.join(',')},updated_at=now()`, profileValues);
   }
   const fresh=(await pool.query('select city,district,profession,education_background,experience,specialties,bio from trainer_profiles where user_id=$1',[principal.user.id])).rows[0]||{};
   const complete=ready(fresh);
   await pool.query(`update trainer_applications set status=$1,updated_at=now()
      where id=$2 and status in ('RECEIVED','REVIEWING','PROFILE_READY')`,[complete?'PROFILE_READY':'REVIEWING',app.id]);
   return json(res,200,{success:true,profileComplete:complete});
  }
  return json(res,405,{error:'METHOD_NOT_ALLOWED'});
 }catch(err){return json(res,err instanceof SyntaxError?400:503,{error:err instanceof SyntaxError?'INVALID_JSON':'CANDIDATE_SERVICE_UNAVAILABLE'});}
 finally{await pool.end();}
}
