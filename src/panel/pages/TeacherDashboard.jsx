import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import AreaChartCard from "../components/AreaChartCard";
import { roleCards } from "../data/mockData";

export default function TeacherDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Öğretmen Paneli"
      subtitle="Öğrencilerini takip et, egzersiz ata ve gelişim raporlarını incele."
    >
      <section className="fx-stats-grid">
        {roleCards.teacher.map((card, index) => (
          <StatCard key={card.title} {...card} accent={["orange", "purple", "green", "blue"][index]} />
        ))}
      </section>

      <section className="fx-two-column">
        <AreaChartCard title="Sınıf Başarı Trendi" subtitle="Son 8 hafta" data={[40, 48, 54, 59, 63, 70, 76, 82]} />
        <article className="fx-table-card">
          <div className="fx-card-head">
            <div><span>Öğrenciler</span><h3>Yakın Takip Listesi</h3></div>
          </div>
          {["Ali Asaf", "Ece Nur", "Mert Kaya", "Zeynep Ak"].map((name, i) => (
            <div className="fx-table-row" key={name}>
              <strong>{name}</strong>
              <span>{["%86", "%74", "%68", "%91"][i]}</span>
              <button>İncele</button>
            </div>
          ))}
        </article>
      </section>
    </DashboardLayout>
  );
}
