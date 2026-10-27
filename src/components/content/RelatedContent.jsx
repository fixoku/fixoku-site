import { Link } from "react-router-dom";

export default function RelatedContent({ contentByPath, paths }) {
  const relatedPages = paths.map((path) => contentByPath[path]).filter(Boolean);

  if (!relatedPages.length) {
    return null;
  }

  return (
    <section className="related-content" aria-labelledby="related-content-title">
      <div className="content-section-kicker">İlgili içerikler</div>
      <h2 id="related-content-title">Okumaya devam edin</h2>
      <div className="related-content-grid">
        {relatedPages.map((page) => (
          <Link to={page.path} className="related-content-card" key={page.path}>
            <span>{page.eyebrow}</span>
            <strong>{page.heading}</strong>
            <small>İçeriği incele →</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
