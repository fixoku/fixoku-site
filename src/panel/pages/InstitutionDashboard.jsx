import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import AreaChartCard from "../components/AreaChartCard";
import { roleCards } from "../data/mockData";

export default function InstitutionDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Kurum Paneli"
      subtitle="Kurum genelindeki öğretmen, sınıf ve öğrenci performanslarını takip et."
    >
      <section className="fx-stats-grid">
        {roleCards.institution.map((card, index) => (
          <StatCard key={card.title} {...card} accent={["orange", "purple", "green", "blue"][index]} />
        ))}
      </section>

      <section className="fx-two-column">
        <AreaChartCard title="Kurum Kullanım Grafiği" subtitle="Aylık aktiflik" data={[32, 45, 51, 66, 69, 75, 82, 88]} />
        <article className="fx-table-card">
          <div className="fx-card-head">
            <div><span>Sınıflar</span><h3>Performans Özeti</h3></div>
          </div>
          {["5. Sınıf", "6. Sınıf", "7. Sınıf", "8. Sınıf"].map((name, i) => (
            <div className="fx-table-row" key={name}>
              <strong>{name}</strong>
              <span>{["%72", "%81", "%77", "%86"][i]}</span>
              <button>Rapor</button>
            </div>
          ))}
        </article>
      </section>
    </DashboardLayout>
  );
}
