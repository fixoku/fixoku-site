import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { getProfileMediaConfig, removeProfilePhoto, saveProfilePhoto } from "../../src/server/domain/profile-media.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const GRADES = new Set(["Anaokulu", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
async function body(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

export default async function handler(req, res) {
  const isPhoto = new URL(req.url || "", "http://local").pathname.endsWith("/photo");
  if (isPhoto && req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (!isPhoto && !["GET", "PATCH"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req));
  if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const role = principal.memberships.some((m) => m.role === "GUARDIAN") && !principal.memberships.some((m) => m.role === "STUDENT") ? "GUARDIAN" : principal.memberships.some((m) => m.role === "STUDENT") ? "STUDENT" : null;
  if (!role || !principal.user) return json(res, 403, { error: "FORBIDDEN" });
  const requested = new URL(req.url, "http://local").searchParams.get("studentProfileId");
  if (requested && !UUID.test(requested)) return json(res, 400, { error: "INVALID_STUDENT_PROFILE_ID" });
  const readDenied = requirePermission(principal, "student.profile.read", { role });
  if (readDenied) return json(res, readDenied.status, readDenied.body);
  if (req.method === "PATCH") {
    const writeDenied = requirePermission(principal, "student.profile.update", { role: "STUDENT" });
    if (writeDenied) return json(res, writeDenied.status, writeDenied.body);
    if (requested) return json(res, 403, { error: "FORBIDDEN" });
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const c = await pool.connect();
    try {
      let profile;
      if (role === "STUDENT") profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id where sp.user_id=$1 and sp.status='ACTIVE' limit 1", [principal.user.id])).rows[0];
      else if (requested) profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id join guardian_student_relationships gsr on gsr.student_profile_id=sp.id and gsr.guardian_user_id=$1 and gsr.status='ACTIVE' where sp.id=$2 and sp.status='ACTIVE'", [principal.user.id, requested])).rows[0];
      else profile = (await c.query("select sp.*,u.display_name as user_name,u.email from student_profiles sp join platform_users u on u.id=sp.user_id join guardian_student_relationships gsr on gsr.student_profile_id=sp.id and gsr.guardian_user_id=$1 and gsr.status='ACTIVE' where sp.status='ACTIVE' order by sp.id limit 1", [principal.user.id])).rows[0];
      if (!profile) return json(res, requested ? 403 : 200, requested ? { error: "FORBIDDEN" } : { profile: null });
      if (isPhoto) { const media = await (await import("../../src/server/domain/profile-media.js")).readProfilePhoto(getProfileMediaConfig(), profile.photo_storage_key); if (!media) return json(res, 404, { error: "PHOTO_NOT_FOUND" }); res.statusCode = 200; res.setHeader("Content-Type", media.mime); res.setHeader("Cache-Control", "private, no-store"); res.setHeader("X-Content-Type-Options", "nosniff"); res.end(media.buffer); return; }
      if (req.method === "GET") { const dob = profile.date_of_birth instanceof Date ? profile.date_of_birth.toISOString().slice(0, 10) : String(profile.date_of_birth || "").slice(0, 10); return json(res, 200, { profile: { id: profile.id, userId: profile.user_id, firstName: profile.first_name || profile.user_name?.split(/\s+/u)[0] || "", lastName: profile.last_name || profile.user_name?.split(/\s+/u).slice(1).join(" ") || "", photoStorageKey: profile.photo_storage_key || null, photoUrl: profile.photo_storage_key ? "/api/student/profile/photo" : null, dateOfBirth: dob, grade: profile.grade, classBranch: profile.class_branch, school: profile.school, schoolType: profile.school_type, city: profile.city, district: profile.district, email: profile.email, phone: profile.phone, guardianRelation: profile.guardian_relation, guardianName: profile.guardian_name, guardianPhone: profile.guardian_phone, guardianEmail: profile.guardian_email, addressLine: profile.address_line, postalCode: profile.postal_code, marketingConsent: Boolean(profile.marketing_consent) } }); }
      const b = await body(req); const fields = ["first_name", "last_name", "date_of_birth", "grade", "class_branch", "school", "school_type", "city", "district", "phone", "guardian_relation", "guardian_name", "guardian_phone", "guardian_email", "address_line", "postal_code", "marketing_consent"];
      const values = { first_name: String(b.firstName || "").trim(), last_name: String(b.lastName || "").trim(), date_of_birth: b.dateOfBirth || null, grade: b.grade || null, class_branch: b.classBranch || null, school: b.school || null, school_type: b.schoolType || null, city: b.city || null, district: b.district || null, phone: b.phone || null, guardian_relation: b.guardianRelation || null, guardian_name: b.guardianName || null, guardian_phone: b.guardianPhone || null, guardian_email: b.guardianEmail || null, address_line: b.addressLine || null, postal_code: b.postalCode || null, marketing_consent: b.marketingConsent === true };
      const errors = {}; if (values.first_name.length < 1 || values.first_name.length > 80) errors.firstName = "Ad alanı zorunludur."; if (values.last_name.length < 1 || values.last_name.length > 80) errors.lastName = "Soyad alanı zorunludur."; if (values.grade && !GRADES.has(values.grade)) errors.grade = "Geçerli bir sınıf seçin."; if (values.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/u.test(values.date_of_birth)) errors.dateOfBirth = "Tarih geçersiz."; if (Object.keys(errors).length) return json(res, 400, { error: "VALIDATION_ERROR", errors });
      let photoKey = profile.photo_storage_key || null; if (b.photoDataUrl) photoKey = (await saveProfilePhoto(getProfileMediaConfig(), profile.user_id, b.photoDataUrl)).key; if (b.removePhoto) photoKey = null;
      const set = fields.map((f, i) => `"${f}"=$${i + 1}`).join(", "); const params = fields.map((f) => values[f]); params.push(photoKey, profile.id);
      const saved = (await c.query(`update student_profiles set ${set}, photo_storage_key=$${params.length - 1}, updated_at=now() where id=$${params.length} returning *`, params)).rows[0];
      if (b.removePhoto && profile.photo_storage_key) await removeProfilePhoto(getProfileMediaConfig(), profile.photo_storage_key);
      await c.query("update platform_users set display_name=$1,updated_at=now() where id=$2", [`${values.first_name} ${values.last_name}`.trim(), profile.user_id]);
      return json(res, 200, { profile: { ...values, id: saved.id, userId: profile.user_id, email: profile.email, photoStorageKey: saved.photo_storage_key || null, photoUrl: saved.photo_storage_key ? "/api/student/profile/photo" : null, guardianName: saved.guardian_name, guardianPhone: saved.guardian_phone, guardianEmail: saved.guardian_email, addressLine: saved.address_line, postalCode: saved.postal_code, marketingConsent: Boolean(saved.marketing_consent) } });
    } finally { c.release(); }
  } catch (error) { return json(res, error.code === "22P02" ? 400 : 503, { error: error.code === "22P02" ? "VALIDATION_ERROR" : "STUDENT_PROFILE_UNAVAILABLE" }); } finally { await pool.end(); }
}
