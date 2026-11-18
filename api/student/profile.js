import pg from "../../src/server/db/guarded-pg.js";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createProfilePhotoUrl, getProfileMediaConfig, removeProfilePhoto, saveProfilePhoto } from "../../src/server/domain/profile-media.js";
import { validateEducationSegment } from "../../src/server/domain/student-segment.js";
import { resolveTurkeyLocation } from "../../src/data/turkeyLocations.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
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
async function body(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(req, res) {
  const isPhoto = new URL(req.url || "", "http://local").pathname.endsWith("/photo");
  if (isPhoto && req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!isPhoto && !["GET", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const role = principal.memberships.some((m) => m.role === "GUARDIAN") && !principal.memberships.some((m) => m.role === "STUDENT") ? "GUARDIAN" : principal.memberships.some((m) => m.role === "STUDENT") ? "STUDENT" : null;
  if (!role || !principal.user) return json(res, 403, { error: "FORBIDDEN" });
  const query = new URL(req.url || "", "http://local").searchParams;
  const profileIds = query.getAll("studentProfileId").filter(Boolean);
  const childIds = query.getAll("childProfileId");
  if (profileIds.length > 1 || childIds.length > 1 || (profileIds.length && childIds.length) || [...profileIds, ...childIds].some(id => !UUID.test(id))) return json(res, 400, { error: "INVALID_STUDENT_PROFILE_ID" });
  const requested = profileIds[0] || childIds[0] || null;
  const explicitChild = childIds.length === 1;
  // R399: a selected identity must never fall through to another sibling.
  const photoPath = (id, child) => `/api/student/profile/photo${id ? `?${child ? "childProfileId" : "studentProfileId"}=${encodeURIComponent(id)}` : ""}`;
  let b;
  try { b = req.method === "PATCH" ? await body(req) : null; } catch { return json(res, 400, { error: "INVALID_BODY" }); }
  if (req.method === "PATCH" && (!b || typeof b !== "object" || Array.isArray(b))) return json(res, 400, { error: "INVALID_BODY" });
  const photoOnly = b?.photoOnly === true;
  const educationOnly = b?.childEducationOnly === true;
  if (educationOnly && (!explicitChild || photoOnly || Object.keys(b).some(k => !["childEducationOnly", "school", "grade", "classBranch"].includes(k)))) return json(res, 400, { error: "INVALID_CHILD_EDUCATION_REQUEST" });
  if (role === "GUARDIAN" && req.method === "PATCH" && (!requested || (!photoOnly && !educationOnly))) return json(res, 403, { error: "FORBIDDEN" });
  const readDenied = requirePermission(principal, "student.profile.read", { role });
  if (readDenied) return json(res, readDenied.status, readDenied.body);
  if (req.method === "PATCH" && role === "STUDENT") {
    const writeDenied = requirePermission(principal, "student.profile.update", { role: "STUDENT" });
    if (writeDenied) return json(res, writeDenied.status, writeDenied.body);
    if (requested && !photoOnly && !educationOnly) return json(res, 403, { error: "FORBIDDEN" });
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const c = await pool.connect();
    try {
      let profile;
      let child = null;
      if (role === "GUARDIAN") {
        const activeGuardian = (await c.query("select 1 from guardian_profiles where user_id=$1 and status='ACTIVE' limit 1", [principal.user.id])).rows[0];
        if (!activeGuardian) return json(res, 403, { error: "FORBIDDEN" });
      }
      if (requested) {
        child = (await c.query(`select cp.* from r6_student_child_profiles cp
          where cp.id=$2 and cp.status='ACTIVE' and (cp.owner_user_id=$1 or ($3='GUARDIAN' and exists (
            select 1 from guardian_student_relationships g join student_profiles sp on sp.id=g.student_profile_id
            where g.guardian_user_id=$1 and g.status='ACTIVE' and sp.status='ACTIVE' and sp.id=cp.legacy_student_profile_id and sp.user_id=cp.owner_user_id)))`, [principal.user.id, requested, role])).rows[0];
        if (explicitChild && !child) return json(res, 403, { error: "FORBIDDEN" });
      }
      if (child) {
        const path = photoPath(child.id, true);
        if (req.method === "PATCH") {
          if (educationOnly) {
            let segment, school, branch;
            try {
              if (child.education_stage === "ADULT") return json(res, 400, { error: "INVALID_EDUCATION_STAGE" });
              segment = validateEducationSegment(child.education_stage, b.grade);
              school = normalizeStudentSchool(segment, b.school);
              branch = String(b.classBranch ?? "").trim().toLocaleUpperCase("tr-TR");
              if (branch.length > 12 || (branch && !/^[\p{L}\p{N} -]+$/u.test(branch))) throw new Error("INVALID_CLASS_BRANCH");
            } catch { return json(res, 400, { error: "VALIDATION_ERROR" }); }
            const saved = (await c.query(`update r6_student_child_profiles cp set school=$1,grade=$2,class_branch=$3,updated_at=now()
              where cp.id=$4 and cp.status='ACTIVE' and cp.education_stage=$5 and (cp.owner_user_id=$6 or ($7='GUARDIAN' and exists (
                select 1 from guardian_student_relationships g join student_profiles sp on sp.id=g.student_profile_id
                where g.guardian_user_id=$6 and g.status='ACTIVE' and sp.status='ACTIVE' and sp.id=cp.legacy_student_profile_id and sp.user_id=cp.owner_user_id)))
              returning id,school,grade,class_branch`, [school, segment.grade, branch || null, child.id, child.education_stage, principal.user.id, role])).rows[0];
            if (!saved) return json(res, 403, { error: "FORBIDDEN" });
            return json(res, 200, { childProfileId: saved.id, school: saved.school, grade: saved.grade, classBranch: saved.class_branch });
          }
          if (!photoOnly) return json(res, 403, { error: "FORBIDDEN" });
          if (b.removePhoto === true && b.photoDataUrl) return json(res, 400, { error: "PHOTO_INVALID" });
          const mediaConfig = getProfileMediaConfig();
          let key = null;
          if (b.removePhoto !== true) {
            if (typeof b.photoDataUrl !== "string" || !b.photoDataUrl) return json(res, 400, { error: "PHOTO_REQUIRED" });
            key = (await saveProfilePhoto(mediaConfig, `child-${child.id}`, b.photoDataUrl)).key;
          }
          // Recheck identity at write time. Never touch the account's legacy photo.
          const updated = (await c.query(`update r6_student_child_profiles cp set photo_storage_key=$1,updated_at=now()
            where cp.id=$2 and cp.status='ACTIVE' and (cp.owner_user_id=$3 or ($4='GUARDIAN' and exists (
              select 1 from guardian_student_relationships g join student_profiles sp on sp.id=g.student_profile_id
              where g.guardian_user_id=$3 and g.status='ACTIVE' and sp.status='ACTIVE' and sp.id=cp.legacy_student_profile_id and sp.user_id=cp.owner_user_id))) returning photo_storage_key`, [key, child.id, principal.user.id, role])).rows[0];
          if (!updated) return json(res, 403, { error: "FORBIDDEN" });
          // Do not delete old objects here: legacy or other records can still reference them.
          return json(res, 200, { photoStorageKey: updated.photo_storage_key, photoUrl: updated.photo_storage_key ? path : null });
        }
        if (isPhoto) {
          const media = await (await import("../../src/server/domain/profile-media.js")).readProfilePhoto(getProfileMediaConfig(), child.photo_storage_key);
          if (!media) return json(res, 404, { error: "PHOTO_NOT_FOUND" });
          res.statusCode=200; res.setHeader("Content-Type", media.mime); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(media.buffer); return;
        }
        return json(res, 200, { profile: { id: child.id, childProfileId: child.id, firstName: child.first_name, lastName: child.last_name, educationStage: child.education_stage, grade: child.grade, school: child.school, classBranch: child.class_branch, photoStorageKey: child.photo_storage_key || null, photoUrl: child.photo_storage_key ? path : null } });
      }
      if (role === "STUDENT") profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id where sp.user_id=$1 and sp.status='ACTIVE' and ($2::uuid is null or sp.id=$2) limit 1", [principal.user.id, requested])).rows[0];
      else if (requested) profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id join guardian_student_relationships gsr on gsr.student_profile_id=sp.id and gsr.guardian_user_id=$1 and gsr.status='ACTIVE' where sp.id=$2 and sp.status='ACTIVE'", [principal.user.id, requested])).rows[0];
      else profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id join guardian_student_relationships gsr on gsr.student_profile_id=sp.id and gsr.guardian_user_id=$1 and gsr.status='ACTIVE' where sp.status='ACTIVE' order by sp.id limit 1", [principal.user.id])).rows[0];
      if (!profile) return json(res, requested ? 403 : 200, requested ? { error: "FORBIDDEN" } : { profile: null });
       if (isPhoto) { const mediaConfig = getProfileMediaConfig(); if (profile.photo_storage_key && (mediaConfig.provider === "S3" || mediaConfig.provider === "R2")) { res.statusCode = 302; res.setHeader("Location", createProfilePhotoUrl(mediaConfig, profile.photo_storage_key)); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("Referrer-Policy", "no-referrer"); res.end(); return; } const media = await (await import("../../src/server/domain/profile-media.js")).readProfilePhoto(mediaConfig, profile.photo_storage_key); if (!media) return json(res, 404, { error: "PHOTO_NOT_FOUND" }); res.statusCode = 200; res.setHeader("Content-Type", media.mime); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(media.buffer); return; }
      if (req.method === "GET") { const dob = profile.date_of_birth instanceof Date ? profile.date_of_birth.toISOString().slice(0, 10) : String(profile.date_of_birth || "").slice(0, 10); return json(res, 200, { profile: { id: profile.id, userId: profile.user_id, firstName: profile.first_name || profile.user_name?.split(/\s+/u)[0] || "", lastName: profile.last_name || profile.user_name?.split(/\s+/u).slice(1).join(" ") || "", photoStorageKey: profile.photo_storage_key || null, photoUrl: profile.photo_storage_key ? photoPath(profile.id, false) : null, dateOfBirth: dob, educationStage: profile.education_stage, grade: profile.grade, classBranch: profile.class_branch, school: profile.school, schoolType: profile.school_type, city: profile.city, district: profile.district, email: profile.email, phone: profile.phone, guardianRelation: profile.guardian_relation, guardianName: profile.guardian_name, guardianPhone: profile.guardian_phone, guardianEmail: profile.guardian_email, addressLine: profile.address_line, postalCode: profile.postal_code, marketingConsent: Boolean(profile.marketing_consent) } }); }
      // FIXOKU_R23_PHOTO_SAVE: photo-only update, avoids unrelated form validation.
      if (b.photoOnly === true) {
        if (b.removePhoto === true && b.photoDataUrl) return json(res, 400, { error: "PHOTO_INVALID" });
        if (b.removePhoto !== true && (typeof b.photoDataUrl !== "string" || !b.photoDataUrl)) return json(res, 400, { error: "PHOTO_REQUIRED" });
        const mediaConfig = getProfileMediaConfig();
        const key = b.removePhoto === true ? null : (await saveProfilePhoto(mediaConfig, profile.user_id, b.photoDataUrl)).key;
        const updated = (await c.query(`update student_profiles sp set photo_storage_key=$1,updated_at=now() where sp.id=$2 and sp.status='ACTIVE' and (sp.user_id=$3 or ($4='GUARDIAN' and exists (select 1 from guardian_student_relationships g where g.guardian_user_id=$3 and g.student_profile_id=sp.id and g.status='ACTIVE'))) returning photo_storage_key`, [key, profile.id, principal.user.id, role])).rows[0];
        if (!updated) return json(res, 403, { error: "FORBIDDEN" });
        return json(res, 200, { photoStorageKey: updated.photo_storage_key, photoUrl: updated.photo_storage_key ? photoPath(profile.id, false) : null });
      }
      let segment;
      let phone;
      let school;
      let dateOfBirth;
      let location;
      try {
        segment = validateEducationSegment(b.educationStage, b.grade);
        phone = normalizeTrMobile(b.phone);
        school = normalizeStudentSchool(segment, b.school);
        dateOfBirth = normalizeDateOfBirth(b.dateOfBirth);
        location = resolveTurkeyLocation(b.city, b.district);
        if (!location) throw Object.assign(new Error("LOCATION_INVALID"), { code: "LOCATION_INVALID", status: 400 });
      } catch (error) {
        const code = error.code || error.message;
        if (code === "PHONE_INVALID") return json(res, 400, { error: "VALIDATION_ERROR", errors: { phone: "Geçerli bir Türkiye cep telefonu girin." } });
        if (code === "SCHOOL_REQUIRED") return json(res, 400, { error: "VALIDATION_ERROR", errors: { school: "Okulunuzun adını yazın." } });
        if (code === "LOCATION_INVALID") return json(res, 400, { error: "VALIDATION_ERROR", errors: { city: "İl ve ilçe eşleşmesi geçersiz." } });
        if (code === "DATE_OF_BIRTH_INVALID") return json(res, 400, { error: "VALIDATION_ERROR", errors: { dateOfBirth: "Geçerli ve bugünden önce veya bugüne eşit bir tarih girin." } });
        return json(res, 400, { error: "VALIDATION_ERROR", errors: { educationStage: "Paket grubu ve sınıf eşleşmesi geçersiz." } });
      }

      const fields = [
        "first_name",
        "last_name",
        "date_of_birth",
        "education_stage",
        "grade",
        "school",
        "city",
        "district",
        "phone",
        "address_line",
        "postal_code",
        "marketing_consent",
        "guardian_name",
        "guardian_email",
        "guardian_phone",
        "guardian_relation",
      ];

      const values = {
        first_name: String(b.firstName || "").trim(),
        last_name: String(b.lastName || "").trim(),
        date_of_birth: dateOfBirth,
        education_stage: segment.educationStage,
        grade: segment.grade,
        school,
        city: location.city,
        district: location.district,
        phone,
        address_line: b.addressLine || null,
        postal_code: b.postalCode || null,
        marketing_consent: b.marketingConsent === true,
        guardian_name: segment.educationStage === "ADULT" ? profile.guardian_name : String(b.guardianName ?? profile.guardian_name ?? "").trim(),
        guardian_email: segment.educationStage === "ADULT" ? profile.guardian_email : String(b.guardianEmail ?? profile.guardian_email ?? "").trim().toLowerCase(),
        guardian_phone: segment.educationStage === "ADULT" ? profile.guardian_phone : String(b.guardianPhone ?? profile.guardian_phone ?? "").trim(),
        guardian_relation: segment.educationStage === "ADULT" ? profile.guardian_relation : String(b.guardianRelation ?? profile.guardian_relation ?? "").trim(),
      };

      const errors = {};
      if (values.first_name.length < 1 || values.first_name.length > 80) errors.firstName = "Ad alanı zorunludur.";
      if (values.last_name.length < 1 || values.last_name.length > 80) errors.lastName = "Soyad alanı zorunludur.";
      if (values.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/u.test(values.date_of_birth)) errors.dateOfBirth = "Tarih geçersiz.";
      if (segment.educationStage !== "ADULT") {
        if (values.guardian_name.length < 2 || values.guardian_name.length > 160) errors.guardianName = "Veli adı soyadı zorunludur.";
        if (values.guardian_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(values.guardian_email)) errors.guardianEmail = "Geçerli bir veli e-postası girin.";
        if (!["Anne","Baba","Vasi","Diğer"].includes(values.guardian_relation)) errors.guardianRelation = "Yakınlık derecesini seçin.";
        try { values.guardian_phone = normalizeTrMobile(values.guardian_phone); } catch { errors.guardianPhone = "Geçerli bir veli cep telefonu girin."; }
      }
      if (Object.keys(errors).length) return json(res, 400, { error: "VALIDATION_ERROR", errors });
      let photoKey = profile.photo_storage_key || null; if (b.photoDataUrl) photoKey = (await saveProfilePhoto(getProfileMediaConfig(), profile.user_id, b.photoDataUrl)).key; if (b.removePhoto) photoKey = null;
      const set = fields.map((f, i) => `"${f}"=$${i + 1}`).join(", "); const params = fields.map((f) => values[f]); params.push(photoKey, profile.id);
      const saved = (await c.query(`update student_profiles set ${set}, photo_storage_key=$${params.length - 1}, updated_at=now() where id=$${params.length} returning *`, params)).rows[0];
      if (b.removePhoto && profile.photo_storage_key) await removeProfilePhoto(getProfileMediaConfig(), profile.photo_storage_key);
      await c.query("update platform_users set display_name=$1,updated_at=now() where id=$2", [`${values.first_name} ${values.last_name}`.trim(), profile.user_id]);
      return json(res, 200, { profile: { ...values, id: saved.id, userId: profile.user_id, email: profile.email, photoStorageKey: saved.photo_storage_key || null, photoUrl: saved.photo_storage_key ? "/api/student/profile/photo" : null, guardianName: saved.guardian_name, guardianRelation: saved.guardian_relation, guardianPhone: saved.guardian_phone, guardianEmail: saved.guardian_email, addressLine: saved.address_line, postalCode: saved.postal_code, marketingConsent: Boolean(saved.marketing_consent) } });
    } finally { c.release(); }
  } catch (error) { return json(res, error.code === "22P02" ? 400 : 503, { error: error.code === "22P02" ? "VALIDATION_ERROR" : "STUDENT_PROFILE_UNAVAILABLE" }); } finally { await pool.end(); }
}
