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
  if (response.status === 403 && data.error === "TWO_FACTOR_REQUIRED") return "needs-setup";
  if (response.status === 403) throw new Error("Bu hesap için Owner yetkisi doğrulanamadı.");
  if (response.status === 401) throw new Error("Oturum tamamlanamadı. Yeniden giriş yapın.");
  if (!response.ok) throw new Error(`Panel yetki kontrolü HTTP ${response.status} hatası verdi.`);
  if (!Array.isArray(data.roles) || !data.roles.includes("OWNER")) {
    throw new Error("Bu hesapta Owner yetkisi bulunamadı.");
  }
  return "owner";
}

function serverError(response, fallback) {
  if (response.status === 404) return "Giriş veya doğrulama API yolu bulunamadı (HTTP 404).";
  if (response.status === 429) return "Çok fazla deneme yapıldı. Bir süre bekleyin.";
  if ([400, 401].includes(response.status)) return fallback;
  return `İşlem HTTP ${response.status} hatası verdi.`;
}

export default function OwnerPrivateLogin() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("login");
  const [email, setEmail] = useState("ersin@fixoku.com");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
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
      if (!response.ok) throw new Error(serverError(response, "E-posta adresi veya şifre hatalı."));
      if (data.twoFactorRedirect === true) {
        setPassword("");
        setCode("");
        setStage("challenge");
        setMessage("Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin.");
        return;
      }
      const authority = await checkOwner();
      if (authority === "needs-setup") {
        setPassword("");
        setStage("setup");
        setMessage("Şifre kabul edildi. Owner paneli için iki aşamalı doğrulamayı etkinleştirin.");
        return;
      }
      navigate("/panel/owner", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giriş tamamlanamadı.");
    } finally {
      setWorking(false);
    }
  }

  async function startEnrollment(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const { response, data } = await postJson("/api/owner-2fa-enable", { password, method: "totp" });
      if (!response.ok) throw new Error(serverError(response, "İki aşamalı doğrulama başlatılamadı."));
      if (typeof data.totpURI !== "string" || !data.totpURI.startsWith("otpauth://")) {
        throw new Error("Doğrulama anahtarı sunucudan gelmedi. Kuruluma devam etmeyin.");
      }
      setTotpUri(data.totpURI);
      setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
      setPassword("");
      setCode("");
      setStage("enroll");
      setMessage("Telefonunuzun doğrulama uygulamasına aşağıdaki kurulum anahtarını ekleyin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kurulum başlatılamadı.");
    } finally {
      setWorking(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const { response } = await postJson("/api/owner-2fa-verify", { code: code.trim(), trustDevice: false });
      if (!response.ok) throw new Error(serverError(response, "Kod doğrulanamadı. Telefon saatinizi kontrol edip yeniden deneyin."));
      setCode("");
      if (stage === "enroll") {
        setTotpUri("");
        setStage("backup");
        setMessage("İki aşamalı doğrulama etkinleştirildi. Yedek kodları güvenli bir yere kaydedin.");
        return;
      }
      const authority = await checkOwner();
      if (authority !== "owner") throw new Error("İki aşamalı doğrulama tamamlandı ama Owner erişimi henüz açılmadı.");
      navigate("/panel/owner", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kod doğrulanamadı.");
    } finally {
      setWorking(false);
    }
  }

  async function finishEnrollment() {
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const authority = await checkOwner();
      if (authority === "owner") {
        setBackupCodes([]);
        navigate("/panel/owner", { replace: true });
        return;
      }
    } catch {
      // A new sign-in may be needed if the pre-2FA session is no longer accepted.
    } finally {
      setWorking(false);
    }
    setBackupCodes([]);
    setStage("login");
    setMessage("Kurulum tamamlandı. Şimdi şifrenizle yeniden giriş yapın; 6 haneli kod istenecek.");
  }

  let setupKey = "";
  try { if (totpUri) setupKey = new URL(totpUri).searchParams.get("secret") || ""; } catch { /* malformed URI */ }

  return <main className="fixoku-owner-login">
    <section className="fixoku-owner-login-card" aria-labelledby="owner-login-heading">
      <img className="fixoku-owner-login-logo" src="/siyah-logo-fixoku.png" alt="Fixoku" />
      <h1 id="owner-login-heading">{stage === "login" ? "Yönetici Girişi" : "İki Aşamalı Doğrulama"}</h1>
      <p className="fixoku-owner-login-motto">Güçlü yarınlar, bugün atılan adımlarla başlar.</p>

      {stage === "login" && <form onSubmit={signIn}>
        <label htmlFor="owner-private-email">E-posta
          <input id="owner-private-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label htmlFor="owner-private-password">Şifre
          <input id="owner-private-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" disabled={working}>{working ? "Doğrulanıyor..." : "Giriş Yap"}</button>
      </form>}

      {stage === "setup" && <form onSubmit={startEnrollment}>
        <p>Hesabınız doğrulandı. Güvenli Owner erişimi için telefonunuzda Google Authenticator veya Microsoft Authenticator kullanın.</p>
        <label htmlFor="owner-enrollment-password">Mevcut şifrenizi tekrar girin
          <input id="owner-enrollment-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button type="submit" disabled={working}>{working ? "Hazırlanıyor..." : "İki Aşamalı Doğrulamayı Başlat"}</button>
      </form>}

      {stage === "enroll" && <>
        <p>Telefonunuzdaki doğrulama uygulamasında <strong>Kurulum anahtarı gir</strong> seçeneğini kullanın.</p>
        <p><strong>Hesap adı:</strong> Fixoku Owner</p>
        <p><strong>Kurulum anahtarı (gizli):</strong></p>
        <code style={{ display: "block", overflowWrap: "anywhere", padding: "12px", background: "#f4f6fb", borderRadius: "8px" }}>{setupKey || "Anahtar okunamadı"}</code>
        <p><small>Zamana dayalı (TOTP), 6 hane. Bu anahtarı veya ekran görüntüsünü kimseyle paylaşmayın.</small></p>
        <form onSubmit={verifyCode}>
          <label htmlFor="owner-enrollment-code">Telefonunuzda görünen 6 haneli kod
            <input id="owner-enrollment-code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
          </label>
          <button type="submit" disabled={working || !setupKey}>{working ? "Doğrulanıyor..." : "Kodu Doğrula"}</button>
        </form>
      </>}

      {stage === "backup" && <>
        <p>İki aşamalı doğrulama etkinleştirildi. Telefonunuza ulaşamazsanız bu yedek kodlara ihtiyacınız olacak.</p>
        {backupCodes.length > 0 ? <textarea aria-label="Tek kullanımlık yedek kodlar" readOnly rows={Math.min(backupCodes.length + 1, 12)} value={backupCodes.join("\n")} style={{ width: "100%" }} /> : <p>Yedek kod dönmedi. Kurulum güvenliğini kontrol edin.</p>}
        <p><small>Kodları özel ve güvenli bir yerde saklayın. Sohbete veya ekran görüntüsüne eklemeyin.</small></p>
        <button type="button" disabled={working || backupCodes.length === 0} onClick={finishEnrollment}>Yedek Kodları Kaydettim, Devam Et</button>
      </>}

      {stage === "challenge" && <form onSubmit={verifyCode}>
        <p>Telefonunuzdaki doğrulama uygulamasında Fixoku hesabını açın.</p>
        <label htmlFor="owner-challenge-code">6 haneli doğrulama kodu
          <input id="owner-challenge-code" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <button type="submit" disabled={working}>{working ? "Doğrulanıyor..." : "Kodu Doğrula ve Panele Gir"}</button>
      </form>}

      {message && <p className="fixoku-owner-login-error" role="status">{message}</p>}
    </section>
  </main>;
}
