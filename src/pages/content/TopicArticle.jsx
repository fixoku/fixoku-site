import ContentCta from "../../components/content/ContentCta.jsx";
import ContentPageLayout from "../../components/content/ContentPageLayout.jsx";
import RelatedContent from "../../components/content/RelatedContent.jsx";
import SoftwareInterestForm from "../../components/content/SoftwareInterestForm.jsx";

export default function TopicArticle({ article, contentByPath }) {
  return (
    <ContentPageLayout page={article}>
      {article.sections.map((section) => (
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

      <RelatedContent contentByPath={contentByPath} paths={article.related} />
      <ContentCta cta={article.cta} />
      {article.path === "/fixoku-egitimi/yazilim" && <SoftwareInterestForm />}
    </ContentPageLayout>
  );
}
