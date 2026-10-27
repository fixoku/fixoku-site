export default function ContentTableOfContents({ sections }) {
  return (
    <aside className="content-toc" aria-label="İçindekiler">
      <strong>Bu sayfada</strong>
      <nav aria-label="Sayfa içi bağlantılar">
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
