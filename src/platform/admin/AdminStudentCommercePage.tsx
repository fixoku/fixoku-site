import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./admin-panel.css";
import { StudentProductCatalogV39C } from "./StudentProductCatalogV39C";
import { FixokuCatalogIconV40, catalogVisualKindV40 } from "./FixokuCatalogIconV40";
import { isApprovedStudentSkuV41 } from "./FixokuApprovedCatalogV41";
import { FixokuPhotoV41F, moneySuffixV41F, productImageDefaultV41F, packageImageDefaultV41F, friendlySkuV41F } from "./FixokuCatalogAssetsV41F";
import { FixokuImageUploadV41F } from "./FixokuImageUploadV41F";

type Product = { id: string; sku: string; title: string; productType: string; isActive?: boolean; serviceMode?: string | null; r6ProductType?: string | null; stageScopes?: string[]; listGrossMinor?: number; vatRateBps?: number; imageReference?: string | null };
type Component = { componentId?: string; componentType: "TEXT_ITEM" | "PHYSICAL_PRODUCT" | "DIGITAL_ACCESS" | "TRAINER_SERVICE"; productId?: string; physicalProductId?: string; sku?: string; title: string; titleSnapshot?: string; displayLabel?: string | null; isActive: boolean; quantity: number; displayOrder: number; imageReference?: string | null };
type Version = { id: string; versionNumber: number; title: string; subtitle: string; description: string; features: string[]; priceMinor: number | null; currency: string | null; status: string; products: Array<{ productId: string; title: string; productType: string; quantity: number }>; components?: Component[] };
type PackageRow = { iconReference?: string | null; id: string; slug: string; status: string; panelVisible: boolean; publicWebVisible: boolean; educationStage: string; eligibleGrades: number[]; displayOrder: number; shippingFeeMinor: number; versions: Version[] };
type Payload = { packages: PackageRow[]; products: Product[] };
type PackagePreviewV41J = {
  title: string; subtitle: string; description: string; components: Component[];
  priceMinor: number | null; currency: string | null; slug: string;
  coverImage: string | null; stage: string; gradeNames: string;
  bookCount: number; contentCount: number; panelVisible: boolean; publicWebVisible: boolean;
};

const stages = [{ value: "PRIMARY", label: "İlkokul" }, { value: "MIDDLE", label: "Ortaokul" }, { value: "HIGH", label: "Lise" }, { value: "ADULT", label: "Yetişkin" }];
const money = (minor: number | null | undefined, _currency = "TRY") => minor == null || Number(minor) <= 0 ? "Fiyat girilmedi" : moneySuffixV41F(minor);
const empty = { title: "", subtitle: "", description: "", slug: "", educationStage: "PRIMARY", eligibleGrades: [3], price: "", currency: "TRY", shippingFee: "", displayOrder: "0", features: "", panelVisible: true, publicWebVisible: false };

// FIXOKU_022K_DUPLICATE_PRODUCT_PREFLIGHT: explain duplicate selections without changing catalog data.
const fx022kDescribeSaveError = (error: unknown, fallback: string): string =>
  error === "PACKAGE_PRODUCT_DUPLICATE"
    ? "Aynı katalog kitabı pakete iki kez eklenmiş. Pakete Eklenen Ürünler bölümünde yinelenen satırı Kaldır ile çıkarın. Farklı bir kitap amaçlandıysa + Ürün Ekle ile doğru katalog ürününü seçin. Pakette görünen ad, ürün kimliğini değiştirmez."
    : typeof error === "string" && error.length ? error : fallback;

const fxR85DescribeError = (error: unknown, yedek: string): string => {
  const messages: Record<string, string> = {
    PACKAGE_VERSION_NOT_FOUND: "Paket sürümü bulunamadı. Katalog yenilenerek tekrar deneyin.",
    PACKAGE_NOT_FOUND: "Paket bulunamadı. Katalog yenilenerek tekrar deneyin.",
    PACKAGE_PERMISSION_REQUIRED: "Bu işlem için paket yayınlama yetkisi gerekiyor.",
    CORE001_PUBLICATION_VALIDATION_FAILED: "Paket yayınlanamadı. Fiyat, aktif ürün ve içerik koşullarını kontrol edin.",
    CORE001_TARGET_PRICE_AUTHORITY_INVALID: "Paket fiyatı onaylı katalog fiyatıyla eşleşmiyor.",
    PACKAGE_VERSION_NOT_DRAFT: "Yalnızca taslak sürüm yayınlanabilir.",
    PUBLISHED_VERSION_IMMUTABLE: "Yayımlanmış sürüm korunuyor. Sistem taslak sürüm üzerinden devam eder.",
  };
  return typeof error === "string" && messages[error] ? messages[error] : yedek;
};export function AdminStudentCommercePage() {
  /* FX39C_VERIFIED_SNAPSHOT */
  const [packageCoverV39C,setPackageCoverV39C]=useState("");
  const fx41eInitialSelection = useRef(false);
  const [pickerTypeV39C,setPickerTypeV39C]=useState<"ALL"|"PHYSICAL"|"SOFTWARE"|"INDIVIDUAL"|"GROUP">("ALL");
  const navigate = useNavigate(); const [params] = useSearchParams(); const catalogTabV39C = params.get("tab") === "urunler" ? "products" : "packages";
  const [data, setData] = useState<Payload>({ packages: [], products: [] }); const [message, setMessage] = useState(""); const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle"); const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); const [form, setForm] = useState({ ...empty }); const [components, setComponents] = useState<Component[]>([]); const [productSearch, setProductSearch] = useState(""); const [packageSearch, setPackageSearch] = useState(""); const [pickerOpen, setPickerOpen] = useState(false); const [editingItem, setEditingItem] = useState<string | null>(null); const [editing, setEditing] = useState<{ packageId: string; versionId: string } | null>(null); const [preview, setPreview] = useState<PackagePreviewV41J | null>(null); const openingPackageRef = useRef<string | null>(null); const [openingEditPackageId, setOpeningEditPackageId] = useState<string | null>(null); const [listFilter, setListFilter] = useState<"ALL" | "PRIMARY" | "MIDDLE" | "HIGH" | "ADULT" | "PARAGRAPH">("ALL");
  const load = async () => { const response = await fetch("/api/admin/student-commerce-packages", { credentials: "same-origin", cache: "no-store" }); if (response.ok) { const next = await response.json(); setData(next); return next as Payload; } setMessage("Öğrenci ticaret kataloğu yüklenemedi."); return null; };
  useEffect(() => { void load(); }, []);
  // Open an existing draft only once per mounted visit. No package creation, no DB write.
  useEffect(() => {
    if (fx41eInitialSelection.current || catalogTabV39C !== "packages" || params.has("versionId") || !data.packages.length) return;
    fx41eInitialSelection.current = true;
    const preferred = data.packages.find((item) => item.slug === "student-primary-platinum-egitim");
    const draft = preferred?.versions.find((item) => item.status === "DRAFT");
    if (draft) navigate(`/panel/admin/ogrenci-ticaret?versionId=${draft.id}`, { replace:true });
  }, [catalogTabV39C, params, data.packages, navigate]);
  useEffect(() => { const versionId = params.get("versionId"); if (!versionId || !data.packages.length) return; for (const item of data.packages) { const version = item.versions.find((candidate) => candidate.id === versionId); if (!version) continue; setEditing({ packageId: item.id, versionId }); setPackageCoverV39C(item.iconReference || ""); setForm({ title: version.title, subtitle: version.subtitle, description: version.description, slug: item.slug, educationStage: item.educationStage, eligibleGrades: item.eligibleGrades, price: version.priceMinor == null ? "" : String(version.priceMinor / 100), currency: version.currency || "TRY", shippingFee: item.shippingFeeMinor ? String(item.shippingFeeMinor / 100) : "", displayOrder: String(item.displayOrder), features: (version.features || []).join("\n"), panelVisible: item.panelVisible, publicWebVisible: item.publicWebVisible }); setComponents((version.components || version.products.map((product, index) => ({ componentType: "PHYSICAL_PRODUCT" as const, productId: product.productId, physicalProductId: product.productId, title: product.title, isActive: true, quantity: product.quantity, displayOrder: index }))).map((component, index) => ({ ...component, displayOrder: index }))); setEditingItem(null); return; } }, [params, data.packages]);
  const currentVersion = editing ? data.packages.find((item) => item.id === editing.packageId)?.versions.find((version) => version.id === editing.versionId) : null;
  const reset = () => { setPackageCoverV39C(""); setEditing(null); setForm({ ...empty }); setComponents([]); setPickerOpen(false); setEditingItem(null); navigate("/panel/admin/ogrenci-ticaret"); };
  const markDirty = () => { if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; } setSaveStatus("idle"); };
  const updateForm = (patch: Partial<typeof empty>) => { markDirty(); setForm((current) => ({ ...current, ...patch })); };
  const updateComponent = (index: number, patch: Partial<Component>) => { markDirty(); setComponents((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); };
  const showSaved = () => { setSaveStatus("success"); setMessage("Paket Bilgileri Kaydedildi"); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveTimerRef.current = setTimeout(() => { setSaveStatus("idle"); saveTimerRef.current = null; }, 1000); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!editing) { setSaveStatus("error"); setMessage("Yeni paket oluşturma yetkisi kapalıdır."); return; }
    const seenPhysicalProductIds = new Set<string>();
    for (const component of components) {
      if (component.componentType !== "PHYSICAL_PRODUCT") continue;
      const productId = String(component.physicalProductId || component.productId || "").trim();
      if (!productId) continue;
      if (seenPhysicalProductIds.has(productId)) {
        setPickerOpen(true);
        setSaveStatus("error");
        setMessage(fx022kDescribeSaveError("PACKAGE_PRODUCT_DUPLICATE", "Ürün seçimini kontrol edin."));
        return;
      }
      seenPhysicalProductIds.add(productId);
    }
    const payload = { ...form, iconReference:packageCoverV39C.trim(), currency:form.price.trim() ? "TRY" : null, priceMinor: form.price === "" ? null : Math.round(Number(form.price.replace(",", ".")) * 100), shippingFeeMinor: form.shippingFee === "" ? 0 : Math.round(Number(form.shippingFee.replace(",", ".")) * 100), eligibleGrades: form.educationStage === "ADULT" ? [] : form.eligibleGrades, features: form.features.split("\n").map((value) => value.trim()).filter(Boolean), products: components.filter((item) => item.componentType === "PHYSICAL_PRODUCT").map((item, index) => ({ productId: item.physicalProductId || item.productId, quantity: item.quantity, displayOrder: index })), components };
    setSaveStatus("saving"); setMessage("Kaydediliyor...");
    try {
      const response = await fetch("/api/admin/student-commerce-packages", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, ...editing }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveStatus("error");
        setMessage(body.message || (Array.isArray(body.missingConditions) ? body.missingConditions.join(" ") : "") || fxR85DescribeError(body.error, fx022kDescribeSaveError(body.error, "Paket kaydedilemedi.")));
        const nextVersionId = typeof body.packageVersionId === "string" ? body.packageVersionId : editing.versionId;
        const refreshed = await load();
        if (refreshed?.packages.some((row) => row.id === editing.packageId && row.versions.some((version) => version.id === nextVersionId))) {
          setEditing({ packageId: editing.packageId, versionId: nextVersionId });
          navigate(`/panel/admin/ogrenci-ticaret?versionId=${encodeURIComponent(nextVersionId)}`, { replace: true });
        }
        return;
      }
      const nextVersionId = typeof body.packageVersionId === "string" ? body.packageVersionId : editing.versionId;
      const refreshed = await load();
      if (!refreshed || !refreshed.packages.some((row) => row.id === editing.packageId && row.versions.some((version) => version.id === nextVersionId))) {
        throw new Error("Kayıt tamamlandı ancak paket yeniden okunamadı. Başarı onayı verilmedi; lütfen tekrar deneyin.");
      }
      setEditing({ packageId: editing.packageId, versionId: nextVersionId });
      navigate(`/panel/admin/ogrenci-ticaret?versionId=${encodeURIComponent(nextVersionId)}`, { replace: true });
      showSaved();
    } catch (error) {
      setSaveStatus("error");
      setMessage(error instanceof Error ? error.message : "Paket kaydedilemedi.");
    }
  };
  const publish = async (versionId: string) => { const response = await fetch("/api/admin/student-commerce-packages", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish", versionId }) }); const body = await response.json().catch(() => ({})); setMessage(response.ok ? "Paket yayınlandı." : fxR85DescribeError(body.error, "Paket yayınlanamadı. Yayın koşullarını kontrol edin.")); if (response.ok) void load(); };
  const retire = async (versionId: string) => { const response = await fetch("/api/admin/student-commerce-packages", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "retire", versionId }) }); const body = await response.json().catch(() => ({})); setMessage(response.ok ? "Paket pasife alındı." : body.error || "Paket pasife alınamadı."); if (response.ok) void load(); };
  const createDraft = async (packageId: string) => {
    if (openingPackageRef.current) return;
    openingPackageRef.current = packageId;
    setOpeningEditPackageId(packageId);
    setMessage("Paket düzenlemeye hazırlanıyor...");
    try {
      const item = data.packages.find((row) => row.id === packageId);
      if (!item) throw new Error("Düzenlenecek paket bulunamadı. Sayfayı yenileyin.");
      const existingDraft = item.versions.find((version) => version.status === "DRAFT");
      if (existingDraft) {
        setMessage("");
        navigate(`/panel/admin/ogrenci-ticaret?versionId=${encodeURIComponent(existingDraft.id)}`);
        return;
      }
      const response = await fetch("/api/admin/student-commerce-packages", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "createDraft", packageId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(fxR85DescribeError(body.error, "Yeni taslak oluşturulamadı."));
      const versionId = typeof body.packageVersionId === "string" ? body.packageVersionId : "";
      if (!versionId) throw new Error("Taslak cevabında sürüm kimliği bulunamadı. Paket kaydını kontrol edin.");
      // Ensure the new version is in the local catalog before navigating.
      // Otherwise the versionId selection effect cannot find it and the editor stays closed.
      const refreshed = await load();
      if (!refreshed?.packages.some((row) => row.id === packageId && row.versions.some((version) => version.id === versionId))) {
        throw new Error("Taslak açıldı fakat güncel listede henüz görünmüyor. Yenileyip tekrar deneyin; yeni bir taslak daha oluşturmayın.");
      }
      setMessage("");
      navigate(`/panel/admin/ogrenci-ticaret?versionId=${encodeURIComponent(versionId)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paket düzenleyicisi açılamadı.");
    } finally {
      openingPackageRef.current = null;
      setOpeningEditPackageId(null);
    }
  };
  const addText = () => {
    markDirty();
    const nextIndex = components.length;
    setComponents((current) => [...current, { componentType: "TEXT_ITEM", title: "Yeni madde", titleSnapshot: "Yeni madde", isActive: true, quantity: 1, displayOrder: current.length }]);
    setEditingItem(`new-${nextIndex}`);
  };
  const removeComponent = (index: number) => { markDirty(); setComponents((current) => current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, displayOrder: itemIndex }))); };
  const moveComponent = (index: number, direction: -1 | 1) => { markDirty(); setComponents((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, itemIndex) => ({ ...item, displayOrder: itemIndex })); }); };
  const addProduct = (product: Product) => { if (components.some((item) => item.productId === product.id || item.physicalProductId === product.id)) return; markDirty(); const componentType = product.productType === "PHYSICAL" ? "PHYSICAL_PRODUCT" : product.productType === "SOFTWARE" || product.productType === "DIGITAL" ? "DIGITAL_ACCESS" : "TRAINER_SERVICE"; setComponents((current) => [...current, { componentType, productId: product.id, physicalProductId: product.id, title: product.title, sku: product.sku, imageReference: product.imageReference, isActive: true, quantity: 1, displayOrder: current.length }]); };
  const filteredProducts = data.products.filter((product) => { if (!isApprovedStudentSkuV41(product.sku) || product.productType === "DIGITAL" || product.isActive === false) return false; if (pickerTypeV39C === "INDIVIDUAL" || pickerTypeV39C === "GROUP") {
      if (product.productType !== "SERVICE" || product.serviceMode !== (pickerTypeV39C === "GROUP" ? "GROUP" : "INDIVIDUAL")) return false;
    } else if (pickerTypeV39C !== "ALL" && product.productType !== pickerTypeV39C) return false;
    const stageCompatible = !form.educationStage || !product.stageScopes?.length || product.stageScopes.includes(form.educationStage);
    const supported = ["PHYSICAL", "SOFTWARE", "SERVICE"].includes(product.productType);
    return stageCompatible && supported && (`${product.title} ${product.sku}`).toLocaleLowerCase("tr-TR").includes(productSearch.toLocaleLowerCase("tr-TR"));
  });
  const listRows = useMemo(() => data.packages.flatMap((item) => { const versions = [...item.versions].sort((a, b) => b.versionNumber - a.versionNumber); const version = versions.find((candidate) => candidate.status === "DRAFT") || versions.find((candidate) => candidate.status === "PUBLISHED") || versions[0]; if (!version) return []; const category = `${item.slug} ${version.title} ${version.subtitle || ""}`.toLocaleUpperCase("tr-TR").includes("PARAGRAF") ? "PARAGRAPH" : item.educationStage; const bookCount = (version.components || []).filter((component) => component.componentType === "PHYSICAL_PRODUCT" && component.isActive !== false).length || version.products.filter((product) => product.productType === "PHYSICAL").length; return [{ item, version, category, bookCount }]; }), [data.packages]);
  const visibleRows = listRows.filter((row) => (listFilter === "ALL" || row.category === listFilter) && (`${row.version.title} ${row.version.subtitle} ${row.item.slug}`).toLocaleLowerCase("tr-TR").includes(packageSearch.toLocaleLowerCase("tr-TR")));
  const stageLabel = (category: string) => category === "PARAGRAPH" ? "Paragraf" : stages.find((stage) => stage.value === category)?.label || category; const statusLabel = (status: string) => status === "PUBLISHED" ? "Yayında" : status === "DRAFT" ? "Taslak" : "Pasif"; const statusClass = (status: string) => status === "PUBLISHED" ? "admin-status-published" : status === "DRAFT" ? "admin-status-draft" : "admin-status-retired";
  const listFilters: { value: typeof listFilter; label: string }[] = [{ value: "ALL", label: "Tümü" }, { value: "PRIMARY", label: "İlkokul" }, { value: "MIDDLE", label: "Ortaokul" }, { value: "HIGH", label: "Lise" }, { value: "ADULT", label: "Yetişkin" }, { value: "PARAGRAPH", label: "Paragraf" }];
  const attachedBooks = components.map((component, index) => ({ component, index })).filter(({ component }) => component.componentType !== "TEXT_ITEM");
  // FIXOKU_CATALOG_PAGINATION_STUDENT
  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 6;
  const catalogPageCount = Math.max(1, Math.ceil(visibleRows.length / catalogPageSize));
  const catalogSafePage = Math.min(catalogPage, catalogPageCount);
  const pagedRows = visibleRows.slice(
    (catalogSafePage - 1) * catalogPageSize,
    catalogSafePage * catalogPageSize
  );
  // Only print the description when it actually differs from the subtitle.
  const previewDescriptionV41J = preview &&
    preview.description.trim().toLocaleLowerCase("tr-TR") !== preview.subtitle.trim().toLocaleLowerCase("tr-TR")
      ? preview.description.trim() : "";


  return <main className="platform-foundation-panel admin-panel commerce-package-page fx-student-v38c fx40-catalog"><nav aria-label="Yönetim paneli menüsü"><Link to="/panel/admin">Genel Bakış</Link><Link to="/panel/admin/urunler">Ürün kataloğu</Link><Link to="/panel/admin/ogrenci-ticaret" aria-current="page">Öğrenci ticareti</Link></nav><header className="admin-page-heading commerce-hero"><div className="commerce-hero-icon" aria-hidden="true"><FixokuCatalogIconV40 kind="school" size={34}/></div><div><h1>Öğrenci Paketleri</h1><p>Öğrenciye sunulan paketleri ve ürünlerini tek merkezden yönetin.</p></div></header><div className="fx39c-tabs" role="tablist" aria-label="Öğrenci katalog yönetimi"><button type="button" role="tab" aria-selected={catalogTabV39C==="packages"} className={catalogTabV39C==="packages"?"selected":""} onClick={()=>navigate("/panel/admin/ogrenci-ticaret")}><FixokuCatalogIconV40 kind="package" size={19}/> Paketler <span className="fx40-tab-count">({listRows.length})</span></button><button type="button" role="tab" aria-selected={catalogTabV39C==="products"} className={catalogTabV39C==="products"?"selected":""} onClick={()=>navigate("/panel/admin/ogrenci-ticaret?tab=urunler")}><FixokuCatalogIconV40 kind="grid" size={19}/> Ürünler</button></div><section className="catalog-authority-map" aria-label="Katalog sorumlulukları"><article><strong>Öğrenci Paketi</strong><span>Müşteriye satılan teklif ve paket sürümü</span></article><article><strong>Ürün &amp; Stok</strong><span>Kitap, yazılım ve hizmet gibi paketin bileşenleri</span></article><article><strong>Sipariş &amp; Ödeme</strong><span>Satış gerçekleştikten sonraki ticari işlem kayıtları</span></article></section>{message && <p className={`admin-feedback admin-feedback-${saveStatus}`} role={saveStatus === "error" ? "alert" : "status"}>{message}</p>}<section className={`admin-package-layout ${editing ? "is-editing" : "is-list-only"}`} hidden={catalogTabV39C === "products"}>
    {!editing && <aside className="panel-card fx41e-empty-editor" aria-label="Paket düzenleme bilgisi">
      <span className="fx41e-empty-art"><FixokuCatalogIconV40 kind="package" size={32}/></span>
      <h2>Paketi Düzenle</h2>
      <p>Düzenlemek istediğiniz paketin kartındaki <strong>Düzenle</strong> butonuna basın. Mevcut taslak varsa açılır; yeni kayıt oluşturulmaz.</p>
    </aside>}
    {editing && <form className="panel-card admin-package-form" onSubmit={(event) => void submit(event)}><div className="admin-editor-heading"><div><h2>Paketi Düzenle</h2></div>{currentVersion && <span className={`admin-status ${statusClass(currentVersion.status)}`}>{statusLabel(currentVersion.status)}</span>}</div><FixokuImageUploadV41F kind="package" id={form.slug} label="Paket Kapak Görseli"
        width={1200} height={675} value={packageCoverV39C} fallback={packageImageDefaultV41F(form.slug)}
        onChange={(value) => { markDirty(); setPackageCoverV39C(value); }}>
        <FixokuCatalogIconV40 kind={catalogVisualKindV40(form.title)} size={37}/>
      </FixokuImageUploadV41F><fieldset><legend>Paket Bilgileri</legend><div className="admin-form-two-column"><label>Paket başlığı<input required value={form.title} onChange={(event) => updateForm({ title: event.target.value })} /></label><label>Alt başlık<input value={form.subtitle} onChange={(event) => updateForm({ subtitle: event.target.value })} /></label></div></fieldset>
    <fieldset><div className="admin-section-toolbar"><legend>Paket İçeriği</legend><button type="button" className="admin-outline-button" onClick={addText}>+ Yeni Madde Ekle</button></div><p className="admin-section-help">Paket açıklama maddelerini buradan düzenleyin. Bu metinlerde görsel kullanılmaz.</p><div className="admin-content-rows">{components.map((component, index) => component.componentType !== "TEXT_ITEM" ? null : <div className={`admin-content-row ${component.isActive ? "" : "is-inactive"}`} key={`${component.componentId || "text"}-${index}`}><div className="admin-reorder-controls"><button type="button" aria-label="Yukarı taşı" onClick={() => moveComponent(index, -1)}>↑</button><button type="button" aria-label="Aşağı taşı" onClick={() => moveComponent(index, 1)}>↓</button></div><div className="admin-content-row-main">{editingItem === (component.componentId || `new-${index}`) ? <input autoFocus value={component.title} onChange={(event) => updateComponent(index, { title: event.target.value })} /> : <span className="admin-content-text">{component.title}</span>}<small>Metin maddesi</small></div><label className="admin-toggle-label"><input type="checkbox" checked={component.isActive} onChange={(event) => updateComponent(index, { isActive: event.target.checked })} /><span>{component.isActive ? "Aktif" : "Pasif"}</span></label>{editingItem === (component.componentId || `new-${index}`) ? <div className="admin-row-actions"><button type="button" onClick={() => setEditingItem(null)}>Kaydet</button><button type="button" className="admin-quiet-button" onClick={() => setEditingItem(null)}>Vazgeç</button></div> : <div className="admin-row-actions"><button type="button" onClick={() => setEditingItem(component.componentId || `new-${index}`)}>Düzenle</button><button type="button" className="admin-quiet-button" onClick={() => removeComponent(index)}>Kaldır</button></div>}</div>)}{!components.some((component) => component.componentType === "TEXT_ITEM") && <p className="admin-empty-inline">Henüz metin maddesi eklenmedi.</p>}</div></fieldset>
    <fieldset><div className="admin-section-toolbar"><legend>Pakete Eklenen Ürünler</legend><button type="button" className="admin-outline-button" onClick={() => setPickerOpen((open) => !open)}>+ Ürün Ekle</button></div><p className="admin-section-help">Kitap, yazılım, birebir ve küçük grup eğitimi katalogdan seçilir. Paketten kaldırmak ürün kaydını silmez.</p><div className="admin-book-list">{attachedBooks.map(({ component, index }) => <div className="admin-book-row" key={`${component.componentId || component.productId}-${index}`}><div className={`admin-book-cover ${component.componentType === "PHYSICAL_PRODUCT" ? "fx41h-book-cover" : "fx41h-other-cover"}`}>{<FixokuPhotoV41F src={data.products.find((product) => product.id === (component.productId || component.physicalProductId))?.imageReference || component.imageReference} fallbackSrc={productImageDefaultV41F(data.products.find((product) => product.id === (component.productId || component.physicalProductId))?.sku || component.sku || "")} alt={component.title}><FixokuCatalogIconV40 kind={component.componentType === "PHYSICAL_PRODUCT" ? "book" : component.componentType === "TRAINER_SERVICE" ? "individual" : "software"} size={25}/></FixokuPhotoV41F>}</div><div className="admin-book-details"><strong>{component.title}</strong><span>{component.sku ? friendlySkuV41F(component.sku) : "Ürün kodu belirtilmedi"}</span>{component.displayLabel !== component.title && <input aria-label="Pakette görünen ürün adı" placeholder="Pakette görünen ad" value={component.displayLabel || ""} onChange={(event) => updateComponent(index, { displayLabel: event.target.value })} />}</div><div className="admin-quantity"><span>Miktar</span><div><button type="button" aria-label="Miktarı azalt" onClick={() => updateComponent(index, { quantity: Math.max(1, component.quantity - 1) })}>−</button><strong>{component.quantity}</strong><button type="button" aria-label="Miktarı artır" onClick={() => updateComponent(index, { quantity: Math.min(99, component.quantity + 1) })}>+</button></div></div><button type="button" className="admin-quiet-button" onClick={() => removeComponent(index)}>Kaldır</button></div>)}{!attachedBooks.length && <p className="admin-empty-inline">Bu pakete henüz ürün eklenmedi.</p>}</div>{pickerOpen && <div className="admin-book-picker fx40-picker"><div className="fx40-picker-head"><h3>Pakete Ürün Ekle</h3><button type="button" className="fx40-picker-close" aria-label="Ürün seçiciyi kapat" onClick={()=>setPickerOpen(false)}>×</button></div><div className="fx40-picker-fields"><label><FixokuCatalogIconV40 kind="search" size={17}/><input aria-label="Ürün ara" type="search" placeholder="Kitap, yazılım veya eğitim ara..." value={productSearch} onChange={(event) => setProductSearch(event.target.value)} /></label><span className="fx40-picker-stage"><FixokuCatalogIconV40 kind="school" size={16}/>{stageLabel(form.educationStage)}</span></div><div className="fx39c-picker-tabs" aria-label="Ürün türü filtresi">{([ ["ALL","Tümü"],["PHYSICAL","Kitaplar"],["SOFTWARE","Yazılım"],["INDIVIDUAL","Birebir Eğitim"],["GROUP","Küçük Grup"] ] as const).map(([value,label])=><button key={value} type="button" className={pickerTypeV39C===value?"selected":""} onClick={()=>setPickerTypeV39C(value)}>{label}</button>)}</div><div className="admin-book-picker-results fx40-picker-grid">{filteredProducts.map((product) => { const added = components.some((component) => component.componentType !== "TEXT_ITEM" && (component.productId === product.id || component.physicalProductId === product.id)); return <article className="fx40-picker-tile" key={product.id}><div className={`fx40-picker-art fx40-picker-art-${product.productType.toLowerCase()}`}><FixokuPhotoV41F src={product.imageReference} fallbackSrc={productImageDefaultV41F(product.sku)} alt={product.title}><FixokuCatalogIconV40 kind={catalogVisualKindV40(product.title,product.productType,product.serviceMode || undefined)} size={38}/></FixokuPhotoV41F></div><span className="fx40-picker-type">{product.productType === "PHYSICAL" ? "Kitap" : product.productType === "SERVICE" ? (product.serviceMode === "GROUP" ? "Küçük Grup Eğitimi" : "Birebir Eğitim") : product.productType === "SOFTWARE" ? "Yazılım" : "Dijital"}</span><strong>{product.title}</strong><small>{friendlySkuV41F(product.sku)}</small><button type="button" disabled={added} onClick={() => addProduct(product)}>{added ? <><FixokuCatalogIconV40 kind="check" size={17}/> Eklendi</> : <><FixokuCatalogIconV40 kind="plus" size={17}/> Ekle</>}</button></article>; })}{!filteredProducts.length && <p className="fx40-no-products">Bu seviyeye ve filtreye uygun ürün bulunamadı.</p>}</div></div>}</fieldset>
    <div className="admin-package-bottom"><fieldset><legend>Fiyat ve Satış</legend><div className="admin-form-three-column"><label>Fiyat<span className="fx41f-money-entry"><input inputMode="decimal" placeholder="Fiyat girilmedi" value={form.price} onChange={(event) => updateForm({ price: event.target.value })} /><span>₺</span></span></label></div></fieldset><fieldset><legend>Görünürlük</legend><div className="admin-visibility-grid"><label className="admin-switch"><input type="checkbox" checked={form.panelVisible} onChange={(event) => updateForm({ panelVisible: event.target.checked })} /><span className="admin-switch-track" /><span>Öğrenci panelinde göster</span></label><label className="admin-switch"><input type="checkbox" checked={form.publicWebVisible} onChange={(event) => updateForm({ publicWebVisible: event.target.checked })} /><span className="admin-switch-track" /><span>Web sitesinde göster</span></label></div></fieldset></div><div className="admin-editor-actions"><button type="submit" className="admin-primary-action" disabled={saveStatus === "saving"}>{saveStatus === "saving" ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}</button><button type="button" className="admin-secondary-action" onClick={reset}>Düzenlemeden Çık</button>{currentVersion?.status === "DRAFT" && <button type="button" className="admin-secondary-action" disabled={!currentVersion.priceMinor || !components.some((component)=>component.componentType!=="TEXT_ITEM" && component.isActive!==false)} onClick={() => void publish(currentVersion.id)}>Yayınla</button>}{currentVersion?.status === "PUBLISHED" && <button type="button" className="admin-danger-action" onClick={() => void retire(currentVersion.id)}>Pasife al</button>}</div></form>}
    <section className="panel-card admin-package-list"><div className="admin-package-list-heading"><div><h2>Paketler ({listRows.length})</h2><p>Mevcut öğrenci paketleri</p></div><label className="admin-package-search"><span className="sr-only">Paket ara</span><input type="search" placeholder="Paket ara..." value={packageSearch} onChange={(event) => { setPackageSearch(event.target.value); setCatalogPage(1); }} /></label></div><div className="admin-package-filters" aria-label="Paket seviyesi filtresi">{listFilters.map((filter) => <button type="button" key={filter.value} className={listFilter === filter.value ? "is-selected" : ""} aria-pressed={listFilter === filter.value} onClick={() => { setListFilter(filter.value); setCatalogPage(1); }}>{filter.label}<span>{filter.value === "ALL" ? listRows.length : listRows.filter((row) => row.category === filter.value).length}</span></button>)}</div><div className="admin-package-grid">{pagedRows.map(({ item, version, category, bookCount }) => <article className={`admin-package-card ${editing?.packageId === item.id ? "is-selected" : ""}`} key={item.id}><div className="admin-package-card-top"><span className={`admin-status ${statusClass(version.status)}`}>{statusLabel(version.status)}</span><span className="admin-package-stage">{stageLabel(category)}</span></div><div className="fx40-package-identity"><div className={`fx40-package-art fx40-art-${category.toLowerCase()}`}><FixokuPhotoV41F src={item.iconReference} fallbackSrc={packageImageDefaultV41F(item.slug)} alt={version.title}><FixokuCatalogIconV40 kind={catalogVisualKindV40(version.title)} size={39}/></FixokuPhotoV41F></div><div className="admin-package-card-title"><h3>{version.title}</h3>{version.subtitle && <p>{version.subtitle}</p>}</div></div><dl><div><dt><FixokuCatalogIconV40 kind="book" size={16}/> Kitap</dt><dd>{bookCount}</dd></div><div><dt><FixokuCatalogIconV40 kind="content" size={16}/> İçerik</dt><dd>{(version.components || []).filter((component) => component.componentType === "TEXT_ITEM").length}</dd></div><div><dt><FixokuCatalogIconV40 kind="eye" size={16}/> Görünürlük</dt><dd>{item.panelVisible ? "Panelde" : "Gizli"}</dd></div></dl><div className="admin-package-card-footer"><span className="fx40-package-price">{money(version.priceMinor, version.currency || "TRY")}</span><div className="admin-card-actions"><button type="button" disabled={Boolean(openingEditPackageId)} aria-busy={openingEditPackageId === item.id} onClick={() => version.status === "DRAFT" ? navigate(`/panel/admin/ogrenci-ticaret?versionId=${encodeURIComponent(version.id)}`) : void createDraft(item.id)}>{openingEditPackageId === item.id ? "Açılıyor..." : "Düzenle"}</button><button type="button" className="admin-card-preview" onClick={() => setPreview({
  title: version.title, subtitle: version.subtitle, description: version.description,
  components: version.components || [], priceMinor: version.priceMinor, currency: version.currency,
  slug: item.slug, coverImage: item.iconReference || null, stage: stageLabel(category),
  gradeNames: category === "PARAGRAPH" ? "" : (item.eligibleGrades || []).filter((grade) => Number.isInteger(grade) && grade >= 1 && grade <= 12).map((grade) => `${grade}. sınıf`).join(", "),
  bookCount, contentCount: (version.components || []).filter((component) => component.componentType === "TEXT_ITEM" && component.isActive !== false).length,
  panelVisible: item.panelVisible, publicWebVisible: item.publicWebVisible,
})}>Önizle</button></div></div></article>)}</div>{catalogPageCount > 1 && <div className="admin-package-pagination"><div className="admin-package-pagination-buttons"><button type="button" aria-label="Önceki sayfa" disabled={catalogSafePage <= 1} onClick={() => setCatalogPage(Math.max(1, catalogSafePage - 1))}>‹</button>{Array.from({ length: catalogPageCount }, (_, index) => index + 1).map((page) => <button type="button" key={page} className={page === catalogSafePage ? "is-selected" : ""} aria-current={page === catalogSafePage ? "page" : undefined} onClick={() => setCatalogPage(page)}>{page}</button>)}<button type="button" aria-label="Sonraki sayfa" disabled={catalogSafePage >= catalogPageCount} onClick={() => setCatalogPage(Math.min(catalogPageCount, catalogSafePage + 1))}>›</button></div><span>Toplam {visibleRows.length} paket</span></div>}{!visibleRows.length && <p className="admin-package-empty">Bu filtrede paket bulunamadı.</p>}</section></section>{preview && <div className="admin-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
  <section className="admin-preview-dialog fx41j-preview" role="dialog" aria-modal="true" aria-labelledby="student-package-preview-title">
    <div className="admin-preview-heading fx41j-preview-heading"><div><span className="admin-editor-eyebrow">PAKET ÖNİZLEMESİ</span><h2 id="student-package-preview-title">{preview.title}</h2>{preview.subtitle.trim() && <p>{preview.subtitle}</p>}</div><button type="button" className="admin-quiet-button" onClick={() => setPreview(null)} aria-label="Önizlemeyi kapat">Kapat</button></div>
    <div className="fx41j-preview-cover"><FixokuPhotoV41F src={preview.coverImage} fallbackSrc={packageImageDefaultV41F(preview.slug)} alt={`${preview.title} kapak görseli`}><FixokuCatalogIconV40 kind={catalogVisualKindV40(preview.title)} size={52}/></FixokuPhotoV41F></div>
    <div className="fx41j-preview-stats" aria-label="Paket özellikleri">
      <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="package" size={21}/><span>Sınıf / Seviye</span><strong>{preview.stage}</strong>{preview.gradeNames && <small>{preview.gradeNames}</small>}</div>
      <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="book" size={21}/><span>Kitap</span><strong>{preview.bookCount} adet</strong></div>
      <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="content" size={21}/><span>İçerik</span><strong>{preview.contentCount} madde</strong></div>
      <div className="fx41j-preview-stat"><FixokuCatalogIconV40 kind="eye" size={21}/><span>Görünürlük</span><strong>{preview.panelVisible && preview.publicWebVisible ? "Panel ve web" : preview.panelVisible ? "Panelde" : preview.publicWebVisible ? "Web sitesinde" : "Gizli"}</strong></div>
    </div>
    {previewDescriptionV41J && <p className="admin-preview-description">{previewDescriptionV41J}</p>}
    <div className="fx41j-preview-content-title">Paket İçeriği</div>
    <ul className="admin-preview-items">{preview.components.filter((component) => component.isActive !== false).map((component, index) => <li key={`${component.componentId || component.title}-${index}`}>{component.componentType === "PHYSICAL_PRODUCT" ? (component.displayLabel || component.title) : component.title}</li>)}</ul>
    <div className="fx41j-preview-footer"><span>Toplam paket fiyatı</span><strong className="admin-preview-price">{money(preview.priceMinor, preview.currency || "TRY")}</strong></div>
  </section>
</div>}{catalogTabV39C === "products" && <StudentProductCatalogV39C onCatalogChanged={load} />}</main>;
}
