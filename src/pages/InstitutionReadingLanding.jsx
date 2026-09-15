import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import StudentStoriesSection from "../components/StudentStoriesSection.jsx";
import TrainerStoriesSection from "../components/TrainerStoriesSection.jsx";
import SharedPromoVideo from "../components/SharedPromoVideo.jsx";
import { pushEvent } from "../martech/events.js";
import {
  detailedInstitutionProcess,
  detailedProcessIntro,
  institutionApplicationCta,
  institutionBenefits,
  institutionChoice,
  institutionClosing,
  institutionFeatureSummaries,
  institutionFeatures,
  institutionHero,
  institutionReadingLandingRoute,
  institutionSocialProof,
  institutionTypeOptions,
  institutionTypes,
  institutionTypesIntro,
  shortInstitutionProcess,
} from "../data/institutionReadingLanding.js";
import "./institution-reading-landing.css";

const initialFormValues = {
  fullName: "",
  institutionName: "",
  email: "",
  phone: "",
  city: "",
  district: "",
  institutionType: "",
  studentCount: "",
  message: "",
  consent: false,
  website: "",
};

function validateApplication(values) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[0-9+()\s.-]{7,24}$/;

  if (values.fullName.trim().length < 2) errors.fullName = "Ad soyad alanını doldurun.";
  if (values.institutionName.trim().length < 2) errors.institutionName = "Kurum adını yazın.";
  if (!emailPattern.test(values.email.trim())) errors.email = "Geçerli bir e-posta adresi yazın.";
  if (!phonePattern.test(values.phone.trim())) errors.phone = "Geçerli bir telefon numarası yazın.";
  if (values.city.trim().length < 2) errors.city = "İl bilgisini yazın.";
  if (values.district.trim().length < 2) errors.district = "İlçe bilgisini yazın.";
  if (!institutionTypeOptions.includes(values.institutionType)) {
    errors.institutionType = "Kurum türünü seçin.";
  }

  const studentCount = Number(values.studentCount);
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    errors.studentCount = "Öğrenci sayısı için sıfır veya pozitif bir tam sayı yazın.";
  }
  if (values.message.trim().length < 10) errors.message = "Mesajınızı en az 10 karakterle açıklayın.";
  if (!values.consent) errors.consent = "Aydınlatma metni onayı zorunludur.";

  return errors;
}

const institutionBeeVariantByType = {
  "private-schools": "school",
  "course-centers": "exam",
  "study-centers": "study",
  "personal-development": "development",
  "education-academies": "academy",
};

const institutionBenefitIcons = ["chart", "report", "layers", "shield", "growth"];

function InstitutionBrandText({ children }) {
  if (typeof children !== "string") return children;

  return children.split(/(Fixoku Akademi|FİXOKU AKADEMİ)/g).map((part, index) => {
    if (part !== "Fixoku Akademi" && part !== "FİXOKU AKADEMİ") return part;
    const [fixoku, akademi] = part.split(" ");

    return (
      <span className="institution-brand-highlight" key={`${part}-${index}`}>
        <span className="institution-brand-fixoku">{fixoku}</span>{" "}
        <span className="institution-brand-akademi">{akademi}</span>
      </span>
    );
  });
}

function InstitutionTopicIcon({ type }) {
  let artwork;

  switch (type) {
    case "chart":
    case "analytics":
      artwork = <><path d="M9 38V12M9 38h31" /><path d="m15 31 7-8 6 4 9-13" /><circle cx="15" cy="31" r="2" /><circle cx="22" cy="23" r="2" /><circle cx="28" cy="27" r="2" /><circle cx="37" cy="14" r="2" /></>;
      break;
    case "report":
    case "presentation":
      artwork = <><rect x="11" y="7" width="26" height="34" rx="4" /><path d="M17 16h14M17 22h14M17 29h8" /><path d="m28 33 3 3 6-7" /></>;
      break;
    case "layers":
    case "library":
      artwork = <><path d="m24 7 17 9-17 9L7 16l17-9Z" /><path d="m9 23 15 8 15-8M9 30l15 8 15-8" /></>;
      break;
    case "shield":
      artwork = <><path d="M24 6 39 12v10c0 10-6 16-15 20C15 38 9 32 9 22V12l15-6Z" /><path d="m17 24 5 5 10-12" /></>;
      break;
    case "growth":
      artwork = <><path d="M9 37h30M13 34V25h7v9M24 34V18h7v16M35 34V11h5" /><path d="m29 10 11-4-3 11" /></>;
      break;
    case "trainer":
      artwork = <><circle cx="16" cy="15" r="6" /><path d="M6 38v-7c0-6 4-10 10-10s10 4 10 10v7" /><rect x="28" y="11" width="14" height="19" rx="2" /><path d="m27 35 8-8M34 18h3M34 23h5" /></>;
      break;
    case "focus":
      artwork = <><circle cx="24" cy="24" r="16" /><circle cx="24" cy="24" r="9" /><circle cx="24" cy="24" r="3" /><path d="M24 4v6M44 24h-6M24 44v-6M4 24h6" /></>;
      break;
    case "calendar":
      artwork = <><rect x="8" y="11" width="32" height="29" rx="4" /><path d="M8 20h32M16 7v8M32 7v8M16 27h5M27 27h5M16 34h5" /></>;
      break;
    case "laptop":
      artwork = <><rect x="10" y="8" width="28" height="24" rx="3" /><path d="M5 38h38l-4-6H9l-4 6Z" /><path d="m17 25 5-6 4 3 6-8" /></>;
      break;
    case "network":
      artwork = <><circle cx="24" cy="11" r="5" /><circle cx="11" cy="35" r="5" /><circle cx="37" cy="35" r="5" /><path d="m21 16-7 14m13-14 7 14M16 35h16" /></>;
      break;
    case "support":
      artwork = <><path d="M9 27v-5a15 15 0 0 1 30 0v5" /><rect x="6" y="24" width="8" height="13" rx="4" /><rect x="34" y="24" width="8" height="13" rx="4" /><path d="M34 38c-2 3-5 4-10 4" /><circle cx="21" cy="42" r="2" /></>;
      break;
    case "ai":
    default:
      artwork = <><rect x="11" y="11" width="26" height="26" rx="7" /><path d="M18 28V20l6-4 6 4v8M24 16V7M24 41v-4M7 24h4M37 24h4" /><circle cx="20" cy="24" r="1.5" /><circle cx="28" cy="24" r="1.5" /></>;
  }

  return <svg className="institution-topic-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">{artwork}</svg>;
}

function BeeAccessories({ variant }) {
  const accessory = {
    school: (
      <g className="institution-bee-accessory accessory-school" data-bee-accessory="book-graduation-cap">
        <path d="m74 61 28-20 33 15-31 18-30-13Z" fill="#f47b22" stroke="#4a244f" strokeWidth="3" strokeLinejoin="round" />
        <path d="m129 58 4 24" stroke="#4a244f" strokeWidth="3" strokeLinecap="round" />
        <circle cx="134" cy="83" r="4" fill="#f7ba23" />
        <path d="M38 158c18-8 36-4 52 9v42c-16-12-34-16-52-8v-43Z" fill="#fff" stroke="#5c0d72" strokeWidth="3" />
        <path d="M90 167c16-13 34-17 52-9v43c-18-8-36-4-52 8v-42Z" fill="#fff7df" stroke="#5c0d72" strokeWidth="3" />
        <path d="M90 167v42M50 172h27M103 172h27M50 183h27M103 183h27" stroke="#ed6a24" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="79" cy="161" r="5" fill="#342033" />
        <circle cx="126" cy="160" r="5" fill="#342033" />
      </g>
    ),
    exam: (
      <g className="institution-bee-accessory accessory-exam" data-bee-accessory="test-pencil-timer">
        <rect x="22" y="145" width="72" height="61" rx="9" fill="#fff" stroke="#5c0d72" strokeWidth="3" />
        <path d="M36 160h33M36 174h33M36 188h23" stroke="#8a5b96" strokeWidth="3" strokeLinecap="round" />
        <circle cx="79" cy="160" r="4" fill="none" stroke="#f16418" strokeWidth="2.5" />
        <path d="m88 198 37-36 8 8-38 35-12 3 5-10Z" fill="#f7ba23" stroke="#4a244f" strokeWidth="2.5" />
        <circle cx="267" cy="155" r="23" fill="#fff7df" stroke="#5c0d72" strokeWidth="3" />
        <path d="M258 126h18M267 126v7M267 155l10-9M267 155v-13" stroke="#f16418" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
    study: (
      <g className="institution-bee-accessory accessory-study" data-bee-accessory="desk-notebook-lamp">
        <path d="M17 205h142M34 205v24M143 205v24" stroke="#5c0d72" strokeWidth="6" strokeLinecap="round" />
        <path d="M57 171h76v31H57z" fill="#fff" stroke="#5c0d72" strokeWidth="3" />
        <path d="M95 171v31M66 182h20M104 182h20M71 193h16M106 193h15" stroke="#f16418" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M22 201v-43c0-12 9-22 21-22h15" stroke="#4a244f" strokeWidth="4" strokeLinecap="round" />
        <path d="m49 127 28 15-34 18-21-14 27-19Z" fill="#f7ba23" stroke="#4a244f" strokeWidth="3" />
        <circle cx="49" cy="144" r="6" fill="#fff5bd" />
        <path d="M126 166c8 4 13 10 16 18" stroke="#4a244f" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <circle cx="131" cy="170" r="5" fill="#342033" />
      </g>
    ),
    development: (
      <g className="institution-bee-accessory accessory-development" data-bee-accessory="brain-lightbulb-focus-rings">
        <circle cx="58" cy="158" r="41" fill="none" stroke="#f0a6c7" strokeWidth="3" opacity=".72" />
        <circle cx="58" cy="158" r="30" fill="none" stroke="#9c76bd" strokeWidth="3" opacity=".78" />
        <path d="M47 178h22M50 186h16" stroke="#5c0d72" strokeWidth="4" strokeLinecap="round" />
        <path d="M58 120c-19 0-32 14-32 30 0 12 6 20 15 27h34c10-7 15-15 15-27 0-16-13-30-32-30Z" fill="#fff2ad" stroke="#5c0d72" strokeWidth="3" />
        <path d="M46 138c-8 4-8 16 0 20m24-20c8 4 8 16 0 20M58 128v40" stroke="#f16418" strokeWidth="3" strokeLinecap="round" />
        <path d="M56 100h5M28 110l5 5M88 108l-5 5" stroke="#f16418" strokeWidth="4" strokeLinecap="round" />
      </g>
    ),
    academy: (
      <g className="institution-bee-accessory accessory-academy" data-bee-accessory="laptop-books-growth-graph">
        <rect x="44" y="145" width="94" height="59" rx="8" fill="#fff" stroke="#5c0d72" strokeWidth="3" />
        <path d="M34 214h115l-10-10H45l-11 10Z" fill="#ddd0ec" stroke="#5c0d72" strokeWidth="3" />
        <path d="m61 190 17-17 12 9 29-29" stroke="#f16418" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M107 153h12v12" stroke="#f16418" strokeWidth="4" strokeLinecap="round" />
        <path d="M141 174c9 2 16 8 19 18" stroke="#4a244f" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="145" cy="175" r="5" fill="#342033" />
        <rect x="219" y="189" width="60" height="14" rx="4" fill="#f7ba23" stroke="#4a244f" strokeWidth="2.5" />
        <rect x="226" y="172" width="53" height="17" rx="4" fill="#f4a3c2" stroke="#4a244f" strokeWidth="2.5" />
        <rect x="214" y="155" width="65" height="17" rx="4" fill="#c8b3e1" stroke="#4a244f" strokeWidth="2.5" />
      </g>
    ),
  };

  return accessory[variant];
}

function BeeWings({ wingGradientId, leftTransform, rightTransform }) {
  return (
    <g className="institution-bee-wings" data-bee-wing-count="4">
      <g transform={leftTransform}>
        <g className="institution-bee-wing-left" data-wing-group="left">
          <path d="M153 94C120 76 105 47 118 27c23 1 46 23 56 58Z" fill={`url(#${wingGradientId})`} stroke="#8aa5b4" strokeWidth="2.4" />
          <path d="M151 104c-31 6-55-6-58-25 16-12 43-7 64 14Z" fill={`url(#${wingGradientId})`} stroke="#8aa5b4" strokeWidth="2.4" />
          <path d="m126 38 36 48m-55-9 45 20m-16-39-12 26" stroke="#a5bac5" strokeWidth="1.7" opacity=".78" />
        </g>
      </g>
      <g transform={rightTransform}>
        <g className="institution-bee-wing-right" data-wing-group="right">
          <path d="M176 92c29-27 60-32 76-16-3 23-31 42-68 38Z" fill={`url(#${wingGradientId})`} stroke="#8aa5b4" strokeWidth="2.4" />
          <path d="M176 108c29 8 49 27 43 46-19 6-42-8-56-35Z" fill={`url(#${wingGradientId})`} stroke="#8aa5b4" strokeWidth="2.4" />
          <path d="m239 82-57 23m28 37-37-27m40-14-19 28" stroke="#a5bac5" strokeWidth="1.7" opacity=".78" />
        </g>
      </g>
    </g>
  );
}

function BeeFace({ faceGradientId, look, transform }) {
  return (
    <g className="institution-bee-face" data-bee-expression="warm-bright-friendly" transform={transform}>
      <circle cx="105" cy="108" r="39" fill={"url(#" + faceGradientId + ")"} stroke="#342033" strokeWidth="4" />
      <path d="M78 91c14-16 38-20 58-8" stroke="#fff0a4" strokeWidth="5" opacity=".62" strokeLinecap="round" />
      <ellipse cx="91" cy="102" rx="13" ry="17" fill="#271826" />
      <ellipse cx="121" cy="101" rx="13" ry="17" fill="#271826" />
      <ellipse cx="92" cy="104" rx="8" ry="11" fill="#4a3651" opacity=".42" />
      <ellipse cx="122" cy="103" rx="8" ry="11" fill="#4a3651" opacity=".42" />
      <circle cx={88 + look.x} cy={96 + look.y} r="4.5" fill="#fff" />
      <circle cx={118 + look.x} cy={95 + look.y} r="4.5" fill="#fff" />
      <circle cx={95 + look.x} cy={108 + look.y} r="2" fill="#bfe9ff" />
      <circle cx={125 + look.x} cy={107 + look.y} r="2" fill="#bfe9ff" />
      <ellipse cx="79" cy="118" rx="7" ry="4" fill="#f19aa8" opacity=".7" />
      <ellipse cx="132" cy="117" rx="7" ry="4" fill="#f19aa8" opacity=".7" />
      <path d="M96 120c6 7 16 7 23-1" stroke="#342033" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M89 76C77 57 63 55 54 64M120 76c9-21 25-28 38-21" stroke="#342033" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="53" cy="64" r="5" fill="#342033" />
      <circle cx="159" cy="55" r="5" fill="#342033" />
    </g>
  );
}

const institutionBeeImageAssets = {
  school: { src: "/images/institution-bees/bee-school.webp", width: 307, height: 323, alt: "Kitap tutan Fixoku okul arısı" },
  exam: { src: "/images/institution-bees/bee-course.webp", width: 303, height: 323, alt: "Açık kitap tutan taçlı Fixoku kurs arısı" },
  study: { src: "/images/institution-bees/bee-study.webp", width: 303, height: 323, alt: "Kitap yığını taşıyan Fixoku etüt arısı" },
  development: { src: "/images/institution-bees/bee-development.webp", width: 306, height: 323, alt: "Kitap yığını taşıyan taçlı Fixoku kişisel gelişim arısı" },
  academy: { src: "/images/institution-bees/bee-academy.webp", width: 309, height: 323, alt: "Takım elbiseli Fixoku akademi arısı" },
};

function InstitutionBeeIllustration({ variant, title, animated = true, className = "" }) {
  const asset = institutionBeeImageAssets[variant];

  return (
    <img
      className={`institution-reading__bee-image ${animated ? "is-static" : ""} ${className}`.trim()}
      src={asset.src}
      alt={asset.alt || title}
      width={asset.width}
      height={asset.height}
      loading="lazy"
      decoding="async"
    />
  );
}



function InstitutionCapsuleCta({ children }) {
  return (
    <a className="institution-cta-capsule" href="#kurum-basvuru-formu">
      <span>{children}</span>
    </a>
  );
}

function FieldError({ id, children }) {
  if (!children) return null;
  return <span className="institution-field-error" id={id}>{children}</span>;
}

export default function InstitutionReadingLanding() {
  const [formValues, setFormValues] = useState(initialFormValues);
  const [formErrors, setFormErrors] = useState({});
  const [formStatus, setFormStatus] = useState({ type: "idle", message: "" });
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [processExpanded, setProcessExpanded] = useState(false);
  const formStartedAt = useRef(0);
  const trackingStarted = useRef(false);

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  const updateField = (event) => {
    if (!trackingStarted.current) { trackingStarted.current = true; pushEvent("form_start", { form_id: "institution_application" }); }
    const { checked, name, type, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFormErrors((current) => ({ ...current, [name]: "" }));
    if (formStatus.type !== "idle") setFormStatus({ type: "idle", message: "" });
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    if (formStatus.type === "submitting") return;

    const validationErrors = validateApplication(formValues);
    if (Object.keys(validationErrors).length) {
      pushEvent("form_error", { form_id: "institution_application", error_count: Object.keys(validationErrors).length });
      setFormErrors(validationErrors);
      setFormStatus({ type: "error", message: "Lütfen işaretlenen alanları kontrol edin." });
      return;
    }

    setFormErrors({});
    setFormStatus({ type: "submitting", message: "Başvurunuz güvenli biçimde gönderiliyor…" });

    try {
      const response = await fetch("/api/institution-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formValues,
          startedAt: formStartedAt.current,
          route: institutionReadingLandingRoute.path,
        }),
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.ok === true) {
        pushEvent("form_success", { form_id: "institution_application" });
        setFormStatus({
          type: "success",
          message: "Başvurunuz alınmıştır. Ekibimiz sizinle iletişime geçecektir.",
        });
        return;
      }

      pushEvent("form_error", { form_id: "institution_application", response_status: response.status });
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
          message: "Başvuru şu anda gönderilemedi. Bilgileriniz korunarak formda bırakıldı.",
        });
      }
    } catch {
      pushEvent("form_error", { form_id: "institution_application", response_status: "network" });
      setFormStatus({
        type: "error",
        message: "Bağlantı kurulamadı. Bilgileriniz korunarak formda bırakıldı.",
      });
    }
  };

  const visibleInstitutionFeatures = featuresExpanded
    ? institutionFeatures
    : institutionFeatures.slice(0, 3);
  const visibleDetailedProcess = processExpanded
    ? detailedInstitutionProcess
    : detailedInstitutionProcess.slice(0, 3);

  return (
    <div className="institution-landing-page">
      <Header />
      <main>
        <section className="institution-hero" aria-labelledby="institution-landing-title">
          <div className="institution-shell institution-hero-title-block">
            <p className="institution-hero-kicker">{institutionHero.kicker}</p>
            <h1 id="institution-landing-title">{institutionReadingLandingRoute.heading}</h1>
            <p className="institution-reading__hero-subtitle" aria-label={institutionHero.subheading}>
              <span className="institution-reading__brand-fixoku">FİXOKU</span>
              <span className="institution-reading__brand-academy"> AKADEMİ</span>
              <span> İLE TANIŞIN</span>
            </p>
          </div>

          <div className="institution-shell institution-first-play-wrap">
            <div className="institution-hero-media-row">
              <SharedPromoVideo
                context="institution"
                title="Neden Fixoku?"
                label="Kurumlar için Neden Fixoku tanıtım videosunu oynat"
              />
              <img
                src="/kurumsal-egitim-uzmani.png"
                alt="Fixoku kurumsal eğitim danışmanı"
                className="institution-hero-expert-image"
              />
            </div>
          </div>

          <div className="institution-shell institution-hero-description">
            <article className="institution-intro-primary-card" data-intro-card="primary">
              <span className="institution-intro-quote" aria-hidden="true">F</span>
              <span className="institution-intro-card-icon"><InstitutionTopicIcon type="analytics" /></span>
              <p><InstitutionBrandText>{institutionHero.paragraphs[0]}</InstitutionBrandText></p>
            </article>
            <div className="institution-intro-support-grid">
              {institutionHero.paragraphs.slice(1).map((paragraph, index) => (
                <article className={`institution-intro-support-card support-${index + 1}`} data-intro-card="supporting" key={paragraph}>
                  <span className="institution-intro-card-icon"><InstitutionTopicIcon type={index === 0 ? "presentation" : "focus"} /></span>
                  <p><InstitutionBrandText>{paragraph}</InstitutionBrandText></p>
                </article>
              ))}
            </div>
            <InstitutionCapsuleCta>{institutionHero.cta}</InstitutionCapsuleCta>
          </div>
        </section>

        <section className="institution-types-section" id="kurumlarda-uygulama" aria-labelledby="institution-types-title">
          <div className="institution-shell">
            <header className="institution-dark-heading">
              <h2 id="institution-types-title"><InstitutionBrandText>{institutionTypesIntro.title}</InstitutionBrandText></h2>
              <p><InstitutionBrandText>{institutionTypesIntro.text}</InstitutionBrandText></p>
            </header>
            <div className="institution-circle-graph" data-institution-circle-count={institutionTypes.length}>
              {institutionTypes.map((item) => {
                const beeVariant = institutionBeeVariantByType[item.id];
                return (
                <article className={`institution-type-card is-${beeVariant}`} key={item.id} data-institution-type={item.id}>
                  <div className="institution-circle-face">
                    <InstitutionBeeIllustration
                      variant={beeVariant}
                      title={`${item.title} için ${beeVariant} temalı eğitim arısı`}
                    />
                  </div>
                  <h3>{item.title}</h3>
                  <p><InstitutionBrandText>{item.text}</InstitutionBrandText></p>
                </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="institution-benefits-section" aria-labelledby="institution-benefits-title">
          <div className="institution-benefit-band">
            <div className="institution-shell">
              <h2 id="institution-benefits-title"><InstitutionBrandText>FİXOKU AKADEMİ</InstitutionBrandText><br />KURUMUNUZA NE KAZANDIRIR?</h2>
            </div>
          </div>
          <div className="institution-shell">
            <div className="institution-benefit-cards" data-benefit-count={institutionBenefits.length}>
              {institutionBenefits.map((item, index) => (
                <article key={item.id} data-institution-benefit={item.id}>
                  <div className="institution-benefit-card-topline">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span className="institution-benefit-icon"><InstitutionTopicIcon type={institutionBenefitIcons[index]} /></span>
                  </div>
                  <h3>{item.title}</h3>
                  <p><InstitutionBrandText>{item.text}</InstitutionBrandText></p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="institution-features-section" aria-labelledby="institution-choice-title">
          <div className="institution-shell">
            <header className="institution-choice-heading">
              <h2 id="institution-choice-title"><InstitutionBrandText>{institutionChoice.title}</InstitutionBrandText></h2>
              <p><InstitutionBrandText>{institutionChoice.text}</InstitutionBrandText></p>
            </header>

            <div
              className="institution-feature-bars institution-feature-cards"
              id="institution-feature-list"
              data-feature-count={institutionFeatures.length}
              data-visible-feature-count={visibleInstitutionFeatures.length}
              data-disclosure-state={featuresExpanded ? "expanded" : "collapsed"}
            >
              {visibleInstitutionFeatures.map((item, index) => (
                <article
                  className={!featuresExpanded && index === 2 ? "is-preview" : ""}
                  key={item.id}
                  data-institution-feature={item.id}
                  data-feature-visibility={!featuresExpanded && index === 2 ? "partial" : "full"}
                >
                  <span className="institution-feature-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p><InstitutionBrandText>{item.text}</InstitutionBrandText></p>
                  </div>
                </article>
              ))}
            </div>
            <button
              className="institution-disclosure-button"
              type="button"
              aria-expanded={featuresExpanded}
              aria-controls="institution-feature-list"
              onClick={() => setFeaturesExpanded((current) => !current)}
            >
              {featuresExpanded ? "DAHA AZ GÖSTER" : "TÜM ÖZELLİKLERİ GÖR"}
            </button>

            <SharedPromoVideo
              context="institution"
              title="Neden Fixoku?"
              label="Fixoku Akademi özellik tanıtım videosunu oynat"
            />
          </div>
        </section>

        <section className="institution-honeycomb-section" aria-labelledby="institution-honeycomb-title">
          <div className="institution-shell">
            <h2 id="institution-honeycomb-title" className="institution-visually-hidden">İlk Görünen Güçlü Maddeler</h2>
            <div className="institution-honeycomb" data-honeycomb-count={institutionFeatureSummaries.length}>
              <div className="institution-honeycomb-center"><span>İLK GÖRÜNEN<br />GÜÇLÜ<br />MADDELER</span></div>
              {institutionFeatureSummaries.map((item, index) => (
                <article className={`institution-hexagon hexagon-${index + 1}`} key={item.id} data-feature-summary={item.id}>
                  <span><InstitutionBrandText>{item.title}</InstitutionBrandText></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="institution-short-process-section" aria-labelledby="institution-short-process-title">
          <div className="institution-shell">
            <h2 id="institution-short-process-title"><span>FİXOKU SİSTEMİ</span> NASIL UYGULANIR?</h2>
            <ol className="institution-arrow-process" data-process-steps={shortInstitutionProcess.length}>
              {shortInstitutionProcess.map((step, index) => (
                <li className={`arrow-step-${index + 1}`} key={step.id}>
                  <span className="institution-arrow-number"><b>{index + 1}</b></span>
                  <div className="institution-arrow-body">
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                  <i aria-hidden="true" />
                </li>
              ))}
            </ol>
            <div className="institution-process-line" aria-hidden="true">
              {shortInstitutionProcess.map((step, index) => <span className={`institution-process-line-${index + 1}`} key={step.id} />)}
            </div>
          </div>
        </section>

        <section className="institution-detailed-process-section" aria-labelledby="institution-detailed-process-title">
          <div className="institution-shell">
            <header className="institution-detailed-heading">
              <h2 id="institution-detailed-process-title"><InstitutionBrandText>{detailedProcessIntro.title}</InstitutionBrandText></h2>
              <p><InstitutionBrandText>{detailedProcessIntro.text}</InstitutionBrandText></p>
            </header>
            <ol
              className="institution-detailed-process"
              id="institution-detailed-process-list"
              data-process-steps={detailedInstitutionProcess.length}
              data-visible-process-count={visibleDetailedProcess.length}
              data-disclosure-state={processExpanded ? "expanded" : "collapsed"}
            >
              {visibleDetailedProcess.map((step, index) => (
                <li
                  className={!processExpanded && index === 2 ? "is-preview" : ""}
                  key={step.id}
                  data-institution-process={step.id}
                  data-process-visibility={!processExpanded && index === 2 ? "partial" : "full"}
                >
                  <span className="institution-process-card-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className="institution-process-card-label">UYGULAMA ADIMI</span>
                    <h3>{step.title}</h3>
                    <p><InstitutionBrandText>{step.text}</InstitutionBrandText></p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              className="institution-disclosure-button institution-process-disclosure"
              type="button"
              aria-expanded={processExpanded}
              aria-controls="institution-detailed-process-list"
              onClick={() => setProcessExpanded((current) => !current)}
            >
              {processExpanded ? "DAHA AZ GÖSTER" : "TÜM ADIMLARI GÖR"}
            </button>

            <p className="institution-closing-copy"><InstitutionBrandText>{institutionClosing.text}</InstitutionBrandText></p>
            <InstitutionCapsuleCta>{institutionClosing.cta}</InstitutionCapsuleCta>
          </div>
        </section>

        <div className="institution-video-zone institution-student-stories" data-video-type="student-stories">
          <StudentStoriesSection
            className="institution-shared-stories"
            subtitle={institutionSocialProof.studentText}
          />
        </div>

        <div className="institution-video-zone institution-trainer-stories" data-video-type="trainer-stories">
          <TrainerStoriesSection
            className="institution-shared-trainers"
            subtitle={institutionSocialProof.trainerText}
          />
        </div>

        <section className="institution-application-cta-section" aria-labelledby="institution-application-cta-title">
          <div className="institution-shell">
            <h2 id="institution-application-cta-title" aria-label={institutionApplicationCta.title}>
              <span>KURUMUNUZDA </span>
              <span className="institution-reading__brand-fixoku">FİXOKU</span>
              <span> EĞİTİMİNİ UYGULAMAK İSTER MİSİNİZ?</span>
            </h2>
            <p><InstitutionBrandText>{institutionApplicationCta.text}</InstitutionBrandText></p>
            <InstitutionCapsuleCta>{institutionApplicationCta.cta}</InstitutionCapsuleCta>
          </div>
        </section>

        <section className="institution-form-section" id="kurum-basvuru-formu" aria-labelledby="institution-form-title">
          <div className="institution-shell institution-form-layout">
            <aside className="institution-form-aside">
              <span className="institution-form-kicker">Profesyonel Kurum Başvurusu</span>
              <h2 id="institution-form-title">KURUM BAŞVURU FORMU</h2>
              <p>
                Kurum yapınızı ve öğrenci grubunuzu paylaşın. Ekibimiz güncel uygulama
                seçeneklerini değerlendirmek üzere sizinle iletişime geçsin.
              </p>
              <ul>
                <li>Başvuru yalnızca sabit Fixoku alıcısına iletilir.</li>
                <li>Bilgileriniz kurum başvurusuna dönüş amacıyla kullanılır.</li>
                <li>Program kapsamı ve koşulları görüşmede netleştirilir.</li>
              </ul>
              <p className="institution-email-contact">İletişim: <strong>info@fixoku.com</strong></p>
            </aside>

            <form className="institution-application-form" data-form-id="institution_application" onSubmit={submitApplication} noValidate>
              <div className="institution-form-grid">
                <div className="institution-form-field">
                  <label htmlFor="institution-full-name">Ad Soyad</label>
                  <input id="institution-full-name" name="fullName" value={formValues.fullName} onChange={updateField} autoComplete="name" required maxLength="100" aria-invalid={Boolean(formErrors.fullName)} aria-describedby={formErrors.fullName ? "institution-full-name-error" : undefined} />
                  <FieldError id="institution-full-name-error">{formErrors.fullName}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-name">Kurum Adı</label>
                  <input id="institution-name" name="institutionName" value={formValues.institutionName} onChange={updateField} autoComplete="organization" required maxLength="140" aria-invalid={Boolean(formErrors.institutionName)} aria-describedby={formErrors.institutionName ? "institution-name-error" : undefined} />
                  <FieldError id="institution-name-error">{formErrors.institutionName}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-email">E-posta Adresi</label>
                  <input id="institution-email" name="email" type="email" value={formValues.email} onChange={updateField} autoComplete="email" required maxLength="160" aria-invalid={Boolean(formErrors.email)} aria-describedby={formErrors.email ? "institution-email-error" : undefined} />
                  <FieldError id="institution-email-error">{formErrors.email}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-phone">Telefon Numarası</label>
                  <input id="institution-phone" name="phone" type="tel" value={formValues.phone} onChange={updateField} autoComplete="tel" required maxLength="24" aria-invalid={Boolean(formErrors.phone)} aria-describedby={formErrors.phone ? "institution-phone-error" : undefined} />
                  <FieldError id="institution-phone-error">{formErrors.phone}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-city">İl</label>
                  <input id="institution-city" name="city" value={formValues.city} onChange={updateField} autoComplete="address-level1" required maxLength="80" aria-invalid={Boolean(formErrors.city)} aria-describedby={formErrors.city ? "institution-city-error" : undefined} />
                  <FieldError id="institution-city-error">{formErrors.city}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-district">İlçe</label>
                  <input id="institution-district" name="district" value={formValues.district} onChange={updateField} autoComplete="address-level2" required maxLength="80" aria-invalid={Boolean(formErrors.district)} aria-describedby={formErrors.district ? "institution-district-error" : undefined} />
                  <FieldError id="institution-district-error">{formErrors.district}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-type">Kurum Türü</label>
                  <select id="institution-type" name="institutionType" value={formValues.institutionType} onChange={updateField} required aria-invalid={Boolean(formErrors.institutionType)} aria-describedby={formErrors.institutionType ? "institution-type-error" : undefined}>
                    <option value="">Seçiniz</option>
                    {institutionTypeOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                  </select>
                  <FieldError id="institution-type-error">{formErrors.institutionType}</FieldError>
                </div>
                <div className="institution-form-field">
                  <label htmlFor="institution-student-count">Yaklaşık Öğrenci Sayısı</label>
                  <input id="institution-student-count" name="studentCount" type="number" min="0" max="100000" step="1" value={formValues.studentCount} onChange={updateField} required aria-invalid={Boolean(formErrors.studentCount)} aria-describedby={formErrors.studentCount ? "institution-student-count-error" : undefined} />
                  <FieldError id="institution-student-count-error">{formErrors.studentCount}</FieldError>
                </div>
                <div className="institution-form-field institution-form-field-full">
                  <label htmlFor="institution-message">Mesaj</label>
                  <textarea id="institution-message" name="message" value={formValues.message} onChange={updateField} required minLength="10" maxLength="2000" rows="6" aria-invalid={Boolean(formErrors.message)} aria-describedby={formErrors.message ? "institution-message-error" : undefined} />
                  <FieldError id="institution-message-error">{formErrors.message}</FieldError>
                </div>
                <div className="institution-honeypot" aria-hidden="true">
                  <label htmlFor="institution-website">Web sitesi</label>
                  <input id="institution-website" name="website" value={formValues.website} onChange={updateField} tabIndex="-1" autoComplete="off" />
                </div>
                <div className="institution-form-field institution-form-field-full institution-consent-field">
                  <label htmlFor="institution-consent">
                    <input id="institution-consent" name="consent" type="checkbox" checked={formValues.consent} onChange={updateField} required aria-invalid={Boolean(formErrors.consent)} aria-describedby={formErrors.consent ? "institution-consent-error" : undefined} />
                    <span>
                      Kişisel verilerimin kurum başvuruma dönüş yapılması amacıyla işlenmesine ilişkin <a href="/kvkk" target="_blank" rel="noreferrer">aydınlatma metnini</a> okudum.
                    </span>
                  </label>
                  <FieldError id="institution-consent-error">{formErrors.consent}</FieldError>
                </div>
              </div>

              <button className="institution-submit-button" type="submit" disabled={formStatus.type === "submitting"}>
                {formStatus.type === "submitting" ? "Gönderiliyor…" : "KURUMUM İÇİN BİLGİ ALMAK İSTİYORUM"}
              </button>
              {formStatus.message && (
                <p className={`institution-form-status is-${formStatus.type}`} role={formStatus.type === "success" ? "status" : "alert"} aria-live="polite">
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