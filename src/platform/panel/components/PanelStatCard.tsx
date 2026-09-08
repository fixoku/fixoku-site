import { PanelIcon } from "./PanelIcon";
import { PanelCard } from "./PanelCard";
import type { ReactNode } from "react";

type Accent = "orange" | "purple" | "green" | "blue";

export function PanelStatCard({ icon, title, value, detail, accent = "orange", action }: {
  icon: "book" | "presentation" | "folder" | "users" | "calendar" | "wallet";
  title: string;
  value: ReactNode;
  detail: string;
  accent?: Accent;
  action?: string;
}) {
  return (
    <PanelCard className={`panel-stat-card panel-accent-${accent}`}>
      <div className="panel-stat-icon"><PanelIcon name={icon} size={30} /></div>
      <div className="panel-stat-copy">
        <h3>{title}</h3>
        <strong>{value}</strong>
        <p>{detail}</p>
        {action && <button type="button" className="panel-outline-action">{action}<PanelIcon name="arrow" size={17} /></button>}
      </div>
      <div className="panel-stat-ghost" aria-hidden="true"><PanelIcon name={icon} size={92} /></div>
    </PanelCard>
  );
}
