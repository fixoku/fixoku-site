export type FixokuPackageStage = "PRIMARY" | "MIDDLE" | "HIGH" | "ADULT";
export type FixokuPackageSection = "education" | "paragraph";

export type FixokuPackageMedia = {
  stage: FixokuPackageStage;
  section: FixokuPackageSection;
  slug: string;
  title: string;
  aliases: string[];
  image: string;
};

export const FIXOKU_PACKAGE_MEDIA: FixokuPackageMedia[] = [
  // PRIMARY / İLKOKUL
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-platinum-egitim",
    title: "PLATINUM EĞİTİM",
    aliases: ["PLATINUM EĞİTİM"],
    image: "/images/packages/primary/fixoku-ilkokul-platinum-2400x1120.png",
  },
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-premium-egitim",
    title: "PREMIUM EĞİTİM",
    aliases: ["PREMIUM EĞİTİM"],
    image: "/images/packages/primary/fixoku-ilkokul-premium-2400x1120.png",
  },
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-akilli-sistem",
    title: "AKILLI SİSTEM",
    aliases: ["AKILLI SİSTEM"],
    image: "/images/packages/primary/fixoku-ilkokul-akilli-sistem-2400x1120.png",
  },
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-dijital-yapay-zeka-sistemi",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    aliases: ["DİJİTAL YAPAY ZEKÂ SİSTEMİ"],
    image: "/images/packages/primary/fixoku-dijital-yapay-zeka-2400x1120.png",
  },
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-gelisim",
    title: "GELİŞİM",
    aliases: ["GELİŞİM"],
    image: "/images/packages/primary/fixoku-ilkokul-egzersiz-2400x1120.png",
  },
  {
    stage: "PRIMARY",
    section: "education",
    slug: "student-primary-baslangic",
    title: "BAŞLANGIÇ",
    aliases: ["BAŞLANGIÇ"],
    image: "/images/packages/primary/fixoku-ilkokul-akici-hizli-okuma-2400x1120.png",
  },

  // MIDDLE / ORTAOKUL — exactly 6 education packages
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-platinum-egitim",
    title: "PLATINUM EĞİTİM",
    aliases: ["PLATINUM EĞİTİM"],
    image: "/images/packages/middle/fixoku-ortaokul-platinum-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-premium-egitim",
    title: "PREMIUM EĞİTİM",
    aliases: ["PREMIUM EĞİTİM"],
    image: "/images/packages/middle/fixoku-ortaokul-premium-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-akilli-sistem",
    title: "AKILLI SİSTEM",
    aliases: ["AKILLI SİSTEM"],
    image: "/images/packages/middle/fixoku-ortaokul-akilli-sistem-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-dijital-yapay-zeka-sistemi",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    aliases: ["DİJİTAL YAPAY ZEKÂ SİSTEMİ"],
    image: "/images/packages/middle/fixoku-ortaokul-dijital-yapay-zeka-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-gelisim",
    title: "GELİŞİM",
    aliases: ["GELİŞİM"],
    image: "/images/packages/middle/fixoku-ortaokul-egzersiz-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "education",
    slug: "student-middle-baslangic",
    title: "BAŞLANGIÇ",
    aliases: ["BAŞLANGIÇ"],
    image: "/images/packages/middle/fixoku-ortaokul-hizli-okuma-2400x1200.png",
  },

  // HIGH / LİSE — 5 education packages
  {
    stage: "HIGH",
    section: "education",
    slug: "student-high-platinum-egitim",
    title: "PLATINUM EĞİTİM",
    aliases: ["PLATINUM EĞİTİM"],
    image: "/images/packages/high/fixoku-lise-platinum-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "education",
    slug: "student-high-premium-egitim",
    title: "PREMIUM EĞİTİM",
    aliases: ["PREMIUM EĞİTİM"],
    image: "/images/packages/high/fixoku-lise-premium-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "education",
    slug: "student-high-akilli-sistem",
    title: "AKILLI SİSTEM",
    aliases: ["AKILLI SİSTEM"],
    image: "/images/packages/high/fixoku-lise-akilli-sistem-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "education",
    slug: "student-high-dijital-yapay-zeka-sistemi",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    aliases: ["DİJİTAL YAPAY ZEKÂ SİSTEMİ"],
    image: "/images/packages/high/fixoku-lise-dijital-yapay-zeka-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "education",
    slug: "student-high-baslangic",
    title: "BAŞLANGIÇ",
    aliases: ["BAŞLANGIÇ"],
    image: "/images/packages/high/fixoku-lise-hizli-okuma-2400x1200.png",
  },

  // ADULT / YETİŞKİN — 5 education packages
  {
    stage: "ADULT",
    section: "education",
    slug: "student-adult-platinum-egitim",
    title: "PLATINUM EĞİTİM",
    aliases: ["PLATINUM EĞİTİM"],
    image: "/images/packages/adult/fixoku-yetiskin-platinum-2400x1200.png",
  },
  {
    stage: "ADULT",
    section: "education",
    slug: "student-adult-premium-egitim",
    title: "PREMIUM EĞİTİM",
    aliases: ["PREMIUM EĞİTİM"],
    image: "/images/packages/adult/fixoku-yetiskin-premium-2400x1200.png",
  },
  {
    stage: "ADULT",
    section: "education",
    slug: "student-adult-akilli-sistem",
    title: "AKILLI SİSTEM",
    aliases: ["AKILLI SİSTEM"],
    image: "/images/packages/adult/fixoku-yetiskin-kitap-yazilim-2400x1200.png",
  },
  {
    stage: "ADULT",
    section: "education",
    slug: "student-adult-dijital-yapay-zeka-sistemi",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    aliases: ["DİJİTAL YAPAY ZEKÂ SİSTEMİ"],
    image: "/images/packages/adult/fixoku-yetiskin-yazilim-2400x1200.png",
  },
  {
    stage: "ADULT",
    section: "education",
    slug: "student-adult-baslangic",
    title: "BAŞLANGIÇ",
    aliases: ["BAŞLANGIÇ", "YETİŞKİN HIZLI OKUMA KİTABI"],
    image: "/images/packages/adult/fixoku-yetiskin-kitap-2400x1200.png",
  },

  // PARAGRAPH — kept separate from regular Middle/High education package grids.
  {
    stage: "MIDDLE",
    section: "paragraph",
    slug: "student-middle-paragraf-egitim",
    title: "ORTAOKUL PARAGRAF BİREBİR EĞİTİMİ",
    aliases: ["ORTAOKUL PARAGRAF EĞİTİM", "ORTAOKUL PARAGRAF BİREBİR EĞİTİMİ"],
    image: "/images/packages/paragraph/fixoku-ortaokul-paragraf-egitimi-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "paragraph",
    slug: "student-middle-paragraf-kucuk-grup",
    title: "ORTAOKUL PARAGRAF KÜÇÜK GRUP EĞİTİMİ",
    aliases: ["ORTAOKUL PARAGRAF KÜÇÜK GRUP EĞİTİMİ"],
    image: "/images/packages/paragraph/fixoku-ortaokul-paragraf-kucuk-grup-2400x1200.png",
  },
  {
    stage: "MIDDLE",
    section: "paragraph",
    slug: "student-middle-paragraf-kitabi",
    title: "ORTAOKUL PARAGRAF KİTABI",
    aliases: ["ORTAOKUL PARAGRAF KİTABI"],
    image: "/images/packages/paragraph/fixoku-ortaokul-paragraf-kitabi-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "paragraph",
    slug: "student-high-paragraf-egitim",
    title: "LİSE PARAGRAF BİREBİR EĞİTİMİ",
    aliases: ["LİSEL PARAGRAF EĞİTİM", "LİSE PARAGRAF BİREBİR EĞİTİMİ"],
    image: "/images/packages/paragraph/fixoku-lise-paragraf-egitimi-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "paragraph",
    slug: "student-high-paragraf-kucuk-grup",
    title: "LİSE PARAGRAF KÜÇÜK GRUP EĞİTİMİ",
    aliases: ["LİSE PARAGRAF KÜÇÜK GRUP EĞİTİMİ"],
    image: "/images/packages/paragraph/fixoku-lise-paragraf-kucuk-grup-2400x1200.png",
  },
  {
    stage: "HIGH",
    section: "paragraph",
    slug: "student-high-paragraf-kitabi",
    title: "LİSE PARAGRAF KİTABI",
    aliases: ["LİSE PARAGRAF KİTABI"],
    image: "/images/packages/paragraph/fixoku-lise-paragraf-kitabi-2400x1200.png",
  },
];

function normalizePackageText(value: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFixokuPackageMedia(
  stage: string,
  title: string,
): FixokuPackageMedia | null {
  const normalizedStage = String(stage || "").toUpperCase();
  const normalizedTitle = normalizePackageText(title);

  return (
    FIXOKU_PACKAGE_MEDIA.find(
      (item) =>
        item.stage === normalizedStage &&
        item.aliases.some(
          (alias) => normalizePackageText(alias) === normalizedTitle,
        ),
    ) || null
  );
}

export function listFixokuEducationPackageMedia(stage: string) {
  const normalizedStage = String(stage || "").toUpperCase();
  return FIXOKU_PACKAGE_MEDIA.filter(
    (item) =>
      item.stage === normalizedStage &&
      item.section === "education",
  );
}

export function listFixokuParagraphPackageMedia(stage?: string) {
  const normalizedStage = stage ? String(stage).toUpperCase() : null;
  return FIXOKU_PACKAGE_MEDIA.filter(
    (item) =>
      item.section === "paragraph" &&
      (!normalizedStage || item.stage === normalizedStage),
  );
}