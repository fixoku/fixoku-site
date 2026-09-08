import type { ReactNode } from "react";
import { PanelSidebar } from "./PanelSidebar";
import { PanelTopbar } from "./PanelTopbar";
import "../styles/trainer-dashboard.css";

export function PanelShell({ children, user }: { children: ReactNode; user?: { name: string; email?: string } }) {
  return <div className="platform-panel"><PanelSidebar /><div className="panel-main"><PanelTopbar user={user} />{children}</div></div>;
}
