import { useEffect, useMemo, useState } from "react";
import { StudentPanelShell } from "./StudentPanelShell";
import "./student-portal.css";

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
  symbol: "speed" | "flow" | "focus" | "paragraph" | "understand" | "coach" | "exam";
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
  return firstString(row, ["statusLabel", "status", "enrollmentStatus"]);
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
        setState("ready");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Öğrenci paneli yüklenemedi.");
        setState("error");
      });
  }, []);

  const enrollments = useMemo(() => extractEnrollments(portal), [portal]);

  const studentName =
    `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
    user.name ||
    "Öğrenci";

  const studentMeta = [
    profile.grade ? `${profile.grade}. Sınıf` : "",
    profile.school || "",
  ]
    .filter(Boolean)
    .join(" · ");

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
      <main className="student-dashboard-v2">
        <header className="student-dashboard-v2__heading">
          <h1>Merhaba, {studentName}</h1>
          <p>Profilinizi, eğitmeninizi ve kayıtlı eğitimlerinizi buradan takip edebilirsiniz.</p>
        </header>

        <div className="student-dashboard-v2__top-grid">
          <section className="student-dashboard-v2__student-card">
            <div className="student-dashboard-v2__student-avatar" aria-hidden="true">
              {(profile.firstName || studentName).charAt(0).toLocaleUpperCase("tr-TR")}
              {(profile.lastName || studentName.split(" ").at(-1) || "").charAt(0).toLocaleUpperCase("tr-TR")}
            </div>
            <div>
              <span className="student-dashboard-v2__eyebrow">ÖĞRENCİ BİLGİLERİ</span>
              <h2>{studentName}</h2>
              {studentMeta && <p>{studentMeta}</p>}
            </div>
          </section>

          <section className="student-trainer-card">
            <div className="student-trainer-card__title-row">
              <div>
                <span className="student-dashboard-v2__eyebrow">ATANAN ÖĞRETMEN</span>
                <h2>Eğitmenim</h2>
              </div>
            </div>

            {trainer ? (
              <>
                <div className="student-trainer-card__identity">
                  {trainer.photoUrl ? (
                    <img
                      className="student-trainer-card__photo"
                      src={trainer.photoUrl}
                      alt={`${trainer.displayName} profil fotoğrafı`}
                    />
                  ) : (
                    <div className="student-trainer-card__photo student-trainer-card__photo--fallback">
                      {trainerInitials(trainer)}
                    </div>
                  )}

                  <div className="student-trainer-card__identity-copy">
                    <h3>{trainer.displayName}</h3>
                    <p>
                      {[trainer.profession, trainer.city].filter(Boolean).join(" · ") ||
                        "FIXOKU Eğitmeni"}
                    </p>

                    {trainer.badges.length > 0 && (
                      <div className="student-trainer-card__badges" aria-label="Eğitmen uzmanlıkları">
                        {trainer.badges.map((badge) => (
                          <span
                            className="student-trainer-card__badge"
                            key={badge.id}
                            title={badge.label}
                            aria-label={badge.label}
                          >
                            <SpecialtyIcon symbol={badge.symbol} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

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
              <p className="student-trainer-card__empty">
                Henüz size atanmış bir eğitmen bulunmuyor.
              </p>
            )}
          </section>
        </div>

        <section className="student-dashboard-v2__enrollments">
          <div className="student-dashboard-v2__section-heading">
            <h2>Eğitimlerim</h2>
            <span>{enrollments.length} kayıt</span>
          </div>

          {enrollments.length ? (
            <div className="student-dashboard-v2__enrollment-list">
              {enrollments.map((item, index) => (
                <article className="student-dashboard-v2__enrollment" key={index}>
                  <div>
                    <h3>{enrollmentTitle(item)}</h3>
                    <p>Kayıtlı eğitim</p>
                  </div>
                  {enrollmentStatus(item) && (
                    <span className="student-dashboard-v2__status">
                      {enrollmentStatus(item)}
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="student-portal__state">
              <h3>Kayıtlı eğitim bulunmuyor</h3>
              <p>Atanan veya satın alınan eğitimler burada gösterilecektir.</p>
            </div>
          )}
        </section>
      </main>
    </StudentPanelShell>
  );
}

function SpecialtyIcon({ symbol }: { symbol: Badge["symbol"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 26 26",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  if (symbol === "speed") {
    return <svg {...common}><path d="M4 15a9 9 0 1 1 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 14l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="13" cy="14" r="2" fill="currentColor"/></svg>;
  }
  if (symbol === "flow") {
    return <svg {...common}><path d="M4 8h12M4 13h18M4 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m18 6 4 2-4 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
  }
  if (symbol === "focus") {
    return <svg {...common}><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="2"/><circle cx="13" cy="13" r="3" fill="currentColor"/><path d="M13 2v3M13 21v3M2 13h3M21 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  }
  if (symbol === "paragraph") {
    return <svg {...common}><path d="M7 5h12M7 10h12M7 15h8M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="4" cy="5" r="1.3" fill="currentColor"/><circle cx="4" cy="10" r="1.3" fill="currentColor"/><circle cx="4" cy="15" r="1.3" fill="currentColor"/><circle cx="4" cy="20" r="1.3" fill="currentColor"/></svg>;
  }
  if (symbol === "understand") {
    return <svg {...common}><path d="M5 7.5C7.5 5 10 4 13 4s5.5 1 8 3.5V20c-2.5-1.6-5-2.4-8-2.4S7.5 18.4 5 20V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M13 4v13.5" stroke="currentColor" strokeWidth="2"/></svg>;
  }
  if (symbol === "coach") {
    return <svg {...common}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M4 21c.5-5 2.5-7 5-7s4.5 2 5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m17 10 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  return <svg {...common}><path d="M5 5h16v16H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 10h8M9 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m15 18 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}