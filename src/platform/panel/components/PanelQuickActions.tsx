import { PanelIcon } from "./PanelIcon";
import { PanelCard } from "./PanelCard";
import { TRAINER_DASHBOARD_PREVIEW } from "../../trainer/dashboard/trainerDashboardModel";

export function PanelQuickActions() {
  return (
    <PanelCard className="panel-quick-card">
      <div className="panel-card-heading">
        <div className="panel-quick-heading-icon"><PanelIcon name="bolt" size={26} /></div>
        <div><h2>Hızlı Erişim</h2><p>Günlük işlerinize hızla ulaşın.</p></div>
      </div>
      <div className="panel-quick-list">
        {TRAINER_DASHBOARD_PREVIEW.quickActions.map(({ icon, label }) => <button type="button" key={label}><PanelIcon name={icon} size={22} /><span>{label}</span><PanelIcon name="arrow" size={16} /></button>)}
      </div>
    </PanelCard>
  );
}
