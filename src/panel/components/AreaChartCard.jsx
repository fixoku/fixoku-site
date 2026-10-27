export default function AreaChartCard({ title, subtitle, data = [] }) {
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - value;
    return `${x},${y}`;
  }).join(" ");

  return (
    <article className="fx-chart-card">
      <div className="fx-card-head">
        <div>
          <span>Gelişim Grafiği</span>
          <h3>{title}</h3>
        </div>
        <p>{subtitle}</p>
      </div>

      <div className="fx-chart-wrap">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fxAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline className="fx-chart-line" points={points} />
          <polygon className="fx-chart-area" points={`0,100 ${points} 100,100`} />
        </svg>
      </div>
    </article>
  );
}
