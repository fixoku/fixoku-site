import type { ReactNode } from "react";
import { PanelSidebar } from "./PanelSidebar";
import { PanelTopbar } from "./PanelTopbar";
import "../styles/trainer-dashboard.css";

export function PanelShell({ children }: { children: ReactNode }) {
  return <div className="platform-panel"><PanelSidebar /><div className="panel-main"><PanelTopbar />{children}</div></div>;
}
