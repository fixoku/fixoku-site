import pg from "pg";
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

async function assignedTrainer(client, studentUserId) {
  return (
    await client.query(
      `select
         ta.trainer_user_id as "trainerUserId",
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
       from trainer_assignments ta
       join enrollments e
         on e.id=ta.enrollment_id
       join platform_users u
         on u.id=ta.trainer_user_id
       left join trainer_profiles tp
         on tp.user_id=ta.trainer_user_id
       where e.student_user_id=$1
         and ta.status='ACTIVE'
       order by ta.created_at desc
       limit 1`,
      [studentUserId],
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
  const requestedProfileId = parsed.searchParams.get("studentProfileId");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const beneficiary = await resolveBeneficiary(
      client,
      principal,
      requestedProfileId || null,
    );

    const trainer = await assignedTrainer(client, beneficiary.studentUserId);

    if (!trainer) {
      return json(res, 200, {
        role,
        studentProfileId: beneficiary.studentProfileId,
        trainer: null,
      });
    }

    if (parsed.searchParams.get("photo") === "1") {
      if (!trainer.photoStorageKey) {
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

    const qualifications = (await client.query(
      `select distinct qd.code as id, qd.title as label
       from r6_trainer_qualification_grants g
       join r6_qualification_definitions qd on qd.id = g.qualification_id
       where g.trainer_user_id = $1
         and g.status = 'ACTIVE'
         and g.revoked_at is null
         and (g.valid_until is null or g.valid_until > now())
       order by label`,
      [trainer.trainerUserId],
    )).rows;

    const photoParams = new URLSearchParams();
    photoParams.set("photo", "1");
    if (requestedProfileId) {
      photoParams.set("studentProfileId", requestedProfileId);
    }

    return json(res, 200, {
      role,
      studentProfileId: beneficiary.studentProfileId,
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