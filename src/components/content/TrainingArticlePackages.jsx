// FIXOKU_022V: Live, public, category-specific packages for training articles.
// Owner's published + web-visible filter remains on the public API.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FixokuPhotoV41F, packageImageDefaultV41F } from "../../platform/admin/FixokuCatalogAssetsV41F";
import "./training-article-packages.css";

const LABELS = {
  PRIMARY: "İlkokul",
  MIDDLE: "Ortaokul",
  HIGH: "Lise",
  ADULT: "Yetişkin",
  PARAGRAPH: "Paragraf",
};

function categoryFromPath(pathname) {
  if (!pathname.startsWith("/egitimler/")) return null;
  const slug = pathname.split("/").filter(Boolean).pop() || "";
  if (slug.startsWith("ilkokul-")) return "PRIMARY";
  if (slug.startsWith("ortaokul-")) return "MIDDLE";
  if (slug.startsWith("lise-") || slug.startsWith("sinav-odakli-")) return "HIGH";
  if (slug.startsWith("yetiskin-")) return "ADULT";
  if (slug.includes("paragraf")) return "PARAGRAPH";
  return null;
}

function categoryOf(pkg) {
  const slug = String(pkg.slug || "").toLocaleLowerCase("tr-TR");
  const title = String(pkg.title || "").toLocaleLowerCase("tr-TR");
  if (slug.includes("paragraf") || title.includes("paragraf")) return "PARAGRAPH";
  return ["PRIMARY", "MIDDLE", "HIGH", "ADULT"].includes(pkg.educationStage) ? pkg.educationStage : null;
}

function featuresOf(pkg) {
  const parts = Array.isArray(pkg.components) ? pkg.components : [];
  const active = parts.filter(p => p && p.componentType === "TEXT_ITEM" && p.isActive !== false)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const source = active.length ? active : Array.isArray(pkg.features) ? pkg.features : [];
  return source.map(part => typeof part === "string" ? part.trim() :
    part && part.isActive !== false ? String(part.titleSnapshot || part.title || part.text || "").trim() : "")
    .filter(Boolean).slice(0, 30);
}

function formatPrice(minor, currency) {
  if (currency !== "TRY" || minor == null || !Number.isSafeInteger(Number(minor)) || Number(minor) < 0) return "Fiyat için inceleyin";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(minor) / 100);
}

export default function TrainingArticlePackages() {
  const { pathname } = useLocation();
  const category = categoryFromPath(pathname);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [arrows, setArrows] = useState({ prev: false, next: false });
  const [expanded, setExpanded] = useState(() => new Set());
  const viewportRef = useRef(null);
  const categoryName = category && LABELS[category];

  useEffect(() => {
    if (!category) return undefined;
    let mounted = true;
    let pending = null;
    function refresh() {
      if (!mounted || document.visibilityState === "hidden") return;
      if (pending) pending.abort();
      const ctrl = new AbortController();
      pending = ctrl;
      fetch("/api/public/student-commerce-packages", { signal: ctrl.signal, cache: "no-store", credentials: "omit" })
        .then(async res => { const payload = await res.json().catch(() => ({})); if (!res.ok) { const error = new Error(String(payload?.error || "PACKAGE_API_ERROR")); error.httpStatus = res.status; error.requestId = payload?.requestId || res.headers.get("x-fixoku-catalog-request-id") || ""; throw error; } return payload; })
        .then(data => {
          if (!mounted) return;
          if (!Array.isArray(data?.packages)) throw new Error("PACKAGE_LIST_MISSING");
          setItems(data.packages.filter(p => p && p.id && p.title));
          setCatalogError("");
          setStatus("ready");
        })
        .catch(err => { if (mounted && err.name !== "AbortError") { setCatalogError(err.httpStatus ? `Katalog API HTTP ${err.httpStatus}${err.requestId ? ` · Referans: ${err.requestId}` : ""}` : "Katalog verisi alınamadı."); setStatus("error"); } });
    }
    window.queueMicrotask(() => { if (mounted) setStatus("loading"); });
    refresh();
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted = false;
      if (pending) pending.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [category]);

  const visible = useMemo(() => items.filter(p => categoryOf(p) === category)
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0)), [items, category]);

  function recalc() {
    const node = viewportRef.current;
    if (!node) return;
    const next = {
      prev: node.scrollLeft > 2,
      next: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
    };
    setArrows(old => old.prev === next.prev && old.next === next.next ? old : next);
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || status !== "ready") return undefined;
    el.scrollLeft = 0;
    const raf = window.requestAnimationFrame(recalc);
    const listener = () => recalc();
    window.addEventListener("resize", listener);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(listener) : null;
    observer?.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", listener);
      observer?.disconnect();
    };
  }, [category, visible.length, status]);

  function slide(dir) {
    const el = viewportRef.current;
    const card = el?.querySelector(".fx-training-packages__card");
    if (!el || !card) return;
    const gap = Number.parseFloat(window.getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  }

  if (!category) return null;
  return (
    <section className="fx-training-packages" aria-label={`${categoryName} eğitim paketleri`}>
      <div className="fx-training-packages__heading">
        <div>
          <span className="fx-training-packages__overline">{categoryName} • Fixoku Eğitim Paketleri</span>
          <h2>{categoryName} Eğitim Paketlerini Keşfedin</h2>
          <p>Bu eğitim düzeyine uygun, web sitesinde yayımlanan güncel paketleri inceleyin.</p>
        </div>
      </div>
      {status === "loading" && <p className="fx-training-packages__state" role="status">Eğitim paketleri yükleniyor…</p>}
      {status === "error" && <p className="fx-training-packages__state" role="alert">Paketler şu anda yüklenemiyor. Tüm paketler sayfasını inceleyebilirsiniz.{catalogError && <small>{catalogError}</small>}</p>}
      {status === "ready" && (visible.length ? (
        <div className="fx-training-packages__carousel">
          <button type="button" className="fx-training-packages__nav" aria-label="Önceki paket" disabled={!arrows.prev} onClick={() => slide(-1)}>‹</button>
          <div className="fx-training-packages__list" ref={viewportRef} onScroll={recalc} tabIndex={0} aria-label={`${categoryName} paketlerini kaydırın`}>
            {visible.map(pkg => (
              <article className="fx-training-packages__card" key={pkg.id}>
                <div className="fx-training-packages__image">
                  <FixokuPhotoV41F src={pkg.coverImage} fallbackSrc={packageImageDefaultV41F(String(pkg.slug || ""))} alt={`${pkg.title} paket kapağı`}>
                    <span>Paket kapağı</span>
                  </FixokuPhotoV41F>
                </div>
                <div className="fx-training-packages__body">
                  <small>{categoryName} Eğitimi</small>
                  <h3>{pkg.title}</h3>
                  {pkg.subtitle && <p className="fx-training-packages__subtitle">{pkg.subtitle}</p>}
                  <ul>{featuresOf(pkg).slice(0, expanded.has(pkg.id) ? undefined : 9).map((text, idx) => <li key={`${pkg.id}-${idx}`}>{text}</li>)}</ul>
                  {featuresOf(pkg).length > 9 && <button type="button" className="fx-training-packages__expand" aria-expanded={expanded.has(pkg.id)} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(pkg.id)) next.delete(pkg.id); else next.add(pkg.id); return next; })}>{expanded.has(pkg.id) ? "Daha Az Göster" : `+${featuresOf(pkg).length - 9} madde daha, tümünü incele`}</button>}
                  <div className="fx-training-packages__cardfoot">
                    <strong>{formatPrice(pkg.priceMinor, pkg.currency)}</strong>
                    <Link to="/egitim-paketleri">Paketi İncele <span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <button type="button" className="fx-training-packages__nav" aria-label="Sonraki paket" disabled={!arrows.next} onClick={() => slide(1)}>›</button>
        </div>
      ) : <p className="fx-training-packages__state">Bu kategoride şu anda yayımlanmış bir paket bulunmuyor.</p>)}
      <div className="fx-training-packages__bottom">
        <Link to="/egitim-paketleri">Tüm Eğitim Paketlerini Gör <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}
