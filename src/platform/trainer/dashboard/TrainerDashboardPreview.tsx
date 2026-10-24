import {loadTrainerRoster,type TrainerRoster} from "../students/trainerAssignmentRoster";
import "../students/trainer-roster-v20.css";
import { useEffect, useState, type ReactNode } from "react";
import { trainerCatalogForReview } from "../trainings/localReviewCatalog";
import { TrainerBanner } from "../components/TrainerVisual";

import { PanelQuickActions } from "../../panel/components/PanelQuickActions";
import { PanelShell } from "../../panel/layout/PanelShell";
import { PanelStatCard } from "../../panel/components/PanelStatCard";
import { TRAINER_DASHBOARD_PREVIEW } from "./trainerDashboardModel";

const BASIC_TRAINER_SLUGS = new Set<string>([
  "ilkokul-akici-hizli-okuma-egitimi",
  "ortaokul-hizli-okuma-egitimi",
  "lise-hizli-okuma-egitimi",
  "yetiskin-hizli-okuma-egitimi",
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs",
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt",
]);
export function TrainerDashboardPreview({ user, candidatePreview=false, candidateNotice }: { user?: { name: string; email?: string }; candidatePreview?: boolean; candidateNotice?: ReactNode } = {}) {
  const [live, setLive] = useState<{ students?: number; trainings?: number; earned?: number; currency?: string }>({});
 const [assignmentRoster,setAssignmentRoster]=useState<TrainerRoster|null>(null);
 useEffect(()=>{
   if(candidatePreview)return;
   let active=true;
   loadTrainerRoster().then(data=>{if(active)setAssignmentRoster(data);}).catch(()=>{if(active)setAssignmentRoster(null);});
   return ()=>{active=false;};
 },[candidatePreview]);
  useEffect(() => { if(candidatePreview)return; Promise.all([fetch("/api/trainer/students", { credentials: "same-origin" }), fetch("/api/trainer/earnings", { credentials: "same-origin" }), fetch("/api/trainer/packages", { credentials: "same-origin", cache: "no-store" })]).then(async ([students, earnings, trainings]) => { const s = students.ok ? await students.json() : {}; const e = earnings.ok ? await earnings.json() : {}; const t = trainings.ok ? await trainings.json() : {}; setLive({ trainings: Array.isArray(t.packages) ? t.packages.filter((item: { slug?: string; accessState?: string }) => item.accessState === "OWNED" && BASIC_TRAINER_SLUGS.has(item.slug || "")).length : undefined, students: Array.isArray(s.students) ? s.students.length : undefined, earned: e.summary?.earnedMinor, currency: e.currency }); }).catch(() => { /* cards remain explanatory while API is unavailable */ }); }, [candidatePreview]);
  return (
    <PanelShell user={user}>
      <main className="trainer-dashboard-preview" aria-label="Eğitmen paneli önizlemesi">
        <div className="trainer-dashboard-hero">
          <TrainerBanner variant="hero" />
        </div>

        {candidateNotice}
        <div className="trainer-dashboard-body">
          <div className="trainer-dashboard-content">
            <div className="trainer-stat-grid">
              {TRAINER_DASHBOARD_PREVIEW.metrics.map((metric) => { const value = candidatePreview ? (metric.title === "Eğitmen Kaynakları" || metric.title === "Eğitmen Paketleri" ? null : "Başvuru beklemede") : metric.title === "Aktif Öğrencilerim" ? (assignmentRoster ? `${assignmentRoster.activeStudents} Öğrenci` : "—") : metric.title === "Güncel Bakiyem" && live.earned !== undefined ? `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: live.currency || "TRY" }).format(live.earned / 100)}` : metric.title === "Aktif Eğitimlerim" && live.trainings !== undefined ? `${live.trainings} Eğitim` : metric.title === "Eğitmen Kaynakları" || metric.title === "Eğitmen Paketleri" ? null : metric.value ?? "—"; return <PanelStatCard key={metric.title} icon={metric.icon} title={metric.title} value={value} detail={metric.detail} action={metric.action} accent="orange" />; })}
            </div>
            <TrainerBanner variant="sharing" className="trainer-promo-banner" />
          </div>
          <aside className="trainer-dashboard-rail"><PanelQuickActions /></aside>
        </div>
      </main>
    </PanelShell>
  );
}
