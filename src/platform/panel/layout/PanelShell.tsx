import type { ReactNode } from "react";
import { PanelSidebar } from "./PanelSidebar";
import { PanelTopbar } from "./PanelTopbar";
import { useLocation } from "react-router-dom";
import "../styles/trainer-dashboard.css";
import "../styles/trainer-visual.css";
import "../styles/trainer-parity.css";
import "../styles/panel-layout-consistency.css";

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

  return (
    <div className={`platform-panel ${role === "TRAINER" ? "trainer-panel" : ""}`}>
      <PanelSidebar role={role} />

      <div className="panel-main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PanelTopbar user={user} role={role} />
        {children}

        <div
          className="panel-endcap"
          style={{
            margin: "auto 26px 0",
            padding: "18px 22px",
            borderRadius: "18px 18px 0 0",
            border: "1px solid #ece7de",
            background: "linear-gradient(135deg,#fff 0%,#fffaf4 58%,#f8efe7 100%)",
            boxShadow: "0 12px 30px rgba(36,33,28,.04)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px 20px",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <strong style={{ color: "#14233a", fontSize: "16px" }}>
              Fixoku Panel
            </strong>
            <span style={{ color: "#6e7782", fontSize: "13px" }}>
              Bilgi paylaşır, geleceği birlikte inşa ederiz.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px 16px",
              color: "#8b6f57",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: ".02em",
            }}
          >
            <span>GÜVENLİ ÖDEME</span>
            <span>•</span>
            <span>KARGO TAKİBİ</span>
            <span>•</span>
            <span>DESTEK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
