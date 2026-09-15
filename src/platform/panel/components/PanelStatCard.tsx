import { PanelIcon } from "./PanelIcon";
import { PanelCard } from "./PanelCard";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type Accent = "orange" | "purple" | "green" | "blue";

export function PanelStatCard({ icon, title, value, detail, accent = "orange", action }: {
  icon: "book" | "presentation" | "folder" | "users" | "calendar" | "wallet";
  title: string;
  value: ReactNode;
  detail: string;
  accent?: Accent;
  action?: string;
}) {
  const navigate = useNavigate();
  const target = title.includes("Eğitim") ? "/panel/egitmen/egitimlerim" : title.includes("Sunum") ? "/panel/egitmen/sunumlarim" : title.includes("Kaynak") ? "/panel/egitmen/kaynaklarim" : title.includes("Müsaitlik") ? "/panel/egitmen/musaitlik" : title.includes("Öğrenci") ? "/panel/egitmen/ogrencilerim" : title.includes("Bakiye") ? "/panel/egitmen/bakiyem" : null;
  return (
    <PanelCard className={`panel-stat-card panel-accent-${accent}`}>
      <div className="panel-stat-icon"><PanelIcon name={icon} size={30} /></div>
      <div className="panel-stat-copy">
        <h3>{title}</h3>
        <strong>{value}</strong>
        <p>{detail}</p>
        {action && target && <button type="button" className="panel-outline-action" onClick={() => navigate(target)}>{action}<PanelIcon name="arrow" size={17} /></button>}
      </div>
      <div className="panel-stat-ghost" aria-hidden="true"><PanelIcon name={icon} size={92} /></div>
    </PanelCard>
  );
}
