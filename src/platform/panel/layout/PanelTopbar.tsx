import { useEffect, useState } from "react";
import "./trainer-breadcrumbs-020s.css";
import "./fixoku-panel-020t.css";
import "./fixoku-panel-020u.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PanelIcon } from "../components/PanelIcon";
import { TrainerIcon } from "../../trainer/components/TrainerIcon";
import { resolveProfileImage } from "../profileAvatar";

type PanelRole = "OWNER" | "ADMIN" | "TRAINER" | "STUDENT";

type TopbarCartItem = {
  id: string;
  title: string;
  packageVersionId: string;
  priceMinor: number;
  currency: string;
};

type TopbarCart = {
  uniqueCount: number;
  items: TopbarCartItem[];
};

type TopbarNotification = {
  id: string;
  title: string;
  body: string;
  eventType?: string;
  readAt?: string | null;
  createdAt?: string;
  metadataJson?: string | null;
};

const roleLabel: Record<PanelRole, string> = {
  OWNER: "Yönetici",
  ADMIN: "Yönetici",
  TRAINER: "Eğitmen",
  STUDENT: "Öğrenci",
};

export function PanelTopbar({
  user = { name: "Özlem KAPLAN" },
  role = "TRAINER",
}: {
  user?: { name: string; email?: string };
  role?: PanelRole;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // FIXOKU_020T_SHARED_ROUTES: all panel roles share one breadcrumb system.
  const panelHome = role === "OWNER" ? "/panel/owner" : role === "ADMIN" ? "/panel/admin" : role === "STUDENT" ? "/panel/ogrenci" : "/panel/egitmen";
  const currentPath = location.pathname.replace(/\/+$/u, "") || panelHome;
  const pageLabels: Record<string, string> = {
    "/panel/egitmen/profil": "Profilim",
    "/panel/egitmen/atamalarim": "Atamalarım",
    "/panel/egitmen/egitimlerim": "Eğitimlerim",
    "/panel/egitmen/kaynaklarim": "Eğitmen Kaynakları",
    "/panel/egitmen/ogrencilerim": "Öğrencilerim",
    "/panel/egitmen/hakedislerim": "Hakedişlerim",
    "/panel/egitmen/banka-hesabim": "Banka Hesabım",
    "/panel/egitmen/sepet": "Sepetim",
    "/panel/egitmen/checkout": "Ödeme",
    "/panel/ogrenci/profil": "Profilim",
    "/panel/ogrenci/profiller": "Çocuk Profilleri",
    "/panel/ogrenci/paketler": "Paketler",
    "/panel/ogrenci/kargolar": "Kargolarım",
    "/panel/ogrenci/sepet": "Sepetim",
    "/panel/admin/ogrenciler": "Öğrenciler",
    "/panel/admin/atamalar": "Birebir Atamalar",
    "/panel/admin/egitmenler": "Eğitmenler",
    "/panel/admin/egitmen-ticaret": "Eğitmenler",
    "/panel/admin/ogrenci-ticaret": "Öğrenci Paketleri",
    "/panel/admin/ogrenci-erisimleri": "Ücretsiz Öğrenci Erişimleri",
    "/panel/admin/siparisler": "Siparişler",
    "/panel/owner/iadeler": "İade çalışma alanı",
    "/panel/admin/kargo": "Kargo",
    "/panel/admin/kullanici-islemleri": "Kullanıcı ve Erişim",
    "/panel/admin/saglayicilar": "Entegrasyon Durumu",
    "/panel/admin/denetim-gecmisi": "Denetim Kaydı",
    "/panel/owner/egitmen-egitim-paketleri": "Eğitmen Paketleri",
    "/panel/owner/ozel-teklifler": "Özel Teklifler",
    "/panel/owner/hakedisler": "Öğretmen Hakedişleri",
    "/panel/owner/egitim-gruplari": "Grup Atamaları",
    "/panel/owner/saglayicilar": "Entegrasyon Durumu",
    "/panel/owner/olcumleme": "Ölçümleme",
    "/panel/owner/e-posta-sablonlari": "E-posta Şablonları",
    "/panel/owner/yasal-hazirlik": "Yasal ve Uyumluluk",
    "/panel/bildirimler": "Bildirimler",
  };
  const panelCrumbs: Array<{ label: string; href?: string }> = (() => {
    if (currentPath === panelHome) return [];
    if (pageLabels[currentPath]) return [{ label: pageLabels[currentPath] }];
    const keys = Object.keys(pageLabels).filter((key) => currentPath.startsWith(key + "/"));
    const parent = keys.sort((a, b) => b.length - a.length)[0];
    if (parent) return [{ label: pageLabels[parent], href: parent }, { label: "Detay" }];
    const segment = currentPath.split("/").filter(Boolean).pop() || "Sayfa";
    let label = segment.replace(/[-_]+/gu, " ");
    try { label = decodeURIComponent(label); } catch { /* malformed URL: retain readable text */ }
    return [{ label: label.charAt(0).toLocaleUpperCase("tr-TR") + label.slice(1) }];
  })();
  const isTrainerHome = role === "TRAINER" && currentPath === "/panel/egitmen";

  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(0);
  const [topbarNotifications, setTopbarNotifications] = useState<TopbarNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationBusyId, setNotificationBusyId] = useState<string | null>(null);
  const [cart, setCart] = useState<TopbarCart>({ uniqueCount: 0, items: [] });
  const [cartOpen, setCartOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const trainerLinks = [
    ["Ana Sayfa", "/panel/egitmen"],
    ["Profilim", "/panel/egitmen/profil"],
    ["Eğitimlerim", "/panel/egitmen/egitimlerim"],
    ["Eğitmen Kaynakları", "/panel/egitmen/kaynaklarim"],
    ["Öğrencilerim", "/panel/egitmen/ogrencilerim"],
    ["Hakedişlerim", "/panel/egitmen/hakedislerim"],
  ];

  useEffect(() => {
    if (role !== "TRAINER" && role !== "STUDENT") {
      setProfilePhotoUrl(null);
      return;
    }
    let active = true;
    const endpoint = role === "STUDENT" ? "/api/student/profile" : "/api/trainer/profile";
    const refreshPhoto = () => fetch(endpoint, { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setProfilePhotoUrl(data?.profile?.photoUrl ? `${data.profile.photoUrl}?photoVersion=${encodeURIComponent(data.profile.photoStorageKey || "")}` : null);
      })
      .catch(() => {
        if (active) setProfilePhotoUrl(null);
      });
    void refreshPhoto();
    window.addEventListener("fixoku:profile-photo-updated", refreshPhoto);
    return () => { active = false; window.removeEventListener("fixoku:profile-photo-updated", refreshPhoto); };
  }, [role]);

  const profileImage = resolveProfileImage({ name: user.name, email: user.email, photoUrl: profilePhotoUrl });
  const initials = user.name
    .split(/\s+/u)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => setProfilePhotoError(false), [profileImage]);

  const Icon = role === "TRAINER" ? TrainerIcon : PanelIcon;
  const hasCommerceCart = role === "TRAINER" || role === "STUDENT";
  const studentProfileId =
    role === "STUDENT"
      ? new URLSearchParams(location.search).get("studentProfileId") || ""
      : "";

  useEffect(() => {
    let active = true;

    fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setUnread(Math.max(0, Number(data.unreadCount || 0)));
        setTopbarNotifications(Array.isArray(data.notifications) ? data.notifications.slice(0, 3) : []);
      })
      .catch(() => {
        // Bildirim sayısı yüklenemese de panel çalışmaya devam eder.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasCommerceCart) {
      setCart({ uniqueCount: 0, items: [] });
      setCartOpen(false);
      return;
    }

    let active = true;
    const studentQuery =
      role === "STUDENT" && studentProfileId
        ? `?studentProfileId=${encodeURIComponent(studentProfileId)}`
        : "";
    const endpoint =
      role === "STUDENT"
        ? `/api/student/cart${studentQuery}`
        : "/api/trainer/cart";
    const eventName =
      role === "STUDENT"
        ? "fixoku:student-cart-updated"
        : "fixoku:trainer-cart-updated";

    const load = () =>
      fetch(endpoint, {
        credentials: role === "TRAINER" ? "include" : "same-origin",
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!active || !data) return;

          const items: TopbarCartItem[] = (data.items || []).map((item: any) => ({
            id: String(item.id || item.packageVersionId),
            title: String(item.title || "Fixoku paketi"),
            packageVersionId: String(item.packageVersionId),
            priceMinor: Number(item.priceGrossMinor ?? item.priceMinor ?? 0),
            currency: String(item.currency || data.currency || "TRY"),
          }));

          setCart({
            uniqueCount: Number(data.uniqueCount ?? items.length),
            items,
          });
        })
        .catch(() => {
          if (active) setCart({ uniqueCount: 0, items: [] });
        });

    const listener = () => void load();

    void load();
    window.addEventListener(eventName, listener);

    return () => {
      active = false;
      window.removeEventListener(eventName, listener);
    };
  }, [hasCommerceCart, role, studentProfileId]);

  const removeCartItem = async (packageVersionId: string) => {
    if (!hasCommerceCart) return;

    const isStudent = role === "STUDENT";
    const response = await fetch(
      isStudent ? "/api/student/cart" : "/api/trainer/cart",
      {
        method: "DELETE",
        credentials: isStudent ? "same-origin" : "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isStudent
            ? {
                packageVersionId,
                ...(studentProfileId ? { studentProfileId } : {}),
              }
            : { packageVersionId },
        ),
      },
    );

    if (!response.ok) return;

    window.dispatchEvent(
      new CustomEvent(
        isStudent
          ? "fixoku:student-cart-updated"
          : "fixoku:trainer-cart-updated",
      ),
    );
  };

  const notificationPath = (notification: TopbarNotification) => {
    try {
      const metadata = notification.metadataJson ? JSON.parse(notification.metadataJson) : {};
      const path = typeof metadata?.path === "string" ? metadata.path : "";
      return path.startsWith("/panel/") && !path.includes("\\") && !path.includes("//") ? path : null;
    } catch {
      return null;
    }
  };

  const notificationDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR");
  };

  const markTopbarNotificationRead = async (notification: TopbarNotification, path?: string | null) => {
    if (notificationBusyId) return;
    setNotificationBusyId(notification.id);
    try {
      if (!notification.readAt) {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        });
        if (response.ok) {
          setTopbarNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
          setUnread((current) => Math.max(0, current - 1));
        }
      }
      if (path) {
        setNotificationsOpen(false);
        navigate(path);
      }
    } finally {
      setNotificationBusyId(null);
    }
  };

  const cartMoney = (minor: number, currency: string) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);

  const cartHref =
    role === "STUDENT"
      ? `/panel/ogrenci/sepet${
          studentProfileId
            ? `?studentProfileId=${encodeURIComponent(studentProfileId)}`
            : ""
        }`
      : "/panel/egitmen/sepet";

  return (
    <header className={`panel-topbar ${currentPath === "/panel/bildirimler" ? "fixoku-notifications-route-020t" : ""}`}>
      <div className="panel-topbar-title">
        <nav className="fixoku-breadcrumb-020s" aria-label="Sayfa yolu">
          {panelCrumbs.length === 0 ? (
            <>
              <strong aria-current="page">Ana Sayfa</strong>
              {isTrainerHome && (
                <span className="fixoku-trainer-greeting-020t">
                  <strong>Merhaba {user.name.trim().split(/\s+/u)[0] || "Eğitmen"} Hocam</strong>
                  <TrainerIcon name="wave" size={22} />
                </span>
              )}
            </>
          ) : (
            <>
              <Link to={panelHome}>Ana Sayfa</Link>
              {panelCrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="fixoku-breadcrumb-step-020s">
                  <TrainerIcon name="chevron-right" size={15} />
                  {crumb.href ? <Link to={crumb.href}>{crumb.label}</Link> : <strong aria-current="page">{crumb.label}</strong>}
                </span>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="panel-topbar-tools">
        {role === "TRAINER" && (
          <div className="trainer-search-wrap">
            <label className="panel-search">
              <TrainerIcon name="search" size={22} />
              <input
                type="search"
                aria-label="Panelde sayfa ara"
                placeholder="Panelde ara..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearch("");
                }}
              />
            </label>

            {search.trim() && (
              <div className="trainer-search-results">
                {trainerLinks
                  .filter(([label]) =>
                    label
                      .toLocaleLowerCase("tr-TR")
                      .includes(search.toLocaleLowerCase("tr-TR")),
                  )
                  .map(([label, href]) => (
                    <button
                      type="button"
                      key={href}
                      onClick={() => {
                        setSearch("");
                        navigate(href);
                      }}
                    >
                      {label}
                    </button>
                  ))}

                {!trainerLinks.some(([label]) =>
                  label
                    .toLocaleLowerCase("tr-TR")
                    .includes(search.toLocaleLowerCase("tr-TR")),
                ) && <p>Eşleşen sayfa yok.</p>}
              </div>
            )}
          </div>
        )}

        {hasCommerceCart && (
          <div
            className={role === "STUDENT" ? "trainer-panel" : ""}
            style={{ display: "flex", alignItems: "center", marginRight: "10px" }}
          >
            <div className="trainer-cart-topbar">
              <button
                type="button"
                className="trainer-cart-trigger"
                aria-label={`Sepet, ${cart.uniqueCount} ürün`}
                aria-expanded={cartOpen}
                onClick={() => setCartOpen((open) => !open)}
              >
                <TrainerIcon name="shopping-cart" size={25} />
                {cart.uniqueCount > 0 && (
                  <span aria-label={`${cart.uniqueCount} ürün`}>
                    {cart.uniqueCount}
                  </span>
                )}
              </button>

              {cartOpen && (
                <div className="trainer-cart-dropdown">
                  <h3>Sepetim</h3>

                  {!cart.items.length ? (
                    <p>Sepetiniz boş.</p>
                  ) : (
                    <ul>
                      {cart.items.map((item) => (
                        <li key={item.id}>
                          <span className="trainer-cart-dropdown-icon">
                            <TrainerIcon name="book" size={20} />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <small>
                              {cartMoney(item.priceMinor, item.currency)}
                            </small>
                          </div>
                          <button
                            type="button"
                            aria-label={`${item.title} paketini sepetten kaldır`}
                            onClick={() =>
                              void removeCartItem(item.packageVersionId)
                            }
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="trainer-cart-dropdown-link"
                    onClick={() => {
                      setCartOpen(false);
                      navigate(cartHref);
                    }}
                  >
                    Sepete Git
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="panel-notification-wrap">
          <button
            type="button"
            className="panel-notification"
            aria-label={`Bildirimler${unread ? `, ${unread} okunmamış` : ""}`}
            title="Bildirimleri aç"
            aria-expanded={notificationsOpen}
            aria-controls="panel-notification-popover"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Icon name="bell" size={26} />
            {unread > 0 && <span className="panel-notification-dot" aria-label={`${unread} okunmamış bildirim`} />}
          </button>
          {notificationsOpen && (
            <div id="panel-notification-popover" className="panel-notification-popover" role="dialog" aria-label="Son bildirimler">
              <div className="panel-notification-popover-head"><strong>Bildirimler</strong><span>{unread > 0 ? `${unread} okunmamış` : "Güncel"}</span></div>
              {topbarNotifications.length === 0 ? <p className="panel-notification-empty">Yeni bildiriminiz yok.</p> : <ul>
                {topbarNotifications.map((notification) => {
                  const path = notificationPath(notification);
                  return <li key={notification.id} className={!notification.readAt ? "is-unread" : ""}>
                    <button type="button" disabled={notificationBusyId === notification.id} onClick={() => void markTopbarNotificationRead(notification, path)}>
                      <strong>{notification.title}</strong>
                      <span>{notification.body}</span>
                      {notification.createdAt && <time dateTime={notification.createdAt}>{notificationDate(notification.createdAt)}</time>}
                    </button>
                  </li>;
                })}
              </ul>}
              <button type="button" className="panel-notification-all" onClick={() => { setNotificationsOpen(false); navigate("/panel/bildirimler"); }}>Tümünü Gör <span aria-hidden="true">→</span></button>
            </div>
          )}
        </div>

        <div
          className="panel-profile"
          aria-label={`${roleLabel[role]} kullanıcı hesabı`}
        >
          <div className="panel-profile-avatar" aria-hidden="true" style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profileImage && !profilePhotoError ? <img src={profileImage} alt="" onError={() => setProfilePhotoError(true)} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} /> : initials}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabel[role]}</span>
          </div>

        </div>
      </div>
    </header>
  );
}
