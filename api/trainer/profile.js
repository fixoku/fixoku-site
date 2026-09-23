import { eq } from "drizzle-orm";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { createDb } from "../../src/server/db/client.js";
import { trainerProfiles, users, auditEvents } from "../../src/server/db/schema.js";
import { getProfileMediaConfig, readProfilePhoto, removeProfilePhoto, saveProfilePhoto } from "../../src/server/domain/profile-media.js";
import { resolveTurkeyLocation } from "../../src/data/turkeyLocations.js";

const editable = [
  "firstName",
  "lastName",
  "phone",
  "city",
  "district",
  "profession",
  "institution",
  "educationBackground",
  "experience",
  "specialties",
  "bio",
];

const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
};

const view = (row, user) => {
  const parts = String(user.displayName || "").trim().split(/\s+/u);
  return {
    firstName: row?.firstName ?? parts[0] ?? "",
    lastName: row?.lastName ?? parts.slice(1).join(" "),
    phone: row?.phone ?? "",
    city: row?.city ?? "",
    district: row?.district ?? "",
    profession: row?.profession ?? "",
    institution: row?.institution ?? "",
    educationBackground: row?.educationBackground ?? "",
    experience: row?.experience ?? "",
    specialties: row?.specialties ?? "",
    bio: row?.bio ?? "",
    photoStorageKey: row?.photoStorageKey ?? null,
    photoUrl: row?.photoStorageKey ? "/api/trainer/profile/photo" : null,
    email: user.email,
  };
};

function normalizeTrMobile(value) {
  let digits = String(value || "").replace(/\D/gu, "");
  if (digits.length === 12 && digits.startsWith("90")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^5\d{9}$/u.test(digits)) {
    throw Object.assign(new Error("PHONE_INVALID"), {
      code: "PHONE_INVALID",
      status: 400,
    });
  }
  return `+90${digits}`;
}

const validate = (body) => {
  const errors = {};

  for (const key of Object.keys(body)) {
    if (!editable.includes(key) && !["photoDataUrl", "removePhoto"].includes(key)) {
      errors[key] = "Bu alan güncellenemez.";
    }
  }

  for (const key of editable) {
    if (body[key] !== undefined && typeof body[key] !== "string") {
      errors[key] = "Metin değeri bekleniyor.";
    }
  }

  if (
    body.firstName !== undefined &&
    (!body.firstName.trim() || body.firstName.length > 80)
  ) {
    errors.firstName = "Ad alanı geçersiz.";
  }

  if (
    body.lastName !== undefined &&
    (!body.lastName.trim() || body.lastName.length > 80)
  ) {
    errors.lastName = "Soyad alanı geçersiz.";
  }

  if (body.phone !== undefined) {
    try {
      normalizeTrMobile(body.phone);
    } catch {
      errors.phone = "5 ile başlayan 10 haneli Türkiye cep telefonu girin.";
    }
  }

  if (body.city !== undefined || body.district !== undefined) {
    const location = resolveTurkeyLocation(body.city, body.district);
    if (!location) errors.city = "İl ve ilçe eşleşmesi geçersiz.";
  }

  if (body.bio !== undefined && body.bio.length > 500) {
    errors.bio = "Kısa özgeçmiş 500 karakteri geçemez.";
  }

  if (body.photoDataUrl !== undefined && typeof body.photoDataUrl !== "string") {
    errors.photoDataUrl = "Fotoğraf verisi geçersiz.";
  }

  if (body.removePhoto !== undefined && typeof body.removePhoto !== "boolean") {
    errors.removePhoto = "Fotoğraf silme değeri geçersiz.";
  }

  return errors;
};

async function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(request, response) {
  const isPhoto = new URL(request.url || "", "http://local").pathname.endsWith("/photo");

  if (isPhoto && request.method !== "GET") {
    return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  if (!isPhoto && !["GET", "PATCH"].includes(request.method)) {
    return json(response, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const principal = await resolvePrincipal(request.headers);
    if (!principal) return json(response, 401, { error: "UNAUTHENTICATED" });

    const denied = requirePermission(
      principal,
      request.method === "GET" ? "trainer.profile.read" : "trainer.profile.update",
      { role: "TRAINER" },
    );

    if (denied) return json(response, denied.status, denied.body);

    const { db, pool } = createDb();

    try {
      const user = principal.user;
      const existing = await db
        .select()
        .from(trainerProfiles)
        .where(eq(trainerProfiles.userId, user.id))
        .limit(1);

      if (isPhoto) {
        const media = await readProfilePhoto(
          getProfileMediaConfig(),
          existing[0]?.photoStorageKey,
        );

        if (!media) return json(response, 404, { error: "PHOTO_NOT_FOUND" });

        response.statusCode = 200;
        response.setHeader("Content-Type", media.mime);
        response.setHeader("Cache-Control", "private, no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.end(media.buffer);
        return;
      }

      if (request.method === "GET") {
        const profile = view(existing[0], user);
        const photoAvailable = profile.photoStorageKey
          ? Boolean(
              await readProfilePhoto(
                getProfileMediaConfig(),
                profile.photoStorageKey,
              ),
            )
          : false;

        return json(response, 200, {
          profile: {
            ...profile,
            photoUrl: photoAvailable ? profile.photoUrl : null,
          },
        });
      }

      const body = await readBody(request);
      const errors = validate(body);

      if (Object.keys(errors).length) {
        return json(response, 400, {
          error: "VALIDATION_ERROR",
          errors,
        });
      }

      const current = existing[0];
      let photoStorageKey = current?.photoStorageKey ?? null;

      if (body.photoDataUrl) {
        photoStorageKey = (
          await saveProfilePhoto(
            getProfileMediaConfig(),
            user.id,
            body.photoDataUrl,
          )
        ).key;
      }

      if (body.removePhoto) photoStorageKey = null;

      const location =
        body.city !== undefined || body.district !== undefined
          ? resolveTurkeyLocation(body.city, body.district)
          : {
              city: current?.city ?? null,
              district: current?.district ?? null,
            };

      const values = {
        firstName: body.firstName ?? current?.firstName ?? null,
        lastName: body.lastName ?? current?.lastName ?? null,
        phone:
          body.phone !== undefined
            ? normalizeTrMobile(body.phone)
            : current?.phone ?? null,
        city: location?.city ?? null,
        district: location?.district ?? null,
        profession: body.profession ?? current?.profession ?? null,
        institution: body.institution ?? current?.institution ?? null,
        educationBackground:
          body.educationBackground ?? current?.educationBackground ?? null,
        experience: body.experience ?? current?.experience ?? null,
        specialties: body.specialties ?? current?.specialties ?? null,
        photoStorageKey,
        bio: body.bio ?? current?.bio ?? null,
        updatedAt: new Date(),
      };

      const firstName =
        body.firstName ??
        current?.firstName ??
        String(user.displayName).split(/\s+/u)[0] ??
        "";

      const lastName =
        body.lastName ??
        current?.lastName ??
        String(user.displayName).split(/\s+/u).slice(1).join(" ");

      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const saved = current
        ? (
            await db
              .update(trainerProfiles)
              .set(values)
              .where(eq(trainerProfiles.userId, user.id))
              .returning()
          )[0]
        : (
            await db
              .insert(trainerProfiles)
              .values({ userId: user.id, ...values })
              .returning()
          )[0];

      await db
        .update(users)
        .set({
          displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await pool.query(
        'update "user" set name=$1, updated_at=now() where id=$2',
        [displayName, user.authUserId],
      );

      if (body.removePhoto && current?.photoStorageKey) {
        await removeProfilePhoto(
          getProfileMediaConfig(),
          current.photoStorageKey,
        );
      }

      await db.insert(auditEvents).values({
        actorUserId: user.id,
        action: "trainer.profile.update",
        subjectType: "TrainerProfile",
        subjectId: saved.id,
        result: "SUCCESS",
        correlationId: crypto.randomUUID(),
        metadataJson: JSON.stringify({
          fields: Object.keys(body).filter(
            (field) =>
              editable.includes(field) ||
              ["photoDataUrl", "removePhoto"].includes(field),
          ),
        }),
      });

      return json(response, 200, {
        profile: view(
          { ...saved, firstName, lastName },
          { ...user, displayName },
        ),
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json(response, 400, { error: "INVALID_JSON" });
    }

    return json(response, 500, { error: "PROFILE_UNAVAILABLE" });
  }
}