import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";
import "./assignment-r395.css";
import { AssignmentAvatar, assignmentError } from "./AssignmentAvatarR395";
const money = (minor: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format((minor || 0) / 100);
type Group = any;
const stageLabel: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const trainingLabel: Record<string, string> = { FAST_READING: "Hızlı okuma", PARAGRAPH: "Paragraf" };
const modeLabel: Record<string, string> = { INDIVIDUAL: "Birebir", GROUP: "Sınıf" };

const trainingGroupStatusLabel = (value: string) => ({
  COMPLETED: "Tamamlandı",
  IN_PROGRESS: "Devam Ediyor",
  PENDING: "Bekliyor",
  ACTIVE: "Aktif",
  CANCELLED: "İptal Edildi",
  ASSIGNED: "Atandı",
  UNASSIGNED: "Atanmadı",
}[value] ?? value);
function ClassPackageCover({src,title}:{src:unknown;title?:string}) {
  const value=typeof src==="string" ? src.trim() : "";
  const safe=/^\/(?![\/\\])[^\\\s]+$/.test(value) || /^https:\/\/[^\s]+$/i.test(value);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[value]);
  return safe && !failed ? <img src={value} alt={title || "Eğitim paketi"} onError={()=>setFailed(true)} referrerPolicy="no-referrer" style={{width:56,height:56,objectFit:"contain",borderRadius:8,flexShrink:0}}/> : <span style={{width:56,minHeight:56,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,textAlign:"center",flexShrink:0}}>Kapak yok</span>;
}
export function R6TrainingGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [existingClassId, setExistingClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [amount,setAmount]=useState("");
  const amountValid=(/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount) && Number(amount)>0 && Math.round(Number(amount)*100)<=2147483647);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const studentAvatar = (student: any) => {
    if (student?.childProfileId) return `/api/admin/r6-training-groups?studentChildPhoto=${encodeURIComponent(student.childProfileId)}`;
    if (student?.studentProfileId) return `/api/admin/r6-training-groups?studentProfilePhoto=${encodeURIComponent(student.studentProfileId)}`;
    return "";
  };
  const classCounts = (id: string) => {
    const list=groups.filter(g=>g.mode==="GROUP" && g.trainerUserId===id);
    return {active:list.filter(g=>["DRAFT","ASSIGNED","IN_PROGRESS"].includes(g.status)).length,completed:list.filter(g=>g.status==="COMPLETED").length};
  };
  const trainerAvatar = (trainer: any) => trainer?.id ? `/api/admin/r6-training-groups?trainerPhoto=${encodeURIComponent(trainer.id)}` : "";

  const stageLabel = (value: string) =>
    ({ PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" } as Record<string, string>)[value] || value;

  const trainingLabel = (value: string) =>
    ({ FAST_READING: "Hızlı Okuma", PARAGRAPH: "Paragraf" } as Record<string, string>)[value] || value;

  const statusLabel = (value: string) =>
    ({ DRAFT: "Oluşuyor", ASSIGNED: "Atandı", IN_PROGRESS: "Devam Ediyor", COMPLETED: "Tamamlandı", CANCELLED: "İptal" } as Record<string, string>)[value] || value;

  const candidateKey = (candidate: any) =>
    `${candidate.studentUserId}:${candidate.childProfileId || candidate.studentProfileId}:${candidate.packageVersionId}:${candidate.trainingProductId}`;

  const loadSequence = useRef(0);
  const [lastRefresh,setLastRefresh] = useState(0);
  const [refreshError,setRefreshError] = useState(false);
  const load = async () => {
    const sequence = ++loadSequence.current;
    try {
    const [g, q] = await Promise.all([
      fetch("/api/admin/r6-training-groups", { credentials: "same-origin" }),
      fetch("/api/admin/r6-qualifications", { credentials: "same-origin" }),
    ]);

    const gj = await g.json().catch(() => ({}));
    const qj = await q.json().catch(() => ({}));

    if (sequence !== loadSequence.current) return;
    if (!g.ok || !q.ok || !Array.isArray(gj.groups) || !Array.isArray(qj.trainers)) { setRefreshError(true); return; }
    setGroups(gj.groups || []);
    setTrainers(qj.trainers || []);
    setCandidates(gj.candidates || []);
    setLastRefresh(Date.now()); setRefreshError(false);
    } catch { if(sequence === loadSequence.current) setRefreshError(true); }
  };

  useEffect(() => {
    if (busy) { ++loadSequence.current; return; }
    let running = false;
    const refresh = async () => { if (running || document.visibilityState === "hidden") return; running=true; try { await load(); } finally { running=false; } };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    const onVisibility = () => { if(document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange",onVisibility);
    return () => { ++loadSequence.current; window.clearInterval(timer); document.removeEventListener("visibilitychange",onVisibility); };
  }, [busy]);

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
      return matchingGrant?.effective === true;
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
          ["DRAFT", "ASSIGNED"].includes(group.status) &&
          (!group.scheduledStartAt || Date.parse(group.scheduledStartAt) > Date.now()),
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
      return { text: `Açık sınıf: ${count}/${max}`, open: true, count, max };
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
      text: full ? `Mevcut sınıf ${full.count}/${full.max} · Yeni sınıf 1/${maxDefault} açılacak` : `Yeni sınıf 1/${maxDefault} açılacak`,
      open: false,
      count: 0,
      max: maxDefault,
    };
  };

  const openClasses = selected ? groups.filter((g) => g.mode === "GROUP" &&
    g.educationStage === selected.educationStage && g.trainingType === selected.trainingType &&
    g.requiredQualificationId === selected.requiredQualificationId &&
    g.trainingProductId === selected.trainingProductId && (g.packageVersionId === selected.packageVersionId || Boolean(selected.trainingProductId)) &&
    ["DRAFT", "ASSIGNED"].includes(g.status) && (!g.scheduledStartAt || Date.parse(g.scheduledStartAt) > Date.now()) &&
    Number(g.activeParticipantCount || 0) < Number(g.maxStudents || 5)) : [];
  const classTitle = (g: any) => g.trainerName && g.classNumber ? `${g.trainerName} · Sınıf ${g.classNumber}` : "Eğitmen bekleyen sınıf";
  const startLabel = (g: any) => g.scheduledStartAt ? new Date(g.scheduledStartAt).toLocaleString("tr-TR", {timeZone:"Europe/Istanbul"}) : "Belirlenmedi";
  const agreementMatches = (p:any,g:any) => p.contactStatus === "AGREED" && Boolean(p.agreedStartAt) && (!g.scheduledStartAt || Date.parse(p.agreedStartAt) === Date.parse(g.scheduledStartAt));
  const contactLabel = (p:any,g:any) => p.contactStatus === "AGREED" ? (agreementMatches(p,g) ? "Mutabakat sağlandı" : "Yeni tarih için mutabakat bekleniyor") : ({PENDING:"Görüşme bekleniyor",UNREACHABLE:"Telefonla ulaşılamadı",CONTACTED:"Görüşüldü, mutabakat bekleniyor"} as Record<string,string>)[p.contactStatus] || "Durum bilinmiyor";
  const classAction = async (g: any, body: any) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch(`/api/admin/r6-training-groups/${encodeURIComponent(g.id)}`, {method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { setMessage(assignmentError(j.error,"Sınıf işlemi yapılamadı.")); return; }
      setMessage("Sınıf işlemi kaydedildi."); await load();
    } catch { setMessage("Bağlantı hatası. İşlem sonucunu yenileyerek kontrol edin."); }
    finally { setBusy(false); }
  };
  const assign = async () => {
    if (!selected || !trainerId || !amountValid || busy) return;
    if (existingClassId && !openClasses.some(g=>g.id===existingClassId)) {setMessage("Sınıf artık uygun değil. Listeyi yenileyin."); return;}
    setBusy(true);
    try {

    setMessage("");

    const body = {
      packageVersionId: selected.packageVersionId,
      trainingProductId: selected.trainingProductId,
      educationStage: selected.educationStage,
      trainingType: selected.trainingType,
      mode: "GROUP",
      minStudents: 1,
      maxStudents: Number(selected.maxStudents || 5),
      trainerUserId: trainerId === "UNASSIGNED" ? null : trainerId,
      existingClassId: existingClassId || null,
      requiredQualificationId: selected.requiredQualificationId,
      participants: [
        {
          studentUserId: selected.studentUserId,
          childProfileId: selected.childProfileId || null,
          studentProfileId: selected.childProfileId ? null : selected.studentProfileId || null,
          compensationMinor: Math.round(Number(amount)*100),
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
        R6_CAPACITY_INVALID: "Bu öğrenci sayısı için sınıf ücret matrisi henüz tanımlı değil.",
        R6_PARTICIPANT_ALREADY_GROUPED: "Bu öğrenci aynı sınıf eğitiminde zaten aktif bir sınıfa atanmış.",
        R6_TRAINER_QUALIFICATION_REQUIRED: "Seçilen eğitmenin bu eğitim için aktif yetkinliği yok.",
        R6_QUALIFICATION_MISMATCH: "Öğrencinin eğitim paketi ile eğitmen yetkinliği eşleşmiyor.",
      };
      setMessage(errors[result.error] || assignmentError(result.error,"Sınıf ataması yapılamadı. Bilgileri kontrol edip tekrar deneyin."));
      return;
    }

    setMessage("Öğrenci sınıfa eklendi.");
    setSelectedKey("");
    setTrainerId(""); setExistingClassId(""); setAmount("");
    await load();
    } catch { setMessage("Bağlantı hatası. İşlem sonucunu yenileyerek kontrol edin."); } finally { setBusy(false); }
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
          <h1>Sınıf Atamaları</h1>
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
          <p>Sınıf eğitimi hakkı bulunan öğrenciyi seçin; paket bilgileri otomatik gelsin, yetkin eğitmene atayın.</p>
        </div>
      </header>

      <div className="admin-segmented-tabs assignment-operation-tabs">
        <Link to="/panel/admin/atamalar">Birebir Atamalar</Link>
        <Link className="is-active" to="/panel/owner/egitim-gruplari">Sınıf Atamaları</Link>
      </div>

      {message && <p className="admin-inline-status" role="status">{message}</p>}

      <section className="panel-card group-assignment-builder-v20">
        <div className="admin-section-heading">
          <div>
            <span>YENİ SINIF ATAMASI</span>
            <h2>Öğrenciyi eğitmene ata</h2>
            <p>Sınıf numarası otomatik verilir. Uygun açık sınıfı seçebilir veya eğitmensiz sınıf oluşturabilirsiniz.</p>
          </div>
          <span className="training-mode-pill">Sınıf</span>
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
                  setTrainerId(""); setExistingClassId(""); setAmount("");
                }}
              >
                <option value="">Sınıf eğitimi hakkı olan öğrenciyi seçin</option>
                {candidates.map((candidate) => (
                  <option key={candidateKey(candidate)} value={candidateKey(candidate)}>
                    {candidate.studentName} · {candidate.packageTitle}
                  </option>
                ))}
              </select>
            </label>

            {!candidates.length && (
              <div className="group-assignment-empty">
                Atama bekleyen aktif sınıf eğitimi paketi bulunmuyor.
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
                  <AssignmentAvatar student stage={selected.educationStage} src={studentAvatar(selected)} name={selected.studentName || "Öğrenci"} className="group-trainer-avatar"/>
                  <div className="group-assignment-context-copy">
                    <span>Öğrenci</span>
                    <strong>{selected.studentName}</strong>
                    <small>{selected.school || "Okul bilgisi yok"}{selected.grade ? ` · ${selected.grade}. sınıf` : ""}{selected.classBranch ? ` / ${selected.classBranch}` : ""}</small>
                  </div>
                </article>

                <article className="group-assignment-context-card is-package">
                  <ClassPackageCover src={selected.packageCover} title={selected.packageTitle}/>
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
                    <small>Sınıf eğitimi · En fazla {Number(selected.maxStudents || 5)} öğrenci</small>
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

                <label>Mevcut uygun sınıf<select disabled={busy} value={existingClassId} onChange={e=>{const g=openClasses.find(x=>x.id===e.target.value);setExistingClassId(e.target.value);setTrainerId(g ? (g.trainerUserId || "UNASSIGNED") : "");}}><option value="">Yeni sınıf / eğitmen seçimi</option>{openClasses.map(g=><option key={g.id} value={g.id}>{classTitle(g)} · {g.activeParticipantCount}/{g.maxStudents} · {startLabel(g)}</option>)}</select></label>
                {openClasses.length > 0 && <div className="group-trainer-card-grid" aria-label="Uygun sınıflar">{openClasses.map(g=><button key={g.id} type="button" disabled={busy} aria-pressed={existingClassId===g.id} className={`group-trainer-card r400-existing-class ${existingClassId===g.id?"is-selected":""}`} onClick={()=>{setExistingClassId(g.id);setTrainerId(g.trainerUserId||"UNASSIGNED");}}><ClassPackageCover src={g.packageCover} title={g.packageTitle}/><span className="group-trainer-copy"><strong>{classTitle(g)}</strong><small>{stageLabel(g.educationStage)} · {trainingLabel(g.trainingType)}</small><small>{g.trainerUserId?"Eğitmen atandı":"Eğitmen atanmadı"} · {startLabel(g)}</small><span className="r400-seat-strip">{Array.from({length:Number(g.maxStudents||5)},(_,i)=>{const st=(g.participants||[]).filter((x:any)=>x.status==="ACTIVE")[i];return st?<span key={st.id} title={st.studentName} style={{display:"inline-flex",alignItems:"center",gap:2}}><AssignmentAvatar student stage={g.educationStage} src={studentAvatar(st)} name={st.studentName||"Öğrenci"}/><span style={{color:"#15803d"}}>✓</span></span>:<span key={i} aria-label="Boş kontenjan" style={{padding:8}}>○</span>;})}</span><small>{g.activeParticipantCount}/{g.maxStudents} dolu</small></span></button>)}</div>}
                <label className="r400-unassigned-option"><input type="radio" name="groupTrainer" checked={trainerId==="UNASSIGNED" && !existingClassId} onChange={()=>{setTrainerId("UNASSIGNED");setExistingClassId("");}}/> Eğitmen atamadan sınıf oluştur</label>
                <h4 className="r400-choice-title">Yeni sınıf için eğitmen seçin</h4>
                <div className="group-trainer-card-grid">
                  {eligible.map((trainer) => {
                    const avatar = trainerAvatar(trainer);
                    const capacity = trainerCapacity(trainer.id);
                    const counts = classCounts(trainer.id);
                    const name = trainer.displayName || trainer.name || "Eğitmen";

                    return (
                      <label className={`group-trainer-card ${trainerId === trainer.id && !existingClassId ? "is-selected" : ""}`} key={trainer.id}>
                        <input
                          type="radio"
                          name="groupTrainer"
                          value={trainer.id}
                          checked={trainerId === trainer.id && !existingClassId}
                          onChange={(event) => {setTrainerId(event.target.value);setExistingClassId("");}}
                        />
                        <AssignmentAvatar src={avatar} name={name} className="group-trainer-avatar"/>
                        <span className="group-trainer-copy">
                          <strong>{name}</strong>
                          <small>{selected.requiredQualificationTitle}</small>
                          <em className={capacity.open ? "is-open" : "is-new"}>{capacity.text}</em>
                          <small style={{background:"#dcfce7",color:"#166534",padding:"4px 8px",borderRadius:8,fontWeight:700}}>Aktif Sınıf Sayısı: {counts.active}</small>
                          <small>Tamamlanmış Sınıf Sayısı: {counts.completed}</small>
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

            <div className="r395-pay"><h3>3. Hakediş ve atama</h3><label className="assignment-compensation-field">Öğrenci başına hakediş<div className="r395-money"><input type="number" min="0.01" max="21474836.47" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required placeholder="Tutarı giriniz" /><span>₺</span></div></label>
            <button
              className="assignment-primary-action group-assignment-submit"
              type="button"
              disabled={busy || !trainerId || !amountValid}
              onClick={() => void assign()}
            >
              Öğrenciyi sınıfa ekle
            </button></div>
          </>
        )}
      </section>

      <section className="panel-card active-group-list-v20">
        <div className="admin-section-heading">
          <div>
            <span>AKTİF KAYITLAR</span>
            <h2>Eğitim Sınıfları</h2>
            <small role="status">{refreshError ? "Güncelleme yapılamadı; önceki bilgiler gösteriliyor." : lastRefresh ? `Son güncelleme: ${new Date(lastRefresh).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul"})}` : "Bilgiler yükleniyor…"}</small>
            <button type="button" disabled={busy} onClick={()=>void load()}>Listeyi yenile</button>
          </div>
          <label className="group-list-search">
            <span>Ara</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Eğitmen veya öğrenci" />
          </label>
        </div>

        {!visibleGroups.length ? (
          <div className="admin-empty-state">
            <strong>Sınıf bulunmuyor</strong>
            <span>İlk sınıf ataması yapıldığında burada otomatik oluşacak.</span>
          </div>
        ) : (
          <div className="active-group-card-grid">
            {visibleGroups.map((group) => {
              const activeCount = Number(
                group.activeParticipantCount ??
                  (group.participants || []).filter((participant: any) => participant.status === "ACTIVE").length,
              );
              const max = Number(group.maxStudents || 5);
              const trainerPhoto = trainerAvatar({id:group.trainerUserId});
              const activeParticipants = (group.participants || []).filter(
                (participant: any) => participant.status === "ACTIVE",
              );
              const roster = group.status === "COMPLETED" ? (group.participants || []).filter((p:any)=>p.status === "COMPLETED" || p.status === "ACTIVE") : activeParticipants;
              const rosterItems = Array.from({ length: max }, (_, index) => roster[index] || null);

              return (
                <article className="active-group-card fixoku-group-card-xl" key={group.id}>
                  <div className="active-group-card-top">
                    <ClassPackageCover src={group.packageCover} title={group.packageTitle}/>
                    <div>
                      <span>{stageLabel(group.educationStage)}</span>
                      <h3>{trainingLabel(group.trainingType)}</h3>
                    </div>
                    <strong className={activeCount >= max ? "is-full" : "is-open"}>{activeCount}/{max}</strong>
                  </div>

                  <div className="active-group-meta active-group-trainer-meta">
                    <span>Eğitmen</span>
                    <div className="fixoku-group-trainer-media">
                      <AssignmentAvatar src={trainerPhoto} name={group.trainerName || "Eğitmen"} className="fixoku-group-trainer-avatar"/>
                      <div className="fixoku-group-trainer-copy">
                        <strong>{classTitle(group)}</strong>
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
                    <span>Eğitim başlangıcı: {startLabel(group)}</span>
                    {group.mode === "GROUP" && !["COMPLETED","CANCELLED"].includes(group.status) && <strong>Mutabakat: {activeParticipants.filter((p: Parameters<typeof agreementMatches>[0])=>agreementMatches(p,group)).length}/{activeParticipants.length}</strong>}
                    {!group.trainerUserId && group.status === "DRAFT" && activeCount>0 && <label>Yetkin eğitmen ata<select disabled={busy} value="" onChange={e=>{const id=e.target.value;if(id && window.confirm("Eğitmen bu sınıfa atansın mı?")) void classAction(group,{action:"assigntrainer",trainerUserId:id});}}><option value="">Eğitmen seçin</option>{trainers.filter(t=>(t.grants||[]).some((q:any)=>q.qualificationId===group.requiredQualificationId && q.effective===true)).map(t=><option key={t.id} value={t.id}>{t.displayName||t.name} · Aktif: {classCounts(t.id).active} · Tamamlanan: {classCounts(t.id).completed}</option>)}</select></label>}
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
                          {participant ? <span style={{display:"inline-flex",alignItems:"center",gap:4}}><AssignmentAvatar student stage={group.educationStage} src={studentAvatar(participant)} name={studentName}/><span aria-label="Dolu kontenjan" style={{color:"#15803d",fontWeight:700}}>✓</span></span> : <span className="active-group-roster-user-icon" aria-hidden="true">○</span>}
                          <strong>{participant ? studentName : "Boş kontenjan"}</strong>
                          <span className="active-group-roster-class">{classLabel}</span>
                          {participant && group.mode === "GROUP" && participant.status === "ACTIVE" && <div className="r400-roster-contact"><span style={{color:agreementMatches(participant,group)?"#166534":"#92400e",fontWeight:600}}>{contactLabel(participant,group)}</span>{participant.agreedStartAt && <small>Mutabakat tarihi: {new Date(participant.agreedStartAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</small>}{participant.joinedAt && group.scheduleUpdatedAt && Date.parse(participant.joinedAt)>Date.parse(group.scheduleUpdatedAt) && <small>Son başlangıç tarihi kaydından sonra eklendi.</small>}{participant.contactUpdatedAt && <small>Son görüşme kaydı: {new Date(participant.contactUpdatedAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}</small>}</div>}
                          {participant && ["DRAFT","ASSIGNED","IN_PROGRESS"].includes(group.status) && <button type="button" className="r400-roster-remove" disabled={busy} onClick={()=>{const reason=window.prompt("Öğrenciyi sınıftan çıkarma gerekçesi:")?.trim();if(reason && window.confirm("Öğrenci sınıftan çıkarılsın mı? Eğitim hakkı ve geçmiş kayıtları korunacaktır.")) void classAction(group,{action:"remove",participantId:participant.id,reason});}}>Sınıftan çıkar</button>}
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
