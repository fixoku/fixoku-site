import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Giris.css";

export default function Giris() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

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

  return <main className="fixoku-login-page"><form className="fixoku-login-card" onSubmit={handleSubmit} noValidate aria-describedby={error ? "login-error" : undefined}><div className="fixoku-login-logo"><img src="/siyah-logo-fixoku.png" alt="Fixoku" /></div><h1>Panele giriş yap</h1><p>Hesabınızla güvenli şekilde devam edin.</p><label htmlFor="login-email">E-posta</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="login-password">Şifre</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="submit" disabled={status === "loading"}>{status === "loading" ? "Giriş yapılıyor…" : "Giriş Yap"}</button>{error && <p id="login-error" role="alert">{error}</p>}<button className="fixoku-login-recovery" type="button" onClick={() => setError("Şifre yenileme bağlantısı yakında etkinleştirilecek.")}>Şifremi unuttum</button></form></main>;
}
