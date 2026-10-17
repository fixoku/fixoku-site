import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-panel.css";

type RequestRow = { id: string; studentName: string; programTitle: string; status: string; trainerName?: string | null; trainerUserId?: string | null };
type Candidate = { id: string; name: string; email?: string; city: string | null; qualification: string; workload: number; hasFutureAvailability: boolean; photoUrl?: string | null; photoStorageKey?: string | null };
const assignmentTrainerAvatar = (candidate: Candidate) => {
  if (candidate.photoUrl) return candidate.photoUrl;
  const key = candidate.name.normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/gu, "i").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9 ]/gu, " ").replace(/\s+/gu, " ").trim();
  return ({ "elif usta": "/images/profiles/elif.jpg", "ozlem kaplan": "/images/profiles/ozlem.jpg" } as Record<string, string>)[key] || null;
};
const statusLabel = (status: string) => ({ PENDING: "Bekliyor", ASSIGNED: "Atandı", CANCELLED: "İptal edildi" }[status] || "Durum bilinmiyor");
const historyLabel = (eventType: string) => ({ ASSIGNED: "Atandı", REASSIGNED_IN: "Yeni eğitmen atandı", REASSIGNED_OUT: "Önceki eğitmen çıkarıldı" }[eventType] || "Atama geçmişi");

export function AdminAssignmentPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [trainerId, setTrainerId] = useState("");
  const [queueTab, setQueueTab] = useState<"PENDING" | "ASSIGNED">("PENDING");
  const [showReassignPicker, setShowReassignPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [compensationDecision, setCompensationDecision] = useState("PRESERVE");
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const load = async () => { const r = await fetch("/api/admin/assignment-requests?includeAssigned=true", { credentials: "same-origin" }); const b = await r.json(); setRows(b.requests || []); };
  useEffect(() => { void load(); }, []);
  const open = async (row: RequestRow) => { setSelected(row); setMessage(""); setTrainerId(""); setShowReassignPicker(false); setReason(""); setCompensationDecision("PRESERVE"); const r = await fetch(`/api/admin/assignment-requests/${row.id}`, { credentials: "same-origin" }); const b = await r.json(); setCandidates(b.candidates || []); setCurrent(b.currentAssignment || null); setHistory(b.history || []); };
  const filtered = useMemo(() => candidates, [candidates]);
  const currentTrainerCandidate = useMemo(
    () => current ? candidates.find((candidate) => candidate.id === current.trainerUserId) || null : null,
    [candidates, current],
  );
  const queueRows = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLocaleLowerCase("tr-TR");
    const searchOk = !term || `${row.studentName} ${row.programTitle} ${row.trainerName || ""}`.toLocaleLowerCase("tr-TR").includes(term);
    return searchOk && row.status === queueTab;
  }), [rows, search, queueTab]);
  const assign = async () => { if (!selected || !trainerId) return; const isReassign = Boolean(current); if (isReassign && !reason.trim()) { setMessage("Değişiklik gerekçesi zorunludur."); return; } const r = await fetch(`/api/admin/assignment-requests/${selected.id}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ trainerId, ...(isReassign ? { reassign: true, reassignmentReason: reason.trim(), compensationDecision } : {}) }) }); const b = await r.json(); if (!r.ok) { setMessage(b.error || "Atama yapılamadı"); return; } setMessage(isReassign ? "Eğitmen değişikliği kaydedildi." : "Eğitmen ataması kaydedildi."); await load(); setSelected(null); setTrainerId(""); };

  const pendingCount = rows.filter((row) => row.status === "PENDING").length;
  const assignedCount = rows.filter((row) => row.status === "ASSIGNED").length;

  return <main className="platform-foundation-panel admin-panel assignment-center">
    <header className="admin-page-hero"><div><span>EĞİTİM OPERASYONU</span><h1>Birebir Atamalar</h1>
          <div className="assignment-hero-art-v31" aria-hidden="true">
  <svg viewBox="0 0 340 145" fill="none">
    <path className="assignment-hero-arc-v31" d="M40 113c34-55 91-80 155-66 44 10 74 34 101 66" />

    <g transform="translate(78 42)">
      <rect className="assignment-hero-side-a-v31" width="60" height="60" rx="18" />
      <circle className="assignment-hero-side-a-head-v31" cx="30" cy="22" r="8" />
      <path className="assignment-hero-side-a-body-v31" d="M17 45c2-9 7-14 13-14s11 5 13 14" />
    </g>

    <g transform="translate(124 26)">
      <rect className="assignment-hero-main-v31" width="90" height="90" rx="24" />
      <circle className="assignment-hero-main-head-v31" cx="38" cy="29" r="11" />
      <path className="assignment-hero-main-body-v31" d="M20 66c3-15 10-23 18-26 4-1 8-1 11 0 8 3 15 11 18 26" />
      <g transform="translate(61 18)">
        <rect className="assignment-hero-note-v31" width="19" height="27" rx="5" />
        <path className="assignment-hero-note-line-v31" d="M5 7h9M5 13h9M5 19h6" />
      </g>
    </g>

    <g transform="translate(205 49)">
      <rect className="assignment-hero-side-b-v31" width="64" height="64" rx="19" />
      <circle className="assignment-hero-side-b-head-v31" cx="32" cy="21" r="8" />
      <path className="assignment-hero-side-b-body-v31" d="M18 48c2-10 8-15 14-15 7 0 12 5 14 15" />
    </g>
  </svg>
</div><p className="assignment-hero-copy">Satın alınmış veya açılmış öğrenci eğitimlerini uygun ve yetkin eğitmenlerle eşleştirin; eğitmen değişikliklerinde tarihçeyi koruyun.</p></div></header>
    <div className="admin-segmented-tabs"><Link className="is-active" to="/panel/admin/atamalar">Birebir Atamalar</Link><Link to="/panel/owner/egitim-gruplari">Grup Atamaları</Link></div>
    {message && <p className="admin-inline-status" role="status">{message}</p>}
    <section className="assignment-summary-strip"><div><span>Bekleyen</span><strong>{pendingCount}</strong></div><div><span>Atanmış</span><strong>{assignedCount}</strong></div><div><span>Toplam kayıt</span><strong>{rows.length}</strong></div></section>
    <section className="assignment-filterbar"><label>Öğrenci veya eğitim ara<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara…" /></label></section>
    <div className="assignment-workspace">
      <section className="panel-card assignment-request-list">
  <div className="admin-section-heading">
    <div><span>ATAMA KUYRUĞU</span><h2>Öğrenci eğitimleri</h2></div>
    <strong>{queueRows.length}</strong>
  </div>
  <div className="assignment-queue-tabs" role="tablist" aria-label="Atama kuyruğu">
    <button type="button" role="tab" aria-selected={queueTab === "PENDING"} className={queueTab === "PENDING" ? "is-active" : ""} onClick={() => { setQueueTab("PENDING"); setSelected(null); setTrainerId(""); setShowReassignPicker(false); }}>
      <span>Atama Bekleyenler</span><b>{pendingCount}</b>
    </button>
    <button type="button" role="tab" aria-selected={queueTab === "ASSIGNED"} className={queueTab === "ASSIGNED" ? "is-active" : ""} onClick={() => { setQueueTab("ASSIGNED"); setSelected(null); setTrainerId(""); setShowReassignPicker(false); }}>
      <span>Atananlar</span><b>{assignedCount}</b>
    </button>
  </div>
  {!queueRows.length ? <div className="admin-empty-state assignment-queue-empty">
    <strong>{queueTab === "PENDING" ? "Atama bekleyen kayıt yok" : "Atanmış kayıt yok"}</strong>
    <span>Bu sekmede gösterilecek öğrenci eğitimi bulunmuyor.</span>
  </div> : <div className="assignment-request-stack">{queueRows.map((row) => <button type="button" className={selected?.id === row.id ? "is-selected" : ""} key={row.id} onClick={() => void open(row)}><span className={`assignment-status-dot is-${row.status.toLowerCase()}`} /><div className="assignment-request-copy-v28">
  <strong>{row.studentName}</strong>
  <span>{(row as any).grade ? `${(row as any).grade}. Sınıf${(row as any).classBranch ? ` / ${(row as any).classBranch}` : ""}` : ((row as any).classBranch || "Sınıf bilgisi yok")}</span>
  <small>{row.programTitle}</small>
</div><span className={`assignment-row-status is-${row.status.toLowerCase()}`}><i aria-hidden="true" />{statusLabel(row.status)}</span></button>)}</div>}
</section>
      <section className="panel-card assignment-detail-panel">{!selected ? <div className="admin-empty-state"><strong>Bir atama kaydı seçin</strong><span>Öğrenci, eğitim, mevcut eğitmen ve uygun adaylar burada gösterilecek.</span></div> : <><div className="admin-section-heading assignment-detail-heading-v27">
              <div className="assignment-detail-heading-main-v27">
                <span className="assignment-detail-heading-icon-v27" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3.5 18c.7-4.1 2.7-6.2 5.5-6.2 2.9 0 4.9 2.1 5.6 6.2" />
                    <path d="M16 6h5M16 10h5M16 14h4" />
                  </svg>
                </span>
                <div>
                  <span>ATAMA DETAYI</span>
                  <h2>{selected.studentName}</h2>
                  <p>{selected.programTitle}</p>
                </div>
              </div>
              <span className={`offer-status is-${selected.status.toLowerCase()}`}>{statusLabel(selected.status)}</span>
            </div>
            <div className="assignment-detail-summary-v31">
              <div className="assignment-detail-summary-card-v31 is-student">
                <span className="assignment-detail-summary-icon-v31" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="7.5" r="3.2" />
                    <path d="M5.8 19c.7-4 2.9-6 6.2-6s5.5 2 6.2 6" />
                  </svg>
                </span>
                <div><span>Öğrenci</span><strong>{selected.studentName}</strong></div>
              </div>

              <div className="assignment-detail-summary-card-v31 is-program">
                <span className="assignment-detail-summary-icon-v31" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 5.5c3-1.1 5.7-.8 8 .9v12c-2.3-1.7-5-2-8-.9v-12Z" />
                    <path d="M20 5.5c-3-1.1-5.7-.8-8 .9v12c2.3-1.7 5-2 8-.9v-12Z" />
                  </svg>
                </span>
                <div><span>Eğitim / Paket</span><strong>{selected.programTitle}</strong></div>
              </div>

              <div className="assignment-detail-summary-card-v31 is-trainer">
                <span className="assignment-detail-summary-icon-v31" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
                    <path d="M6.5 10.5V15c3.6 2.2 7.4 2.2 11 0v-4.5" />
                  </svg>
                </span>
                <div><span>Mevcut Eğitmen</span><strong>{current?.trainerName || "Atanmadı"}</strong></div>
              </div>
            </div>{history.length > 0 && <details className="assignment-history"><summary>Atama geçmişini göster ({history.length})</summary><ul>{history.map((item) => <li key={item.id}>{historyLabel(item.eventType)} · {item.trainerName}{item.reason ? ` · ${item.reason}` : ""}{item.occurredAt ? ` · ${new Date(item.occurredAt).toLocaleString("tr-TR")}` : ""}</li>)}</ul></details>}{current && !showReassignPicker ? (
  <section className="assignment-current-trainer-card assignment-current-trainer-card-v23">
              <div className="assignment-current-trainer-layout">
                <span className="assignment-current-avatar" aria-hidden="true">
                  {current.trainerName?.toLocaleLowerCase("tr-TR") === "elif usta" ? (
                    <img src="/images/profiles/elif.jpg" alt="" />
                  ) : current.trainerName?.toLocaleLowerCase("tr-TR") === "özlem kaplan" ? (
                    <img src="/images/profiles/ozlem.jpg" alt="" />
                  ) : (
                    <b>{(current.trainerName || "E").split(/\s+/u).map((part: string) => part[0]).join("").slice(0, 2)}</b>
                  )}
                </span>

                <div className="assignment-current-trainer-copy-v23">
                  <span className="assignment-current-eyebrow">MEVCUT EĞİTMEN</span>
                  <h3>{current.trainerName || "Atanmış eğitmen"}</h3>
                  <p>
                    Mevcut birebir eğitmen
                    {" • "}
                    {selected.programTitle.includes("Hızlı Okuma") ? "Hızlı Okuma" : selected.programTitle}
                  </p>

                  <div className="assignment-current-trainer-chips">
                    <span className="assignment-current-chip is-active">
                      <i aria-hidden="true" />
                      Aktif
                    </span>
                    <span className="assignment-current-chip is-load">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="9" cy="8" r="3" />
                        <path d="M3.8 18c.6-3.5 2.5-5.3 5.2-5.3s4.6 1.8 5.2 5.3" />
                        <circle cx="17.2" cy="9" r="2.2" />
                        <path d="M15.4 13.2c2.6-.3 4.4 1.1 4.9 3.8" />
                      </svg>
                      {Number(currentTrainerCandidate?.workload || 0)} aktif öğrenci
                    </span>
                  </div>
                </div>

                <span className="assignment-current-badge">Atandı</span>
              </div>

              <button
                type="button"
                className="assignment-change-trainer-trigger"
                onClick={() => {
                  setShowReassignPicker(true);
                  setTrainerId("");
                  setReason("");
                }}
              >
                Eğitmeni Değiştir
              </button>
            </section>
) : (
  <>
    <div className={`assignment-reassignment-layout-v32 ${current ? "is-reassign" : "is-first-assign"}`}><div className="assignment-candidate-heading">
      <div><h3>{current ? "Diğer yetkin eğitmenler" : "İlk eğitmeni seçin"}</h3><p>{current ? "Mevcut eğitmen dışındaki yetkin öğretmenlerden yeni eğitmeni seçin." : "Bu öğrenci henüz bir eğitmene atanmadı. Uygun eğitmeni seçerek ilk atamayı tamamlayın."}</p></div>
      {current && <button type="button" className="assignment-cancel-change" onClick={() => { setShowReassignPicker(false); setTrainerId(""); setReason(""); }}>Vazgeç</button>}
    </div>
    <div className="assignment-candidate-list">{filtered.filter((candidate) => candidate.id !== current?.trainerUserId).map((candidate) => <label className={trainerId === candidate.id ? "is-selected" : ""} key={candidate.id}><input type="radio" name="trainer" value={candidate.id} checked={trainerId === candidate.id} onChange={(e) => setTrainerId(e.target.value)} /><div className="assignment-candidate-main"><span className="assignment-candidate-avatar" aria-hidden="true">{assignmentTrainerAvatar(candidate) ? <img src={assignmentTrainerAvatar(candidate)!} alt="" loading="lazy" /> : <b>{candidate.name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR")}</b>}</span><div className="assignment-candidate-copy"><strong>{candidate.name}</strong><span>{candidate.city ? `${candidate.city} · ` : ""}{candidate.qualification || "Yetkinlik kaydı"}</span><small>Aktif eğitim: {candidate.workload}</small></div></div></label>)}</div>
    {current && <div className="assignment-reassign-box"><h3>Eğitmen değişikliği</h3><p className="assignment-reassign-helper-v32">Seçtiğiniz eğitmeni atamak için aşağıdaki bilgileri tamamlayın.</p><label>Değişiklik gerekçesi<textarea required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Değişikliğin nedenini yazın..." /><small className="assignment-reason-counter-v32">{reason.length}/500</small></label><label>Hakediş kararı<select value={compensationDecision} onChange={(e) => setCompensationDecision(e.target.value)}><option value="PRESERVE">Mevcut hakedişi koru</option><option value="ADJUST_PENDING">Düzeltme kararı beklesin</option></select></label></div>}
    <button className="assignment-primary-action" type="button" disabled={!trainerId || Boolean(current && !reason.trim())} onClick={() => void assign()}>{current ? "Eğitmeni değiştir" : "Eğitmeni ata"}</button></div>
  </>
)}</>}</section>
    </div>
  </main>;
}
