import Icon from "../components/Icon";
import logo from "../assets/logo-fixoku.png";
import profilePhoto from "../assets/yusuf.jpg";

const roleName = {
  student: "Öğrenci",
  teacher: "Öğretmen",
  institution: "Kurum",
  admin: "Admin",
};

const defaultMenus = {
  teacher: [
    ["home", "Panelim"],
    ["users", "Öğrencilerim"],
    ["plus", "Öğrenci Ekle"],
    ["book", "Egzersiz Atama"],
    ["chart", "Raporlar"],
  ],
  institution: [
    ["home", "Kurum Paneli"],
    ["users", "Öğretmenler"],
    ["book", "Sınıflar"],
    ["chart", "Kurum Raporları"],
    ["settings", "Lisanslar"],
  ],
  admin: [
    ["home", "Admin Paneli"],
    ["users", "Kullanıcılar"],
    ["book", "Egzersizler"],
    ["chart", "Raporlar"],
    ["settings", "Ayarlar"],
  ],
};

export default function DashboardLayout({
  user,
  title,
  subtitle,
  children,
  onLogout,
  menuItems,
  activeMenu,
  onMenuChange,
}) {
  const menu = menuItems || defaultMenus[user.role] || [];
  const currentActive = activeMenu ?? 0;

  const selectMenu = (index, item) => {
    if (onMenuChange) onMenuChange(item.key || index);
  };

  return (
    <div className="fx-shell">
      <aside className="fx-sidebar fx-sidebar-clean">
        <div className="fx-sidebar-bg" />

        <div className="fx-sidebar-logo-center">
          <img src={logo} alt="Fixoku" className="fx-sidebar-logo-large" />
        </div>

        <nav className="fx-nav fx-nav-clean">
          {menu.map((item, index) => {
            const icon = Array.isArray(item) ? item[0] : item.icon;
            const label = Array.isArray(item) ? item[1] : item.label;

            return (
              <button
                type="button"
                key={label}
                className={
                  currentActive === (item.key || index) || currentActive === index
                    ? "active"
                    : ""
                }
                onClick={() => selectMenu(index, item)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button type="button" className="fx-logout" onClick={onLogout}>
          <Icon name="logout" />
          <span>Çıkış Yap</span>
        </button>
      </aside>

      <main className="fx-main">
        <header className="fx-topbar fx-topbar-profile">
          <div>
            <span className="fx-kicker">Fixoku Panel</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="fx-top-actions">
            <button className="fx-icon-btn" type="button">
              <Icon name="bell" />
            </button>

            <div className="fx-session-pill">
              <span className="fx-live-dot" />
              Canlı Sistem
            </div>

            <div className="fx-header-profile">
              <img src={profilePhoto} alt={user.name} className="fx-header-avatar" />
              <div>
                <strong>{user.name}</strong>
                <span>{roleName[user.role]}</span>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
