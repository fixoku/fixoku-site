import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import type { TrainerPackageRow } from "../trainings/TrainerTrainingsPage";
import "./trainer-resources.css";

function packageIcon(index: number): "book" | "chart" | "cap" {
  return index % 3 === 0 ? "book" : index % 3 === 1 ? "chart" : "cap";
}

export function TrainerResourcesPage({ user }: { user: { id: string; name: string; email: string } }) {
  const [items, setItems] = useState<TrainerPackageRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/trainer/packages", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("RESOURCES_UNAVAILABLE");
      const data = await response.json();
      setItems((data.packages || []).filter((item: TrainerPackageRow) => item.accessState === "OWNED"));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => { void load(); }, []);

  return <PanelShell user={user}>
    <main className="trainer-resources-page">
      {/* FIXOKU_020U_RESOURCES_TOP_BANNER_REMOVED */}
      {status === "loading" && <div className="resources-state" role="status">Eğitim kaynaklarınız yükleniyor…</div>}
      {status === "error" && <div className="resources-state" role="alert"><h3>Kaynaklar yüklenemedi</h3><button type="button" onClick={() => void load()}>Tekrar dene</button></div>}
      {status === "ready" && !items.length && <section className="resources-empty" aria-live="polite"><span className="resources-empty-icon"><TrainerIcon name="folder" size={38} /></span><h2>Henüz erişiminiz olan eğitim yok</h2><p>Satın aldığınız veya hak kazandığınız eğitimler burada görünecek.</p><Link to="/panel/egitmen/egitimlerim">Eğitimlerimi görüntüle <TrainerIcon name="arrow" size={18} /></Link></section>}
      {status === "ready" && items.length > 0 && <section className="resources-owned-grid" aria-label="Erişim hakkı olan eğitimler">
        {items.map((item, index) => <article className="resource-card resource-owned-card" key={item.packageId}>
          <div className="resource-owned-icon"><TrainerIcon name={packageIcon(index)} size={42} /></div>
          <div className="resource-copy"><span className="resource-owned-label">Erişim hakkınız var</span><h2>{item.title}</h2>{item.shortDescription || item.description ? <p>{item.shortDescription || item.description}</p> : null}<div className="resource-owned-meta">{item.expertiseActive ? "Uzmanlık aktif" : "Eğitim erişimi aktif"}</div><Link className="resource-cta" to={`/panel/egitmen/egitimlerim/${item.slug}`}>Eğitime Git <TrainerIcon name="arrow" size={20} /></Link></div>
        </article>)}
      </section>}
      <img className="resources-bottom-banner" src="/images/teacher-panel/banners/trainer-resources-bottom.png" width={2578} height={234} alt="Bilgi paylaştıkça güçlenir. Fixoku ile bilgi, daha fazla öğrenciye ulaşır, daha parlak yarınlara dönüşür." />
    </main>
  </PanelShell>;
}
