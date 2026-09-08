import { PanelIcon } from "../../panel/components/PanelIcon";
import { PanelCard } from "../../panel/components/PanelCard";
import { PanelQuickActions } from "../../panel/components/PanelQuickActions";
import { PanelShell } from "../../panel/layout/PanelShell";
import { PanelStatCard } from "../../panel/components/PanelStatCard";
import { TRAINER_DASHBOARD_PREVIEW } from "./trainerDashboardModel";

export function TrainerDashboardPreview() {
  return (
    <PanelShell>
      <main className="trainer-dashboard-preview" aria-label="Eğitmen paneli önizlemesi">
        <div className="trainer-dashboard-hero">
          <div>
            <h2>{TRAINER_DASHBOARD_PREVIEW.greeting} <span aria-hidden="true">👋</span></h2>
            <p>{TRAINER_DASHBOARD_PREVIEW.heroDescription}</p>
          </div>
          <div className="trainer-dashboard-hero-art" aria-hidden="true"><span>“ Eğitimle<br />daha güçlü yarınlara... ”</span><div className="trainer-book-stack" /></div>
        </div>

        <div className="trainer-dashboard-body">
          <div className="trainer-dashboard-content">
            <div className="trainer-stat-grid">
              {TRAINER_DASHBOARD_PREVIEW.metrics.map((metric) => <PanelStatCard key={metric.title} icon={metric.icon} title={metric.title} value={metric.value} detail={metric.detail} action={metric.action} accent="orange" />)}
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
