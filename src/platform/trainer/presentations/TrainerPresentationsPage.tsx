import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrainerHeading } from "../components/TrainerVisual";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon as PanelIcon } from "../components/TrainerIcon";
import "./trainer-presentations.css";

type Presentation = {
  id: string;
  title: string;
  description: string;
  program: string | null;
  access: "AVAILABLE" | "LOCKED";
  slideCount: number | null;
  videoCount: number | null;
  reason: string | null;
};

function presentationAsset(item: Presentation) {
  const identity = (item.program || item.title).toLocaleLowerCase("tr-TR");
  const file = identity.includes("akici") || identity.includes("akıcı") ? "akici-okuma-sunumu"
    : identity.includes("ortaokul") ? "ortaokul-hizli-okuma-sunumu"
    : identity.includes("paragraf") ? "paragraf-egitimi-sunumu"
    : identity.includes("yetiskin") || identity.includes("yetişkin") ? "yetiskin-hizli-okuma-sunumu" : null;
  return file ? { src: `/images/teacher-panel/presentations/${file}.png`, width: file.startsWith("ortaokul") || file.startsWith("yetiskin") ? 414 : 412 } : null;
}

export function TrainerPresentationsPage({ user }: { user: { id: string; name: string; email: string } }) {
  const [items, setItems] = useState<Presentation[]>([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    fetch("/api/trainer/presentations", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const data = await response.json();
        const rank = (item: Presentation) => { const identity = (item.program || item.title).toLocaleLowerCase("tr-TR"); return identity.includes("akıcı") || identity.includes("akici") ? 0 : identity.includes("ortaokul") ? 1 : identity.includes("paragraf") ? 2 : 3; };
        setItems([...data.presentations].sort((a, b) => rank(a) - rank(b)));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return <PanelShell user={user}>
    <main className="trainer-presentations-page">
      <div className="presentations-heading">
        <TrainerHeading title="Sunumlarım" description="Eğitimlerinizde kullanacağınız güncel Fixoku sunumlarına bu alandan ulaşabilirsiniz. Sunumlar yalnızca Eğitmen Paneli üzerinden görüntülenir." />
        <img className="presentations-hero-art" src="/images/teacher-panel/banners/trainer-trainings-hero.png" width={1180} height={308} alt="" />
      </div>
      <div className="presentations-layout">
        <section className="presentations-content" aria-label="Sunum listesi">
          {status === "loading" && <div className="presentations-state" role="status">Sunumlar yükleniyor…</div>}
          {status === "error" && <div className="presentations-state"><h3>Sunumlar yüklenemedi</h3><button type="button" onClick={() => location.reload()}>Tekrar dene</button></div>}
          {status === "ready" && !items.length && <div className="presentations-state"><h3>Henüz yayınlanmış sunum yok</h3><p>Yeni sunumlar yayınlandığında burada görünecek.</p></div>}
          {status === "ready" && items.length > 0 && <div className="presentations-grid">
            {items.map((item) => {
              const asset = presentationAsset(item);
              return <article className="presentation-card" key={item.id}>
                {asset ? <img className="presentation-cover" src={asset.src} width={asset.width} height={434} alt={item.title} decoding="async" /> : <div className="presentation-cover-placeholder"><PanelIcon name="presentation" size={48} /></div>}
                <div className="presentation-copy">
                  <span className={`presentation-status ${item.access.toLowerCase()}`}><PanelIcon name={item.access === "AVAILABLE" ? "check" : "lock"} size={12} /> {item.access === "AVAILABLE" ? "Erişim Açık" : "Kilitli"}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="presentation-meta"><span><PanelIcon name="presentation" size={17} />{item.slideCount ?? "—"} slayt</span><span><PanelIcon name="video" size={17} />{item.videoCount ?? "—"} video</span></div>
                  <button type="button" className={`presentation-cta ${item.access.toLowerCase()}`} disabled title={item.reason || "Sunum görüntüleme henüz etkin değil."}>Sunumu Aç<PanelIcon name="arrow" size={19} /></button>
                  <small>{item.access === "AVAILABLE" ? "Sunum görüntüleme henüz etkin değil." : item.reason || "Bu sunuma erişiminiz bulunmuyor."}</small>
                </div>
              </article>;
            })}
          </div>}
        </section>
        <aside className="presentations-rail" aria-label="Sunum bilgileri">
          <section className="presentations-rail-card"><span className="presentations-rail-icon"><PanelIcon name="presentation" size={32} /></span><div><h3>Güncel Sunum Erişimi</h3><p>Satın aldığınız eğitimlere ait en güncel sunumlara bu alandan ulaşabilirsiniz.</p></div></section>
          <section className="presentations-rail-card"><span className="presentations-rail-icon"><PanelIcon name="info" size={32} /></span><div><h3>Bilgilendirme</h3><p>Sunumlar indirilemez; yalnızca panel üzerinden görüntülenir.</p></div></section>
          <section className="presentations-rail-card presentations-quick-access"><header><PanelIcon name="bolt" size={31} /><h3>Hızlı Erişim</h3></header><Link to="/panel/egitmen/egitimlerim"><PanelIcon name="book" size={24} /><span>Eğitimlerime git</span><PanelIcon name="arrow" size={17} /></Link><Link to="/panel/egitmen/kaynaklarim"><PanelIcon name="folder" size={24} /><span>Eğitmen kaynaklarına git</span><PanelIcon name="arrow" size={17} /></Link></section>
        </aside>
      </div>
      <img className="presentations-bottom-banner" src="/images/teacher-panel/banners/trainer-presentations-bottom.png" width={2570} height={214} alt="Bilgiyi paylaşmak geleceği çoğaltır. Fixoku ile daha fazla öğrenciye ulaş, daha güçlü yarınlara katkı sağla." />
    </main>
  </PanelShell>;
}
