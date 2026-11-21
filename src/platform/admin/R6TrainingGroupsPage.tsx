import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";
import "./assignment-r395.css";
import "./assignment-r401.css";
import {AssignmentModalR401} from "./AssignmentModalR401";
import {FixokuPhotoV41F,packageImageDefaultV41F} from "./FixokuCatalogAssetsV41F";
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
function ClassPackageCover({src,title,slug}:{src:unknown;title?:string;slug?:string}) {
 return <span className="r401-cover"><FixokuPhotoV41F src={typeof src === "string" ? src : undefined} fallbackSrc={slug ? packageImageDefaultV41F(slug) : undefined} alt={title||"Eğitim paketi"}><span>{title||"Eğitim paketi"}</span></FixokuPhotoV41F></span>;
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
   type Tariff={version:number;individualMinor:number;groupMinor:number[]};
   const [tariff,setTariff]=useState<Tariff|null>(null);
   const [tariffDraft,setTariffDraft]=useState<string[]>(Array(6).fill(""));
   const [tariffError,setTariffError]=useState("");
   const [tariffBusy,setTariffBusy]=useState(false);
   const [approved,setApproved]=useState("");
   const [modalApproved,setModalApproved]=useState("");
   const minor=(value:string)=>/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(value)&&Number(value)>0&&Math.round(Number(value)*100)<=2147483647?Math.round(Number(value)*100):null;
   const loadTariff=async()=>{try{const r=await fetch("/api/admin/r410-payout-tariffs",{credentials:"same-origin",cache:"no-store"});const b=await r.json();if(!r.ok)throw Error(b.error||"Tarife yüklenemedi");const t=b.tariff as Tariff|null;setTariff(t);setTariffDraft(t?[t.individualMinor,...t.groupMinor].map(x=>(x/100).toFixed(2)):Array(6).fill(""));setTariffError("");setApproved("");setModalApproved("");}catch(e){setTariff(null);setTariffError(e instanceof Error?e.message:"Tarife yüklenemedi");}};
   useEffect(()=>{void loadTariff();},[]);
   const saveTariff=async()=>{const values=tariffDraft.map(minor);if(values.some(x=>x===null)){setTariffError("Altı tutarı da girin.");return;}setTariffBusy(true);try{const r=await fetch("/api/admin/r410-payout-tariffs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({expectedVersion:tariff?.version||0,tariff:{individualMinor:values[0],groupMinor:values.slice(1)}})});const b=await r.json();if(!r.ok)throw Error(b.error||"Tarife kaydedilemedi");await loadTariff();}catch(e){setTariffError(e instanceof Error?e.message:"Tarife kaydedilemedi");}finally{setTariffBusy(false);}};
   const seatFor=(g?:any)=>g?Number(g.activeParticipantCount??(g.participants||[]).filter((p:any)=>p.status==="ACTIVE").length)+1:1;
   const quoteFor=(seat:number)=>tariff&&seat>=1&&seat<=5?{version:tariff.version,seat,amountMinor:tariff.groupMinor[seat-1]}:null;
   const approvalKey=(seat:number,value:number,student:string,group:string,trainer:string)=>`${tariff?.version}|${seat}|${value}|${student}|${group}|${trainer}`;
  const amountValid=(/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount) && Number(amount)>0 && Math.round(Number(amount)*100)<=2147483647);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [modal,setModal]=useState<{kind:"remove"|"trainer"|"add";group:any;participant?:any}|null>(null);
  const [modalReason,setModalReason]=useState(""); const [modalTrainer,setModalTrainer]=useState("");
  const [modalCandidate,setModalCandidate]=useState(""); const [modalAmount,setModalAmount]=useState("");
  const [modalError,setModalError]=useState("");
  const showModal=(kind:"remove"|"trainer"|"add",group:any,participant?:any)=>{setModal({kind,group,participant});setModalReason("");setModalTrainer("");setModalCandidate("");setModalAmount(quoteFor(seatFor(group))?(quoteFor(seatFor(group))!.amountMinor/100).toFixed(2):"");setModalApproved("");setModalError("");};
  const canAdd=(g:any)=>["DRAFT","ASSIGNED"].includes(g.status)&&(!g.scheduledStartAt||Date.parse(g.scheduledStartAt)>Date.now())&&Number(g.activeParticipantCount||0)<Number(g.maxStudents||5);
  const matchesGroup=(c:any,g:any)=>c.educationStage===g.educationStage&&c.trainingType===g.trainingType&&c.requiredQualificationId===g.requiredQualificationId&&c.trainingProductId===g.trainingProductId;


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
   const chosenGroup=existingClassId?groups.find(g=>g.id===existingClassId):undefined;
   const seat=seatFor(chosenGroup);
   const quote=quoteFor(seat);
   const candidateApproval=selected?approvalKey(seat,quote?.amountMinor||0,candidateKey(selected),existingClassId||"NEW",trainerId):"";
   useEffect(()=>{setAmount(quote?(quote.amountMinor/100).toFixed(2):"");setApproved("");},[selectedKey,existingClassId,trainerId,quote?.version,quote?.amountMinor]);
   const modalSeat=modal?seatFor(modal.group):0;
   const modalQuote=quoteFor(modalSeat);
   const modalCandidateObj=candidates.find(c=>candidateKey(c)===modalCandidate);
   const modalApproval=modalCandidateObj?approvalKey(modalSeat,modalQuote?.amountMinor||0,modalCandidate,modal?.group?.id||"",modal?.group?.trainerUserId||"UNASSIGNED"):"";
   const classTitle = (g: any) => g.trainerName && g.classNumber ? `${g.trainerName} · Sınıf ${g.classNumber}` : "Eğitmen bekleyen sınıf";
  const startLabel = (g: any) => g.scheduledStartAt ? new Date(g.scheduledStartAt).toLocaleString("tr-TR", {timeZone:"Europe/Istanbul"}) : "Belirlenmedi";
  const agreementMatches = (p:any,g:any) => p.contactStatus === "AGREED" && Boolean(p.agreedStartAt) && (!g.scheduledStartAt || Date.parse(p.agreedStartAt) === Date.parse(g.scheduledStartAt));
  const contactLabel = (p:any,g:any) => p.contactStatus === "AGREED" ? (agreementMatches(p,g) ? "Mutabakat sağlandı" : "Yeni tarih için mutabakat bekleniyor") : ({PENDING:"Görüşme bekleniyor",UNREACHABLE:"Telefonla ulaşılamadı",CONTACTED:"Görüşüldü, mutabakat bekleniyor"} as Record<string,string>)[p.contactStatus] || "Durum bilinmiyor";
  const classAction = async (g: any, body: any) => {
    if (busy) return false;
    setBusy(true); setMessage("");
    try {
      const r = await fetch(`/api/admin/r6-training-groups/${encodeURIComponent(g.id)}`, {method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const j = await r.json().catch(()=>({}));
      if (!r.ok) { setModalError(assignmentError(j.error,"Sınıf işlemi yapılamadı.")); return false; }
      setMessage("Sınıf işlemi kaydedildi."); await load(); return true;
    } catch { setModalError("Bağlantı hatası. İşlem sonucunu yenileyerek kontrol edin."); return false; }
    finally { setBusy(false); }
  };
  const assign = async (direct?:{candidate:any;group:any;fee:string}) => {
    const chosen=direct?.candidate||selected, chosenTrainer=direct?(direct.group.trainerUserId||"UNASSIGNED"):trainerId, chosenClass=direct?direct.group.id:existingClassId, fee=direct?direct.fee:amount;
    const valid=/^[0-9]+(?:\.[0-9]{1,2})?$/.test(fee)&&Number(fee)>0&&Math.round(Number(fee)*100)<=2147483647;
         if (!chosen || !chosenTrainer || !valid || busy) return false;
     const currentGroup=chosenClass?groups.find(g=>g.id===chosenClass):undefined;
     const currentSeat=seatFor(currentGroup);
     const currentQuote=quoteFor(currentSeat);
     const currentApproval=approvalKey(currentSeat,currentQuote?.amountMinor||0,candidateKey(chosen),chosenClass||"NEW",chosenTrainer);
     if(!currentQuote || Math.round(Number(fee)*100)!==currentQuote.amountMinor || (direct?modalApproved:approved)!==currentApproval){if(direct)setModalError("Önce güncel hakedişi onaylayın.");else setMessage("Önce güncel hakedişi onaylayın.");return false;}
    if(direct && (!canAdd(direct.group)||!matchesGroup(chosen,direct.group))) {setModalError("Sınıf artık uygun değil.");return false;}
    if (!direct && existingClassId && !openClasses.some(g=>g.id===existingClassId)) {setMessage("Sınıf artık uygun değil. Listeyi yenileyin."); return;}
    setBusy(true);
    try {

    setMessage("");

    const body = {
      packageVersionId: chosen.packageVersionId,
      trainingProductId: chosen.trainingProductId,
      educationStage: chosen.educationStage,
      trainingType: chosen.trainingType,
      mode: "GROUP",
      minStudents: 1,
      maxStudents: Number(chosen.maxStudents || 5),
      trainerUserId: chosenTrainer === "UNASSIGNED" ? null : chosenTrainer,
             existingClassId: chosenClass || null,
       forceNewClass: !chosenClass,
       payoutApproval:{approved:true,version:currentQuote.version,seat:currentQuote.seat,amountMinor:currentQuote.amountMinor},
      requiredQualificationId: chosen.requiredQualificationId,
      participants: [
        {
          studentUserId: chosen.studentUserId,
          childProfileId: chosen.childProfileId || null,
          studentProfileId: chosen.childProfileId ? null : chosen.studentProfileId || null,
          compensationMinor: Math.round(Number(fee)*100),
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
      const error=errors[result.error] || assignmentError(result.error,"Sınıf ataması yapılamadı. Bilgileri kontrol edip tekrar deneyin."); if(direct)setModalError(error);else setMessage(error);
      return false;
    }

    setMessage("Öğrenci sınıfa eklendi.");
    setSelectedKey("");
    setTrainerId(""); setExistingClassId(""); setAmount("");
    await load(); return true;
    } catch { setMessage("Bağlantı hatası. İşlem sonucunu yenileyerek kontrol edin."); if(direct)setModalError("Bağlantı hatası. Listeyi yenileyin."); return false; } finally { setBusy(false); }
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
    <main className="platform-foundation-panel admin-panel training-groups-center assignment-operation-page r401-page">
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
       <section className="panel-card" aria-label="Owner hakediş tarifeleri"><div className="admin-section-heading"><div><span>OWNER YÖNETİMİ</span><h2>Hakediş Tarifeleri</h2><p>Birebir eğitim ve sınıfın 1–5. öğrencisi için tutarlar. Geçmiş sürümler değişmez.</p></div></div>
       <div className="group-assignment-context-grid">{["Birebir eğitim",...Array.from({length:5},(_,i)=>`${i+1}. öğrenci`)].map((label,i)=><label key={label}>{label}<input aria-label={label} type="number" min="0.01" step="0.01" value={tariffDraft[i]} disabled={tariffBusy} onChange={e=>{setTariffDraft(d=>d.map((x,j)=>i===j?e.target.value:x));setApproved("");setModalApproved("");}}/></label>)}</div>
       <p>Geçerli tarife sürümü: {tariff?.version||"Henüz kaydedilmedi"}</p>
       {tariffError&&<p role="alert">{tariffError}</p>}
       <button type="button" disabled={tariffBusy} onClick={()=>void saveTariff()}>Tarifeyi kaydet</button></section>

      <div className="r401-stats">{[["Atama bekleyen",candidates.length],["Aktif sınıflar",groups.filter(g=>g.mode==="GROUP"&&["DRAFT","ASSIGNED","IN_PROGRESS"].includes(g.status)).length],["Boş kontenjan",groups.filter(g=>g.mode==="GROUP"&&canAdd(g)).reduce((n,g)=>n+Number(g.maxStudents||5)-Number(g.activeParticipantCount||0),0)],["Eğitmen bekleyen",groups.filter(g=>g.mode==="GROUP"&&g.status==="DRAFT"&&!g.trainerUserId).length]].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div>
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
                  setTrainerId(""); setExistingClassId(""); setAmount("");setApproved("");setModalApproved("");
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
                  <ClassPackageCover src={selected.packageCover} title={selected.packageTitle} slug={selected.packageSlug}/>
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

                <div className="r401-modes"><button type="button" className={existingClassId?"chosen":""} disabled={!openClasses.length||busy} onClick={()=>{const g=openClasses[0];if(g){setExistingClassId(g.id);setTrainerId(g.trainerUserId||"UNASSIGNED");}}}><b>Mevcut sınıfa ekle</b><small>{openClasses.length} uygun sınıf</small></button><button type="button" className={!existingClassId&&trainerId&&trainerId!=="UNASSIGNED"?"chosen":""} onClick={()=>{setExistingClassId("");setTrainerId(eligible[0]?.id||"");}}><b>Yeni sınıf oluştur</b><small>Yetkin eğitmen seç</small></button><button type="button" className={!existingClassId&&trainerId==="UNASSIGNED"?"chosen":""} onClick={()=>{setExistingClassId("");setTrainerId("UNASSIGNED");}}><b>Eğitmensiz sınıf</b><small>Daha sonra eğitmen ata</small></button></div>
                {openClasses.length>0&&<div className="r401-open-classes">{openClasses.map(g=><button key={g.id} type="button" disabled={busy} aria-pressed={existingClassId===g.id} className={`r401-selection ${existingClassId===g.id?"chosen":""}`} onClick={()=>{setExistingClassId(g.id);setTrainerId(g.trainerUserId||"UNASSIGNED");}}><div className="r401-classhead"><ClassPackageCover src={g.packageCover} title={g.packageTitle} slug={g.packageSlug}/><div><h3>{classTitle(g)}</h3><p>{stageLabel(g.educationStage)} · {trainingLabel(g.trainingType)}</p><small>Başlangıç: {startLabel(g)}</small></div><AssignmentAvatar src={trainerAvatar({id:g.trainerUserId})} name={g.trainerName||"Eğitmen"}/><strong>{g.activeParticipantCount}/{g.maxStudents}</strong></div><div className="r401-slots">{Array.from({length:Number(g.maxStudents||5)},(_,i)=>{const st=(g.participants||[]).filter((z:any)=>z.status==="ACTIVE")[i];return <span key={st?.id||i} className={st?"":"empty"}>{st?<AssignmentAvatar src={studentAvatar(st)} name={st.studentName||"Öğrenci"}/>:<span className="r401-empty-seat">+</span>}<b>{st?.studentName||"Boş kontenjan"}</b></span>;})}</div></button>)}</div>}
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

            <div className="r395-pay"><h3>3. Hakediş ve atama</h3><label className="assignment-compensation-field">{quote?`${quote.seat}. öğrenci için tanımlanan hakediş`:"Önce Owner hakediş tarifesini kaydedin"}<div className="r395-money"><input type="number" readOnly value={amount} placeholder="Tarife bekleniyor" /><span>₺</span></div></label>
             <button type="button" disabled={busy||!selected||!trainerId||!quote} onClick={()=>setApproved(candidateApproval)}>Hakedişi Onayla</button>
             {approved===candidateApproval&&quote&&<p role="status">Hakediş onaylandı: {money(quote.amountMinor)} · tarife v{quote.version}</p>}
            <button
              className="assignment-primary-action group-assignment-submit"
              type="button"
              disabled={busy || !trainerId || !amountValid || !quote || approved!==candidateApproval}
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
            <div className="r402-refresh"><small role="status">{refreshError ? "Güncelleme yapılamadı; önceki bilgiler gösteriliyor." : lastRefresh ? `Son güncelleme: ${new Date(lastRefresh).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul"})}` : "Bilgiler yükleniyor…"}</small>
            <button type="button" disabled={busy} onClick={()=>void load()}>Listeyi yenile</button></div>
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
                <article className="r401-classcard" key={group.id}>
                  <div className="r401-classhead"><ClassPackageCover src={group.packageCover} title={group.packageTitle} slug={group.packageSlug}/><div><small>{stageLabel(group.educationStage)}</small><h3>{trainingLabel(group.trainingType)}</h3><p>{group.packageTitle}</p></div><div className="r401-person"><AssignmentAvatar src={trainerPhoto} name={group.trainerName||"Eğitmen"}/><div><h3>{classTitle(group)}</h3><small>{group.requiredQualificationTitle}</small></div></div><strong>{activeCount}/{max}</strong></div>
                  <div className="r401-meta">{[["Durum",statusLabel(group.status)],["Başlangıç",startLabel(group)],["Mutabakat",`${activeParticipants.filter((p:any)=>agreementMatches(p,group)).length}/${activeParticipants.length}`],["Kontenjan",`${activeCount}/${max}`]].map(([l,v])=><div key={l}><small>{l}</small><b>{v}</b></div>)}</div>
                  <div className="r401-classbody"><div className="r401-heading"><h3>Öğrenci listesi</h3><div className="r401-actions">{canAdd(group)&&<button type="button" disabled={busy} onClick={()=>showModal("add",group)}>+ Öğrenci ekle</button>}{!group.trainerUserId&&group.status==="DRAFT"&&activeCount>0&&<button type="button" disabled={busy} onClick={()=>showModal("trainer",group)}>Eğitmen ata</button>}</div></div>
                  <div className="r401-roster">{rosterItems.map((participant:any,index:number)=><div className={`r401-rline ${participant?"":"empty"}`} key={participant?.id||index}><span>{index+1}</span><div className="r401-person">{participant?<AssignmentAvatar src={studentAvatar(participant)} name={participant.studentName||"Öğrenci"}/>:<span className="r401-empty-seat">+</span>}<b>{participant?.studentName||"Boş kontenjan"}</b></div><span>{participant?.grade?`${participant.grade}. Sınıf`:"—"}</span><span>{participant?contactLabel(participant,group):"—"}</span><span>{participant?.agreedStartAt?new Date(participant.agreedStartAt).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"}):"—"}</span>{participant&&["DRAFT","ASSIGNED","IN_PROGRESS"].includes(group.status)?<button type="button" className="r401-danger" disabled={busy} onClick={()=>showModal("remove",group,participant)}>Sınıftan çıkar</button>:!participant&&canAdd(group)?<button type="button" disabled={busy} onClick={()=>showModal("add",group)}>+ Öğrenci ekle</button>:<span>—</span>}</div>)}</div></div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {modal&&<AssignmentModalR401 title={modal.kind==="remove"?"Öğrenciyi sınıftan çıkar":modal.kind==="trainer"?"Sınıfa eğitmen ata":"Sınıfa öğrenci ekle"} busy={busy} onClose={()=>setModal(null)}><p>{classTitle(modal.group)}</p>{modal.kind==="remove"?<><p>{modal.participant?.studentName} · Eğitim hakkı ve geçmişi korunacaktır.</p><label>Çıkarma gerekçesi<textarea value={modalReason} maxLength={500} onChange={e=>setModalReason(e.target.value)}/></label></>:modal.kind==="trainer"?<label>Yetkin eğitmen<select value={modalTrainer} onChange={e=>setModalTrainer(e.target.value)}><option value="">Seçiniz</option>{trainers.filter(t=>(t.grants||[]).some((q:any)=>q.qualificationId===modal.group.requiredQualificationId&&q.effective===true)).map(t=><option key={t.id} value={t.id}>{t.displayName||t.name}</option>)}</select></label>:<><label>Uygun öğrenci<select value={modalCandidate} onChange={e=>{setModalCandidate(e.target.value);setModalApproved("");}}><option value="">Seçiniz</option>{candidates.filter(c=>matchesGroup(c,modal.group)).map(c=><option key={candidateKey(c)} value={candidateKey(c)}>{c.studentName} · {c.packageTitle}</option>)}</select></label><label>{modalQuote?`${modalQuote.seat}. öğrenci için tanımlanan hakediş`:"Tarife bulunamadı"}<input type="number" readOnly value={modalAmount}/></label><button type="button" disabled={!modalCandidate||!modalQuote||busy} onClick={()=>setModalApproved(modalApproval)}>Hakedişi Onayla</button>{modalApproved===modalApproval&&modalQuote&&<p role="status">Hakediş onaylandı: {money(modalQuote.amountMinor)}</p>}</>}{modalError&&<p role="alert">{modalError}</p>}<div className="r401-actions"><button type="button" disabled={busy} onClick={()=>setModal(null)}>Vazgeç</button><button type="button" disabled={busy||(modal.kind==="remove"?!modalReason.trim():modal.kind==="trainer"?!modalTrainer:!modalCandidate||!modalQuote||modalApproved!==modalApproval)} onClick={async()=>{setModalError("");const ok=modal.kind==="remove"?await classAction(modal.group,{action:"remove",participantId:modal.participant.id,reason:modalReason.trim()}):modal.kind==="trainer"?await classAction(modal.group,{action:"assigntrainer",trainerUserId:modalTrainer}):await assign({candidate:candidates.find(c=>candidateKey(c)===modalCandidate),group:modal.group,fee:modalAmount});if(ok)setModal(null);}}>Onayla</button></div></AssignmentModalR401>}
    </main>
  );
}
