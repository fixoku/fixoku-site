import { useEffect, useState, type ReactNode } from "react";

// Visible codes are Turkish presentation labels; historical database SKUs remain unchanged.
export const fixokuImageSlugsV41F: Record<string,string> = {
  "FIXOKU-PRIMARY-AKICI-HIZLI-OKUMA": "ilkokul-akici-hizli-okuma-kitabi",
  "FIXOKU-PRIMARY-ZIHIN-EGZERSIZLERI": "ilkokul-zihin-egzersizleri-kitabi",
  "FIXOKU-MIDDLE-HIZLI-OKUMA": "ortaokul-hizli-okuma-kitabi",
  "FIXOKU-MIDDLE-ZIHIN-EGZERSIZLERI": "ortaokul-zihin-egzersizleri-kitabi",
  "FIXOKU-HIGH-HIZLI-OKUMA": "lise-hizli-okuma-kitabi",
  "FIXOKU-ADULT-HIZLI-OKUMA": "yetiskin-hizli-okuma-kitabi",
  "FIXOKU-STUDENT-ORTAOKUL-PARAGRAF": "ortaokul-paragraf-kitabi",
  "FIXOKU-STUDENT-LISE-PARAGRAF": "lise-paragraf-kitabi",
  "FIXOKU-STUDENT-YAPAY-ZEKA": "fixoku-yapay-zeka-destekli-yazilim",
  "FIXOKU-TRAINING-PRIMARY-FAST-GROUP": "ilkokul-kucuk-grup-egitimi",
  "FIXOKU-TRAINING-PRIMARY-FAST-INDIVIDUAL": "ilkokul-birebir-egitimi",
  "FIXOKU-TRAINING-MIDDLE-FAST-GROUP": "ortaokul-kucuk-grup-egitimi",
  "FIXOKU-TRAINING-MIDDLE-FAST-INDIVIDUAL": "ortaokul-birebir-egitimi",
  "FIXOKU-TRAINING-HIGH-FAST-GROUP": "lise-kucuk-grup-egitimi",
  "FIXOKU-TRAINING-HIGH-FAST-INDIVIDUAL": "lise-birebir-egitimi",
  "FIXOKU-TRAINING-ADULT-FAST-GROUP": "yetiskin-kucuk-grup-egitimi",
  "FIXOKU-TRAINING-ADULT-FAST-INDIVIDUAL": "yetiskin-birebir-egitimi",
  "FIXOKU-TRAINING-MIDDLE-PARAGRAPH-INDIVIDUAL": "ortaokul-paragraf-birebir-egitimi",
  "FIXOKU-TRAINING-HIGH-PARAGRAPH-INDIVIDUAL": "lise-paragraf-birebir-egitimi"
};
export const productImageFolderV41F = "/images/fixoku-katalog/urunler/";
export const packageImageFolderV41F = "/images/fixoku-katalog/paketler/";
export const friendlySkuV41F = (sku: string): string => {
  const special: Record<string,string> = {
    "FIXOKU-STUDENT-YAPAY-ZEKA":"FIXOKU-YAZILIM-YAPAY-ZEKA",
    "FIXOKU-STUDENT-ORTAOKUL-PARAGRAF":"FIXOKU-KITAP-ORTAOKUL-PARAGRAF",
    "FIXOKU-STUDENT-LISE-PARAGRAF":"FIXOKU-KITAP-LISE-PARAGRAF",
  };
  if (special[sku]) return special[sku];
  const result = sku.replace("FIXOKU-TRAINING-", "FIXOKU-EĞİTİM-")
    .replace("FIXOKU-PRIMARY-", "FIXOKU-KİTAP-İLKOKUL-")
    .replace("FIXOKU-MIDDLE-", "FIXOKU-KİTAP-ORTAOKUL-")
    .replace("FIXOKU-HIGH-", "FIXOKU-KİTAP-LİSE-")
    .replace("FIXOKU-ADULT-", "FIXOKU-KİTAP-YETİŞKİN-")
    .replaceAll("PRIMARY", "İLKOKUL").replaceAll("MIDDLE", "ORTAOKUL")
    .replaceAll("HIGH", "LİSE").replaceAll("ADULT", "YETİŞKİN")
    .replaceAll("INDIVIDUAL", "BİREYSEL").replaceAll("GROUP", "KÜÇÜK-GRUP")
    .replaceAll("FAST", "HIZLI-OKUMA").replaceAll("PARAGRAPH", "PARAGRAF")
    .replaceAll("ZIHIN", "ZİHİN").replaceAll("EGZERSIZLERI", "EGZERSİZLERİ")
    .replaceAll("AKICI", "AKICI").replaceAll("HIZLI", "HIZLI").replaceAll("OKUMA", "OKUMA");
  return result;
};
export const productImageDefaultV41F = (sku:string):string|undefined =>
  fixokuImageSlugsV41F[sku] ? productImageFolderV41F + fixokuImageSlugsV41F[sku] + ".webp" : undefined;
// FIXOKU_V41I_COVER_MAP_START
const packageCoverPathsV41I: Record<string,string> = {
  "student-primary-platinum-egitim": "/images/fixoku-katalog/paketler/student-primary-platinum-egitim.png",
  "student-primary-premium-egitim": "/images/fixoku-katalog/paketler/student-primary-premium-egitim.png",
  "student-primary-akilli-sistem": "/images/fixoku-katalog/paketler/student-primary-akilli-sistem.png",
  "student-primary-dijital-yapay-zeka-sistemi": "/images/fixoku-katalog/paketler/student-primary-dijital-yapay-zeka-sistemi.png",
  "student-primary-gelisim": "/images/fixoku-katalog/paketler/student-primary-gelisim.png",
  "student-primary-baslangic": "/images/fixoku-katalog/paketler/student-primary-baslangic.png",
  "student-middle-platinum-egitim": "/images/fixoku-katalog/paketler/student-middle-platinum-egitim.png",
  "student-middle-premium-egitim": "/images/fixoku-katalog/paketler/student-middle-premium-egitim.png",
  "student-middle-akilli-sistem": "/images/fixoku-katalog/paketler/student-middle-akilli-sistem.png",
  "student-middle-dijital-yapay-zeka-sistemi": "/images/fixoku-katalog/paketler/student-middle-dijital-yapay-zeka-sistemi.png",
  "student-middle-gelisim": "/images/fixoku-katalog/paketler/student-middle-gelisim.png",
  "student-middle-baslangic": "/images/fixoku-katalog/paketler/student-middle-baslangic.png",
  "student-high-platinum-egitim": "/images/fixoku-katalog/paketler/student-high-platinum-egitim.png",
  "student-high-premium-egitim": "/images/fixoku-katalog/paketler/student-high-premium-egitim.png",
  "student-high-akilli-sistem": "/images/fixoku-katalog/paketler/student-high-akilli-sistem.png",
  "student-high-dijital-yapay-zeka-sistemi": "/images/fixoku-katalog/paketler/student-high-dijital-yapay-zeka-sistemi.png",
  "student-high-baslangic": "/images/fixoku-katalog/paketler/student-high-baslangic.png",
  "student-adult-platinum-egitim": "/images/fixoku-katalog/paketler/student-adult-platinum-egitim.png",
  "student-adult-premium-egitim": "/images/fixoku-katalog/paketler/student-adult-premium-egitim.png",
  "student-adult-akilli-sistem": "/images/fixoku-katalog/paketler/student-adult-akilli-sistem.png",
  "student-adult-dijital-yapay-zeka-sistemi": "/images/fixoku-katalog/paketler/student-adult-dijital-yapay-zeka-sistemi.png",
  "student-adult-baslangic": "/images/fixoku-katalog/paketler/student-adult-baslangic.png",
  "student-middle-paragraf-egitim": "/images/fixoku-katalog/paketler/student-middle-paragraf-egitim.png",
  "student-middle-paragraf-kitabi": "/images/fixoku-katalog/paketler/student-middle-paragraf-kitabi.png",
  "student-high-paragraf-egitim": "/images/fixoku-katalog/paketler/student-high-paragraf-egitim.png",
  "student-high-paragraf-kitabi": "/images/fixoku-katalog/paketler/student-high-paragraf-kitabi.png",
};
export const packageImageDefaultV41F = (slug:string):string =>
  packageCoverPathsV41I[slug] || (packageImageFolderV41F + slug + ".webp");
// FIXOKU_V41I_COVER_MAP_END
export const moneySuffixV41F = (minor:number):string => new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100) + " ₺";
export function FixokuPhotoV41F({src, fallbackSrc, alt, children}:{src?:string|null;fallbackSrc?:string|null;alt:string;children:ReactNode}) {
  const [attempt, setAttempt] = useState(0);
  useEffect(()=>setAttempt(0),[src,fallbackSrc]);
  const urls = [src,fallbackSrc].filter((x):x is string=>Boolean(x));
  const unique = Array.from(new Set(urls));
  const chosen = unique[attempt];
  return chosen ? <img src={chosen} alt={alt} loading="lazy" onError={()=>setAttempt(attempt+1)} /> : <>{children}</>;
}
