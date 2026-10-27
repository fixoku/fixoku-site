export const studentCategories = [
  { title: "Okuma Hızı", value: 412, suffix: " kelime/dk", progress: 78, tone: "orange" },
  { title: "Anlama Oranı", value: 86, suffix: "%", progress: 86, tone: "purple" },
  { title: "Dikkat Odaklanma", value: 74, suffix: "%", progress: 74, tone: "blue" },
  { title: "Takistoskop", value: 68, suffix: "%", progress: 68, tone: "green" },
  { title: "Kelime Hazinesi", value: 590, suffix: " puan", progress: 64, tone: "pink" },
  { title: "Göz Görme Alanı", value: 81, suffix: "%", progress: 81, tone: "cyan" },
  { title: "Hafıza Egzersizleri", value: 73, suffix: "%", progress: 73, tone: "yellow" },
  { title: "Metin Egzersizleri", value: 91, suffix: "%", progress: 91, tone: "orange" },
  { title: "Konsantrasyon", value: 88, suffix: "%", progress: 88, tone: "purple" },
];

export const studentTrend = [38, 44, 47, 53, 57, 63, 66, 74, 71, 79, 84, 88];

export const dailyTasks = [
  { day: "01", title: "Seviye Tespit Testi", status: "completed", score: 92 },
  { day: "02", title: "Göz Alanı Egzersizi", status: "completed", score: 86 },
  { day: "03", title: "Odaklanma Turu", status: "active", score: 64 },
  { day: "04", title: "Metin Anlama", status: "locked", score: 0 },
  { day: "05", title: "Takistoskop", status: "locked", score: 0 },
];

export const liveFeed = [
  "Yusuf Selek 3. gün egzersizine başladı.",
  "Okuma hızı son ölçümde 412 kelime/dk oldu.",
  "Anlama oranı önceki teste göre %14 arttı.",
  "Bugünkü hedefin %64'ü tamamlandı.",
];

export const freeExercises = [
  { title: "Okuma Hızı Anlama Oranı", icon: "📚" },
  { title: "Takistoskop", icon: "🔎" },
  { title: "Göz ve Görme Alanı", icon: "👁️" },
  { title: "Dikkat Odaklanma", icon: "🎯" },
  { title: "Konsantrasyon", icon: "🧘" },
  { title: "Sayısal İşlemler", icon: "🧮" },
  { title: "Kelime Hazinesi", icon: "🔤" },
  { title: "Hafıza Egzersizleri", icon: "🧠" },
  { title: "Metin Düzeyinde Egzersizler", icon: "📖" },
];

export const challengeCards = [
  { title: "Dikkat Odaklanma", icon: "🏆" },
  { title: "Konsantrasyon", icon: "🥇" },
  { title: "Hafıza Egzersizleri", icon: "🏁" },
  { title: "Kelime Hazinesi", icon: "🏃" },
  { title: "Metin Düzeyinde Egzersizler", icon: "🤝" },
  { title: "Sayısal İşlemler", icon: "♟️" },
];

export const roleCards = {
  teacher: [
    { title: "Aktif Öğrenci", value: "24", sub: "Bugün 11 öğrenci çalıştı" },
    { title: "Ortalama Başarı", value: "%76", sub: "Sınıf ortalaması" },
    { title: "Tamamlanan Görev", value: "186", sub: "Bu hafta" },
    { title: "Riskli Öğrenci", value: "3", sub: "Takip önerilir" },
  ],
  institution: [
    { title: "Toplam Öğrenci", value: "142", sub: "12 sınıfta aktif" },
    { title: "Öğretmen", value: "8", sub: "Kurum hesabında" },
    { title: "Genel Başarı", value: "%79", sub: "Kurum ortalaması" },
    { title: "Lisans Kullanımı", value: "%68", sub: "Aktif paket" },
  ],
  admin: [
    { title: "Kurum", value: "36", sub: "Sistemde kayıtlı" },
    { title: "Öğrenci", value: "3280", sub: "Toplam kullanıcı" },
    { title: "Eğitmen", value: "214", sub: "Aktif eğitmen" },
    { title: "Egzersiz", value: "126", sub: "Yayında" },
  ],
};
