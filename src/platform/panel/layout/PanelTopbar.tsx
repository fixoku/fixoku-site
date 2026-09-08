import { PanelIcon } from "../components/PanelIcon";

export function PanelTopbar({ user = { name: "Özlem Yılmaz" } }: { user?: { name: string; email?: string } }) {
  return (
    <header className="panel-topbar">
      <div className="panel-topbar-title">
        <h1>Eğitmen Paneli</h1>
        <p>Bilgi paylaşır, geleceği birlikte inşa ederiz.</p>
      </div>
      <div className="panel-topbar-tools">
        <label className="panel-search">
          <span className="sr-only">Panelde ara</span>
          <PanelIcon name="search" size={22} />
          <input type="search" placeholder="Site genelinde ara..." />
        </label>
        <button type="button" className="panel-notification" aria-label="Bildirimler">
          <PanelIcon name="bell" size={26} />
          <span className="panel-notification-dot" aria-label="3 okunmamış bildirim" />
        </button>
        <div className="panel-profile" aria-label="Eğitmen profili">
          <div className="panel-profile-avatar" aria-hidden="true">OY</div>
          <div>
            <strong>{user.name}</strong>
            <span>Eğitmen</span>
          </div>
          <span className="panel-chevron" aria-hidden="true">⌄</span>
        </div>
      </div>
    </header>
  );
}
