import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { FixokuPhotoV41F, packageImageDefaultV41F } from "../platform/admin/FixokuCatalogAssetsV41F";
import { rememberStudentPurchaseIntent } from "../utils/purchaseIntent.js";
import "./education-packages-owner-v1.css";

const CATEGORIES = [
  { id: "ALL", label: "Tüm Eğitim Paketlerimiz", subtitle: "İlkokul, ortaokul, lise, yetişkin ve paragraf eğitim paketlerini inceleyin.", theme: "orange" },
  { id: "PRIMARY", label: "İlkokul Eğitim Paketlerimiz", subtitle: "İlkokul öğrencilerine özel eğitim seçenekleri.", theme: "orange" },
  { id: "MIDDLE", label: "Ortaokul Eğitim Paketlerimiz", subtitle: "Ortaokul öğrencilerine özel eğitim seçenekleri.", theme: "purple" },
  { id: "HIGH", label: "Lise Eğitim Paketlerimiz", subtitle: "Lise öğrencilerine özel eğitim seçenekleri.", theme: "dark" },
  { id: "ADULT", label: "Yetişkin Eğitim Paketlerimiz", subtitle: "Yetişkinlere yönelik eğitim seçenekleri.", theme: "dark" },
  { id: "PARAGRAPH", label: "Paragraf Eğitim Paketlerimiz", subtitle: "Paragraf çalışmaları için uygun eğitim seçenekleri.", theme: "paragraph" },
];

function packageCategory(item) {
  const slug = String(item.slug || "").toLocaleLowerCase("tr-TR");
  const title = String(item.title || "").toLocaleLowerCase("tr-TR");
  if (slug.includes("paragraf") || title.includes("paragraf")) return "PARAGRAPH";
  return ["PRIMARY", "MIDDLE", "HIGH", "ADULT"].includes(item.educationStage) ? item.educationStage : null;
}

function money(amount, currency) {
  if (amount === null || !Number.isFinite(Number(amount)) || currency !== "TRY") return "Fiyat bilgisi bekleniyor";
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(amount) / 100);
}

function PublicPackageCard({ item, previewMode }) {
  const [expanded, setExpanded] = useState(false);
  const features = Array.isArray(item.features) ? item.features.filter(Boolean) : [];
  const remaining = Math.max(0, features.length - 9);
  const buyable = !previewMode && item.purchaseEnabled && Number.isSafeInteger(Number(item.priceMinor)) && Number(item.priceMinor) >= 0 && item.currency === "TRY";
  return (
    <article className="fx-ep-card">
      <div className="fx-ep-media">
        <FixokuPhotoV41F
          src={item.coverImage}
          fallbackSrc={packageImageDefaultV41F(String(item.slug || ""))}
          alt={`${item.title} paket kapak görseli`}
        >
          <div className="fx-ep-media-empty"><span>Paket kapak görseli eklenmedi</span></div>
        </FixokuPhotoV41F>
      </div>
      <div className="fx-ep-card-content">
        <h2>{item.title}</h2>
        {item.subtitle && <p className="fx-ep-subtitle">{item.subtitle}</p>}
        {features.length > 0 && (
          <div className="fx-ep-features-block">
            <ul className="fx-ep-features">
              {features.slice(0, expanded ? features.length : 9).map((line, index) => <li key={`${item.id}-f${index}`}><span className="fx-ep-check" aria-hidden="true">✓</span><span>{line}</span></li>)}
            </ul>
            {remaining > 0 && <button className="fx-ep-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? "Daha Az Göster" : `+${remaining} madde daha, tümünü incele`}</button>}
          </div>
        )}
        <div className="fx-ep-bottom">
          <div className="fx-ep-price">{money(item.priceMinor, item.currency)}</div>
          <div className="fx-ep-actions">
            {previewMode ? <button className="fx-ep-button fx-ep-buy" type="button" disabled title="Yerel Owner önizlemesi, satın alma başlatılmaz">Hemen Al</button> : buyable && item.packageVersionId ? <Link className="fx-ep-button fx-ep-buy" onClick={() => rememberStudentPurchaseIntent(item.packageVersionId)} to={`/panel/ogrenci/paketler?packageVersionId=${encodeURIComponent(item.packageVersionId)}`} aria-label={`${item.title} paketi için öğrenci paneline git`}>Hemen Al</Link> : <span className="fx-ep-button fx-ep-disabled">Satışa kapalı</span>}
            {remaining > 0 && <button type="button" className="fx-ep-button fx-ep-details" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? "Daha Az Göster" : "Detaya Bak"}</button>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function EducationPackagesPage() {
  const previewMode = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("onizleme") === "1";
  const [category, setCategory] = useState("ALL");
  const [packages, setPackages] = useState([]);
  const [state, setState] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const meta = CATEGORIES.find((item) => item.id === category) || CATEGORIES[0];
  useEffect(() => {
    const controller = new AbortController();

    fetch(previewMode ? "/api/admin/student-commerce-packages" : "/api/public/student-commerce-packages", { signal: controller.signal, credentials: previewMode ? "same-origin" : "omit", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(String(payload?.error || "KATALOG_HATASI"));
          error.httpStatus = response.status;
          error.requestId = payload?.requestId || response.headers.get("x-fixoku-catalog-request-id") || "";
          throw error;
        }
        return payload;
      })
      .then((payload) => {
        if (!Array.isArray(payload?.packages)) throw new Error("KATALOG_VERISI_GECERSIZ");
        const items = previewMode ? payload.packages.flatMap((item) => {
          const versions = [...(item.versions || [])].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
          const version = versions.find((v) => v.status === "DRAFT") || versions.find((v) => v.status === "PUBLISHED") || versions[0];
          if (!version) return [];
          // Owner > Paket İçeriği is stored as active TEXT_ITEM components.
          // Show exactly those items, in Owner order. The older features field is fallback only.
          const contentItems = (Array.isArray(version.components) ? version.components : [])
            .filter((part) => part.componentType === "TEXT_ITEM" && part.isActive !== false)
            .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
            .map((part) => String(part.titleSnapshot || part.title || "").trim())
            .filter(Boolean);
          return [{ id: item.id, packageVersionId: item.packageVersionId, slug: item.slug, educationStage: item.educationStage,
            displayOrder: item.displayOrder, title: version.title, subtitle: version.subtitle,
            description: version.description,
            features: contentItems.length ? contentItems : (Array.isArray(version.features) ? version.features : []),
            coverImage: item.iconReference || null,
            priceMinor: version.priceMinor, currency: version.currency,
            purchaseEnabled: false, previewStatus: version.status, publicWebVisible: item.publicWebVisible }];
        }) : payload.packages;
        setPackages(items.filter((item) => item && item.id && item.title));
        setCatalogError("");
        setState("ready");
      })
      .catch((error) => { if (error.name !== "AbortError") { setCatalogError(error.httpStatus ? `Katalog API HTTP ${error.httpStatus}${error.requestId ? ` · Referans: ${error.requestId}` : ""}` : "Katalog verisi alınamadı."); setState("error"); } });
    return () => controller.abort();
  }, [previewMode]);
  const visible = useMemo(() => packages
    .filter((item) => category === "ALL" || packageCategory(item) === category)
    .sort((a, b) => {
      const orderA = ["PRIMARY", "MIDDLE", "HIGH", "ADULT", "PARAGRAPH"].indexOf(packageCategory(a));
      const orderB = ["PRIMARY", "MIDDLE", "HIGH", "ADULT", "PARAGRAPH"].indexOf(packageCategory(b));
      if (category === "ALL" && orderA !== orderB) return orderA - orderB;
      return Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
    }), [packages, category]);
  return (
    <div className="fx-ep-root">
      <Header />
      <main className={`fx-ep-page fx-ep-theme-${meta.theme}`}>
        <header className="fx-ep-hero">
          <h1>Eğitim Paketlerimiz</h1>
          <div className="fx-ep-underline" aria-hidden="true" />
          <p>{meta.subtitle}</p>
        </header>
        {previewMode && <div className="fx-ep-preview-note" role="status">Owner önizlemesi: Taslak paketler de gösterilir. Bu görünüm kamuya açık değildir ve satın alma işlemi başlatmaz.</div>}
        <nav className="fx-ep-tabs" aria-label="Eğitim paketi kategorileri">
          {CATEGORIES.map((item) => <button type="button" key={item.id} aria-current={category === item.id ? "page" : undefined} className={`fx-ep-tab ${item.id === category ? "fx-ep-selected" : ""}`} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </nav>
        {state === "ready" && packages.length > 0 && <p className="fx-ep-counter" role="status">{category === "ALL" ? `${visible.length} eğitim paketi` : `${visible.length} paket`} listeleniyor</p>}
        {state === "loading" && <div role="status" className="fx-ep-message">Eğitim paketleri yükleniyor…</div>}
        {state === "error" && <div role="alert" className="fx-ep-message">{previewMode ? "Owner paket önizlemesi yüklenemedi. Yönetici oturumunuzu ve katalog API bağlantısını kontrol edin." : "Paketler şu an görüntülenemiyor. Veritabanı veya katalog bağlantısı kontrol edilmeli."}{catalogError && <small>{catalogError}</small>}</div>}
        {state === "ready" && (visible.length ? <section className="fx-ep-grid" aria-label={`${meta.label} paketleri`}>{visible.map((item) => <PublicPackageCard key={item.id} item={item} previewMode={previewMode} />)}</section> : <div className="fx-ep-message">{previewMode ? "Owner önizlemesinde görüntülenecek paket bulunamadı. Öğrenci paketleri kataloğunu kontrol edin." : category === "ALL" ? "Yayımlanan eğitim paketlerimiz çok yakında burada yer alacak." : "Bu kategoride şu anda yayımlanmış paket bulunmuyor. Diğer eğitim seçeneklerimizi inceleyebilirsiniz."}</div>)}
      </main>
      <Footer />
    </div>
  );
}
