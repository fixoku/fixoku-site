// FIXOKU_020O_TRAINER_ORDER_AND_CONTENT_SYNC
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./admin-panel.css";
import { StudentProductCatalogV39C } from "./StudentProductCatalogV39C";
import { FixokuCatalogIconV40 } from "./FixokuCatalogIconV40";
import { FixokuPhotoV41F, productImageDefaultV41F } from "./FixokuCatalogAssetsV41F";
import { trainerCourseCover020P } from "../trainer/components/trainerCourseCovers020P";
import "./owner-trainer-020p.css";

type Component = {
  componentId?: string;
  componentType: string;
  productId?: string;
  referenceId?: string;
  physicalProductId?: string;
  title?: string;
  titleSnapshot?: string;
  imageReference?: string | null;
  displayLabel?: string | null;
  quantity?: number;
  isActive?: boolean;
};
type PackageRecord = {
  id: string;
  slug: string;
  status: string;
  panelVisible: boolean;
  publicWebVisible: boolean;
  purchaseEnabled: boolean;
  iconReference?: string | null;
  packageVersionId: string | null;
  versionStatus: string | null;
  versionNumber: number | null;
  title?: string;
  shortDescription?: string;
  description?: string;
  features?: string[];
  priceGrossMinor?: number | null;
  vatRateBps?: number;
  currency?: string;
  shippingPolicy?: string;
  shippingPriceMinor?: number;
  components: Component[];
};
type Product = { id: string; sku: string; title: string; imageReference?: string | null; isActive: boolean };
type Catalog = { packages: PackageRecord[]; products: Product[] };
type Tab = "packages" | "products" | "expertise";
type StageFilter = "ALL" | "PRIMARY" | "MIDDLE" | "HIGH" | "ADULT" | "SET";
const stageOf = (item: PackageRecord): StageFilter => {
  const value = `${item.title || ""} ${item.slug || ""}`.toLocaleLowerCase("tr-TR");
  if (/\bset\b|\d['’]l[üu] set/u.test(value)) return "SET";
  if (value.includes("ilkokul") || value.includes("primary")) return "PRIMARY";
  if (value.includes("ortaokul") || value.includes("middle")) return "MIDDLE";
  if (value.includes("lise") || value.includes("high")) return "HIGH";
  if (value.includes("yetişkin") || value.includes("adult")) return "ADULT";
  return "ALL";
};
const stageName = (value: StageFilter) => ({ALL:"Tümü",PRIMARY:"İlkokul",MIDDLE:"Ortaokul",HIGH:"Lise",ADULT:"Yetişkin",SET:"Setler"}[value]);
// All view: primary, middle, high school, adult, then combination sets. Unknowns precede sets.
const stageOrder: Record<StageFilter, number> = { PRIMARY: 0, MIDDLE: 1, HIGH: 2, ADULT: 3, ALL: 4, SET: 5 };
const trTitleOrder = new Intl.Collator("tr-TR", { sensitivity: "base", numeric: true });
const sortedTrainerPackages = (items: PackageRecord[]) => [...items].sort((a, b) =>
  stageOrder[stageOf(a)] - stageOrder[stageOf(b)] || trTitleOrder.compare(a.title || a.slug, b.title || b.slug) || a.id.localeCompare(b.id)
);
type Editor = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  featuresText: string;
  price: string;
  panelVisible: boolean;
  purchaseEnabled: boolean;
  publicWebVisible: boolean;
  components: Component[];
};

const formatMoney = (minor: number | null | undefined) =>
  typeof minor === "number" && Number.isFinite(minor)
    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(minor / 100)
    : "Fiyat girilmedi";
const toInput = (minor: number | null | undefined) => typeof minor === "number" ? (minor / 100).toFixed(2).replace(".", ",") : "";
const toMinor = (value: string) => {
  const cleaned = value.trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/u.test(cleaned)) return null;
  const parsed = Math.round(Number(cleaned.replace(",", ".")) * 100);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};
const safeComponents = (list: unknown): Component[] => Array.isArray(list)
  ? list.filter((v): v is Component => Boolean(v) && typeof v === "object" && typeof v.componentType === "string")
  : [];
const supportedComponentTypes = ["TEXT_ITEM", "PHYSICAL_PRODUCT", "DIGITAL_ACCESS", "TRAINER_SERVICE"] as const;
const unsupportedComponents = (list: Component[]) => list.some(item => !supportedComponentTypes.includes(item.componentType as typeof supportedComponentTypes[number]));
const componentTypeLabel = (type: string) => ({ PHYSICAL_PRODUCT: "Kitap", DIGITAL_ACCESS: "Dijital erişim", TRAINER_SERVICE: "Eğitmen hizmeti" }[type] || type);
// A trainer's catalogue uses active TEXT_ITEM components when available; otherwise legacy features_json.
// For editing a legacy package, stage its features as TEXT_ITEM entries without writing to the database.
const toEditor = (item: PackageRecord): Editor => {
  const originals = safeComponents(item.components).map(component => ({ ...component }));
  const hasTextItems = originals.some(component => component.componentType === "TEXT_ITEM");
  const legacyText: Component[] = !hasTextItems && Array.isArray(item.features)
    ? item.features.filter(feature => String(feature).trim()).map(feature => ({ componentType: "TEXT_ITEM", titleSnapshot: feature, title: feature, quantity: 1, isActive: true }))
    : [];
  return {
    title: item.title || "", slug: item.slug || "", shortDescription: item.shortDescription || "",
    description: item.description || "", featuresText: Array.isArray(item.features) ? item.features.join("\n") : "",
    price: toInput(item.priceGrossMinor), panelVisible: Boolean(item.panelVisible),
    purchaseEnabled: Boolean(item.purchaseEnabled), publicWebVisible: Boolean(item.publicWebVisible),
    components: [...legacyText, ...originals],
  };
};
const activeTrainerFeatures020P = (item: PackageRecord) => {
  const texts = safeComponents(item.components).filter(c => c.componentType === "TEXT_ITEM");
  return texts.length ? texts.filter(c => c.isActive !== false).map(c => String(c.titleSnapshot || c.title || "")).filter(Boolean)
    : (Array.isArray(item.features) ? item.features : []);
};
function TrainerModules020P({ compact = false }: { compact?: boolean }) {
  return <div className={`fixoku-trainer-modules-020p ${compact ? "is-compact" : ""}`} aria-label="Öğretmen eğitim ekranındaki modül sekmeleri">
    <span title="Video Eğitimleri sekmesi; video adedi bu katalog API'sinde bulunmuyor"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg>Video</span>
    <span title="Müfredat sekmesi; özel medya bu ekranda açılmaz"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4.5C4 3 5 2 6.5 2H20v19H6.5C5 21 4 20 4 18.5z"/><path d="M4 18.5C4 17 5 16 6.5 16H20M8 7h8M8 11h8"/></svg>Müfredat</span>
    <span title="Sunumlar sekmesi; dosyalar yetki kontrollü görüntülenir"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M12 17v4M8 21h8M8 8h8M8 11h6"/></svg>Sunumlar</span>
  </div>;
}

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) { const error = new Error(String(data.error || `Sunucu yanıtı: ${response.status}`)); (error as Error & { response?: Record<string, unknown>; status?: number }).response = data; (error as Error & { status?: number }).status = response.status; throw error; }
  return data;
}
const ownerPackageError = (error: unknown, yedek: string) => {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    DRAFT_VERSION_MISSING: "Taslak sürüm oluşturulamadı. Lütfen tekrar deneyin.",
    PACKAGE_NOT_FOUND: "Paket bulunamadı veya artık düzenlenemiyor.",
    PACKAGE_FIELDS_REQUIRED: "Paket adı, bağlantı adı ve açıklama zorunludur.",
    PACKAGE_PRICE_INVALID: "Paket fiyatı geçersiz.",
    PACKAGE_PERMISSION_REQUIRED: "Bu işlem için Owner paket yetkisi gerekiyor.",
    PUBLISHED_VERSION_IMMUTABLE: "Yayımlanmış sürüm korunur; değişiklikler yeni taslağa kaydedilir.",
    SLUG_ALREADY_EXISTS: "Bu bağlantı adı başka bir pakette kullanılıyor.",
    PACKAGE_PRODUCT_UNAVAILABLE: "Seçilen ürün artık aktif değil.",
    PUBLICATION_CONDITIONS_UNMET: "Taslak kaydedildi ancak yayınlanmadı. Eksik yayın koşullarını kontrol edin.",
  };
  return messages[code] || yedek;
};

export function OwnerTrainerPackagesPage() {
  const [catalog, setCatalog] = useState<Catalog>({ packages: [], products: [] });
  const [tab, setTab] = useState<Tab>("packages");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [page, setPage] = useState(1);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [previewPackage, setPreviewPackage] = useState<PackageRecord | null>(null);
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null);
  const [editingContentValue, setEditingContentValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api("/api/admin/trainer-packages");
      if (!Array.isArray(result.packages) || !Array.isArray(result.products)) throw new Error("TRAINER_CATALOG_CONTRACT_MISMATCH");
      setCatalog({ packages: result.packages as PackageRecord[], products: result.products as Product[] });
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Katalog okunamadı"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!previewPackage) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewPackage(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewPackage]);
  const selected = catalog.packages.find(item => item.id === selectedId);
  const draft = selected?.versionStatus === "DRAFT";
  const safeComponentEditing = Boolean(form && !unsupportedComponents(form.components));
  const matchedBySearch = useMemo(() => sortedTrainerPackages(catalog.packages.filter(item => `${item.title || ""} ${item.slug || ""}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")))), [catalog.packages, search]);
  const all = useMemo(() => matchedBySearch.filter(item => stageFilter === "ALL" || stageOf(item) === stageFilter), [matchedBySearch,stageFilter]);
  const pageCount = Math.max(1, Math.ceil(all.length / 6));
  const pageSafe = Math.min(page, pageCount);
  const rows = all.slice((pageSafe - 1) * 6, pageSafe * 6);
  const visibleProducts = catalog.products.filter(p => p.isActive && `${p.title} ${p.sku}`.toLocaleLowerCase("tr-TR").includes(productSearch.toLocaleLowerCase("tr-TR")));

  const choose = (item: PackageRecord, readOnly = false) => {
    setSelectedId(item.id);
    setForm(toEditor(item));
    setPreviewOnly(readOnly);
    setEditingContentIndex(null);
    setPickerOpen(false);
    setError(""); setMessage(""); setSaveStatus("idle");
  };
  const markDirty = () => { if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; } setSaveStatus("idle"); };
  const updateForm = (patch: Partial<Editor>) => { markDirty(); setForm(current => current ? { ...current, ...patch } : current); };
  const showSaved = (text = "Paket Bilgileri Kaydedildi") => { setSaveStatus("success"); setMessage(text); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(() => { setSaveStatus("idle"); saveTimerRef.current = null; }, 1000); };
  useEffect(() => {
    if (loading || initialSelectionDone || !catalog.packages.length) return;
    choose(sortedTrainerPackages(catalog.packages)[0]);
    setInitialSelectionDone(true);
  // Initial selection only; later refreshes preserve the editor state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, initialSelectionDone, catalog.packages]);
  const refreshSelected = async (id: string) => {
    const result = await api(`/api/admin/trainer-packages?id=${encodeURIComponent(id)}`);
    if (!Array.isArray(result.packages)) throw new Error("PACKAGE_REFRESH_CONTRACT_MISMATCH");
    const item = (result.packages as PackageRecord[]).find(p => p.id === id);
    if (!item) throw new Error("PACKAGE_NOT_FOUND");
    setCatalog(current => ({ ...current, packages: [item, ...current.packages.filter(p => p.id !== id)] }));
    choose(item);
    return item;
  };
  // A published version is immutable.  Keep the Owner's form values in memory
  // while the server creates (or reuses) the single draft for this package.
  // This makes Save a single repeatable action and avoids duplicate drafts.
  const ensureDraftVersion = async (item: PackageRecord) => {
    if (item.versionStatus === "DRAFT" && item.packageVersionId) return item.packageVersionId;
    const result = await api(`/api/admin/trainer-packages?id=${encodeURIComponent(item.id)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createDraft" }),
    });
    const versionId = String(result.packageVersionId || "");
    if (!versionId) throw new Error("DRAFT_VERSION_MISSING");
    return versionId;
  };
  const newDraft = async (item: PackageRecord) => {
    if (!item.id || item.versionStatus === "DRAFT" || busy) return;
    if (!window.confirm(`“${item.title || item.slug}” için mevcut sürümden yeni bir taslak oluşturalım mı? Bu işlem veritabanına taslak kaydı ekler.`)) return;
    setBusy(true); setSaveStatus("saving"); setError(""); setMessage("Kaydediliyor...");
    try {
      const result = await api(`/api/admin/trainer-packages?id=${encodeURIComponent(item.id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "createDraft" }) });
      await refreshSelected(item.id);
      setMessage(result.existing ? "Mevcut taslak açıldı. Değişiklikler kaydedilene kadar yayımlanmaz." : "Yeni taslak oluşturuldu. Kaydedilene kadar yayımlanmaz.");
    } catch (err) { setError(ownerPackageError(err, "Taslak oluşturulamadı.")); }
    finally { setBusy(false); }
  };
  const saveFields = async () => {
    if (!selected || !form || previewOnly || busy) return;
    const minor = toMinor(form.price);
    if (!form.title.trim() || !form.slug.trim() || minor === null) {
      setError("Paket adı, bağlantı adı ve geçerli fiyat zorunludur."); return;
    }
    // The API currently requires a non-empty description although this Owner form no longer displays one.
    // Preserve the existing description; for legacy empty records, use the existing package title only.
    setBusy(true); setSaveStatus("saving"); setError(""); setMessage("Kaydediliyor...");
    try {
      const versionId = await ensureDraftVersion(selected);
      const result = await api(`/api/admin/trainer-packages?id=${encodeURIComponent(selected.id)}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versionId, title: form.title.trim(), slug: form.slug.trim(),
          shortDescription: form.shortDescription.trim(), description: form.description.trim() || selected.description?.trim() || form.title.trim(),
          features: form.featuresText.split("\n").map(s => s.trim()).filter(Boolean),
          priceGrossMinor: minor, vatRateBps: Number(selected.vatRateBps ?? 2000),
          shippingPolicy: selected.shippingPolicy || "FREE", shippingPriceMinor: Number(selected.shippingPriceMinor || 0),
          currency: "TRY", iconReference: selected.iconReference || null,
          purchaseEnabled: form.purchaseEnabled, panelVisible: form.panelVisible, publicWebVisible: form.publicWebVisible,
        }),
      });
      await refreshSelected(selected.id);
      const response = (result as { published?: boolean; message?: string }).published ? "Paket kaydedildi ve yayınlandı." : "Taslak bilgileri kaydedildi. Ürün ve içerik değişiklikleri ayrı kaydedilir.";
      showSaved(response);
      if ((result as { message?: string }).message) setError(String((result as { message: string }).message));
    } catch (err) {
      const typed = err as Error & { response?: Record<string, unknown>; status?: number };
      const response = typed.response;
      if (typed.status === 409 && typeof response?.packageVersionId === "string") {
        try { await refreshSelected(selected.id); setSaveStatus("error"); setError(String(response.message || (Array.isArray(response.missingConditions) ? response.missingConditions.join(" ") : "Taslak kaydedildi ancak yayınlanmadı."))); }
        catch (refreshError) { setSaveStatus("error"); setError(ownerPackageError(refreshError, "Taslak kaydedildi ancak yeniden okunamadı.")); }
      } else { setSaveStatus("error"); setError(String(response?.message || (Array.isArray(response?.missingConditions) ? response.missingConditions.join(" ") : "") || ownerPackageError(err, "Taslak kaydedilemedi."))); }
    }
    finally { setBusy(false); }
  };
  const saveComponents = async () => {
    if (!selected || !form || previewOnly || busy) return;
    if (!safeComponentEditing) { setError("Bu pakette mevcut API'nin desteklemediği içerik türleri var. Kayıt engellendi; hiçbir bileşen silinmedi."); return; }
    const textItems = form.components.filter(item => item.componentType === "TEXT_ITEM");
    // The trainer-facing fallback would reveal all old features again if every TEXT_ITEM were disabled.
    if (textItems.length && !textItems.some(item => item.isActive !== false)) {
      setError("Öğretmen panelindeki eski içeriklerin yeniden görünmemesi için en az bir içerik maddesi açık kalmalı."); return;
    }
    const components = form.components.map((item) => item.componentType === "TEXT_ITEM"
      ? { componentType: "TEXT_ITEM", text: String(item.titleSnapshot || item.title || "").trim(), isActive: item.isActive !== false }
      : { componentType: item.componentType, productId: String(item.physicalProductId || item.productId || item.referenceId || ""), physicalProductId: item.componentType === "PHYSICAL_PRODUCT" ? String(item.physicalProductId || item.productId || "") : null, quantity: Number(item.quantity || 1), displayLabel: item.displayLabel || null, isActive: item.isActive !== false });
    setBusy(true); setError(""); setMessage("");
    try {
      const versionId = await ensureDraftVersion(selected);
      await api(`/api/admin/trainer-packages?id=${encodeURIComponent(selected.id)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "componentsSave", versionId, components }),
      });
      await refreshSelected(selected.id);
      showSaved("Paket Bilgileri Kaydedildi");
    } catch (err) { setSaveStatus("error"); setError(ownerPackageError(err, "Paket içerikleri kaydedilemedi.")); }
    finally { setBusy(false); }
  };
  const publishDraft = async () => {
    if (!selected || !draft || !selected.packageVersionId || previewOnly || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api(`/api/admin/trainer-packages?id=${encodeURIComponent(selected.id)}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", versionId: selected.packageVersionId }),
      });
      await refreshSelected(selected.id);
      setMessage("Paket yayınlandı.");
    } catch (err) {
      const code = err instanceof Error ? err.message : "PACKAGE_PUBLISH_FAILED";
      const messages: Record<string, string> = {
        CORE001_PUBLICATION_VALIDATION_FAILED: "Paket yayınlanamadı. Fiyat, aktif ürün ve yayın koşullarını kontrol edin.",
        PACKAGE_PERMISSION_REQUIRED: "Bu işlem için Owner yayın yetkisi gerekiyor.",
        PACKAGE_VERSION_NOT_DRAFT: "Yalnızca taslak sürüm yayınlanabilir.",
        PACKAGE_PRICE_INVALID: "Paket fiyatı yayın kataloğundaki onaylı fiyatla eşleşmiyor.",
      };
      setError(messages[code] || "Paket yayınlanamadı. Yayın koşullarını kontrol edin.");
    } finally { setBusy(false); }
  };
  const addProduct = (product: Product) => {
    if (!form) return;
    if (form.components.some(c => String(c.productId || c.physicalProductId) === product.id)) return;
    markDirty();
    setForm({ ...form, components: [...form.components, { componentType: "PHYSICAL_PRODUCT", physicalProductId: product.id, productId: product.id, title: product.title, quantity: 1, isActive: true }] });
  };
  const updateComponent = (index: number, patch: Partial<Component>) => {
    if (!form) return;
    markDirty();
    setForm({ ...form, components: form.components.map((v, i) => i === index ? { ...v, ...patch } : v) });
  };
  const removeComponent = (index: number) => { if (!form) return; markDirty(); setForm({ ...form, components: form.components.filter((_, i) => i !== index) }); };

  // Published rows are editable in the form; the first save creates/reuses a
  // draft and sends the edit there.  The published database version remains
  // immutable throughout the interaction.
  const canEdit = Boolean(!previewOnly && !busy);
  // The trainer page uses TEXT_ITEM entries preferentially; staged legacy features are converted above.
  const textIndices = form ? form.components.flatMap((value, index) => value.componentType === "TEXT_ITEM" ? [index] : []) : [];
  const moveTextComponent = (componentIndex: number, direction: -1 | 1) => {
    if (!form || !canEdit) return;
    const position = textIndices.indexOf(componentIndex);
    const targetIndex = textIndices[position + direction];
    if (position < 0 || targetIndex === undefined) return;
    const next = [...form.components];
    [next[componentIndex], next[targetIndex]] = [next[targetIndex], next[componentIndex]];
    markDirty();
    setForm({ ...form, components: next });
  };
  const addTextComponent = () => {
    if (!form || !canEdit || !safeComponentEditing) return;
    const index = form.components.length;
    const initial = "Yeni içerik maddesi";
    markDirty();
    setForm({ ...form, components: [...form.components, { componentType: "TEXT_ITEM", titleSnapshot: initial, title: initial, quantity: 1, isActive: true }] });
    setEditingContentIndex(index);
    setEditingContentValue(initial);
  };
  const packageContentCount = (item: PackageRecord) => activeTrainerFeatures020P(item).length;
  return (
    <main className="platform-foundation-panel admin-panel commerce-package-page fx-student-v38c fx40-catalog fx-trainer-shared-020n">
      <header className="admin-page-heading commerce-hero">
        <div className="commerce-hero-icon" aria-hidden="true"><FixokuCatalogIconV40 kind="school" size={34}/></div>
        <div><h1>Eğitmen Eğitim Paketleri</h1><p>Eğitmenlere sunulan paketleri ve ürünlerini tek merkezden yönetin.</p></div>
      </header>
      <div className="fx39c-tabs" role="tablist" aria-label="Eğitmen katalog yönetimi">
        <button type="button" role="tab" aria-selected={tab === "packages"} className={tab === "packages" ? "selected" : ""} onClick={() => setTab("packages")}><FixokuCatalogIconV40 kind="package" size={19}/> Paketler <span className="fx40-tab-count">({catalog.packages.length})</span></button>
        <button type="button" role="tab" aria-selected={tab === "products"} className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}><FixokuCatalogIconV40 kind="grid" size={19}/> Ürünler</button>
        <button type="button" role="tab" aria-selected={tab === "expertise"} className={tab === "expertise" ? "selected" : ""} onClick={() => setTab("expertise")}><FixokuCatalogIconV40 kind="school" size={19}/> Uzmanlıklar</button>
      </div>
      {error && <p role="alert" className={`admin-feedback ${saveStatus === "error" ? "admin-feedback-error" : ""}`}>{error}</p>}
      {message && <p role={saveStatus === "error" ? "alert" : "status"} className={`admin-feedback admin-feedback-${saveStatus}`}>{message}</p>}
      {tab === "packages" && (
        <section className="admin-package-layout is-editing">
          <section className="panel-card admin-package-list">
            <div className="admin-package-list-heading"><div><h2>Paketler ({all.length})</h2><p>Mevcut eğitmen paketleri</p></div>
              <label className="admin-package-search"><span className="sr-only">Paket ara</span><input type="search" placeholder="Paket ara..." value={search} onChange={e => {setSearch(e.target.value);setPage(1);}}/></label>
            </div>
            <div className="admin-package-filters" aria-label="Paket seviyesi filtresi">
              {(["ALL","PRIMARY","MIDDLE","HIGH","ADULT","SET"] as StageFilter[]).map(value => <button key={value} type="button" className={stageFilter===value ? "is-selected" : ""} aria-pressed={stageFilter===value} onClick={()=>{setStageFilter(value);setPage(1);}}>{stageName(value)}<span>{value==="ALL" ? matchedBySearch.length : matchedBySearch.filter(i=>stageOf(i)===value).length}</span></button>)}
            </div>
            {loading ? <p className="admin-empty-inline">Paketler yükleniyor...</p> : !all.length ? <p className="admin-package-empty">Bu filtrede paket bulunamadı.</p> :
              <div className="admin-package-grid">
                {rows.map(item => <article key={item.id} className={`admin-package-card ${selectedId===item.id ? "is-selected" : ""}`}>
                  <div className="admin-package-card-top"><span className={`admin-status ${item.versionStatus === "DRAFT" ? "admin-status-draft" : "admin-status-published"}`}>{item.versionStatus === "DRAFT" ? "Taslak" : item.versionStatus === "PUBLISHED" ? "Yayında" : "Diğer"}</span><span className="admin-package-stage">{stageOf(item)==="ALL" ? "Eğitmen" : stageName(stageOf(item))}</span></div>
                  <div className="fx40-package-identity"><div className={`fx40-package-art fx40-art-${stageOf(item).toLowerCase()}`}>
                    <FixokuPhotoV41F src={trainerCourseCover020P(item.title || "", item.slug) || item.iconReference} alt={item.title || "Eğitmen paketi"}><FixokuCatalogIconV40 kind="package" size={39}/></FixokuPhotoV41F>
                  </div><div className="admin-package-card-title"><h3>{item.title || "Başlıksız paket"}</h3><p>{item.shortDescription || item.description || "Açıklama bulunmuyor"}</p></div></div>
                  <dl>
                    <div><dt><FixokuCatalogIconV40 kind="book" size={16}/> Kitap</dt><dd>{item.components.filter(c=>c.componentType==="PHYSICAL_PRODUCT").length}</dd></div>
                    <div><dt><FixokuCatalogIconV40 kind="content" size={16}/> İçerik</dt><dd>{packageContentCount(item)}</dd></div>
                    <div><dt><FixokuCatalogIconV40 kind="eye" size={16}/> Görünürlük</dt><dd>{item.panelVisible ? "Panelde" : "Gizli"}</dd></div>
                  </dl>
                  <TrainerModules020P compact/>
                  <div className="admin-package-card-footer"><span className="fx40-package-price">{formatMoney(item.priceGrossMinor)}</span><div className="admin-card-actions">
                    <button type="button" onClick={()=>choose(item)}>Düzenle</button>
                    <button type="button" className="admin-card-preview" onClick={()=>setPreviewPackage(item)}>Önizle</button>
                  </div></div>
                </article>)}
              </div>
            }
            {pageCount > 1 && <div className="admin-package-pagination"><div className="admin-package-pagination-buttons"><button type="button" disabled={pageSafe<=1} aria-label="Önceki sayfa" onClick={()=>setPage(Math.max(1,pageSafe-1))}>‹</button>{Array.from({length:pageCount},(_,i)=>i+1).map(n=><button type="button" className={pageSafe===n?"is-selected":""} aria-current={pageSafe===n?"page":undefined} key={n} onClick={()=>setPage(n)}>{n}</button>)}<button type="button" disabled={pageSafe>=pageCount} aria-label="Sonraki sayfa" onClick={()=>setPage(Math.min(pageCount,pageSafe+1))}>›</button></div><span>Toplam {all.length} paket</span></div>}
            <p className="admin-section-help">Yeni paket oluşturma API'si henüz tamamlanmadı. Mevcut paketler korunur.</p>
          </section>
          {selected && form ? <section className="panel-card admin-package-form" aria-label="Paket düzenleyicisi">
            <div className="admin-editor-heading"><div><h2>{previewOnly ? "Paket Önizlemesi" : "Paketi Düzenle"}</h2></div><span className={`admin-status ${draft ? "admin-status-draft" : "admin-status-published"}`}>{draft ? "Taslak" : "Yayında"}</span></div>
            <div className="admin-package-cover-upload"><div className="admin-book-cover"><FixokuPhotoV41F src={trainerCourseCover020P(selected.title || "",selected.slug) || selected.iconReference} alt={`${selected.title || "Paket"} kapak görseli`}><FixokuCatalogIconV40 kind="package" size={34}/></FixokuPhotoV41F></div><div><strong>Paket Kapak Görseli</strong><p className="admin-section-help">Mevcut görsel görüntülenir. Yeni görsel yükleme henüz bağlanmadı.</p></div></div>
            {!draft && !previewOnly && <div className="admin-feedback"><p>Yayındaki sürüm korunur. Kaydet düğmesi ilk tıklamada mevcut sürümden tek bir taslak açıp değişikliği bu taslağa kaydeder.</p><button type="button" className="admin-outline-button" disabled={busy || !selected.packageVersionId} onClick={()=>void newDraft(selected)}>+ Yeni Sürüm Taslağı Aç</button></div>}
            {previewOnly && <p className="admin-feedback">Önizleme salt okunurdur.</p>}
            <fieldset disabled={!canEdit}><legend>Paket Bilgileri</legend><div className="admin-form-two-column">
              <label>Paket başlığı<input value={form.title} onChange={e=>updateForm({title:e.target.value})}/></label>
              <label>Alt başlık<input value={form.shortDescription} onChange={e=>updateForm({shortDescription:e.target.value})}/></label>
              <label>Bağlantı adı<input value={form.slug} onChange={e=>updateForm({slug:e.target.value})}/></label>
            </div></fieldset>
            <fieldset disabled={!canEdit}>
              <div className="admin-section-toolbar"><legend>Paket İçeriği</legend><button type="button" className="admin-outline-button" onClick={addTextComponent} disabled={!safeComponentEditing}>+ Yeni Madde Ekle</button></div>
              <div className="admin-content-rows">
                {textIndices.map((index, position) => {
                  const component = form.components[index];
                  const isEditing = editingContentIndex === index;
                  return <div className={`admin-content-row ${component.isActive === false ? "is-inactive" : ""}`} key={component.componentId || `text-${index}`}>
                    <div className="admin-reorder-controls"><button type="button" aria-label="Yukarı taşı" disabled={position===0} onClick={()=>moveTextComponent(index,-1)}>↑</button><button type="button" aria-label="Aşağı taşı" disabled={position===textIndices.length-1} onClick={()=>moveTextComponent(index,1)}>↓</button></div>
                    <div className="admin-content-row-main">{isEditing
                      ? <input autoFocus aria-label={`İçerik maddesi ${position+1}`} value={editingContentValue} onChange={e=>setEditingContentValue(e.target.value)}/>
                      : <span className="admin-content-text">{String(component.titleSnapshot || component.title || "")}</span>}
                    </div>
                    <label className="admin-toggle-label"><input type="checkbox" checked={component.isActive !== false} aria-label={`İçerik ${position+1} aktif`} onChange={e=>updateComponent(index,{isActive:e.target.checked})}/><span>{component.isActive !== false ? "Aktif" : "Pasif"}</span></label>
                    <div className="admin-row-actions">{isEditing ? <>
                      <button type="button" onClick={()=>{if(!editingContentValue.trim()){setError("İçerik maddesi boş bırakılamaz.");return;}updateComponent(index,{title:editingContentValue.trim(),titleSnapshot:editingContentValue.trim()});setEditingContentIndex(null);}}>Kaydet</button>
                      <button type="button" className="admin-quiet-button" onClick={()=>setEditingContentIndex(null)}>Vazgeç</button>
                    </> : <>
                      <button type="button" onClick={()=>{setEditingContentIndex(index);setEditingContentValue(String(component.titleSnapshot||component.title||""));}}>Düzenle</button>
                      <button type="button" className="admin-quiet-button" onClick={()=>{removeComponent(index);setEditingContentIndex(null);}}>Kaldır</button>
                    </>}</div>
                  </div>;
                })}
                {!textIndices.length && <p className="admin-empty-inline">Henüz içerik maddesi yok.</p>}
              </div>
              <p className="admin-section-help">Satırlar öğretmen panelinin kullandığı aynı sürüme aittir. Düzenle ve aç/kapa işlemleri önce taslakta hazırlanır; ardından “Ürün ve İçeriği Kaydet” ile sunucuya gönderilir.</p>
            </fieldset>
            <div className="fixoku-trainer-resource-panel-020p" aria-label="Öğretmen eğitim modülleri">
              <strong>Eğitim içerik modülleri</strong>
              <TrainerModules020P />
              <p>Bu sekmeler Öğretmen panelindeki Video Eğitimleri, Müfredat ve Sunumlar alanlarını temsil eder. Dosya listesi veya video adedi Owner paket API'sinde henüz sunulmadığından burada uydurma içerik oluşturulmaz. Özel medya dosyaları mevcut yetkili görüntüleyicide kalır.</p>
            </div>
            <fieldset disabled={!canEdit || !safeComponentEditing}><div className="admin-section-toolbar"><legend>Pakete Eklenen Ürünler</legend><button type="button" className="admin-outline-button" onClick={()=>setPickerOpen(v=>!v)}>+ Ürün Ekle</button></div>
              <div className="admin-book-list">{form.components.filter(c=>c.componentType!=="TEXT_ITEM").map(c=>{const index=form.components.indexOf(c);const product=catalog.products.find(p=>p.id===String(c.physicalProductId||c.productId||c.referenceId));return <div className="admin-book-row" key={c.componentId||`${c.componentType}-${index}`}>
                <div className="admin-book-cover"><FixokuPhotoV41F src={product?.imageReference||c.imageReference} fallbackSrc={productImageDefaultV41F(product?.sku||"")} alt={product?.title||c.title||componentTypeLabel(c.componentType)}><FixokuCatalogIconV40 kind={c.componentType === "PHYSICAL_PRODUCT" ? "book" : c.componentType === "TRAINER_SERVICE" ? "individual" : "software"} size={25}/></FixokuPhotoV41F></div>
                <div className="admin-book-details"><strong>{product?.title||c.title||componentTypeLabel(c.componentType)}</strong><span>{componentTypeLabel(c.componentType)}{product?.sku ? ` · ${product.sku}` : ""}</span><input aria-label="Pakette görünen ürün adı" placeholder="Pakette görünen ad" value={c.displayLabel||""} onChange={e=>updateComponent(index,{displayLabel:e.target.value})}/></div>
                <div className="admin-quantity"><span>Miktar</span><div><button type="button" onClick={()=>updateComponent(index,{quantity:Math.max(1,Number(c.quantity||1)-1)})}>−</button><strong>{Number(c.quantity||1)}</strong><button type="button" onClick={()=>updateComponent(index,{quantity:Math.min(99,Number(c.quantity||1)+1)})}>+</button></div></div>
                <button type="button" className="admin-quiet-button" onClick={()=>removeComponent(index)}>Kaldır</button>
              </div>;})}{!form.components.some(c=>c.componentType!=="TEXT_ITEM") && <p className="admin-empty-inline">Bu pakette ürün veya hizmet bileşeni yok.</p>}</div>
              {pickerOpen && <div className="admin-book-picker fx40-picker"><div className="fx40-picker-head"><h3>Pakete Ürün Ekle</h3><button type="button" className="fx40-picker-close" onClick={()=>setPickerOpen(false)} aria-label="Kapat">×</button></div>
                <div className="fx40-picker-fields"><label><FixokuCatalogIconV40 kind="search" size={17}/><input type="search" placeholder="Ürün ara..." value={productSearch} onChange={e=>setProductSearch(e.target.value)}/></label></div>
                <div className="admin-book-picker-results fx40-picker-grid">{visibleProducts.map(p=><article className="fx40-picker-tile" key={p.id}><div className="fx40-picker-art"><FixokuPhotoV41F src={p.imageReference} fallbackSrc={productImageDefaultV41F(p.sku)} alt={p.title}><FixokuCatalogIconV40 kind="book" size={34}/></FixokuPhotoV41F></div><strong>{p.title}</strong><small>{p.sku}</small><button type="button" disabled={form.components.some(c=>String(c.physicalProductId||c.productId)===p.id)} onClick={()=>addProduct(p)}>Ekle</button></article>)}</div>
              </div>}
            </fieldset>
            {!safeComponentEditing && <p role="alert" className="admin-feedback">Bu pakette mevcut API'nin kaydedemediği bileşen türleri var. Bileşen kayıtları korunuyor.</p>}
            <div className="admin-package-bottom"><fieldset disabled={!canEdit}><legend>Fiyat ve Satış</legend><label>Fiyat<span className="fx41f-money-entry"><input inputMode="decimal" value={form.price} onChange={e=>updateForm({price:e.target.value})}/><span>₺</span></span></label><p className="admin-section-help">KDV: %{Number(selected.vatRateBps||0)/100}</p></fieldset>
              <fieldset disabled={!canEdit}><legend>Görünürlük</legend><div className="admin-visibility-grid">
                <label className="admin-switch"><input type="checkbox" checked={form.panelVisible} onChange={e=>updateForm({panelVisible:e.target.checked})}/><span className="admin-switch-track"/><span>Eğitmen panelinde göster</span></label>
                <label className="admin-switch"><input type="checkbox" checked={false} disabled readOnly/><span className="admin-switch-track"/><span>Web sitesinde göster (eğitmen paketleri için kapalı)</span></label>
                <label className="admin-switch"><input type="checkbox" checked={form.purchaseEnabled} onChange={e=>updateForm({purchaseEnabled:e.target.checked})}/><span className="admin-switch-track"/><span>Satın alınabilir</span></label>
              </div></fieldset></div>
            <div className="admin-editor-actions"><button type="button" className="admin-primary-action" disabled={!canEdit} onClick={()=>void saveFields()}>Paket Bilgilerini Kaydet</button><button type="button" className="admin-secondary-action" disabled={!canEdit||!safeComponentEditing} onClick={()=>void saveComponents()}>Ürün ve İçeriği Kaydet</button><button type="button" className="admin-secondary-action" onClick={()=>{setForm(null);setSelectedId("");}}>Düzenlemeden Çık</button><button type="button" className="admin-secondary-action" disabled={!draft||busy} onClick={()=>void publishDraft()}>Yayınla</button></div>
          </section> : <aside className="panel-card fx41e-empty-editor"><span className="fx41e-empty-art"><FixokuCatalogIconV40 kind="package" size={32}/></span><h2>Paketi Düzenle</h2><p>Soldaki bir paketi seçin.</p></aside>}
        </section>
      )}
      {tab === "products" && <StudentProductCatalogV39C onCatalogChanged={load}/>}
      {tab === "expertise" && <section className="panel-card admin-package-list" aria-label="Uzmanlıklar"><h2>Eğitmen Uzmanlıkları</h2><p className="admin-section-help">Uzmanlık eşleştirme bilgisi eğitmen eğitim paketlerinden bağımsız yetki kayıtlarıyla yönetilir. Bu API gerçek uzmanlık listesi döndürmediği için düzenleme etkin değil.</p><a className="admin-outline-button" href="/panel/admin/egitmen-ticaret">Satışlar ve erişimler</a></section>}
      {previewPackage && <div className="admin-preview-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewPackage(null)}}>
        <section className="admin-preview-dialog fx41j-preview" role="dialog" aria-modal="true" aria-labelledby="trainer-package-preview-title">
          <div className="admin-preview-heading fx41j-preview-heading"><div><span className="admin-editor-eyebrow">PAKET ÖNİZLEMESİ</span><h2 id="trainer-package-preview-title">{previewPackage.title}</h2>{previewPackage.shortDescription && <p>{previewPackage.shortDescription}</p>}</div><button type="button" className="admin-quiet-button" onClick={()=>setPreviewPackage(null)} aria-label="Önizlemeyi kapat">Kapat</button></div>
          <div className="fx41j-preview-cover"><FixokuPhotoV41F src={trainerCourseCover020P(previewPackage.title||"",previewPackage.slug)||previewPackage.iconReference} alt="Eğitmen paket kapak görseli"><FixokuCatalogIconV40 kind="package" size={48}/></FixokuPhotoV41F></div>
          <div className="fx41j-preview-stats" aria-label="Paket özellikleri">
            <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="school" size={21}/><span>Seviye</span><strong>{stageName(stageOf(previewPackage))}</strong></div>
            <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="book" size={21}/><span>Kitap</span><strong>{previewPackage.components.filter(c=>c.componentType==="PHYSICAL_PRODUCT" && c.isActive!==false).length} adet</strong></div>
            <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="content" size={21}/><span>İçerik</span><strong>{packageContentCount(previewPackage)} madde</strong></div>
            <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="eye" size={21}/><span>Görünürlük</span><strong>{previewPackage.panelVisible ? "Eğitmen panelinde" : "Gizli"}</strong></div>
          </div>
          <TrainerModules020P />
          <div className="fx41j-preview-content-title">Paket İçeriği</div>
          <ul className="admin-preview-items">{activeTrainerFeatures020P(previewPackage).map((feature,index)=><li key={`${index}-${feature}`}>{feature}</li>)}</ul>
          <div className="fx41j-preview-content-title">Pakete Eklenen Kitaplar</div>
          <ul className="admin-preview-items">{previewPackage.components.filter(c=>c.componentType==="PHYSICAL_PRODUCT" && c.isActive!==false).map((c,index)=><li key={`${index}-${c.componentId||c.productId}`}>{c.displayLabel || c.title || "Kitap"} · {Number(c.quantity||1)} adet</li>)}</ul>
          <div className="fx41j-preview-footer"><span>Toplam paket fiyatı</span><strong className="admin-preview-price">{formatMoney(previewPackage.priceGrossMinor)}</strong></div>
        </section>
      </div>}
    </main>
  );
}
