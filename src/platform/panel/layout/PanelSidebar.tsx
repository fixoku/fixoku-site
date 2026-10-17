import "./logo-020a.css";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PanelIcon } from "../components/PanelIcon";

import { TrainerIcon } from "../../trainer/components/TrainerIcon";

type NavItem = readonly [string, string, string];
type NavGroup = { key: string; label: string; icon: string; items: NavItem[] };

const trainerNavigation: NavItem[] = [
  ["home", "Ana Sayfa", "/panel/egitmen"],
  ["user", "Profilim", "/panel/egitmen/profil"],
  ["flow", "Atamalarım", "/panel/egitmen/atamalarim"],
  ["cap", "Eğitimlerim", "/panel/egitmen/egitimlerim"],
  ["folder", "Eğitmen Kaynakları", "/panel/egitmen/kaynaklarim"],
  ["users", "Öğrencilerim", "/panel/egitmen/ogrencilerim"],
  ["wallet", "Hakedişlerim", "/panel/egitmen/hakedislerim"],
  ["bell", "Bildirimler", "/panel/bildirimler"],
];

const studentNavigation: NavItem[] = [
  ["home", "Ana Sayfa", "/panel/ogrenci"],
  ["user", "Profilim", "/panel/ogrenci/profil"],
  ["users", "Çocuk Profilleri", "/panel/ogrenci/profiller"],
  ["package", "Paketler", "/panel/ogrenci/paketler"],
  ["cube", "Kargolarım", "/panel/ogrenci/kargolar"],
  ["bell", "Bildirimler", "/panel/bildirimler"],
];

const adminGroups: NavGroup[] = [
  {
    key: "sales",
    label: "Satışlar",
    icon: "receipt",
    items: [
      ["receipt", "Siparişler", "/panel/admin/siparisler"],

    ],
  },
  {
    key: "education",
    label: "Eğitim Operasyonu",
    icon: "graduation",
    items: [
      ["users", "Öğrenciler", "/panel/admin/ogrenciler"],
      ["flow", "Birebir Atamalar", "/panel/admin/atamalar"],
    ],
  },
  {
    key: "trainers",
    label: "Eğitmenler",
    icon: "user-check",
    items: [
      ["users", "Eğitmenler", "/panel/admin/egitmenler"],
    ],
  },
  {
    key: "catalog",
    label: "Katalog",
    icon: "boxes",
    items: [
      ["package", "Öğrenci Paketleri", "/panel/admin/ogrenci-ticaret"],
    ],
  },
  {
    key: "operations",
    label: "Operasyon",
    icon: "truck",
    items: [
      ["truck", "Kargo", "/panel/admin/kargo"],
    ],
  },
  {
    key: "system",
    label: "Sistem",
    icon: "settings",
    items: [
      ["user-check", "Kullanıcı & Erişim", "/panel/admin/kullanici-islemleri"],
      ["bolt", "Entegrasyon Durumu", "/panel/admin/saglayicilar"],
      ["history", "Denetim Kaydı", "/panel/admin/denetim-gecmisi"],
      ["bell", "Bildirimler", "/panel/bildirimler"],
    ],
  },
];

const ownerGroups: NavGroup[] = [
  {
    key: "sales",
    label: "Satışlar",
    icon: "receipt",
    items: [
      ["receipt", "Siparişler", "/panel/admin/siparisler"],

      ["handshake", "Özel Teklifler", "/panel/owner/ozel-teklifler"],
      ["wallet", "Öğretmen Hakedişleri", "/panel/owner/hakedisler"],
    ],
  },
  {
    key: "education",
    label: "Eğitim Operasyonu",
    icon: "graduation",
    items: [
      ["users", "Öğrenciler", "/panel/admin/ogrenciler"],
      ["flow", "Birebir Atamalar", "/panel/admin/atamalar"],
      ["graduation", "Grup Atamaları", "/panel/owner/egitim-gruplari"],
    ],
  },
  {
    key: "trainers",
    label: "Eğitmenler",
    icon: "user-check",
    items: [
      ["users", "Eğitmenler", "/panel/admin/egitmenler"],
    ],
  },
  {
    key: "catalog",
    label: "Katalog",
    icon: "boxes",
    items: [
      ["package", "Öğrenci Paketleri", "/panel/admin/ogrenci-ticaret"],
      ["graduation", "Eğitmen Paketleri", "/panel/owner/egitmen-egitim-paketleri"],
    ],
  },
  {
    key: "operations",
    label: "Operasyon",
    icon: "truck",
    items: [
      ["truck", "Kargo", "/panel/admin/kargo"],
    ],
  },
  {
    key: "system",
    label: "Sistem",
    icon: "settings",
    items: [
      ["user-check", "Kullanıcı & Erişim", "/panel/admin/kullanici-islemleri"],
      ["bolt", "Entegrasyon Durumu", "/panel/owner/saglayicilar"],
      ["chart", "Ölçümleme", "/panel/owner/olcumleme"],
      ["mail", "E-posta Şablonları", "/panel/owner/e-posta-sablonlari"],
      ["shield", "Yasal & Uyumluluk", "/panel/owner/yasal-hazirlik"],
      ["history", "Denetim Kaydı", "/panel/admin/denetim-gecmisi"],
      ["bell", "Bildirimler", "/panel/bildirimler"],
    ],
  },
];

function routeActive(pathname: string, href: string) {
  if (href === "/panel/owner" || href === "/panel/admin" || href === "/panel/egitmen" || href === "/panel/ogrenci") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}


const panelRouteIsActiveV30B = (pathname: string, href: string) => {
  const cleanPath = pathname.replace(/\/+$/u, "") || "/";
  const cleanHref = href.replace(/\/+$/u, "") || "/";

  // Eğitmen Yönetimi tek modüldür.
  if (cleanHref === "/panel/admin/egitmenler") {
    return (
      cleanPath === "/panel/admin/egitmenler" ||
      cleanPath.startsWith("/panel/admin/egitmenler/") ||
      cleanPath === "/panel/admin/egitmen-ticaret" ||
      cleanPath.startsWith("/panel/admin/egitmen-ticaret/")
    );
  }

  // Eski Eğitmen Ticareti menü girdisi varsa, birleşik modülde aktif görünmesin.
  if (cleanHref === "/panel/admin/egitmen-ticaret") {
    return false;
  }

  // Dashboard kökleri yalnız tam eşleşmede aktif.
  const exactRoots = new Set([
    "/panel/admin",
    "/panel/owner",
    "/panel/egitmen",
    "/panel/ogrenci",
  ]);
  if (exactRoots.has(cleanHref)) return cleanPath === cleanHref;

  // Detail / nested route parent menüyü aktif tutar.
  return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
};

const panelGroupedRouteIsActiveV30C = (pathname: string, href: string) => {
  const cleanPath = pathname.replace(/\/+$/u, "") || "/";
  const cleanHref = href.replace(/\/+$/u, "") || "/";

  // Eğitmen Yönetimi tek modül:
  // Liste, detay, eğitim satışları ve Owner özel erişimi.
  if (cleanHref === "/panel/admin/egitmenler") {
    return (
      cleanPath === "/panel/admin/egitmenler" ||
      cleanPath.startsWith("/panel/admin/egitmenler/") ||
      cleanPath === "/panel/admin/egitmen-ticaret" ||
      cleanPath.startsWith("/panel/admin/egitmen-ticaret/")
    );
  }

  // Eski ayrı "Eğitmen Ticareti" child kaydı kalmışsa
  // birleşik modülde ikinci bir aktif child üretmesin.
  if (cleanHref === "/panel/admin/egitmen-ticaret") {
    return false;
  }

  const exactRoots = new Set([
    "/panel/admin",
    "/panel/owner",
    "/panel/egitmen",
    "/panel/ogrenci",
  ]);

  if (exactRoots.has(cleanHref)) return cleanPath === cleanHref;

  return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
};
export function PanelSidebar({ role }: { role?: "OWNER" | "ADMIN" | "TRAINER" | "STUDENT" } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const effectiveRole =
    role ||
    (location.pathname.startsWith("/panel/owner")
      ? "OWNER"
      : location.pathname.startsWith("/panel/admin")
        ? "ADMIN"
        : location.pathname.startsWith("/panel/ogrenci")
          ? "STUDENT"
          : "TRAINER");

  const isManagement = effectiveRole === "OWNER" || effectiveRole === "ADMIN";
  const isStudent = effectiveRole === "STUDENT";
  const [familyAccess, setFamilyAccess] = useState(false);
  useEffect(() => {
    if (!isStudent) { setFamilyAccess(false); return; }
    let mounted = true;
    fetch("/api/student/family-offers", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { offers: [] })
      .then((data) => { if (mounted) setFamilyAccess(Array.isArray(data.offers) && data.offers.some((offer: { status?: string }) => offer.status === "SENT")); })
      .catch(() => { if (mounted) setFamilyAccess(false); });
    return () => { mounted = false; };
  }, [isStudent, location.pathname]);
  const Icon = isManagement || isStudent ? PanelIcon : TrainerIcon;
  const menuLabel = isManagement ? "Yönetici paneli menüsü" : isStudent ? "Öğrenci paneli menüsü" : "Eğitmen paneli menüsü";

  const closeMobile = () => setMenuOpen(false);

  const simpleNavigation = isStudent
    ? studentNavigation.filter(([, , href]) => href !== "/panel/ogrenci/profiller" || familyAccess)
    : trainerNavigation;
  const dashboardHref = effectiveRole === "OWNER" ? "/panel/owner" : "/panel/admin";
  const managementGroups = effectiveRole === "OWNER" ? ownerGroups : adminGroups;

  return (
    <aside className={`panel-sidebar ${menuOpen ? "menu-is-open" : ""}`} aria-label={menuLabel}>
      <div className="panel-brand"><NavLink className="panel-brand-home" to={role==="OWNER"?"/panel/owner":role==="ADMIN"?"/panel/admin":role==="STUDENT"?"/panel/ogrenci":"/panel/egitmen"} aria-label="Fixoku panel ana sayfası"><img src="/logo-fixoku.png" alt="Fixoku" /></NavLink></div>

      <button
        type="button"
        className="panel-mobile-menu"
        aria-expanded={menuOpen}
        aria-controls="panel-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon name={"menu" as any} />
        <span>{menuOpen ? "Menüyü kapat" : "Menüyü aç"}</span>
      </button>

      <nav id="panel-navigation" className={`panel-nav ${menuOpen ? "is-mobile-open" : ""}`}>
        {isManagement ? (
          <>
            <p className="panel-nav-heading">GENEL</p>
            <NavLink
              to={dashboardHref}
              end
              className={({ isActive }) => `panel-nav-item ${isActive ? "is-active" : ""}`}
              onClick={closeMobile}
            >
              <PanelIcon name="home" />
              <span>Genel Bakış</span>
            </NavLink>

            {managementGroups.map((group) => {
              const active = group.items.some(([, , href]) => panelGroupedRouteIsActiveV30C(location.pathname, href));
              const open = opened[group.key] ?? active;

              return (
                <section className={`panel-nav-group ${active ? "is-active" : ""}`} key={group.key}>
                  <button
                    type="button"
                    className="panel-nav-group-toggle"
                    aria-expanded={open}
                    aria-controls={`panel-nav-group-${group.key}`}
                    onClick={() => setOpened((current) => ({ ...current, [group.key]: !(current[group.key] ?? active) }))}
                  >
                    <PanelIcon name={group.icon as any} />
                    <span>{group.label}</span>
                    <PanelIcon name="chevron-down" size={17} />
                  </button>

                  <div id={`panel-nav-group-${group.key}`} className={`panel-nav-group-items ${open ? "is-open" : ""}`}>
                    {group.items.map(([icon, label, href]) => (
                      <NavLink
                        key={`${label}-${href}`}
                        to={href}
                        className={() => `panel-nav-item panel-nav-child ${panelGroupedRouteIsActiveV30C(location.pathname, href) ? "is-active" : ""}`}
                        onClick={closeMobile}
                      >
                        <PanelIcon name={icon as any} size={19} />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          simpleNavigation.map(([icon, label, href]) => (
            <NavLink
              key={`${label}-${href}`}
              to={href}
              end={href === "/panel/egitmen" || href === "/panel/ogrenci"}
              data-panel-active-v30b={panelRouteIsActiveV30B(location.pathname, href) ? "true" : undefined} className={() => `panel-nav-item ${panelRouteIsActiveV30B(location.pathname, href) ? "is-active" : ""}`}
              onClick={closeMobile}
            >
              <Icon name={icon as any} />
              <span>{label}</span>
            </NavLink>
          ))
        )}
      </nav>

      <div className="panel-sidebar-divider" />
      <button
        type="button"
        className="panel-logout"
        onClick={() => {
          void fetch("/api/auth/sign-out", { method: "POST", credentials: "same-origin" }).finally(() => {
            window.location.assign("/giris");
          });
        }}
      >
        <Icon name={"logout" as any} />
        <span>Çıkış</span>
      </button>

      <div className="panel-sidebar-quote">
        Daha
        <br />
        aydınlık nesiller
        <br />
        için...
        <span className="panel-sidebar-quote-line" aria-hidden="true" />
      </div>
    </aside>
  );
}
