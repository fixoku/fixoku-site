import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PanelIcon } from "../components/PanelIcon";

type PanelRole = "OWNER" | "ADMIN" | "TRAINER" | "STUDENT";

const roleLabel: Record<PanelRole, string> = {
  OWNER: "Yönetici",
  ADMIN: "Yönetici",
  TRAINER: "Eğitmen",
  STUDENT: "Öğrenci",
};

export function PanelTopbar({ user = { name: "Özlem KAPLAN" }, role = "TRAINER" }: { user?: { name: string; email?: string }; role?: PanelRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelTitle = role === "OWNER" || role === "ADMIN"
    ? "Yönetici Paneli"
    : role === "STUDENT" || location.pathname.startsWith("/panel/ogrenci")
      ? "Öğrenci Paneli"
      : "Eğitmen Paneli";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data) setUnread(Number(data.unreadCount || 0));
      })
      .catch(() => { /* Bildirim sayısı yüklenemezse panel kullanılmaya devam eder. */ });
    return () => { active = false; };
  }, []);

  return (
    <header className="panel-topbar">
      <div className="panel-topbar-title">
        <h1>{panelTitle}</h1>
        <p>Bilgi paylaşır, geleceği birlikte inşa ederiz.</p>
      </div>
      <div className="panel-topbar-tools">
        <button type="button" className="panel-notification" aria-label={`Bildirimler${unread ? `, ${unread} okunmamış` : ""}`} title="Bildirim merkezini aç" onClick={() => navigate("/panel/bildirimler")}>
          <PanelIcon name="bell" size={26} />
          {unread > 0 && <span className="panel-notification-dot" aria-label={`${unread} okunmamış bildirim`} />}
        </button>
        <div className="panel-profile" aria-label={`${panelTitle} kullanıcı hesabı`}>
          <div className="panel-profile-avatar" aria-hidden="true">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabel[role]}</span>
          </div>
          <PanelIcon name="chevron-down" size={20} />
        </div>
      </div>
    </header>
  );
}