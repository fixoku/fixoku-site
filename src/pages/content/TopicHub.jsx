import { Link } from "react-router-dom";
import ContentCta from "../../components/content/ContentCta.jsx";
import ContentPageLayout from "../../components/content/ContentPageLayout.jsx";

function TopicCard({ card }) {
  const content = (
    <>
      <span>{card.eyebrow}</span>
      <strong>{card.heading}</strong>
      <p>{card.summary}</p>
      <small>{card.cardLabel ?? card.statusLabel ?? "İçeriği incele →"}</small>
    </>
  );

  if (card.path) {
    return (
      <Link to={card.path} className="content-hub-card">
        {content}
      </Link>
    );
  }

  return <div className="content-hub-card content-hub-card-static">{content}</div>;
}

function ContentItems({ items = [], className = "" }) {
  return (
    <>
      {items.map((paragraph, index) => (
        <p className={className || undefined} key={`${className || "paragraph"}-${index}`}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function ContentBullets({ bullets = [] }) {
  if (!bullets.length) return null;

  return (
    <ul>
      {bullets.map((item, index) => (
        <li key={`bullet-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function ContentSubsection({ subsection, sectionId, index }) {
  return (
    <div className="content-subsection" key={`${sectionId}-subsection-${index}`}>
      <h3>{subsection.title}</h3>
      <ContentItems items={subsection.paragraphs} />
      <ContentBullets bullets={subsection.bullets} />
      <ContentItems items={subsection.afterBullets} />
    </div>
  );
}

function ContentSection({ section }) {
  return (
    <section className="content-section" id={section.id}>
      <h2>{section.title}</h2>
      <ContentItems items={section.paragraphs} />
      <ContentBullets bullets={section.bullets} />
      <ContentItems items={section.afterBullets} />
      {section.subsections?.map((subsection, index) => (
        <ContentSubsection
          index={index}
          key={`${section.id}-subsection-${index}`}
          sectionId={section.id}
          subsection={subsection}
        />
      ))}
      {section.callout && <p className="content-callout">{section.callout}</p>}
      {section.closing?.map((line, index) => (
        <p className="content-closing-line" key={`${section.id}-closing-${index}`}>
          {line}
        </p>
      ))}
    </section>
  );
}

export default function TopicHub({ articles = [], hub }) {
  const hasSeparateArticleGrid = Boolean(hub.cards?.length && articles.length);
  const primaryCards = hasSeparateArticleGrid ? articles : (hub.cards ?? articles);
  const categoryCards = (hub.cards ?? []).map((card) => {
    const articleCount = articles.filter((article) => article.category === card.heading).length;

    return articleCount
      ? { ...card, statusLabel: `${articleCount} makale yayında` }
      : card;
  });

  return (
    <ContentPageLayout page={hub}>
      {hub.sections.map((section) => <ContentSection key={section.id} section={section} />)}

      {hub.showHubLinks !== false && (
        <section className="content-section content-hub-links" aria-labelledby={`${hub.slug ?? "topic"}-cards-title`}>
          <div className="content-section-kicker">{hasSeparateArticleGrid ? "Güncel makaleler" : "Konu rehberi"}</div>
          <h2 id={`${hub.slug ?? "topic"}-cards-title`}>
            {hasSeparateArticleGrid ? hub.articlesHeading : hub.cardsHeading}
          </h2>
          <p>{hasSeparateArticleGrid ? hub.articlesIntro : hub.cardsIntro}</p>
          <div className="content-hub-grid">
            {primaryCards.map((card) => (
              <TopicCard card={card} key={card.path ?? card.slug} />
            ))}
          </div>
        </section>
      )}

      {hasSeparateArticleGrid && (
        <section
          className="content-section content-hub-links"
          aria-labelledby={`${hub.slug ?? "topic"}-category-cards-title`}
        >
          <div className="content-section-kicker">Kategoriler</div>
          <h2 id={`${hub.slug ?? "topic"}-category-cards-title`}>{hub.cardsHeading}</h2>
          <p>{hub.cardsIntro}</p>
          <div className="content-hub-grid">
            {categoryCards.map((card) => (
              <TopicCard card={card} key={card.slug} />
            ))}
          </div>
        </section>
      )}

      {hub.showCta !== false && <ContentCta cta={hub.cta} />}
    </ContentPageLayout>
  );
}
