import { useEffect, useMemo, useState } from "react";
import "./fixoku-free-access-r19g.css";

type Student = { id: string; displayName: string; email: string; studentProfileId?: string | null; educationStage?: string | null; grade?: string | null; school?: string | null };
type Child = { childProfileId: string; studentUserId: string; displayName: string; ownerDisplayName?: string | null; email: string; studentProfileId?: string | null; educationStage?: string | null; grade?: string | null };
type Package = { packageId: string; packageVersionId: string; packageTitle: string; title: string; educationStage: string; eligibleGradesJson: string; versionNumber: number };
type Grant = { id: string; studentUserId: string; studentProfileId?: string | null; childProfileId?: string | null; packageVersionId: string; packageTitle: string; educationStage: string; status: string; note?: string | null; effectiveAt: string; revokedAt?: string | null; revokeReason?: string | null };
type Payload = { students: Student[]; children: Child[]; packages: Package[]; assignments: Grant[] };

const stageLabel: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const parseGrades = (value: string) => { try { const result = JSON.parse(value || "[]"); return Array.isArray(result) ? result.map(Number) : []; } catch { return []; } };
const eligible = (student: { studentProfileId?: string | null; educationStage?: string | null; grade?: string | null }, pkg: Package) => Boolean((student.studentProfileId || student.educationStage) && student.educationStage === pkg.educationStage && (pkg.educationStage === "ADULT" || parseGrades(pkg.eligibleGradesJson).includes(Number(student.grade))));

export function AdminStudentEntitlementsPage() {
  const [data, setData] = useState<Payload>({ students: [], children: [], packages: [], assignments: [] });
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [childProfileIds, setChildProfileIds] = useState<string[]>([]);
  const [packageVersionIds, setPackageVersionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const load = async () => {
    setLoading(true); setApiReady(false);
    try {
      const response = await fetch("/api/admin/student-entitlements", { credentials: "same-origin", cache: "no-store" });
      const contentType = response.headers.get("content-type") || "belirtilmemiş";
      const raw = await response.text();
      let body: unknown;
      try { body = JSON.parse(raw); } catch { body = null; }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error(`API yanıtı JSON nesnesi değil (HTTP ${response.status}, Content-Type: ${contentType}). Yerel 5173 sunucusu HTML/giriş sayfası döndürüyor olabilir; API proxy ve oturum kontrol edilmeli.`);
      }
      const payload = body as Record<string, unknown>;
      if (!response.ok) {
        const code = typeof payload.error === "string" ? payload.error : "API_ERROR";
        throw new Error(`Ücretsiz erişim API hatası: ${code} (HTTP ${response.status}). Owner oturumu ve API sunucusu kontrol edilmeli.`);
      }
      const missing = (["students", "children", "packages", "assignments"] as const).filter((key) => !Array.isArray(payload[key]));
      if (missing.length) {
        const keys = Object.keys(payload).slice(0, 8).join(", ") || "boş";
        throw new Error(`API beklenen listeleri döndürmedi: ${missing.join(", ")}. HTTP ${response.status}; Content-Type: ${contentType}; gelen alanlar: ${keys}. Yerel API yönlendirmesini kontrol edin.`);
      }
      setData({ students: payload.students as Student[], children: payload.children as Child[], packages: payload.packages as Package[], assignments: payload.assignments as Grant[] });
      setMessage(""); setApiReady(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Öğrenci erişimleri yüklenemedi."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const selectedStudents = useMemo(() => data.students.filter((student) => studentIds.includes(student.id)), [data.students, studentIds]);
  const selectedChildren = useMemo(() => data.children.filter((child) => childProfileIds.includes(child.childProfileId)), [data.children, childProfileIds]);
  const selectedTargets = useMemo(() => [...selectedStudents, ...selectedChildren], [selectedChildren, selectedStudents]);
  const availablePackages = useMemo(() => selectedTargets.length ? data.packages.filter((pkg) => selectedTargets.every((student) => eligible(student, pkg))) : [], [data.packages, selectedTargets]);
  const toggle = (current: string[], id: string) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id];

  const grant = async () => {
    if (!apiReady || !selectedTargets.length || !packageVersionIds.length) { setMessage("En az bir öğrenci, çocuk profili veya paket seçin."); return; }
    setBusy(true); setMessage("");
    try {
      const targets = [...selectedStudents.map((student) => ({ studentUserId: student.id })), ...selectedChildren.map((child) => ({ studentUserId: child.studentUserId, childProfileId: child.childProfileId }))];
      const response = await fetch("/api/admin/student-entitlements", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ targets, packageVersionIds, note }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Erişim verilemedi.");
      const granted = (body.results || []).filter((item: { status: string }) => item.status === "GRANTED").length;
      const duplicates = (body.results || []).filter((item: { status: string }) => item.status === "DUPLICATE" || item.status === "ALREADY_OWNED").length;
      setMessage(`${granted} ücretsiz erişim tanımlandı${duplicates ? ` · ${duplicates} mevcut kayıt korundu` : ""}. Ödeme ve ciro kaydı oluşturulmadı.`);
      setPackageVersionIds([]); setNote(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erişim verilemedi."); }
    finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    if (!reason.trim()) { setMessage("Erişim kaldırma gerekçesi yazın."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/student-entitlements", { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ entitlementIds: [id], reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Erişim kaldırılamadı.");
      setMessage("Owner ücretsiz erişimi kaldırıldı; geçmiş tamamlanmış kayıtlar korundu."); setReason(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Erişim kaldırılamadı."); }
    finally { setBusy(false); }
  };

  return <div className="fx-free-r19g" aria-label="Ücretsiz Öğrenci Erişimleri">
    <header className="admin-page-heading"><div><span className="admin-editor-eyebrow">OWNER EĞİTİM OPERASYONU</span><h1>Öğrenciye ücretsiz paket tanımla</h1><p>Gerçek yayınlanmış öğrenci katalog paketlerinden erişim açın. Ödeme, sipariş ve ciro kaydı oluşturulmaz.</p></div></header>
    {message && <p className="admin-feedback" role="status">{message}</p>}
    {loading ? <p role="status">Öğrenci ve paket listeleri yükleniyor…</p> : <>
      <section className="admin-package-layout fx-free-r19g-layout">
      <section className="panel-card" aria-labelledby="free-grant-title"><h2 id="free-grant-title">Erişim tanımlama</h2>
          <fieldset><legend>Öğrenci hesapları ({studentIds.length} seçili)</legend><div className="admin-package-grid">{data.students.map((student) => <label className="admin-package-card" key={student.id}><input type="checkbox" checked={studentIds.includes(student.id)} onChange={() => { setStudentIds(toggle(studentIds, student.id)); setPackageVersionIds([]); }} /><strong>{student.displayName}</strong><span>{student.email}</span><small>{student.educationStage ? `${stageLabel[student.educationStage] || student.educationStage}${student.grade ? ` · ${student.grade}. sınıf` : ""}` : "Profil segmenti eksik"}</small></label>)}</div></fieldset>
          <fieldset><legend>Çocuk profilleri ({childProfileIds.length} seçili)</legend><div className="admin-package-grid">{data.children.map((child) => <label className="admin-package-card" key={child.childProfileId}><input type="checkbox" checked={childProfileIds.includes(child.childProfileId)} onChange={() => { setChildProfileIds(toggle(childProfileIds, child.childProfileId)); setPackageVersionIds([]); }} /><strong>{child.displayName}</strong><span>{child.ownerDisplayName || child.email} · çocuk profili</span><small>{child.educationStage ? `${stageLabel[child.educationStage] || child.educationStage}${child.grade ? ` · ${child.grade}. sınıf` : ""}` : "Profil segmenti eksik"}</small></label>)}</div>{!data.children.length && <p>Aktif çocuk profili bulunamadı.</p>}</fieldset>
          <fieldset><legend>Uygun yayınlanmış paketler ({packageVersionIds.length} seçili)</legend>{selectedStudents.length === 0 && <p>Önce öğrenci seçin; ardından yalnızca ortak uygun paketler gösterilir.</p>}<div className="admin-package-grid">{availablePackages.map((pkg) => <label className="admin-package-card" key={pkg.packageVersionId}><input type="checkbox" checked={packageVersionIds.includes(pkg.packageVersionId)} onChange={() => setPackageVersionIds(toggle(packageVersionIds, pkg.packageVersionId))} /><strong>{pkg.title}</strong><span>{stageLabel[pkg.educationStage] || pkg.educationStage} · v{pkg.versionNumber}</span><small>{parseGrades(pkg.eligibleGradesJson).join(", ") || "Tüm sınıflar"}</small></label>)}</div>{selectedStudents.length > 0 && !availablePackages.length && <p role="note">Seçilen öğrencilerin segment ve sınıfına uygun yayınlanmış paket bulunamadı.</p>}</fieldset>
          <label>Owner notu (isteğe bağlı)<textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="Örn. burs / kurum anlaşması / telafi hakkı" /></label>
          <button type="button" disabled={!apiReady || busy || !selectedTargets.length || !packageVersionIds.length} onClick={() => void grant()}>Seçilenlere ücretsiz erişim ver</button>
        </section>
      </section>
      <section className="panel-card" aria-labelledby="grant-list-title"><h2 id="grant-list-title">Owner tanımları</h2><label>Erişim kaldırma gerekçesi<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Kaldırma gerekçesi zorunludur" /></label><div className="admin-package-list">{data.assignments.length ? data.assignments.map((grantRow) => { const student = data.students.find((item) => item.id === grantRow.studentUserId); const child = grantRow.childProfileId ? data.children.find((item) => item.childProfileId === grantRow.childProfileId) : null; return <article className="admin-package-card" key={grantRow.id}><strong>{child?.displayName || student?.displayName || grantRow.studentUserId}</strong><span>{child ? `${child.ownerDisplayName || child.email} · çocuk profili · ` : ""}{grantRow.packageTitle} · {grantRow.status}</span><small>{grantRow.note || "Owner notu yok"}</small>{grantRow.status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => void revoke(grantRow.id)}>Erişimi kaldır</button>}</article>; }) : <p>Henüz Owner tarafından ücretsiz paket tanımlanmamış.</p>}</div></section>
    </>}
  </div>;
}
