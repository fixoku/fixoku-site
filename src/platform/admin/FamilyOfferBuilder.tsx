import { useState } from "react";
import "./admin-panel.css";

export type FamilyChildDraft = { localKey: string; firstName: string; lastName: string; grade: string; educationStage: "PRIMARY" | "MIDDLE" | "HIGH" };
export type FamilyCatalogSelection = { productId: string; title: string; r6ProductType: "BOOK" | "SOFTWARE" | "TRAINING_SERVICE"; serviceMode?: "GROUP" | "INDIVIDUAL" | null; programId?: string | null; saleGrossMinor: number };
export type FamilyOfferPreview = { normalTotalMinor: number; bookCount: number; shippingMinor: number; discountMinor: number; finalFamilyPriceMinor: number; payablePreviewMinor: number; currency: "TRY" };
type Selection = { localKey: string; productId: string };
type Props = {
  account: { id: string; displayName: string; email: string };
  /** Server-filtered by child segment; never a client-side eligibility authority. */
  eligibleSelections: Record<string, FamilyCatalogSelection[]>;
  preview: FamilyOfferPreview | null;
  onDraftChange: (draft: { children: FamilyChildDraft[]; selections: Selection[]; pricing: { discountAmountMinor?: number; discountPercentBps?: number; finalFamilyPriceMinor?: number } }) => void;
  initialDraft?: { children: FamilyChildDraft[]; selections: Selection[]; pricing?: { discountAmountMinor?: number; discountPercentBps?: number; finalFamilyPriceMinor?: number } };
};
const grades = { PRIMARY: [3, 4], MIDDLE: [5, 6, 7, 8], HIGH: [9, 10, 11, 12] };
const money = (minor: number, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(minor / 100);
const newChild = (): FamilyChildDraft => ({ localKey: crypto.randomUUID(), firstName: "", lastName: "", grade: "", educationStage: "PRIMARY" });

/** Isolated owner composition surface. No route, persistence, checkout or client price calculation. */
export function FamilyOfferBuilder({ account, eligibleSelections, preview, onDraftChange, initialDraft }: Props) {
  const [children, setChildren] = useState<FamilyChildDraft[]>(() => initialDraft?.children?.length ? initialDraft.children : [newChild()]);
  const [selections, setSelections] = useState<Selection[]>(() => initialDraft?.selections || []);
  const initialMode = initialDraft?.pricing?.discountAmountMinor != null ? "discountAmountMinor" : initialDraft?.pricing?.discountPercentBps != null ? "discountPercentBps" : "finalFamilyPriceMinor";
  const [pricingMode, setPricingMode] = useState<"discountAmountMinor" | "discountPercentBps" | "finalFamilyPriceMinor">(initialMode);
  const initialValue = initialDraft?.pricing?.[initialMode];
  const [pricingText, setPricingText] = useState(initialValue == null ? "" : String(initialMode === "discountPercentBps" ? Number(initialValue) / 100 : Number(initialValue) / 100));
  const emit = (nextChildren: FamilyChildDraft[], nextSelections: Selection[], mode = pricingMode, text = pricingText) => {
    const normalized = text.trim().replace(",", ".");
    const value = normalized && /^\d+(?:\.\d{1,2})?$/u.test(normalized) ? Math.round(Number(normalized) * (mode === "discountPercentBps" ? 100 : 100)) : undefined;
    onDraftChange({ children: nextChildren, selections: nextSelections, pricing: value === undefined ? {} : { [mode]: value } });
  };
  const updateChild = (localKey: string, patch: Partial<FamilyChildDraft>) => {
    const next = children.map((child) => child.localKey === localKey ? { ...child, ...patch } : child);
    const nextSelections = selections.filter((entry) => entry.localKey !== localKey);
    setChildren(next); setSelections(nextSelections); emit(next, nextSelections);
  };
  const toggle = (localKey: string, productId: string, checked: boolean, programId?: string | null, serviceMode?: string | null) => {
    const next = checked ? [
      ...selections.filter((entry) => entry.localKey !== localKey || !programId || !eligibleSelections[localKey]?.some((row) => row.productId === entry.productId && row.programId === programId && row.serviceMode !== serviceMode)),
      { localKey, productId },
    ] : selections.filter((entry) => entry.localKey !== localKey || entry.productId !== productId);
    setSelections(next); emit(children, next);
  };
  return <section className="platform-foundation-panel admin-panel" aria-label="Aile teklifi taslağı">
    <h1>Aile Teklifi</h1><p>Teklif satın alınmadan önce çocuklar yalnız taslaktır. Kaydetme ve gönderme entegrasyonu henüz bağlı değildir.</p>
    <section className="panel-card"><h2>Kullanıcı hesabı</h2><p>{account.displayName} · {account.email}</p><small>Hesap ID: {account.id}</small></section>
    {children.map((child, index) => {
      const rows = eligibleSelections[child.localKey] || [];
      const books = rows.filter((row) => row.r6ProductType === "BOOK");
      const software = rows.filter((row) => row.r6ProductType === "SOFTWARE");
      const education = rows.filter((row) => row.r6ProductType === "TRAINING_SERVICE");
      return <section className="panel-card" key={child.localKey} aria-label={`Çocuk ${index + 1}`}><h2>Çocuk {index + 1}</h2>
        <label>Ad<input value={child.firstName} onChange={(event) => updateChild(child.localKey, { firstName: event.target.value })} /></label>
        <label>Soyad<input value={child.lastName} onChange={(event) => updateChild(child.localKey, { lastName: event.target.value })} /></label>
        <label>Eğitim kademesi<select value={child.educationStage} onChange={(event) => updateChild(child.localKey, { educationStage: event.target.value as FamilyChildDraft["educationStage"], grade: "" })}><option value="PRIMARY">İlkokul</option><option value="MIDDLE">Ortaokul</option><option value="HIGH">Lise</option></select></label>
        <label>Sınıf<select value={child.grade} onChange={(event) => updateChild(child.localKey, { grade: event.target.value })}><option value="">Sınıf seçin</option>{grades[child.educationStage].map((grade) => <option key={grade} value={grade}>{grade}. sınıf</option>)}</select></label>
        <h3>Bu öğrenci için uygun ürünler</h3>{!rows.length && <p>Sunucu kataloğundan uygun ürün bekleniyor.</p>}
        {([["Kitaplar", books], ["Yazılım", software]] as const).map(([title, items]) => <fieldset key={title}><legend>{title}</legend>{items.map((row) => <label key={row.productId}><input type="checkbox" checked={selections.some((entry) => entry.localKey === child.localKey && entry.productId === row.productId)} onChange={(event) => toggle(child.localKey, row.productId, event.target.checked)} />{row.title} · {money(row.saleGrossMinor)}</label>)}</fieldset>)}
        <fieldset><legend>Eğitim</legend>{[...new Set(education.map((row) => row.programId))].map((programId) => {
          const options = education.filter((row) => row.programId === programId);
          const selected = selections.find((entry) => entry.localKey === child.localKey && options.some((row) => row.productId === entry.productId));
          return <div key={programId || "unknown"}><p>{options[0]?.title}</p><label><input type="radio" name={`${child.localKey}-${programId}`} checked={!selected} onChange={() => { const next = selections.filter((entry) => entry.localKey !== child.localKey || !options.some((row) => row.productId === entry.productId)); setSelections(next); emit(children, next); }} />Eğitim yok</label>{options.map((row) => <label key={row.productId}><input type="radio" name={`${child.localKey}-${programId}`} checked={selected?.productId === row.productId} onChange={() => toggle(child.localKey, row.productId, true, row.programId, row.serviceMode)} />{row.serviceMode === "GROUP" ? "Grup" : "Birebir"} · {money(row.saleGrossMinor)}</label>)}</div>;
        })}</fieldset>
        {children.length > 1 && <button type="button" onClick={() => { const next = children.filter((item) => item.localKey !== child.localKey); const nextSelections = selections.filter((entry) => entry.localKey !== child.localKey); setChildren(next); setSelections(nextSelections); emit(next, nextSelections); }}>Çocuğu çıkar</button>}
      </section>;
    })}
    <button type="button" onClick={() => { const next = [...children, newChild()]; setChildren(next); emit(next, selections); }}>+ Çocuk Ekle</button>
    <section className="panel-card"><h2>Teklif özeti</h2><p>Normal toplam: {preview ? money(preview.normalTotalMinor) : "Sunucu hesaplaması bekleniyor"}</p><p>Kitap sayısı: {preview?.bookCount ?? "—"}</p><p>Kargo (KDV dahil): {preview ? money(preview.shippingMinor) : "—"}</p>
      <label>İndirim / son fiyat yöntemi<select value={pricingMode} onChange={(event) => { const mode = event.target.value as typeof pricingMode; setPricingMode(mode); setPricingText(""); emit(children, selections, mode, ""); }}><option value="finalFamilyPriceMinor">Aileye özel son fiyat (TL)</option><option value="discountAmountMinor">Toplam indirim (TL)</option><option value="discountPercentBps">Toplam indirim (%)</option></select></label>
      <label>Değer<input inputMode="decimal" value={pricingText} onChange={(event) => { setPricingText(event.target.value); emit(children, selections, pricingMode, event.target.value); }} /></label>
      <p>Toplam indirim: {preview ? money(preview.discountMinor) : "—"}</p><p>Aileye özel son fiyat: {preview ? money(preview.finalFamilyPriceMinor) : "—"}</p><p>Kargo dahil önizleme: {preview ? money(preview.payablePreviewMinor) : "—"}</p>
    </section>
  </section>;
}
