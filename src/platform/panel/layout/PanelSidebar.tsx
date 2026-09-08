import { PanelIcon } from "../components/PanelIcon";
import { useState } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  ["home", "Ana Sayfa", "/panel/egitmen"],
  ["user", "Profilim", "/panel/egitmen/profil"],
  ["book", "Eğitimlerim", undefined],
  ["presentation", "Sunumlarım", undefined],
  ["folder", "Eğitmen Kaynakları", undefined],
  ["cube", "Eğitmen Paketleri", undefined],
  ["users", "Öğrencilerim", undefined],
  ["calendar", "Müsaitlik Takvimim", undefined],
  ["wallet", "Bakiyem", undefined],
] as const;

export function PanelSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <aside className="panel-sidebar" aria-label="Eğitmen paneli menüsü">
      <div className="panel-brand">
        <img src="/logo-fixoku.png" alt="Fixoku" />
      </div>
      <button type="button" className="panel-mobile-menu" aria-expanded={menuOpen} aria-controls="trainer-panel-navigation" onClick={() => setMenuOpen((open) => !open)}>
        <PanelIcon name="menu" />
        <span>{menuOpen ? "Menüyü kapat" : "Menüyü aç"}</span>
      </button>
      <nav id="trainer-panel-navigation" className={`panel-nav ${menuOpen ? "is-mobile-open" : ""}`}>
        {navigation.map(([icon, label, href], index) => (
          href ? <NavLink key={label} to={href} end={href === "/panel/egitmen"} className={({ isActive }) => `panel-nav-item ${isActive ? "is-active" : ""}`} aria-current={undefined}>
            <PanelIcon name={icon} />
            <span>{label}</span>
          </NavLink> : <button type="button" className="panel-nav-item is-disabled" key={label} disabled title="Bu ekran sonraki fazda etkinleştirilecek"><PanelIcon name={icon} /><span>{label}</span></button>
        ))}
      </nav>
      <div className="panel-sidebar-divider" />
      <button type="button" className="panel-logout" onClick={() => { void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).finally(() => { window.location.assign("/giris"); }); }}>
        <PanelIcon name="logout" />
        <span>Çıkış</span>
      </button>
      <div className="panel-sidebar-quote">Daha<br />aydınlık nesiller<br />için...<span className="panel-sidebar-quote-line" aria-hidden="true" /></div>
    </aside>
  );
}
