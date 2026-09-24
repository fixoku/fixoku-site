import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

  const panelTitle =
    role === "OWNER" || role === "ADMIN"
      ? "Yönetici Paneli"
      : role === "STUDENT" || location.pathname.startsWith("/panel/ogrenci")
        ? "Öğrenci Paneli"
        : "Eğitmen Paneli";

  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState(0);
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
    if (role !== "TRAINER") {
      setProfilePhotoUrl(null);
      return;
    }
    let active = true;
    fetch("/api/trainer/profile", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setProfilePhotoUrl(data?.profile?.photoUrl || null);
      })
      .catch(() => {
        if (active) setProfilePhotoUrl(null);
      });
    return () => { active = false; };
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

    fetch("/api/notifications", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setUnread(Number(data.unreadCount || 0));
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
    <header className="panel-topbar">
      <div className="panel-topbar-title">
        <h1>{panelTitle}</h1>
        <p>Bilgi paylaşır, geleceği birlikte inşa ederiz.</p>
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

        <button
          type="button"
          className="panel-notification"
          aria-label={`Bildirimler${unread ? `, ${unread} okunmamış` : ""}`}
          title="Bildirim merkezini aç"
          onClick={() => navigate("/panel/bildirimler")}
        >
          <Icon name="bell" size={26} />
          {unread > 0 && (
            <span
              className="panel-notification-dot"
              aria-label={`${unread} okunmamış bildirim`}
            />
          )}
        </button>

        <div
          className="panel-profile"
          aria-label={`${panelTitle} kullanıcı hesabı`}
        >
          <div className="panel-profile-avatar" aria-hidden="true">
            {profileImage && !profilePhotoError ? <img src={profileImage} alt="" onError={() => setProfilePhotoError(true)} /> : initials}
          </div>
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
