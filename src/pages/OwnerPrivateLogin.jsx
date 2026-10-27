import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./owner-private-login.css";

const OWNER_CONTEXT = "/api/panel-context?panel=%2Fpanel%2Fowner";

async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function checkOwner() {
  const response = await fetch(OWNER_CONTEXT, { credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403 && data.error === "TWO_FACTOR_REQUIRED") throw new Error("Owner giriş yapılandırması 2FA nedeniyle reddedildi.");
  if (response.status === 403 && data.error === "FORBIDDEN") throw new Error("OWNER_MEMBERSHIP_FORBIDDEN");
  if (response.status === 403) throw new Error("OWNER_MEMBERSHIP_REQUIRED");
  if (response.status === 401) throw new Error("Oturum tamamlanamadı. Yeniden giriş yapın.");
  if (!response.ok) throw new Error(`Panel yetki kontrolü HTTP ${response.status} hatası verdi.`);
  if (!Array.isArray(data.roles) || !data.roles.includes("OWNER")) {
    throw new Error("Bu hesapta Owner yetkisi bulunamadı.");
  }
}

function serverError(response, yedek, data = {}) {
  if (response.status === 404) return "Giriş veya doğrulama API yolu bulunamadı (HTTP 404).";
  if (response.status === 429) return "Çok fazla deneme yapıldı. Bir süre bekleyin.";
  if (response.status === 403 && data.error === "OWNER_MEMBERSHIP_REQUIRED") return "OWNER_MEMBERSHIP_REQUIRED";
  if ([400, 401].includes(response.status)) return yedek;
  return `İşlem HTTP ${response.status} hatası verdi.`;
}

export default function OwnerPrivateLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ersin@fixoku.com");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const { response, data } = await postJson("/api/owner-sign-in", {
        email: email.trim().toLowerCase(), password,
      });
      if (!response.ok) throw new Error(serverError(response, "E-posta adresi veya şifre hatalı.", data));
      // Better Auth owns password verification, rate limits, CSRF and the
      // session cookie. The second request is the server-side OWNER gate.
      await checkOwner();
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

      <form onSubmit={signIn}>
        <label htmlFor="owner-private-email">E-posta
          <input id="owner-private-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label htmlFor="owner-private-password">Şifre
          <input id="owner-private-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" disabled={working}>{working ? "Doğrulanıyor..." : "Giriş Yap"}</button>
      </form>

      {message && <p className="fixoku-owner-login-error" role="status">{message}</p>}
    </section>
  </main>;
}
