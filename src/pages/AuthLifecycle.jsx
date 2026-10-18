import { useEffect, useRef, useState } from "react";
import { TURKEY_LOCATIONS, getTurkeyDistricts } from "../data/turkeyLocations.js";
import { pushEvent } from "../martech/events.js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Giris.css";
import "./auth-lifecycle.css";
import "./auth-unified-v4.css";

const roles = {
  STUDENT: { title: "Öğrenci Girişi", register: "/ogrenci-kayit" },
  TRAINER: { title: "Eğitmen Girişi", register: "/ogretmen-basvuru" },
  ADMIN: { title: "Yönetici Girişi" },
  OWNER: { title: "Sistem Sahibi Girişi" },
};
function safeReturnTo(value) {
  const candidate = String(value || "");
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "";
  try {
    const parsed = new URL(candidate, "http://fixoku.local");
    return parsed.origin === "http://fixoku.local" && parsed.pathname.startsWith("/panel/")
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "";
  } catch { return ""; }
}
function AuthRoleIcon({ trainer }) {
  return trainer ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.3V16c3 2.9 9 2.9 12 0v-4.7"/><path d="M22 9v7"/></svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6c-2.6-2-5.4-2.1-9-1v14c3.7-1 6.9-.7 9 1 2.1-1.7 5.3-2 9-1V5c-3.6-1.1-6.4-1-9 1Z"/><path d="M12 6v14"/></svg>
  );
}

function Shell({ title, description, children }) {
  const location = useLocation();
  const path = location.pathname;
  const unified = ["/ogrenci-girisi", "/ogretmen-girisi", "/ogrenci-kayit", "/ogretmen-basvuru", "/sifremi-unuttum", "/sifre-sifirla"].includes(path);
  if (!unified) return <main className="fixoku-login-page auth-lifecycle-page"><section className="fixoku-login-card auth-lifecycle-card"><div className="fixoku-login-logo"><img src="/siyah-logo-fixoku.png" alt="Fixoku" /></div><h1>{title}</h1>{description && <p>{description}</p>}{children}</section></main>;
  const trainer = path === "/ogretmen-girisi" || path === "/ogretmen-basvuru" || new URLSearchParams(location.search).get("alan") === "egitmen";
  const loginPath = trainer ? "/ogretmen-girisi" : "/ogrenci-girisi";
  const registerPath = trainer ? "/ogretmen-basvuru" : "/ogrenci-kayit";
  const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));
  const withReturnTo = (target) => returnTo ? `${target}?returnTo=${encodeURIComponent(returnTo)}` : target;
  const isRegistration = path === "/ogrenci-kayit" || path === "/ogretmen-basvuru";

  return <main className="fixoku-login-page auth-lifecycle-page fixu-page">
    <section className="fixu-layout" aria-label="Fixoku güvenli giriş ve üyelik merkezi">
      <aside className="fixu-aside">
        <img className="fixu-aside-logo" src="/fixoku-giris-beyaz-logo.png" alt="Fixoku - Okuyan, Anlayan, Gelişen Nesiller" />
        <div className="fixu-aside-role"><span className="fixu-aside-icon"><AuthRoleIcon trainer={trainer} /></span><strong>{trainer ? "Eğitmen alanı" : "Öğrenci alanı"}</strong></div>
        <h2>{trainer ? "Eğitim süreçlerinizi tek merkezden yönetin." : "Derslerinizi, paketlerinizi ve gelişiminizi tek yerden takip edin."}</h2>
        <p>{trainer ? "Öğrencilerinizi, atamalarınızı ve uzmanlık alanlarınızı kolayca yönetin." : "Öğrenci panelinizden tüm eğitim sürecinizi kolayca yönetin."}</p>
        <div className="fixu-aside-footer"><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 2 8 4v6c0 5-3 8.5-8 10-5-1.5-8-5-8-10V6l8-4Z"/><path d="m8 12 3 3 5-6"/></svg> Güvenli {trainer ? "eğitmen" : "öğrenci"} deneyimi</div>
      </aside>
      <div className="fixu-content">
        <header className="fixu-auth-header"><Link to={withReturnTo("/giris")} className="fixu-back">‹&nbsp; Giriş türünü değiştir</Link><span className={trainer ? "fixu-kind fixu-kind-trainer" : "fixu-kind fixu-kind-student"}>{trainer ? "Eğitmen alanı" : "Öğrenci alanı"}</span></header>
        <nav className="fixu-tabs" aria-label="Hesap işlemleri"><Link className={!isRegistration ? "active" : ""} to={withReturnTo(loginPath)}>Giriş Yap</Link><Link className={isRegistration ? "active" : ""} to={withReturnTo(registerPath)}>{trainer ? "Başvuru Yap" : "Kayıt Ol"}</Link></nav>
        <div className="fixu-form-area"><h1>{title}</h1>{description && <p className="fixu-description">{description}</p>}{children}</div>
      </div>
    </section>
  </main>;
}
const Message = ({ children, error = false }) => children ? <p className={error ? "auth-error" : "auth-message"} role={error ? "alert" : "status"}>{children}</p> : null;

export function RoleLoginPage({ role = "STUDENT" }) {
  const copy = roles[role] || roles.STUDENT; const navigate = useNavigate(); const location = useLocation();
  const returnTo = safeReturnTo(new URLSearchParams(location.search).get("returnTo"));
  const withReturnTo = (target) => returnTo ? `${target}?returnTo=${encodeURIComponent(returnTo)}` : target;
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/platform-sign-in", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", origin: window.location.origin }, body: JSON.stringify({ email: email.trim(), password }) });
      if (!response.ok) throw new Error(response.status === 401 ? "E-posta veya parola hatalı." : "Giriş tamamlanamadı.");
      const contextResponse = await fetch("/api/panel-context", { credentials: "same-origin" });
      if (!contextResponse.ok && role === "TRAINER") {
        const candidate = await fetch("/api/trainer-candidate?action=profile", { credentials: "same-origin", cache: "no-store" });
        if (candidate.ok) { navigate("/panel/egitmen-aday", { replace: true }); return; }
      }
      if (!contextResponse.ok) throw new Error("Oturum doğrulanamadı.");
      const context = await contextResponse.json(); const fallbackDestination = context.destination || context.destinations?.[0] || "/panel"; const destination = returnTo || fallbackDestination;
      const expected = role === "ADMIN" ? ["OWNER", "SUPER_ADMIN"] : [role];
      if (!context.roles?.some((item) => expected.includes(item))) { setError("Bu hesap seçtiğiniz giriş alanına ait değil. Yetkili panele yönlendiriliyorsunuz."); setTimeout(() => navigate(fallbackDestination, { replace: true }), 900); return; }
      navigate(destination, { replace: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Giriş tamamlanamadı."); } finally { setBusy(false); }
  }
  return <Shell title={copy.title} description="Hesabınızla güvenli şekilde devam edin.">
    <form onSubmit={submit} noValidate>
      <label htmlFor="role-email">E-posta adresi<input id="role-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label htmlFor="role-password">Parola<div className="fixu-password-control"><input id="role-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}>{showPassword ? "Gizle" : "Göster"}</button></div></label>
    <div className="fixu-forgot-link"><Link to={role === "TRAINER" ? "/sifremi-unuttum?alan=egitmen" : "/sifremi-unuttum?alan=ogrenci"}>Şifremi unuttum</Link></div>
      <button type="submit" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş Yap →"}</button>
      <Message error>{error}</Message>
    </form>
    <nav className="auth-links" aria-label="Hesap bağlantıları"><span>{role === "STUDENT" ? "Henüz hesabınız yok mu?" : "Eğitmen hesabınız yok mu?"}</span>{copy.register && <Link to={withReturnTo(copy.register)}>{role === "STUDENT" ? "Hesap oluştur" : "Eğitmen başvurusu yap"}</Link>}{role !== "STUDENT" && role !== "TRAINER" && <Link to={withReturnTo("/giris")}>Diğer giriş seçenekleri</Link>}</nav>
  </Shell>;
}

const educationStages = [
  { value: "PRIMARY", label: "İlkokul Öğrencisi", grades: [3, 4] },
  { value: "MIDDLE", label: "Ortaokul Öğrencisi", grades: [5, 6, 7, 8] },
  { value: "HIGH", label: "Lise Öğrencisi", grades: [9, 10, 11, 12] },
  { value: "ADULT", label: "Yetişkin", grades: [] },
];

function normalizeMobileInput(value) {
  return String(value || "").replace(/\D/gu, "").slice(0, 10);
}

export function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    dateOfBirth: "",
    educationStage: "",
    grade: "",
    school: "",
    city: "",
    district: "",
    addressLine: "",
    terms: false,
    kvkk: false,
    marketingConsent: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedStage = educationStages.find((item) => item.value === form.educationStage);
  const selectedDistricts = getTurkeyDistricts(form.city);

  const update = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => {
      if (key === "educationStage") {
        const adult = value === "ADULT";
        return { ...current, educationStage: value, grade: "", ...(adult ? { school: "" } : {}) };
      }
      if (key === "phone") return { ...current, phone: normalizeMobileInput(value) };
      return { ...current, [key]: value };
    });
  };

  async function submit(event) {
    event.preventDefault();
    if (!form.terms || !form.kvkk) {
      setError("Üyelik koşullarını ve KVKK aydınlatma metnini kabul etmeniz gerekir.");
      return;
    }
    if (!/^5\d{9}$/u.test(form.phone)) {
      setError("Telefon numarası 5 ile başlayan 10 haneli Türkiye cep telefonu olmalıdır.");
      return;
    }
    if (form.educationStage !== "ADULT" && !form.school.trim()) {
      setError("Okulunuzun adını yazın.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account-lifecycle/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", origin: window.location.origin },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || (response.status === 422 ? "Bu e-posta ile zaten bir hesap olabilir." : "Kayıt tamamlanamadı."));
      }
      navigate("/e-posta-dogrula", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kayıt tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  return <Shell title="Öğrenci Kaydı" description="Hesabınızı oluşturun; size uygun paketler seçtiğiniz gruba ve sınıfa göre otomatik gösterilir.">
    <form className="auth-registration-form" onSubmit={submit} noValidate>
      <label htmlFor="student-firstName">Ad<input id="student-firstName" value={form.firstName} onChange={update("firstName")} required /></label>
      <label htmlFor="student-lastName">Soyad<input id="student-lastName" value={form.lastName} onChange={update("lastName")} required /></label>
      <label htmlFor="student-email">E-posta<input id="student-email" type="email" value={form.email} onChange={update("email")} required /></label>

      <label htmlFor="student-phone">Telefon
        <div className="auth-phone-input">
          <span>+90</span>
          <input id="student-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="5[0-9]{9}" placeholder="5XXXXXXXXX" value={form.phone} onChange={update("phone")} required />
        </div>
      </label>

      <label htmlFor="student-password">Parola<input id="student-password" type="password" minLength={8} value={form.password} onChange={update("password")} required /></label>
      <label htmlFor="student-dateOfBirth">Doğum tarihi<input id="student-dateOfBirth" type="date" value={form.dateOfBirth} onChange={update("dateOfBirth")} /></label>

      <label htmlFor="student-education-stage">Size uygun paket grubunu seçin
        <select id="student-education-stage" value={form.educationStage} onChange={update("educationStage")} required>
          <option value="">Seçin</option>
          {educationStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
        <small>Size doğru paketleri gösterebilmemiz için mevcut durumunuzu seçin.</small>
      </label>

      {selectedStage && selectedStage.value !== "ADULT" && <>
        <label htmlFor="student-grade">Sınıf
          <select id="student-grade" value={form.grade} onChange={update("grade")} required>
            <option value="">Seçin</option>
            {selectedStage.grades.map((grade) => <option key={grade} value={String(grade)}>{grade}. Sınıf</option>)}
          </select>
        </label>
        <label htmlFor="student-school">Okulunuzun adı
          <input id="student-school" value={form.school} onChange={update("school")} placeholder="Okulunuzun adı" required />
        </label>
      </>}

      <label htmlFor="student-city">İl
        <select
          id="student-city"
          value={form.city}
          onChange={(event) => setForm((current) => ({ ...current, city: event.target.value, district: "" }))}
          required
        >
          <option value="">İl seçin</option>
          {TURKEY_LOCATIONS.map((province) => <option key={province.plate} value={province.name}>{province.name}</option>)}
        </select>
      </label>

      <label htmlFor="student-district">İlçe
        <select id="student-district" value={form.district} onChange={update("district")} disabled={!form.city} required>
          <option value="">{form.city ? "İlçe seçin" : "Önce il seçin"}</option>
          {selectedDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </label>
      <label htmlFor="student-addressLine">Adres<input id="student-addressLine" value={form.addressLine} onChange={update("addressLine")} /></label>

      <label className="auth-check"><input type="checkbox" checked={form.terms} onChange={update("terms")} />Üyelik ve kullanım koşullarını kabul ediyorum.</label>
      <label className="auth-check"><input type="checkbox" checked={form.kvkk} onChange={update("kvkk")} />KVKK aydınlatma metnini okudum.</label>
      <label className="auth-check"><input type="checkbox" checked={form.marketingConsent} onChange={update("marketingConsent")} />Kampanya ve duyuruları almak istiyorum (isteğe bağlı).</label>

      <button type="submit" disabled={busy}>{busy ? "Hesap oluşturuluyor…" : "Öğrenci hesabı oluştur"}</button>
      <Message error>{error}</Message>
    </form>
    <p className="auth-secondary-link">Zaten hesabınız var mı? <Link to="/ogrenci-girisi">Öğrenci girişine dönün</Link></p>
  </Shell>;
}
export function PasswordForgotPage() { const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); async function submit(e) { e.preventDefault(); setBusy(true); try { const response = await fetch("/api/auth/request-password-reset", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", origin: window.location.origin }, body: JSON.stringify({ email: email.trim(), redirectTo: "/sifre-sifirla" }) }); setMessage(response.ok ? "Eğer bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi." : "İstek şu anda tamamlanamadı."); } catch { setMessage("İstek şu anda tamamlanamadı."); } finally { setBusy(false); } } return <Shell title="Parolamı Unuttum" description="Hesabınıza ait e-posta adresini yazın."><form onSubmit={submit} noValidate><label htmlFor="forgot-email">E-posta<input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><button type="submit" disabled={busy}>{busy ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}</button><Message>{message}</Message></form><p className="auth-secondary-link"><Link to="/giris">Giriş sayfasına dönün</Link></p></Shell>; }

export function PasswordResetPage() { const location = useLocation(); const navigate = useNavigate(); const token = new URLSearchParams(location.search).get("token") || ""; const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); async function submit(e) { e.preventDefault(); if (!token) return setMessage("Sıfırlama bağlantısı eksik veya geçersiz."); if (password.length < 8 || password !== confirm) return setMessage("Parola en az 8 karakter olmalı ve iki alan eşleşmelidir."); setBusy(true); try { const response = await fetch("/api/auth/reset-password", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", origin: window.location.origin }, body: JSON.stringify({ token, newPassword: password }) }); if (!response.ok) throw new Error("Sıfırlama bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış."); setMessage("Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz."); setTimeout(() => navigate("/giris", { replace: true }), 900); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Parola yenilenemedi."); } finally { setBusy(false); } } return <Shell title="Yeni Parola Belirle" description="Güvenliğiniz için yeni ve benzersiz bir parola seçin."><form onSubmit={submit} noValidate><label htmlFor="reset-password">Yeni parola<input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label htmlFor="reset-confirm">Yeni parola (tekrar)<input id="reset-confirm" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label><button type="submit" disabled={busy}>{busy ? "Parola yenileniyor…" : "Parolayı yenile"}</button><Message>{message}</Message></form></Shell>; }

export function EmailVerificationPage() { const location = useLocation(); const navigate = useNavigate(); const token = new URLSearchParams(location.search).get("token") || ""; const [message, setMessage] = useState(token ? "E-posta adresiniz doğrulanıyor…" : "E-posta adresinizi doğrulamak için gelen bağlantıyı açın."); useEffect(() => { if (!token) return; let active = true; fetch("/api/auth/verify-email?token="+encodeURIComponent(token)+"&callbackURL=%2Fpanel", { credentials: "same-origin" }).then((r) => { if (!active) return; setMessage(r.ok ? "E-posta adresiniz doğrulandı. Panelinize yönlendiriliyorsunuz." : "Doğrulama bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış."); if (r.ok) setTimeout(() => navigate("/panel", { replace: true }), 900); }).catch(() => active && setMessage("E-posta doğrulaması tamamlanamadı.")); return () => { active = false; }; }, [token, navigate]); return <Shell title="E-posta Doğrulama" description="Hesabınızı kullanmaya devam etmek için e-posta adresinizi doğrulayın."><Message>{message}</Message><p className="auth-secondary-link"><Link to="/giris">Giriş merkezine dönün</Link></p></Shell>; }

export function TrainerApplicationPage() {
  const trackingStarted = useRef(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (key) => (event) => {
    if (!trackingStarted.current) {
      trackingStarted.current = true;
      pushEvent("trainer_application_start", { form_id: "trainer_application" });
    }
    const value = key === "phone" ? normalizeMobileInput(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (busy || submitted) return;
    const fullName = form.name.trim().replace(/\s+/gu, " ");
    const names = fullName.split(" ").filter(Boolean);
    const email = form.email.trim().toLowerCase();
    if (names.length < 2 || fullName.length > 160) {
      setError("Lütfen adınızı ve soyadınızı yazın.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (form.phone && !/^5\d{9}$/u.test(form.phone)) {
      setError("Telefon girerseniz 5 ile başlayan 10 haneli cep telefonu numarası yazın.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/trainer-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          firstName: names[0],
          lastName: names.slice(1).join(" "),
          email,
          phone: form.phone || null,
          legalAcknowledged: true,
        }),
      });
      if (!response.ok) {
        pushEvent("form_error", { form_id: "trainer_application", response_status: response.status });
        const body = await response.json().catch(() => ({}));
        setError(response.status === 409
          ? "Bu e-posta ile daha önce başvuru yapılmış."
          : response.status === 400 && body?.message
            ? String(body.message)
            : "Başvuru kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      setSubmitted(true);
      const result = await response.json().catch(() => ({}));
      setMessage(result.emailVerification
        ? "Doğrulama bağlantısını e-posta adresinize gönderdik. Bağlantıyı açıp güvenli bir şifre belirleyerek aday alanınıza girebilirsiniz."
        : "Kısa başvurunuz alındı. Eğitmen hesabınızın açılışıyla ilgili e-posta üzerinden bilgilendirileceksiniz.");
      pushEvent("trainer_application_submit", { form_id: "trainer_application" });
      pushEvent("generate_lead", { form_id: "trainer_application" });
    } catch {
      pushEvent("form_error", { form_id: "trainer_application", response_status: "network" });
      setError("Bağlantı kurulamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return <Shell title="Eğitmen Başvurusu" description="Kısa başvurunuz için ad soyad ve e-posta yeterli. Telefon eklemek isteğe bağlıdır.">
    <form className="auth-registration-form" onSubmit={submit} noValidate>
      <label htmlFor="trainer-name">Ad soyad <span aria-hidden="true">*</span>
        <input id="trainer-name" name="name" autoComplete="name" maxLength={160} value={form.name} onChange={update("name")} required disabled={submitted} />
      </label>
      <label htmlFor="trainer-email">E-posta <span aria-hidden="true">*</span>
        <input id="trainer-email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={update("email")} required disabled={submitted} />
      </label>
      <label htmlFor="trainer-phone">Telefon <span style={{ opacity: 0.7, fontWeight: 400 }}>(isteğe bağlı)</span>
        <input id="trainer-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="5XXXXXXXXX" pattern="5[0-9]{9}" maxLength={10} value={form.phone} onChange={update("phone")} disabled={submitted} />
      </label>
      <p className="auth-secondary-link">Kişisel verilerinizin işlenmesine ilişkin bilgilere <a href="/egitmen-kvkk-aydinlatma" target="_blank" rel="noopener noreferrer">Eğitmen KVKK Aydınlatma Metni</a> üzerinden yeni sekmede ulaşabilirsiniz.</p>
      <button type="submit" disabled={busy || submitted}>{submitted ? "Başvuru alındı" : busy ? "Kaydediliyor…" : "Kısa başvuruyu gönder"}</button>
      <Message>{message}</Message>
      <Message error>{error}</Message>
    </form>
    <p className="auth-secondary-link"><Link to="/ogretmen-girisi">Zaten hesabınız var mı? Eğitmen girişine dönün</Link></p>
  </Shell>;
}

export function AccountSecurityPage() { const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); async function change(e) { e.preventDefault(); if (newPassword.length < 8 || newPassword !== confirm) return setMessage("Yeni parola en az 8 karakter olmalı ve iki alan eşleşmelidir."); setBusy(true); try { const r = await fetch("/api/auth/change-password", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }) }); setMessage(r.ok ? "Parolanız değiştirildi; diğer oturumlar kapatıldı." : "Parola değiştirilemedi."); } catch { setMessage("Parola değiştirilemedi."); } finally { setBusy(false); } } async function revoke() { setBusy(true); try { const r = await fetch("/api/auth/revoke-other-sessions", { method: "POST", credentials: "same-origin" }); setMessage(r.ok ? "Diğer oturumlar kapatıldı." : "Oturumlar kapatılamadı."); } catch { setMessage("Oturumlar kapatılamadı."); } finally { setBusy(false); } } return <Shell title="Hesap ve Güvenlik" description="Parolanızı ve açık oturumlarınızı yönetin."><form onSubmit={change} noValidate><label htmlFor="current-password">Mevcut parola<input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label htmlFor="new-password">Yeni parola<input id="new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><label htmlFor="confirm-password">Yeni parola (tekrar)<input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label><button type="submit" disabled={busy}>Parolayı değiştir</button></form><button type="button" className="auth-secondary-button" onClick={() => void revoke()} disabled={busy}>Diğer oturumları kapat</button><Message>{message}</Message><p className="auth-secondary-link"><Link to="/panel">Panele dönün</Link></p></Shell>; }

export function InvitationAcceptPage({ kind = "trainer" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token") || "";
  const [identity, setIdentity] = useState({ email: "", name: "" });
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [identityLoading, setIdentityLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setMessage("Davet bağlantısı eksik veya geçersiz.");
      setIdentityLoading(false);
      return () => { active = false; };
    }

    fetch(kind === "candidate" ? `/api/trainer-candidate?action=preview&token=${encodeURIComponent(token)}` : `/api/invitation-accept/${kind}-invitation-accept?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "INVITATION_INVALID_OR_USED");
        return body;
      })
      .then((body) => {
        if (!active) return;
        setIdentity({
          email: String(body.invitation?.email || ""),
          name: String(body.invitation?.name || ""),
        });
      })
      .catch(() => {
        if (!active) return;
        setMessage("Davet bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.");
      })
      .finally(() => {
        if (active) setIdentityLoading(false);
      });

    return () => { active = false; };
  }, [kind, token]);

  async function submit(event) {
    event.preventDefault();
    if (!token) return setMessage("Davet bağlantısı eksik veya geçersiz.");
    if (!identity.email) return setMessage("Davet kimliği doğrulanamadı.");
    if (kind === "admin" && !adminName.trim()) return setMessage("Ad soyad alanını doldurun.");
    if (password.length < (kind === "candidate" ? 12 : 8) || password !== confirm) return setMessage(`Parola en az ${kind === "candidate" ? 12 : 8} karakter olmalı ve alanlar eşleşmelidir.`);

    setBusy(true);
    setMessage("");
    try {
      const payload = kind === "admin"
        ? { token, email: identity.email, name: adminName.trim(), password }
        : { token, password };

      const response = await fetch(kind === "candidate" ? "/api/trainer-candidate?action=activate" : `/api/invitation-accept/${kind}-invitation-accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const code = String(body.error || "");
        if (code === "INVITATION_INVALID_OR_USED") throw new Error("Davet bağlantısı geçersiz, süresi dolmuş veya daha önce kullanılmış.");
        if (code === "ACCOUNT_ALREADY_EXISTS") throw new Error("Bu e-posta adresiyle zaten bir hesap bulunuyor.");
        throw new Error("Davet kabul edilemedi.");
      }

      setMessage("Hesabınız etkinleştirildi. Giriş sayfasına yönlendiriliyorsunuz.");
      setTimeout(() => navigate(kind === "admin" ? "/admin-girisi" : kind === "candidate" ? "/ogretmen-girisi?returnTo=%2Fpanel%2Fegitmen-aday" : "/ogretmen-girisi", { replace: true }), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Davet kabul edilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      title={kind === "admin" ? "Yönetici davetini kabul et" : "Eğitmen hesabını etkinleştir"}
      description={kind === "trainer" || kind === "candidate"
        ? "E-posta adresiniz doğrulandı. Aday hesabınızı açmak için yalnızca güvenli bir parola oluşturun."
        : "Davet bağlantınız tek kullanımlıdır. Hesabınız için güvenli bir parola belirleyin."}
    >
      {identityLoading ? (
        <p role="status">Davet bilgileri doğrulanıyor…</p>
      ) : (
        <form onSubmit={submit} noValidate>
          {identity.email && (
            <div className="auth-invite-identity" aria-label="Davet edilen hesap">
              {(kind === "trainer" || kind === "candidate") && identity.name && <><span>Ad soyad</span><strong>{identity.name}</strong></>}
              <span>E-posta</span>
              <strong>{identity.email}</strong>
            </div>
          )}

          {kind === "admin" && (
            <label htmlFor="invite-name">
              Ad soyad
              <input
                id="invite-name"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                required
              />
            </label>
          )}

          <label htmlFor="invite-password">
            Şifre oluştur
            <input
              id="invite-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label htmlFor="invite-confirm">
            Şifre tekrar
            <input
              id="invite-confirm"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={busy || !identity.email}>
            {busy ? "Etkinleştiriliyor…" : "Hesabı etkinleştir"}
          </button>
          <Message>{message}</Message>
        </form>
      )}
    </Shell>
  );
}

export function AccountClosurePage() { const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); async function submit(e) { e.preventDefault(); setBusy(true); try { const response = await fetch("/api/account-lifecycle/closure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) }); setMessage(response.ok ? "Hesap kapatma talebiniz kaydedildi." : "Talep gönderilemedi."); } catch { setMessage("Talep gönderilemedi."); } finally { setBusy(false); } } return <Shell title="Hesap kapatma talebi" description="Talebiniz operasyon ekibinin incelemesine iletilir. Kayıtlar, yasal saklama kurallarına göre korunur."><form onSubmit={submit} noValidate><label htmlFor="closure-reason">Neden (isteğe bağlı)<textarea id="closure-reason" rows="5" value={reason} onChange={(e) => setReason(e.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Gönderiliyor…" : "Hesap kapatma talebi gönder"}</button><Message>{message}</Message></form><p className="auth-secondary-link"><Link to="/hesap/guvenlik">Hesap güvenliğine dönün</Link></p></Shell>; }
export function TwoFactorPage() {
  const [password, setPassword] = useState(""); const [code, setCode] = useState(""); const [message, setMessage] = useState(""); const [uri, setUri] = useState(""); const [busy, setBusy] = useState(false);
  async function requestUri(e) { e.preventDefault(); setBusy(true); try { const r = await fetch("/api/auth/two-factor/get-totp-uri", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error("2FA kurulumu başlatılamadı."); setUri(b.totpURI || ""); setMessage("Authenticator uygulamanızla QR kodu veya URI bilgisini kullanın."); } catch (e) { setMessage(e instanceof Error ? e.message : "2FA kurulumu başlatılamadı."); } finally { setBusy(false); } }
  async function verify(e) { e.preventDefault(); setBusy(true); try { const r = await fetch("/api/auth/two-factor/verify-totp", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, trustDevice: false }) }); if (!r.ok) throw new Error("Kod doğrulanamadı."); setMessage("İki aşamalı doğrulama etkinleştirildi."); } catch (e) { setMessage(e instanceof Error ? e.message : "Kod doğrulanamadı."); } finally { setBusy(false); } }
  async function backup() { setBusy(true); try { const r = await fetch("/api/auth/two-factor/generate-backup-codes", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error("Yedek kodlar üretilemedi."); setMessage(Array.isArray(b.backupCodes) ? `Yedek kodlar oluşturuldu (${b.backupCodes.length} adet). Güvenli bir yerde saklayın.` : "Yedek kodlar oluşturuldu."); } catch (e) { setMessage(e instanceof Error ? e.message : "Yedek kodlar üretilemedi."); } finally { setBusy(false); } }
  return <Shell title="İki aşamalı doğrulama" description="Yönetici ve sahip hesaplarında ek güvenlik katmanını yönetin."><form onSubmit={requestUri} noValidate><label htmlFor="twofactor-password">Mevcut parola<input id="twofactor-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button type="submit" disabled={busy}>Kurulumu başlat</button></form>{uri && <div className="auth-message"><p>Kurulum URI'si yalnızca bu oturumda gösterilir.</p><code>{uri}</code><form onSubmit={verify}><label htmlFor="twofactor-code">Doğrulama kodu<input id="twofactor-code" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(e) => setCode(e.target.value)} required /></label><button type="submit" disabled={busy}>Kodu doğrula</button></form></div>}<button type="button" className="auth-secondary-button" onClick={() => void backup()} disabled={busy}>Yedek kodları yenile</button><Message>{message}</Message><p className="auth-secondary-link"><Link to="/hesap/guvenlik">Hesap güvenliğine dönün</Link></p></Shell>;
}
