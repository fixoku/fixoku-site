import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FamilyOfferBuilder, type FamilyChildDraft, type FamilyCatalogSelection, type FamilyOfferPreview } from "./FamilyOfferBuilder";
import "./admin-panel.css";

type Account = { userId: string; displayName: string; email: string };
type Draft = { children: FamilyChildDraft[]; selections: Array<{ localKey: string; productId: string }>; pricing: { discountAmountMinor?: number; discountPercentBps?: number; finalFamilyPriceMinor?: number } };

type FamilyOfferWorkspaceProps = { embedded?: boolean };

const familyErrorMessages: Record<string, string> = {
  FAMILY_CHILD_FIRST_NAME_REQUIRED: "Çocuğun adı zorunludur.",
  FAMILY_CHILD_LAST_NAME_REQUIRED: "Çocuğun soyadı zorunludur.",
  FAMILY_CHILD_GRADE_REQUIRED: "Çocuğun sınıfını seçin.",
  FAMILY_CHILD_EDUCATION_STAGE_REQUIRED: "Çocuğun eğitim kademesini seçin.",
  FAMILY_CHILD_STAGE_REQUIRED: "Çocuğun eğitim kademesini seçin.",
  FAMILY_CHILD_GRADE_INVALID: "Seçilen sınıf geçerli değil.",
  FAMILY_CHILD_STAGE_GRADE_MISMATCH: "Eğitim kademesi ile sınıf birbiriyle uyuşmuyor.",
  FAMILY_SELECTION_DUPLICATE: "Aynı ürün aynı çocuk için birden fazla kez seçilemez.",
  FAMILY_EDUCATION_MODE_CONFLICT: "Aynı eğitim için grup ve birebir seçenekleri birlikte seçilemez.",
  FAMILY_SELECTION_INVALID: "Seçilen ürün bu öğrenci için uygun değil.",
  FAMILY_CATALOG_SELECTION_NOT_FOUND: "Seçilen katalog kaydı artık kullanılamıyor.",
  FAMILY_PRICING_METHOD_INVALID: "Fiyatlandırma yöntemi geçerli değil.",
  FAMILY_PRICING_VALUE_INVALID: "Fiyatlandırma değerini kontrol edin.",
  FAMILY_FINAL_PRICE_INVALID: "Aileye özel fiyatı kontrol edin.",
  FAMILY_DISCOUNT_INVALID: "İndirim tutarını veya oranını kontrol edin.",
  FAMILY_OFFER_NOT_FOUND: "Aile teklifi bulunamadı.",
  FAMILY_OFFER_NOT_EDITABLE: "Bu teklif artık düzenlenemez.",
  FAMILY_OFFER_IMMUTABLE: "Satın alma süreci başlamış teklif artık değiştirilemez.",
  FAMILY_OFFER_REVISION_CONFLICT: "Teklif başka bir işlemde güncellenmiş. Sayfayı yenileyip tekrar deneyin.",
  UNAUTHENTICATED: "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.",
  FORBIDDEN: "Bu işlem için yetkiniz bulunmuyor.",
  METHOD_NOT_ALLOWED: "Bu işlem şu anda kullanılamıyor.",
};

const familyErrorText = (value: unknown) => {
  const code = String(value || "").trim();
  if (!code) return "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.";
  if (familyErrorMessages[code]) return familyErrorMessages[code];
  if (/^[A-Z0-9_]+$/u.test(code)) return "İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.";
  return code;
};

const familyStatusText = (value: unknown) => {
  const status = String(value || "").toUpperCase();
  return ({
    DRAFT: "Taslak",
    SENT: "Gönderildi",
    ACCEPTED: "Kabul edildi",
    MATERIALIZED: "Satın alındı",
    PURCHASED: "Satın alındı",
    CANCELLED: "İptal edildi",
    EXPIRED: "Süresi doldu",
  } as Record<string, string>)[status] || "Durum bilgisi yok";
};

const validateFamilyDraft = (draft: Draft) => {
  if (!draft.children.length) return "Teklife en az bir çocuk ekleyin.";
  for (let index = 0; index < draft.children.length; index += 1) {
    const child = draft.children[index];
    const childNo = index + 1;
    const completelyBlank = !child.firstName.trim() && !child.lastName.trim() && !child.grade;
    if (completelyBlank && draft.children.length > 1) return `${childNo}. çocuk bilgileri boş. Bu çocuğu doldurun veya listeden çıkarın.`;
    if (!child.firstName.trim()) return `${childNo}. çocuğun adını yazın.`;
    if (!child.lastName.trim()) return `${childNo}. çocuğun soyadını yazın.`;
    if (!child.educationStage) return `${childNo}. çocuğun eğitim kademesini seçin.`;
    if (!child.grade) return `${childNo}. çocuğun sınıfını seçin.`;
  }
  if (!draft.selections.length) return "Teklife en az bir kitap, yazılım veya eğitim seçeneği ekleyin.";
  return "";
};

const isPreviewReady = (draft: Draft) =>
  draft.children.length > 0 &&
  draft.children.every((child) => child.firstName.trim() && child.lastName.trim() && child.educationStage && child.grade) &&
  draft.selections.length > 0;

const calculateLocalPreview = (draft: Draft, catalog: Record<string, FamilyCatalogSelection[]>): FamilyOfferPreview | null => {
  if (!draft.selections.length) return null;

  let normalTotalMinor = 0;
  let matchedSelectionCount = 0;
  let bookCount = 0;

  for (const selection of draft.selections) {
    const item = catalog[selection.localKey]?.find((row) => row.productId === selection.productId);
    if (!item) continue;
    matchedSelectionCount += 1;
    normalTotalMinor += Number(item.saleGrossMinor) || 0;
    if (item.r6ProductType === "BOOK") bookCount += 1;
  }

  if (!matchedSelectionCount) return null;

  const shippingMinor = bookCount === 1 ? 10000 : bookCount === 2 ? 15000 : 0;
  let discountMinor = 0;
  let finalFamilyPriceMinor = normalTotalMinor;

  if (draft.pricing.finalFamilyPriceMinor != null) {
    finalFamilyPriceMinor = Math.max(0, Math.min(normalTotalMinor, draft.pricing.finalFamilyPriceMinor));
    discountMinor = Math.max(0, normalTotalMinor - finalFamilyPriceMinor);
  } else if (draft.pricing.discountAmountMinor != null) {
    discountMinor = Math.max(0, Math.min(normalTotalMinor, draft.pricing.discountAmountMinor));
    finalFamilyPriceMinor = Math.max(0, normalTotalMinor - discountMinor);
  } else if (draft.pricing.discountPercentBps != null) {
    const bps = Math.max(0, Math.min(10000, draft.pricing.discountPercentBps));
    discountMinor = Math.round((normalTotalMinor * bps) / 10000);
    finalFamilyPriceMinor = Math.max(0, normalTotalMinor - discountMinor);
  }

  return {
    normalTotalMinor,
    bookCount,
    shippingMinor,
    discountMinor,
    finalFamilyPriceMinor,
    payablePreviewMinor: finalFamilyPriceMinor + shippingMinor,
    currency: "TRY",
  };
};

const validateFamilyPricing = (draft: Draft, catalog: Record<string, FamilyCatalogSelection[]>) => {
  const normalTotalMinor = draft.selections.reduce((sum, selection) => {
    const item = catalog[selection.localKey]?.find((row) => row.productId === selection.productId);
    return sum + (item?.saleGrossMinor || 0);
  }, 0);

  if (draft.pricing.finalFamilyPriceMinor != null && normalTotalMinor > 0 && draft.pricing.finalFamilyPriceMinor > normalTotalMinor) {
    return "Aileye özel fiyat normal toplamdan yüksek olamaz.";
  }
  if (draft.pricing.discountAmountMinor != null && normalTotalMinor > 0 && draft.pricing.discountAmountMinor > normalTotalMinor) {
    return "Toplam indirim normal toplamdan yüksek olamaz.";
  }
  if (draft.pricing.discountPercentBps != null && draft.pricing.discountPercentBps > 10000) {
    return "İndirim oranı %100'den yüksek olamaz.";
  }
  return "";
};

export function FamilyOfferWorkspace({ embedded = false }: FamilyOfferWorkspaceProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catalog, setCatalog] = useState<Record<string, FamilyCatalogSelection[]>>({});
  const [preview, setPreview] = useState<FamilyOfferPreview | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [builderKey, setBuilderKey] = useState(0);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/users?role=STUDENT&pageSize=100", { credentials: "same-origin" }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(familyErrorText(body.error));
        return body;
      }),
      fetch("/api/admin/family-offers", { credentials: "same-origin" }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(familyErrorText(body.error));
        return body;
      }),
    ]).then(([users, saved]) => {
      setAccounts(users.users || []);
      setOffers(saved.offers || []);
    }).catch((error) => setMessage(error instanceof Error ? familyErrorText(error.message) : "Aile teklifleri yüklenemedi."));
  }, []);

  const refreshCatalog = async (next: Draft) => {
    try {
      const rows: Record<string, FamilyCatalogSelection[]> = {};
      for (const child of next.children.filter((item) => item.grade)) {
        const response = await fetch(`/api/admin/family-offers?catalog=1&educationStage=${child.educationStage}&grade=${child.grade}`, { credentials: "same-origin" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage(familyErrorText(body.error));
          rows[child.localKey] = [];
          continue;
        }
        rows[child.localKey] = body.selections || [];
      }
      setCatalog(rows);
      setDraft(next);

      const localPreview = calculateLocalPreview(next, rows);
      setPreview(localPreview);

      if (!isPreviewReady(next)) {
        setMessage("");
        return;
      }

      const pricingValidationMessage = validateFamilyPricing(next, rows);
      if (pricingValidationMessage) {
        setMessage(pricingValidationMessage);
        return;
      }

      const previewResult = await fetch("/api/admin/family-offers/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          children: next.children,
          selections: next.selections.map((selection) => ({ localKey: selection.localKey, canonicalProductOrComponentId: selection.productId })),
          pricing: next.pricing,
        }),
      });
      const value = await previewResult.json().catch(() => ({}));
      if (!previewResult.ok) {
        setPreview(localPreview);
        setMessage(familyErrorText(value.error));
        return;
      }
      setPreview(value.preview || value || localPreview);
      setMessage("");
    } catch {
      setMessage("Katalog bilgileri yenilenemedi. Mevcut seçimleri koruyup tekrar deneyin.");
    }
  };

  const save = async () => {
    if (!accountId || !draft) {
      setMessage("Müşteri hesabı ve teklif içeriği zorunludur.");
      return;
    }

    const validationMessage = validateFamilyDraft(draft);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      const endpoint = editingId ? `/api/admin/family-offers/${editingId}` : "/api/admin/family-offers";
      const body = { customerUserId: accountId, title: "Aile Teklifi", draft, expectedRevisionNumber: editingId ? revision : undefined };
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(familyErrorText(result.error));
        return;
      }

      setMessage(`Teklif kaydedildi · Revizyon ${result.revisionNumber}`);
      setEditingId(result.offerId || editingId);
      setRevision(result.revisionNumber);
      setPreview(result.preview || null);

      const savedResponse = await fetch("/api/admin/family-offers", { credentials: "same-origin" });
      const saved = await savedResponse.json().catch(() => ({}));
      if (!savedResponse.ok) {
        setMessage("Teklif kaydedildi ancak teklif listesi yenilenemedi.");
        return;
      }
      setOffers(saved.offers || []);
    } catch {
      setMessage("Teklif kaydedilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.");
    }
  };

  const edit = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/family-offers/${id}`, { credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(familyErrorText(body.error));
        return;
      }
      const offer = body.offer;
      if (!offer) {
        setMessage("Teklif kaydı bulunamadı.");
        return;
      }
      const next: Draft = {
        children: offer.revision.children.map((child: any) => ({ localKey: child.local_key, firstName: child.first_name, lastName: child.last_name, grade: child.grade, educationStage: child.education_stage })),
        selections: offer.revision.selections.map((selection: any) => ({ localKey: offer.revision.children.find((child: any) => child.id === selection.draft_child_id)?.local_key || "", productId: selection.product_id })),
        pricing: { finalFamilyPriceMinor: offer.revision.pricing.finalFamilyPriceMinor },
      };
      setAccountId(offer.customerUserId);
      setEditingId(id);
      setRevision(offer.currentRevisionNumber);
      setDraft(next);
      setBuilderKey((value) => value + 1);
      await refreshCatalog(next);
      setMessage("Teklif düzenleme modunda.");
    } catch {
      setMessage("Teklif ayrıntıları yüklenemedi. Lütfen tekrar deneyin.");
    }
  };

  const account = useMemo(() => accounts.find((item) => item.userId === accountId), [accounts, accountId]);
  const content = <div className="family-offer-workspace">
    {!embedded && <header className="admin-page-hero"><div><span>AİLE SATIŞI</span><h1>Aile Teklifleri</h1><p>Bir aile hesabı altında birden fazla çocuk için katalog, eğitim ve fiyat teklifini yönetin.</p></div></header>}
    {message && <p className="admin-inline-status" role="status">{message}</p>}
    <section className="panel-card family-account-picker"><div><span>BAŞLANGIÇ</span><h2>Müşteri hesabını seçin</h2><p>Teklif bu hesaba bağlanır; çocuklar satın alma tamamlanana kadar yalnız teklif taslağıdır.</p></div><label>Müşteri hesabı<select value={accountId} onChange={(e) => { setAccountId(e.target.value); setDraft(null); setPreview(null); setEditingId(null); }}><option value="">Müşteri seçin</option>{accounts.map((item) => <option key={item.userId} value={item.userId}>{item.displayName} · {item.email}</option>)}</select></label></section>
    {!account && <div className="admin-empty-state"><strong>Aile teklifi oluşturmak için müşteri seçin</strong><span>Seçimden sonra çocuk, katalog ve fiyatlandırma adımları açılır.</span></div>}
    {account && <><FamilyOfferBuilder key={builderKey} account={{ id: account.userId, displayName: account.displayName, email: account.email }} eligibleSelections={catalog} preview={preview} initialDraft={draft || undefined} onDraftChange={(next) => void refreshCatalog(next as Draft)} /><div className="family-offer-savebar"><div><strong>{editingId ? "Mevcut aile teklifini güncelliyorsunuz" : "Yeni aile teklifi"}</strong><span>{preview ? "Fiyat ve kargo önizlemesi hazır; kayıt sırasında sunucu yeniden doğrular." : "Ürün seçtikçe fiyat ve kargo anında hesaplanır."}</span></div><button type="button" onClick={() => void save()} disabled={!accountId || !draft}>{editingId ? "Değişiklikleri kaydet" : "Teklifi kaydet"}</button></div></>}
    <section className="panel-card family-saved-offers"><div className="admin-section-heading"><div><span>KAYITLAR</span><h2>Kaydedilmiş aile teklifleri</h2></div><strong>{offers.length}</strong></div>{offers.length ? <div className="family-saved-grid">{offers.map((offer) => <article key={offer.id}><div><strong>{offer.title}</strong><small>Revizyon {offer.current_revision_number} · {familyStatusText(offer.status)}</small></div><button type="button" onClick={() => void edit(offer.id)}>Düzenle</button></article>)}</div> : <p>Henüz kaydedilmiş aile teklifi yok.</p>}</section>
  </div>;

  if (embedded) return content;
  return <main className="platform-foundation-panel admin-panel"><nav aria-label="Owner aile teklif menüsü"><Link to="/panel/owner">Genel bakış</Link><Link to="/panel/owner/ozel-teklifler">Teklif merkezi</Link></nav>{content}</main>;
}

export function FamilyOfferPage() {
  return <FamilyOfferWorkspace />;
}
