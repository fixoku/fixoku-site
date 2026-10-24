import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PanelShell } from "../platform/panel/layout/PanelShell";
import { ProtectedTrainerDashboard, ProtectedTrainerTrainings, ProtectedTrainerProfile } from "../platform/auth/ProtectedPanelEntry";
import { TrainerDashboardPreview } from "../platform/trainer/dashboard/TrainerDashboardPreview";
import { TrainerTrainingsPage } from "../platform/trainer/trainings/TrainerTrainingsPage";

const fields = [
  ["phone", "Telefon (isteğe bağlı)"],
  ["city", "Şehir"], ["district", "İlçe"], ["profession", "Meslek"],
  ["institution", "Kurum"], ["educationBackground", "Eğitim bilgileri"],
  ["experience", "Deneyim"], ["specialties", "Uzmanlık alanları"],
  ["bio", "Kısa açıklama"],
];

// Role gate remains on the server. A verified applicant receives only the
// candidate dashboard/catalog and cannot access trainer-only APIs.
export function TrainerPanelEntrySwitch({ view = "dashboard" }) {
  const [access, setAccess] = useState({ state: "loading", candidate: null });
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const contextResponse = await fetch("/api/panel-context?panel=/panel/egitmen", {
          credentials: "same-origin", cache: "no-store",
        });
        if (contextResponse.ok) {
          const context = await contextResponse.json();
          if (context.roles?.includes("TRAINER")) {
            if (active) setAccess({ state: "trainer", candidate: null });
            return;
          }
        }
        const response = await fetch("/api/trainer-candidate?action=profile", {
          credentials: "same-origin", cache: "no-store",
        });
        if (!response.ok) throw new Error("CANDIDATE_DENIED");
        const candidate = await response.json();
        if (!candidate.emailVerified) throw new Error("EMAIL_VERIFICATION_REQUIRED");
        if (active) setAccess({ state: "candidate", candidate });
      } catch {
        if (active) setAccess({ state: "denied", candidate: null });
      }
    }
    void check();
    return () => { active = false; };
  }, []);
  if (access.state === "loading") return <main className="route-loading-status" role="status">Eğitmen paneli açılıyor…</main>;
  if (access.state === "denied") return <Navigate replace to="/ogretmen-girisi" />;
  if (access.state === "trainer") return view === "catalog" ? <ProtectedTrainerTrainings /> : view === "profile" ? <ProtectedTrainerProfile /> : <ProtectedTrainerDashboard />;
  return <TrainerCandidatePage initialData={access.candidate} view={view} />;
}

// For a newly verified applicant, this is the actual trainer panel shell,
// not a mandatory onboarding form. Private trainer pages still check TRAINER.
export default function TrainerCandidatePage({ initialData = null, view = "dashboard" }) {
  const [data, setData] = useState(initialData);
  const [form, setForm] = useState(initialData?.profile || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/trainer-candidate?action=profile", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Bilgiler kaydedilemedi. Alanları kontrol edin.");
      const result = await response.json();
      setData(current => ({ ...current, profileComplete: Boolean(result.profileComplete), profile: { ...form } }));
      setMessage("Bilgileriniz kaydedildi. Dilediğiniz zaman güncelleyebilirsiniz.");
      if (result.profileComplete) setDismissed(true);
    } catch (cause) {
      setMessage(cause.message || "Profil kaydedilemedi.");
    } finally { setSaving(false); }
  }

  if (!data?.emailVerified) return <Navigate replace to="/ogretmen-girisi" />;
  const user = { id: "", name: data.name || "Eğitmen", email: data.email || "" };
  const cardStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "18px 24px", marginBottom: 16 };
  const profileForm = <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 16 }}>
    {fields.map(([id, title]) => <label key={id} style={{ display: "grid", gap: 6 }}>{title}<input name={id} value={form[id] || ""} maxLength={id === "bio" ? 500 : 200} onChange={event => setForm(current => ({ ...current, [id]: event.target.value }))} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, maxWidth: "100%" }} /></label>)}
    <div style={{ gridColumn: "1 / -1" }}><button type="submit" disabled={saving} className="trainer-package-primary" style={{ padding: "12px 18px" }}>{saving ? "Kaydediliyor…" : "Bilgilerimi Kaydet"}</button></div>
    {message && <p role="status" style={{ gridColumn: "1 / -1" }}>{message}</p>}
  </form>;
  if (view === "catalog") return <TrainerTrainingsPage user={user} candidatePreview />;
  if (view === "profile") return <PanelShell role="TRAINER" user={user}>
    <main className="trainer-trainings-page" aria-label="Profilim">
      <section style={cardStyle}><h1>Profilim</h1><p>Bilgilerinizi istediğiniz zaman tamamlayabilirsiniz. Giriş için zorunlu değildir.</p>{profileForm}</section>
    </main>
  </PanelShell>;
  const notice = <div style={{ margin: "0 24px 20px" }}>
    <section style={cardStyle}>
      <strong>E-posta adresiniz doğrulandı.</strong>
      <p>Başvurunuz değerlendirme aşamasında. Yayımlanan eğitmen paketlerini inceleyebilirsiniz. Öğrenci atamaları, özel eğitimler ve hakedişler henüz açık değildir.</p>
      <Link to="/panel/egitmen/egitimlerim" className="trainer-package-primary" style={{ display: "inline-block", padding: "12px 18px", textDecoration: "none" }}>Eğitim Paketlerini İncele</Link>
    </section>
    {!data.profileComplete && !dismissed && <section style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div><strong>Profilinizi tamamlayın (isteğe bağlı)</strong><p>Profil bilgilerinizi şimdi vermeniz gerekmiyor.</p></div>
      <button type="button" onClick={() => setDismissed(true)}>Şimdilik kapat</button>
    </section>}
    <section style={cardStyle}><details><summary style={{ fontWeight: 700, cursor: "pointer" }}>Profil bilgilerimi düzenle (isteğe bağlı)</summary>{profileForm}</details></section>
  </div>;
  return <TrainerDashboardPreview user={user} candidatePreview candidateNotice={notice} />;
}
