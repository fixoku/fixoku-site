import { Link, useLocation } from "react-router-dom";
import "./login-gateway.css";

// FIXOKU_022P_LOGIN_GATEWAY: This is navigation only. Existing sign-in flows remain untouched.
const PREVIEW_ROOT = "/images/login-gateway";

function GatewayIcon({ type }) {
  if (type === "software") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

function GatewayPreview({ src, alt, label }) {
  return (
    <figure className="fixoku-gateway-preview">
      <div className="fixoku-gateway-preview-image">
        <img src={`${PREVIEW_ROOT}/${src}`} alt={alt} loading="lazy" decoding="async" />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function LoginGatewayPage() {
  const location = useLocation();
  const platformRoute = `/egitim-platformu-girisi${location.search || ""}`;

  return (
    <main className="fixoku-login-gateway">
      <div className="fixoku-gateway-decor fixoku-gateway-decor-left" aria-hidden="true" />
      <div className="fixoku-gateway-decor fixoku-gateway-decor-right" aria-hidden="true" />
      <div className="fixoku-gateway-shell">
        <header className="fixoku-gateway-topbar">
          <Link className="fixoku-gateway-brand" to="/" aria-label="Fixoku ana sayfaya dön">
            <img src="/images/login-gateway/siyah-logo-fixoku.png" alt="Fixoku" />
          </Link>
          <Link className="fixoku-gateway-home" to="/">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></svg>
            <span>Ana Sayfaya Dön</span>
            <span aria-hidden="true">→</span>
          </Link>
        </header>

        <div className="fixoku-gateway-heading">
          <h1>Fixoku’ya <span>Hoş Geldiniz</span></h1>
          <div className="fixoku-gateway-heading-mark" aria-hidden="true" />
          <p>Yapmak istediğiniz işleme göre giriş alanınızı seçin.</p>
        </div>

        <div className="fixoku-gateway-panels">
          <section className="fixoku-gateway-card fixoku-gateway-card-purple" aria-labelledby="fixoku-gateway-software-title">
            <div className="fixoku-gateway-card-heading">
              <span className="fixoku-gateway-card-icon"><GatewayIcon type="software" /></span>
              <div>
                <h2 id="fixoku-gateway-software-title">Fixoku Yazılım Paneli</h2>
                <p>Egzersizler ve öğrenci takibi</p>
              </div>
            </div>
            <div className="fixoku-gateway-copy">
              <p><strong>Öğrenciler:</strong> Yazılıma giriş yaparak günlük egzersizlerini ve okuma çalışmalarını tamamlar.</p>
              <p><strong>Eğitmenler ve kurumlar:</strong> Kendi panellerinden öğrencilerini görüntüler ve gelişimlerini takip eder.</p>
            </div>
            <div className="fixoku-gateway-previews">
              <GatewayPreview src="software-student.webp" alt="Öğrenci okuma egzersiz ekranından örnek görünüm" label="Öğrenci Egzersiz Ekranı" />
              <GatewayPreview src="software-instructor.webp" alt="Eğitmen ve kurum yönetim panelinden örnek görünüm" label="Eğitmen ve Kurum Paneli" />
            </div>
            <a className="fixoku-gateway-cta" href="https://www.fixoku.com.tr/giris-yap">
              <span>Sayfaya Giriş Yap</span><span aria-hidden="true">→</span>
            </a>
          </section>

          <section className="fixoku-gateway-card fixoku-gateway-card-orange" aria-labelledby="fixoku-gateway-platform-title">
            <div className="fixoku-gateway-card-heading">
              <span className="fixoku-gateway-card-icon"><GatewayIcon type="platform" /></span>
              <div>
                <h2 id="fixoku-gateway-platform-title">Fixoku Eğitim Platformu Paneli</h2>
                <p>Eğitim kaynakları ve eğitmen iletişimi</p>
              </div>
            </div>
            <div className="fixoku-gateway-copy">
              <p><strong>Eğitmenler:</strong> Müfredatlara, eğitmen eğitimi videolarına, sunumlara ve kendilerine atanan öğrencilere ulaşır.</p>
              <p><strong>Öğrenciler:</strong> Eğitmenleriyle iletişim kurabilir, profilini inceleyebilir ve eğitim süreçlerini takip edebilir.</p>
            </div>
            <div className="fixoku-gateway-previews">
              <GatewayPreview src="platform-instructor.webp" alt="Fixoku eğitmen panelinden kişisel bilgi içermeyen örnek ekran" label="Eğitmen Paneli" />
              <GatewayPreview src="platform-roles.webp" alt="Öğrenciyim ve Eğitmenim seçeneklerinin yer aldığı giriş ekranı" label="Öğrenci ve Eğitmen Girişi" />
            </div>
            <Link className="fixoku-gateway-cta" to={platformRoute}>
              <span>Sayfaya Giriş Yap</span><span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
