export const ATTENTION_FOCUS_HUB_PATH = "/dikkat-ve-odaklanma";

const collectionLabel = "Dikkat ve Odaklanma";

export const attentionFocusHub = {
  kind: "hub",
  path: ATTENTION_FOCUS_HUB_PATH,
  navLabel: collectionLabel,
  icon: "target",
  eyebrow: "Dikkat ve Odaklanma İçerik Merkezi",
  heading: "Dikkat ve Odaklanma: Öğrenme ve Okuma Becerileri",
  seoTitle: "Dikkat ve Odaklanma Rehberi ve Eğitim Yaklaşımı | Fixoku",
  metaDescription:
    "Dikkat ve odaklanmanın öğrenme, okuma ve sınav süreciyle ilişkisini; eğitim yaklaşımını ve destekleyici çalışma yöntemlerini sade biçimde keşfedin.",
  readingTime: "5 dakika",
  summary:
    "Dikkat, zihnin belirli bir göreve yönelmesini; odaklanma ise bu yönelimin gerekli süre boyunca korunmasını anlatır. Bu beceriler okuma, öğrenme ve soru çözme süreçlerinde birlikte çalışır.",
  sections: [
    {
      id: "dikkat-ve-odaklanma-nedir",
      title: "Dikkat ve odaklanma ne anlama gelir?",
      paragraphs: [
        "Dikkat, çevredeki birçok uyaran arasından o anda önemli olan bilgiye yönelmeyi sağlar. Odaklanma ise dikkati bir metin, ders, soru ya da görev üzerinde sürdürebilmeyi ifade eder. Günlük dilde birlikte kullanılsalar da biri yönelmeyi, diğeri bu yönelimi korumayı vurgular.",
        "Dikkat düzeyi gün içinde uyku, dinlenme, görev güçlüğü, çevresel uyaranlar ve kişinin ilgisi gibi etkenlere göre değişebilir. Bu nedenle tek bir zorlanma anından genel bir sonuç çıkarmak yerine farklı koşullardaki davranışı gözlemlemek daha sağlıklıdır.",
      ],
    },
    {
      id: "ogrenme-ve-okuma",
      title: "Öğrenme ve okumayla ilişkisi",
      paragraphs: [
        "Öğrenci derste, kitapta veya soru kökünde önemli bilgiyi takip edebildiğinde düşünceler arasındaki bağlantıyı kurması kolaylaşabilir. Dikkat sık sık koptuğunda ise aynı satırı yeniden okuma, yönergenin bir bölümünü kaçırma veya metnin ana düşüncesinden uzaklaşma görülebilir.",
        "Bu ilişki, dikkatli olmanın tek başına akademik başarı sağlayacağı anlamına gelmez. Alan bilgisi, okuma deneyimi, çalışma düzeni, duygusal durum ve uygun öğrenme ortamı da sürecin önemli parçalarıdır.",
      ],
    },
    {
      id: "destekleyici-calismalar",
      title: "Destekleyici çalışmalar nasıl ele alınır?",
      paragraphs: [
        "Dikkat ve odaklanma çalışmaları; kısa ve anlaşılır yönergeler, yaşa uygun metinler, görsel takip, kelime algısı, okuduğunu anlama ve görev tamamlama etkinlikleriyle yapılandırılabilir. Amaç öğrenciyi baskı altında tutmak değil, dikkatini nasıl kullandığını fark etmesine yardımcı olmaktır.",
        "Çalışma süresi ve güçlük düzeyi kademeli ilerlemeli; hız kadar doğruluk, anlama ve sürdürülebilir çalışma alışkanlığı da izlenmelidir. Sonuçların öğrencinin başlangıç düzeyine ve çalışma düzenine göre değişebileceği unutulmamalıdır.",
      ],
    },
    {
      id: "egitimsel-sinirlar",
      title: "Eğitim desteği ile uzman değerlendirmesini ayırmak",
      paragraphs: [
        "Dikkatini sürdürmekte zorlanmak tek başına tıbbi bir tanı anlamına gelmez ve bu içerikler tanı ya da tedavi amacı taşımaz. Zorlanma okul yaşamını, günlük işlevleri veya öğrencinin iyi oluşunu belirgin biçimde etkiliyorsa ailelerin okul rehberlik servisi ve uygun bir sağlık uzmanıyla görüşmesi yararlı olabilir.",
        "Eğitim çalışmaları, öğrencinin mevcut becerilerini destekleyen bir araç olarak düşünülmelidir. Sağlık veya gelişim alanındaki profesyonel değerlendirmelerin yerine geçmez.",
      ],
    },
  ],
  cardsHeading: "Dikkat ve odaklanma hakkında doğru içeriği seçin",
  cardsIntro:
    "Temel tanımdan başlayabilir; öğrenme, öğrenci davranışları, hızlı okuma ilişkisi veya Fixoku yaklaşımı hakkında daha ayrıntılı içeriklere geçebilirsiniz.",
  cta: {
    title: "Öğrenme becerilerini dengeli bir planla destekleyin",
    text: "Fixoku eğitim seçeneklerini inceleyebilir veya öğrencinin ihtiyaçlarına uygun çalışma yaklaşımı hakkında bilgi alabilirsiniz.",
    primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
    secondary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
  },
};

export const attentionFocusArticles = [
  {
    kind: "article",
    slug: "egitimi-nedir",
    path: "/dikkat-ve-odaklanma/egitimi-nedir",
    collectionPath: ATTENTION_FOCUS_HUB_PATH,
    collectionLabel,
    navLabel: "Dikkat ve Odaklanma Eğitimi Nedir?",
    icon: "target",
    eyebrow: "Temel Yaklaşım",
    heading: "Dikkat ve Odaklanma Eğitimi Nedir?",
    seoTitle: "Dikkat ve Odaklanma Eğitimi Nedir? | Fixoku Rehberi",
    metaDescription:
      "Dikkat ve odaklanma eğitiminin amacını, içerdiği çalışmaları, okuma ve öğrenmeyle ilişkisini ve eğitimsel sınırlarını açıklayıcı biçimde inceleyin.",
    readingTime: "5 dakika",
    summary:
      "Dikkat ve odaklanma eğitimi, öğrencinin bir göreve yönelmesini ve dikkatini gerektiği süre boyunca korumasını destekleyen planlı eğitim çalışmalarından oluşur.",
    sections: [
      {
        id: "egitimin-amaci",
        title: "Eğitimin amacı nedir?",
        paragraphs: [
          "Bu çalışmaların amacı öğrenciden sürekli ve kusursuz biçimde dikkatli olmasını beklemek değildir. Öğrencinin dikkatinin ne zaman dağıldığını fark etmesi, göreve geri dönebilmesi ve çalışma süresini kademeli olarak yönetebilmesi hedeflenir.",
          "Ders dinleme, kitap okuma, soru çözme ve yönerge takip etme farklı dikkat gereksinimleri taşır. Bu nedenle eğitim, tek bir egzersiz yerine çeşitli görevlerle ve öğrencinin seviyesine uygun sürelerle planlanmalıdır.",
        ],
      },
      {
        id: "desteklenen-beceriler",
        title: "Hangi beceriler desteklenir?",
        paragraphs: [
          "Yaşa ve ihtiyaca göre değişmekle birlikte dikkat ve odaklanma çalışmalarında aşağıdaki eğitimsel beceriler ele alınabilir:",
        ],
        bullets: [
          "Kısa ve açık bir yönergeyi sonuna kadar takip etmek",
          "Okuma sırasında satır ve kelime takibini korumak",
          "Uzun metinlerde ana düşünceden kopmadan ilerlemek",
          "Soru kökündeki olumlu ve olumsuz ifadeleri ayırt etmek",
          "Çalışma süresini küçük ve ulaşılabilir bölümlere ayırmak",
          "Görev sonunda doğruluk ve anlama kontrolü yapmak",
        ],
      },
      {
        id: "calisma-plani",
        title: "Çalışmalar nasıl planlanır?",
        paragraphs: [
          "Başlangıçta kısa süreli ve anlaşılır görevler tercih edilebilir. Öğrenci yönergeyi rahatça takip ettikçe süre, metin uzunluğu veya görev karmaşıklığı kademeli biçimde artırılabilir.",
          "İlerleme yalnızca tamamlanan görev sayısıyla değerlendirilmez. Doğruluk, anlama, göreve geri dönebilme ve öğrencinin çalışma sırasında yaşadığı zorlanma da dikkate alınmalıdır.",
        ],
      },
      {
        id: "okuma-ve-anlama",
        title: "Okuma ve anlama çalışmalarıyla ilişkisi",
        paragraphs: [
          "Okuma sırasında göz takibi, kelime algısı, anlam kurma ve dikkat birlikte çalışır. Bu nedenle dikkat çalışmaları okuma ve anlama etkinliklerinden tamamen ayrı düşünülmek zorunda değildir.",
          "Bununla birlikte daha hızlı okumak otomatik olarak daha iyi odaklanma sağlamaz. Tempo, öğrencinin anlamayı koruyabildiği düzeyde olmalı ve metin sonu sorularıyla düzenli olarak kontrol edilmelidir.",
        ],
      },
      {
        id: "egitim-ve-klinik-degerlendirme",
        title: "Eğitim ile klinik değerlendirme aynı şey değildir",
        paragraphs: [
          "Dikkat ve odaklanma eğitimi tıbbi tanı koymaz ve tedavi sunmaz. Süreğen dikkat güçlüğü farklı gelişimsel, duygusal, çevresel veya sağlıkla ilgili etkenlerle ilişkili olabilir.",
          "Zorlanma birden fazla ortamda görülüyor ve öğrencinin günlük yaşamını belirgin biçimde etkiliyorsa okul rehberlik servisi veya uygun bir sağlık uzmanından değerlendirme alınması düşünülebilir.",
        ],
      },
    ],
    related: [
      "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
      "/dikkat-ve-odaklanma/ogrencilerde-dikkat-zayifligi",
      "/dikkat-ve-odaklanma/fixoku-nasil-destekler",
    ],
    cta: {
      title: "Çalışma yaklaşımını öğrencinin ihtiyacına göre değerlendirin",
      text: "Yaş, seviye ve çalışma alışkanlığı hakkında bilgi paylaşarak eğitim seçeneklerini inceleyebilirsiniz.",
      primary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
      secondary: { label: "Dikkat ve Odaklanma Merkezine Dön", to: ATTENTION_FOCUS_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "ogrenmeye-etkisi",
    path: "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
    collectionPath: ATTENTION_FOCUS_HUB_PATH,
    collectionLabel,
    navLabel: "Dikkat ve Odaklanmanın Öğrenmeye Etkisi",
    icon: "book",
    eyebrow: "Öğrenme Süreci",
    heading: "Dikkat ve Odaklanmanın Öğrenmeye Etkisi",
    seoTitle: "Dikkat ve Odaklanmanın Öğrenmeye Etkisi | Fixoku",
    metaDescription:
      "Dikkat ve odaklanmanın bilgi takibi, okuduğunu anlama, çalışma verimi ve sınav süreciyle ilişkisini öğrenci odaklı ve dengeli bir yaklaşımla öğrenin.",
    readingTime: "6 dakika",
    summary:
      "Öğrenme yalnızca bilgiyle karşılaşmak değil, bilgiyi seçmek, işlemek ve önceki bilgilerle ilişkilendirmektir. Dikkat ve odaklanma bu sürecin düzenlenmesine yardımcı olur.",
    sections: [
      {
        id: "bilgiyi-takip-etmek",
        title: "Bilgiyi takip etmek öğrenmenin ilk adımlarındandır",
        paragraphs: [
          "Öğrenci dikkatini anlatılan konuya veya okuduğu metne yöneltebildiğinde önemli noktaları fark etmesi ve düşünce akışını izlemesi kolaylaşabilir. Dikkat sık sık başka uyaranlara kaydığında ise bilginin bazı bölümleri kaçırılabilir.",
          "Bu durum öğrencinin isteksiz veya yetersiz olduğu anlamına gelmez. Görevin güçlüğü, ortam, uyku, kaygı, ilgi düzeyi ve çalışma süresi gibi birçok etken aynı anda rol oynayabilir.",
        ],
      },
      {
        id: "okudugunu-anlama",
        title: "Okuduğunu anlama ve anlam bütünlüğü",
        paragraphs: [
          "Bir paragrafın ana düşüncesini anlamak için cümleler arasındaki bağlantının metin boyunca korunması gerekir. Satır atlama, sık geri dönüş veya metnin başındaki bilgiyi unutma bu bağlantıyı kurmayı zorlaştırabilir.",
          "Okuma amacı belirlemek, bölüm sonunda kısa bir özet yapmak ve metne dayalı soruları yanıtlamak öğrencinin dikkatini ve anlama düzeyini birlikte gözlemlemesine yardımcı olabilir.",
        ],
      },
      {
        id: "calisma-verimi",
        title: "Çalışma süresi kadar çalışma niteliği de önemlidir",
        paragraphs: [
          "Uzun süre masa başında kalmak her zaman etkili öğrenme anlamına gelmez. Ulaşılabilir çalışma aralıkları, açık hedefler ve kısa molalar öğrencinin göreve yeniden dönmesini kolaylaştırabilir.",
          "Öğrencinin yalnızca ne kadar süre çalıştığına değil, hangi görevi tamamladığına, ne anladığına ve nerede zorlandığına bakmak daha açıklayıcı bir değerlendirme sunar.",
        ],
      },
      {
        id: "sinav-sureci",
        title: "Sınavlarda dikkat ve zaman yönetimi",
        paragraphs: [
          "Soru köklerindeki “değildir”, “çıkarılamaz” veya “ulaşılamaz” gibi ifadeler dikkatle okunmadığında bilgi doğru olsa bile yanıt hatalı olabilir. Uzun metinlerde ana düşünceyi ve kanıtları ayırt etmek de zaman yönetimini etkiler.",
          "Dikkat çalışmaları sınav başarısını garanti etmez. Ders bilgisi, soru pratiği, uyku, duygusal hazırlık ve sınav stratejileriyle birlikte ele alındığında destekleyici olabilir.",
        ],
      },
      {
        id: "dijital-uyaranlar",
        title: "Dijital uyaranları dengeli yönetmek",
        paragraphs: [
          "Bildirimler, sık uygulama geçişleri ve arka plandaki sesler bazı öğrencilerin görevden kopmasını kolaylaştırabilir. Çalışma sırasında gereksiz bildirimleri kapatmak ve tek bir göreve ayrılmış kısa zaman aralıkları belirlemek yararlı olabilir.",
          "Teknoloji kullanımını tek neden olarak göstermek doğru değildir. Önemli olan öğrencinin ihtiyaçlarını, ortamını ve günlük düzenini birlikte değerlendirmektir.",
        ],
      },
      {
        id: "destekleyici-aliskanliklar",
        title: "Öğrenmeyi destekleyen küçük alışkanlıklar",
        paragraphs: [
          "Düzenli uyku, uygun çalışma ortamı, görevi küçük adımlara bölme ve çalışma sonunda kısa bir kontrol yapma dikkat yönetimini kolaylaştırabilir.",
        ],
        bullets: [
          "Çalışmaya başlamadan önce tek ve açık bir hedef belirlemek",
          "Telefon ve bildirimleri çalışma alanından uzaklaştırmak",
          "Metin sonunda ana düşünceyi kendi cümleleriyle açıklamak",
          "Zor görevleri kısa aralıklara bölmek",
          "İlerlemeyi baskı oluşturmadan düzenli biçimde izlemek",
        ],
      },
    ],
    related: [
      "/dikkat-ve-odaklanma/egitimi-nedir",
      "/dikkat-ve-odaklanma/ogrencilerde-dikkat-zayifligi",
      "/dikkat-ve-odaklanma/hizli-okumanin-etkisi",
    ],
    cta: {
      title: "Öğrenme sürecini ölçülebilir ve sakin adımlarla ele alın",
      text: "Dikkat, okuma ve anlama becerilerini birlikte değerlendiren eğitim seçenekleri hakkında bilgi alabilirsiniz.",
      primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
      secondary: { label: "Dikkat ve Odaklanma Merkezine Dön", to: ATTENTION_FOCUS_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "ogrencilerde-dikkat-zayifligi",
    path: "/dikkat-ve-odaklanma/ogrencilerde-dikkat-zayifligi",
    collectionPath: ATTENTION_FOCUS_HUB_PATH,
    collectionLabel,
    navLabel: "Öğrencilerde Dikkat Zayıflığı Nelere Yol Açar?",
    icon: "student",
    eyebrow: "Gözlem ve Destek",
    heading: "Öğrencilerde Dikkat Zayıflığı Nelere Yol Açabilir?",
    seoTitle: "Öğrencilerde Dikkat Zayıflığı Nelere Yol Açabilir? | Fixoku",
    metaDescription:
      "Öğrencilerde dikkati sürdürme güçlüğünün ders, okuma, soru çözme ve motivasyonla ilişkisini; tanı koymadan, destekleyici önerilerle inceleyin.",
    readingTime: "6 dakika",
    summary:
      "“Dikkat zayıflığı” günlük dilde kullanılan geniş bir ifadedir; tek başına tanı değildir. Öğrencinin farklı ortamlardaki davranışı ve zorlanmanın sürekliliği birlikte değerlendirilmelidir.",
    sections: [
      {
        id: "gozlenebilen-durumlar",
        title: "Hangi durumlar gözlenebilir?",
        paragraphs: [
          "Öğrenci ders sırasında kısa sürede başka uyaranlara yönelebilir, ödev yaparken sık ara vermek isteyebilir veya okuduğu metne yeniden dönmek zorunda kalabilir. Bu davranışlar her öğrencide zaman zaman görülebilir.",
          "Sıklık, süre, ortam ve görevin güçlüğü önemlidir. Tek bir davranıştan öğrencinin isteği, kapasitesi veya sağlık durumu hakkında kesin sonuç çıkarılmamalıdır.",
        ],
        bullets: [
          "Yönergenin bir bölümünü kaçırmak",
          "Aynı cümleyi tekrar tekrar okumak",
          "Soru kökündeki önemli ifadeleri gözden kaçırmak",
          "Uzun görevlerde düşünce akışından kopmak",
          "Çalışmaya başlamakta veya göreve geri dönmekte zorlanmak",
        ],
      },
      {
        id: "okuma-ve-soru-cozme",
        title: "Okuma ve soru çözme sürecine etkisi",
        paragraphs: [
          "Dikkat metinden koptuğunda öğrenci satır atlayabilir, paragrafın başındaki bilgiyle sonundaki bilgiyi ilişkilendirmekte zorlanabilir veya soruyu eksik okuyabilir. Bu durum özellikle uzun ve çok aşamalı sorularda daha görünür hâle gelebilir.",
          "Soruyu yeniden okumak bazen doğru bir stratejidir. Sorun, öğrencinin sürekli başa dönmesi ve buna rağmen anlam bütünlüğünü kuramamasıdır. Böyle durumlarda metin uzunluğu ve çalışma biçimi yeniden düzenlenebilir.",
        ],
      },
      {
        id: "motivasyon-ve-ozguven",
        title: "Motivasyon ve özgüven nasıl etkilenebilir?",
        paragraphs: [
          "Öğrenci emek verdiği hâlde sık hata yaptığında “Çalışıyorum ama olmuyor” düşüncesine kapılabilir. Bu düşünce zamanla görevlerden kaçınmaya veya denemeden vazgeçmeye yol açabilir.",
          "Öğrenciyi “dikkatsiz” ya da “tembel” olarak etiketlemek yerine zorlandığı görevi tanımlamak, küçük ilerlemeleri görünür kılmak ve uygulanabilir hedefler belirlemek daha destekleyicidir.",
        ],
      },
      {
        id: "olasi-etkenler",
        title: "Dikkati etkileyebilecek koşullar",
        paragraphs: [
          "Uyku düzeni, açlık, görme veya işitme sorunları, stres, kaygı, görev güçlüğü, öğrenme ortamı ve yoğun uyaranlar dikkat davranışını etkileyebilir. Bu nedenle zorlanmayı tek bir nedene bağlamak uygun değildir.",
          "Öğrencinin farklı derslerde, evde ve okulda nasıl davrandığını gözlemlemek; öğretmen ve aile görüşlerini birlikte değerlendirmek daha dengeli bir tablo sunar.",
        ],
      },
      {
        id: "ne-zaman-destek-alinmali",
        title: "Ne zaman uzman değerlendirmesi düşünülmeli?",
        paragraphs: [
          "Zorlanma uzun süredir devam ediyor, birden fazla ortamda görülüyor veya öğrencinin öğrenmesini, ilişkilerini ya da günlük yaşamını belirgin biçimde etkiliyorsa profesyonel değerlendirme yararlı olabilir.",
          "Bu sayfa tıbbi tanı veya tedavi bilgisi sunmaz. Aileler okul rehberlik servisi, psikolojik danışman veya uygun bir sağlık uzmanıyla görüşerek öğrencinin ihtiyaçlarını daha kapsamlı değerlendirebilir.",
        ],
      },
    ],
    related: [
      "/dikkat-ve-odaklanma/egitimi-nedir",
      "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
      "/dikkat-ve-odaklanma/fixoku-nasil-destekler",
    ],
    cta: {
      title: "Öğrenciyi etiketlemeden ihtiyaçlarını anlamaya başlayın",
      text: "Eğitim seçeneklerini inceleyebilir; süreğen veya belirgin güçlüklerde uygun uzman desteğini değerlendirebilirsiniz.",
      primary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
      secondary: { label: "Dikkat ve Odaklanma Merkezine Dön", to: ATTENTION_FOCUS_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "hizli-okumanin-etkisi",
    path: "/dikkat-ve-odaklanma/hizli-okumanin-etkisi",
    collectionPath: ATTENTION_FOCUS_HUB_PATH,
    collectionLabel,
    navLabel: "Hızlı Okumanın Dikkat ve Odaklanmaya Etkisi",
    icon: "speed",
    eyebrow: "Okuma ve Dikkat",
    heading: "Hızlı Okumanın Dikkat ve Odaklanmaya Etkisi",
    seoTitle: "Hızlı Okumanın Dikkat ve Odaklanmaya Etkisi | Fixoku",
    metaDescription:
      "Hızlı okuma ile dikkat ve odaklanma arasındaki ilişkiyi; kontrollü tempo, kelime grupları, anlama kontrolü ve sınav metinleri üzerinden keşfedin.",
    readingTime: "5 dakika",
    summary:
      "Hızlı okuma ve dikkat arasında otomatik bir neden-sonuç ilişkisi yoktur. Uygun tempo, metin takibi ve anlama kontrolü birlikte çalıştığında okuma süreci daha akıcı hâle gelebilir.",
    sections: [
      {
        id: "okuma-sirasinda-dikkat",
        title: "Okuma sırasında dikkat nasıl kullanılır?",
        paragraphs: [
          "Okurken göz takibi, kelime tanıma, cümleler arasındaki ilişkiyi kurma ve ana düşünceyi izleme aynı süreç içinde yürür. Dikkat metinden koptuğunda bazı kelimeler veya önemli ayrıntılar gözden kaçabilir.",
          "Çok yavaş ve sık kesintiye uğrayan bir tempo bazı okuyucularda düşünce akışının dağılmasına yol açabilir. Ancak yalnızca hızı artırmak bu sorunu çözmez; metnin güçlüğü ve okuyucunun anlama düzeyi belirleyicidir.",
        ],
      },
      {
        id: "kontrollu-tempo",
        title: "Hızlı değil, kontrollü ve esnek tempo",
        paragraphs: [
          "Etkili okuma her metni aynı hızda bitirmek değildir. Kolay ve tanıdık bölümlerde akıcı ilerlemek, yoğun veya yeni bilgilerde yavaşlamak dikkat ve anlama dengesini korumaya yardımcı olabilir.",
          "Tempo yükselirken ana düşünce kayboluyor, ayrıntılar karışıyor veya soru kökü yanlış anlaşılıyorsa okuyucu yavaşlamalı ve metni yeniden yapılandırmalıdır.",
        ],
      },
      {
        id: "kelime-gruplari-ve-akicilik",
        title: "Kelime grupları ve okuma akıcılığı",
        paragraphs: [
          "Birbiriyle ilişkili kelimeleri küçük anlam grupları hâlinde görmek, cümlenin yapısını takip etmeyi kolaylaştırabilir. Bu yaklaşım kelimeleri atlamak veya bütün satırı tek bakışta gördüğünü iddia etmek anlamına gelmez.",
          "Kısa ve seviyeye uygun alıştırmalar, öğrencinin satır takibini ve düşünce akışını daha bilinçli kullanmasına yardımcı olabilir.",
        ],
      },
      {
        id: "anlama-kontrolu",
        title: "Anlama kontrolü neden gereklidir?",
        paragraphs: [
          "Okuma sonrasında ana fikri açıklamak, önemli ayrıntıları hatırlamak ve metne dayalı soruları yanıtlamak seçilen temponun uygun olup olmadığını gösterir.",
          "Dakikadaki kelime sayısındaki artış tek başına başarı ölçütü değildir. Hız, anlama sonucu ve öğrencinin metinle kurduğu bağ birlikte değerlendirilmelidir.",
        ],
      },
      {
        id: "sinav-metinleri",
        title: "Uzun sınav metinlerinde nasıl kullanılabilir?",
        paragraphs: [
          "Uzun soru köklerinde önce ne arandığını belirlemek, olumsuz ifadeleri işaretlemek ve metindeki kanıtları ayırt etmek süre yönetimine yardımcı olabilir.",
          "Hızlı okuma çalışmaları sınav sonucunu veya dikkat gelişimini garanti etmez. Düzenli soru pratiği, alan bilgisi ve öğrencinin ihtiyacına uygun çalışma planıyla birlikte düşünülmelidir.",
        ],
      },
    ],
    related: [
      "/hizli-okuma",
      "/hizli-okuma/hizli-okursam-anlar-miyim",
      "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
    ],
    cta: {
      title: "Hız kadar anlama ve dikkati de izleyin",
      text: "Okuma ve dikkat becerilerini birlikte ele alan eğitim seçeneklerini inceleyebilirsiniz.",
      primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
      secondary: { label: "Dikkat ve Odaklanma Merkezine Dön", to: ATTENTION_FOCUS_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "fixoku-nasil-destekler",
    path: "/dikkat-ve-odaklanma/fixoku-nasil-destekler",
    collectionPath: ATTENTION_FOCUS_HUB_PATH,
    collectionLabel,
    navLabel: "Fixoku Dikkat ve Odaklanmayı Nasıl Destekler?",
    icon: "ai",
    eyebrow: "Fixoku Yaklaşımı",
    heading: "Fixoku Dikkat ve Odaklanmayı Nasıl Destekler?",
    seoTitle: "Fixoku Dikkat ve Odaklanmayı Nasıl Destekler?",
    metaDescription:
      "Fixoku'nun dikkat ve odaklanmayı hızlı okuma, görsel takip, kelime algısı, anlama çalışmaları, ölçüm ve geri bildirimle nasıl ele aldığını inceleyin.",
    readingTime: "7 dakika",
    summary:
      "Fixoku yaklaşımı dikkat ve odaklanmayı tek başına bir beceri olarak değil; okuma, anlama, kelime algısı, görev takibi ve düzenli çalışma alışkanlığıyla birlikte ele alır.",
    sections: [
      {
        id: "butuncul-yaklasim",
        title: "Bütüncül bir eğitim yaklaşımı",
        paragraphs: [
          "Okuma sırasında dikkat, göz takibi, kelime tanıma ve anlam kurma birlikte çalışır. Fixoku eğitim yaklaşımında bu alanlar birbirinden kopuk etkinlikler yerine aynı öğrenme hedefini destekleyen çalışmalar olarak değerlendirilir.",
          "Amaç öğrenciye yalnızca “daha dikkatli ol” demek değil; açık yönergeler, kademeli görevler ve düzenli geri bildirimle dikkatini nasıl kullandığını fark ettirmektir.",
        ],
      },
      {
        id: "olcme-ve-geri-bildirim",
        title: "Ölçüm ve geri bildirim nasıl kullanılır?",
        paragraphs: [
          "Süre, doğruluk ve anlama sonuçları öğrencinin farklı çalışmalardaki performansını görünür kılmaya yardımcı olabilir. Bu veriler tek başına tanı koymaz veya öğrencinin kapasitesini belirlemez.",
          "Ölçümlerin amacı öğrencileri birbirleriyle yarıştırmak değil, başlangıç düzeyini görmek ve hangi görevlerin yeniden çalışılması gerektiğine ilişkin geri bildirim sağlamaktır.",
        ],
      },
      {
        id: "gorsel-takip",
        title: "Görsel takip ve okuma dikkati",
        paragraphs: [
          "Satır takibi, kelime atlama veya sık geri dönüş gibi okuma davranışları görsel dikkat çalışmalarıyla ele alınabilir. Yaşa uygun egzersizler, öğrencinin göz hareketlerini daha düzenli kullanmasını ve metne bağlı kalmasını desteklemeyi hedefler.",
          "Bu çalışmalar görme muayenesinin veya sağlık değerlendirmesinin yerine geçmez. Görmeyle ilgili bir güçlük şüphesi varsa uygun uzmana başvurulmalıdır.",
        ],
      },
      {
        id: "kelime-algisi",
        title: "Kelime algısı ve anlam ilişkileri",
        paragraphs: [
          "Kelimeleri doğru tanımak ve cümle içindeki ilişkilerini görmek okuma akıcılığına katkı sağlar. Kelime grupları, anlam ilişkileri ve bağlam çalışmaları öğrencinin metni parça parça değil, düşünce akışı içinde izlemesini destekleyebilir.",
          "Kelime hazinesi, okuma deneyimi ve metnin güçlük düzeyi kişiden kişiye değişir. Bu nedenle alıştırmalar öğrencinin seviyesine göre seçilmelidir.",
        ],
      },
      {
        id: "anlama-ve-paragraf",
        title: "Okuduğunu anlama ve paragraf çalışmaları",
        paragraphs: [
          "Paragraf çalışmalarında yalnızca hızlı okumaya değil; ana düşünceyi bulma, yardımcı düşünceleri ayırt etme, soru kökünü anlama ve seçenekleri metne göre değerlendirme becerilerine odaklanılır.",
          "Hız artarken anlama düşüyorsa çalışma temposu yeniden ayarlanır. Böylece öğrencinin sonuçları tek bir hız değeri yerine daha dengeli biçimde izlenebilir.",
        ],
      },
      {
        id: "duzenli-calisma",
        title: "Düzenli çalışma ve eğitmen yönlendirmesi",
        paragraphs: [
          "Kısa ve düzenli çalışmalar, öğrencinin göreve başlama ve görevi sürdürme alışkanlığı geliştirmesine yardımcı olabilir. Eğitmen geri bildirimi ise çalışma güçlüğünü ve süreyi öğrencinin ihtiyacına göre ayarlamayı destekler.",
          "Fixoku yaklaşımı kesin sonuç, sabit gelişim oranı veya tıbbi tedavi vaat etmez. İlerleme öğrencinin başlangıç düzeyine, katılımına, çalışma düzenine ve diğer bireysel koşullara göre değişebilir.",
        ],
      },
    ],
    related: [
      "/dikkat-ve-odaklanma/egitimi-nedir",
      "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
      "/dikkat-ve-odaklanma/hizli-okumanin-etkisi",
    ],
    cta: {
      title: "Fixoku eğitim yaklaşımı hakkında bilgi alın",
      text: "Öğrencinin yaşına, seviyesine ve çalışma hedeflerine uygun seçenekleri değerlendirebilirsiniz.",
      primary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
      secondary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
    },
  },
];

export const attentionFocusPages = [attentionFocusHub, ...attentionFocusArticles];

export const attentionFocusContentByPath = Object.fromEntries(
  attentionFocusPages.map((page) => [page.path, page]),
);
