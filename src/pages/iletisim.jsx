import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/content/Breadcrumbs.jsx";
import { buildSiteUrl } from "../config/site.js";
import { contactPhones } from "../data/legalContent.js";
import { pushEvent } from "../martech/events.js";

const CONTACT_SOURCE_URL = buildSiteUrl("/iletisim");
const INITIAL_FORM_DATA = {
  fullName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
};
const FIELD_LIMITS = {
  fullName: 100,
  phone: 14,
  email: 254,
  subject: 150,
  message: 1500,
};

function removeControlCharacters(value, keepLineBreaks = false) {
  return Array.from(String(value), (character) => {
    const codePoint = character.codePointAt(0);
    if (keepLineBreaks && character === "\n") return character;
    return codePoint < 32 || codePoint === 127 ? "" : character;
  }).join("");
}

function normalizeSingleLine(value, limit) {
  return removeControlCharacters(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function normalizeMultiline(value, limit) {
  return removeControlCharacters(String(value).replace(/\r\n?/g, "\n"), true)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, limit);
}

function sanitizeFormData(formData) {
  return {
    fullName: normalizeSingleLine(formData.fullName, FIELD_LIMITS.fullName),
    phone: normalizeSingleLine(formData.phone, FIELD_LIMITS.phone),
    email: normalizeSingleLine(formData.email, FIELD_LIMITS.email),
    subject: normalizeSingleLine(formData.subject, FIELD_LIMITS.subject),
    message: normalizeMultiline(formData.message, FIELD_LIMITS.message),
  };
}

// Mask 11 digits as a Turkish local mobile number.
function formatTrPhone(value) {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)]
    .filter(Boolean).join(" ");
}

const CONTACT_TURNSTILE_SITE_KEY = import.meta.env.VITE_FIXOKU_CONTACT_TURNSTILE_SITE_KEY || "";
const CONTACT_WHATSAPP_HELP =
  "Merhaba Fixoku, internet sitenizdeki iletişim sayfası üzerinden size ulaşıyorum. " +
  "Eğitimleriniz ve hizmetleriniz hakkında bilgi ve destek almak istiyorum. Yardımcı olabilir misiniz?";
const WHATSAPP_SUPPORT_LINK = `${contactPhones.mobile.whatsappUrl}?text=${encodeURIComponent(CONTACT_WHATSAPP_HELP)}`;

function WhatsappIcon() {
  return (
    <svg className="contact-whatsapp-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.01 0C5.39 0 0 5.39 0 12.01c0 2.12.55 4.19 1.61 6.02L0 24l6.13-1.61A11.99 11.99 0 0 0 12 24h.01C18.63 24 24 18.62 24 12c0-3.2-1.25-6.21-3.48-8.52ZM12 21.97a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.77.99 1.01-3.67-.23-.38A9.97 9.97 0 0 1 2.03 12C2.03 6.51 6.51 2.03 12 2.03c2.67 0 5.18 1.04 7.06 2.93A9.9 9.9 0 0 1 21.97 12c0 5.5-4.47 9.97-9.97 9.97Zm5.47-7.47c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61l.45-.52c.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildWhatsappMessage(formData) {
  const lines = ["Merhaba Fixoku,", ""];
  const fields = [
    ["Ad Soyad", formData.fullName],
    ["Telefon", formData.phone],
    ["E-posta", formData.email],
    ["Konu/Program", formData.subject],
    ["Mesaj", formData.message],
  ];

  fields.forEach(([label, value]) => {
    if (value) lines.push(`${label}: ${value}`);
  });

  lines.push("", `Kaynak: ${CONTACT_SOURCE_URL}`);
  return lines.join("\n");
}

function Iletisim() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const formHeadingRef = useRef(null);
  const previewHeadingRef = useRef(null);
  const trackingStarted = useRef(false);
  const [emailStatus, setEmailStatus] = useState({ kind: "idle", message: "" });
  const [sending, setSending] = useState(false);
  const [websiteTrap, setWebsiteTrap] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaHost = useRef(null);

  useEffect(() => {
    if (!preview || !CONTACT_TURNSTILE_SITE_KEY || !captchaHost.current) return undefined;
    let cancelled = false;
    let widgetId = null;
    const createWidget = () => {
      if (cancelled || !window.turnstile || !captchaHost.current) return;
      widgetId = window.turnstile.render(captchaHost.current, {
        sitekey: CONTACT_TURNSTILE_SITE_KEY,
        action: "contact",
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
    };
    if (window.turnstile) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = createWidget;
      script.setAttribute("data-fixoku-contact-captcha", "1");
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* Widget already removed. */ }
      }
    };
  }, [preview]);

  const handleEmailSend = async () => {
    if (sending || !preview) return;
    if (!CONTACT_TURNSTILE_SITE_KEY || !captchaToken) {
      setEmailStatus({ kind: "error", message: "E-posta gönderimi için güvenlik doğrulaması henüz hazır değil. WhatsApp üzerinden bize ulaşabilirsiniz." });
      return;
    }
    setSending(true);
    setEmailStatus({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/public/contact-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...sanitizeFormData(formData), website: websiteTrap, captchaToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error("İletiniz gönderilemedi. E-posta servisi henüz etkin olmayabilir. Lütfen WhatsApp üzerinden bize ulaşın.");
      }
      setEmailStatus({ kind: "success", message: "Mesajınız e-posta sunucusu tarafından kabul edildi. En kısa sürede dönüş yapacağız." });
      pushEvent("form_submit", { form_id: "contact_form", channel: "email" });
    } catch (error) {
      setEmailStatus({ kind: "error", message: error?.message || "E-posta gönderilemedi." });
    } finally {
      setSending(false);
      setCaptchaToken("");
      if (window.turnstile && captchaHost.current) {
        try { window.turnstile.reset(); } catch { /* No active widget. */ }
      }
    }
  };

  const handleFieldChange = (event) => {
    if (!trackingStarted.current) { trackingStarted.current = true; pushEvent("form_start", { form_id: "contact_form" }); }
    const { name, value } = event.target;
    const limit = FIELD_LIMITS[name];
    const normalizedValue = name === "phone" ? formatTrPhone(value) : value.slice(0, limit);
    setFormData((current) => ({ ...current, [name]: normalizedValue }));
    setErrors((current) => {
      if (!current[name]) return current;
      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const sanitized = sanitizeFormData(formData);
    const nextErrors = {};

    if (!sanitized.fullName) nextErrors.fullName = "Lütfen adınızı ve soyadınızı yazın.";
    const phoneDigits = sanitized.phone.replace(/\D/g, "");
    if (sanitized.phone && !/^0\d{10}$/.test(phoneDigits)) {
      nextErrors.phone = "Telefon 0 ile başlayan tam 11 rakam olmalıdır.";
    }
    if (!sanitized.email || !isValidEmail(sanitized.email)) {
      nextErrors.email = "Lütfen geçerli bir e-posta adresi yazın.";
    }
    if (!sanitized.message) nextErrors.message = "Lütfen iletmek istediğiniz mesajı yazın.";

    setFormData(sanitized);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      pushEvent("form_error", { form_id: "contact_form", error_count: Object.keys(nextErrors).length });
      const firstInvalidField = event.currentTarget.elements[Object.keys(nextErrors)[0]];
      firstInvalidField?.focus();
      return;
    }

    const message = buildWhatsappMessage(sanitized);
    setPreview({
      message,
      whatsappUrl: `${contactPhones.mobile.whatsappUrl}?text=${encodeURIComponent(message)}`,
    });
    window.requestAnimationFrame(() => previewHeadingRef.current?.focus());
  };

  const handleEdit = () => {
    setPreview(null);
    setEmailStatus({ kind: "idle", message: "" });
    setCaptchaToken("");
    window.requestAnimationFrame(() => formHeadingRef.current?.focus());
  };

  return (
    <div className="page contact-page">
      <Header />

      <main className="contact-main">
        <section className="contact-hero">
          <div className="contact-hero-bg contact-hero-bg-left" />
          <div className="contact-hero-bg contact-hero-bg-right" />

          <div className="contact-container contact-hero-inner">
            <div className="contact-hero-copy">
              <Breadcrumbs
                items={[
                  { label: "Ana Sayfa", path: "/" },
                  { label: "İletişim", path: "/iletisim" },
                ]}
              />
              <span className="contact-eyebrow">Fixoku ile iletişime geçin</span>
              <h1>
                Size en uygun <span>Fixoku</span> eğitim çözümünü birlikte planlayalım.
              </h1>
              <p>
                Öğrenci eğitimleri, eğitmen başvuruları, yazılım kullanımı ve kurum iş birlikleri için bize ulaşabilirsiniz.
              </p>

              <div className="contact-quick-actions">
                <a
                  href={contactPhones.mobile.telUri}
                  className="contact-action-card"
                  aria-label="Fixoku cep telefonunu ara"
                >
                  <div className="contact-action-icon">☎</div>
                  <div>
                    <strong>{contactPhones.mobile.label}</strong>
                    <span>{contactPhones.mobile.display}</span>
                  </div>
                </a>

                <a
                  href={contactPhones.office.telUri}
                  className="contact-action-card"
                  aria-label="Fixoku ofis telefonunu ara"
                >
                  <div className="contact-action-icon">☎</div>
                  <div>
                    <strong>{contactPhones.office.label}</strong>
                    <span>{contactPhones.office.display}</span>
                  </div>
                </a>

                <a href="mailto:destek@fixoku.com" className="contact-action-card">
                  <div className="contact-action-icon">✉</div>
                  <div>
                    <strong>E-posta</strong>
                    <span>destek@fixoku.com</span>
                  </div>
                </a>

                <a href={WHATSAPP_SUPPORT_LINK} target="_blank" rel="noopener noreferrer" className="contact-action-card contact-whatsapp-card">
                  <div className="contact-action-icon"><WhatsappIcon /></div>
                  <div>
                    <strong>WhatsApp</strong>
                    <span>Hızlı destek alın</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="contact-form-panel">
              {!preview ? (
                <>
                  <div className="contact-form-head">
                    <h2 ref={formHeadingRef} tabIndex="-1">İletişim Formu</h2>
                    <p>Bilgilerinizi doldurun, mesajınızı kontrol edin ve e-posta ya da WhatsApp ile iletin.</p>
                  </div>

                  <form className="contact-form" data-form-id="contact_form" onSubmit={handleSubmit} noValidate>
                    <div className="contact-form-grid">
                      <label htmlFor="contact-full-name">
                        <span>Ad Soyad (zorunlu)</span>
                        <input
                          id="contact-full-name"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          maxLength={FIELD_LIMITS.fullName}
                          value={formData.fullName}
                          onChange={handleFieldChange}
                          aria-invalid={Boolean(errors.fullName)}
                          aria-describedby={errors.fullName ? "contact-full-name-error" : undefined}
                          placeholder="Adınız Soyadınız"
                        />
                        {errors.fullName && <span className="contact-field-error" id="contact-full-name-error">{errors.fullName}</span>}
                      </label>

                      <label htmlFor="contact-phone">
                        <span>Telefon</span>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          maxLength={FIELD_LIMITS.phone}
                          value={formData.phone}
                          onChange={handleFieldChange}
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                          placeholder="0530 123 45 67"
                        />
                        {errors.phone && <span className="contact-field-error" id="contact-phone-error" role="alert">{errors.phone}</span>}
                      </label>
                    </div>

                    <label htmlFor="contact-email">
                      <span>E-posta (zorunlu)</span>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        maxLength={FIELD_LIMITS.email}
                        value={formData.email}
                        onChange={handleFieldChange}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        placeholder="ornek@fixoku.com"
                      />
                      {errors.email && <span className="contact-field-error" id="contact-email-error">{errors.email}</span>}
                    </label>

                    <label htmlFor="contact-subject">
                      <span>İlgilendiğiniz konu</span>
                      <select id="contact-subject" name="subject" value={formData.subject} onChange={handleFieldChange}>
                        <option value="">Seçiniz</option>
                        <option>Öğrenci eğitimi hakkında bilgi almak istiyorum</option>
                        <option>Fixoku eğitmeni olmak istiyorum</option>
                        <option>Kurum / okul iş birliği hakkında görüşmek istiyorum</option>
                        <option>Yazılım kullanımı hakkında destek istiyorum</option>
                      </select>
                    </label>

                    <label htmlFor="contact-message">
                      <span>Mesajınız (zorunlu)</span>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows="5"
                        maxLength={FIELD_LIMITS.message}
                        value={formData.message}
                        onChange={handleFieldChange}
                        aria-invalid={Boolean(errors.message)}
                        aria-describedby={errors.message ? "contact-message-error contact-sensitive-note" : "contact-sensitive-note"}
                        placeholder="Bize kısaca ihtiyacınızı yazın..."
                      />
                      {errors.message && <span className="contact-field-error" id="contact-message-error">{errors.message}</span>}
                    </label>

                    <label className="contact-honeypot" aria-hidden="true" tabIndex="-1">
                      Web sitesi <input name="website" type="text" tabIndex="-1" autoComplete="off" value={websiteTrap} onChange={(event) => setWebsiteTrap(event.target.value)} />
                    </label>
                    <p className="contact-sensitive-note" id="contact-sensitive-note">
                      Lütfen sağlık, kimlik, parola veya ödeme bilgisi gibi hassas verileri yazmayın.
                    </p>

                    {Object.keys(errors).length > 0 && (
                      <p className="contact-form-status" role="alert" aria-live="assertive">
                        Mesaj önizlemesi için işaretli alanları kontrol edin.
                      </p>
                    )}

                    <button type="submit" className="contact-submit-btn">
                      Mesajı Kontrol Et <span aria-hidden="true">→</span>
                    </button>
                  </form>
                </>
              ) : (
                <section className="contact-preview" aria-labelledby="contact-preview-title">
                  <div className="contact-form-head">
                    <h2 id="contact-preview-title" ref={previewHeadingRef} tabIndex="-1">Mesajınız Hazır</h2>
                    <p>Mesajınızı kontrol edin. E-posta veya WhatsApp ile göndermek için aşağıdaki seçeneği kullanın.</p>
                  </div>

                  <div className="contact-preview-message">{preview.message}</div>

                  <div className="contact-captcha-area">
                    {CONTACT_TURNSTILE_SITE_KEY ? (
                      <div ref={captchaHost} aria-label="Güvenlik doğrulaması" />
                    ) : (
                      <p role="status">E-posta gönderimi henüz yapılandırılmadı. Bu arada WhatsApp üzerinden destek alabilirsiniz.</p>
                    )}
                  </div>
                  {emailStatus.message && <p className={`contact-mail-status contact-mail-status-${emailStatus.kind}`} role="status" aria-live="polite">{emailStatus.message}</p>}
                  <div className="contact-preview-actions">
                    <button type="button" className="contact-submit-btn contact-email-send" onClick={handleEmailSend} disabled={sending || emailStatus.kind === "success" || !CONTACT_TURNSTILE_SITE_KEY}>
                      {sending ? "Gönderiliyor..." : emailStatus.kind === "success" ? "E-posta Kabul Edildi" : "E-posta ile Gönder"}
                    </button>
                    <a
                      className="contact-submit-btn contact-whatsapp-continue"
                      href={preview.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsappIcon />
                      <span className="contact-whatsapp-label">WhatsApp’ta Devam Et</span>
                      <span className="contact-whatsapp-arrow" aria-hidden="true">↗</span>
                    </a>
                    <button type="button" className="contact-edit-btn" onClick={handleEdit}>Düzenle</button>
                  </div>

                  <p className="contact-preview-note" aria-live="polite">
                    WhatsApp mesajını yalnızca siz gönderirsiniz. E-posta için ayrı onay gerekir; başarılı işlemde sunucu kabul bilgisi gösterilir.
                  </p>
                </section>
              )}

              <div className="contact-privacy-note">
                <p>
                  Bilgileriniz bu sayfa açıkken geçici bellekte tutulur. E-posta ile gönderimi seçerseniz bilgileriniz güvenli sunucu üzerinden destek ekibine iletilir. Form, verileri tarayıcı depolamasına kaydetmez.
                </p>
                <p>
                  Ayrıntılar için <a href="/kvkk" target="_blank" rel="noopener noreferrer">KVKK Aydınlatma Metni</a> ve <a href="/gizlilik-politikasi" target="_blank" rel="noopener noreferrer">Gizlilik Politikası</a> sayfalarını inceleyebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-info-section">
          <div className="contact-container contact-info-grid">
            <div className="contact-info-card">
              <div className="contact-info-icon">📍</div>
              <h3>Adres</h3>
              <p>1202/2 Sok. No:80/L Temsil Plaza<br />Yenişehir, Konak / İzmir</p>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon">⏰</div>
              <h3>Çalışma Saatleri</h3>
              <p>Pazartesi - Cuma<br />09:00 - 18:00</p>
            </div>

            <div className="contact-info-card">
              <div className="contact-info-icon">🚀</div>
              <h3>Hızlı Dönüş</h3>
              <p>WhatsApp üzerinden iletilen taleplere<br />en kısa sürede dönüş yapılır.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Iletisim;
