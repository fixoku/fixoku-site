import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import AreaChartCard from "../components/AreaChartCard";
import { roleCards } from "../data/mockData";

export default function AdminDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Admin Paneli"
      subtitle="Tüm kurumları, kullanıcıları, egzersizleri ve sistem sağlığını yönet."
    >
      <section className="fx-stats-grid">
        {roleCards.admin.map((card, index) => (
          <StatCard key={card.title} {...card} accent={["orange", "purple", "green", "blue"][index]} />
        ))}
      </section>

      <section className="fx-two-column">
        <AreaChartCard title="Platform Büyüme Grafiği" subtitle="Yeni kullanıcılar" data={[24, 36, 44, 55, 61, 73, 84, 92]} />
        <article className="fx-table-card">
          <div className="fx-card-head">
            <div><span>Sistem</span><h3>Yönetim Modülleri</h3></div>
          </div>
          {["Kurum Yönetimi", "Kullanıcı Rolleri", "Egzersiz Havuzu", "Raporlama"].map((name, i) => (
            <div className="fx-table-row" key={name}>
              <strong>{name}</strong>
              <span>{["Aktif", "Aktif", "126 içerik", "Canlı"][i]}</span>
              <button>Aç</button>
            </div>
          ))}
        </article>
      </section>
    </DashboardLayout>
  );
}
