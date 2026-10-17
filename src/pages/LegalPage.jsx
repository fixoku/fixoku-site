import Breadcrumbs from "../components/content/Breadcrumbs.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

const relatedLegalLinks = {
  "/kvkk-aydinlatma-metni": [
    { path: "/acik-riza", label: "Açık Rıza" },
    { path: "/cocuk-ve-kanuni-temsilci-bilgilendirme", label: "Çocuk ve Kanuni Temsilci Bilgilendirme" },
    { path: "/egitmen-kvkk-aydinlatma", label: "Eğitmen KVKK Aydınlatma" },
    { path: "/veri-sahibi-basvuru-formu", label: "Veri Sahibi Başvuru Formu" },
  ],
  "/on-bilgilendirme-formu": [
    { path: "/dijital-icerik-ve-hizmet-kosullari", label: "Dijital İçerik ve Hizmet Koşulları" },
    { path: "/satici-bilgileri", label: "Satıcı Bilgileri" },
    { path: "/musteri-sikayetleri-ve-uyusmazlik", label: "Müşteri Şikâyetleri ve Uyuşmazlık" },
  ],
  "/gizlilik-politikasi": [
    { path: "/ticari-elektronik-ileti", label: "Ticari Elektronik İleti Bilgilendirmesi" },
  ],
};

export default function LegalPage({ page }) {
  const related = relatedLegalLinks[page.path] ?? [];
  return (
    <div className="page quick-reading-page legal-page">
      <Header />
      <main className="quick-reading-main">
        <header className="content-hero">
          <div className="content-shell content-hero-inner">
            <Breadcrumbs
              items={[
                { label: "Ana Sayfa", path: "/" },
                { label: page.heading, path: page.path },
              ]}
            />
            <div className="content-eyebrow">{page.eyebrow}</div>
            <h1>{page.heading}</h1>
  <p className="legal-updated-at">{"Son güncelleme: " + page.updatedAt}</p>
            <p className="content-summary">{page.summary}</p>
            <div className="content-reading-time" aria-label={`Tahmini okuma süresi ${page.readingTime}`}>
              <span aria-hidden="true">◷</span>
              Tahmini okuma süresi: {page.readingTime}
            </div>
          </div>
        </header>

        <div className="content-shell content-layout legal-content-layout">
          <article className="content-article legal-content-article">
            {page.sections.map((section) => (
              <section className="content-section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
              {related.length > 0 && (
                <nav className="content-section legal-related-documents" aria-label="İlgili hukuki belgeler">
                  <h2>İlgili hukuki belgeler</h2>
                  <ul>
                    {related.map(({ path, label }) => (
                      <li key={path}><a href={path}>{label}</a></li>
                    ))}
                  </ul>
                </nav>
              )}
          </article>
        </div>
      </main>
      <Footer showCta={false} />
    </div>
  );
}
