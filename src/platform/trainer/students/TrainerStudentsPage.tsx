import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PanelIcon } from "../../panel/components/PanelIcon";
import { PanelShell } from "../../panel/layout/PanelShell";
import "./trainer-students.css";

type Enrollment = { id: string; status: string; programTitle: string | null };
export type TrainerStudent = { id: string; name: string; email: string; grade: string | null; school: string | null; status: string; linkedAt?: string | null; enrollments?: Enrollment[] };
const statusLabel: Record<string, string> = { ACTIVE: "Aktif", PLANNED: "Eğitim planlandı", NEW: "Yeni atandı", COMPLETED: "Tamamlandı", PAUSED: "Beklemede" };
const labelForStatus = (value: string) => statusLabel[value.toUpperCase()] ?? "Aktif";

export function TrainerStudentsPage({ user }: { user: { id: string; name: string; email: string } }) {
  const [students, setStudents] = useState<TrainerStudent[]>([]); const [state, setState] = useState<"loading" | "ready" | "error">("loading"); const [query, setQuery] = useState("");
  const load = useCallback(async () => { setState("loading"); try { const response = await fetch("/api/trainer/students", { credentials: "same-origin" }); if (!response.ok) throw new Error(); const body = (await response.json()) as { students?: TrainerStudent[] }; setStudents(Array.isArray(body.students) ? body.students : []); setState("ready"); } catch { setState("error"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => { const normalized = query.trim().toLocaleLowerCase("tr-TR"); if (!normalized) return students; return students.filter((student) => `${student.name} ${student.email} ${student.school ?? ""}`.toLocaleLowerCase("tr-TR").includes(normalized)); }, [students, query]);
  return <PanelShell user={user}><main className="trainer-students-page">
    <p className="students-breadcrumb"><Link to="/panel/egitmen">Ana Sayfa</Link><span aria-hidden="true">›</span> Öğrencilerim</p>
    <div className="students-heading"><div><h2>Öğrencilerim</h2><p>Fixoku merkezi tarafından size yönlendirilen öğrencileri bu alandan takip edebilirsiniz.</p></div><div className="students-art" aria-hidden="true">“Her öğrencinin<br />potansiyeli değerlidir…”<i /></div></div>
    {state === "loading" && <div className="students-state" role="status" aria-live="polite"><span className="loading-dot" /> Öğrenciler yükleniyor…</div>}
    {state === "error" && <div className="students-state" role="alert"><h3>Öğrenciler yüklenemedi</h3><p>Öğrenci listenize şu anda ulaşılamıyor. Lütfen tekrar deneyin.</p><button type="button" onClick={() => void load}>Tekrar dene</button></div>}
    {state === "ready" && <><section className="student-stats" aria-label="Öğrenci özeti"><div><PanelIcon name="users" size={30} /><span>Aktif Öğrenciler<strong>{students.length} Öğrenci</strong></span></div><div><PanelIcon name="user" size={30} /><span>Yeni Yönlendirilen<strong>—</strong></span></div><div><PanelIcon name="calendar" size={30} /><span>Planlanan Eğitim<strong>—</strong></span></div></section>
      <section className="student-list-card" aria-labelledby="student-list-heading"><div className="student-list-head"><h3 id="student-list-heading">Öğrenci Listesi</h3><label className="student-search"><PanelIcon name="search" size={18} /><span className="sr-only">Öğrenci ara</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci ara…" /></label></div>
      {!filtered.length ? <div className="students-empty" role="status"><h3>{students.length ? "Aramanızla eşleşen öğrenci yok" : "Henüz yönlendirilmiş öğrenci yok"}</h3><p>{students.length ? "Farklı bir ad, e-posta veya okul ile aramayı deneyin." : "Yeni öğrenciler hesabınıza tanımlandığında burada görünecek."}</p>{students.length > 0 && <button type="button" onClick={() => setQuery("")}>Aramayı temizle</button>}</div> : <div className="student-table-wrap"><table className="student-table"><caption className="sr-only">Size atanmış öğrenciler</caption><thead><tr><th scope="col">Öğrenci</th><th scope="col">Seviye</th><th scope="col">Eğitim</th><th scope="col">Okul</th><th scope="col">Durum</th><th scope="col"><span className="sr-only">İşlem</span></th></tr></thead><tbody>{filtered.map((student) => { const enrollment = student.enrollments?.[0]; return <tr key={student.id}><th scope="row"><span className="student-name">{student.name}</span><small>{student.email}</small></th><td>{student.grade ?? "—"}</td><td>{enrollment?.programTitle ?? "—"}</td><td>{student.school ?? "—"}</td><td><span className={`student-status status-${student.status.toLowerCase()}`}><i />{labelForStatus(student.status)}</span></td><td><Link className="student-detail-link" to={`/panel/egitmen/ogrencilerim/${encodeURIComponent(student.id)}`}>Detay <span aria-hidden="true">›</span></Link></td></tr>; })}</tbody></table></div>}
      </section></>}
  </main></PanelShell>;
}
