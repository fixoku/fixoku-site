import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DEMO_IDENTITIES, localReviewEnabled } from "./local-review-data.js";
import "./Giris.css";
import "./auth-unified-v4.css";

function CardIcon({ kind }) {
  return kind === "student" ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6c-2.6-2-5.4-2.1-9-1v14c3.7-1 6.9-.7 9 1 2.1-1.7 5.3-2 9-1V5c-3.6-1.1-6.4-1-9 1Z"/><path d="M12 6v14"/></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.3V16c3 2.9 9 2.9 12 0v-4.7"/><path d="M22 9v7"/></svg>
  );
}

export default function Giris() {
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLocal = localReviewEnabled();
  const returnTo = new URLSearchParams(location.search).get("returnTo");
  const rolePath = (path) => returnTo ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path;
  async function quickLogin(slug) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/local-review/switch-user", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Yerel test girişi kullanılamıyor.");
      navigate(result.redirect || "/panel", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Yerel test girişi kullanılamıyor.");
    } finally { setBusy(false); }
  }
  return (
    <main className="fixu-chooser-page">
      <section className="fixu-chooser" aria-labelledby="fixu-welcome-heading">
        <img className="fixu-chooser-logo" src="/siyah-logo-fixoku.png" alt="Fixoku - Okuyan, Anlayan, Gelişen Nesiller" />
        <h1 id="fixu-welcome-heading">Fixoku'ya hoş geldiniz</h1>
        <p className="fixu-chooser-lead">Devam etmek için size uygun giriş alanını seçin.</p>
        <div className="fixu-role-options">
          <Link className="fixu-role-option" to={rolePath("/ogrenci-girisi")}>
            <span className="fixu-role-graphic fixu-role-graphic-student"><CardIcon kind="student" /></span>
            <strong>Öğrenciyim</strong>
            <span>Eğitimlerim, paketlerim ve öğrenme yolculuğum için.</span>
            <b>Öğrenci alanına geç <span aria-hidden="true">→</span></b>
          </Link>
          <Link className="fixu-role-option" to={rolePath("/ogretmen-girisi")}>
            <span className="fixu-role-graphic fixu-role-graphic-trainer"><CardIcon kind="trainer" /></span>
            <strong>Eğitmenim</strong>
            <span>Eğitimlerimi ve öğrenci süreçlerimi yönetmek için.</span>
            <b>Eğitmen alanına geç <span aria-hidden="true">→</span></b>
          </Link>
        </div>
        <div className="fixu-chooser-notice">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="#15965c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 20 5.5V12c0 5.2-3.6 8.2-8 10-4.4-1.8-8-4.8-8-10V5.5L12 2Z"/><path d="m8.4 12.4 2.3 2.3 5-5"/></svg>
          <span>Seçiminiz size uygun giriş ekranını gösterir; panel erişimi hesabınızdaki role göre belirlenir.</span>
        </div>
      </section>
      {isLocal && <details className="fixu-local-review">
        <summary>Yerel inceleme hesabıyla giriş</summary>
        <div className="fixu-local-review-grid">{DEMO_IDENTITIES.map((identity) => <button type="button" key={identity.slug} onClick={() => void quickLogin(identity.slug)} disabled={busy}>{identity.name} <small>{identity.roleLabel}</small></button>)}</div>
        {error && <p role="alert">{error}</p>}
      </details>}
    </main>
  );
}
