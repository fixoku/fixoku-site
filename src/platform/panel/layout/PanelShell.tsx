import type { ReactNode } from "react";
import { PanelSidebar } from "./PanelSidebar";
import { PanelTopbar } from "./PanelTopbar";
import { useLocation } from "react-router-dom";
import "../styles/trainer-dashboard.css";
import "../styles/trainer-visual.css";
import "../styles/trainer-parity.css";
import "../styles/panel-layout-consistency.css";
import "../styles/premium-foundation.css";
import "../styles/management-foundation.css";

export function PanelShell({
  children,
  user,
  role: explicitRole,
}: {
  children: ReactNode;
  user?: { name: string; email?: string };
  role?: "OWNER" | "ADMIN" | "TRAINER" | "STUDENT";
}) {
  const location = useLocation();

  const role =
    explicitRole ||
    (location.pathname.startsWith("/panel/owner")
      ? "OWNER"
      : location.pathname.startsWith("/panel/admin")
        ? "ADMIN"
        : location.pathname.startsWith("/panel/ogrenci")
          ? "STUDENT"
          : "TRAINER");

  const shellClass = role === "TRAINER" ? "trainer-panel" : role === "OWNER" ? "management-owner" : role === "ADMIN" ? "management-admin" : "";

  return (
    <div className={`platform-panel ${shellClass}`}>
      <PanelSidebar role={role} />

      <div className="panel-main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PanelTopbar user={user} role={role} />
        {children}

        <div className="panel-endcap panel-endcap-empty" aria-hidden="true" />
      </div>
    </div>
  );
}
