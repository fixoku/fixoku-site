import pg from "pg";
import { effectiveTrainerQualificationPredicate, projectTrainerQualificationBadges, TRAINER_BASE_QUALIFICATION_CODES } from "../../src/server/domain/trainer-expertise.js";
import { resolvePrincipal } from "../../src/server/auth/authorization.js";
import { resolveBeneficiary } from "../../src/server/domain/commerce.js";
import {
  getProfileMediaConfig,
  readProfilePhoto,
} from "../../src/server/domain/profile-media.js";

// FIXOKU_BADGES_R9: only database-backed active qualifications.

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
};

const headersOf = (req) =>
  new Headers(
    Object.entries(req.headers || {}).map(([key, value]) => [key, String(value)]),
  );

async function assignedTrainer(client, beneficiary) {
  return (
    await client.query(
      `select
         ta.trainer_user_id as "trainerUserId",
         ta.enrollment_id as "enrollmentId",
         $2::uuid as "childProfileId",
         u.display_name as "displayName",
         u.email,
         tp.first_name as "firstName",
         tp.last_name as "lastName",
         tp.phone,
         tp.city,
         tp.profession,
         tp.bio,
         tp.specialties,
         tp.photo_storage_key as "photoStorageKey"
       from (
         select a.trainer_user_id,a.enrollment_id,a.created_at
         from trainer_assignments a
         join enrollments e on e.id=a.enrollment_id
         where e.student_user_id=$1 and a.status='ACTIVE'
           and e.status in ('ACTIVE','PAUSED','COMPLETED')
           and e.beneficiary_child_profile_id is not distinct from $2::uuid
         union all
         select g.trainer_user_id,p.enrollment_id,p.created_at
         from r6_training_group_participants p
         join r6_training_groups g on g.id=p.training_group_id
         where p.student_user_id=$1 and p.status='ACTIVE'
           and g.status in ('ASSIGNED','IN_PROGRESS')
           and g.trainer_user_id is not null
           and p.child_profile_id is not distinct from $2::uuid
           and ($2::uuid is not null or p.student_profile_id=$3::uuid)
       ) ta
       join platform_users u on u.id=ta.trainer_user_id
       left join trainer_profiles tp on tp.user_id=ta.trainer_user_id
       order by ta.created_at desc,ta.trainer_user_id
       limit 1`,
      [beneficiary.studentUserId, beneficiary.childProfileId || null, beneficiary.studentProfileId || null],
    )
  ).rows[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const principal = await resolvePrincipal(headersOf(req));
  if (!principal) {
    return json(res, 401, { error: "UNAUTHENTICATED" });
  }

  const role = principal.memberships.some((item) => item.role === "GUARDIAN")
    ? "GUARDIAN"
    : principal.memberships.some((item) => item.role === "STUDENT")
      ? "STUDENT"
      : null;

  if (!role) {
    return json(res, 403, { error: "FORBIDDEN" });
  }

  const parsed = new URL(req.url || "", "http://local");
  const childIds = parsed.searchParams.getAll("childProfileId");
  const profileIds = [...parsed.searchParams.getAll("studentProfileId"), ...parsed.searchParams.getAll("studentId")];
  if (childIds.length + profileIds.length !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(childIds[0] || profileIds[0] || "")) {
    return json(res, 403, { error: "EXPLICIT_PROFILE_REQUIRED" });
  }
  const requestedProfileId = childIds[0] || profileIds[0];

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const beneficiary = await resolveBeneficiary(
      client,
      principal,
      requestedProfileId || null,
    );

    if (childIds.length ? String(beneficiary.childProfileId || "").toLowerCase() !== requestedProfileId.toLowerCase() : beneficiary.childProfileId || String(beneficiary.studentProfileId || "").toLowerCase() !== requestedProfileId.toLowerCase()) {
      return json(res, 403, { error: "FORBIDDEN" });
    }
    const trainer = await assignedTrainer(client, beneficiary);

    if (!trainer) {
      return json(res, 200, {
        role,
        studentProfileId: beneficiary.studentProfileId,
        childProfileId: beneficiary.childProfileId || null,
        trainer: null,
      });
    }

    if (parsed.searchParams.get("photo") === "1") {
      if (parsed.searchParams.get("trainerUserId") !== trainer.trainerUserId || !trainer.photoStorageKey) {
        res.statusCode = 404;
        res.setHeader("Cache-Control", "private, no-store");
        res.end();
        return;
      }

      const media = await readProfilePhoto(
        getProfileMediaConfig(),
        trainer.photoStorageKey,
      );

      if (!media) {
        res.statusCode = 404;
        res.setHeader("Cache-Control", "private, no-store");
        res.end();
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", media.mime);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(media.buffer);
      return;
    }

    const firstName =
      String(trainer.firstName || "").trim() ||
      String(trainer.displayName || "").trim().split(/\s+/u)[0] ||
      "";

    const lastName =
      String(trainer.lastName || "").trim() ||
      String(trainer.displayName || "").trim().split(/\s+/u).slice(1).join(" ");

    const displayName =
      `${firstName} ${lastName}`.trim() ||
      String(trainer.displayName || "").trim();

    const qualificationRows = (await client.query(
      `select distinct qd.code as id, qd.title as label
       from r6_trainer_qualification_grants g
       join r6_qualification_definitions qd on qd.id = g.qualification_id
       where g.trainer_user_id = $1
         and qd.code = any($2::text[])
         and ${effectiveTrainerQualificationPredicate("g")}
       order by label`,
      [trainer.trainerUserId, TRAINER_BASE_QUALIFICATION_CODES],
    )).rows;
    const qualifications = projectTrainerQualificationBadges(qualificationRows);

    const photoParams = new URLSearchParams();
    photoParams.set("photo", "1");
    photoParams.set(beneficiary.childProfileId ? "childProfileId" : "studentProfileId", requestedProfileId);
    photoParams.set("trainerUserId", trainer.trainerUserId);

    return json(res, 200, {
      role,
      studentProfileId: beneficiary.studentProfileId,
      childProfileId: beneficiary.childProfileId || null,
      trainer: {
        trainerUserId: trainer.trainerUserId,
        firstName,
        lastName,
        displayName,
        phone: trainer.phone || "",
        email: trainer.email || "",
        city: trainer.city || "",
        profession: trainer.profession || "",
        bio: trainer.bio || "",
        photoUrl: trainer.photoStorageKey
          ? `/api/student/assigned-trainer?${photoParams.toString()}`
          : null,
        badges: qualifications,
      },
    });
  } catch (error) {
    return json(res, error.status || 503, {
      error: error.code || error.message || "ASSIGNED_TRAINER_UNAVAILABLE",
    });
  } finally {
    client.release();
    await pool.end();
  }
}
