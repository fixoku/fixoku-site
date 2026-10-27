import { FormEvent, useEffect, useMemo, useState } from "react";
import { FixokuCatalogIconV40, catalogVisualKindV40 } from "./FixokuCatalogIconV40";
import { approvedStudentCatalogV41, approvedCatalogCountV41, isApprovedStudentSkuV41 } from "./FixokuApprovedCatalogV41";
import { FixokuPhotoV41F, friendlySkuV41F, moneySuffixV41F, productImageDefaultV41F } from "./FixokuCatalogAssetsV41F";
import { FixokuImageUploadV41F } from "./FixokuImageUploadV41F";

type Stage = "ALL" | "PRIMARY" | "MIDDLE" | "HIGH" | "ADULT";
type ProductType = "PHYSICAL" | "SOFTWARE" | "SERVICE";
type CatalogProductV39C = {
  id: string; sku: string; title: string; description?: string;
  productType: ProductType; isActive: boolean;
  imageReference?: string | null; stageScopes?: string[]; serviceMode?: string | null;
  stockLocation?: string | null; costMinor?: number; listGrossMinor?: number; vatRateBps?: number;
};
type ProductFormV39C = {
  id: string; sku: string; title: string; description: string;
  productType: ProductType; imageReference: string;
  stages: Stage[]; isActive: boolean; serviceMode: "INDIVIDUAL" | "GROUP"; listGrossInput: string;
};
const stageList: { id: Stage; name: string }[] = [
  { id: "ALL", name: "Tümü" }, { id: "PRIMARY", name: "İlkokul" },
  { id: "MIDDLE", name: "Ortaokul" }, { id: "HIGH", name: "Lise" },
  { id: "ADULT", name: "Yetişkin" },
];
const typeList: { id: ProductType; name: string; icon: string }[] = [
  { id: "PHYSICAL", name: "Kitap", icon: "book" },
  { id: "SOFTWARE", name: "Yazılım", icon: "software" },
  { id: "SERVICE", name: "Eğitim hizmeti", icon: "individual" },
];
// Turkish lira editor: do not accept silent float rounding or ambiguous grouping.
const moneyMinorToInputV41D = (minor: number): string => new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.max(0,Number(minor)||0)/100);
const parseMoneyMinorV41D = (text: string): number | null => {
  const trimmed = text.trim().replace(/\s+/gu, "").replace(/₺/gu, "");
  if (!trimmed) return null;
  let normalized: string;
  if (trimmed.includes(",")) {
    // E.g. 3.500,00 or 3500,00.
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/u.test(trimmed)) return null;
    normalized = trimmed.replace(/\./gu, "").replace(",", ".");
  } else {
    // No separator: whole lira. Dot-decimal is allowed only when unambiguous.
    if (!/^\d+(?:\.\d{1,2})?$/u.test(trimmed)) return null;
    normalized = trimmed;
  }
  const [lira, fractional = ""] = normalized.split(".");
  const minor = Number(lira) * 100 + Number(fractional.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
};
const priceFormatV41D = {format:(number:number)=>moneySuffixV41F(Math.round(number*100))};
const emptyForm = (): ProductFormV39C => ({
  id: "", sku: "", title: "", description: "", productType: "PHYSICAL",
  imageReference: "", stages: ["PRIMARY", "MIDDLE", "HIGH", "ADULT"], isActive: true, serviceMode: "INDIVIDUAL", listGrossInput: "0,00",
});
const productSaveMessageV85 = (error: unknown): string => {
  if (error === "PRODUCT_IDENTITY_IMMUTABLE") return "SKU ve ürün türü geçmiş paket bağlantıları nedeniyle değiştirilemez. Ürün adı, fiyatı ve açıklaması güncellenebilir.";
  if (typeof error === "string" && error.length) return error;
  return "Ürün kaydedilemedi.";
};

export function StudentProductCatalogV39C({ onCatalogChanged }: { onCatalogChanged: () => Promise<unknown> }) {
  const [items, setItems] = useState<CatalogProductV39C[]>([]);
  const [form, setForm] = useState<ProductFormV39C>(() => emptyForm());
  const [stage, setStage] = useState<Stage>("ALL");
  const [kind, setKind] = useState<"ALL" | ProductType | "INDIVIDUAL" | "GROUP">("ALL");
  const [search, setSearch] = useState("");
  const [productPageV41E, setProductPageV41E] = useState(1);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Ürün kataloğu okunamadı.");
      setItems(Array.isArray(payload.products) ? payload.products : []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ürünler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, []);

  const approvedItems = useMemo(() => items.filter((item) => isApprovedStudentSkuV41(item.sku)), [items]);
  const shown = useMemo(() => approvedItems.filter((item) => {
    if (stage !== "ALL" && item.stageScopes?.length && !item.stageScopes.includes(stage)) return false;
    if (kind === "INDIVIDUAL" || kind === "GROUP") {
      if (item.productType !== "SERVICE" || item.serviceMode !== (kind === "GROUP" ? "GROUP" : "INDIVIDUAL")) return false;
    } else if (kind !== "ALL" && item.productType !== kind) return false;
    return `${item.title} ${item.sku}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"));
  }), [approvedItems, stage, kind, search]);

  const productPageSizeV41E = 8;
  const pageCountV41E = Math.max(1, Math.ceil(shown.length / productPageSizeV41E));
  const safePageV41E = Math.min(productPageV41E, pageCountV41E);
  const currentProductsV41E = shown.slice((safePageV41E - 1) * productPageSizeV41E, safePageV41E * productPageSizeV41E);

  const edit = (item: CatalogProductV39C) => {
    const st = item.stageScopes?.filter((s): s is Stage => ["PRIMARY", "MIDDLE", "HIGH", "ADULT"].includes(s)) || [];
    setForm({ id:item.id, sku:item.sku, title:item.title, description:item.description || "",
      productType:item.productType, imageReference:item.imageReference || "",
      stages:st.length ? st : ["PRIMARY","MIDDLE","HIGH","ADULT"], isActive:item.isActive, serviceMode:item.serviceMode === "GROUP" ? "GROUP" : "INDIVIDUAL", listGrossInput:moneyMinorToInputV41D(Number(item.listGrossMinor || 0)) });
    setStatus("");
  };

  // Editing existing approved products only. Do not offer creation or change historical SKU/type identity.
  useEffect(() => {
    if (items.length && !form.id) {
      const first = items.find((item) => isApprovedStudentSkuV41(item.sku));
      if (first) edit(first);
    }
  }, [items]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.id || !isApprovedStudentSkuV41(form.sku)) { setStatus("Sadece mevcut 19 katalog ürünü düzenlenebilir."); return; }
    if (!form.sku.trim() || !form.title.trim()) { setStatus("Ürün adı ve SKU zorunludur."); return; }
    if (form.imageReference.trim() && !(/^(\/images\/|https:\/\/)/u.test(form.imageReference.trim()))) {
      setStatus("Görsel adresi /images/ ile veya https:// ile başlamalı."); return;
    }
    const parsedListGrossMinorV41D = parseMoneyMinorV41D(form.listGrossInput);
    if (parsedListGrossMinorV41D === null) {
      setStatus("Geçerli bir liste fiyatı girin. Örnek: 3500,00 veya 550,00."); return;
    }
    const originalProductV41D = items.find((item) => item.id === form.id);
    if (!originalProductV41D) { setStatus("Düzenlenen ürün listede bulunamadı. Yenileyip tekrar deneyin."); return; }
    const priceChangedV41D = parsedListGrossMinorV41D !== Number(originalProductV41D.listGrossMinor || 0);
    if (priceChangedV41D && !window.confirm(`Ürün liste fiyatı ${priceFormatV41D.format(Number(originalProductV41D.listGrossMinor || 0) / 100)} yerine ${priceFormatV41D.format(parsedListGrossMinorV41D / 100)} olarak kaydedilecek. Paket satış fiyatları ve paket içi paylar değişmeyecek. Onaylıyor musun?`)) return;
    setSaving(true);
    setStatus("");
    try {
      const payload = {
        sku:form.sku.trim().toUpperCase(), title:form.title.trim(), description:form.description.trim(),
        productType:form.productType, imageReference:form.imageReference.trim(), isActive:form.isActive, listGrossMinor:parsedListGrossMinorV41D,
        r6ProductType:form.productType === "PHYSICAL" ? "BOOK" : form.productType === "SERVICE" ? "TRAINING_SERVICE" : "SOFTWARE",
        serviceMode:form.productType === "SERVICE" ? form.serviceMode : null,
        // Existing product shipping weights and physical metadata must NOT be erased on edit.
        ...(form.id ? {} : {
          stockLocation:"", lowStockThreshold:0, weightGrams:0,
          dimensionsJson:"{}", costMinor:0, currency:"TRY",
        }),
      };
      const endpoint = `/api/admin/products/${encodeURIComponent(form.id)}`;
      const response = await fetch(endpoint, {
        method: "PATCH", credentials:"same-origin",
        headers:{ "content-type":"application/json" }, body:JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.product?.id) throw new Error(productSaveMessageV85(data.error));
      await reload();
      await onCatalogChanged();
      setStatus(priceChangedV41D ? "Ürünün liste fiyatı kaydedildi. Paket satış fiyatları ve geçmiş sürümler değiştirilmedi." : "Mevcut ürün bilgileri kaydedildi. Paket satış fiyatları değiştirilmedi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kaydetme işlemi başarısız.");
    } finally { setSaving(false); }
  };

  return <div className="fx39c-products-layout">
    <section className="fx39c-products-list" aria-label="Ürün kataloğu">
      <div className="fx39c-list-header"><div><h2>Ürünler ({approvedItems.length})</h2><p>Onaylanan 19 temel ürün · 8 kitap, 1 yazılım, 10 eğitim hizmeti</p></div>
      <input aria-label="Ürün ara" type="search" placeholder="Ürün ara..." value={search} onChange={(event) => { setSearch(event.target.value); setProductPageV41E(1); }} /></div>
      <p className="fx41-catalog-notice" role="note">{approvedCatalogCountV41} onaylı ürün gösteriliyor. Geçmiş 7 kayıt korunuyor. Ürün liste fiyatı ile paket içi pay birbirinden farklıdır.</p>
      <div className="fx39c-filter-row" aria-label="Eğitim seviyesi">
        {stageList.map((option) => <button type="button" key={option.id} className={stage===option.id?"active":""} onClick={()=>{setStage(option.id);setProductPageV41E(1);}}>{option.name}</button>)}
      </div>
      <div className="fx39c-filter-row" aria-label="Ürün türü">
        <button type="button" className={kind==="ALL"?"active":""} onClick={()=>{setKind("ALL");setProductPageV41E(1);}}>Tüm türler</button>
        {typeList.filter((option)=>option.id!=="SERVICE").map((option) => <button type="button" key={option.id} className={kind===option.id?"active":""} onClick={()=>{setKind(option.id);setProductPageV41E(1);}}>{option.name}</button>)}
        <button type="button" className={kind==="INDIVIDUAL"?"active":""} onClick={()=>{setKind("INDIVIDUAL");setProductPageV41E(1);}}>Birebir Eğitim</button>
        <button type="button" className={kind==="GROUP"?"active":""} onClick={()=>{setKind("GROUP");setProductPageV41E(1);}}>Küçük Grup Eğitimi</button>
      </div>
      {loading ? <p>Ürünler yükleniyor...</p> : shown.length === 0 ? <p className="fx39c-product-empty">Bu filtrelere uygun ürün bulunamadı.</p> :
        <div className="fx39c-product-grid">
          {currentProductsV41E.map((item) => <article className={form.id===item.id?"fx39c-product-tile selected":"fx39c-product-tile"} key={item.id}>
            <div className={`fx39c-product-illustration fx40-type-${item.productType.toLowerCase()}`}><FixokuPhotoV41F src={item.imageReference} fallbackSrc={productImageDefaultV41F(item.sku)} alt={item.title}><FixokuCatalogIconV40 kind={catalogVisualKindV40(item.title,item.productType,item.serviceMode || undefined)} size={35}/></FixokuPhotoV41F></div>
            <div className="fx39c-product-copy"><strong>{item.title}</strong><small>{item.productType === "PHYSICAL" ? "Kitap" : item.productType === "SOFTWARE" ? "Yazılım" : item.productType === "SERVICE" ? (item.serviceMode === "GROUP" ? "Küçük Grup Eğitimi" : "Birebir Eğitim") : "Dijital"}</small>
              <div className="fx39c-product-tags"><span>{item.productType === "SERVICE" ? (item.serviceMode === "GROUP" ? "Küçük Grup" : "Birebir") : typeList.find((t)=>t.id===item.productType)?.name || "Ürün"}</span>
                <span>{item.stageScopes?.length ? item.stageScopes.map((s)=>stageList.find((x)=>x.id===s)?.name || s).join(" · ") : "Tüm seviyeler"}</span>
                <span className={item.isActive?"fx39c-active":"fx39c-inactive"}>{item.isActive?"Aktif":"Pasif"}</span>
              </div>
              <div className="fx41-product-prices"><span>{approvedStudentCatalogV41[item.sku]?.priceRole === "PACKAGE_ALLOCATION" ? "Onaylı paket içi pay" : "Onaylı fiyat"}: <strong>{moneySuffixV41F(approvedStudentCatalogV41[item.sku].approvedGrossMinor)}</strong></span><small>Mevcut liste fiyatı: {moneySuffixV41F(Number(item.listGrossMinor || 0))} · KDV %{(approvedStudentCatalogV41[item.sku].vatRateBps/100).toFixed(0)}</small></div>
            </div>
            <button type="button" onClick={()=>edit(item)}>Düzenle</button>
          </article>)}
        </div>}
      {!loading && shown.length > 0 && <nav className="fx41e-pagination" aria-label="Ürün sayfaları">
        <div className="fx41e-pagination-buttons">
          <button type="button" aria-label="Önceki ürün sayfası" disabled={safePageV41E===1} onClick={()=>setProductPageV41E(safePageV41E-1)}>‹</button>
          {Array.from({length:pageCountV41E},(_,index)=>index+1).map((page)=><button key={page} type="button" aria-label={`Ürün sayfası ${page}`} aria-current={page===safePageV41E?"page":undefined} className={page===safePageV41E?"selected":""} onClick={()=>setProductPageV41E(page)}>{page}</button>)}
          <button type="button" aria-label="Sonraki ürün sayfası" disabled={safePageV41E===pageCountV41E} onClick={()=>setProductPageV41E(safePageV41E+1)}>›</button>
        </div>
        <span>{shown.length} üründen {(safePageV41E-1)*productPageSizeV41E+1}–{Math.min(shown.length,safePageV41E*productPageSizeV41E)} gösteriliyor</span>
      </nav>}
    </section>
    <section className="fx39c-product-editor" aria-label="Ürün düzenleme">
      <div className="fx39c-editor-header"><h2>Ürünü Düzenle</h2></div>
      <p className="fx41-editor-help">Bu formdaki fiyat ürünün gerçek liste fiyatıdır. Paket içi paylar ayrı yönetilir. SKU ve ürün türü değiştirilemez.</p>
      {form.id && <form onSubmit={(event)=>void save(event)}>
        <label>Ürün türü<select disabled value={form.productType}>
          {typeList.map((option)=><option value={option.id} key={option.id}>{option.name}</option>)}
        </select></label>
        {form.productType === "SERVICE" && <label>Eğitim türü<select disabled value={form.serviceMode}><option value="INDIVIDUAL">Birebir Eğitim</option><option value="GROUP">Küçük Grup Eğitimi</option></select></label>}
        <label>Ürün adı<input required value={form.title} onChange={(event)=>setForm({...form,title:event.target.value})}/></label>
        <label>Ürün Kodu (Türkçe)<input readOnly value={friendlySkuV41F(form.sku)}/><small className="fx41f-sku-note">Teknik kayıt kodu geçmiş sipariş ve paket bağlantıları için değiştirilmez.</small></label>
        <section className="fx41d-price-card" aria-label="Ürün fiyatı düzenleme">
          <div className="fx41d-price-heading"><strong>Ürün Fiyatı</strong><span>KDV dahil · ₺</span></div>
          <label>Kaydedilecek liste satış fiyatı <span className="fx41f-money-entry"><input required inputMode="decimal" autoComplete="off" placeholder="Örn. 3500,00" value={form.listGrossInput} onChange={(event)=>setForm({...form,listGrossInput:event.target.value})}/><span>₺</span></span></label>
          <div className="fx41d-price-footer">
            <span>Onaylı {approvedStudentCatalogV41[form.sku]?.priceRole === "PACKAGE_ALLOCATION" ? "paket içi pay (referans)" : "hedef fiyat"}: <strong>{priceFormatV41D.format(Number(approvedStudentCatalogV41[form.sku]?.approvedGrossMinor || 0) / 100)}</strong></span>
            <span>KDV: %{Number(approvedStudentCatalogV41[form.sku]?.vatRateBps || 0) / 100}</span>
          </div>
          <p>Buradan yalnız ürünün liste fiyatı değişir. Paket toplamı ve paketin bileşen fiyatları bu işlemle değiştirilmez.</p>
        </section>
        <label>Açıklama<textarea rows={3} value={form.description} onChange={(event)=>setForm({...form,description:event.target.value})}/></label>
        <FixokuImageUploadV41F kind="product" id={form.sku} label="Ürün Görseli"
          width={form.productType === "PHYSICAL" ? 800 : form.productType === "SOFTWARE" ? 1200 : 1000}
          height={form.productType === "SOFTWARE" ? 900 : 1000}
          value={form.imageReference} fallback={productImageDefaultV41F(form.sku)}
          onChange={(imageReference)=>setForm((current)=>({...current,imageReference}))}>
          <FixokuCatalogIconV40 kind={catalogVisualKindV40(form.title,form.productType,form.serviceMode)} size={43}/>
        </FixokuImageUploadV41F>
        <p className="fx41-editor-help">Aktiflik değiştirilemez. Geçmiş paket ve sipariş bağlantıları korunur.</p>
        {status && <p role="status" className="fx39c-product-status">{status}</p>}
        <button className="fx39c-save-button" type="submit" disabled={saving}>{saving?"Kaydediliyor...":"Ürünü Kaydet"}</button>
      </form>}
    </section>
  </div>;
}
