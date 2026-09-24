import { useEffect, useState } from "react";
import { TrainerIcon } from "../components/TrainerIcon";
import { trainerCatalogForReview } from "../trainings/localReviewCatalog";
import { TrainerBanner } from "../components/TrainerVisual";

import { PanelQuickActions } from "../../panel/components/PanelQuickActions";
import { PanelShell } from "../../panel/layout/PanelShell";
import { PanelStatCard } from "../../panel/components/PanelStatCard";
import { TRAINER_DASHBOARD_PREVIEW } from "./trainerDashboardModel";

export function TrainerDashboardPreview({ user }: { user?: { name: string; email?: string } } = {}) {
  const [live, setLive] = useState<{ students?: number; trainings?: number; earned?: number; currency?: string }>({});
  useEffect(() => { Promise.all([fetch("/api/trainer/students", { credentials: "same-origin" }), fetch("/api/trainer/earnings", { credentials: "same-origin" }), fetch("/api/trainer/trainings", { credentials: "same-origin" })]).then(async ([students, earnings, trainings]) => { const s = students.ok ? await students.json() : {}; const e = earnings.ok ? await earnings.json() : {}; const t = trainings.ok ? await trainings.json() : {}; setLive({ trainings: Array.isArray(t.programs) ? t.programs.length : undefined, students: Array.isArray(s.students) ? s.students.length : undefined, earned: e.summary?.earnedMinor, currency: e.currency }); }).catch(() => { /* cards remain explanatory while API is unavailable */ }); }, []);
  const trainerName = user?.name ?? TRAINER_DASHBOARD_PREVIEW.trainerName;
  const greeting = `Merhaba ${trainerName.split(" ")[0]} Hocam`;
  return (
    <PanelShell user={user}>
      <main className="trainer-dashboard-preview" aria-label="Eğitmen paneli önizlemesi">
        <div className="trainer-dashboard-hero">
          <div>
            <h2>{greeting} <TrainerIcon name="wave" size={40} /></h2>
            <p>{TRAINER_DASHBOARD_PREVIEW.heroDescription}</p>
          </div>
          <TrainerBanner variant="hero" />
        </div>

        <div className="trainer-dashboard-body">
          <div className="trainer-dashboard-content">
            <div className="trainer-stat-grid">
              {TRAINER_DASHBOARD_PREVIEW.metrics.map((metric) => { const value = metric.title === "Aktif Öğrencilerim" && live.students !== undefined ? `${live.students} Öğrenci` : metric.title === "Güncel Bakiyem" && live.earned !== undefined ? `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: live.currency || "TRY" }).format(live.earned / 100)}` : metric.title === "Aktif Eğitimlerim" && live.trainings !== undefined ? `${live.trainings} Eğitim` : metric.title === "Eğitmen Kaynakları" || metric.title === "Eğitmen Paketleri" ? null : metric.value ?? "—"; return <PanelStatCard key={metric.title} icon={metric.icon} title={metric.title} value={value} detail={metric.detail} action={metric.action} accent="orange" />; })}
            </div>
            <TrainerBanner variant="sharing" className="trainer-promo-banner" />
          </div>
          <aside className="trainer-dashboard-rail"><PanelQuickActions /></aside>
        </div>
      </main>
    </PanelShell>
  );
}
