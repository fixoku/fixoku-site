export const STUDENT_COMMERCE_PACKAGE_MATRIX = Object.freeze([
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-platinum-egitim", title: "PLATINUM EĞİTİM", subtitle: "Akıllı Sistem + Birebir Eğitim", displayOrder: 1 },
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-premium-egitim", title: "PREMIUM EĞİTİM", subtitle: "Akıllı Sistem + Küçük Grup Eğitimi", displayOrder: 2 },
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-akilli-sistem", title: "AKILLI SİSTEM", subtitle: "Kitaplar + Yazılım", displayOrder: 3 },
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-dijital-yapay-zeka-sistemi", title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ", subtitle: "Yapay zekâ Destekli Yazılım", displayOrder: 4 },
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-gelisim", title: "GELİŞİM", subtitle: "Zihin Egzersizleri Kitabı", displayOrder: 5 },
  { stage: "PRIMARY", grades: [3, 4], slug: "student-primary-baslangic", title: "BAŞLANGIÇ", subtitle: "Akıcı – Hızlı Okuma Dikkat ve Odaklanma Kitabı", displayOrder: 6 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-platinum-egitim", title: "PLATINUM EĞİTİM", subtitle: "Akıllı Sistem + Birebir Eğitim", displayOrder: 1 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-premium-egitim", title: "PREMIUM EĞİTİM", subtitle: "Akıllı Sistem + Küçük Grup Eğitimi", displayOrder: 2 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-akilli-sistem", title: "AKILLI SİSTEM", subtitle: "Kitaplar + Yazılım", displayOrder: 3 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-dijital-yapay-zeka-sistemi", title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ", subtitle: "Yapay zekâ Destekli Yazılım", displayOrder: 4 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-gelisim", title: "GELİŞİM", subtitle: "Zihin Egzersizleri Kitabı", displayOrder: 5 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-baslangic", title: "BAŞLANGIÇ", subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı", displayOrder: 6 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-paragraf-egitim", title: "ORTAOKUL PARAGRAF EĞİTİM", subtitle: "Paragraf Kitabı + Birebir Eğitim", displayOrder: 7 },
  { stage: "MIDDLE", grades: [5, 6, 7, 8], slug: "student-middle-paragraf-kitabi", title: "ORTAOKUL PARAGRAF KİTABI", subtitle: "Paragraf Kitabı", displayOrder: 8 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-platinum-egitim", title: "PLATINUM EĞİTİM", subtitle: "Akıllı Sistem + Birebir Eğitim", displayOrder: 1 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-premium-egitim", title: "PREMIUM EĞİTİM", subtitle: "Akıllı Sistem + Küçük Grup Eğitimi", displayOrder: 2 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-akilli-sistem", title: "AKILLI SİSTEM", subtitle: "Kitaplar + Yazılım", displayOrder: 3 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-dijital-yapay-zeka-sistemi", title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ", subtitle: "Yapay zekâ Destekli Yazılım", displayOrder: 4 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-baslangic", title: "BAŞLANGIÇ", subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı", displayOrder: 5 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-paragraf-egitim", title: "LİSEL PARAGRAF EĞİTİMİ", subtitle: "Paragraf Kitabı + Birebir Eğitim", displayOrder: 6 },
  { stage: "HIGH", grades: [9, 10, 11, 12], slug: "student-high-paragraf-kitabi", title: "LİSE PARAGRAF KİTABI", subtitle: "Paragraf Kitabı", displayOrder: 7 },
  { stage: "ADULT", grades: [], slug: "student-adult-platinum-egitim", title: "PLATINUM EĞİTİM", subtitle: "Akıllı Sistem + Birebir Eğitim", displayOrder: 1 },
  { stage: "ADULT", grades: [], slug: "student-adult-premium-egitim", title: "PREMIUM EĞİTİM", subtitle: "Akıllı Sistem + Küçük Grup Eğitimi", displayOrder: 2 },
  { stage: "ADULT", grades: [], slug: "student-adult-akilli-sistem", title: "AKILLI SİSTEM", subtitle: "Kitaplar + Yazılım", displayOrder: 3 },
  { stage: "ADULT", grades: [], slug: "student-adult-dijital-yapay-zeka-sistemi", title: "DİJİTAL YAPAY ZEKÂ SİSTEMİ", subtitle: "Yapay zekâ Destekli Yazılım", displayOrder: 4 },
  { stage: "ADULT", grades: [], slug: "student-adult-baslangic", title: "BAŞLANGIÇ", subtitle: "Hızlı Okuma Dikkat ve Odaklanma Kitabı", displayOrder: 5 },
]);

export function packageFamiliesForStage(stage) {
  return STUDENT_COMMERCE_PACKAGE_MATRIX.filter((item) => item.stage === stage);
}
