import { TrainerIcon as PanelIcon } from "../../trainer/components/TrainerIcon";
import { PanelCard } from "./PanelCard";
import { TRAINER_DASHBOARD_PREVIEW } from "../../trainer/dashboard/trainerDashboardModel";
import { useNavigate } from "react-router-dom";

export function PanelQuickActions() {
  const navigate = useNavigate();
  const targets = ["/panel/egitmen/paketler", "/panel/egitmen/sunumlarim", "/panel/egitmen/kaynaklarim"];
  return (
    <PanelCard className="panel-quick-card">
      <div className="panel-card-heading">
        <div className="panel-quick-heading-icon"><PanelIcon name="bolt" size={26} /></div>
        <div><h2>Hızlı Erişim</h2><p>Günlük işlerinize hızla ulaşın.</p></div>
      </div>
      <div className="panel-quick-list">
        {TRAINER_DASHBOARD_PREVIEW.quickActions.map(({ icon, label }, index) => <button type="button" key={label} onClick={() => navigate(targets[index])}><PanelIcon name={icon} size={22} /><span>{label}</span><PanelIcon name="chevron-right" size={16} /></button>)}
      </div>
    </PanelCard>
  );
}
