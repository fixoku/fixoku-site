export const FIXOKU_EDUCATION_HUB_PATH = "/fixoku-egitimi";

const collectionLabel = "Fixoku Eğitimi";

export const fixokuEducationHub = {
  kind: "hub",
  slug: "fixoku-egitimi",
  path: FIXOKU_EDUCATION_HUB_PATH,
  navLabel: collectionLabel,
  icon: "spark",
  eyebrow: "Fixoku Eğitimi İçerik Merkezi",
  heading: "Fixoku Eğitimi: Kitap, Yazılım ve Eğitmen Rehberliği",
  seoTitle: "Fixoku Eğitimi: Kitap, Yazılım ve Eğitim Süreci | Fixoku",
  metaDescription:
    "Fixoku eğitim sisteminin kitap, egzersiz, paragraf çalışmaları, dijital yazılım ve eğitmen rehberliğini nasıl bir araya getirdiğini inceleyin.",
  readingTime: "6 dakika",
  summary:
    "Fixoku Eğitimi; basılı çalışma materyallerini, dijital egzersizleri, ölçüm sonuçlarının takibini ve eğitmen rehberliğini aynı öğrenme sürecinde bir araya getirir.",
  sections: [
    {
      id: "fixoku-egitimi-nedir",
      title: "Fixoku Eğitim Sistemi nedir?",
      paragraphs: [
        "Fixoku, hızlı okuma, okuduğunu anlama, dikkat, odaklanma ve paragraf becerilerini birlikte desteklemeyi amaçlayan bütüncül bir eğitim yaklaşımıdır. Sistem tek bir kitap ya da yalnızca dijital bir uygulama yerine farklı çalışma araçlarını aynı plan içinde kullanır.",
        "Öğrencinin başlangıç düzeyi, çalışma alışkanlığı ve eğitim hedefi dikkate alınarak kitap çalışmaları, dijital egzersizler ve eğitmen yönlendirmesi arasında dengeli bir program oluşturulabilir.",
      ],
    },
    {
      id: "desteklenen-beceriler",
      title: "Sistem hangi becerileri desteklemeyi amaçlar?",
      paragraphs: [
        "Eğitim yaklaşımı yalnızca dakikadaki kelime sayısına odaklanmaz. Okuma temposunun anlama, dikkat ve doğru soru çözme davranışıyla birlikte değerlendirilmesi hedeflenir.",
      ],
      bullets: [
        "Akıcı ve kontrollü okuma",
        "Okuduğunu anlama ve ana düşünceyi izleme",
        "Dikkati göreve yöneltme ve sürdürme",
        "Kelime gruplarını ve anlam ilişkilerini fark etme",
        "Paragraf yapısını ve soru kökünü doğru yorumlama",
        "Çalışma sonuçlarını düzenli biçimde takip etme",
      ],
    },
    {
      id: "kitaplar-ve-egzersizler",
      title: "Eğitim kitapları ve basılı çalışmalar",
      paragraphs: [
        "Hızlı okuma kitabı, egzersiz kitapları ve paragraf kitapları farklı amaçlara hizmet eder. Hızlı okuma kitabı okuma tekniği ve tempo üzerinde çalışırken egzersiz kitapları dikkat, görsel algı ve kelime çalışmalarını; paragraf kitapları ise metin yapısı ve soru çözme becerilerini destekler.",
        "Basılı materyaller eğitmenin yönlendirmesi ve öğrencinin seviyesine uygun çalışma sırasıyla kullanıldığında eğitim sürecinin düzenli ilerlemesine yardımcı olabilir.",
      ],
    },
    {
      id: "yazilim-ve-takip",
      title: "Dijital yazılım ve çalışma takibi",
      paragraphs: [
        "Fixoku yazılımı öğrencinin egzersizlere erişmesine, çalışma sonuçlarını ve istatistik alanlarını görmesine yardımcı olan dijital bir çalışma ortamıdır. Öğrenci ve eğitmen için ayrı panel yapıları eğitim sürecinin farklı rollerden takip edilmesini destekler.",
        "Yazılımın sunduğu veriler tek başına başarı garantisi veya otomatik tanı anlamına gelmez. Sonuçlar, öğrencinin çalışma düzeni ve eğitmen değerlendirmesiyle birlikte ele alınmalıdır.",
      ],
    },
    {
      id: "egitmen-rehberligi",
      title: "Eğitmen rehberliği ve eğitim süreci",
      paragraphs: [
        "Eğitmen; öğrencinin seviyesini, kitap çalışmalarını, dijital egzersizlere katılımını ve ölçüm sonuçlarını birlikte değerlendirerek çalışma planının uygulanmasına rehberlik eder.",
        "Amaç öğrenciyi diğer öğrencilerle karşılaştırmak değil, kendi başlangıç düzeyine göre ilerlemesini görünür kılmak ve ihtiyaç duyduğu alanlarda uygun tekrarları planlamaktır.",
      ],
    },
  ],
  cardsHeading: "Fixoku Eğitiminin bileşenlerini ayrıntılı inceleyin",
  cardsIntro:
    "Eğitim yaklaşımı, uygulama süreci, yazılım ve üç farklı kitap grubu hakkında hazırlanan içeriklerden ihtiyacınıza uygun olanı seçebilirsiniz.",
  cta: {
    title: "Fixoku eğitim seçeneklerini öğrencinin ihtiyacına göre değerlendirin",
    text: "Yaş, seviye ve çalışma hedefi hakkında bilgi paylaşarak uygun eğitim yaklaşımını inceleyebilirsiniz.",
    primary: { label: "Fixoku Eğitimlerini İncele", to: "/egitimler" },
    secondary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
  },
};

export const fixokuEducationArticles = [
  {
    kind: "article",
    slug: "neden-fixoku",
    path: "/fixoku-egitimi/neden-fixoku",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Neden Fixoku?",
    icon: "question",
    eyebrow: "Eğitim Yaklaşımı",
    heading: "Neden Fixoku Eğitim Yaklaşımı?",
    seoTitle: "Neden Fixoku? Eğitim Yaklaşımı ve Temel Farkları | Fixoku",
    metaDescription:
      "Fixoku eğitim yaklaşımının kitap, yazılım, ölçüm ve eğitmen rehberliğini nasıl bir araya getirdiğini; öğrenci odaklı çalışma modeliyle inceleyin.",
    readingTime: "6 dakika",
    summary:
      "Fixoku yaklaşımının temel farkı, okuma ve dikkat çalışmalarını tek bir araca bırakmadan kitap, dijital egzersiz, ölçüm ve eğitmen rehberliğiyle birlikte ele almasıdır.",
    sections: [
      {
        id: "butuncul-egitim",
        title: "Bütüncül eğitim yaklaşımı",
        paragraphs: [
          "Okuma hızı, anlama, dikkat ve paragraf çözme davranışı birbirinden tamamen bağımsız değildir. Fixoku bu alanları tek bir sonuç vaadine indirgemeden, birbirini destekleyen çalışma başlıkları olarak ele alır.",
          "Kitaplar metin üzerinde uygulama yapmayı, dijital yazılım egzersizlere ve sonuç ekranlarına erişimi, eğitmen ise çalışma sırasının ve güçlük düzeyinin yönetilmesini destekler.",
        ],
      },
      {
        id: "olcumle-baslayan-surec",
        title: "Ölçümle başlayıp takip ile devam eden süreç",
        paragraphs: [
          "Başlangıç ölçümü öğrencinin o andaki okuma ve anlama düzeyi hakkında bir referans oluşturabilir. Eğitim boyunca yapılan ölçümler ise öğrencinin farklı çalışma alanlarındaki sonuçlarını karşılaştırmaya yardımcı olur.",
          "Bu veriler öğrencinin kapasitesi hakkında kesin hüküm vermez. Eğitmenin gözlemi, öğrencinin çalışma düzeni ve anlama sonuçlarıyla birlikte değerlendirilir.",
        ],
      },
      {
        id: "seviyeye-uygun-calisma",
        title: "Öğrencinin seviyesini dikkate alan çalışma modeli",
        paragraphs: [
          "İlkokul, ortaokul, lise ve yetişkin okurların metin güçlüğü, dikkat süresi ve çalışma hedefleri aynı değildir. Bu nedenle içerik ve çalışma temposunun yaşa, okuma deneyimine ve eğitim amacına göre seçilmesi önemlidir.",
          "Seviyeye uygun planlama, her öğrenciye aynı sonucu vaat etmek yerine ulaşılabilir ve sürdürülebilir görevler oluşturmayı hedefler.",
        ],
      },
      {
        id: "duzenli-calisma",
        title: "Düzenli ve sürdürülebilir çalışma",
        paragraphs: [
          "Kısa ama düzenli uygulamalar, öğrencinin öğrendiği teknikleri farklı metin ve egzersizlerde tekrar etmesini sağlar. Çalışmanın süresi kadar doğruluk, anlama ve göreve devam edebilme de izlenmelidir.",
          "Yoğun ve baskılı bir program yerine öğrencinin günlük düzenine uyarlanabilen çalışma planı, katılımın korunmasına yardımcı olabilir.",
        ],
      },
      {
        id: "anlasilir-gelisim-takibi",
        title: "Öğrenci, veli ve eğitmen için anlaşılır takip",
        paragraphs: [
          "Öğrenci panelindeki egzersiz ve istatistik alanları öğrencinin kendi çalışmalarını görmesini; eğitmen panelindeki öğrenci, egzersiz atama ve rapor menüleri ise sürecin rehberlik açısından izlenmesini destekler.",
          "Takip ekranlarının amacı öğrenciyi etiketlemek veya kesin sonuç tahmini yapmak değil, tamamlanan çalışmaları ve yeniden ele alınabilecek alanları daha görünür kılmaktır.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/egitim-sureci",
      "/fixoku-egitimi/yazilim",
      "/fixoku-egitimi/hizli-okuma-kitabi",
    ],
    cta: {
      title: "Fixoku eğitim sürecinin nasıl uygulandığını inceleyin",
      text: "Seviye tespitinden kitap ve dijital çalışmalara uzanan eğitim akışını adım adım öğrenebilirsiniz.",
      primary: { label: "Eğitim Sürecini İncele", to: "/fixoku-egitimi/egitim-sureci" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "egitim-sureci",
    path: "/fixoku-egitimi/egitim-sureci",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Eğitim Nasıl Veriliyor",
    icon: "chart",
    eyebrow: "Uygulama Aşamaları",
    heading: "Fixoku Eğitimi Nasıl Veriliyor?",
    seoTitle: "Fixoku Eğitimi Nasıl Veriliyor? Eğitim Süreci | Fixoku",
    metaDescription:
      "Fixoku eğitim sürecinin seviye tespiti, çalışma planı, eğitmen rehberliği, kitap uygulamaları, dijital egzersizler ve değerlendirme adımlarını öğrenin.",
    readingTime: "6 dakika",
    summary:
      "Fixoku eğitim süreci seviye tespitiyle başlar; öğrenciye uygun çalışma planı, eğitmen rehberliği, kitap ve dijital egzersizlerle düzenli biçimde ilerler.",
    sections: [
      {
        id: "seviye-tespiti",
        title: "1. Seviye tespiti",
        paragraphs: [
          "Eğitimin başlangıcında öğrencinin okuma hızı ve anlama sonucu gibi temel ölçümler alınabilir. Bu sonuçlar öğrencinin başlangıç noktasını görmek ve çalışma güçlüğünü belirlemek için kullanılır.",
          "Tek bir ölçüm öğrencinin bütün becerilerini açıklamaz. Yaş, okul düzeyi, okuma alışkanlığı ve eğitim hedefi de planlama sırasında dikkate alınır.",
        ],
      },
      {
        id: "egitim-plani",
        title: "2. Öğrenciye uygun eğitim planı",
        paragraphs: [
          "Başlangıç bilgileri doğrultusunda kitap çalışmaları, dijital egzersizler ve tekrar alanları için uygulanabilir bir sıra oluşturulur. Planın amacı öğrenciyi gereksiz biçimde zorlamak değil, çalışmaların kademeli ilerlemesini sağlamaktır.",
          "Metin uzunluğu, görev süresi ve egzersiz türü öğrencinin seviyesine ve çalışma sırasında gösterdiği ihtiyaca göre eğitmen tarafından düzenlenebilir.",
        ],
      },
      {
        id: "egitmen-esliginde-calisma",
        title: "3. Eğitmen eşliğinde çalışma",
        paragraphs: [
          "Eğitmen hızlı okuma tekniklerini açıklar, kitap uygulamalarını yönlendirir ve öğrencinin okuma sırasında anlama ile dikkat dengesini koruyup korumadığını gözlemler.",
          "Eğitim yüz yüze veya uygun koşullarda çevrim içi yürütülebilir. Uygulama biçimi kurumun programına, öğrencinin ihtiyacına ve eğitmen planlamasına göre belirlenir.",
        ],
      },
      {
        id: "gunluk-uygulamalar",
        title: "4. Kitap ve dijital egzersiz uygulamaları",
        paragraphs: [
          "Öğrenci eğitim kitabındaki metin ve teknik çalışmalarını, egzersiz kitaplarındaki dikkat ve algı uygulamalarını ve yazılımdaki dijital görevleri belirlenen sırayla tamamlar.",
          "Dijital çalışma evde tekrar amacıyla kullanılabilir; ancak yazılım eğitmenin yerini almaz. Öğrencinin soruları, zorlandığı görevler ve anlama sonuçları eğitim sürecinde birlikte değerlendirilir.",
        ],
      },
      {
        id: "gelisim-olcumu",
        title: "5. Gelişim ölçümü ve takip",
        paragraphs: [
          "Belirli aralıklarla yapılan ölçümler öğrencinin okuma ve anlama sonuçlarında nasıl bir değişim olduğunu görmeye yardımcı olur. Egzersiz ve istatistik ekranları tamamlanan çalışmaları daha görünür hâle getirebilir.",
          "Hızdaki artış tek başına yeterli kabul edilmez. Doğruluk, anlama, görevi sürdürme ve öğrencinin çalışma deneyimi de göz önünde bulundurulur.",
        ],
      },
      {
        id: "sonuclarin-degerlendirilmesi",
        title: "6. Sonuçların değerlendirilmesi",
        paragraphs: [
          "Eğitmen başlangıç ve sonraki ölçümleri, kitap çalışmalarını ve dijital egzersiz sonuçlarını birlikte inceler. Güçlü görünen alanlar ile tekrar gerektiren görevler öğrenciyle paylaşılabilir.",
          "Fixoku Eğitimi kesin gelişim oranı veya sabit sürede aynı sonuç garantisi vermez. İlerleme öğrencinin başlangıç düzeyine, katılımına ve çalışma düzenine göre değişebilir.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/neden-fixoku",
      "/fixoku-egitimi/yazilim",
      "/fixoku-egitimi/egzersiz-kitaplari",
    ],
    cta: {
      title: "Eğitim sürecini yaş ve seviyeye göre değerlendirin",
      text: "Uygulama biçimi ve çalışma planı hakkında bilgi almak için Fixoku ile iletişime geçebilirsiniz.",
      primary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "yazilim",
    path: "/fixoku-egitimi/yazilim",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Yapay Zekâ Destekli Yazılım",
    icon: "ai",
    eyebrow: "Dijital Eğitim Desteği",
    heading: "Yapay Zekâ Destekli Fixoku Yazılımı",
    seoTitle: "Yapay Zekâ Destekli Fixoku Yazılımı ve Takip | Fixoku",
    metaDescription:
      "Fixoku yazılımının öğrenci egzersizlerine erişim, ölçüm sonuçlarını izleme, istatistikleri görüntüleme ve eğitmen değerlendirmesine destek rolünü inceleyin.",
    readingTime: "7 dakika",
    summary:
      "Fixoku yazılımı öğrencinin dijital egzersizlere erişmesine ve çalışma sonuçlarını takip etmesine; eğitmenin ise süreci daha düzenli değerlendirmesine yardımcı olur.",
    sections: [
      {
        id: "egitimdeki-rolu",
        title: "Fixoku yazılımının eğitim sürecindeki rolü",
        paragraphs: [
          "Yazılım, kitap ve eğitmenle birlikte kullanılan dijital çalışma alanıdır. Öğrencinin egzersizlere erişmesini, belirli görevleri tamamlamasını ve sonuç ekranlarını görmesini destekler.",
          "Dijital araç tek başına eğitim programı değildir. Tekniklerin açıklanması, çalışma planının düzenlenmesi ve sonuçların yorumlanması eğitmen rehberliğiyle birlikte yürütülür.",
        ],
      },
      {
        id: "ogrenci-paneli",
        title: "Öğrenci çalışma alanı",
        paragraphs: [
          "Mevcut öğrenci panelinde günlük egzersizler, serbest çalışma egzersizleri, meydan okuma ve istatistik alanları bulunur. Bu yapı öğrencinin kendisine tanımlanan çalışmalara tek bir arayüzden ulaşmasına yardımcı olur.",
          "İstatistik ve görev alanları öğrencinin tamamladığı çalışmaları görmesini kolaylaştırır; ancak gösterilen veriler başarı garantisi veya öğrencinin bütün öğrenme kapasitesinin ölçümü olarak değerlendirilmemelidir.",
        ],
      },
      {
        id: "olcum-ve-istatistikler",
        title: "Ölçüm sonuçları ve istatistiklerin takibi",
        paragraphs: [
          "Okuma hızı, anlama ve farklı egzersiz kategorilerine ait sonuçlar panelde düzenli bir görünüm altında sunulabilir. Bu sonuçlar öğrencinin hangi çalışmaları tamamladığını ve hangi alanların tekrar ele alınabileceğini görmeye destek olur.",
          "Ölçüm verileri bağlamından koparılmamalıdır. Metnin güçlüğü, öğrencinin yaşı, çalışma koşulları ve anlama sonucu eğitmen değerlendirmesinde birlikte ele alınır.",
        ],
      },
      {
        id: "egitmen-paneli",
        title: "Eğitmen değerlendirmesine destek",
        paragraphs: [
          "Eğitmen panelinde öğrenciler, egzersiz atama ve rapor alanlarına yönelik menüler bulunur. Bu yapı eğitmenin öğrencinin çalışma sürecini daha düzenli izlemesine ve uygun tekrarları planlamasına yardımcı olabilir.",
          "Yazılım eğitmenin pedagojik değerlendirmesinin yerine geçmez. Öğrenciye verilecek geri bildirim, panelde görülen sonuçlarla birlikte ders içindeki gözleme dayanmalıdır.",
        ],
      },
      {
        id: "rol-bazli-paneller",
        title: "Öğrenci, eğitmen ve kurum için ayrı alanlar",
        paragraphs: [
          "Fixoku panel yapısında öğrenci, eğitmen, kurum ve yönetim rolleri için ayrı arayüzler bulunur. Her rol, eğitim sürecindeki sorumluluğuna uygun menü ve takip alanlarını görür.",
          "Bu ayrım öğrencinin çalışma ekranıyla eğitmen veya kurum yönetim ekranlarının birbirinden ayrılmasını ve bilginin daha anlaşılır sunulmasını destekler.",
        ],
      },
      {
        id: "yapay-zeka-ifadesinin-sinirlari",
        title: "“Yapay zekâ destekli” ifadesinin sınırları",
        paragraphs: [
          "Fixoku yazılımı ölçüm ve çalışma sonuçlarının düzenli biçimde takip edilmesine yardımcı olur. Eğitim sürecinde elde edilen veriler, öğrencinin gelişim alanlarının değerlendirilmesinde eğitmene destek sağlar.",
          "Bu ifade otomatik teşhis, nörolojik analiz, tamamen otonom kişiselleştirme veya eğitmenin yerini alan bir karar sistemi anlamına gelmez. Mevcut sistemde doğrulanmayan anlık zorluk değiştirme ve kesin sonuç tahmini gibi özellikler bu sayfada iddia edilmez.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/egitim-sureci",
      "/fixoku-egitimi/neden-fixoku",
      "/dikkat-ve-odaklanma",
    ],
    cta: {
      title: "Fixoku yazılımının eğitimdeki yerini değerlendirin",
      text: "Panel yapısı ve eğitim sürecindeki kullanım hakkında ayrıntılı bilgi alabilirsiniz.",
      primary: { label: "Yazılım Hakkında Bilgi Al", to: "/iletisim" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "hizli-okuma-kitabi",
    path: "/fixoku-egitimi/hizli-okuma-kitabi",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Hızlı Okuma Kitabı",
    icon: "book",
    eyebrow: "Basılı Eğitim Materyali",
    heading: "Fixoku Hızlı Okuma Kitabı",
    seoTitle: "Fixoku Hızlı Okuma Kitabı ve Kullanım Yaklaşımı | Fixoku",
    metaDescription:
      "Fixoku hızlı okuma kitabının okuma alışkanlığı, satır takibi, kelime grupları, kontrollü tempo ve anlama çalışmalarıyla nasıl kullanıldığını inceleyin.",
    readingTime: "6 dakika",
    summary:
      "Fixoku Hızlı Okuma Kitabı, öğrencinin yaşına ve okuma düzeyine uygun metinlerle akıcı okuma, satır takibi, kelime grupları ve anlama kontrolü üzerinde çalışmayı amaçlar.",
    sections: [
      {
        id: "kitabin-amaci",
        title: "Hızlı okuma kitabının amacı",
        paragraphs: [
          "Kitabın amacı yalnızca öğrencinin daha hızlı okuması değildir. Okuma temposunu metnin güçlüğüne göre ayarlamak, anlam bütünlüğünü korumak ve öğrendiği teknikleri basılı metinlerde uygulamak temel hedefler arasındadır.",
          "Düzenli çalışma, öğrencinin okuma davranışını fark etmesine ve farklı metin türlerinde uygun tempoyu seçmesine yardımcı olabilir.",
        ],
      },
      {
        id: "seviyeye-uygun-metinler",
        title: "Yaş ve seviyeye uygun metinler",
        paragraphs: [
          "İlkokul, ortaokul ve lise öğrencilerinin kelime hazinesi, metin deneyimi ve eğitim hedefleri farklıdır. Bu nedenle metin uzunluğu, konu seçimi ve çalışma güçlüğü seviyeye göre düzenlenmelidir.",
          "Başlangıç düzeyinde kısa ve anlaşılır metinler tercih edilirken ileri seviyelerde daha uzun, yoğun ve yorum gerektiren metinlere geçilebilir.",
        ],
      },
      {
        id: "satir-takibi",
        title: "Göz hareketleri ve satır takibi",
        paragraphs: [
          "Satır üzerinde yerini korumak, gereksiz geri dönüşleri fark etmek ve metni düzenli biçimde takip etmek okuma akıcılığının parçalarıdır. Kitaptaki uygulamalar bu davranışların bilinçli biçimde çalışılmasını destekleyebilir.",
          "Bu çalışmalar görme muayenesinin yerine geçmez. Görme veya göz sağlığıyla ilgili bir güçlük şüphesi varsa uygun sağlık uzmanına başvurulmalıdır.",
        ],
      },
      {
        id: "kelime-gruplari",
        title: "Kelime gruplarıyla okuma",
        paragraphs: [
          "Birbiriyle ilişkili kelimeleri küçük anlam grupları hâlinde görmek cümlenin yapısını izlemeyi kolaylaştırabilir. Amaç kelime atlamak değil, sözcükler arasındaki anlam bağını daha akıcı takip etmektir.",
          "Kelime gruplarıyla okuma uygulamaları kısa alıştırmalardan başlayıp öğrencinin anlama düzeyi korundukça daha uzun metinlere taşınabilir.",
        ],
      },
      {
        id: "kontrollu-tempo",
        title: "Akıcı ve kontrollü tempo",
        paragraphs: [
          "Etkili okuma her metni aynı hızda bitirmek anlamına gelmez. Tanıdık ve kolay bölümlerde akıcı ilerlemek, yeni veya yoğun bilgilerde yavaşlamak daha dengeli bir okuma stratejisidir.",
          "Tempo artarken ana düşünce kayboluyor ya da ayrıntılar karışıyorsa öğrenci yavaşlamalı ve anlama kontrolü yapmalıdır.",
        ],
      },
      {
        id: "egitimle-birlikte-kullanim",
        title: "Eğitimle birlikte kullanım",
        paragraphs: [
          "Kitap çalışmaları eğitmenin açıkladığı teknikleri uygulama, ev çalışması yapma ve farklı metinlerde tekrar etme fırsatı sunar. Dijital egzersizler ve paragraf çalışmaları kitabın hedeflerini farklı görev türleriyle destekler.",
          "Kitap tek başına sabit bir gelişim oranı garanti etmez. İlerleme öğrencinin başlangıç düzeyi, çalışma düzeni ve anlama sonuçlarıyla birlikte değerlendirilmelidir.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/egzersiz-kitaplari",
      "/fixoku-egitimi/paragraf-kitaplari",
      "/hizli-okuma",
    ],
    cta: {
      title: "Hızlı okuma kitabını eğitim süreci içinde inceleyin",
      text: "Kitap, yazılım ve eğitmen rehberliğinin birlikte nasıl kullanıldığını öğrenebilirsiniz.",
      primary: { label: "Fixoku Eğitimlerini İncele", to: "/egitimler" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "egzersiz-kitaplari",
    path: "/fixoku-egitimi/egzersiz-kitaplari",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Egzersiz Kitapları",
    icon: "exercise",
    eyebrow: "Dikkat ve Uygulama",
    heading: "Fixoku Egzersiz Kitapları",
    seoTitle: "Fixoku Egzersiz Kitapları: Dikkat ve Okuma | Fixoku",
    metaDescription:
      "Fixoku egzersiz kitaplarının dikkat, odaklanma, görsel algı, kelime, sayı ve okuma çalışmalarını düzenli tekrarlarla nasıl desteklediğini öğrenin.",
    readingTime: "6 dakika",
    summary:
      "Fixoku Egzersiz Kitapları, öğrencinin dikkat, görsel algı, kelime tanıma, satır takibi ve kontrollü okuma çalışmalarını düzenli uygulamalarla desteklemek amacıyla hazırlanır.",
    sections: [
      {
        id: "egzersiz-kitaplarinin-rolu",
        title: "Egzersiz kitaplarının eğitimdeki rolü",
        paragraphs: [
          "Teorik bilgi, uygulama ve tekrar olmadan kalıcı bir çalışma alışkanlığına dönüşmeyebilir. Egzersiz kitapları öğrencinin öğrendiği teknikleri kısa görevlerle tekrar etmesine ve çalışma düzenini korumasına yardımcı olur.",
          "Görevlerin yaşa uygun, anlaşılır ve kademeli olması önemlidir. Amaç öğrenciyi uzun süre masa başında tutmak değil, nitelikli tekrar yapmasını sağlamaktır.",
        ],
      },
      {
        id: "dikkat-ve-odaklanma",
        title: "Dikkat ve odaklanma çalışmaları",
        paragraphs: [
          "Benzer harf veya şekilleri ayırt etme, belirli bir hedefi takip etme ve yönergeyi sonuna kadar uygulama gibi görevler seçici ve sürdürülebilir dikkati eğitimsel açıdan destekleyebilir.",
          "Bu çalışmalar tıbbi değerlendirme veya tedavi değildir. Süreğen ve günlük yaşamı etkileyen güçlüklerde uygun uzman görüşü alınmalıdır.",
        ],
      },
      {
        id: "gorsel-algi",
        title: "Görsel algı ve satır takibi",
        paragraphs: [
          "Şekil eşleştirme, görsel tarama ve satır üzerinde hedef bulma görevleri öğrencinin ayrıntıları daha düzenli izlemesine yardımcı olabilir. Bu beceriler okuma sırasında yerini koruma ve önemli ifadeleri fark etme davranışıyla ilişkilidir.",
          "Görsel çalışma, göz sağlığına ilişkin bir değerlendirme yerine geçmez ve öğrencinin zorlanma düzeyine göre uyarlanmalıdır.",
        ],
      },
      {
        id: "kelime-ve-sayi-egzersizleri",
        title: "Kelime ve sayı egzersizleri",
        paragraphs: [
          "Kelime seçme, anlam ilişkilerini ayırt etme, karışık sözcükler arasından hedefi bulma ve sayı dizilerini takip etme gibi etkinlikler öğrencinin yönerge takibi ile işlem dikkatini destekleyebilir.",
          "Hızdan önce doğruluk gözetilmeli; öğrenci görevi rahatça tamamladıkça süre veya karmaşıklık kademeli biçimde artırılmalıdır.",
        ],
      },
      {
        id: "duzenli-tekrar",
        title: "Düzenli tekrar ve seviye farkları",
        paragraphs: [
          "İlkokul düzeyinde kısa, görsel ve oyunlaştırılmış görevler; ortaokul düzeyinde ise daha uzun metin ve sınav yönergeleriyle ilişkili dikkat çalışmaları tercih edilebilir.",
          "Aynı egzersizi çok sayıda tekrar etmek yerine farklı görev türleri kullanmak öğrencinin öğrendiği beceriyi yeni durumlara aktarmasını destekler.",
        ],
      },
      {
        id: "dijital-calismalarla-birlikte",
        title: "Dijital egzersizleri destekleyen basılı çalışmalar",
        paragraphs: [
          "Basılı egzersizler ekran dışında çalışma yapma, not alma ve görevleri elle tamamlama fırsatı sunar. Dijital alandaki sonuç ve istatistik ekranları ise öğrencinin farklı görevlerdeki çalışmalarını görmesine yardımcı olabilir.",
          "İki ortamın birlikte kullanılması öğrencinin yalnızca ekrana veya yalnızca kitaba bağlı kalmadan çeşitli çalışma biçimleri deneyimlemesini sağlar.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/hizli-okuma-kitabi",
      "/fixoku-egitimi/yazilim",
      "/dikkat-ve-odaklanma",
    ],
    cta: {
      title: "Okuma ve dikkat çalışmalarını birlikte değerlendirin",
      text: "Egzersiz kitaplarının eğitim programındaki kullanımı hakkında bilgi alabilirsiniz.",
      primary: { label: "Okuma ve Dikkat İçeriklerini İncele", to: "/dikkat-ve-odaklanma" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "paragraf-kitaplari",
    path: "/fixoku-egitimi/paragraf-kitaplari",
    collectionPath: FIXOKU_EDUCATION_HUB_PATH,
    collectionLabel,
    navLabel: "Paragraf Kitapları",
    icon: "speed",
    eyebrow: "Metin ve Soru Becerileri",
    heading: "Fixoku Paragraf Kitapları",
    seoTitle: "Paragraf Kitapları ve Soru Çözme Becerileri | Fixoku",
    metaDescription:
      "Fixoku paragraf kitaplarının ana düşünce, yardımcı düşünce, çıkarım, soru kökü, metin yapısı ve sınavlarda bilinçli süre yönetimini nasıl ele aldığını inceleyin.",
    readingTime: "7 dakika",
    summary:
      "Fixoku Paragraf Kitapları, öğrencinin paragraf yapısını, ana ve yardımcı düşünceleri, çıkarımları ve soru köklerini daha bilinçli değerlendirmesine yardımcı olmayı amaçlar.",
    sections: [
      {
        id: "paragraf-yapisi",
        title: "Paragraf yapısını anlamak",
        paragraphs: [
          "Bir paragraf konu, ana düşünce, yardımcı düşünceler ve bunları birbirine bağlayan bir anlatım düzeninden oluşur. Bu yapıyı fark etmek öğrencinin metni cümle cümle değil, anlamlı bir bütün olarak değerlendirmesini kolaylaştırır.",
          "Giriş, gelişme ve sonuç ilişkisini izlemek; cümle sıralama ve paragraf tamamlama sorularında anlam akışını kurmaya yardımcı olabilir.",
        ],
      },
      {
        id: "ana-ve-yardimci-dusunce",
        title: "Ana düşünce ve yardımcı düşünceler",
        paragraphs: [
          "Ana düşünce yazarın metin boyunca savunduğu temel yargıdır. Örnekler, açıklamalar ve ayrıntılar ise bu düşünceyi destekleyen yardımcı unsurlardır.",
          "Kitap çalışmaları öğrencinin ayrıntıya takılıp temel mesajı kaçırmamasını ve seçenekleri metnin bütünüyle karşılaştırmasını destekler.",
        ],
      },
      {
        id: "cikarim-ve-yazar-bakisi",
        title: "Çıkarım ve yazarın bakış açısı",
        paragraphs: [
          "Bazı sorular metinde açıkça yazılan bilgiyi değil, cümleler arasındaki ilişkiden çıkarılabilecek sonucu ister. Öğrencinin çıkarımını kişisel görüşüne değil, metindeki kanıtlara dayandırması gerekir.",
          "Yazarın açıklayıcı, eleştirel veya karşılaştırmalı yaklaşımını fark etmek metnin amacı ve tonu hakkında daha doğru değerlendirme yapılmasına yardımcı olur.",
        ],
      },
      {
        id: "soru-kokunu-anlamak",
        title: "Soru kökünü doğru anlamak",
        paragraphs: [
          "“Değildir”, “çıkarılamaz” ve “ulaşılamaz” gibi olumsuz ifadeler gözden kaçtığında öğrenci metni doğru anlasa bile yanlış seçeneğe yönelebilir. Bu nedenle soru kökünde ne istendiğini belirlemek çözümün ilk adımlarındandır.",
          "Seçenekleri elemeden önce metindeki kanıtı bulmak, cevap verirken tahmine dayalı kararları azaltabilir.",
        ],
      },
      {
        id: "metin-turleri",
        title: "Metin türüne uygun okuma",
        paragraphs: [
          "Açıklayıcı, tartışmacı, betimleyici ve öyküleyici metinler farklı okuma beklentileri taşır. Öğrenci metnin yapısını tanıdığında önemli bilgi, olay sırası veya savunulan görüşü daha bilinçli izleyebilir.",
          "Her metni aynı hızda okumak yerine metnin yoğunluğuna ve sorunun amacına göre tempo değiştirmek daha dengeli bir yaklaşımdır.",
        ],
      },
      {
        id: "sure-yonetimi",
        title: "Sınavlarda süreyi bilinçli kullanmak",
        paragraphs: [
          "Uzun paragraf sorularında amaç yalnızca hızlı hareket etmek değildir. Soru kökünü anlamak, metindeki kanıtı bulmak ve seçenekleri sistemli biçimde elemek süreyi daha verimli kullanmaya yardımcı olabilir.",
          "Paragraf kitabı sınav başarısını garanti etmez. Ders bilgisi, düzenli soru pratiği, okuma deneyimi ve öğrencinin ihtiyacına uygun çalışma planıyla birlikte kullanılmalıdır.",
        ],
      },
    ],
    related: [
      "/fixoku-egitimi/hizli-okuma-kitabi",
      "/fixoku-egitimi/egitim-sureci",
      "/hizli-okuma",
    ],
    cta: {
      title: "Paragraf çalışmalarını okuma eğitimiyle birlikte ele alın",
      text: "Okuma temposu, anlama ve soru çözme yaklaşımını birlikte destekleyen içerikleri inceleyebilirsiniz.",
      primary: { label: "Fixoku Eğitimlerini İncele", to: "/egitimler" },
      secondary: { label: "Fixoku Eğitimi Merkezine Dön", to: FIXOKU_EDUCATION_HUB_PATH },
    },
  },
];

export const fixokuEducationPages = [fixokuEducationHub, ...fixokuEducationArticles];

export const fixokuEducationContentByPath = Object.fromEntries(
  fixokuEducationPages.map((page) => [page.path, page]),
);
