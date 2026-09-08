import Breadcrumbs from "../components/content/Breadcrumbs.jsx";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

export default function LegalPage({ page }) {
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
          </article>
        </div>
      </main>
      <Footer showCta={false} />
    </div>
  );
}
