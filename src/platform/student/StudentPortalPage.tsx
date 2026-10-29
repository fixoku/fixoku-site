import { useEffect, useMemo, useState } from "react";
import { StudentPanelShell } from "./StudentPanelShell";
import { studentDisplayName } from "./studentDisplayName";
import { TrainerQualificationBadgeR5 } from "../../shared/FixokuTrainerBadgeR5";
import { resolveProfileImage } from "../panel/profileAvatar";
import "./student-portal.css";
import "./student-trainer-badges-r9.css";

type StudentProfile = {
  firstName?: string;
  lastName?: string;
  grade?: string | null;
  school?: string | null;
};

type Enrollment = Record<string, unknown>;

type Badge = {
  id: string;
  label: string;
  // FIXOKU_BADGES_R9: label is a DB-backed qualification title, not a preview symbol.
};

type Trainer = {
  trainerUserId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  email: string;
  city: string;
  profession: string;
  bio: string;
  photoUrl: string | null;
  badges: Badge[];
};

function firstString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function enrollmentTitle(row: Enrollment) {
  return firstString(row, [
    "programTitle",
    "trainingProgramTitle",
    "title",
    "name",
    "programName",
  ]) || "Eğitim";
}

function enrollmentStatus(row: Enrollment) {
  const original = firstString(row, ["statusLabel", "status", "enrollmentStatus"]);
  if (!original) return "";
  const normalized = original.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const turkish: Record<string, string> = {
    ACTIVE: "Devam Ediyor",
    IN_PROGRESS: "Devam Ediyor",
    ONGOING: "Devam Ediyor",
    ENROLLED: "Kayıtlı",
    PENDING: "Bekliyor",
    PLANNED: "Planlandı",
    SCHEDULED: "Planlandı",
    COMPLETED: "Tamamlandı",
    COMPLETE: "Tamamlandı",
    FINISHED: "Tamamlandı",
    CANCELLED: "İptal Edildi",
    CANCELED: "İptal Edildi",
  };
  return turkish[normalized] || original;
}

function extractEnrollments(body: Record<string, unknown>) {
  const direct = body.enrollments;
  if (Array.isArray(direct)) return direct as Enrollment[];

  const educations = body.educations;
  if (Array.isArray(educations)) return educations as Enrollment[];

  const student = body.student;
  if (student && typeof student === "object") {
    const nested = (student as Record<string, unknown>).enrollments;
    if (Array.isArray(nested)) return nested as Enrollment[];
  }

  return [];
}

function trainerInitials(trainer: Trainer) {
  return `${trainer.firstName.charAt(0)}${trainer.lastName.charAt(0)}`.toLocaleUpperCase("tr-TR");
}

export function StudentPortalPage({
  user,
  roles = [],
  guardian,
}: {
  user: { name: string; email?: string };
  roles?: string[];
  guardian?: boolean;
}) {
  const isGuardian = guardian ?? roles.includes("GUARDIAN");
  const [profile, setProfile] = useState<StudentProfile>({});
  const [portal, setPortal] = useState<Record<string, unknown>>({});
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [trainerPhotoError, setTrainerPhotoError] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = window.location.search || "";

    Promise.all([
      fetch(`/api/student/profile${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
      fetch(`/api/student/portal-context${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
      fetch(`/api/student/assigned-trainer${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    ])
      .then(async ([profileResponse, portalResponse, trainerResponse]) => {
        if (!profileResponse.ok || !portalResponse.ok) {
          throw new Error("Öğrenci bilgileri yüklenemedi.");
        }

        const profileBody = await profileResponse.json();
        const portalBody = await portalResponse.json();
        const trainerBody = trainerResponse.ok
          ? await trainerResponse.json()
          : { trainer: null };

        setProfile(profileBody.profile || {});
        setPortal(portalBody || {});
        setTrainer(trainerBody.trainer || null);
        setTrainerPhotoError(false);
        setState("ready");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Öğrenci paneli yüklenemedi.");
        setState("error");
      });
  }, []);

  const enrollments = useMemo(() => extractEnrollments(portal), [portal]);

  const studentName = studentDisplayName(profile.firstName, profile.lastName, user.name);

  const studentMeta = [
    profile.grade ? `${profile.grade}. Sınıf` : "",
    profile.school || "",
  ]
    .filter(Boolean)
    .join(" · ");

  // FIXOKU_BADGES_R9: same trusted avatar resolver as the trainer's own profile.
  // A missing or broken photo falls back to initials, never to an invented portrait.
  const trainerPhotoSrc = trainer
    ? trainer.photoUrl || resolveProfileImage({ name: trainer.displayName, email: trainer.email })
    : null;

  if (state === "loading") {
    return (
      <StudentPanelShell user={user} guardian={isGuardian}>
        <div className="student-portal__state" role="status">
          Öğrenci paneli yükleniyor…
        </div>
      </StudentPanelShell>
    );
  }

  if (state === "error") {
    return (
      <StudentPanelShell user={user} guardian={isGuardian}>
        <div className="student-portal__state" role="alert">
          <h3>Panel yüklenemedi</h3>
          <p>{message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Tekrar dene
          </button>
        </div>
      </StudentPanelShell>
    );
  }

  return (
    <StudentPanelShell user={user} guardian={isGuardian}>
      <main className="student-dashboard-v2 student-dashboard-v2--refined">
        <header className="student-dashboard-v2__heading">
          <div className="student-dashboard-v2__welcome">
            <span className="student-dashboard-v2__welcome-label">Öğrenme alanım</span>
            <h1>Merhaba, {studentName}</h1>
          </div>
          <div className="student-dashboard-v2__count" aria-label={`${enrollments.length} eğitim kaydı`}>
            <span>{enrollments.length}</span>
            <span>Eğitim kaydım</span>
          </div>
        </header>

        <div className="student-dashboard-v2__workspace">
          <div className="student-dashboard-v2__primary">
            <section className="student-dashboard-v2__student-card" aria-label="Öğrenci bilgileri">
              <div className="student-dashboard-v2__mini-heading">Öğrenci bilgilerim</div>
              <div className="student-dashboard-v2__student-identity">
                <div className="student-dashboard-v2__student-avatar" aria-hidden="true">
                  {(profile.firstName || studentName).charAt(0).toLocaleUpperCase("tr-TR")}
                  {(profile.lastName || studentName.split(" ").at(-1) || "").charAt(0).toLocaleUpperCase("tr-TR")}
                </div>
                <div className="student-dashboard-v2__student-info">
                  <h2>{studentName}</h2>
                  <p>{studentMeta || "Öğrenci"}</p>
                </div>
              </div>
            </section>

            <section className="student-dashboard-v2__enrollments" aria-label="Kayıtlı eğitimlerim">
              <div className="student-dashboard-v2__section-heading">
                <div>
                  <span className="student-dashboard-v2__eyebrow">EĞİTİM TAKİBİ</span>
                  <h2>Eğitimlerim</h2>
                </div>
                <span>{enrollments.length} kayıt</span>
              </div>
              {enrollments.length ? (
                <div className="student-dashboard-v2__enrollment-list">
                  {enrollments.map((item, index) => (
                    <article className="student-dashboard-v2__enrollment" key={index}>
                      <div className="student-dashboard-v2__enrollment-icon" aria-hidden="true">✓</div>
                      <div className="student-dashboard-v2__enrollment-copy">
                        <h3>{enrollmentTitle(item)}</h3>
                        <p>Kayıtlı eğitim</p>
                      </div>
                      {enrollmentStatus(item) && (
                        <span className="student-dashboard-v2__status">{enrollmentStatus(item)}</span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="student-dashboard-v2__empty">
                  <strong>Henüz eğitim kaydı bulunmuyor</strong>
                  <p>Atanan veya satın alınan eğitimler burada gösterilecektir.</p>
                </div>
              )}
            </section>
          </div>

          <section className="student-trainer-card" aria-label="Atanan eğitmen">
            <div className="student-trainer-card__title-row">
              <div>
                <span className="student-dashboard-v2__eyebrow">EĞİTMEN BİLGİLERİ</span>
                <h2>Eğitmenim</h2>
              </div>
              {trainer && <span className="student-trainer-card__assignment">Atanan eğitmen</span>}
            </div>
            {trainer ? (
              <>
                <div className="student-trainer-card__identity">
                  <div className="student-trainer-card__portrait-stack">
                    {trainerPhotoSrc && !trainerPhotoError ? (
                      <img
                        className="student-trainer-card__photo"
                        src={trainerPhotoSrc}
                        alt={`${trainer.displayName} profil fotoğrafı`}
                        onError={() => setTrainerPhotoError(true)}
                      />
                    ) : (
                      <div className="student-trainer-card__photo student-trainer-card__photo--fallback">
                        {trainerInitials(trainer)}
                      </div>
                    )}
                  </div>
                  <div className="student-trainer-card__identity-copy">
                    <h3>{trainer.displayName}</h3>
                    <p>{[trainer.profession, trainer.city].filter(Boolean).join(" · ") || "FIXOKU Eğitmeni"}</p>
                  </div>
                </div>
                {trainer.badges.length > 0 && (
                  <div className="student-trainer-card__badges" aria-label="Eğitmenin aktif uzmanlık rozetleri">
                    {trainer.badges.map((badge) => (
                      <TrainerQualificationBadgeR5 key={badge.id} title={badge.label} fallback={null} size={76} zoomSize={168} />
                    ))}
                  </div>
                )}
                <div className="student-trainer-card__details">
                  {trainer.phone && (
                    <a href={`tel:${trainer.phone}`} className="student-trainer-card__detail">
                      <strong>Telefon</strong>
                      <span>{trainer.phone}</span>
                    </a>
                  )}
                  {trainer.email && (
                    <a href={`mailto:${trainer.email}`} className="student-trainer-card__detail">
                      <strong>E-posta</strong>
                      <span>{trainer.email}</span>
                    </a>
                  )}
                  {trainer.bio && (
                    <div className="student-trainer-card__bio">
                      <strong>Kısa Özgeçmiş</strong>
                      <p>{trainer.bio}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="student-dashboard-v2__empty">
                <strong>Henüz eğitmen atanmamış</strong>
                <p>Eğitmen ataması yapıldığında bilgileri burada görünecek.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </StudentPanelShell>
  );
}

// FIXOKU_BADGES_R9: assigned trainer uses the shared PNG badge renderer.
