import {
  AssessmentTestCards,
  AssessmentTestExperience,
} from "../components/assessment/AssessmentTests.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import SharedPromoVideo from "../components/SharedPromoVideo.jsx";
import StudentStoriesSection from "../components/StudentStoriesSection.jsx";
import {
  COMPLETED_FREE_TEST_COUNT,
  formatSocialProofCount,
  TRAINED_STUDENT_COUNT,
} from "../data/socialProof.js";
import "./student-reading-landing.css";

const STANDING_CHILD_IMAGE = {
  src: "/images/landing/ogrenciler-icin-hizli-okuma-egitimi/ayakta-cocuk.png",
  width: 607,
  height: 1013,
};

const SEATED_CHILD_IMAGE = {
  src: "/images/landing/ogrenciler-icin-hizli-okuma-egitimi/oturan-cocuk.png",
  width: 1405,
  height: 1120,
};

const parentQuestions = [
  "Okuması çok yavaş mı?",
  "Okuduğunu anlamakta zorlanıyor mu?",
  "Dikkati çabuk mu dağılıyor?",
  "Sınavlarda zamanı yetmiyor mu?",
];

const featureCards = [
  "Yapay Zekâ Destekli Ölçüm Sistemi",
  "126 Özel Gelişim Egzersizi",
  "9 Kategoride Gelişim Analizi",
  "Kitap + Yazılım Destekli Eğitim",
];

const testTrustItems = [
  { icon: "clock", text: "Dikkat testi yaklaşık 2 dakika" },
  { icon: "reading-time", text: "Okuma ve anlama testi yaklaşık 5 dakika" },
  { icon: "user-check", text: "Kayıt gerektirmez" },
  { icon: "check", text: "Ücretsizdir" },
];

const finalTrustItems = [
  ...testTrustItems,
  { icon: "support", text: "Uzman desteği alınabilir" },
];

const testSteps = [
  {
    title: "Testi Seçin",
    text: "Dikkat testi veya okuma ve anlama testlerinden birini seçerek başlayın.",
  },
  {
    title: "Sonucu Görün",
    text: "Test sonunda çocuğunuzun mevcut seviyesine ait ön değerlendirme sonucu ekranda görüntülenir.",
  },
  {
    title: "Uzmanla Paylaşın",
    text: "Sonucu paylaşmak isterseniz WhatsApp veya iletişim adımını kendiniz başlatabilirsiniz.",
  },
];

const measurementItems = [
  {
    title: "Okuma Hızı",
    text: "Seçilen metnin kelime sayısı ve okuma süresi üzerinden dakikadaki kelime değerini hesaplar.",
  },
  {
    title: "Anlama Oranı",
    text: "Metin sonundaki doğru cevaplar üzerinden anlama yüzdesini gösterir.",
  },
  {
    title: "Dikkat Seviyesi",
    text: "Görsel dikkat görevlerindeki doğru ve yanlış yanıtları değerlendirir.",
  },
  {
    title: "Odaklanma Becerisi",
    text: "Odaklanma görevlerindeki süreyi ve doğru yanıt performansını birlikte gösterir.",
  },
  {
    title: "Paragraf Anlama Performansı",
    text: "Ana fikir ve ayrıntı sorularındaki başarıyı gösterir.",
  },
];

function LandingIcon({ type = "focus" }) {
  if (type === "clock") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="25" r="15" stroke="currentColor" strokeWidth="3" />
        <path d="M24 17v9l6 4M18 6h12M24 6v4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "reading-time") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M7 11h10c4 0 7 2 8 5 1-3 4-5 8-5h4v22h-5c-3 0-5 1-7 3-2-2-4-3-7-3H7V11Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="35" cy="34" r="8" fill="var(--student-paper)" stroke="currentColor" strokeWidth="3" />
        <path d="M35 30v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "user-check") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="20" cy="17" r="7" stroke="currentColor" strokeWidth="3" />
        <path d="M8 38c1-8 5-12 12-12 5 0 9 2 11 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="m30 33 4 4 8-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "check") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3" />
        <path d="m15 24 6 6 13-14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "support") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M10 26v-3c0-8 6-14 14-14s14 6 14 14v3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 24h5v12h-3c-2 0-3-1-3-3v-6c0-2 0-3 1-3ZM38 24h-5v12h3c2 0 3-1 3-3v-6c0-2 0-3-1-3Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M33 37c-2 2-5 3-9 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "book") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 10h12c4 0 7 2 8 5 1-3 4-5 8-5h4v27h-6c-3 0-5 1-6 3-1-2-3-3-6-3H8V10Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 15v25" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }

  if (type === "chart") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 39V10M8 39h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="m13 31 8-8 7 5 10-13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="15" r="3" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="3" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function StudentReadingLanding() {
  return (
    <AssessmentTestExperience>
      {({ openTest }) => (
        <div className="student-landing-page">
          <Header />
          <main>
            <section className="student-test-section" aria-labelledby="student-landing-title">
              <div className="student-landing-shell student-test-heading">
                <h1 id="student-landing-title">
                  Çocuğunuzun Okuma, Anlama ve Dikkat Seviyesini Ücretsiz Ölçün
                </h1>
                <p>
                  Okuma hızı, anlama oranı, dikkat ve odaklanma becerileri için ücretsiz
                  ön değerlendirme testlerini uygulayın.
                </p>
              </div>

              <AssessmentTestCards
                className="student-landing-tests"
                id="ogrenci-testleri"
                onStartTest={openTest}
                showCounter={false}
                showDurationNotes={false}
                showHeading={false}
              />

              <div className="student-test-trust" aria-label="Test süreleri ve güven bilgileri">
                {testTrustItems.map((item, index) => (
                  <div className={`student-trust-item student-trust-item-${index + 1}`} key={item.text}>
                    <span className="student-trust-icon">
                      <LandingIcon type={item.icon} />
                    </span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="student-parent-problem">
              <div className="student-landing-shell student-problem-layout">
                <div className="student-problem-copy">
                  <span className="student-section-kicker">Mevcut durumu birlikte görün</span>
                  <h2>Çocuğunuz Ders Çalışıyor Ama Verim Alamıyor Olabilir</h2>
                  <p>
                    Bazı öğrenciler konuları bildiği hâlde sınavlarda istediği başarıyı
                    gösteremez. Bunun nedeni her zaman bilgi eksikliği değildir.
                  </p>
                  <p>
                    Yavaş okuma, dikkat dağınıklığı, okuduğunu tam anlayamama ve uzun
                    sorularda zaman kaybetme; öğrencinin akademik performansını doğrudan
                    etkileyebilir.
                  </p>
                  <p>
                    Bu ücretsiz testler, çocuğunuzun okuma, anlama, dikkat ve odaklanma
                    alanlarında mevcut durumunu görmeniz için hazırlanmıştır.
                  </p>
                </div>

                <div className="student-seated-problem-frame">
                  <img
                    src={SEATED_CHILD_IMAGE.src}
                    width={SEATED_CHILD_IMAGE.width}
                    height={SEATED_CHILD_IMAGE.height}
                    alt="Okuma, anlama ve dikkat gelişimini destekleyen öğrenci"
                    decoding="async"
                  />
                </div>

                <div className="student-question-list" aria-label="Velilerin sık gözlemlediği durumlar">
                  {parentQuestions.map((question, index) => (
                    <article className="student-question-card" key={question}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{question}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <div className="student-stories-zone">
              <StudentStoriesSection />

              <section className="student-proof-section" aria-label="Fixoku kullanım istatistikleri">
                <div className="student-landing-shell student-proof-grid">
                  <article>
                    <span className="student-proof-label">Fixoku eğitimi</span>
                    <strong>{formatSocialProofCount(TRAINED_STUDENT_COUNT)}</strong>
                    <p>öğrenci Fixoku eğitimi aldı</p>
                  </article>
                  <article>
                    <span className="student-proof-label">Ücretsiz ön değerlendirme</span>
                    <strong>{formatSocialProofCount(COMPLETED_FREE_TEST_COUNT)}</strong>
                    <p>öğrenci ücretsiz testleri çözdü</p>
                  </article>
                </div>
              </section>
            </div>

            <section className="student-why-section">
              <div className="student-landing-shell">
                <div className="student-why-copy">
                  <span className="student-section-kicker">Kitap, yazılım ve uzman desteği</span>
                  <h2>Neden Fixoku?</h2>
                  <p className="student-why-lead">
                    Okuma, anlama, dikkat ve odaklanma becerileri öğrencinin akademik
                    çalışmalarında bilgiyi etkili kullanmasına yardımcı olur.
                  </p>
                  <p>
                    Fixoku; akıcı okuma, hızlı okuma, anlama, paragraf teknikleri,
                    dikkat ve odaklanma çalışmalarını kitap, yapay zekâ destekli yazılım
                    ve uzman eğitmen desteğiyle bir araya getirir. Öğrencinin gelişimi,
                    21 günlük eğitim planındaki egzersizler ve ölçümler üzerinden takip edilir.
                  </p>
                </div>

                <div className="student-why-media-layout">
                  <SharedPromoVideo
                    context="student"
                    title="Neden Fixoku?"
                    label="Neden Fixoku öğrenci tanıtım videosunu oynat"
                  />

                  <div className="student-feature-list">
                    {featureCards.map((feature, index) => (
                      <article key={feature}>
                        <span className="student-feature-icon">
                          <LandingIcon type={index % 2 === 0 ? "chart" : "book"} />
                        </span>
                        <h3>{feature}</h3>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="student-info-section">
              <div className="student-landing-shell student-info-grid">
                <article className="student-info-column student-process-panel">
                  <span className="student-section-kicker">Üç basit adım</span>
                  <h2>Test Nasıl Çalışır?</h2>
                  <div className="student-step-list">
                    {testSteps.map((step, index) => (
                      <div key={step.title}>
                        <span>{index + 1}</span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="student-info-column student-measurements">
                  <span className="student-section-kicker">Gerçek test çıktıları</span>
                  <h2>Bu Testler Neyi Ölçer?</h2>
                  <div className="student-measurement-list">
                    {measurementItems.map((item) => (
                      <div key={item.title}>
                        <span><LandingIcon /></span>
                        <div>
                          <h3>{item.title}</h3>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="student-info-column student-result-column">
                  <span className="student-section-kicker">Kontrol sizde</span>
                  <h2>Sonucunuzu Uzmana Gönderin</h2>
                  <p>
                    Test sonucunu uzmanla değerlendirerek çocuğunuzun gelişim alanları
                    hakkında bilgi alın.
                  </p>
                  <a
                    className="student-primary-link"
                    href="https://wa.me/905334789253"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sonucumu Uzmana Gönder
                  </a>
                  <small>Paylaşım yalnızca sizin işleminizle başlar.</small>
                </article>
              </div>
            </section>

            <section className="student-final-cta">
              <div className="student-landing-shell student-final-layout">
                <div className="student-standing-final-frame">
                  <img
                    src={STANDING_CHILD_IMAGE.src}
                    width={STANDING_CHILD_IMAGE.width}
                    height={STANDING_CHILD_IMAGE.height}
                    alt="Fixoku ücretsiz seviye tespit testlerini uygulayan öğrenci"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="student-final-copy">
                  <span className="student-section-kicker">Ücretsiz ön değerlendirme</span>
                  <h2>Çocuğunuzun Seviyesini Şimdi Ücretsiz Ölçün</h2>
                  <p>Erken ölçüm, doğru yönlendirme ve güçlü gelişim için ilk adımı atın.</p>
                  <div className="student-final-actions">
                    <button type="button" onClick={() => openTest("attention")}>Dikkat Testine Başla</button>
                    <button type="button" onClick={() => openTest("reading")}>Okuma ve Anlama Testine Başla</button>
                  </div>
                  <div className="student-final-trust" role="list" aria-label="Ücretsiz test güven bilgileri">
                    {finalTrustItems.map((item) => (
                      <div className="student-final-trust-item" role="listitem" key={item.text}>
                        <span className="student-final-trust-icon">
                          <LandingIcon type={item.icon} />
                        </span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>
          <Footer showCta={false} />
        </div>
      )}
    </AssessmentTestExperience>
  );
}
