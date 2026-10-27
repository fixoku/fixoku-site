export type FixokuPackageStage =
  | "PRIMARY"
  | "MIDDLE"
  | "HIGH"
  | "ADULT";

export type FixokuPackageCardContent = {
  stage: FixokuPackageStage;
  title: string;
  subtitle: string;
  features: string[];
};

const COMMON_PLATINUM_MIDDLE_HIGH_ADULT = [
  "Uzman eğitmen ile online veya yüz yüze canlı eğitim.",
  "Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
  "Yapay zekâ destekli yazılım ile 21 günlük program.",
  "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
  "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
  "Eğitmen değerlendirmesi ve veli görüşmeleri.",
  "Yazılımda 1 yıl serbest çalışma imkânı.",
  "Hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
];

const COMMON_PREMIUM_MIDDLE_HIGH_ADULT = [
  "Uzman eğitmen ile online veya yüz yüze canlı eğitim.",
  "Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
  "Yapay zekâ destekli yazılım ile 21 günlük program.",
  "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
  "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
  "Eğitmen değerlendirmesi ve veli görüşmeleri.",
  "Yazılımda 1 yıl serbest çalışma imkânı.",
  "Hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
];

const COMMON_AKILLI_MIDDLE_HIGH_ADULT = [
  "Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
  "Yapay zekâ destekli yazılım ile 21 günlük program.",
  "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
  "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
  "Yazılımda 1 yıl serbest çalışma imkânı.",
  "Seçici dikkat egzersizleri - Dikkat ve odaklanma teknikleri.",
  "Göz ve Görme alanı egzersizleri - Okuduğunu anlama becerileri.",
  "Hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
];

const COMMON_DIGITAL_MIDDLE_HIGH = [
  "21 günlük gelişim programı.",
  "126 ölçülebilir dijital egzersiz.",
  "9 beceri alanında gelişim takibi ve raporlama.",
  "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
  "Yazılımda 1 yıl serbest çalışma imkânı.",
  "Seçici dikkat egzersizleri - Dikkat ve odaklanma teknikleri.",
  "Göz ve Görme alanı egzersizleri - Okuduğunu anlama becerileri.",
  "Hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
];

const COMMON_BASLANGIC_MIDDLE_HIGH_ADULT = [
  "Hızlı okuma alışkanlığı.",
  "Okuduğunu anlama becerilerini geliştirme.",
  "Seçici dikkat egzersizleri.",
  "Dikkat ve odaklanma teknikleri.",
  "Göz ve Görme alanı egzersizleri.",
  "Görsel takip ve eşleştirme çalışmaları.",
  "Zaman yönetimini geliştiren uygulamalar.",
  "Okuma, anlama, dikkat ve odaklanma, görsel algı, kelime becerileri ve okuma alışkanlığını destekleyen çalışmalar.",
];

export const FIXOKU_PACKAGE_CARD_CONTENT: FixokuPackageCardContent[] = [
  // PRIMARY — 6
  {
    stage: "PRIMARY",
    title: "PLATINUM EĞİTİM",
    subtitle: "Akıllı Sistem + Birebir Eğitim",
    features: [
      "Uzman eğitmen ile online veya yüz yüze canlı eğitim.",
      "Akıcı ve Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
      "Yapay zekâ destekli yazılım ile 21 günlük program.",
      "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
      "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
      "Eğitmen değerlendirmesi ve veli görüşmeleri.",
      "Yazılımda 1 yıl serbest çalışma imkânı.",
      "Akıcı okuma, hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "PRIMARY",
    title: "PREMIUM EĞİTİM",
    subtitle: "Akıllı Sistem + Küçük Grup Eğitimi",
    features: [
      "Uzman eğitmen ile online veya yüz yüze canlı eğitim.",
      "Akıcı ve Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
      "Yapay zekâ destekli yazılım ile 21 günlük program.",
      "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
      "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
      "Eğitmen değerlendirmesi ve veli görüşmeleri.",
      "Yazılımda 1 yıl serbest çalışma imkânı.",
      "Akıcı okuma, hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "PRIMARY",
    title: "AKILLI SİSTEM",
    subtitle: "Kitaplar + Yazılım",
    features: [
      "Akıcı ve Hızlı Okuma Kitabı + Zihin Egzersizleri Kitabı.",
      "Yapay zekâ destekli yazılım ile 21 günlük program.",
      "126 egzersiz, 9 beceri alanında gelişim takibi ve raporlama.",
      "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
      "Yazılımda 1 yıl serbest çalışma imkânı.",
      "Seçici dikkat egzersizleri - Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri - Okuduğunu anlama becerileri.",
      "Akıcı okuma, hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "PRIMARY",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    subtitle: "Yapay zekâ Destekli Yazılım",
    features: [
      "21 günlük gelişim programı.",
      "126 ölçülebilir dijital egzersiz.",
      "9 beceri alanında gelişim takibi ve raporlama.",
      "Günlük yazılım çalışmaları sonrası otomatik veli bilgilendirmesi.",
      "Yazılımda 1 yıl serbest çalışma imkânı.",
      "Seçici dikkat egzersizleri - Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri - Okuduğunu anlama becerileri.",
      "Akıcı okuma, hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "PRIMARY",
    title: "GELİŞİM",
    subtitle: "Zihin Egzersizleri Kitabı",
    features: [
      "Seçici dikkat egzersizleri.",
      "Görsel algı ve hafıza çalışmaları.",
      "Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri.",
      "Sözel mantık çalışmaları.",
      "Görsel takip ve eşleştirme çalışmaları.",
      "Şekil ve örüntü çalışmaları.",
      "Dikkat ve odaklanma, görsel algı, bilişsel becerilerin gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "PRIMARY",
    title: "BAŞLANGIÇ",
    subtitle: "Akıcı – Hızlı Okuma Dikkat ve Odaklanma Kitabı",
    features: [
      "Doğru ve akıcı okuma alışkanlığı.",
      "Okuma hızını geliştirme.",
      "Okuduğunu anlama becerileri.",
      "Seçici dikkat egzersizleri.",
      "Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri.",
      "Görsel takip ve eşleştirme çalışmaları.",
      "Akıcı okuma, anlama, dikkat ve odaklanma, görsel algı, kelime becerileri ve okuma alışkanlığını destekleyen çalışmalar.",
    ],
  },

  // MIDDLE — 6
  {
    stage: "MIDDLE",
    title: "PLATINUM EĞİTİM",
    subtitle: "Akıllı Sistem + Birebir Eğitim",
    features: COMMON_PLATINUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "MIDDLE",
    title: "PREMIUM EĞİTİM",
    subtitle: "Akıllı Sistem + Küçük Grup Eğitimi",
    features: COMMON_PREMIUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "MIDDLE",
    title: "AKILLI SİSTEM",
    subtitle: "Kitaplar + Yazılım",
    features: COMMON_AKILLI_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "MIDDLE",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    subtitle: "Yapay zekâ Destekli Yazılım",
    features: COMMON_DIGITAL_MIDDLE_HIGH,
  },
  {
    stage: "MIDDLE",
    title: "GELİŞİM",
    subtitle: "Zihin Egzersizleri Kitabı",
    features: [
      "Seçici dikkat egzersizleri.",
      "Görsel algı ve hafıza çalışmaları.",
      "Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri.",
      "Sözel mantık çalışmaları.",
      "Görsel takip ve eşleştirme çalışmaları.",
      "Şekil ve örüntü çalışmaları.",
      "Dikkat ve odaklanma, görsel algı, bilişsel becerilerin gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "MIDDLE",
    title: "BAŞLANGIÇ",
    subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı",
    features: COMMON_BASLANGIC_MIDDLE_HIGH_ADULT,
  },

  // HIGH — 5
  {
    stage: "HIGH",
    title: "PLATINUM EĞİTİM",
    subtitle: "Akıllı Sistem + Birebir Eğitim",
    features: COMMON_PLATINUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "HIGH",
    title: "PREMIUM EĞİTİM",
    subtitle: "Akıllı Sistem + Küçük Grup Eğitimi",
    features: COMMON_PREMIUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "HIGH",
    title: "AKILLI SİSTEM",
    subtitle: "Kitaplar + Yazılım",
    features: COMMON_AKILLI_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "HIGH",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    subtitle: "Yapay zekâ Destekli Yazılım",
    features: COMMON_DIGITAL_MIDDLE_HIGH,
  },
  {
    stage: "HIGH",
    title: "BAŞLANGIÇ",
    subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı",
    features: COMMON_BASLANGIC_MIDDLE_HIGH_ADULT,
  },

  // ADULT — 5
  {
    stage: "ADULT",
    title: "PLATINUM EĞİTİM",
    subtitle: "Akıllı Sistem + Birebir Eğitim",
    features: COMMON_PLATINUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "ADULT",
    title: "PREMIUM EĞİTİM",
    subtitle: "Akıllı Sistem + Küçük Grup Eğitimi",
    features: COMMON_PREMIUM_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "ADULT",
    title: "AKILLI SİSTEM",
    subtitle: "Kitaplar + Yazılım",
    features: COMMON_AKILLI_MIDDLE_HIGH_ADULT,
  },
  {
    stage: "ADULT",
    title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ",
    subtitle: "Yapay zekâ Destekli Yazılım",
    features: [
      "21 günlük gelişim programı.",
      "126 ölçülebilir dijital egzersiz.",
      "9 beceri alanında gelişim takibi ve raporlama.",
      "Günlük yazılım çalışmaları sonrası otomatik bilgilendirme.",
      "Yazılımda 1 yıl serbest çalışma imkânı.",
      "Seçici dikkat egzersizleri - Dikkat ve odaklanma teknikleri.",
      "Göz ve Görme alanı egzersizleri - Okuduğunu anlama becerileri.",
      "Akıcı okuma, hızlı okuma, okuduğunu anlama, dikkat ve odaklanma gelişimini destekleyen çalışmalar.",
    ],
  },
  {
    stage: "ADULT",
    title: "BAŞLANGIÇ",
    subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı",
    features: COMMON_BASLANGIC_MIDDLE_HIGH_ADULT,
  },
];

function normalizePackageTitle(value: string) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFixokuPackageCardContent(
  stage: string,
  title: string,
): FixokuPackageCardContent | null {
  const normalizedStage = String(stage || "").toUpperCase();
  const normalizedTitle = normalizePackageTitle(title);

  return (
    FIXOKU_PACKAGE_CARD_CONTENT.find(
      (item) =>
        item.stage === normalizedStage &&
        normalizePackageTitle(item.title) === normalizedTitle,
    ) || null
  );
}

export function listFixokuPackageCardContent(stage: string) {
  const normalizedStage = String(stage || "").toUpperCase();
  return FIXOKU_PACKAGE_CARD_CONTENT.filter(
    (item) => item.stage === normalizedStage,
  );
}