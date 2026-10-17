import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const headers = (req) =>
  new Headers(
    Object.entries(req.headers || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(", ") : String(value),
    ]),
  );

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const principal = await resolvePrincipal(headers(req));
    if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });

    const denied = requirePermission(principal, "student.profile.read");
    if (denied) return json(res, denied.status, denied.body);

    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const candidates = (
        await pool.query(`
          select distinct on (
            pe.beneficiary_student_user_id,
            pe.package_version_id,
            pp.id
          )
            u.id as "studentUserId",
            sp.id as "studentProfileId",
            u.display_name as "studentName",
            u.email as "studentEmail",
            sp.education_stage as "educationStage",
            sp.grade,
            sp.class_branch as "classBranch",
            sp.school,
            pe.package_version_id as "packageVersionId",
            pv.title as "packageTitle",
            pp.id as "trainingProductId",
            pp.title as "trainingTitle",
            pp.service_type as "trainingType",
            pp.service_mode as "serviceMode",
            coalesce(pp.min_students, 1)::int as "configuredMinStudents",
            coalesce(pp.max_students, 5)::int as "maxStudents",
            qd.id as "requiredQualificationId",
            qd.code as "requiredQualificationCode",
            qd.title as "requiredQualificationTitle",
            pe.effective_at as "entitlementEffectiveAt"
          from package_entitlements pe
          join platform_users u
            on u.id = pe.beneficiary_student_user_id
          left join student_profiles sp
            on sp.user_id = u.id
          join package_versions pv
            on pv.id = pe.package_version_id
          join package_components pc
            on pc.package_version_id = pe.package_version_id
           and pc.is_active = true
          join physical_products pp
            on pp.id = coalesce(pc.physical_product_id, pc.reference_id)
           and pp.is_active = true
          join lateral (
            select q.id,q.code,q.title
            from r6_qualification_definitions q
            where q.service_type = pp.service_type
              and q.education_stage = sp.education_stage
            order by q.code
            limit 1
          ) qd on true
          where pe.status = 'ACTIVE'
            and pp.r6_product_type = 'TRAINING_SERVICE'
            and pp.service_mode = 'GROUP'
            and not exists (
              select 1
              from r6_training_group_participants rgp
              join r6_training_groups rg
                on rg.id = rgp.training_group_id
              where rgp.student_user_id = u.id
                and rgp.status = 'ACTIVE'
                and rg.mode = 'GROUP'
                and rg.education_stage = sp.education_stage
                and rg.training_type = pp.service_type
                and rg.required_qualification_id = qd.id
                and rg.status in ('DRAFT','ASSIGNED','IN_PROGRESS')
            )
          order by
            pe.beneficiary_student_user_id,
            pe.package_version_id,
            pp.id,
            pe.effective_at desc
        `)
      ).rows;

      return json(res, 200, { candidates });
    } finally {
      await pool.end();
    }
  } catch (cause) {
    return json(res, cause?.status || 503, {
      error: cause?.message || "R6_GROUP_ASSIGNMENT_CANDIDATES_UNAVAILABLE",
    });
  }
}