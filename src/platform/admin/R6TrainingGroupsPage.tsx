import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";
const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format((minor || 0) / 100);
type Group = any;
const stageLabel: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const trainingLabel: Record<string, string> = { FAST_READING: "Hızlı okuma", PARAGRAPH: "Paragraf" };
const modeLabel: Record<string, string> = { INDIVIDUAL: "Birebir", GROUP: "Grup" };

const trainingGroupStatusLabel = (value: string) => ({
  COMPLETED: "Tamamlandı",
  IN_PROGRESS: "Devam Ediyor",
  PENDING: "Bekliyor",
  ACTIVE: "Aktif",
  CANCELLED: "İptal Edildi",
  ASSIGNED: "Atandı",
  UNASSIGNED: "Atanmadı",
}[value] ?? value);
export function R6TrainingGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const trainerAvatar = (trainer: any) => {
    const name = String(trainer?.displayName || trainer?.name || "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/ı/gu, "i")
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9 ]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim();

    if (name === "elif usta") return "/images/profiles/elif.jpg";
    if (name === "ozlem kaplan") return "/images/profiles/ozlem.jpg";
    return null;
  };

  const stageLabel = (value: string) =>
    ({ PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" } as Record<string, string>)[value] || value;

  const trainingLabel = (value: string) =>
    ({ FAST_READING: "Hızlı Okuma", PARAGRAPH: "Paragraf" } as Record<string, string>)[value] || value;

  const statusLabel = (value: string) =>
    ({ DRAFT: "Oluşuyor", ASSIGNED: "Atandı", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandı", CANCELLED: "İptal" } as Record<string, string>)[value] || value;

  const candidateKey = (candidate: any) =>
    `${candidate.studentUserId}:${candidate.packageVersionId}:${candidate.trainingProductId}`;

  const load = async () => {
    const [g, q] = await Promise.all([
      fetch("/api/admin/r6-training-groups", { credentials: "same-origin" }),
      fetch("/api/admin/r6-qualifications", { credentials: "same-origin" }),
    ]);

    const gj = await g.json().catch(() => ({}));
    const qj = await q.json().catch(() => ({}));

    setGroups(gj.groups || []);
    setTrainers(qj.trainers || []);
    setCandidates(gj.candidates || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(
    () => candidates.find((candidate) => candidateKey(candidate) === selectedKey) || null,
    [candidates, selectedKey],
  );

  const eligible = useMemo(() => {
    if (!selected) return [];
    return trainers.filter((trainer) => {
      const matchingGrant = (trainer.grants || []).find(
        (grant: any) =>
          grant.qualificationId === selected.requiredQualificationId ||
          (grant.serviceType === selected.trainingType &&
            grant.educationStage === selected.educationStage),
      );
      return matchingGrant?.status === "ACTIVE" || Number(trainer.activeQualificationCount) >= 6;
    });
  }, [trainers, selected]);

  const compatibleGroups = (trainerUserId: string) => {
    if (!selected) return [];
    return groups
      .filter(
        (group) =>
          group.mode === "GROUP" &&
          group.trainerUserId === trainerUserId &&
          group.requiredQualificationId === selected.requiredQualificationId &&
          group.educationStage === selected.educationStage &&
          group.trainingType === selected.trainingType &&
          ["DRAFT", "ASSIGNED", "IN_PROGRESS"].includes(group.status),
      )
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  };

  const trainerCapacity = (trainerUserId: string) => {
    if (!selected) return { text: "—", open: false, count: 0, max: 5 };

    const all = compatibleGroups(trainerUserId);
    const maxDefault = Number(selected.maxStudents || 5);
    const open = all.find((group) => {
      const count = Number(
        group.activeParticipantCount ??
          (group.participants || []).filter((participant: any) => participant.status === "ACTIVE").length,
      );
      const max = Number(group.maxStudents || maxDefault);
      return count < max;
    });

    if (open) {
      const count = Number(
        open.activeParticipantCount ??
          (open.participants || []).filter((participant: any) => participant.status === "ACTIVE").length,
      );
      const max = Number(open.maxStudents || maxDefault);
      return { text: `Açık grup: ${count}/${max}`, open: true, count, max };
    }

    const full = all
      .map((group) => ({
        count: Number(
          group.activeParticipantCount ??
            (group.participants || []).filter((participant: any) => participant.status === "ACTIVE").length,
        ),
        max: Number(group.maxStudents || maxDefault),
      }))
      .find((item) => item.count >= item.max);

    return {
      text: full ? `Mevcut grup ${full.count}/${full.max} · Yeni grup 1/${maxDefault} açılacak` : `Yeni grup 1/${maxDefault} açılacak`,
      open: false,
      count: 0,
      max: maxDefault,
    };
  };

  const assign = async () => {
    if (!selected || !trainerId) return;

    setMessage("");

    const body = {
      packageVersionId: selected.packageVersionId,
      trainingProductId: selected.trainingProductId,
      educationStage: selected.educationStage,
      trainingType: selected.trainingType,
      mode: "GROUP",
      minStudents: Number(selected.configuredMinStudents || 1),
      maxStudents: Number(selected.maxStudents || 5),
      trainerUserId: trainerId,
      requiredQualificationId: selected.requiredQualificationId,
      participants: [
        {
          studentUserId: selected.studentUserId,
          studentProfileId: selected.studentProfileId || null,
        },
      ],
    };

    const response = await fetch("/api/admin/r6-training-groups", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errors: Record<string, string> = {
        R6_CAPACITY_INVALID: "Bu öğrenci sayısı için grup ücret matrisi henüz tanımlı değil.",
        R6_PARTICIPANT_ALREADY_GROUPED: "Bu öğrenci aynı grup eğitiminde zaten aktif bir gruba atanmış.",
        R6_TRAINER_QUALIFICATION_REQUIRED: "Seçilen eğitmenin bu eğitim için aktif yetkinliği yok.",
        R6_QUALIFICATION_MISMATCH: "Öğrencinin eğitim paketi ile eğitmen yetkinliği eşleşmiyor.",
      };
      setMessage(errors[result.error] || result.error || "Grup ataması yapılamadı.");
      return;
    }

    setMessage("Öğrenci gruba atandı.");
    setSelectedKey("");
    setTrainerId("");
    await load();
  };

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return groups
      .filter((group) => group.mode === "GROUP")
      .filter((group) => {
        if (!query) return true;
        const students = (group.participants || [])
          .map((participant: any) => participant.studentName || participant.studentEmail || "")
          .join(" ");
        return `${group.trainerName || ""} ${group.trainingType || ""} ${group.educationStage || ""} ${students}`
          .toLocaleLowerCase("tr-TR")
          .includes(query);
      });
  }, [groups, search]);

  return (
    <main className="platform-foundation-panel admin-panel training-groups-center assignment-operation-page">
      <header className="admin-page-hero assignment-operation-hero">
        <div>
          <span>EĞİTİM OPERASYONU</span>
          <h1>Grup Atamaları</h1>
        <div className="group-page-hero-art" aria-hidden="true">
          <svg viewBox="0 0 320 150" fill="none">
            <path className="group-page-hero-dash" d="M25 116c38-62 95-89 174-73 44 9 72 31 94 67" />
            <rect x="90" y="45" width="66" height="66" rx="18" className="group-page-hero-card pale-one" />
            <rect x="192" y="53" width="66" height="66" rx="18" className="group-page-hero-card pale-two" />
            <rect x="135" y="22" width="88" height="88" rx="22" className="group-page-hero-card main-card" />
            <circle cx="178" cy="52" r="10" className="group-page-hero-person" />
            <path d="M153 79c4-12 14-18 25-18s21 6 25 18" className="group-page-hero-person-stroke" />
            <circle cx="121" cy="70" r="7" className="group-page-hero-person-soft" />
            <path d="M105 90c3-9 9-14 16-14s13 5 16 14" className="group-page-hero-person-soft-stroke" />
            <circle cx="225" cy="77" r="7" className="group-page-hero-person-muted" />
            <path d="M209 97c3-9 9-14 16-14s13 5 16 14" className="group-page-hero-person-muted-stroke" />
          </svg>
        </div>
          <p>Grup eğitimi hakkı bulunan öğrenciyi seçin; paket bilgileri otomatik gelsin, yetkin eğitmene atayın.</p>
        </div>
      </header>

      <div className="admin-segmented-tabs assignment-operation-tabs">
        <Link to="/panel/admin/atamalar">Birebir Atamalar</Link>
        <Link className="is-active" to="/panel/owner/egitim-gruplari">Grup Atamaları</Link>
      </div>

      {message && <p className="admin-inline-status" role="status">{message}</p>}

      <section className="panel-card group-assignment-builder-v20">
        <div className="admin-section-heading">
          <div>
            <span>YENİ GRUP ATAMASI</span>
            <h2>Öğrenciyi eğitmene ata</h2>
            <p>Grup adı veya grup numarası girilmez. Sistem açık grubu kullanır; doluysa yenisini otomatik açar.</p>
          </div>
          <span className="training-mode-pill">Grup</span>
        </div>

        <div className="group-assignment-step">
          <div className="group-assignment-step-number">1</div>
          <div className="group-assignment-step-body">
            <label className="group-assignment-student-select">
              <span>Öğrenci</span>
              <select
                value={selectedKey}
                onChange={(event) => {
                  setSelectedKey(event.target.value);
                  setTrainerId("");
                }}
              >
                <option value="">Grup eğitimi hakkı olan öğrenciyi seçin</option>
                {candidates.map((candidate) => (
                  <option key={candidateKey(candidate)} value={candidateKey(candidate)}>
                    {candidate.studentName} · {candidate.packageTitle}
                  </option>
                ))}
              </select>
            </label>

            {!candidates.length && (
              <div className="group-assignment-empty">
                Atama bekleyen aktif grup eğitimi paketi bulunmuyor.
              </div>
            )}
          </div>
        </div>

        {selected && (
          <>
            <section className="group-assignment-summary" aria-label="Atama özeti">
              <div className="group-assignment-summary-heading">
                <div>
                  <span>ATAMA ÖZETİ</span>
                  <strong>Seçilen eğitim bilgileri</strong>
                </div>
                <small>Bilgiler öğrencinin aktif paketinden otomatik getirildi.</small>
              </div>

              <div className="group-assignment-context-grid">
                <article className="group-assignment-context-card is-student">
                  <div className="group-assignment-context-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                      <path d="M4.8 20c.7-3.3 3.3-5.4 7.2-5.4s6.5 2.1 7.2 5.4" />
                    </svg>
                  </div>
                  <div className="group-assignment-context-copy">
                    <span>Öğrenci</span>
                    <strong>{selected.studentName}</strong>
                    <small>{selected.school || "Okul bilgisi yok"}{selected.grade ? ` · ${selected.grade}. sınıf` : ""}{selected.classBranch ? ` / ${selected.classBranch}` : ""}</small>
                  </div>
                </article>

                <article className="group-assignment-context-card is-package">
                  <div className="group-assignment-context-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z" />
                      <path d="M4 7.5V17l8 4 8-4V7.5" />
                      <path d="M12 12v9" />
                    </svg>
                  </div>
                  <div className="group-assignment-context-copy">
                    <span>Paket</span>
                    <strong>{selected.packageTitle}</strong>
                    <small>{selected.trainingTitle}</small>
                  </div>
                </article>

                <article className="group-assignment-context-card is-training">
                  <div className="group-assignment-context-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12H7.5A2.5 2.5 0 0 1 5 16.5v-12Z" />
                      <path d="M17 7h2v12h-2" />
                      <path d="M8.5 8.5h5M8.5 12h5" />
                    </svg>
                  </div>
                  <div className="group-assignment-context-copy">
                    <span>Eğitim</span>
                    <strong>{stageLabel(selected.educationStage)} · {trainingLabel(selected.trainingType)}</strong>
                    <small>Grup eğitimi · En fazla {Number(selected.maxStudents || 5)} öğrenci</small>
                  </div>
                </article>

                <article className="group-assignment-context-card is-qualification">
                  <div className="group-assignment-context-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 3 15 5l3.6-.2.6 3.5L21 11l-2 2.7-.1 3.6-3.6.5L12 20l-3.3-2.2-3.6-.5L5 13.7 3 11l1.8-2.7.6-3.5L9 5l3-2Z" />
                      <path d="m8.8 11.6 2.1 2.1 4.3-4.3" />
                    </svg>
                  </div>
                  <div className="group-assignment-context-copy">
                    <span>Eğitmen yetkinliği</span>
                    <strong>{selected.requiredQualificationTitle}</strong>
                    <small>Paketten otomatik belirlendi</small>
                  </div>
                </article>
              </div>
            </section>

            <div className="group-assignment-step">
              <div className="group-assignment-step-number">2</div>
              <div className="group-assignment-step-body">
                <div className="group-trainer-picker-heading">
                  <div>
                    <strong>Yetkin eğitmeni seçin</strong>
                    <span>{eligible.length} uygun eğitmen</span>
                  </div>
                </div>

                <div className="group-trainer-card-grid">
                  {eligible.map((trainer) => {
                    const avatar = trainerAvatar(trainer);
                    const capacity = trainerCapacity(trainer.id);
                    const name = trainer.displayName || trainer.name || "Eğitmen";
                    const initials = String(name)
                      .split(/\s+/u)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toLocaleUpperCase("tr-TR");

                    return (
                      <label className={`group-trainer-card ${trainerId === trainer.id ? "is-selected" : ""}`} key={trainer.id}>
                        <input
                          type="radio"
                          name="groupTrainer"
                          value={trainer.id}
                          checked={trainerId === trainer.id}
                          onChange={(event) => setTrainerId(event.target.value)}
                        />
                        <span className="group-trainer-avatar" aria-hidden="true">
                          {avatar ? <img src={avatar} alt="" loading="lazy" /> : <b>{initials}</b>}
                        </span>
                        <span className="group-trainer-copy">
                          <strong>{name}</strong>
                          <small>{selected.requiredQualificationTitle}</small>
                          <em className={capacity.open ? "is-open" : "is-new"}>{capacity.text}</em>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {!eligible.length && (
                  <div className="group-assignment-empty">Bu eğitim için aktif yetkin eğitmen bulunamadı.</div>
                )}
              </div>
            </div>

            <button
              className="assignment-primary-action group-assignment-submit"
              type="button"
              disabled={!trainerId}
              onClick={() => void assign()}
            >
              Gruba ata
            </button>
          </>
        )}
      </section>

      <section className="panel-card active-group-list-v20">
        <div className="admin-section-heading">
          <div>
            <span>AKTİF KAYITLAR</span>
            <h2>Aktif Eğitim Grupları</h2>
          </div>
          <label className="group-list-search">
            <span>Ara</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Eğitmen veya öğrenci" />
          </label>
        </div>

        {!visibleGroups.length ? (
          <div className="admin-empty-state">
            <strong>Aktif grup bulunmuyor</strong>
            <span>İlk grup ataması yapıldığında burada otomatik oluşacak.</span>
          </div>
        ) : (
          <div className="active-group-card-grid">
            {visibleGroups.map((group) => {
              const activeCount = Number(
                group.activeParticipantCount ??
                  (group.participants || []).filter((participant: any) => participant.status === "ACTIVE").length,
              );
              const max = Number(group.maxStudents || 5);
              const trainerRecord = trainers.find((trainer: any) => trainer.id === group.trainerUserId);
              const trainerPhoto =
                trainerRecord?.photoUrl ||
                trainerRecord?.avatarUrl ||
                trainerRecord?.profilePhotoUrl ||
                trainerRecord?.imageUrl ||
                (String(group.trainerName || "").toLocaleLowerCase("tr-TR") === "özlem kaplan"
                  ? "/images/profiles/ozlem.jpg"
                  : String(group.trainerName || "").toLocaleLowerCase("tr-TR") === "elif usta"
                    ? "/images/profiles/elif.jpg"
                    : "");
              const activeParticipants = (group.participants || []).filter(
                (participant: any) => participant.status === "ACTIVE",
              );
              const rosterItems = Array.from({ length: max }, (_, index) => activeParticipants[index] || null);

              return (
                <article className="active-group-card fixoku-group-card-xl" key={group.id}>
                  <div className="active-group-card-top">
                    <div>
                      <span>{stageLabel(group.educationStage)}</span>
                      <h3>{trainingLabel(group.trainingType)}</h3>
                    </div>
                    <strong className={activeCount >= max ? "is-full" : "is-open"}>{activeCount}/{max}</strong>
                  </div>

                  <div className="active-group-meta active-group-trainer-meta">
                    <span>Eğitmen</span>
                    <div className="fixoku-group-trainer-media">
                      {trainerPhoto ? (
                        <img
                          src={trainerPhoto}
                          alt={group.trainerName || "Eğitmen"}
                          className="fixoku-group-trainer-avatar"
                        />
                      ) : (
                        <div className="fixoku-group-trainer-avatar is-fallback" aria-hidden="true">
                          {(group.trainerName || "E").split(/\s+/).slice(0, 2).map((part: string) => part[0] || "").join("").toUpperCase()}
                        </div>
                      )}
                      <div className="fixoku-group-trainer-copy">
                        <strong>{group.trainerName || "Atanmadı"}</strong>
                        <small>{group.requiredQualificationTitle || "Yetkin eğitmen"}</small>
                      </div>
                    </div>
                  </div>

                  <div className="active-group-meta">
                    <span>Yetkinlik</span>
                    <strong>{group.requiredQualificationTitle || "—"}</strong>
                  </div>

                  <div className="active-group-meta">
                    <span>Durum</span>
                    <strong>{statusLabel(group.status)}</strong>
                  </div>

                  <div className="active-group-roster">
                    {rosterItems.map((participant: any, index: number) => {
                      const studentName = participant?.studentName || participant?.studentEmail || "Boş kontenjan";
                      const classLabel = participant?.grade ? `${participant.grade}. Sınıf` : "—";

                      return (
                        <div
                          className={`active-group-roster-row ${participant ? "is-filled" : "is-empty"}`}
                          key={participant?.id || `${group.id}-slot-${index}`}
                        >
                          <span className="active-group-roster-number">{index + 1}</span>
                          <span className="active-group-roster-user-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="8" r="3.3" />
                              <path d="M5.5 19c.7-4.1 3.1-6.2 6.5-6.2s5.8 2.1 6.5 6.2" />
                            </svg>
                          </span>
                          <strong>{participant ? studentName : "Boş kontenjan"}</strong>
                          <span className="active-group-roster-class">{classLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}