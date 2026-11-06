// FIXOKU_020O_TRAINER_ORDER_AND_CONTENT_SYNC
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./admin-panel.css";
import "./owner-trainer-h5v.css";
import { StudentProductCatalogV39C } from "./StudentProductCatalogV39C";
import { FixokuCatalogIconV40 } from "./FixokuCatalogIconV40";
import { FixokuPhotoV41F, productImageDefaultV41F } from "./FixokuCatalogAssetsV41F";
import { trainerCourseCover020P } from "../trainer/components/trainerCourseCovers020P";
import "./owner-trainer-020p.css";
import "./owner-trainer-access-r20e.css";

// H5U: approved offline blueprint, visual-only; not proof of saved catalog records.
const h5vInvoicePreviewPlans = [{"slug":"ilkokul-akici-hizli-okuma-egitimi","items":[{"name":"İlkokul akıcı ve hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"İlkokul zihin egzersizleri kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"FIXOKU yapay zekâ destekli yazılım","kind":"SOFTWARE","grossMinor":350000,"vat":2000,"qty":1},{"name":"İlkokul akıcı ve hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":739000,"vat":2000,"qty":1}],"discount":0,"sale":1199000},{"slug":"ortaokul-hizli-okuma-egitimi","items":[{"name":"Ortaokul hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Ortaokul zihin egzersizleri kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"FIXOKU yapay zekâ destekli yazılım","kind":"SOFTWARE","grossMinor":350000,"vat":2000,"qty":1},{"name":"Ortaokul hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":739000,"vat":2000,"qty":1}],"discount":0,"sale":1199000},{"slug":"lise-hizli-okuma-egitimi","items":[{"name":"Lise hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"FIXOKU yapay zekâ destekli yazılım","kind":"SOFTWARE","grossMinor":350000,"vat":2000,"qty":1},{"name":"Lise hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":794000,"vat":2000,"qty":1}],"discount":0,"sale":1199000},{"slug":"yetiskin-hizli-okuma-egitimi","items":[{"name":"Yetişkin hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"FIXOKU yapay zekâ destekli yazılım","kind":"SOFTWARE","grossMinor":350000,"vat":2000,"qty":1},{"name":"Yetişkin hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":794000,"vat":2000,"qty":1}],"discount":0,"sale":1199000},{"slug":"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs","items":[{"name":"Ortaokul paragraf kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Ortaokul paragraf teknikleri eğitmen eğitimi (LGS)","kind":"TRAINER_EDUCATION","grossMinor":844000,"vat":2000,"qty":1}],"discount":0,"sale":899000},{"slug":"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt","items":[{"name":"Lise paragraf kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Lise paragraf teknikleri eğitmen eğitimi (TYT–AYT)","kind":"TRAINER_EDUCATION","grossMinor":944000,"vat":2000,"qty":1}],"discount":0,"sale":999000},{"slug":"ortaokul-lise-yetiskin-hizli-okuma-egitimi","items":[{"name":"İlkokul akıcı ve hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"İlkokul zihin egzersizleri kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Ortaokul hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Ortaokul zihin egzersizleri kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Lise hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Yetişkin hızlı okuma kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"FIXOKU yapay zekâ destekli yazılım","kind":"SOFTWARE","grossMinor":350000,"vat":2000,"qty":1},{"name":"Ortaokul hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":739000,"vat":2000,"qty":1},{"name":"Lise hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":794000,"vat":2000,"qty":1},{"name":"Yetişkin hızlı okuma eğitmen eğitimi","kind":"TRAINER_EDUCATION","grossMinor":794000,"vat":2000,"qty":1}],"discount":1257000,"sale":1750000},{"slug":"ortaokul-lise-paragraf-egitmen-egitimi-ikili-set","items":[{"name":"Ortaokul paragraf kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Lise paragraf kitabı","kind":"BOOK","grossMinor":55000,"vat":0,"qty":1},{"name":"Ortaokul paragraf teknikleri eğitmen eğitimi (LGS)","kind":"TRAINER_EDUCATION","grossMinor":844000,"vat":2000,"qty":1},{"name":"Lise paragraf teknikleri eğitmen eğitimi (TYT–AYT)","kind":"TRAINER_EDUCATION","grossMinor":944000,"vat":2000,"qty":1}],"discount":648000,"sale":1250000}] as const;

const h5uApprovedPlans: Array<{packageSlug:string;displayName:string;ownerSaleGrossMinor:number;itemsGrossMinor:number;discountGrossMinor:number;books:number;hasSoftware:boolean;trainings:string[]}> = [{"packageSlug":"ilkokul-akici-hizli-okuma-egitimi","displayName":"İlkokul akıcı ve hızlı okuma eğitmen eğitimi","ownerSaleGrossMinor":1199000,"itemsGrossMinor":1199000,"discountGrossMinor":0,"books":2,"hasSoftware":true,"trainings":["PRIMARY_FAST"]},{"packageSlug":"ortaokul-hizli-okuma-egitimi","displayName":"Ortaokul hızlı okuma eğitmen eğitimi","ownerSaleGrossMinor":1199000,"itemsGrossMinor":1199000,"discountGrossMinor":0,"books":2,"hasSoftware":true,"trainings":["MIDDLE_FAST"]},{"packageSlug":"lise-hizli-okuma-egitimi","displayName":"Lise hızlı okuma eğitmen eğitimi","ownerSaleGrossMinor":1199000,"itemsGrossMinor":1199000,"discountGrossMinor":0,"books":1,"hasSoftware":true,"trainings":["HIGH_FAST"]},{"packageSlug":"yetiskin-hizli-okuma-egitimi","displayName":"Yetişkin hızlı okuma eğitmen eğitimi","ownerSaleGrossMinor":1199000,"itemsGrossMinor":1199000,"discountGrossMinor":0,"books":1,"hasSoftware":true,"trainings":["ADULT_FAST"]},{"packageSlug":"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs","displayName":"Ortaokul paragraf teknikleri eğitmen eğitimi (LGS)","ownerSaleGrossMinor":899000,"itemsGrossMinor":899000,"discountGrossMinor":0,"books":1,"hasSoftware":false,"trainings":["MIDDLE_PARAGRAPH"]},{"packageSlug":"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt","displayName":"Lise paragraf teknikleri eğitmen eğitimi (TYT–AYT)","ownerSaleGrossMinor":999000,"itemsGrossMinor":999000,"discountGrossMinor":0,"books":1,"hasSoftware":false,"trainings":["HIGH_PARAGRAPH"]},{"packageSlug":"ortaokul-lise-yetiskin-hizli-okuma-egitimi","displayName":"Ortaokul, lise ve yetişkin hızlı okuma eğitmen eğitimi üçlü seti","ownerSaleGrossMinor":1750000,"itemsGrossMinor":3007000,"discountGrossMinor":1257000,"books":6,"hasSoftware":true,"trainings":["MIDDLE_FAST","HIGH_FAST","ADULT_FAST"]},{"packageSlug":"ortaokul-lise-paragraf-egitmen-egitimi-ikili-set","displayName":"Ortaokul ve lise paragraf eğitmen eğitimi ikili seti","ownerSaleGrossMinor":1250000,"itemsGrossMinor":1898000,"discountGrossMinor":648000,"books":2,"hasSoftware":false,"trainings":["MIDDLE_PARAGRAPH","HIGH_PARAGRAPH"]}];
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
type Product = { id: string; sku: string; title: string; productType: "PHYSICAL" | "SOFTWARE" | "DIGITAL" | "TRAINING_SERVICE"; imageReference?: string | null; isActive: boolean; unitPriceMinor?: number | null; trainingCode?: string | null; priceVerified?: boolean; trainingCodeVerified?: boolean };
type LinkedCatalogRow = { componentId: string | null; productId: string | null; sku: string | null; productTitle: string | null; componentType: string | null; quantity: number | null; status: string; catalogUnitGrossMinor: number | null };
type LinkedCatalogPackage = { packageId: string; packageVersionId: string | null; slug: string | null; source: string; ready: boolean; links: LinkedCatalogRow[] };
type Catalog = { packages: PackageRecord[]; products: Product[]; catalogLinkedComponents?: LinkedCatalogPackage[] };
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
// H5M: Turkish sentence-case presentation; never modifies persisted titles automatically.
const trainerPackageSentenceTitle = (raw: string): string => {
  const input = String(raw || "").trim();
  if (!input) return input;
  // Normalize only all-uppercase catalog names; preserve intentionally mixed-case titles.
  const letters = input.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
  if (!letters || letters !== letters.toLocaleUpperCase("tr-TR")) return input;
  const lower = input.toLocaleLowerCase("tr-TR");
  const restored = lower.replace(/\b(fixoku|lgs|tyt|ayt|pdf)\b/gu, word => word.toLocaleUpperCase("tr-TR"));
  return restored.replace(/(^|[\s(\-–:])([a-zçğıöşü])/u, (_match, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("tr-TR"));
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
  const existingLegacyFeatures = Array.isArray(item.features) ? item.features.filter(feature => String(feature).trim()) : [];
  const historicalFeatures = HISTORICAL_TRAINER_CONTENT_R60C18B[item.slug] || [];
  const stageFeatures = existingLegacyFeatures.length ? existingLegacyFeatures : historicalFeatures;
  const legacyText: Component[] = !hasTextItems
    ? stageFeatures.map(feature => ({ componentType: "TEXT_ITEM", titleSnapshot: feature, title: feature, quantity: 1, isActive: true }))
    : [];
  return {
    title: trainerPackageSentenceTitle(item.title || ""), slug: item.slug || "", shortDescription: item.shortDescription || "",
    // Some of the legacy R96B rows only have the short description populated.
    // Seed the editable description from that persisted value so an Owner can
    // save a real description without the API silently replacing it with the
    // package title. The field is still editable before it is sent to the API.
    description: item.description || item.shortDescription || "", featuresText: Array.isArray(item.features) ? item.features.join("\n") : "",
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


// R60C18B: explicit Owner-only, form-local historic content staging; no DB write.
const HISTORICAL_TRAINER_CONTENT_R60C18B: Record<string, string[]> = {"ilkokul-akici-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","İlkokul Akıcı ve Hızlı Okuma Kitabı","İlkokul Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul Hızlı Okuma Kitabı","Ortaokul Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"lise-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Lise Hızlı Okuma Kitabı","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"yetiskin-hizli-okuma-egitimi":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Yetişkin Hızlı Okuma Kitabı","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-lise-yetiskin-hizli-okuma-egitimi":["3 Eğitim İçin Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul Hızlı Okuma Kitabı","Ortaokul Zihin Egzersizleri Kitabı.","Lise Hızlı Okuma Kitabı","Yetişkin Hızlı Okuma Kitabı","Ortaokul, Lise ve Yetişkin Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.","Yapay zekâ destekli öğrenci yazılımı","E Devlet kayıtlı Üniversite onaylı Hızlı Okuma Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","3 Eğitim için Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan yazılım eğitim paneli","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Ortaokul paragraf kitabı","E Devlet kayıtlı Üniversite onaylı paragraf Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"],"lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt":["Canlı ve video ile Profesyonel Eğitmen Eğitimi","Lise paragraf kitabı","E Devlet kayıtlı Üniversite onaylı paragraf Eğitmen Sertifikası","10 Adet Adınıza Düzenlenmiş sosyal medya tasarımı.","Gün Gün Öğrencilerle Ders İşleyiş müfredatı","Eğitmenler için Kurumlar ile görüşme sunumu","Eğitmenler için veli seminer sunumu","WhatsApp Türkiye Grubu Ücretsiz Üyeliği ve Kesintisiz Destek","Eğitmenlere özel tasarlanan web sitesi paneli","Toplu alımlarda indirim imkânı","Fixoku öğrenci yönlendirme imkânı"]};

const trainerExpertiseReview20E: Record<string, string[]> = {
  "ilkokul-akici-hizli-okuma-egitimi": [
    "İlkokul Hızlı Okuma"
  ],
  "ortaokul-hizli-okuma-egitimi": [
    "Ortaokul Hızlı Okuma"
  ],
  "lise-hizli-okuma-egitimi": [
    "Lise Hızlı Okuma"
  ],
  "yetiskin-hizli-okuma-egitimi": [
    "Yetişkin Hızlı Okuma"
  ],
  "ortaokul-lise-yetiskin-hizli-okuma-egitimi": [
    "Ortaokul Hızlı Okuma",
    "Lise Hızlı Okuma",
    "Yetişkin Hızlı Okuma"
  ],
  "ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs": [
    "Ortaokul Paragraf"
  ],
  "lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt": [
    "Lise Paragraf"
  ],
  "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set": [
    "Ortaokul Paragraf",
    "Lise Paragraf"
  ]
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
  const [ownerNote, setOwnerNote] = useState("");
  const [ownerNoteInitial, setOwnerNoteInitial] = useState("");
  const [ownerNoteState, setOwnerNoteState] = useState<"loading" | "ready" | "blocked" | "saving">("blocked");
  const [ownerNoteFeedback, setOwnerNoteFeedback] = useState("");
  const ownerNoteRequestRef = useRef(0);

  const loadOwnerNote = async (id: string) => {
    const requestId = ++ownerNoteRequestRef.current;
    setOwnerNote(""); setOwnerNoteInitial(""); setOwnerNoteFeedback(""); setOwnerNoteState("loading");
    try {
      const result = await api(`/api/admin/trainer-package-owner-note?id=${encodeURIComponent(id)}`);
      if (requestId !== ownerNoteRequestRef.current) return;
      const next = typeof result.note === "string" ? result.note : "";
      setOwnerNote(next); setOwnerNoteInitial(next); setOwnerNoteState("ready");
    } catch (err) {
      if (requestId !== ownerNoteRequestRef.current) return;
      setOwnerNoteState("blocked");
      setOwnerNoteFeedback(err instanceof Error && err.message.includes("NEW_NEON_OWNER_NOTE")
        ? "Yönetici notu yeni Neon doğrulanana kadar kilitli. Herhangi bir not kaydedilmedi."
        : "Yönetici notu okunamadı. Kaydetme kilitli; paket açıklamaları buraya aktarılmadı.");
    }
  };
  const saveOwnerNote = async () => {
    if (!selectedId || ownerNoteState !== "ready" || ownerNote.length > 4000) return;
    const currentId = selectedId;
    const requestId = ownerNoteRequestRef.current;
    setOwnerNoteState("saving"); setOwnerNoteFeedback("");
    try {
      await api(`/api/admin/trainer-package-owner-note?id=${encodeURIComponent(currentId)}`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: ownerNote }),
      });
      if (requestId !== ownerNoteRequestRef.current) return;
      setOwnerNoteInitial(ownerNote); setOwnerNoteState("ready");
      setOwnerNoteFeedback("Yönetici notu ayrı ve özel alana kaydedildi.");
    } catch (err) {
      if (requestId !== ownerNoteRequestRef.current) return;
      setOwnerNoteState("ready");
      setOwnerNoteFeedback(err instanceof Error ? `Not kaydedilemedi: ${err.message}` : "Not kaydedilemedi.");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api("/api/admin/trainer-packages");
      if (!Array.isArray(result.packages) || !Array.isArray(result.products)) throw new Error("TRAINER_CATALOG_CONTRACT_MISMATCH");
      setCatalog({ packages: result.packages as PackageRecord[], products: result.products as Product[], catalogLinkedComponents: Array.isArray(result.catalogLinkedComponents) ? result.catalogLinkedComponents as LinkedCatalogPackage[] : undefined });
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
  const pageCount = Math.max(1, Math.ceil(all.length / 10));
  const pageSafe = Math.min(page, pageCount);
  const rows = all.slice((pageSafe - 1) * 10, pageSafe * 10);
  const visibleProducts = catalog.products.filter(p => p.isActive && `${p.title} ${p.sku}`.toLocaleLowerCase("tr-TR").includes(productSearch.toLocaleLowerCase("tr-TR")));

  const choose = (item: PackageRecord, readOnly = false) => {
    setSelectedId(item.id);
    void loadOwnerNote(item.id);
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
    setCatalog(current => ({ ...current, packages: [item, ...current.packages.filter(p => p.id !== id)], catalogLinkedComponents: Array.isArray(result.catalogLinkedComponents) ? result.catalogLinkedComponents as LinkedCatalogPackage[] : current.catalogLinkedComponents?.filter(p => p.packageId !== id) }));
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
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim() || minor === null) {
      setError("Paket adı, bağlantı adı, açıklama ve geçerli fiyat zorunludur."); return;
    }
    // The API requires a non-empty description; the field above is persisted
    // with the same draft/version transaction as the other package fields.
    setBusy(true); setSaveStatus("saving"); setError(""); setMessage("Kaydediliyor...");
    try {
      const versionId = await ensureDraftVersion(selected);
      const result = await api(`/api/admin/trainer-packages?id=${encodeURIComponent(selected.id)}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versionId, title: form.title.trim(), slug: form.slug.trim(),
          shortDescription: form.shortDescription.trim(), description: form.description.trim(),
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
      showSaved("Ürün ve içerik kayıtları sunucudan tekrar okunarak kaydetme işlemi tamamlandı. Alan bazlı eşleşme için ayrı veritabanı kabul testi bekleniyor.");
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
    setForm({ ...form, components: [...form.components, { componentType: product.productType === "PHYSICAL" ? "PHYSICAL_PRODUCT" : product.productType === "TRAINING_SERVICE" ? "TRAINER_SERVICE" : "DIGITAL_ACCESS", physicalProductId: product.productType === "PHYSICAL" ? product.id : undefined, productId: product.id, title: product.title, quantity: 1, isActive: true }] });
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
    setMessage("Yeni madde taslakta eklendi. Düzenleyip Ürün ve İçeriği Kaydet ile veritabanına gönderin.");
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
        <>
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
                  </div><div className="admin-package-card-title"><h3>{trainerPackageSentenceTitle(item.title || "Başlıksız paket")}</h3><p>{item.shortDescription || item.description || "Açıklama bulunmuyor"}</p></div></div>
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
            <style>{`.fx-r60c18d-cover{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:10px!important;width:100%!important;max-width:none!important}
.fx-r60c18d-cover .fx-r60c18d-cover-image{display:block;width:100%!important;max-width:none!important;aspect-ratio:16/9;object-fit:contain;background:#f8fafc;border:1px solid #e3eaf2;border-radius:12px}
.fx-r60c18d-cover strong{display:block}
.admin-content-rows{container-type:inline-size}
.fx-r60c18e-row{box-sizing:border-box!important;display:grid!important;grid-template-columns:36px minmax(0,1fr) 74px 50px!important;align-items:center!important;column-gap:9px!important;row-gap:7px!important;padding:10px 11px!important;border:1px solid #e0e8f2!important;border-radius:11px!important;background:white!important;margin:0 0 8px!important;width:100%!important;min-height:64px!important}
.fx-r60c18e-number{grid-column:1;grid-row:1;display:flex!important;align-items:center!important;justify-content:center!important;background:#eaf0f7!important;color:#173759!important;border-radius:8px!important;min-height:36px!important;font-size:14px!important;font-weight:800!important;white-space:nowrap!important}
.fx-r60c18e-main{grid-column:2;grid-row:1;min-width:0!important;text-align:left!important;font-size:13px!important;line-height:1.45!important;overflow-wrap:anywhere!important;color:#153457!important}
.fx-r60c18e-main .admin-content-text{display:block!important;min-width:0!important;white-space:normal!important}
.fx-r60c18e-main input{box-sizing:border-box;width:100%!important;min-width:0!important;padding:8px!important}
.fx-r60c18e-arrows{grid-column:3;grid-row:1;display:flex!important;flex-flow:row nowrap!important;justify-content:center!important;gap:5px!important;align-items:center!important;min-width:0!important}
.fx-r60c18e-arrows button{box-sizing:border-box!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:31px!important;min-width:31px!important;height:34px!important;padding:0!important;border:1px solid #c8d6e8!important;border-radius:7px!important;background:#f5f8fc!important;color:#123a67!important;font-size:20px!important;font-weight:600!important;line-height:1!important;margin:0!important}
.fx-r60c18e-arrows button:disabled{opacity:.4!important;cursor:not-allowed!important}
.fx-r60c18e-toggle{grid-column:4;grid-row:1;display:flex!important;justify-content:center!important;align-items:center!important;min-width:0!important;white-space:nowrap!important;margin:0!important}
.fx-r60c18e-toggle span{display:none!important}
.fx-r60c18e-actions{grid-column:2 / 5;grid-row:2;display:flex!important;flex-flow:row nowrap!important;gap:6px!important;align-items:center!important;justify-content:flex-end!important;min-width:0!important;margin:0!important}
.fx-r60c18e-actions button{box-sizing:border-box!important;display:inline-flex!important;justify-content:center!important;align-items:center!important;padding:6px 11px!important;min-height:31px!important;min-width:60px!important;margin:0!important;border-radius:7px!important;white-space:nowrap!important;font-size:12px!important}
.fx-r60c18d-add{display:flex;justify-content:flex-end;margin-top:12px}
.fx-r60c18d-notice{margin-top:9px;padding:9px 11px;border-radius:8px;font-size:12px;background:#ecfdf3;color:#166534}
.fx-r60c18d-notice.is-dirty{background:#fff7ed;color:#9a3412}
@container (min-width:680px){.fx-r60c18e-row{grid-template-columns:36px minmax(0,1fr) 74px 50px 136px!important;min-height:56px!important}.fx-r60c18e-actions{grid-column:5;grid-row:1}}`}</style>
            <div className="admin-package-cover-upload fx-r60c18d-cover"><img className="fx-r60c18d-cover-image" src={trainerCourseCover020P(selected.title || "",selected.slug) || selected.iconReference || ""} alt={`${selected.title || "Paket"} kapak görseli`}/><div><strong>Paket Kapak Görseli</strong><p className="admin-section-help">Görsel orijinal en-boy oranı korunarak gösterilir. Yeni görsel yükleme henüz bağlanmadı.</p></div></div>
            {!draft && !previewOnly && <div className="admin-feedback"><p>Yayındaki sürüm korunur. Kaydet düğmesi ilk tıklamada mevcut sürümden tek bir taslak açıp değişikliği bu taslağa kaydeder.</p><button type="button" className="admin-outline-button" disabled={busy || !selected.packageVersionId} onClick={()=>void newDraft(selected)}>+ Yeni Sürüm Taslağı Aç</button></div>}
            {previewOnly && <p className="admin-feedback">Önizleme salt okunurdur.</p>}
            <fieldset disabled={!canEdit}><legend>Paket Bilgileri</legend><div className="admin-form-two-column">
              <label>Paket başlığı<input value={form.title} onChange={e=>updateForm({title:e.target.value})}/></label>
              <label>Alt başlık<input value={form.shortDescription} onChange={e=>updateForm({shortDescription:e.target.value})}/></label>
              
            </div></fieldset><fieldset disabled={previewOnly}><div className="admin-form-full"><label>Yönetici notu (yalnız Owner)<textarea value={ownerNote} maxLength={4000} readOnly={ownerNoteState !== "ready" || previewOnly} onChange={e=>{setOwnerNote(e.target.value);setOwnerNoteFeedback("");}} placeholder="Yalnız Owner tarafından görülür; paket açıklaması değildir." aria-label="Yönetici notu" /></label><div className="admin-row-actions"><span aria-live="polite">{ownerNoteFeedback || (ownerNoteState === "loading" ? "Yönetici notu okunuyor..." : ownerNoteState === "blocked" ? "Yeni Neon etkinleşene kadar not kilitli." : `${ownerNote.length}/4000 karakter`)}</span><button type="button" className="admin-outline-button" disabled={ownerNoteState !== "ready" || previewOnly || ownerNote === ownerNoteInitial || !selectedId} onClick={()=>void saveOwnerNote()}>Yönetici Notunu Kaydet</button></div></div></fieldset>
            <fieldset disabled={!canEdit}>
              <div className="admin-section-toolbar"><legend>Paket İçeriği</legend><div className="admin-row-actions">
              </div></div>
              <div className="admin-content-rows">
                {textIndices.map((index, position) => {
                  const component = form.components[index];
                  const isEditing = editingContentIndex === index;
                  return <div className={`fx-r60c18e-row ${component.isActive === false ? "is-inactive" : ""}`} key={component.componentId || `text-${index}`}>
                    <span className="fx-r60c18e-number">{position + 1}.</span><div className="fx-r60c18e-arrows"><button type="button" aria-label="Yukarı taşı" disabled={position===0} onClick={()=>moveTextComponent(index,-1)}>↑</button><button type="button" aria-label="Aşağı taşı" disabled={position===textIndices.length-1} onClick={()=>moveTextComponent(index,1)}>↓</button></div>
                    <div className="fx-r60c18e-main">{isEditing
                      ? <input autoFocus aria-label={`İçerik maddesi ${position+1}`} value={editingContentValue} onChange={e=>setEditingContentValue(e.target.value)}/>
                      : <span className="admin-content-text">{String(component.titleSnapshot || component.title || "")}</span>}
                    </div>
                    <label className="admin-toggle-label fx-r60c18e-toggle"><input type="checkbox" checked={component.isActive !== false} aria-label={`İçerik ${position+1} aktif`} onChange={e=>updateComponent(index,{isActive:e.target.checked})}/><span>{component.isActive !== false ? "Aktif" : "Pasif"}</span></label>
                    <div className="fx-r60c18e-actions">{isEditing ? <>
                      <button type="button" onClick={()=>{if(!editingContentValue.trim()){setError("İçerik maddesi boş bırakılamaz.");return;}updateComponent(index,{title:editingContentValue.trim(),titleSnapshot:editingContentValue.trim()});setEditingContentIndex(null);setMessage("Madde taslakta güncellendi. Veritabanına kaydetmek için Ürün ve İçeriği Kaydet butonunu kullanın.");}}>Kaydet</button>
                    </> : <>
                      <button type="button" onClick={()=>{setEditingContentIndex(index);setEditingContentValue(String(component.titleSnapshot||component.title||""));}}>Düzenle</button>
                      <button type="button" className="admin-quiet-button" onClick={()=>{removeComponent(index);setEditingContentIndex(null);}}>Sil</button>
                    </>}</div>
                  </div>;
                })}
                {!textIndices.length && <p className="admin-empty-inline">Henüz içerik maddesi yok.</p>}
              </div>
              <div className="fx-r60c18d-add"><button type="button" className="admin-outline-button" onClick={addTextComponent} disabled={!safeComponentEditing || !canEdit}>+ Yeni Madde Ekle</button></div>
              {message && /madde|içerik|taslak|kaydet|kayd/i.test(message) && <p className={`fx-r60c18d-notice ${saveStatus === "success" ? "" : "is-dirty"}`} role="status">{message}</p>}
              <p className="admin-section-help">Satırlar öğretmen panelinin kullandığı aynı sürüme aittir. Düzenle ve aç/kapa işlemleri önce taslakta hazırlanır; ardından “Ürün ve İçeriği Kaydet” ile sunucuya gönderilir.</p>
            </fieldset>
            <div className="fixoku-trainer-resource-panel-020p" aria-label="Öğretmen eğitim modülleri">
              <strong>Eğitim içerik modülleri</strong>
              <TrainerModules020P />
              <p>Bu sekmeler Öğretmen panelindeki Video Eğitimleri, Müfredat ve Sunumlar alanlarını temsil eder. Dosya listesi veya video adedi Owner paket API'sinde henüz sunulmadığından burada uydurma içerik oluşturulmaz. Özel medya dosyaları mevcut yetkili görüntüleyicide kalır.</p>
            </div>
            <fieldset disabled={!canEdit || !safeComponentEditing}><div className="admin-section-toolbar"><legend>Pakete Eklenen Ürünler</legend><button type="button" className="admin-outline-button" onClick={()=>setPickerOpen(v=>!v)}>+ Ürün Ekle</button></div>
              {(() => {
                const linked = catalog.catalogLinkedComponents?.find(item => item.packageId === selected.id && item.packageVersionId === selected.packageVersionId);
                const missingApi = !Array.isArray(catalog.catalogLinkedComponents);
                const list = linked?.links || [];
                const problems = list.filter(item => item.status !== "LINK_OK");
                return <div role="status" style={{padding:"12px 14px",marginBottom:12,border:"1px solid #d7deec",background:"#f7f9fc",borderRadius:10,fontSize:13}}>
                  <strong>Gerçek katalog bağlantıları</strong>
                  <p style={{margin:"6px 0"}}>{missingApi ? "Sunucu henüz gerçek katalog bağlantılarını göndermedi. Kayıt doğrulanamadı." : !linked ? "Bu paket sürümü için gerçek bağlantı doğrulaması bulunmuyor." : linked.ready && list.length > 0 ? "Bu sürümün ürün kimlikleri ve SKU bağlantıları okuma düzeyinde doğrulandı. Fiyat, fatura ve yayın onayı değildir." : `${problems.length} sorunlu bağlantı bulundu. Gerçek ürün geçişi henüz tamamlanmadı.`}</p>
                  {list.length > 0 && <div style={{display:"grid",gap:6}}>{list.map((item,index) => <div key={`${item.componentId || item.productId || "missing"}-${index}`} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,padding:"7px 0",borderTop:"1px solid #e2e8f1"}}>
                    <span><b>{item.productTitle || "Ürün kimliği çözümlenemedi"}</b><small style={{display:"block"}}>{item.sku || "SKU yok"} · {item.quantity ?? "?"} adet · {item.productId || "ID yok"}</small></span>
                    <span style={{fontWeight:600,color:item.status === "LINK_OK" ? "#146b4d" : "#aa4028",whiteSpace:"nowrap"}}>{item.status === "LINK_OK" ? "Bağlantı OK" : item.status}</span>
                  </div>)}</div>}
                  <small style={{display:"block",marginTop:8}}>Bu bölüm yalnız gerçek API kayıtlarını gösterir. Aşağıdaki hedef eğitim taslağı ve fatura önizlemesi ayrı kaynaklardan gelir; veritabanı geçişi yapılmış sayılmaz.</small>
                </div>;
              })()}
              {(() => {const plan=h5vInvoicePreviewPlans.find(v=>v.slug===selected.slug);const rows=plan?.items.filter(v=>v.kind==="TRAINER_EDUCATION")||[];return rows.length>0 && <div style={{padding:"12px 14px",marginBottom:12,border:"1px solid #d8e6ff",background:"#f4f8ff",borderRadius:10}}><strong style={{fontSize:13}}>Onaylı eğitmen eğitimleri (hedef taslak, kayıtlı ürün değil)</strong><div style={{display:"grid",gap:6,marginTop:8}}>{rows.map(v=><div key={v.name} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12}}><span>{v.name}</span><b>{(v.grossMinor/100).toLocaleString("tr-TR",{style:"currency",currency:"TRY"})}</b></div>)}</div><small style={{display:"block",marginTop:7}}>Yeni Neon veritabanında kayıt ve paket bağlantısı yapılana kadar bu satırlar düzenlenebilir gerçek bileşen değildir.</small></div>})()}
              {form.components.some(c=>/bireysel eğitim hizmeti/iu.test(c.title||"")) && <div role="status" style={{padding:"12px 14px",marginBottom:12,border:"1px solid #f6c8af",borderRadius:10,background:"#fff8f1",fontSize:13}}><strong>Eski öğrenci hizmetleri geçiş bekliyor</strong><p style={{margin:"5px 0 0"}}>Bireysel eğitim bağlantıları normal ürün listesinden ayrıldı; mevcut kayıtlardan silinmedi. Yeni Neon ürün kimlikleri olmadan ürün/içerik kaydetme veya yayınlama yapmayın.</p></div>}
              <div className="admin-book-list">{form.components.filter(c=>c.componentType!=="TEXT_ITEM" && !/bireysel eğitim hizmeti/iu.test(c.title||"" )).map(c=>{const index=form.components.indexOf(c);const product=catalog.products.find(p=>p.id===String(c.physicalProductId||c.productId||c.referenceId));return <div className="admin-book-row" key={c.componentId||`${c.componentType}-${index}`}>
                <div className="admin-book-cover"><FixokuPhotoV41F src={product?.imageReference||c.imageReference} fallbackSrc={productImageDefaultV41F(product?.sku||"")} alt={product?.title||c.title||componentTypeLabel(c.componentType)}><FixokuCatalogIconV40 kind={c.componentType === "PHYSICAL_PRODUCT" ? "book" : c.componentType === "TRAINER_SERVICE" ? "individual" : "software"} size={25}/></FixokuPhotoV41F></div>
                <div className="admin-book-details"><strong>{product?.title||c.title||componentTypeLabel(c.componentType)}</strong><span>{componentTypeLabel(c.componentType)}{product?.sku ? ` · ${product.sku}` : ""}</span><input aria-label="Pakette görünen ürün adı" placeholder="Pakette görünen ad" value={c.displayLabel||""} onChange={e=>updateComponent(index,{displayLabel:e.target.value})}/></div>
                <div className="admin-quantity"><span>Miktar</span><div><button type="button" onClick={()=>updateComponent(index,{quantity:Math.max(1,Number(c.quantity||1)-1)})}>−</button><strong>{Number(c.quantity||1)}</strong><button type="button" onClick={()=>updateComponent(index,{quantity:Math.min(99,Number(c.quantity||1)+1)})}>+</button></div></div>
                <button type="button" className="admin-quiet-button" onClick={()=>removeComponent(index)}>Kaldır</button>
              </div>;})}{!form.components.some(c=>c.componentType!=="TEXT_ITEM" && !/bireysel eğitim hizmeti/iu.test(c.title||"")) && <p className="admin-empty-inline">Bu pakette ürün veya hizmet bileşeni yok.</p>}</div>
              {pickerOpen && <div className="admin-book-picker fx40-picker"><div className="fx40-picker-head"><h3>Pakete Ürün Ekle</h3><button type="button" className="fx40-picker-close" onClick={()=>setPickerOpen(false)} aria-label="Kapat">×</button></div>
                <div className="fx40-picker-fields"><label><FixokuCatalogIconV40 kind="search" size={17}/><input type="search" placeholder="Ürün ara..." value={productSearch} onChange={e=>setProductSearch(e.target.value)}/></label></div>
                <div className="admin-book-picker-results fx40-picker-grid">{visibleProducts.map(p=><article className="fx40-picker-tile" key={p.id}><div className="fx40-picker-art"><FixokuPhotoV41F src={p.imageReference} fallbackSrc={productImageDefaultV41F(p.sku)} alt={p.title}><FixokuCatalogIconV40 kind={p.productType === "PHYSICAL" ? "book" : "software"} size={34}/></FixokuPhotoV41F></div><strong>{p.title}</strong><small>{p.productType === "PHYSICAL" ? "Kitap" : "Yazılım / dijital erişim"} · {p.sku}</small><button type="button" disabled={form.components.some(c=>String(c.physicalProductId||c.productId)===p.id)} onClick={()=>addProduct(p)}>Ekle</button></article>)}</div>
              </div>}
            </fieldset>
             {(() => {
               const plan = h5uApprovedPlans.find(p => p.packageSlug === selected.slug);
               if (!plan) return null;
               const verified = Number(plan.itemsGrossMinor) - Number(plan.discountGrossMinor) === Number(plan.ownerSaleGrossMinor);
               const editorPriceMatches = Math.round(Number(form.price || 0)*100) === plan.ownerSaleGrossMinor;
               return <section aria-label="Onaylı hedef paket fiyat önizlemesi" style={{border:"1px solid #ead2bd",borderRadius:12,padding:14,margin:"14px 0",background:"#fffaf5"}}>
                 <strong>Onaylı hedef içerik ve fiyat planı</strong>
                 <p style={{fontSize:12,margin:"6px 0 10px"}}>Bu alan H5T yerel planından gelir. Henüz veritabanına eklenmemiş ürünlerin kaydı veya canlı fatura sonucu değildir.</p>
                 <div style={{display:"grid",gap:6,fontSize:13}}>
                   <div>Kitap: <strong>{plan.books} adet</strong> · Yazılım: <strong>{plan.hasSoftware ? "Var (paket içi 3.500 TL)" : "Yok"}</strong> · Eğitmen eğitimi: <strong>{plan.trainings.length} ayrı uzmanlık</strong></div>
                   <div>Onaylı ürünler toplamı: <strong>{formatMoney(plan.itemsGrossMinor)}</strong></div>
                   <div>Paket iskontosu: <strong>{formatMoney(plan.discountGrossMinor)}</strong></div>
                   <div>Onaylı paket fiyatı: <strong>{formatMoney(plan.ownerSaleGrossMinor)}</strong></div>
                   <div>Kargo: <strong>Ücretsiz Kargo</strong></div>
                 </div>
                 {!verified && <p role="alert">Hedef fiyat sözleşmesi tutarsız. Kayıt yapılmamalı.</p>}
                 {!editorPriceMatches && <p role="status" style={{fontSize:12}}>Düzenleme formundaki satış fiyatı hedef plandan farklı. Bu alan formu veya kayıtlı fiyatı otomatik değiştirmez.</p>}
                 <small style={{display:"block",marginTop:9}}>Alt bölüm mevcut API kayıtlarını ayrı doğrular. Orada eski bireysel eğitim ürünleri ve eksik fiyat uyarıları yeni Neon kayıtları oluşturulana kadar devam edebilir.</small>
               </section>;
             })()}
             <section className="fx-h5-price-preview" aria-label="Paket iskonto fiyat önizlemesi" style={{border:"1px solid #ddd",borderRadius:12,padding:16,margin:"18px 0"}}>
               <strong>Ürün listesi ve paket iskontosu kontrolü</strong>
               {(() => {
                 const entries = form.components.filter(c => c.componentType !== "TEXT_ITEM" && c.isActive !== false);
                 const missing = entries.filter(c => { const p = catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId)); return !p || p.priceVerified !== true || !Number.isSafeInteger(p.unitPriceMinor) || Number(p.unitPriceMinor) < 0; });
                 const readiness = entries.map(c => {
                   const product = catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId));
                   const isTraining = c.componentType === "TRAINER_SERVICE";
                   const priceOk = Boolean(product && product.priceVerified === true && Number.isSafeInteger(product.unitPriceMinor) && Number(product.unitPriceMinor) >= 0);
                   const trainingOk = !isTraining || Boolean(product && product.trainingCodeVerified === true && product.trainingCode);
                   return { id: String(c.componentId || c.physicalProductId || c.productId || c.referenceId || c.titleSnapshot), name: product?.title || c.titleSnapshot || "Tanımsız ürün", isTraining, priceOk, trainingOk };
                 });
                 const trainingCodes = new Set(entries.filter(c => c.componentType === "TRAINER_SERVICE").map(c => catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId))?.trainingCode).filter((v): v is string => typeof v === "string" && v.length > 0));
                 const trainerServices = entries.filter(c => c.componentType === "TRAINER_SERVICE");
                 const trainingUnverified = trainerServices.some(c => !catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId))?.trainingCodeVerified);
                  const missingNames = missing.map(c => catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId))?.title || c.titleSnapshot || String(c.physicalProductId || c.productId || c.referenceId || "Bilinmeyen ürün")).slice(0, 8);
                 const details = <div style={{marginTop:12,display:"grid",gap:6}}><strong style={{fontSize:13}}>Ürün bazında API doğrulaması</strong>{readiness.length === 0 ? <small>Pakette henüz ürün bulunmuyor.</small> : readiness.map((r,i) => <div key={`${r.id}-${i}`} style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",borderBottom:"1px solid #eee",paddingBottom:6}}><span style={{flex:"1 1 180px"}}>{r.name}</span><span style={{color:r.priceOk?"#21643b":"#a34118"}}>{r.priceOk?"Fiyat doğrulandı":"Fiyat eksik"}</span>{r.isTraining && <span style={{color:r.trainingOk?"#21643b":"#a34118"}}>{r.trainingOk?"Uzmanlık kodu doğrulandı":"Uzmanlık kodu eksik"}</span>}</div>)}</div>;
                 if (missing.length || trainingUnverified) return <div>{details}<p role="status" style={{marginTop:8}}>Fiyat/uzmanlık verisi eksik: {missing.length} ürünün doğrulanmış birim fiyatı {missingNames.length ? `(Eksik: ${missingNames.join(", ")})` : ""} ve {trainingUnverified ? "bazı eğitimlerin uzmanlık kodu" : ""} katalog API’sinde bulunmuyor. Güvenli iskonto hesaplaması yapılmadı. Mevcut paket fiyatı ve kayıt davranışı değiştirilmedi.</p></div>;
                 const listMinor = entries.reduce((sum,c) => {const p = catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId));return sum + Number(p?.productType === "SOFTWARE" ? 350000 : p?.unitPriceMinor || 0)*Number(c.quantity || 1);},0);
                 const saleMinor = Math.round(Number(form.price || 0)*100);
                 const discountMinor = listMinor - saleMinor;
                 const eligible = trainingCodes.size >= 2;
                 const softwareOverrideCount = entries.filter(c => catalog.products.find(p => p.id === String(c.physicalProductId || c.productId || c.referenceId))?.productType === "SOFTWARE").length;
                 if (!Number.isSafeInteger(listMinor) || !Number.isSafeInteger(saleMinor) || saleMinor < 0 || (eligible && discountMinor < 0)) return <p role="alert">Fiyat hesaplaması güvenli değil: geçerli satış fiyatı ve ürün toplamını kontrol edin.</p>;
                 return <div style={{display:"grid",gap:6,marginTop:8}}>{details}<span>Paket bileşenleri toplamı: <strong>{formatMoney(listMinor)}</strong></span>{softwareOverrideCount > 0 && <small>Yazılımın katalog fiyatı korunur; eğitmen paketi için onaylı 3.500 TL bileşen fiyatı kullanılmıştır.</small>}<span>Owner paket satış fiyatı: <strong>{formatMoney(saleMinor)}</strong></span><span>{eligible ? "Otomatik paket iskontosu" : "Çoklu uzmanlık iskontosu"}: <strong>{eligible ? formatMoney(Math.max(0,discountMinor)) : "Uygulanmaz"}</strong></span><small>Bu salt okunur önizlemedir; fatura/checkout hesabına henüz bağlanmamıştır.</small></div>;
               })()}
             </section>
            {!safeComponentEditing && <p role="alert" className="admin-feedback">Bu pakette mevcut API'nin kaydedemediği bileşen türleri var. Bileşen kayıtları korunuyor.</p>}
            <section className="fx20e-access-review" aria-label="Paket uzmanlık ve medya yetkileri">
              <div className="fx20e-access-review-head"><div><span className="admin-editor-eyebrow">PAKET YETKİLERİ</span><h3>Uzmanlık ve Medya Yetkileri</h3><p>Kaydedilmiş paket sürümü üzerinden yetki durumunun özeti. Bu alan yeni hak oluşturmaz.</p></div><span className="fx20e-pill">Güvenli önizleme</span></div>
              <div className="fx20e-access-review-grid">
                <div className="fx20e-access-tile"><h4>Uzmanlıklar ve rozetler</h4>
                  {trainerExpertiseReview20E[selected.slug]?.length ? <ul className="fx20e-expertise-list">{trainerExpertiseReview20E[selected.slug].map(code => <li key={code}><span aria-hidden="true">✓</span>{code}</li>)}</ul> : <p role="status">Bu paket için doğrulanmış uzmanlık eşleştirmesi yok. Hak ataması yapılmamalı.</p>}
                  <small>İndirimli setler ayrıca rozet kazandırmaz. Kıdemli Eğitmen sadece 6/6 geçerli uzmanlık ile hesaplanır.</small>
                </div>
                <div className="fx20e-access-tile"><h4>Özel medya erişimleri</h4><p><strong>Müfredat ve video:</strong> Sunucudaki mevcut paket/uzmanlık ve erişim kontrolü uygulanır.</p><p><strong>Sunum ve PDF:</strong> Ortak sunumlar ayrı erişim politikasındadır.</p><p className="fx20e-warning">Paket bazında kalıcı medya seçim API'si henüz etkin değil. Bu ekrandaki bilgiler erişim tanımlaması değildir.</p></div>
              </div>
              <p className="fx20e-access-footnote">Gerçek erişimler, eğitmen oturumu ve sunucu yetkilendirmesiyle doğrulanmalıdır. Yayınlanmış paket yetkileri bu görünümden değiştirilmez.</p>
            </section>
            <div className="admin-package-bottom"><fieldset disabled={!canEdit}><legend>Fiyat ve Satış</legend><label>Fiyat<span className="fx41f-money-entry"><input inputMode="decimal" value={form.price} onChange={e=>updateForm({price:e.target.value})}/><span>₺</span></span></label><p className="admin-section-help">KDV: %{Number(selected.vatRateBps||0)/100}</p></fieldset>
              <fieldset disabled={!canEdit}><legend>Görünürlük</legend><div className="admin-visibility-grid">
                <label className="admin-switch"><input type="checkbox" checked={form.panelVisible} onChange={e=>updateForm({panelVisible:e.target.checked})}/><span className="admin-switch-track"/><span>Eğitmen panelinde göster</span></label>
                <label className="admin-switch"><input type="checkbox" checked={false} disabled readOnly/><span className="admin-switch-track"/><span>Web sitesinde göster (eğitmen paketleri için kapalı)</span></label>
                <label className="admin-switch"><input type="checkbox" checked={form.purchaseEnabled} onChange={e=>updateForm({purchaseEnabled:e.target.checked})}/><span className="admin-switch-track"/><span>Satın alınabilir</span></label>
              </div></fieldset></div>
            <div className="admin-editor-actions"><button type="button" className="admin-primary-action" disabled={!canEdit} onClick={()=>void saveFields()}>Paket Bilgilerini Kaydet</button><button type="button" className="admin-secondary-action" disabled={!canEdit||!safeComponentEditing} onClick={()=>void saveComponents()}>Ürün ve İçeriği Kaydet</button><button type="button" className="admin-secondary-action" onClick={()=>{setForm(null);setSelectedId("");}}>Düzenlemeden Çık</button><button type="button" className="admin-secondary-action" disabled={!draft||busy} onClick={()=>void publishDraft()}>Yayınla</button></div>

          </section> : <aside className="panel-card fx41e-empty-editor"><span className="fx41e-empty-art"><FixokuCatalogIconV40 kind="package" size={32}/></span><h2>Paketi Düzenle</h2><p>Soldaki bir paketi seçin.</p></aside>}
        </section>
        {selected && form && (
          <div className="fx-h5w-fullwidth-preview">
            {(() => {
              const approved = h5vInvoicePreviewPlans.find(p => p.slug === selected.slug);
              if (!approved) return null;
              const lineTotal = approved.items.reduce((sum, item) => sum + item.grossMinor * item.qty, 0);
              // H5X: iskonto sadece egitmen egitimi satirlarina, brut bedelleri oraninda dagitilir.
              // Kitap (%0 KDV) ve yazilim birim bedeli korunur. Son hizmet satiri kurus farkini alir.
              const trainingIndexes = approved.items.map((item, index) => item.kind === "TRAINER_EDUCATION" ? index : -1).filter(index => index >= 0);
              const trainingGross = trainingIndexes.reduce((sum, index) => sum + approved.items[index].grossMinor * approved.items[index].qty, 0);
              const allocationValid = approved.discount >= 0 && (approved.discount === 0 || (trainingIndexes.length > 1 && trainingGross >= approved.discount));
              let remainingDiscount = approved.discount;
              const discountedLines = approved.items.map((item, index) => {
                const gross = item.grossMinor * item.qty;
                let discount = 0;
                if (allocationValid && trainingIndexes.includes(index) && approved.discount > 0) {
                  discount = index === trainingIndexes[trainingIndexes.length - 1]
                    ? remainingDiscount
                    : Math.round(approved.discount * gross / trainingGross);
                  remainingDiscount -= discount;
                }
                return { ...item, gross, discount, net: gross - discount };
              });
              const allocationMatches = allocationValid && discountedLines.every(item => item.net >= 0) && discountedLines.reduce((sum, item) => sum + item.net, 0) === approved.sale;
              const complete = lineTotal - approved.discount === approved.sale && allocationMatches;
              const hasLegacy = form.components.some(c => c.componentType === "TRAINER_SERVICE" && !catalog.products.some(p => p.id === String(c.physicalProductId || c.productId || c.referenceId) && p.trainingCodeVerified));
              const currentPriceMatches = Math.round(Number(form.price || 0) * 100) === approved.sale;
              return <section aria-label="H5V paket fiyat ve örnek fatura önizlemesi" className="fx-h5v-dual-preview">
                <div className="fx-h5v-preview-heading"><strong>Paket fiyat analizi ve öğretmen faturası önizlemesi</strong><p>Onaylı hedef plan esas alınmıştır. Bu tablolar mevcut paket kayıtlarını veya kesilmiş bir faturayı temsil etmez.</p></div>
                <div className="fx-h5v-preview-columns">
                  <div className="fx-h5v-preview-panel"><h3>1. Paket fiyat analizi</h3>
                    <table><thead><tr><th>Ürün / hizmet</th><th>Tür</th><th>Adet</th><th>Birim</th><th>İskonto</th><th>İndirimli toplam</th></tr></thead><tbody>
                    {discountedLines.map((item, ix) => <tr key={ix}><td>{item.name}</td><td>{item.kind === "BOOK" ? "Kitap" : item.kind === "SOFTWARE" ? "Yazılım" : "Eğitmen eğitimi"}</td><td>{item.qty}</td><td>{formatMoney(item.grossMinor)}</td><td>{formatMoney(-item.discount)}</td><td>{formatMoney(item.net)}</td></tr>)}
                    </tbody></table>
                    <div className="fx-h5v-totals"><div><span>Ürünler toplamı</span><strong>{formatMoney(lineTotal)}</strong></div><div><span>Paket iskontosu</span><strong>{formatMoney(-approved.discount)}</strong></div><div><span>Kargo</span><strong>Ücretsiz Kargo</strong></div><div className="fx-h5v-grand"><span>Owner satış fiyatı</span><strong>{formatMoney(approved.sale)}</strong></div></div>
                  </div>
                  <div className="fx-h5v-preview-panel"><h3>2. Öğretmen faturası önizlemesi</h3><p className="fx-h5v-muted">Bilgilendirici taslak. Resmî e-Arşiv/e-Fatura değildir.</p>
                    <table><thead><tr><th>Fatura kalemi</th><th>Adet</th><th>KDV</th><th>Liste toplamı</th><th>İskonto</th><th>İndirimli tutar</th></tr></thead><tbody>
                    {discountedLines.map((item, ix) => <tr key={ix}><td>{item.name}</td><td>{item.qty}</td><td>%{item.vat / 100}</td><td>{formatMoney(item.gross)}</td><td>{formatMoney(-item.discount)}</td><td>{formatMoney(item.net)}</td></tr>)}
                    </tbody></table>
                    <div className="fx-h5v-totals"><div><span>Ara toplam</span><strong>{formatMoney(lineTotal)}</strong></div><div><span>Paket iskontosu</span><strong>{formatMoney(-approved.discount)}</strong></div><div><span>Kargo</span><strong>Ücretsiz Kargo</strong></div><div className="fx-h5v-grand"><span>Ödenecek toplam</span><strong>{formatMoney(approved.sale)}</strong></div></div>
                    <p className="fx-h5v-muted">Önizleme: iskonto yalnız %20 KDV'li eğitmen eğitimlerine orantılı dağıtılır; kitaplar ve yazılım indirimsiz kalır. Nihai fatura vergi matrahı ve e-Fatura entegrasyonu ayrıca doğrulanmalıdır.</p>
                  </div>
                </div>
                {!allocationValid && <p role="alert" className="fx-h5v-warning">İskonto eğitim satırlarına güvenli biçimde dağıtılamıyor. Fatura işlemi engellenmelidir.</p>}
                {!complete && <p role="alert" className="fx-h5v-warning">Hedef ürün toplamı ve satış fiyatı uyuşmuyor. Kayıt yapılmamalı.</p>}
                {hasLegacy && <p role="status" className="fx-h5v-warning">Mevcut pakette eski bireysel eğitim bağlantıları bulunuyor. Bunlar hedef fiyat/fatura satırlarına dahil edilmedi; kayıtlı bileşenler otomatik silinmedi. Yeni Neon geçişi bekleniyor.</p>}
                {!currentPriceMatches && <p role="status" className="fx-h5v-warning">Formdaki satış fiyatı onaylı hedef fiyattan farklı. Bu önizleme formu otomatik değiştirmez.</p>}
              </section>;
            })()}
          </div>
        )}
        </>
      )}
      {tab === "products" && <StudentProductCatalogV39C onCatalogChanged={load} trainerMode/>}
      {tab === "expertise" && <section className="panel-card" aria-label="Uzmanlıklar"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2>Eğitmen Uzmanlıkları ve Rozetler</h2><p className="admin-section-help">Altı temel uzmanlık. Setler yalnız içerdiği uzmanlıkları kazandırır, ayrı set rozeti verilmez.</p></div><a className="admin-outline-button" href="/panel/admin/egitmen-ticaret">Ücretsiz hakları ve uzmanlıkları yönet</a></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginTop:18}}><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/ilkokul-akici-okuma-egitmen-rozeti.png" alt="İlkokul Hızlı Okuma rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>İlkokul Hızlı Okuma</strong><p className="admin-section-help" style={{marginTop:5}}>İlkokul paketi</p><small>PRIMARY_FAST</small></div></article><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/ortaokul-hizli-okuma-egitmen-rozeti.png" alt="Ortaokul Hızlı Okuma rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>Ortaokul Hızlı Okuma</strong><p className="admin-section-help" style={{marginTop:5}}>Ortaokul paketi / üçlü set</p><small>MIDDLE_FAST</small></div></article><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/lise-hizli-okuma-egitmen-rozeti.png" alt="Lise Hızlı Okuma rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>Lise Hızlı Okuma</strong><p className="admin-section-help" style={{marginTop:5}}>Lise paketi / üçlü set</p><small>HIGH_FAST</small></div></article><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/yetiskin-hizli-okuma-egitmen-rozet.png" alt="Yetişkin Hızlı Okuma rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>Yetişkin Hızlı Okuma</strong><p className="admin-section-help" style={{marginTop:5}}>Yetişkin paketi / üçlü set</p><small>ADULT_FAST</small></div></article><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/ortaokul-paragraf-egitmen-rozet.png" alt="Ortaokul Paragraf rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>Ortaokul Paragraf</strong><p className="admin-section-help" style={{marginTop:5}}>Ortaokul paragraf / ikili set</p><small>MIDDLE_PARAGRAPH</small></div></article><article className="panel-card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}><img src="https://media.fixoku.com/fixoku-trainer-badges/lise-paragraf-egitmen-rozeti.png" alt="Lise Paragraf rozeti" style={{width:70,height:70,objectFit:"contain",flexShrink:0}} loading="lazy"/><div><strong>Lise Paragraf</strong><p className="admin-section-help" style={{marginTop:5}}>Lise paragraf / ikili set</p><small>HIGH_PARAGRAPH</small></div></article></div><div className="panel-card" style={{display:"flex",alignItems:"center",gap:14,marginTop:14}}><img src="https://media.fixoku.com/fixoku-trainer-badges/kidemli-egitmen-rozeti.png" alt="Kıdemli Eğitmen rozeti" style={{width:78,height:78,objectFit:"contain"}} loading="lazy"/><div><strong>7. Kıdemli Eğitmen (Usta Eğitmen)</strong><p>Altı farklı temel uzmanlığın tamamı geçerli olduğunda otomatik hesaplanır. Satılamaz, paketle ayrıca verilemez.</p></div></div>
        <section aria-label="Eğitim paketleri uzmanlık eşleştirmesi" style={{marginTop:22}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:12}}>
            <div><h3 style={{margin:"0 0 4px"}}>Paketler hangi uzmanlıkları kazandırıyor?</h3><p className="admin-section-help" style={{margin:0}}>Sekiz eğitimin kazandırdığı altı temel yetki. Birleşik setler yeni bir rozet üretmez.</p></div>
            <span style={{display:"inline-flex",padding:"7px 12px",border:"1px solid #f6c8af",borderRadius:999,color:"#bb4619",fontWeight:700,background:"#fff8f3",fontSize:12}}>6 temel uzmanlık + 1 otomatik kıdemli</span>
          </div>
          <div style={{overflowX:"auto",border:"1px solid #e4e9f1",borderRadius:13}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:660,fontSize:13}}>
              <thead><tr style={{background:"#f3f6fa",color:"#153253",textAlign:"left"}}><th scope="col" style={{padding:"13px 16px"}}>Eğitmen eğitimi</th><th scope="col" style={{padding:"13px 16px"}}>Kazandırdığı uzmanlıklar</th><th scope="col" style={{padding:"13px 16px"}}>Rozet sayısı</th></tr></thead>
              <tbody>
                {[
                  ["İlkokul Akıcı ve Hızlı Okuma", "İlkokul Hızlı Okuma", 1],
                  ["Ortaokul Hızlı Okuma", "Ortaokul Hızlı Okuma", 1],
                  ["Lise Hızlı Okuma", "Lise Hızlı Okuma", 1],
                  ["Yetişkin Hızlı Okuma", "Yetişkin Hızlı Okuma", 1],
                  ["Ortaokul Paragraf Eğitmen Eğitimi", "Ortaokul Paragraf", 1],
                  ["Lise Paragraf Eğitmen Eğitimi", "Lise Paragraf", 1],
                  ["Ortaokul + Lise + Yetişkin Üçlü Set", "Ortaokul Hızlı Okuma · Lise Hızlı Okuma · Yetişkin Hızlı Okuma", 3],
                  ["Ortaokul + Lise Paragraf İkili Set", "Ortaokul Paragraf · Lise Paragraf", 2],
                ].map(([packageName, expertises, count], index) => (
                  <tr key={String(packageName)} style={{borderTop:"1px solid #e4e9f1",background:index % 2 ? "#fafcff" : "#fff"}}>
                    <td style={{padding:"12px 16px",fontWeight:650}}>{packageName}</td>
                    <td style={{padding:"12px 16px",lineHeight:1.6}}>{expertises}</td>
                    <td style={{padding:"12px 16px",fontWeight:700,color:"#dc5217"}}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="admin-section-help" style={{marginTop:12}}>Bu eşleştirmeler kaynak koddaki TRAINER_PACKAGE_QUALIFICATIONS sözleşmesiyle uyumludur. Gerçek haklar yalnız geçerli ödeme/Owner onayı ve sunucu erişim denetimleriyle kazanılır. Yedinci Kıdemli Eğitmen rozeti altı farklı temel yetkinin tamamından türetilir.</p>
        </section>
        <p role="note" className="admin-section-help">Bu görünüm kaynak eşleştirme rehberidir. Mevcut kayıt ve uzmanlık haklarını değiştirmez. Gerçek yetkiler sunucu API'si tarafından denetlenir.</p></section>}
      {previewPackage && <div className="admin-preview-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreviewPackage(null)}}>
        <section className="admin-preview-dialog fx41j-preview" role="dialog" aria-modal="true" aria-labelledby="trainer-package-preview-title">
          <div className="admin-preview-heading fx41j-preview-heading"><div><span className="admin-editor-eyebrow">PAKET ÖNİZLEMESİ</span><h2 id="trainer-package-preview-title">{trainerPackageSentenceTitle(previewPackage.title || "")}</h2>{previewPackage.shortDescription && <p>{previewPackage.shortDescription}</p>}</div><button type="button" className="admin-quiet-button" onClick={()=>setPreviewPackage(null)} aria-label="Önizlemeyi kapat">Kapat</button></div>
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
