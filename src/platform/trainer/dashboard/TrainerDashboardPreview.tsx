import { useEffect, useState } from "react";
import { PanelIcon } from "../../panel/components/PanelIcon";
import { PanelCard } from "../../panel/components/PanelCard";
import { PanelQuickActions } from "../../panel/components/PanelQuickActions";
import { PanelShell } from "../../panel/layout/PanelShell";
import { PanelStatCard } from "../../panel/components/PanelStatCard";
import { TRAINER_DASHBOARD_PREVIEW } from "./trainerDashboardModel";

export function TrainerDashboardPreview({ user }: { user?: { name: string; email?: string } } = {}) {
  const [live, setLive] = useState<{ students?: number; earned?: number; currency?: string }>({});
  useEffect(() => { Promise.all([fetch("/api/trainer/students", { credentials: "same-origin" }), fetch("/api/trainer/earnings", { credentials: "same-origin" })]).then(async ([students, earnings]) => { const s = students.ok ? await students.json() : {}; const e = earnings.ok ? await earnings.json() : {}; setLive({ students: Array.isArray(s.students) ? s.students.length : undefined, earned: e.summary?.earnedMinor, currency: e.currency }); }).catch(() => { /* cards remain explanatory while API is unavailable */ }); }, []);
  const trainerName = user?.name ?? TRAINER_DASHBOARD_PREVIEW.trainerName;
  const greeting = `Merhaba ${trainerName.split(" ")[0]} Hocam`;
  return (
    <PanelShell user={user}>
      <main className="trainer-dashboard-preview" aria-label="Eğitmen paneli önizlemesi">
        <div className="trainer-dashboard-hero">
          <div>
            <h2>{greeting} <span aria-hidden="true">👋</span></h2>
            <p>{TRAINER_DASHBOARD_PREVIEW.heroDescription}</p>
          </div>
          <div className="trainer-dashboard-hero-art" aria-hidden="true"><span>“ Eğitimle<br />daha güçlü yarınlara... ”</span><div className="trainer-book-stack" /></div>
        </div>

        <div className="trainer-dashboard-body">
          <div className="trainer-dashboard-content">
            <div className="trainer-stat-grid">
              {TRAINER_DASHBOARD_PREVIEW.metrics.map((metric) => { const value = metric.title === "Aktif Öğrencilerim" && live.students !== undefined ? `${live.students} Öğrenci` : metric.title === "Güncel Bakiyem" && live.earned !== undefined ? `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: live.currency || "TRY" }).format(live.earned / 100)}` : metric.value ?? "—"; return <PanelStatCard key={metric.title} icon={metric.icon} title={metric.title} value={value} detail={metric.detail} action={metric.action} accent="orange" />; })}
            </div>
            <PanelCard className="trainer-promo-card">
              <div><h2>Bilgi paylaştıkça<br /><em>çoğalır.</em></h2><p>Fixoku ile daha fazla öğrenciye ulaş, daha güçlü yarınlara katkı sağla.</p><span className="trainer-promo-underline" /></div>
              <div className="trainer-promo-art" aria-label="Dekoratif çalışma masası illüstrasyonu" role="img"><PanelIcon name="book" size={68} /></div>
            </PanelCard>
          </div>
          <aside className="trainer-dashboard-rail"><PanelQuickActions /></aside>
        </div>
      </main>
    </PanelShell>
  );
}
