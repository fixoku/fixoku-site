// FIXOKU_022M_OWNER_LIVE_HOME_PACKAGES
// Only the existing public catalog is used. No demo products or unapproved drafts.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FixokuPhotoV41F, packageImageDefaultV41F } from "../../platform/admin/FixokuCatalogAssetsV41F";
import "./home-student-packages-showcase.css";

const CATEGORIES = [
  { id: "PRIMARY", name: "İlkokul" },
  { id: "MIDDLE", name: "Ortaokul" },
  { id: "HIGH", name: "Lise" },
  { id: "ADULT", name: "Yetişkin" },
  { id: "PARAGRAPH", name: "Paragraf" },
];

function categoryOf(item) {
  const slug = String(item.slug || "").toLocaleLowerCase("tr-TR");
  const name = String(item.title || "").toLocaleLowerCase("tr-TR");
  if (slug.includes("paragraf") || name.includes("paragraf")) return "PARAGRAPH";
  return ["PRIMARY", "MIDDLE", "HIGH", "ADULT"].includes(item.educationStage) ? item.educationStage : null;
}

function priceText(minor, currency) {
  if (currency !== "TRY" || minor === null || !Number.isSafeInteger(Number(minor)) || Number(minor) < 0) return "Fiyat için inceleyin";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(minor) / 100);
}

// Owner's active text items are supplied as features by the public API.
// Never invent missing bullet points or print raw objects.
function cardFeatures(item) {
  const components = Array.isArray(item.components) ? item.components : [];
  const activeComponents = components
    .filter((part) => part && part.componentType === "TEXT_ITEM" && part.isActive !== false)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const source = activeComponents.length ? activeComponents : Array.isArray(item.features) ? item.features : [];
  return source.map((part) => {
    if (typeof part === "string") return part.trim();
    if (!part || part.isActive === false) return "";
    return String(part.titleSnapshot || part.title || part.text || "").trim();
  }).filter(Boolean).slice(0, 4);
}

export default function HomeStudentPackagesShowcase() {
  const [category, setCategory] = useState("PRIMARY");
  const [packages, setPackages] = useState([]);
  const [status, setStatus] = useState("loading");
  const [navigation, setNavigation] = useState({ previous: false, next: false });
  const viewportRef = useRef(null);

  useEffect(() => {
    let active = true;
    let pending = null;
    const reload = () => {
      if (document.visibilityState === "hidden" || !active) return;
      if (pending) pending.abort();
      pending = new AbortController();
      fetch("/api/public/student-commerce-packages", { signal: pending.signal, credentials: "omit", cache: "no-store" })
        .then(async (res) => { if (!res.ok) throw new Error("KATALOG_ERISIM_HATASI"); return res.json(); })
        .then((payload) => {
          if (!active) return;
          if (!Array.isArray(payload?.packages)) throw new Error("KATALOG_VERISI_GECERSIZ");
          setPackages(payload.packages.filter((item) => item && item.id && item.title));
          setStatus("ready");
        })
        .catch((error) => {
          if (active && error.name !== "AbortError") setStatus((previous) => previous === "ready" ? previous : "error");
        });
    };
    reload();
    const intervalId = window.setInterval(reload, 60000);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      active = false;
      if (pending) pending.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, []);

  const currentCategory = CATEGORIES.find((item) => item.id === category) || CATEGORIES[0];
  const activePackages = useMemo(() => packages
    .filter((item) => categoryOf(item) === category)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)), [packages, category]);

  const updateNavigation = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const previous = viewport.scrollLeft > 2;
    const next = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 2;
    setNavigation((old) => old.previous === previous && old.next === next ? old : { previous, next });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || status !== "ready") return undefined;
    viewport.scrollLeft = 0;
    const raf = window.requestAnimationFrame(updateNavigation);
    const resize = () => updateNavigation();
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(viewport);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (observer) observer.disconnect();
    };
  }, [category, activePackages.length, status]);

  const move = (direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const card = viewport.querySelector(".fx-home-packages__card");
    if (!card) return;
    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0;
    viewport.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  return (
    <section className="fx-home-packages" aria-label="Fixoku eğitim paketleri" id="egitim-paketleri-vitrini">
      <div className="fx-home-packages__inside">
        <header className="fx-home-packages__header">
          <span className="fx-home-packages__eyebrow">Fixoku Eğitim Paketleri</span>
          <h2>Eğitim Paketlerimiz</h2>
          <p>Okuma, anlama, dikkat ve akademik gelişimi destekleyen eğitim seçeneklerimizi keşfedin.</p>
        </header>
        <div className="fx-home-packages__tabs" role="group" aria-label="Eğitim kademeleri">
          {CATEGORIES.map((tab) => (
            <button key={tab.id} type="button" className={`fx-home-packages__tab ${category === tab.id ? "is-selected" : ""}`}
              aria-pressed={category === tab.id} onClick={() => setCategory(tab.id)}>{tab.name}</button>
          ))}
        </div>
        {status === "loading" && <div className="fx-home-packages__message" role="status">Eğitim paketleri yükleniyor…</div>}
        {status === "error" && <div className="fx-home-packages__message" role="alert">Eğitim paketleri şu an yüklenemiyor. Tüm paketler sayfasından tekrar deneyebilirsiniz.</div>}
        {status === "ready" && (activePackages.length > 0 ? (
          <div className="fx-home-packages__carousel" aria-label={`${currentCategory.name} eğitim paketleri`}>
            <button className="fx-home-packages__arrow fx-home-packages__arrow--previous" type="button"
              aria-label="Önceki paket" title="Önceki paket" disabled={!navigation.previous} onClick={() => move(-1)}>
              <span aria-hidden="true">‹</span>
            </button>
            <div className="fx-home-packages__grid" ref={viewportRef} onScroll={updateNavigation} tabIndex={0}
              aria-label={`${currentCategory.name} paketlerini sağa sola kaydırın`}>
              {activePackages.map((item) => (
                <article className="fx-home-packages__card" key={item.id}>
                  <div className="fx-home-packages__cover">
                    <FixokuPhotoV41F src={item.coverImage} fallbackSrc={packageImageDefaultV41F(String(item.slug || ""))} alt={`${item.title} paket görseli`}>
                      <div className="fx-home-packages__no-cover">Paket kapak görseli</div>
                    </FixokuPhotoV41F>
                  </div>
                  <div className="fx-home-packages__card-body">
                    <span className="fx-home-packages__category-label">{currentCategory.name} Eğitimi</span>
                    <h3>{item.title}</h3>
                    {item.subtitle && <p className="fx-home-packages__subtitle">{item.subtitle}</p>}
                    <ul className="fx-home-packages__features">
                      {cardFeatures(item).map((feature, i) => <li key={`${item.id}-${i}`}>{feature}</li>)}
                    </ul>
                    <div className="fx-home-packages__bottom">
                      <strong className="fx-home-packages__price">{priceText(item.priceMinor, item.currency)}</strong>
                      <Link className="fx-home-packages__card-link" to="/egitim-paketleri" aria-label={`${item.title} paketini incele`}>Paketi İncele <span aria-hidden="true">→</span></Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button className="fx-home-packages__arrow fx-home-packages__arrow--next" type="button"
              aria-label="Sonraki paket" title="Sonraki paket" disabled={!navigation.next} onClick={() => move(1)}>
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : <div className="fx-home-packages__message">{currentCategory.name} kategorisinde şu anda web sitesinde gösterime açık bir paket bulunmuyor.</div>)}
        <div className="fx-home-packages__footer">
          <Link to="/egitim-paketleri" className="fx-home-packages__all">Tüm Eğitim Paketlerini İncele <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
