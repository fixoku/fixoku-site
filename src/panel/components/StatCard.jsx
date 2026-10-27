export default function StatCard({ title, value, sub, accent = "orange" }) {
  return (
    <article className={`fx-stat-card fx-accent-${accent}`}>
      <div className="fx-stat-glow" />
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}
