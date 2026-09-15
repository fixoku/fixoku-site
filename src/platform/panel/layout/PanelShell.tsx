import type { ReactNode } from "react";
import { PanelSidebar } from "./PanelSidebar";
import { PanelTopbar } from "./PanelTopbar";
import { useLocation } from "react-router-dom";
import "../styles/trainer-dashboard.css";

export function PanelShell({ children, user, role: explicitRole }: { children: ReactNode; user?: { name: string; email?: string }; role?: "OWNER" | "ADMIN" | "TRAINER" | "STUDENT" }) {
  const location = useLocation();
  // Keep role inference at the shell boundary so every panel route receives the same sidebar/topbar language, including nested admin and student pages. Callers may provide an explicit role when session context is known.
  const role = explicitRole || (location.pathname.startsWith("/panel/owner") || location.pathname.startsWith("/panel/admin") ? "OWNER" : location.pathname.startsWith("/panel/ogrenci") ? "STUDENT" : "TRAINER");
  return <div className="platform-panel"><PanelSidebar role={role} /><div className="panel-main"><PanelTopbar user={user} role={role} />{children}</div></div>;
}