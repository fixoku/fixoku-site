export const KNOWLEDGE_CENTER_HUB_PATH = "/blog";

export const knowledgeCenterCategories = [
  {
    slug: "hizli-okuma",
    eyebrow: "Okuma Becerileri",
    heading: "Hızlı Okuma",
    summary:
      "Okuma temposunu anlama ve metin türüyle birlikte ele alan yöntemler, temel kavramlar ve uygulama önerileri.",
  },
  {
    slug: "dikkat",
    eyebrow: "Dikkat Becerileri",
    heading: "Dikkat",
    summary:
      "Önemli bilgiye yönelme, yönerge takibi ve okuma sırasında ayrıntıları fark etme becerileri hakkında içerikler.",
  },
  {
    slug: "odaklanma",
    eyebrow: "Odak Yönetimi",
    heading: "Odaklanma",
    summary:
      "Bir görev üzerinde kalabilme, dikkat dağıtıcıları yönetme ve sürdürülebilir çalışma düzeni oluşturma yaklaşımları.",
  },
  {
    slug: "hafiza",
    eyebrow: "Bellek Becerileri",
    heading: "Hafıza",
    summary:
      "Bilgiyi anlamlandırma, hatırlamayı destekleyen tekrar biçimleri ve öğrenilenleri düzenleme yöntemleri.",
  },
  {
    slug: "ogrenme-teknikleri",
    eyebrow: "Öğrenme Stratejileri",
    heading: "Öğrenme Teknikleri",
    summary:
      "Not alma, bilgiyi yapılandırma, tekrar planlama ve farklı öğrenme hedeflerine uygun çalışma teknikleri.",
  },
  {
    slug: "sinav-hazirligi",
    eyebrow: "Sınav Stratejileri",
    heading: "Sınav Hazırlığı",
    summary:
      "Sınav döneminde planlama, soru kökünü anlama, süreyi bilinçli kullanma ve düzenli tekrar konuları.",
  },
  {
    slug: "kitap-okuma",
    eyebrow: "Okuma Alışkanlığı",
    heading: "Kitap Okuma",
    summary:
      "Yaşa ve ilgiye uygun kitap seçimi, düzenli okuma alışkanlığı ve farklı metin türleriyle çalışma önerileri.",
  },
  {
    slug: "verimli-ders-calisma",
    eyebrow: "Çalışma Becerileri",
    heading: "Verimli Ders Çalışma",
    summary:
      "Gerçekçi hedef belirleme, çalışma ortamını düzenleme, molaları planlama ve ilerlemeyi takip etme yöntemleri.",
  },
].map((category) => ({
  ...category,
  statusLabel: "Makaleler yakında",
}));

export const knowledgeCenterHub = {
  kind: "hub",
  slug: "blog",
  path: KNOWLEDGE_CENTER_HUB_PATH,
  navLabel: "Bilgi Merkezi",
  icon: "book",
  eyebrow: "Fixoku Bilgi Merkezi",
  heading: "Bilgi Merkezi: Okuma, Dikkat ve Öğrenme Rehberleri",
  seoTitle: "Bilgi Merkezi: Okuma, Dikkat ve Öğrenme Rehberleri | Fixoku",
  metaDescription:
    "Fixoku Bilgi Merkezi'nde hızlı okuma, dikkat, odaklanma, hafıza, öğrenme teknikleri, sınav hazırlığı ve verimli ders çalışma konularını keşfedin.",
  readingTime: "4 dakika",
  summary:
    "Fixoku Bilgi Merkezi; okuma, dikkat, odaklanma ve öğrenme becerileri hakkında güvenilir, anlaşılır ve konu bazlı rehberleri bir araya getiren içerik merkezidir.",
  sections: [
    {
      id: "bilgi-merkezi-nedir",
      title: "Bilgi Merkezi nedir?",
      paragraphs: [
        "Bilgi Merkezi, öğrencilerin, velilerin ve eğitimcilerin okuma ile öğrenme becerileri hakkında aradıkları temel bilgilere düzenli bir yapı içinde ulaşabilmesi için hazırlanmıştır.",
        "İçerikler tek bir sonuç vaadine dayanmak yerine kavramları açıklamayı, uygulanabilir çalışma önerileri sunmayı ve ilgili Fixoku rehberlerine yönlendirmeyi amaçlar.",
      ],
    },
    {
      id: "kategori-yapisi",
      title: "İçerikler nasıl düzenlenecek?",
      paragraphs: [
        "Makaleler hızlı okuma, dikkat, odaklanma, hafıza, öğrenme teknikleri, sınav hazırlığı, kitap okuma ve verimli ders çalışma kategorileri altında yayımlanacaktır.",
        "Makaleler kendi arama amaçları, kaynakları ve SEO bilgileriyle ayrı sayfalarda yayımlanır. Yeni içerikler eklendikçe kategori yapısı genişletilmeden ilgili konu kümesine bağlanır.",
      ],
    },
    {
      id: "kimler-icin",
      title: "Bilgi Merkezi kimler için hazırlanıyor?",
      paragraphs: [
        "Öğrenciler çalışma ve okuma yöntemlerini daha iyi anlamak, veliler destekleyici yaklaşımları değerlendirmek, eğitimciler ise konu başlıklarına göre hazırlanmış rehberlere ulaşmak için Bilgi Merkezi'nden yararlanabilir.",
        "İçerikler eğitim amaçlıdır; tıbbi tanı, tedavi veya her öğrenci için aynı sonucu vaat eden öneriler olarak sunulmaz.",
      ],
    },
  ],
  cards: knowledgeCenterCategories,
  articlesHeading: "Bilgi Merkezi'ndeki güncel makaleler",
  articlesIntro:
    "Hızlı okuma, kelime dağarcığı, dikkat ve görsel algı konularındaki ilk beş makaleyi doğrudan inceleyebilirsiniz.",
  cardsHeading: "Bilgi Merkezi kategorilerini keşfedin",
  cardsIntro:
    "Sekiz ana kategori, yayımlanan ve ilerleyen fazlarda eklenecek makalelerin düzenli ve birbirinden ayrılmış konu kümelerini oluşturur.",
  cta: {
    title: "Mevcut okuma ve dikkat rehberlerinden başlayın",
    text: "Bilgi Merkezi makalelerinin yanında Hızlı Okuma ile Dikkat ve Odaklanma içerik merkezlerini de inceleyebilirsiniz.",
    primary: { label: "Hızlı Okuma Rehberini İncele", to: "/hizli-okuma" },
    secondary: { label: "Dikkat ve Odaklanmayı İncele", to: "/dikkat-ve-odaklanma" },
  },
};

export const knowledgeCenterPages = [knowledgeCenterHub];

export const knowledgeCenterContentByPath = {
  [knowledgeCenterHub.path]: knowledgeCenterHub,
};
