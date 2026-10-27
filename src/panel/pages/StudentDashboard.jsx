import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import ProgressCircle from "../components/ProgressCircle";
import AreaChartCard from "../components/AreaChartCard";
import CategoryCard from "../components/CategoryCard";
import { dailyTasks, liveFeed, studentCategories, studentTrend } from "../data/mockData";

export default function StudentDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Öğrenci Yazılım Paneli"
      subtitle="Okuma hızı, anlama, dikkat ve 21 günlük gelişim sürecin burada."
    >
      <section className="fx-dashboard-grid">
        <div className="fx-left-stack">
          <section className="fx-hero-card">
            <div className="fx-hero-content">
              <span>Bugünkü Eğitim Durumu</span>
              <h2>3. gün odaklanma egzersizi devam ediyor.</h2>
              <p>Hedef: 30 dakika çalışma, 4 egzersiz ve 1 anlama testi.</p>
              <div className="fx-hero-actions">
                <button>Çalışmaya Devam Et</button>
                <button className="ghost">Raporu Gör</button>
              </div>
            </div>
            <ProgressCircle value={64} label="Bugün" />
          </section>

          <section className="fx-stats-grid">
            <StatCard title="İlk Okuma Hızı" value="186" sub="kelime/dk" />
            <StatCard title="Son Okuma Hızı" value="412" sub="+%121 gelişim" accent="purple" />
            <StatCard title="İlk Anlama" value="%54" sub="başlangıç" accent="blue" />
            <StatCard title="Son Anlama" value="%86" sub="+%32 artış" accent="green" />
          </section>

          <AreaChartCard title="Okuma & Anlama Gelişimi" subtitle="Son 12 ölçüm" data={studentTrend} />

          <section className="fx-category-grid">
            {studentCategories.map((item) => (
              <CategoryCard key={item.title} item={item} />
            ))}
          </section>
        </div>

        <aside className="fx-right-stack">
          <article className="fx-rank-card">
            <span>Türkiye Sıralaması</span>
            <strong>128</strong>
            <p>3.280 öğrenci içinde</p>
          </article>

          <article className="fx-task-card">
            <div className="fx-card-head">
              <div>
                <span>21 Günlük Plan</span>
                <h3>Günlük Görevler</h3>
              </div>
              <p>5 adım</p>
            </div>

            <div className="fx-task-list">
              {dailyTasks.map((task) => (
                <div className={`fx-task-item ${task.status}`} key={task.day}>
                  <b>{task.day}</b>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.status === "locked" ? "Kilitli" : `Puan: ${task.score}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="fx-feed-card">
            <div className="fx-card-head">
              <div>
                <span>Canlı Akış</span>
                <h3>Son Hareketler</h3>
              </div>
            </div>

            <div className="fx-feed-list">
              {liveFeed.map((item, index) => (
                <div className="fx-feed-item" key={item}>
                  <i>{index + 1}</i>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </DashboardLayout>
  );
}
