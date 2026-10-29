import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Student = { id: string; displayName: string; email: string; studentProfileId?: string | null; educationStage?: string | null; grade?: string | null; school?: string | null };
type Package = { packageId: string; packageVersionId: string; packageTitle: string; title: string; educationStage: string; eligibleGradesJson: string; versionNumber: number };
type Grant = { id: string; studentUserId: string; studentProfileId?: string | null; packageVersionId: string; packageTitle: string; educationStage: string; status: string; note?: string | null; effectiveAt: string; revokedAt?: string | null; revokeReason?: string | null };
type Payload = { students: Student[]; packages: Package[]; assignments: Grant[] };

const stageLabel: Record<string, string> = { PRIMARY: "İlkokul", MIDDLE: "Ortaokul", HIGH: "Lise", ADULT: "Yetişkin" };
const parseGrades = (value: string) => { try { const result = JSON.parse(value || "[]"); return Array.isArray(result) ? result.map(Number) : []; } catch { return []; } };
const eligible = (student: Student, pkg: Package) => Boolean(student.studentProfileId && student.educationStage === pkg.educationStage && (pkg.educationStage === "ADULT" || parseGrades(pkg.eligibleGradesJson).includes(Number(student.grade))));

export function AdminStudentEntitlementsPage() {
  const [data, setData] = useState<Payload>({ students: [], packages: [], assignments: [] });
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [packageVersionIds, setPackageVersionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/student-entitlements", { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Öğrenci erişimleri yüklenemedi.");
      setData(body);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Öğrenci erişimleri yüklenemedi."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const selectedStudents = useMemo(() => data.students.filter((student) => studentIds.includes(student.id)), [data.students, studentIds]);
  const availablePackages = useMemo(() => selectedStudents.length ? data.packages.filter((pkg) => selectedStudents.every((student) => eligible(student, pkg))) : data.packages, [data.packages, selectedStudents]);
  const toggle = (current: string[], id: string) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id];

  const grant = async () => {
    if (!studentIds.length || !packageVersionIds.length) { setMessage("En az bir öğrenci ve paket seçin."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/student-entitlements", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentIds, packageVersionIds, note }) });
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

  return <main className="platform-foundation-panel admin-panel">
    <nav aria-label="Yönetim paneli menüsü"><Link to="/panel/admin">Genel Bakış</Link><Link to="/panel/admin/ogrenci-ticaret">Öğrenci Paketleri</Link><strong>Ücretsiz Öğrenci Erişimleri</strong></nav>
    <header className="admin-page-heading"><div><span className="admin-editor-eyebrow">OWNER EĞİTİM OPERASYONU</span><h1>Öğrenciye ücretsiz paket tanımla</h1><p>Gerçek yayınlanmış öğrenci katalog paketlerinden erişim açın. Ödeme, sipariş ve ciro kaydı oluşturulmaz.</p></div></header>
    {message && <p className="admin-feedback" role="status">{message}</p>}
    {loading ? <p role="status">Öğrenci ve paket listeleri yükleniyor…</p> : <>
      <section className="admin-package-layout">
        <section className="panel-card" aria-labelledby="free-grant-title"><h2 id="free-grant-title">Erişim tanımlama</h2>
          <fieldset><legend>Öğrenciler ({studentIds.length} seçili)</legend><div className="admin-package-grid">{data.students.map((student) => <label className="admin-package-card" key={student.id}><input type="checkbox" checked={studentIds.includes(student.id)} onChange={() => setStudentIds(toggle(studentIds, student.id))} /><strong>{student.displayName}</strong><span>{student.email}</span><small>{student.educationStage ? `${stageLabel[student.educationStage] || student.educationStage}${student.grade ? ` · ${student.grade}. sınıf` : ""}` : "Profil segmenti eksik"}</small></label>)}</div></fieldset>
          <fieldset><legend>Uygun yayınlanmış paketler ({packageVersionIds.length} seçili)</legend>{selectedStudents.length === 0 && <p>Önce öğrenci seçin; ardından yalnızca ortak uygun paketler gösterilir.</p>}<div className="admin-package-grid">{availablePackages.map((pkg) => <label className="admin-package-card" key={pkg.packageVersionId}><input type="checkbox" checked={packageVersionIds.includes(pkg.packageVersionId)} onChange={() => setPackageVersionIds(toggle(packageVersionIds, pkg.packageVersionId))} /><strong>{pkg.title}</strong><span>{stageLabel[pkg.educationStage] || pkg.educationStage} · v{pkg.versionNumber}</span><small>{parseGrades(pkg.eligibleGradesJson).join(", ") || "Tüm sınıflar"}</small></label>)}</div>{selectedStudents.length > 0 && !availablePackages.length && <p role="note">Seçilen öğrencilerin segment ve sınıfına uygun yayınlanmış paket bulunamadı.</p>}</fieldset>
          <label>Owner notu (isteğe bağlı)<textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="Örn. burs / kurum anlaşması / telafi hakkı" /></label>
          <button type="button" disabled={busy || !studentIds.length || !packageVersionIds.length} onClick={() => void grant()}>Seçilenlere ücretsiz erişim ver</button>
        </section>
      </section>
      <section className="panel-card" aria-labelledby="grant-list-title"><h2 id="grant-list-title">Owner tanımları</h2><label>Erişim kaldırma gerekçesi<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Kaldırma gerekçesi zorunludur" /></label><div className="admin-package-list">{data.assignments.length ? data.assignments.map((grantRow) => { const student = data.students.find((item) => item.id === grantRow.studentUserId); return <article className="admin-package-card" key={grantRow.id}><strong>{student?.displayName || grantRow.studentUserId}</strong><span>{grantRow.packageTitle} · {grantRow.status}</span><small>{grantRow.note || "Owner notu yok"}</small>{grantRow.status === "ACTIVE" && <button type="button" disabled={busy} onClick={() => void revoke(grantRow.id)}>Erişimi kaldır</button>}</article>; }) : <p>Henüz Owner tarafından ücretsiz paket tanımlanmamış.</p>}</div></section>
    </>}
  </main>;
}
