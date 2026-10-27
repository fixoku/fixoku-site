export default function CategoryCard({ item }) {
  return (
    <article className={`fx-category-card fx-cat-${item.tone}`}>
      <div className="fx-category-top">
        <h3>{item.title}</h3>
        <span>%{item.progress}</span>
      </div>

      <div className="fx-category-value">
        <strong>{item.value}</strong>
        <small>{item.suffix}</small>
      </div>

      <div className="fx-category-bar">
        <i style={{ width: `${item.progress}%` }} />
      </div>

      <button type="button">Detayları Aç</button>
    </article>
  );
}
