import { useLocation } from "react-router-dom";
import Header from "../Header.jsx";
import Footer from "../Footer.jsx";
import Breadcrumbs from "./Breadcrumbs.jsx";
import ContentExplorer from "./ContentExplorer.jsx";
import ContentTableOfContents from "./ContentTableOfContents.jsx";

function getBreadcrumbs(page) {
  if (page.kind === "hub") {
    return [
      { label: "Ana Sayfa", path: "/" },
      { label: page.navLabel, path: page.path },
    ];
  }

  return [
    { label: "Ana Sayfa", path: "/" },
    {
      label: page.collectionLabel ?? "Hızlı Okuma",
      path: page.collectionPath ?? "/hizli-okuma",
    },
    { label: page.heading, path: page.path },
  ];
}

export default function ContentPageLayout({ page, children }) {
  const location = useLocation();

  return (
    <div className="page quick-reading-page">
      <Header />
      <main className="quick-reading-main">
        <header className="content-hero">
          <div className="content-shell content-hero-inner">
            <Breadcrumbs items={getBreadcrumbs(page)} />
            <div className="content-eyebrow">{page.eyebrow}</div>
            <h1>{page.heading}</h1>
            <p className="content-summary">{page.summary}</p>
            <div className="content-reading-time" aria-label={`Tahmini okuma süresi ${page.readingTime}`}>
              <span aria-hidden="true">◷</span>
              Tahmini okuma süresi: {page.readingTime}
            </div>
          </div>
        </header>

        <div className="content-shell content-layout">
          <div className="content-sidebar">
            <ContentTableOfContents sections={page.sections} />
            <ContentExplorer key={location.pathname} />
          </div>
          <article className="content-article">{children}</article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
