import { PanelIcon } from "../components/PanelIcon";
import { useState } from "react";

const navigation = [
  ["home", "Ana Sayfa"],
  ["user", "Profilim"],
  ["book", "Eğitimlerim"],
  ["presentation", "Sunumlarım"],
  ["folder", "Eğitmen Kaynakları"],
  ["cube", "Eğitmen Paketleri"],
  ["users", "Öğrencilerim"],
  ["calendar", "Müsaitlik Takvimim"],
  ["wallet", "Bakiyem"],
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
        {navigation.map(([icon, label], index) => (
          <button
            type="button"
            className={`panel-nav-item ${index === 0 ? "is-active" : ""}`}
            aria-current={index === 0 ? "page" : undefined}
            key={label}
          >
            <PanelIcon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="panel-sidebar-divider" />
      <button type="button" className="panel-logout">
        <PanelIcon name="logout" />
        <span>Çıkış</span>
      </button>
      <div className="panel-sidebar-quote">Daha<br />aydınlık nesiller<br />için...<span className="panel-sidebar-quote-line" aria-hidden="true" /></div>
    </aside>
  );
}
