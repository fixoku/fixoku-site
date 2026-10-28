import pg from "pg";
import { getEmailTransportStatus, sendTransactionalEmail } from "../src/server/domain/email-outbox.js";
import { auth } from "../src/server/auth/auth.js";
import { resolvePrincipal } from "../src/server/auth/authorization.js";
import { validateEducationSegment } from "../src/server/domain/student-segment.js";
import { resolveTurkeyLocation } from "../src/data/turkeyLocations.js";
import { requireApplicationOrigin } from "../src/server/auth/origin.js";
import { queueRolePanelNotifications } from "../src/server/domain/panel-notifications.js";
const json=(r,s,b)=>{r.statusCode=s;r.setHeader("Content-Type","application/json; charset=utf-8");r.setHeader("Cache-Control","no-store");r.setHeader("X-Content-Type-Options","nosniff");r.end(JSON.stringify(b));};
const headers=req=>new Headers(Object.entries(req.headers||{}).map(([k,v])=>[k,Array.isArray(v)?v.join(", "):String(v)]));
async function read(req){if(req.body&&typeof req.body==='object')return req.body;let raw='';for await(const c of req)raw+=c;return raw?JSON.parse(raw):{};}
function normalizeTrMobile(value){
  let digits=String(value||"").replace(/\D/gu,"");
  if(digits.length===12&&digits.startsWith("90"))digits=digits.slice(2);
  if(digits.length===11&&digits.startsWith("0"))digits=digits.slice(1);
  if(!/^5\d{9}$/u.test(digits))throw Object.assign(new Error("PHONE_INVALID"),{code:"PHONE_INVALID",status:400});
  return `+90${digits}`;
}
function normalizeStudentSchool(segment,value){
  if(segment.educationStage==="ADULT")return null;
  const school=String(value||"").trim();
  if(school.length<2||school.length>160)throw Object.assign(new Error("SCHOOL_REQUIRED"),{code:"SCHOOL_REQUIRED",status:400});
  return school;
}
function normalizeDateOfBirth(value){
  if(value == null || String(value).trim() === "") return null;
  const raw = String(value).trim();
  if(!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) throw Object.assign(new Error("DATE_OF_BIRTH_INVALID"),{code:"DATE_OF_BIRTH_INVALID",status:400});
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if(date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date > todayUtc) throw Object.assign(new Error("DATE_OF_BIRTH_INVALID"),{code:"DATE_OF_BIRTH_INVALID",status:400});
  return raw;
}
async function authCall(path,method,body,req){const h=headers(req);h.set('content-type','application/json');h.set('origin',requireApplicationOrigin(process.env));const out=await auth.handler(new Request("http://local/api/auth"+path,{method,headers:h,body:body?JSON.stringify(body):undefined}));return out;}
export default async function handler(req,res){const rawPath=new URL(req.url||'http://local', 'http://local').pathname; const path=rawPath === '/api/trainer-applications' ? '/trainer-application' : (rawPath.replace('/api/account-lifecycle','') || '/');
 try {
  if(path==='/register'&&req.method==='POST'){
    const b=await read(req);
    if(!(b.acceptTerms ?? b.terms)||!(b.acceptKvkk ?? b.kvkk)){
      return json(res,400,{message:'Kullanım koşulları ve KVKK aydınlatması zorunludur.'});
    }
    if(!String(b.password||'').trim()||String(b.password).length<8){
      return json(res,400,{message:'Parolanız en az 8 karakter olmalıdır.'});
    }

    let segment;
    let phone;
    let school;
    let location;
    let dateOfBirth;
    try{
      segment=validateEducationSegment(b.educationStage,b.grade);
      phone=normalizeTrMobile(b.phone);
      school=normalizeStudentSchool(segment,b.school);
      dateOfBirth=normalizeDateOfBirth(b.dateOfBirth);
      location=resolveTurkeyLocation(b.city,b.district);
      if(!location)throw Object.assign(new Error("LOCATION_INVALID"),{code:"LOCATION_INVALID",status:400});
    }catch(error){
      const code=error.code||error.message;
      if(code==='PHONE_INVALID')return json(res,400,{message:'Geçerli bir Türkiye cep telefonu girin.',error:code});
      if(code==='SCHOOL_REQUIRED')return json(res,400,{message:'Okulunuzun adını yazın.',error:code});
      if(code==='LOCATION_INVALID')return json(res,400,{message:'İl ve ilçe eşleşmesi geçersiz.',error:code});
      if(code==='DATE_OF_BIRTH_INVALID')return json(res,400,{message:'Geçerli ve bugünden önce veya bugüne eşit bir doğum tarihi girin.',error:code});
      return json(res,error.status||400,{message:'Paket grubu ve sınıf eşleşmesi geçersiz.',error:code});
    }

    const verificationTransport = getEmailTransportStatus(process.env);
    if (!verificationTransport.available) return json(res, 503, { message: 'E-posta doğrulama hizmeti henüz hazır değil.', error: 'EMAIL_VERIFICATION_TRANSPORT_UNAVAILABLE' });

      const out=await authCall('/sign-up/email','POST',{
      name:`${String(b.firstName||'').trim()} ${String(b.lastName||'').trim()}`.trim(),
      email:String(b.email||'').trim().toLowerCase(),
      password:String(b.password),
      callbackURL:'/e-posta-dogrula?alan=ogrenci'
    },req);

    const payload=await out.json().catch(()=>({}));
    if(!out.ok){
      return json(res,out.status===409?409:400,{
        message:out.status===409?'Bu e-posta adresi zaten kayıtlı.':'Kayıt tamamlanamadı.'
      });
    }

    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    try{
      await pool.query(
        `update student_profiles sp
            set education_stage=$1::education_stage,
                grade=$2,
                phone=$3,
                school=$4,
                guardian_name=$5,
                guardian_relation=$6,
                guardian_phone=$7,
                guardian_email=$8,
                city=$9,
                district=$10,
                address_line=$11,
                marketing_consent=$12,
                date_of_birth=$13,
                updated_at=now()
           from platform_users u
          where u.id=sp.user_id
            and u.auth_user_id=$14`,
        [
          segment.educationStage,
          segment.grade,
          phone,
          school,
          b.guardianName||null,
          b.guardianRelation||null,
          b.guardianPhone||null,
          b.guardianEmail||null,
          location.city,
          location.district,
          b.addressLine||null,
          b.marketingConsent===true,
          dateOfBirth,
          payload.user?.id
        ]
      );
      const registeredUser = (await pool.query("select id from platform_users where auth_user_id=$1", [payload.user?.id])).rows[0];
      if (registeredUser?.id) {
        await queueRolePanelNotifications(pool, {
          role: "OWNER",
          scopeType: "GLOBAL",
          eventType: "STUDENT_REGISTRATION_RECEIVED",
          title: "Yeni öğrenci kaydı",
          body: "Yeni bir öğrenci hesabı oluşturuldu ve doğrulama bekliyor.",
          metadata: { path: "/panel/admin/kullanici-islemleri", userId: registeredUser.id },
          dedupeKey: `student-registration:${registeredUser.id}`,
          emailSubject: "Yeni öğrenci kaydı",
        });
      }
    }finally{
      await pool.end();
    }

    return json(res,201,{success:true,emailVerification:true});
  }
  if(path==='/verify-email'&&req.method==='GET'){const token=new URL(req.url||'http://local','http://local').searchParams.get('token')||'';const out=await authCall(`/verify-email?token=${encodeURIComponent(token)}`,'GET',null,req);return json(res,out.ok?200:400,out.ok?{verified:true}:{message:'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'});}
  if(path==='/password-reset-request'&&req.method==='POST'){
    const b=await read(req);
    const requestedRedirect=String(b.redirectTo||'');
    // The role context is a small, server-allowlisted return hint. Never
    // accept an arbitrary callback URL from the browser.
    const redirectTo = [
      '/sifre-sifirla?alan=owner',
      '/sifre-sifirla?alan=egitmen',
      '/sifre-sifirla?alan=ogrenci',
    ].includes(requestedRedirect) ? requestedRedirect : '/sifre-sifirla?alan=ogrenci';
    await authCall('/request-password-reset','POST',{email:String(b.email||'').trim().toLowerCase(),redirectTo},req);
    return json(res,200,{message:'Eğer bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.'});
  }
  if(path==='/password-change'&&req.method==='POST'){ const b=await read(req); const out=await authCall('/change-password','POST',{currentPassword:String(b.currentPassword||''),newPassword:String(b.newPassword||''),revokeOtherSessions:true},req); return json(res,out.ok?200:400,out.ok?{success:true}:{message:'Mevcut parola doğrulanamadı veya yeni parola geçersiz.'}); }
  if(path==='/sessions'&&req.method==='GET'){ const out=await authCall('/list-sessions','GET',null,req); return json(res,out.ok?200:401,out.ok?await out.json():{message:'Oturum bulunamadı.'}); }
  if(path==='/sessions/revoke-others'&&req.method==='POST'){ const out=await authCall('/revoke-other-sessions','POST',{},req); return json(res,out.ok?200:401,out.ok?{success:true}:{message:'Oturumlar güncellenemedi.'}); }
  if(path==='/password-reset'&&req.method==='POST'){const b=await read(req);const out=await authCall('/reset-password','POST',{token:String(b.token||''),newPassword:String(b.password||'')},req);return json(res,out.ok?200:400,out.ok?{success:true}:{message:'Bağlantı geçersiz veya süresi dolmuş.'});}
  if(path==='/trainer-application'&&req.method==='POST'){
    // Legacy Owner-issued candidate links continue to use the safe SPA route
    // /ogretmen-aday-aktivasyon?token=...; direct applicants use the restricted
    // candidate session path below after password sign-in.
    const b=await read(req);
    if(b.legalAcknowledged!==true)return json(res,400,{message:'KVKK aydınlatması hakkında bilgilendirme gerekli.'});
    const name=String(b.name||`${b.firstName||''} ${b.lastName||''}`).trim().replace(/\s+/gu,' ');
    const parts=name.split(' ').filter(Boolean);
    const email=String(b.email||'').trim().toLowerCase();
    const rawPhone=String(b.phone||'').trim();
    if(parts.length<2||name.length>160)return json(res,400,{message:'Ad ve soyad zorunludur.'});
    if(email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)))return json(res,400,{message:'Geçerli bir e-posta adresi girin.'});
    let phone=null;
    if(rawPhone){
      try { phone=normalizeTrMobile(rawPhone); }
      catch { return json(res,400,{message:'Telefon girildiyse 5 ile başlayan geçerli bir Türkiye cep telefonu numarası yazın.'}); }
    }
    const password = String(b.password || "");
    const passwordConfirm = String(b.passwordConfirm || b.passwordRepeat || "");
    if (password.length < 12) return json(res, 400, { message: 'Parolanız en az 12 karakter olmalıdır.' });
    if (password !== passwordConfirm) return json(res, 400, { message: 'Parola ve parola tekrarı eşleşmiyor.' });
    // Better Auth sends the verification mail and stores only its credential
    // hash. A production request is refused before account creation when the
    // real SMTP boundary is unavailable; local test mail capture remains valid
    // for isolated acceptance.
    const verificationTransport = getEmailTransportStatus(process.env);
    if (!verificationTransport.available || (process.env.NODE_ENV === 'production' && verificationTransport.mode !== 'SMTP')) return json(res, 503, { message: 'E-posta doğrulama hizmeti henüz hazır değil.', error: 'EMAIL_VERIFICATION_TRANSPORT_UNAVAILABLE' });
    const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
    try {
      const existing=(await pool.query(`select p.id,p.auth_user_id,
          exists(select 1 from account a where a.user_id=p.auth_user_id and a.provider_id='credential') as credential_exists,
          exists(select 1 from trainer_applications ta where ta.candidate_user_id=p.id and ta.status <> 'REJECTED') as has_application
        from platform_users p where lower(p.email)=lower($1) limit 1`,[email])).rows[0];
      if(existing) {
        // A legacy candidate may have a platform/auth user row but no Better
        // Auth credential row. Complete that account through the normal,
        // single-use reset email; never overwrite an existing credential and
        // never create a second user or send a false “account created” mail.
        if(!existing.credential_exists && existing.has_application){
          await authCall('/request-password-reset','POST',{email,redirectTo:'/sifre-sifirla?alan=egitmen'},req);
          return json(res,202,{success:true,accountExists:true,passwordResetEmail:true});
        }
        return json(res,409,{message:'Bu e-posta ile zaten bir hesap bulunuyor.'});
      }
      const previous=(await pool.query("select id,candidate_user_id from trainer_applications where lower(email)=lower($1) and status not in ('REJECTED') order by created_at desc limit 1",[email])).rows[0];
      if(previous?.candidate_user_id) return json(res,409,{message:'Bu e-posta adresiyle hesap işlemi zaten başlatılmış.'});
      const authResponse = await authCall('/sign-up/email','POST',{name,email,password,callbackURL:'/e-posta-dogrula?alan=egitmen'},req);
      const authPayload = await authResponse.json().catch(()=>({}));
      if(!authResponse.ok) return json(res, authResponse.status === 409 ? 409 : 400, { message: authResponse.status === 409 ? 'Bu e-posta ile zaten bir hesap bulunuyor.' : 'Hesap oluşturulamadı. Girdiğiniz bilgileri kontrol edin.' });
      const authUserId = authPayload?.user?.id;
      if(!authUserId) return json(res,503,{message:'Hesap oluşturma yanıtı geçersiz.'});
      const client = await pool.connect();
      try {
        await client.query('begin');
        const platform=(await client.query('select id from platform_users where auth_user_id=$1 for update',[authUserId])).rows[0];
        if(!platform) throw new Error('ACCOUNT_MAPPING_MISSING');
        await client.query("update platform_memberships set status='REVOKED',updated_at=now() where user_id=$1 and role='STUDENT'",[platform.id]);
        await client.query('insert into trainer_profiles(user_id,first_name,last_name,phone) values($1,$2,$3,$4) on conflict(user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,updated_at=now()',[platform.id,parts[0],parts.slice(1).join(' '),phone]);
        const row = previous
          ? (await client.query("update trainer_applications set first_name=$1,last_name=$2,phone=$3,legal_acknowledged=true,candidate_user_id=$4,status='RECEIVED',updated_at=now() where id=$5 and candidate_user_id is null returning id,status",[parts[0],parts.slice(1).join(' '),phone,platform.id,previous.id])).rows[0]
          : (await client.query("insert into trainer_applications(first_name,last_name,email,phone,legal_acknowledged,candidate_user_id,status) values($1,$2,$3,$4,true,$5,'RECEIVED') returning id,status",[parts[0],parts.slice(1).join(' '),email,phone,platform.id])).rows[0];
        if(!row) throw new Error('APPLICATION_STATE_CONFLICT');
        await queueRolePanelNotifications(client, {
          role: "OWNER",
          scopeType: "GLOBAL",
          eventType: "TRAINER_APPLICATION_RECEIVED",
          title: "Yeni eğitmen başvurusu",
          body: `${name} eğitmen başvurusu gönderdi; Owner incelemesi bekleniyor.`,
          metadata: { path: `/panel/admin/egitmenler/${platform.id}`, applicationId: row.id, candidateUserId: platform.id },
          dedupeKey: `trainer-application:${row.id}`,
          emailSubject: "Yeni eğitmen başvurusu",
        });
        await client.query('commit');
        try {
          await sendTransactionalEmail({
            kind: 'trainer-welcome',
            to: email,
            recipientName: name,
            url: 'https://fixoku.com/ogretmen-girisi',
          });
        } catch { /* Account creation and verification remain authoritative if delivery is temporarily unavailable. */ }
        return json(res,201,{success:true,emailVerification:true,application:{id:row.id,status:'E-POSTA BEKLENİYOR'},profileComplete:false});
      } catch { try { await client.query('rollback'); } catch { /* rollback best effort */ } return json(res,503,{message:'Hesap oluşturuldu ancak başvuru durumu tamamlanamadı. Destek ekibi incelemeli.'}); }
      finally { client.release(); }
    }finally{await pool.end();}
  }

  if(path==='/closure'&&req.method==='POST'){const p=await resolvePrincipal(headers(req));if(!p?.user)return json(res,401,{message:'Oturum gerekli.'});const b=await read(req);const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});try{const row=(await pool.query('insert into account_closure_requests(user_id,reason) values($1,$2) returning id,status,created_at',[p.user.id,b.reason||null])).rows[0];return json(res,201,{request:{id:row.id,status:row.status}});}finally{await pool.end();}}
  return json(res,405,{message:'İşlem desteklenmiyor.'});
 } catch (error) { return json(res,error instanceof SyntaxError ? 400 : 503,{message:error instanceof SyntaxError ? 'Geçersiz istek.' : 'İşlem şu anda tamamlanamadı.'});}}
