export default function ProgressCircle({ value = 0, label = "Tamamlandı", size = "large" }) {
  return (
    <div className={`fx-progress-circle fx-progress-${size}`}>
      <div className="fx-progress-ring" style={{ "--value": `${value}%` }}>
        <div>
          <strong>%{value}</strong>
          <small>{label}</small>
        </div>
      </div>
    </div>
  );
}
