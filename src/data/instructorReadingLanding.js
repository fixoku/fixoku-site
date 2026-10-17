export const INSTRUCTOR_READING_LANDING_PATH = "/hizli-okuma-egitmeni-ol";

export const instructorReadingLandingRoute = {
  path: INSTRUCTOR_READING_LANDING_PATH,
  title: "Hızlı Okuma Eğitmeni Ol | Fixoku Akademi",
  description:
    "Fixoku Akademi eğitmen modelini, yapay zekâ destekli yazılımı, eğitim sistemini, öğrenci takibini ve eğitmenlik sürecini keşfedin.",
  heading:
    "Eğitmenlik Kariyerinizi Güçlendirin, Yeni Bir Kazanç Fırsatına Adım Atın",
  distinguishingText: "Hızlı Okuma Eğitmeni Ol",
  schemaType: "WebPage",
  breadcrumbs: [
    { label: "Ana Sayfa", path: "/" },
    {
      label: "Hızlı Okuma Eğitmeni Ol",
      path: INSTRUCTOR_READING_LANDING_PATH,
    },
  ],
};

export const instructorHero = {
  kicker: "FİXOKU EĞİTİM MODELİYLE",
  headingLead: "EĞİTMENLİK KARİYERİNİZİ GÜÇLENDİRİN,",
  headingAccent: "YENİ BİR KAZANÇ FIRSATINA ADIM ATIN",
  paragraphs: [
    "Fixoku Akademi; yapay zekâ destekli yazılımı, akıcı okuma, hızlı okuma, okuduğunu anlama, paragraf teknikleri, dikkat ve odaklanma programlarıyla öğrencilerin öğrenme becerilerini bütüncül bir eğitim modeli içinde geliştiren yeni nesil akademik gelişim sistemidir.",
    "Siz de bu sisteme dahil olarak eğitmenlik kariyerinizi güçlendirebilir; online veya yüz yüze eğitim modelinde yeni bir eğitim hizmeti sunabilirsiniz.",
  ],
  cta: {
    label: "EĞİTMEN EĞİTİMİ HAKKINDA DAHA FAZLA BİLGİ AL",
    href: "#egitmen-basvuru-formu",
  },
  images: {
    instructor: {
      src: "/images/instructor-landing/egitmen.png",
      alt: "Fixoku eğitmenlik modelini temsil eden kadın eğitmen",
    },
    computer: {
      src: "/images/instructor-landing/bilgisayar.png",
      alt: "Fixoku eğitim sisteminin masaüstü bilgisayar görünümü",
    },
    phone: {
      src: "/images/instructor-landing/telefon.png",
      alt: "Fixoku eğitim sisteminin mobil telefon görünümü",
    },
  },
};

export const instructorVideoDiscovery = {
  id: "egitmen-modelini-kesfet",
  headingLead: "FİXOKU EĞİTMENLİK MODELİNİ",
  headingAccent: "5 KISA VİDEODA KEŞFEDİN",
  topics: [
    "Fixoku Eğitmeni Olmak Ne Demek?",
    "Fixoku Sistemi Nedir?",
    "Eğitmen Olarak Kazanç ve Fırsatlar",
    "Fixoku Eğitimi Nasıl Uygulanır?",
    "Fixoku Eğitmenlik Yolculuğu",
  ],
};

export const instructorAudience = [
  {
    id: "classroom-teachers",
    icon: "teacher",
    title: "Sınıf Öğretmenleri İçin",
    text: "İlkokul öğrencilerinde akıcı okuma, okuduğunu anlama, dikkat ve odaklanma becerilerini desteklemek isteyen öğretmenler için uygundur.",
  },
  {
    id: "turkish-teachers",
    icon: "language",
    title: "Türkçe Öğretmenleri İçin",
    text: "Öğrencilerin hızlı okuma, paragraf teknikleri, okuduğunu anlama ve sınav süresi yönetimini desteklemek isteyen öğretmenler için güçlü bir model sunar.",
  },
  {
    id: "guidance-teachers",
    icon: "guidance",
    title: "Rehber Öğretmenler İçin",
    text: "Dikkat, odaklanma, öğrenme alışkanlığı ve sınav sürecinde zaman yönetimi alanlarında öğrenci gelişimini takip etmek isteyen rehber öğretmenler için destekleyici bir sistemdir.",
  },
  {
    id: "speed-reading-trainers",
    icon: "presentation",
    title: "Hızlı Okuma Eğitmenleri İçin",
    text: "Mevcut eğitimlerini yazılım, egzersiz, kitap ve ölçümleme sistemiyle daha profesyonel hâle getirmek isteyen eğitmenler için uygundur.",
  },
  {
    id: "education-consultants",
    icon: "consultant",
    title: "Eğitim Danışmanları İçin",
    text: "Öğrencilerle birebir veya grup çalışmaları yapan eğitim danışmanları için uygulanabilir ve takip edilebilir bir akademik gelişim modelidir.",
  },
];

export const instructorGains = [
  {
    id: "ready-system",
    title: "Hazır Eğitim Sistemi",
    text: "Eğitmen; ders planı, kitap, yazılım, egzersiz ve ölçümleme adımlarını sıfırdan kurmak zorunda kalmadan, birbirini tamamlayan hazır bir eğitim modeliyle çalışabilir. Böylece hazırlık süresini azaltıp öğrenci uygulamasına ve bireysel yönlendirmeye daha fazla odaklanabilir.",
  },
  {
    id: "measurable-tracking",
    title: "Ölçülebilir Öğrenci Takibi",
    text: "Öğrencinin okuma hızı, okuduğunu anlama, dikkat, odaklanma ve egzersiz performansı yazılım üzerinden düzenli olarak takip edilebilir. Süre, doğru, yanlış ve boş verileriyle gelişim daha somut biçimde görülebilir ve eğitim süreci öğrencinin ihtiyacına göre yönlendirilebilir.",
  },
  {
    id: "parent-meetings",
    title: "Daha Güçlü Veli Görüşmeleri",
    text: "Eğitmen, öğrencinin başlangıç seviyesi ile süreç içindeki gelişimini ölçülebilir verilerle karşılaştırabilir. Bu sayede veli görüşmelerinde yalnızca gözleme dayalı anlatım yerine daha açık, anlaşılır ve güven veren bir gelişim sunumu yapabilir.",
  },
  {
    id: "new-training-topic",
    title: "Yeni Eğitim Başlığı",
    text: "Eğitmen, mevcut çalışmalarına ek olarak akıcı okuma, hızlı okuma, okuduğunu anlama, paragraf teknikleri, dikkat ve odaklanma alanlarında yeni bir eğitim programı sunabilir. Farklı yaş ve hedef gruplarına uygun bu yapı, eğitmenin hizmet çeşitliliğini planlı biçimde geliştirmesine yardımcı olur.",
  },
  {
    id: "professional-appearance",
    title: "Profesyonel Görünüm",
    text: "Fixoku Akademi modeli; kitap, yazılım, egzersiz, ölçümleme ve öğrenci takip adımlarını tek bir eğitim sürecinde birleştirir. Böylece eğitmen çalışmalarını daha sistemli sunabilir, öğrenci ve veliler karşısında daha kurumsal, düzenli ve güven veren bir eğitim deneyimi oluşturabilir.",
  },
];

export const instructorPreferenceReasons = [
  {
    id: "ai-software",
    icon: "ai",
    title: "Yapay Zekâ Destekli Yazılım",
    text: "Öğrencinin gelişim süreci yazılım üzerinden takip edilir; süre, doğru, yanlış, boş ve egzersiz performansları görülebilir.",
  },
  {
    id: "book-software-trainer",
    icon: "laptop-book",
    title: "Kitap + Yazılım + Eğitmen Modeli",
    text: "Fixoku yalnızca dijital bir sistem değildir. Kitap, yazılım ve eğitmen desteği birlikte kullanılır.",
  },
  {
    id: "twenty-one-days",
    icon: "calendar",
    title: "21 Günlük Sistemli Program",
    text: "Öğrenciler 21 günlük süreçte planlı egzersizlerle ilerler. Eğitim süreci düzenli ve takip edilebilir şekilde yürütülür.",
  },
  {
    id: "exercise-categories",
    icon: "chart",
    title: "126 Egzersiz ve 9 Kategori",
    text: "Okuma, anlama, dikkat, odaklanma, kelime ve zihinsel takip becerilerini destekleyen geniş egzersiz yapısı sunar.",
  },
  {
    id: "content-pool",
    icon: "brain",
    title: "Zengin İçerik Havuzu",
    text: "11.000 kelime, 5.000 eş ve zıt anlamlı kelime, 3.000 deyim ve atasözü, 1.000’e yakın paragraf ve okuma metniyle güçlü bir içerik altyapısı sağlar.",
  },
  {
    id: "whatsapp-support",
    icon: "support",
    title: "Süreç ve WhatsApp Desteği",
    text: "Eğitmenler eğitim uygulaması, öğrenci takibi ve sistem kullanımıyla ilgili süreçte destek alabilir.",
  },
];

export const instructorApplicationProcess = [
  {
    id: "application",
    icon: "application",
    title: "Başvuru Alınır",
    text: "Eğitmenin alanı, öğrenci grubu ve eğitim hedefi değerlendirilir.",
  },
  {
    id: "system-introduction",
    icon: "screen",
    title: "Sistem Tanıtımı Yapılır",
    text: "Fixoku Akademi’nin kitap, yazılım, egzersiz ve takip yapısı eğitmene anlatılır.",
  },
  {
    id: "trainer-planning",
    icon: "plan",
    title: "Eğitmen Süreci Planlanır",
    text: "Eğitmenin hangi sınıf gruplarıyla ve hangi eğitim modeliyle ilerleyeceği belirlenir.",
  },
  {
    id: "student-assessment",
    icon: "assessment",
    title: "Öğrenciler Ölçülür",
    text: "Öğrencilerin okuma, anlama, dikkat ve odaklanma seviyeleri ön değerlendirme testleriyle görülür.",
  },
  {
    id: "training-starts",
    icon: "training",
    title: "Eğitim Başlar",
    text: "Eğitmen, Fixoku kitapları ve yazılımı ile öğrencilerine sistemli eğitim sürecini uygular.",
  },
  {
    id: "progress-tracking",
    icon: "progress",
    title: "Gelişim Takip Edilir",
    text: "Öğrencilerin gelişimi yazılım üzerinden izlenir ve süreç boyunca yönlendirme yapılır.",
  },
  {
    id: "results-shared",
    icon: "results",
    title: "Sonuçlar Veliyle Paylaşılır",
    text: "Eğitim sonunda öğrencinin gelişimi veliye daha somut ve anlaşılır şekilde aktarılır.",
  },
];
