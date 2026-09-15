import { useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  phone: 30,
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

  const handleFieldChange = (event) => {
    if (!trackingStarted.current) { trackingStarted.current = true; pushEvent("form_start", { form_id: "contact_form" }); }
    const { name, value } = event.target;
    const limit = FIELD_LIMITS[name];
    setFormData((current) => ({ ...current, [name]: value.slice(0, limit) }));
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
    if (sanitized.email && !isValidEmail(sanitized.email)) {
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
    pushEvent("form_success", { form_id: "contact_form" });
    setPreview({
      message,
      whatsappUrl: `${contactPhones.mobile.whatsappUrl}?text=${encodeURIComponent(message)}`,
    });
    window.requestAnimationFrame(() => previewHeadingRef.current?.focus());
  };

  const handleEdit = () => {
    setPreview(null);
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

                <a href="mailto:info@fixoku.com" className="contact-action-card">
                  <div className="contact-action-icon">✉</div>
                  <div>
                    <strong>E-posta</strong>
                    <span>info@fixoku.com</span>
                  </div>
                </a>

                <a href={contactPhones.mobile.whatsappUrl} target="_blank" rel="noopener noreferrer" className="contact-action-card contact-whatsapp-card">
                  <div className="contact-action-icon">☘</div>
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
                    <p>Mesajınızı hazırlayın; WhatsApp’a geçmeden önce içeriği siz kontrol edin.</p>
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
                          maxLength={FIELD_LIMITS.phone}
                          value={formData.phone}
                          onChange={handleFieldChange}
                          placeholder="Telefon numaranız"
                        />
                      </label>
                    </div>

                    <label htmlFor="contact-email">
                      <span>E-posta</span>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        maxLength={FIELD_LIMITS.email}
                        value={formData.email}
                        onChange={handleFieldChange}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "contact-email-error" : undefined}
                        placeholder="ornek@mail.com"
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

                    <p className="contact-sensitive-note" id="contact-sensitive-note">
                      Lütfen sağlık, kimlik, parola veya ödeme bilgisi gibi hassas verileri yazmayın.
                    </p>

                    {Object.keys(errors).length > 0 && (
                      <p className="contact-form-status" role="alert" aria-live="assertive">
                        Mesaj önizlemesi için işaretli alanları kontrol edin.
                      </p>
                    )}

                    <button type="submit" className="contact-submit-btn">
                      Mesajı Hazırla <span aria-hidden="true">→</span>
                    </button>
                  </form>
                </>
              ) : (
                <section className="contact-preview" aria-labelledby="contact-preview-title">
                  <div className="contact-form-head">
                    <h2 id="contact-preview-title" ref={previewHeadingRef} tabIndex="-1">Mesajınız Hazır</h2>
                    <p>WhatsApp’a geçmeden önce aşağıdaki metni kontrol edin.</p>
                  </div>

                  <div className="contact-preview-message">{preview.message}</div>

                  <div className="contact-preview-actions">
                    <a
                      className="contact-submit-btn contact-whatsapp-continue"
                      href={preview.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp’ta Devam Et <span aria-hidden="true">↗</span>
                    </a>
                    <button type="button" className="contact-edit-btn" onClick={handleEdit}>Düzenle</button>
                  </div>

                  <p className="contact-preview-note" aria-live="polite">
                    Mesaj otomatik gönderilmez. Son gönderim işlemini WhatsApp içinde yalnız siz yapabilirsiniz.
                  </p>
                </section>
              )}

              <div className="contact-privacy-note">
                <p>
                  Form bilgileri Fixoku sunucusuna, çerezlere veya tarayıcı depolamasına kaydedilmez; yalnız bu sayfa açıkken geçici bellekte tutulur.
                </p>
                <p>
                  Ayrıntılar için <Link to="/kvkk">KVKK Aydınlatma Metni</Link> ve <Link to="/gizlilik-politikasi">Gizlilik Politikası</Link> sayfalarını inceleyebilirsiniz.
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
