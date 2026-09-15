import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./Giris.css";
import { DEMO_IDENTITIES, localReviewEnabled } from "./local-review-data.js";

export default function Giris() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const isLocal = localReviewEnabled();
  async function quickLogin(slug) { setStatus("loading"); setError(""); try { const response = await fetch("/api/local-review/switch-user", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error("Yerel test girişi kullanılamıyor."); navigate(result.redirect || "/panel", { replace: true }); } catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Yerel test girişi kullanılamıyor."); } }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", origin: window.location.origin }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error(response.status === 401 ? "E-posta veya şifre hatalı." : "Giriş şu anda tamamlanamadı.");
      const contextResponse = await fetch("/api/panel-context", { credentials: "same-origin" });
      if (!contextResponse.ok) throw new Error("Oturum doğrulanamadı.");
      const context = await contextResponse.json();
      navigate(context.destination || "/panel", { replace: true });
    } catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Giriş şu anda tamamlanamadı."); }
  }

  return <main className="fixoku-login-page"><form className="fixoku-login-card" onSubmit={handleSubmit} noValidate aria-describedby={error ? "login-error" : undefined}><div className="fixoku-login-logo"><img src="/siyah-logo-fixoku.png" alt="Fixoku" /></div><h1>Panele giriş yap</h1><p>Hesabınızla güvenli şekilde devam edin.</p>{isLocal && <section className="local-dev-login" aria-labelledby="local-dev-login-title"><h2 id="local-dev-login-title">Yerel inceleme</h2><p>Bir kullanıcı seçin; şifre veya e-posta girmeniz gerekmez.</p>{DEMO_IDENTITIES.map((identity) => <button type="button" key={identity.slug} onClick={() => quickLogin(identity.slug)} disabled={status === "loading"}>{identity.name}<small>{identity.roleLabel}</small></button>)}</section>}<div className="local-login-technical"><label htmlFor="login-email">E-posta</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="login-password">Şifre</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="submit" disabled={status === "loading"}>{status === "loading" ? "Giriş yapılıyor…" : "Giriş Yap"}</button></div>{error && <p id="login-error" role="alert">{error}</p>}<Link className="fixoku-login-recovery" to="/sifremi-unuttum">Şifremi unuttum</Link></form></main>;
}
