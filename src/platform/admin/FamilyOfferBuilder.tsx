import { useState } from "react";
import "./admin-panel.css";

export type FamilyChildDraft = { localKey: string; firstName: string; lastName: string; grade: string; educationStage: "PRIMARY" | "MIDDLE" | "HIGH" };
export type FamilyCatalogSelection = { productId: string; title: string; r6ProductType: "BOOK" | "SOFTWARE" | "TRAINING_SERVICE"; serviceMode?: "GROUP" | "INDIVIDUAL" | null; programId?: string | null; saleGrossMinor: number };
export type FamilyOfferPreview = { normalTotalMinor: number; bookCount: number; shippingMinor: number; discountMinor: number; finalFamilyPriceMinor: number; payablePreviewMinor: number; currency: "TRY" };
type Selection = { localKey: string; productId: string };
type Props = {
  account: { id: string; displayName: string; email: string };
  eligibleSelections: Record<string, FamilyCatalogSelection[]>;
  preview: FamilyOfferPreview | null;
  onDraftChange: (draft: { children: FamilyChildDraft[]; selections: Selection[]; pricing: { discountAmountMinor?: number; discountPercentBps?: number; finalFamilyPriceMinor?: number } }) => void;
  initialDraft?: { children: FamilyChildDraft[]; selections: Selection[]; pricing?: { discountAmountMinor?: number; discountPercentBps?: number; finalFamilyPriceMinor?: number } };
};
const grades = { PRIMARY: [3, 4], MIDDLE: [5, 6, 7, 8], HIGH: [9, 10, 11, 12] };
const money = (minor: number, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(minor / 100);
const newChild = (): FamilyChildDraft => ({ localKey: crypto.randomUUID(), firstName: "", lastName: "", grade: "", educationStage: "PRIMARY" });

const uniqueSelections = (rows: FamilyCatalogSelection[]) =>
  [...new Map(rows.map((row) => [row.productId, row])).values()];

export function FamilyOfferBuilder({ account, eligibleSelections, preview, onDraftChange, initialDraft }: Props) {
  const [children, setChildren] = useState<FamilyChildDraft[]>(() => initialDraft?.children?.length ? initialDraft.children : [newChild()]);
  const [selections, setSelections] = useState<Selection[]>(() => initialDraft?.selections || []);
  const initialMode = initialDraft?.pricing?.discountAmountMinor != null ? "discountAmountMinor" : initialDraft?.pricing?.discountPercentBps != null ? "discountPercentBps" : "finalFamilyPriceMinor";
  const [pricingMode, setPricingMode] = useState<"discountAmountMinor" | "discountPercentBps" | "finalFamilyPriceMinor">(initialMode);
  const initialValue = initialDraft?.pricing?.[initialMode];
  const [pricingText, setPricingText] = useState(initialValue == null ? "" : String(Number(initialValue) / 100));

  const emit = (nextChildren: FamilyChildDraft[], nextSelections: Selection[], mode = pricingMode, text = pricingText) => {
    const normalized = text.trim().replace(",", ".");
    const value = normalized && /^\d+(?:\.\d{1,2})?$/u.test(normalized) ? Math.round(Number(normalized) * 100) : undefined;
    onDraftChange({ children: nextChildren, selections: nextSelections, pricing: value === undefined ? {} : { [mode]: value } });
  };
  const updateChild = (localKey: string, patch: Partial<FamilyChildDraft>) => {
    const next = children.map((child) => child.localKey === localKey ? { ...child, ...patch } : child);
    const nextSelections = selections.filter((entry) => entry.localKey !== localKey);
    setChildren(next); setSelections(nextSelections); emit(next, nextSelections);
  };
  const toggle = (localKey: string, productId: string, checked: boolean, programId?: string | null, serviceMode?: string | null) => {
    let next = selections.filter((entry) => !(entry.localKey === localKey && entry.productId === productId));
    if (checked && programId) {
      next = next.filter((entry) =>
        entry.localKey !== localKey ||
        !eligibleSelections[localKey]?.some((row) =>
          row.productId === entry.productId &&
          row.programId === programId &&
          row.serviceMode !== serviceMode
        )
      );
    }
    if (checked) next = [...next, { localKey, productId }];
    setSelections(next);
    emit(children, next);
  };

  return <div className="family-offer-builder" aria-label="Aile teklifi taslağı">
    <section className="family-offer-account-strip"><div><span>Müşteri</span><strong>{account.displayName}</strong><small>{account.email}</small></div><small className="family-account-record" title={`Teknik hesap kimliği: ${account.id}`}>Kayıt: #{account.id.slice(0, 8).toLocaleUpperCase("tr-TR")}</small></section>

    <div className="family-offer-layout">
      <div className="family-offer-children">
        <div className="family-offer-section-title"><div><span>1. ADIM</span><h3>Çocukları ve ihtiyaçlarını belirleyin</h3><p>Her çocuk için yalnız kendi yaş/sınıf segmentine uygun gerçek katalog seçenekleri gösterilir.</p></div><button type="button" onClick={() => { const next = [...children, newChild()]; setChildren(next); emit(next, selections); }}>+ Çocuk ekle</button></div>
        {children.map((child, index) => {
          const rows = eligibleSelections[child.localKey] || [];
          const books = uniqueSelections(rows.filter((row) => row.r6ProductType === "BOOK"));
          const software = uniqueSelections(rows.filter((row) => row.r6ProductType === "SOFTWARE"));
          const education = uniqueSelections(rows.filter((row) => row.r6ProductType === "TRAINING_SERVICE"));
          return <section className="panel-card family-child-card" key={child.localKey} aria-label={`Çocuk ${index + 1}`}>
            <header><div><span className="family-child-index">{index + 1}</span><div><h4>Çocuk {index + 1}</h4><p>Öğrenci bilgisi ve ürün seçimi</p></div></div>{children.length > 1 && <button type="button" className="admin-text-danger" onClick={() => { const next = children.filter((item) => item.localKey !== child.localKey); const nextSelections = selections.filter((entry) => entry.localKey !== child.localKey); setChildren(next); setSelections(nextSelections); emit(next, nextSelections); }}>Çocuğu çıkar</button>}</header>
            <div className="family-child-fields"><label>Ad<input value={child.firstName} onChange={(event) => updateChild(child.localKey, { firstName: event.target.value })} /></label><label>Soyad<input value={child.lastName} onChange={(event) => updateChild(child.localKey, { lastName: event.target.value })} /></label><label>Eğitim kademesi<select value={child.educationStage} onChange={(event) => updateChild(child.localKey, { educationStage: event.target.value as FamilyChildDraft["educationStage"], grade: "" })}><option value="PRIMARY">İlkokul</option><option value="MIDDLE">Ortaokul</option><option value="HIGH">Lise</option></select></label><label>Sınıf<select value={child.grade} onChange={(event) => updateChild(child.localKey, { grade: event.target.value })}><option value="">Sınıf seçin</option>{grades[child.educationStage].map((grade) => <option key={grade} value={grade}>{grade}. sınıf</option>)}</select></label></div>
            {!child.grade ? <div className="family-offer-empty"><strong>Önce sınıfı seçin</strong><span>Uygun paket ve ürünler sınıf seçildikten sonra sunucudan gelir.</span></div> : !rows.length ? <div className="family-offer-empty"><strong>Uygun ürün bekleniyor</strong><span>Bu öğrenci segmenti için katalog sonucu bulunamadı.</span></div> : <div className="family-product-columns">
              {([['Kitaplar', books], ['Yazılım', software]] as const).map(([title, items]) => <fieldset key={title}><legend>{title}</legend>{items.length ? items.map((row) => <label className="family-product-choice" key={row.productId}><input type="checkbox" checked={selections.some((entry) => entry.localKey === child.localKey && entry.productId === row.productId)} onChange={(event) => toggle(child.localKey, row.productId, event.target.checked)} /><span><strong>{row.title}</strong><small>{money(row.saleGrossMinor)}</small></span></label>) : <small>{title === "Yazılım" ? "Bu sınıf için yazılım kataloğu henüz eşleştirilmemiş." : "Bu kategoride uygun ürün yok."}</small>}</fieldset>)}
              <fieldset className="family-education-fieldset"><legend>Öğretmenli Eğitim</legend>{education.length ? [...new Set(education.map((row) => row.programId))].map((programId) => { const options = education.filter((row) => row.programId === programId); const selected = selections.find((entry) => entry.localKey === child.localKey && options.some((row) => row.productId === entry.productId)); return <div className="family-education-program" key={programId || "unknown"}><strong>{options[0]?.title}</strong><label><input type="radio" name={`${child.localKey}-${programId}`} checked={!selected} onChange={() => { const next = selections.filter((entry) => entry.localKey !== child.localKey || !options.some((row) => row.productId === entry.productId)); setSelections(next); emit(children, next); }} />Eğitim ekleme</label>{options.map((row) => <label key={row.productId}><input type="radio" name={`${child.localKey}-${programId}`} checked={selected?.productId === row.productId} onChange={() => toggle(child.localKey, row.productId, true, row.programId, row.serviceMode)} />{row.serviceMode === "GROUP" ? "Grup" : "Birebir"} · {money(row.saleGrossMinor)}</label>)}</div>; }) : <small>Bu sınıf için öğretmenli eğitim kataloğu henüz eşleştirilmemiş.</small>}</fieldset>
            </div>}
          </section>;
        })}
      </div>

      <aside className="panel-card family-offer-summary">
        <span className="family-offer-summary-step">2. ADIM</span><h3>Teklif özeti</h3><p>Seçimler anında hesaplanır; kayıtta sunucu yeniden doğrular.</p>
        <dl><div><dt>Normal toplam</dt><dd>{preview ? money(preview.normalTotalMinor) : "—"}</dd></div><div><dt>Kitap sayısı</dt><dd>{preview?.bookCount ?? "—"}</dd></div><div><dt>Kargo</dt><dd>{preview ? money(preview.shippingMinor) : "—"}</dd></div></dl>
        <label>Fiyatlandırma yöntemi<select value={pricingMode} onChange={(event) => { const mode = event.target.value as typeof pricingMode; setPricingMode(mode); setPricingText(""); emit(children, selections, mode, ""); }}><option value="finalFamilyPriceMinor">Aileye özel son fiyat (TL)</option><option value="discountAmountMinor">Toplam indirim (TL)</option><option value="discountPercentBps">Toplam indirim (%)</option></select></label>
        <label>Değer<input inputMode="decimal" value={pricingText} onChange={(event) => { setPricingText(event.target.value); emit(children, selections, pricingMode, event.target.value); }} placeholder="0,00" /></label>
        <div className="family-offer-price-result"><span>Toplam indirim <strong>{preview ? money(preview.discountMinor) : "—"}</strong></span><span>Aileye özel fiyat <strong>{preview ? money(preview.finalFamilyPriceMinor) : "—"}</strong></span><span className="is-total">Kargo dahil <strong>{preview ? money(preview.payablePreviewMinor) : "—"}</strong></span></div>
      </aside>
    </div>
  </div>;
}
