import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./local-review-hub.css";
import { DEMO_IDENTITIES, localReviewEnabled } from "./local-review-data.js";

function getReviewGroups() {
  const groups = [
    { label: "Yönetim", roles: ["OWNER", "SUPER_ADMIN"] },
    { label: "Eğitmenler", roles: ["TRAINER"] },
    { label: "Öğrenciler", roles: ["STUDENT"] },
  ];
  return groups.map((group) => ({
    label: group.label,
    identities: DEMO_IDENTITIES.filter((identity) => group.roles.includes(identity.role)),
  }));
}

function IdentityAvatar({ identity, current }) {
  const possible = [
    identity.profilePhotoUrl, identity.profileImageUrl, identity.avatarUrl,
    identity.photoUrl, identity.imageUrl, identity.avatar, identity.photo,
    current?.slug === identity.slug ? current.profilePhotoUrl : null,
    current?.slug === identity.slug ? current.avatarUrl : null,
  ];
  const avatarUrl = possible.find((url) => typeof url === "string" && /^(\/|https:\/\/)/.test(url.trim()));
  const [imageFailed, setImageFailed] = useState(false);
  return <span className="review-six-avatar" aria-hidden="true">
    {avatarUrl && !imageFailed
      ? <img src={avatarUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
      : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" focusable="false" aria-hidden="true"><circle cx="32" cy="24" r="12" fill="currentColor" opacity=".9"/><path d="M12 53c0-11 9-19 20-19s20 8 20 19v3H12v-3Z" fill="currentColor" opacity=".75"/></svg>}
  </span>;
}

function IdentityCard({ identity, current, busy, onSelect }) {
  const active = current?.slug === identity.slug;
  return <button
    type="button"
    className={`review-six-card ${active ? "is-active" : ""}`}
    aria-pressed={active}
    disabled={busy}
    onClick={() => onSelect(identity)}
  >
    <IdentityAvatar identity={identity} current={current} />
    <span className="review-six-card-copy"><strong>{identity.name}</strong><small>{identity.roleLabel}</small></span>
    <span className="review-six-card-action">{active ? "Aktif hesap" : "Panele Gir"}<span aria-hidden="true">→</span></span>
  </button>;
}
export default function LocalReviewHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCurrent = useCallback(async () => {
    try {
      const response = await fetch("/api/panel-context", { credentials: "include", cache: "no-store" });
      if (!response.ok) { setCurrent(null); return; }
      const context = await response.json();
      const match = DEMO_IDENTITIES.find((identity) => identity.name === context.user?.name || identity.slug === context.user?.reviewSlug);
      setCurrent({ ...(match || {}), name: context.user?.name || match?.name || "", role: context.roles?.[0] || match?.role || "" });
    } catch { setCurrent(null); }
  }, []);
  useEffect(() => { void loadCurrent(); }, [loadCurrent, location.key]);

  const selectIdentity = useCallback(async (identity) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local-review/switch-user", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: identity.slug }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.error === "LOCAL_REVIEW_DISABLED") throw new Error("Yerel inceleme bu ortamda etkin değil.");
        const reason = typeof result.error === "string" && result.error ? ` (${result.error})` : ` (HTTP ${response.status})`;
        throw new Error(`Kullanıcı değiştirilemedi${reason}.`);
      }
      const target = result.redirect || (identity.role === "OWNER" ? "/panel/owner" : identity.role === "TRAINER" ? "/panel/egitmen" : "/panel/ogrenci");
      const contextResponse = await fetch(`/api/panel-context?panel=${encodeURIComponent(target)}`, { credentials: "include", cache: "no-store" });
      const context = await contextResponse.json().catch(() => ({}));
      if (!contextResponse.ok || context.authenticated !== true || context.user?.name !== identity.name || !context.roles?.includes(identity.role)) throw new Error("Gerçek oturum doğrulanamadı.");
      setCurrent(identity);
      navigate(target, { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kullanıcı değiştirilemedi."); }
    finally { setBusy(false); }
  }, [navigate]);

  if (!localReviewEnabled()) {
    return <main className="local-review-unavailable"><h1>Sayfa bulunamadı</h1><p>Yerel inceleme yalnızca geliştirme ortamında kullanılabilir.</p></main>;
  }
  return <main className="local-review-page review-six-page">
    <div className="local-review-shell review-six-shell">
      <header className="review-six-header"><h1>Fixoku Yerel İnceleme</h1></header>
      {error && <p className="local-review-error" role="alert">{error}</p>}
      <div className="review-six-groups">
        {getReviewGroups().map((group) => <section key={group.label} className="review-six-group" aria-label={group.label}>
          <h2>{group.label}</h2>
          <div className="review-six-row">
            {group.identities.map((identity) => <IdentityCard
              key={identity.slug}
              identity={identity}
              current={current}
              busy={busy}
              onSelect={selectIdentity}
            />)}
          </div>
        </section>)}
      </div>
    </div>
  </main>;
}
