import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { StudentPanelShell } from "./StudentPanelShell";
import "./student-portal.css";

type User = { id?: string; name: string; email?: string };
type Context = { studentProfileId: string; student: { name: string; grade: string | null; school: string | null; status: string } };
type Enrollment = { id: string; status: string; program: { title: string; slug: string; shortDescription?: string }; trainerNames?: string[] };
type Body = { role: "STUDENT" | "GUARDIAN"; context: Context | null; students: { studentProfileId: string; name: string }[]; enrollments: Enrollment[] };

const formatDisplayName = (value: string) => value.trim().split(/\s+/u).map((part) => {
  const lower = part.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}).join(" ");
const statusLabels: Record<string, string> = { ACTIVE: "Aktif", COMPLETED: "Tamamlandı", PAUSED: "Beklemede", PLANNED: "Planlandı" };

export function StudentPortalPage({ user, roles }: { user: User; roles: string[] }) {
  const isGuardian = roles.includes("GUARDIAN") && !roles.includes("STUDENT");
  const [body, setBody] = useState<Body | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState("");
  const load = useCallback(async (id?: string) => {
    setState("loading");
    try {
      const query = id ? `?studentProfileId=${encodeURIComponent(id)}` : "";
      const response = await fetch(`/api/student/portal-context${query}`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("portal context");
      const next = await response.json() as Body;
      setBody(next);
      setSelected(next.context?.studentProfileId ?? "");
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const initials = useMemo(() => body?.context?.student.name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR") || "Ö", [body]);
  const shell = (content: ReactNode) => <StudentPanelShell user={user} guardian={isGuardian} studentProfileId={selected}>{content}</StudentPanelShell>;

  if (state === "loading") return shell(<div className="student-portal__state" role="status" aria-live="polite">Öğrenci paneli yükleniyor…</div>);
  if (state === "error") return shell(<div className="student-portal__state" role="alert"><h3>Panel verileri yüklenemedi</h3><p>Bilgilerinize şu anda ulaşılamıyor.</p><button className="student-portal__retry" type="button" onClick={() => void load(selected || undefined)}>Tekrar dene</button></div>);

  const context = body?.context;
  const students = body?.students ?? [];
  const enrollments = body?.enrollments ?? [];
  return shell(<>
    <div className="student-portal__hero">
      <div><h2>{isGuardian ? "Veli görünümü" : "Öğrenci Paneli"}</h2><p>{isGuardian ? "Bağlı öğrencinin eğitim bilgilerini buradan takip edebilirsiniz." : `Merhaba, ${formatDisplayName(user.name)}. Eğitimlerine buradan ulaşabilirsin.`}</p></div>
      {isGuardian && students.length > 0 && <div className="student-portal__context"><small>Görüntülenen öğrenci</small><label htmlFor="student-context-select" className="student-portal__sr-only">Öğrenci seçin</label><select id="student-context-select" value={selected} onChange={(event) => { setSelected(event.target.value); void load(event.target.value); }}>{students.map((student) => <option key={student.studentProfileId} value={student.studentProfileId}>{formatDisplayName(student.name)}</option>)}</select></div>}
    </div>
    {isGuardian && context && <div className="student-portal__banner" role="status">Şu anda {formatDisplayName(context.student.name)}’in eğitim bilgilerini görüntülüyorsunuz.</div>}
    {!context ? <div className="student-portal__state"><h3>{isGuardian ? "Bağlı öğrenci bulunamadı" : "Profiliniz henüz hazır değil"}</h3><p>{isGuardian ? "Yetkilendirilmiş bir öğrenci ilişkisi tanımlandığında burada görünecek." : "Eğitim bilgileriniz hazır olduğunda bu alanda görüntülenecek."}</p></div> : <div className="student-portal__grid">
      <section className="student-portal__card" aria-labelledby="student-identity-title"><h3 id="student-identity-title">Öğrenci bilgileri</h3><div className="student-portal__identity"><div className="student-portal__avatar" aria-hidden="true">{initials}</div><div><strong>{formatDisplayName(context.student.name)}</strong><p>{context.student.grade || "Seviye belirtilmedi"}{context.student.school ? ` · ${context.student.school}` : ""}</p></div></div></section>
      <section className="student-portal__card" aria-labelledby="student-access-title"><h3 id="student-access-title">{isGuardian ? "Eğitmeni" : "Eğitmenim"}</h3>{enrollments[0]?.trainerNames?.length ? <><strong className="student-portal__summary-trainer">{enrollments[0].trainerNames.map(formatDisplayName).join(", ")}</strong><p>{isGuardian ? "Seçili öğrencinin eğitimine eşlik eden eğitmen." : "Eğitimin boyunca sana eşlik eden eğitmen."}</p></> : <p>Eğitmen ataması henüz yapılmadı.</p>}</section>
      <section className="student-portal__card student-portal__enrollments" aria-labelledby="enrollment-title"><h3 id="enrollment-title">Eğitimlerim</h3>{enrollments.length ? enrollments.map((enrollment) => <div className="student-portal__enrollment" key={enrollment.id}><div><strong>{enrollment.program.title}</strong><span>{enrollment.program.shortDescription || "Fixoku eğitim programı"}</span>{enrollment.trainerNames?.length ? <span className="student-portal__trainer">Eğitmenim: {enrollment.trainerNames.map(formatDisplayName).join(", ")}</span> : <span className="student-portal__trainer">Eğitmen ataması henüz yapılmadı.</span>}</div><span className="student-portal__status">{statusLabels[enrollment.status] || "Durum bekleniyor"}</span></div>) : <p>Henüz aktif bir eğitim kaydınız bulunmuyor.</p>}</section>
    </div>}
  </>);
}
