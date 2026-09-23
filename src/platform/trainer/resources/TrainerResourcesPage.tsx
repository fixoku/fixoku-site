import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrainerHeading } from "../components/TrainerVisual";
import { resourceCovers } from "../components/trainerAssets";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon as PanelIcon } from "../components/TrainerIcon";
import "./trainer-resources.css";

type TrainerResource = {
  id: string;
  title: string;
  description: string;
  type: string;
  access: "AVAILABLE" | "LOCKED";
  reason: string | null;
};

function resourceIcon(type: string): "book" | "certificate" | "image" {
  return type === "CERTIFICATE" ? "certificate" : type === "CATALOG" ? "book" : "image";
}

export function TrainerResourcesPage({ user }: { user: { id: string; name: string; email: string } }) {
  const [items, setItems] = useState<TrainerResource[]>([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    fetch("/api/trainer/resources", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw Error();
        setItems((await response.json()).resources);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return <PanelShell user={user}>
    <main className="trainer-resources-page">
      <div className="resources-heading">
        <TrainerHeading title="Eğitmen Kaynakları" description="Eğitim sürecinizde kullanabileceğiniz güncel Fixoku kaynaklarına bu alandan ulaşabilirsiniz." />
        <img className="resources-hero-art" src="/images/teacher-panel/banners/trainer-trainings-hero.png" width={1180} height={308} alt="" />
      </div>
      <div className="resources-layout">
        <section className="resources-content" aria-label="Eğitmen kaynakları">
          {status === "loading" && <div className="resources-state" role="status">Kaynaklar yükleniyor…</div>}
          {status === "error" && <div className="resources-state"><h3>Kaynaklar yüklenemedi</h3><button type="button" onClick={() => location.reload()}>Tekrar dene</button></div>}
          {status === "ready" && !items.length && <div className="resources-state"><h3>Henüz yayınlanmış kaynak yok</h3></div>}
          {status === "ready" && items.length > 0 && <div className="resources-grid">
            {items.map((item) => <article className="resource-card" id={item.type === "CATALOG" ? "kataloglar" : undefined} key={item.id}>
              {resourceCovers[item.type] ? <img className="resource-cover" src={resourceCovers[item.type]} width={item.type === "CERTIFICATE" ? 586 : 584} height={450} alt={item.title} decoding="async" /> : <div className="resource-cover-placeholder"><PanelIcon name="folder" size={48} /></div>}
              <div className="resource-copy">
                <span className="resource-icon"><PanelIcon name={resourceIcon(item.type)} size={40} /></span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <button type="button" className="resource-cta" disabled title={item.reason || "Kaynak görüntüleme henüz etkin değil."}>Görüntüle<PanelIcon name="arrow" size={22} /></button>
                <small>{item.access === "AVAILABLE" ? "Kaynak görüntüleme henüz etkin değil." : item.reason || "Bu kaynağa erişiminiz bulunmuyor."}</small>
              </div>
            </article>)}
          </div>}
        </section>
        <aside className="resources-rail" aria-label="Kaynak bilgileri">
          <section className="resources-rail-card resources-current">
            <header><span className="resources-rail-icon"><PanelIcon name="file" size={35} /></span><h3>Güncel Kaynaklar</h3></header>
            <p>Sizin için hazırlanan en güncel doküman, katalog ve tanıtım materyallerine bu alandan ulaşabilirsiniz.</p>
            <div className="resources-information"><PanelIcon name="info" size={29} /><div><h4>Bilgilendirme</h4><p>Kaynaklar düzenli olarak güncellenmektedir.</p></div></div>
          </section>
          <section className="resources-rail-card resources-quick-access">
            <header><PanelIcon name="bolt" size={41} /><div><h3>Hızlı Erişim</h3><p>Sık kullandığınız kaynaklara hızlıca ulaşın.</p></div></header>
            <Link to="/panel/egitmen/sunumlarim"><PanelIcon name="presentation" size={24} /><span>Sunumlarıma git</span><PanelIcon name="arrow" size={17} /></Link>
            <a href="#kataloglar"><PanelIcon name="folder" size={24} /><span>Kataloglara git</span><PanelIcon name="arrow" size={17} /></a>
          </section>
        </aside>
      </div>
      <img className="resources-bottom-banner" src="/images/teacher-panel/banners/trainer-resources-bottom.png" width={2578} height={234} alt="Bilgi paylaştıkça güçlenir. Fixoku ile bilgi, daha fazla öğrenciye ulaşır, daha parlak yarınlara dönüşür." />
    </main>
  </PanelShell>;
}
