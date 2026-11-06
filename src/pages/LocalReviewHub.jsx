import { useNavigate } from "react-router-dom";
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

function routeFor(identity) {
  if (identity.role === "OWNER") return "/yerel-inceleme/owner";
  if (identity.role === "SUPER_ADMIN") return "/yerel-inceleme/admin";
  if (identity.role === "TRAINER") return "/yerel-inceleme/trainer";
  return "/yerel-inceleme/student";
}

function IdentityAvatar() {
  return <span className="review-six-avatar" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" focusable="false" aria-hidden="true"><circle cx="32" cy="24" r="12" fill="currentColor" opacity=".9"/><path d="M12 53c0-11 9-19 20-19s20 8 20 19v3H12v-3Z" fill="currentColor" opacity=".75"/></svg>
  </span>;
}

function IdentityCard({ identity, onSelect }) {
  return <button
    type="button"
    className="review-six-card"
    onClick={() => onSelect(identity)}
  >
    <IdentityAvatar identity={identity} />
    <span className="review-six-card-copy"><strong>{identity.name}</strong><small>{identity.roleLabel}</small></span>
    <span className="review-six-card-action">Önizlemeyi Aç<span aria-hidden="true">→</span></span>
  </button>;
}

export default function LocalReviewHub() {
  const navigate = useNavigate();

  if (!localReviewEnabled()) {
    return <main className="local-review-unavailable"><h1>Sayfa bulunamadı</h1><p>Yerel inceleme yalnızca geliştirme ortamında kullanılabilir.</p></main>;
  }

  const selectIdentity = (identity) => {
    const target = routeFor(identity);
    navigate(`${target}?identity=${encodeURIComponent(identity.slug)}`);
  };

  return <main className="local-review-page review-six-page">
    <div className="local-review-shell review-six-shell">
      <header className="review-six-header">
        <h1>Fixoku Yerel İnceleme</h1>
        <p style={{ margin: "8px 0 0", color: "#5f6f84" }}>Bu sürüm salt-okunur görsel önizleme açar. Gerçek kullanıcı oturumu oluşturmaz.</p>
      </header>
      <div className="review-six-groups">
        {getReviewGroups().map((group) => <section key={group.label} className="review-six-group" aria-label={group.label}>
          <h2>{group.label}</h2>
          <div className="review-six-row">
            {group.identities.map((identity) => <IdentityCard key={identity.slug} identity={identity} onSelect={selectIdentity} />)}
          </div>
        </section>)}
      </div>
    </div>
  </main>;
}
