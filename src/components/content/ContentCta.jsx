import { Link } from "react-router-dom";

export default function ContentCta({ cta }) {
  return (
    <section className="content-cta" aria-labelledby="content-cta-title">
      <div>
        <div className="content-section-kicker">Sonraki adım</div>
        <h2 id="content-cta-title">{cta.title}</h2>
        <p>{cta.text}</p>
      </div>
      <div className="content-cta-actions">
        <Link to={cta.primary.to} className="content-button content-button-primary">
          {cta.primary.label}
        </Link>
        {cta.secondary && (
          <Link to={cta.secondary.to} className="content-button content-button-secondary">
            {cta.secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}
