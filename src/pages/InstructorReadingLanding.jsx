import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import TrainerStoriesSection from "../components/TrainerStoriesSection.jsx";
import SharedPromoVideo from "../components/SharedPromoVideo.jsx";
import {
  instructorApplicationProcess,
  instructorAudience,
  instructorGains,
  instructorHero,
  instructorPreferenceReasons,
  instructorVideoDiscovery,
} from "../data/instructorReadingLanding.js";
import { institutionTypeOptions } from "../data/institutionReadingLanding.js";
import "./instructor-reading-landing.css";


const initialInstructorFormValues = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  district: "",
  specialty: "",
  workMode: "",
  institutionName: "",
  message: "",
  consent: false,
  website: "",
};

const instructorWorkModes = [
  "Bir kurumda çalışıyorum",
  "Bireysel eğitmenim",
  "Her ikisi",
];

function validateInstructorApplication(values) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[0-9+()\s.-]{7,24}$/;

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Ad soyad alanını doldurun.";
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = "Geçerli bir e-posta adresi yazın.";
  }
  if (!phonePattern.test(values.phone.trim())) {
    errors.phone = "Geçerli bir telefon numarası yazın.";
  }
  if (values.city.trim().length < 2) {
    errors.city = "İl bilgisini yazın.";
  }
  if (values.district.trim().length < 2) {
    errors.district = "İlçe bilgisini yazın.";
  }
  if (values.specialty.trim().length < 2) {
    errors.specialty = "Branş veya uzmanlık alanınızı yazın.";
  }
  if (!instructorWorkModes.includes(values.workMode)) {
    errors.workMode = "Çalışma şeklinizi seçin.";
  }
  if (
    (values.workMode === "Bir kurumda çalışıyorum" || values.workMode === "Her ikisi") &&
    values.institutionName.trim().length < 2
  ) {
    errors.institutionName = "Çalıştığınız kurumun adını yazın.";
  }
  if (!values.consent) {
    errors.consent = "Aydınlatma metni onayı zorunludur.";
  }

  return errors;
}

function InstructorFieldError({ id, children }) {
  if (!children) return null;
  return <span className="instructor-field-error" id={id}>{children}</span>;
}

function InstructorLineIcon({ type }) {
  let artwork;

  switch (type) {
    case "teacher":
      artwork = <><circle cx="19" cy="14" r="6" /><path d="M8 39v-7c0-7 4-11 11-11s11 4 11 11v7" /><path d="M31 10h12v22H31M35 17h4M35 23h5" /></>;
      break;
    case "language":
      artwork = <><path d="M8 10h22v24H8z" /><path d="M14 17h10M14 23h8M34 14h8M38 10v8M32 35c4-3 7-7 9-12M33 26c3 3 6 6 10 8" /></>;
      break;
    case "guidance":
      artwork = <><circle cx="18" cy="15" r="6" /><path d="M7 39v-7c0-6 4-10 11-10s11 4 11 10v7" /><path d="M31 11c7 0 12 5 12 12 0 5-3 9-7 11l-5 5 1-7c-3-2-5-5-5-9 0-7 4-12 4-12Z" /></>;
      break;
    case "presentation":
      artwork = <><path d="M7 8h34v24H7z" /><path d="M24 32v9M17 41h14M13 25l7-7 6 4 8-9" /><circle cx="14" cy="15" r="2" /></>;
      break;
    case "consultant":
      artwork = <><circle cx="15" cy="15" r="6" /><path d="M5 39v-7c0-6 4-10 10-10s10 4 10 10v7" /><circle cx="35" cy="17" r="5" /><path d="M27 39v-5c0-6 3-10 8-10s8 4 8 10v5M22 25l8-5" /></>;
      break;
    case "ai":
      artwork = <><rect x="10" y="10" width="28" height="28" rx="7" /><path d="M18 29V20l6-4 6 4v9M24 10V5M24 43v-5M5 24h5M38 24h5" /><circle cx="20" cy="24" r="1.5" /><circle cx="28" cy="24" r="1.5" /></>;
      break;
    case "laptop-book":
      artwork = <><rect x="9" y="9" width="30" height="23" rx="3" /><path d="M5 39h38l-4-7H9l-4 7Z" /><path d="M17 17h14v10H17zM24 17v10" /></>;
      break;
    case "calendar":
      artwork = <><rect x="8" y="11" width="32" height="29" rx="4" /><path d="M8 20h32M16 7v8M32 7v8M15 27h5M26 27h5M15 34h5" /></>;
      break;
    case "chart":
      artwork = <><path d="M8 39h33M13 35V25h7v10M24 35V18h7v17M35 35V11h6" /><path d="m28 11 12-5-3 12" /></>;
      break;
    case "brain":
      artwork = <><path d="M19 8c-5 0-8 4-8 8-4 1-6 4-6 8 0 4 3 7 7 8 0 5 4 8 8 8 3 0 5-2 5-5V13c0-3-2-5-6-5Z" /><path d="M29 8c5 0 8 4 8 8 4 1 6 4 6 8 0 4-3 7-7 8 0 5-4 8-8 8-3 0-5-2-5-5V13c0-3 2-5 6-5ZM12 20h7M30 20h7M14 31h6M28 31h6" /></>;
      break;
    case "support":
      artwork = <><path d="M9 27v-5a15 15 0 0 1 30 0v5" /><rect x="6" y="24" width="8" height="13" rx="4" /><rect x="34" y="24" width="8" height="13" rx="4" /><path d="M34 38c-2 3-5 4-10 4" /><circle cx="21" cy="42" r="2" /></>;
      break;
    case "application":
      artwork = <><path d="M10 8h28v34H10z" /><path d="M17 8V5h14v3M16 18h16M16 25h16M16 32h10" /><path d="m30 35 3 3 7-8" /></>;
      break;
    case "screen":
      artwork = <><rect x="7" y="8" width="34" height="25" rx="3" /><path d="M18 41h12M24 33v8" /><circle cx="18" cy="20" r="5" /><path d="m26 26 5-6 4 3" /></>;
      break;
    case "plan":
      artwork = <><rect x="9" y="7" width="30" height="35" rx="4" /><path d="M16 15h16M16 22h16M16 29h10" /><path d="m29 34 3 3 7-8" /></>;
      break;
    case "assessment":
      artwork = <><circle cx="20" cy="20" r="11" /><path d="m28 28 11 11M15 20h10M20 15v10" /><path d="M8 39h12" /></>;
      break;
    case "training":
      artwork = <><path d="M7 10h34v22H7z" /><path d="M24 32v10M17 42h14" /><path d="m19 16 10 5-10 5V16Z" /></>;
      break;
    case "progress":
      artwork = <><path d="M8 39h33M12 33l8-9 7 5 12-16" /><circle cx="12" cy="33" r="2" /><circle cx="20" cy="24" r="2" /><circle cx="27" cy="29" r="2" /><circle cx="39" cy="13" r="2" /></>;
      break;
    case "results":
      artwork = <><rect x="9" y="8" width="30" height="34" rx="4" /><path d="M15 30h5v6h-5zM23 24h5v12h-5zM31 17h5v19h-5z" /><path d="M15 15h10" /></>;
      break;
    default:
      artwork = <circle cx="24" cy="24" r="16" />;
  }

  return (
    <svg className="instructor-line-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {artwork}
    </svg>
  );
}

function InstructorHeroArtwork() {
  const { images } = instructorHero;

  return (
    <div
      className="instructor-hero-artwork"
      role="img"
      aria-label="Fixoku eğitmeni ile masaüstü ve mobil eğitim sistemi görünümü"
    >
      <span className="instructor-hero-orbit instructor-hero-orbit-one" aria-hidden="true" />
      <span className="instructor-hero-orbit instructor-hero-orbit-two" aria-hidden="true" />

      <img
        className="instructor-hero-computer"
        src={images.computer.src}
        alt={images.computer.alt}
        loading="eager"
        decoding="async"
      />
      <img
        className="instructor-hero-person"
        src={images.instructor.src}
        alt={images.instructor.alt}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <img
        className="instructor-hero-phone"
        src={images.phone.src}
        alt={images.phone.alt}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

function InstructorVideoPlaceholder() {
  return <SharedPromoVideo context="instructor" title="Neden Fixoku?" label={instructorVideoDiscovery.placeholderLabel} />;
}

function InstructorSectionTitle({ id, lead, accent }) {
  return (
    <header className="instructor-section-heading instructor-content-heading">
      <h2 id={id}>
        <span>{lead}</span>
        {accent ? <strong>{accent}</strong> : null}
      </h2>
    </header>
  );
}

export default function InstructorReadingLanding() {
  const [activeGainId, setActiveGainId] = useState(instructorGains[0].id);
  const [formValues, setFormValues] = useState(initialInstructorFormValues);
  const [formErrors, setFormErrors] = useState({});
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const formStartedAt = useRef(0);

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  const updateFormField = (event) => {
    const { checked, name, type, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
    if (formStatus.type !== "idle") {
      setFormStatus({ type: "idle", message: "" });
    }
  };

  const submitInstructorApplication = async (event) => {
    event.preventDefault();
    if (formStatus.type === "submitting") return;

    const validationErrors = validateInstructorApplication(formValues);
    if (Object.keys(validationErrors).length) {
      setFormErrors(validationErrors);
      setFormStatus({
        type: "error",
        message: "Lütfen işaretlenen alanları kontrol edin.",
      });
      return;
    }

    setFormErrors({});
    setFormStatus({
      type: "submitting",
      message: "Başvurunuz güvenli biçimde gönderiliyor…",
    });

    const institutionType =
      institutionTypeOptions[institutionTypeOptions.length - 1] ||
      institutionTypeOptions[0] ||
      "Eğitim Akademisi";
    const institutionName =
      formValues.institutionName.trim() || `Bireysel Eğitmen - ${formValues.fullName.trim()}`;
    const applicantMessage = [
      "Başvuru türü: Fixoku Akademi eğitmen modeli",
      `Branş / uzmanlık alanı: ${formValues.specialty.trim()}`,
      `Çalışma şekli: ${formValues.workMode}`,
      `Çalıştığı kurum: ${formValues.institutionName.trim() || "Belirtilmedi"}`,
      `Kullanıcı mesajı: ${formValues.message.trim() || "Ek mesaj belirtilmedi."}`,
    ].join("\n").slice(0, 1900);

    try {
      const response = await fetch("/api/institution-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formValues.fullName,
          institutionName,
          email: formValues.email,
          phone: formValues.phone,
          city: formValues.city,
          district: formValues.district,
          institutionType,
          studentCount: "0",
          message: applicantMessage,
          consent: formValues.consent,
          website: formValues.website,
          startedAt: formStartedAt.current,
          route: "/hizli-okuma-egitmeni-ol",
          applicationType: "instructor",
        }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.ok === true) {
        setFormStatus({
          type: "success",
          message: "Eğitmen başvurunuz alınmıştır. Ekibimiz sizinle iletişime geçecektir.",
        });
        setFormValues(initialInstructorFormValues);
        formStartedAt.current = Date.now();
        return;
      }

      if (response.status === 503) {
        setFormStatus({
          type: "service",
          message: "Başvuru servisi henüz yapılandırılmamış. Lütfen daha sonra yeniden deneyin.",
        });
      } else if (response.status === 429) {
        setFormStatus({
          type: "error",
          message: "Kısa sürede çok sayıda deneme yapıldı. Lütfen biraz bekleyip yeniden deneyin.",
        });
      } else if (response.status === 400) {
        setFormStatus({
          type: "error",
          message: "Form bilgileri doğrulanamadı. Alanları kontrol edip yeniden deneyin.",
        });
      } else {
        setFormStatus({
          type: "error",
          message: "Başvuru şu anda gönderilemedi. Bilgileriniz formda korunuyor.",
        });
      }
    } catch {
      setFormStatus({
        type: "error",
        message: "Bağlantı kurulamadı. Bilgileriniz formda korunuyor.",
      });
    }
  };

  return (
    <div className="instructor-landing-page">
      <Header />

      <main>
        <section
          className="instructor-hero"
          aria-labelledby="instructor-landing-title"
        >
          <div className="instructor-shell instructor-hero-grid">
            <div className="instructor-hero-copy">
              <p className="instructor-kicker">{instructorHero.kicker}</p>

              <h1 id="instructor-landing-title">
                <span>{instructorHero.headingLead}</span>
                <strong>{instructorHero.headingAccent}</strong>
              </h1>

              <div className="instructor-hero-description">
                {instructorHero.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <a
                className="instructor-primary-cta"
                href={instructorHero.cta.href}
              >
                {instructorHero.cta.label}
              </a>
            </div>

            <InstructorHeroArtwork />
          </div>
        </section>

        <section
          className="instructor-video-discovery"
          id={instructorVideoDiscovery.id}
          aria-labelledby="instructor-video-title"
        >
          <div className="instructor-shell">
            <InstructorSectionTitle
              id="instructor-video-title"
              lead={instructorVideoDiscovery.headingLead}
              accent={instructorVideoDiscovery.headingAccent}
            />

            <div className="instructor-video-layout">
              <InstructorVideoPlaceholder />

              <ol
                className="instructor-video-topics"
                data-video-topic-count={instructorVideoDiscovery.topics.length}
              >
                {instructorVideoDiscovery.topics.map((topic, index) => (
                  <li key={topic}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{topic}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          className="instructor-audience-section"
          aria-labelledby="instructor-audience-title"
        >
          <div className="instructor-shell">
            <InstructorSectionTitle
              id="instructor-audience-title"
              lead="FİXOKU AKADEMİ EĞİTMEN MODELİ"
              accent="KİMLER İÇİN UYGUNDUR?"
            />

            <div
              className="instructor-audience-track"
              data-audience-card-count={instructorAudience.length}
            >
              {instructorAudience.map((item) => (
                <article className="instructor-audience-card" key={item.id}>
                  <span className="instructor-audience-icon">
                    <InstructorLineIcon type={item.icon} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="instructor-gains-section"
          aria-labelledby="instructor-gains-title"
        >
          <div className="instructor-shell">
            <InstructorSectionTitle
              id="instructor-gains-title"
              lead="FİXOKU AKADEMİ"
              accent="EĞİTMENE NE KAZANDIRIR?"
            />

            <div
              className="instructor-gains-accordion"
              data-accordion-item-count={instructorGains.length}
            >
              {instructorGains.map((item, index) => {
                const isActive = item.id === activeGainId;
                const panelId = `instructor-gain-panel-${item.id}`;
                const buttonId = `instructor-gain-button-${item.id}`;

                return (
                  <article className="instructor-gain-item" key={item.id}>
                    <button
                      className={`instructor-gain-button${isActive ? " is-active" : ""}`}
                      id={buttonId}
                      type="button"
                      aria-expanded={isActive}
                      aria-controls={panelId}
                      onClick={() => setActiveGainId(item.id)}
                    >
                      <span>{item.title}</span>
                      <b aria-hidden="true">{isActive ? "−" : "+"}</b>
                    </button>

                    <div
                      className={`instructor-gain-panel${isActive ? " is-active" : ""}`}
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isActive}
                    >
                      <span className="instructor-gain-number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="instructor-reasons-section"
          aria-labelledby="instructor-reasons-title"
        >
          <div className="instructor-shell">
            <InstructorSectionTitle
              id="instructor-reasons-title"
              lead="NEDEN EĞİTMENLER"
              accent="FİXOKU AKADEMİ’Yİ TERCİH EDİYOR?"
            />

            <div
              className="instructor-reasons-grid"
              data-benefit-card-count={instructorPreferenceReasons.length}
            >
              {instructorPreferenceReasons.map((item) => (
                <article className="instructor-reason-card" key={item.id}>
                  <span className="instructor-reason-icon">
                    <InstructorLineIcon type={item.icon} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="instructor-process-section"
          aria-labelledby="instructor-process-title"
        >
          <div className="instructor-shell">
            <InstructorSectionTitle
              id="instructor-process-title"
              lead="FİXOKU EĞİTMEN MODELİ"
              accent="NASIL UYGULANIR?"
            />

            <ol
              className="instructor-process-grid"
              data-process-step-count={instructorApplicationProcess.length}
            >
              {instructorApplicationProcess.map((step, index) => (
                <li className="instructor-process-card" key={step.id}>
                  <span className="instructor-process-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="instructor-process-icon">
                    <InstructorLineIcon type={step.icon} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div
          className="instructor-trainer-stories"
          data-video-type="trainer-stories"
          aria-label="Fixoku eğitmen video deneyimleri"
        >
          <TrainerStoriesSection
            className="instructor-shared-trainers"
            subtitle="Fixoku sistemini uygulayan eğitmenler; yazılım takibi, egzersiz süreci, öğrenci gelişimi ve veli geri dönüşleriyle ilgili deneyimlerini paylaşıyor."
          />
        </div>

        <section
          className="instructor-form-section"
          id="egitmen-basvuru-formu"
          aria-labelledby="instructor-form-title"
        >
          <div className="instructor-shell instructor-form-layout">
            <aside className="instructor-form-aside">
              <span className="instructor-form-kicker">Fixoku Akademi Eğitmen Modeli</span>
              <h2 id="instructor-form-title">
                <span>FİXOKU AKADEMİ</span>
                <span>EĞİTMEN MODELİ</span>
                <strong>HAKKINDA BİLGİ ALIN</strong>
              </h2>
              <p>
                Fixoku Akademi’yi öğrencilerinize uygulamak ve eğitmen modeli hakkında
                detaylı bilgi almak için formu doldurun. Ekibimiz sizinle iletişime geçsin.
              </p>
              <ul>
                <li>Branşınız ve çalışma modeliniz birlikte değerlendirilir.</li>
                <li>Kitap, yazılım, egzersiz ve öğrenci takip yapısı açıklanır.</li>
                <li>Program kapsamı ve uygulama koşulları görüşmede netleştirilir.</li>
              </ul>
              <p className="instructor-form-contact">
                İletişim: <strong>info@fixoku.com</strong>
              </p>
            </aside>

            <form
              className="instructor-application-form"
              onSubmit={submitInstructorApplication}
              noValidate
            >
              <div className="instructor-form-grid">
                <div className="instructor-form-field">
                  <label htmlFor="instructor-full-name">Ad Soyad</label>
                  <input
                    id="instructor-full-name"
                    name="fullName"
                    value={formValues.fullName}
                    onChange={updateFormField}
                    autoComplete="name"
                    required
                    maxLength="100"
                    aria-invalid={Boolean(formErrors.fullName)}
                    aria-describedby={formErrors.fullName ? "instructor-full-name-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-full-name-error">
                    {formErrors.fullName}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-email">E-posta Adresi</label>
                  <input
                    id="instructor-email"
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={updateFormField}
                    autoComplete="email"
                    required
                    maxLength="160"
                    aria-invalid={Boolean(formErrors.email)}
                    aria-describedby={formErrors.email ? "instructor-email-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-email-error">
                    {formErrors.email}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-phone">Telefon Numarası</label>
                  <input
                    id="instructor-phone"
                    name="phone"
                    type="tel"
                    value={formValues.phone}
                    onChange={updateFormField}
                    autoComplete="tel"
                    required
                    maxLength="24"
                    aria-invalid={Boolean(formErrors.phone)}
                    aria-describedby={formErrors.phone ? "instructor-phone-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-phone-error">
                    {formErrors.phone}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-specialty">Branş / Uzmanlık Alanı</label>
                  <input
                    id="instructor-specialty"
                    name="specialty"
                    value={formValues.specialty}
                    onChange={updateFormField}
                    required
                    maxLength="120"
                    aria-invalid={Boolean(formErrors.specialty)}
                    aria-describedby={formErrors.specialty ? "instructor-specialty-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-specialty-error">
                    {formErrors.specialty}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-city">İl</label>
                  <input
                    id="instructor-city"
                    name="city"
                    value={formValues.city}
                    onChange={updateFormField}
                    autoComplete="address-level1"
                    required
                    maxLength="80"
                    aria-invalid={Boolean(formErrors.city)}
                    aria-describedby={formErrors.city ? "instructor-city-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-city-error">
                    {formErrors.city}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-district">İlçe</label>
                  <input
                    id="instructor-district"
                    name="district"
                    value={formValues.district}
                    onChange={updateFormField}
                    autoComplete="address-level2"
                    required
                    maxLength="80"
                    aria-invalid={Boolean(formErrors.district)}
                    aria-describedby={formErrors.district ? "instructor-district-error" : undefined}
                  />
                  <InstructorFieldError id="instructor-district-error">
                    {formErrors.district}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-work-mode">Çalışma Şekli</label>
                  <select
                    id="instructor-work-mode"
                    name="workMode"
                    value={formValues.workMode}
                    onChange={updateFormField}
                    required
                    aria-invalid={Boolean(formErrors.workMode)}
                    aria-describedby={formErrors.workMode ? "instructor-work-mode-error" : undefined}
                  >
                    <option value="">Seçiniz</option>
                    {instructorWorkModes.map((mode) => (
                      <option value={mode} key={mode}>{mode}</option>
                    ))}
                  </select>
                  <InstructorFieldError id="instructor-work-mode-error">
                    {formErrors.workMode}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field">
                  <label htmlFor="instructor-institution">
                    Çalıştığınız Kurum
                    <span>
                      {formValues.workMode === "Bireysel eğitmenim" ? " (opsiyonel)" : ""}
                    </span>
                  </label>
                  <input
                    id="instructor-institution"
                    name="institutionName"
                    value={formValues.institutionName}
                    onChange={updateFormField}
                    autoComplete="organization"
                    required={
                      formValues.workMode === "Bir kurumda çalışıyorum" ||
                      formValues.workMode === "Her ikisi"
                    }
                    maxLength="140"
                    aria-invalid={Boolean(formErrors.institutionName)}
                    aria-describedby={
                      formErrors.institutionName ? "instructor-institution-error" : undefined
                    }
                  />
                  <InstructorFieldError id="instructor-institution-error">
                    {formErrors.institutionName}
                  </InstructorFieldError>
                </div>

                <div className="instructor-form-field instructor-form-field-full">
                  <label htmlFor="instructor-message">Mesaj <span>(opsiyonel)</span></label>
                  <textarea
                    id="instructor-message"
                    name="message"
                    value={formValues.message}
                    onChange={updateFormField}
                    maxLength="1400"
                    rows="6"
                  />
                </div>

                <div className="instructor-honeypot" aria-hidden="true">
                  <label htmlFor="instructor-website">Web sitesi</label>
                  <input
                    id="instructor-website"
                    name="website"
                    value={formValues.website}
                    onChange={updateFormField}
                    tabIndex="-1"
                    autoComplete="off"
                  />
                </div>

                <div className="instructor-form-field instructor-form-field-full instructor-consent-field">
                  <label htmlFor="instructor-consent">
                    <input
                      id="instructor-consent"
                      name="consent"
                      type="checkbox"
                      checked={formValues.consent}
                      onChange={updateFormField}
                      required
                      aria-invalid={Boolean(formErrors.consent)}
                      aria-describedby={formErrors.consent ? "instructor-consent-error" : undefined}
                    />
                    <span>
                      Kişisel verilerimin eğitmen başvuruma dönüş yapılması amacıyla
                      işlenmesine ilişkin{" "}
                      <a href="/kvkk" target="_blank" rel="noreferrer">
                        aydınlatma metnini
                      </a>{" "}
                      okudum.
                    </span>
                  </label>
                  <InstructorFieldError id="instructor-consent-error">
                    {formErrors.consent}
                  </InstructorFieldError>
                </div>
              </div>

              <button
                className="instructor-submit-button"
                type="submit"
                disabled={formStatus.type === "submitting"}
              >
                {formStatus.type === "submitting"
                  ? "Gönderiliyor…"
                  : "EĞİTMEN MODELİ HAKKINDA BİLGİ AL"}
              </button>

              {formStatus.message && (
                <p
                  className={`instructor-form-status is-${formStatus.type}`}
                  role={formStatus.type === "success" ? "status" : "alert"}
                  aria-live="polite"
                >
                  {formStatus.message}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>

      <Footer showCta={false} />
    </div>
  );
}
