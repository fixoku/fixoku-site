import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./owner-private-login.css";

// A distinct visual entry does not replace server-side owner authorization.
export default function OwnerPrivateLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ersin@fixoku.com");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", origin: window.location.origin },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!response.ok) throw new Error("E-posta adresi veya şifre hatalı.");
      const check = await fetch("/api/panel-context?panel=%2Fpanel%2Fowner", {
        credentials: "same-origin", cache: "no-store",
      });
      if (check.status === 403) throw new Error("Owner yetkisi veya iki adımlı doğrulama gerekiyor.");
      if (!check.ok) throw new Error("Yönetici oturumu doğrulanamadı.");
      const context = await check.json();
      if (!Array.isArray(context.roles) || !context.roles.includes("OWNER")) {
        throw new Error("Bu hesap için Owner yetkisi bulunamadı.");
      }
      navigate("/panel/owner", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giriş tamamlanamadı.");
    } finally {
      setWorking(false);
    }
  }
  return <main className="fixoku-owner-login">
    <section className="fixoku-owner-login-card" aria-labelledby="owner-login-heading">
      <img className="fixoku-owner-login-logo" src="/siyah-logo-fixoku.png" alt="Fixoku" />
      <h1 id="owner-login-heading">Yönetici Girişi</h1>
      <p className="fixoku-owner-login-motto">Güçlü yarınlar, bugün atılan adımlarla başlar.</p>
      <form onSubmit={submit}>
        <label htmlFor="owner-private-email">E-posta
          <input id="owner-private-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label htmlFor="owner-private-password">Şifre
          <input id="owner-private-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={working}>{working ? "Doğrulanıyor…" : "Giriş Yap"}</button>
        {message && <p className="fixoku-owner-login-error" role="alert">{message}</p>}
      </form>
    </section>
  </main>;
}
