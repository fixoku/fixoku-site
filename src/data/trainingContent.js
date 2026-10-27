export const TRAINING_HUB_PATH = "/egitimler";

const collectionLabel = "Eğitimlerimiz";

export const trainingHub = {
  kind: "hub",
  slug: "egitimler",
  path: TRAINING_HUB_PATH,
  navLabel: collectionLabel,
  icon: "book",
  eyebrow: "Fixoku Eğitim Programları",
  heading: "Eğitimlerimiz: Yaşa ve Okuma Hedefine Uygun Programlar",
  seoTitle: "Fixoku Eğitimleri: Okuma Programlarını İnceleyin | Fixoku",
  metaDescription:
    "İlkokuldan yetişkinlere uzanan Fixoku akıcı okuma, hızlı okuma, paragraf ve sınav odaklı eğitimlerini hedef kitle ve çalışma amacıyla inceleyin.",
  readingTime: "5 dakika",
  summary:
    "Fixoku eğitimleri; okurun yaşı, mevcut okuma deneyimi, kullandığı metinler ve çalışma amacı dikkate alınarak farklı program başlıkları altında ele alınır.",
  sections: [
    {
      id: "dogru-egitimi-secme",
      title: "Doğru eğitim nasıl seçilir?",
      paragraphs: [
        "Eğitim seçerken yalnızca daha hızlı okuma isteğine değil, okurun yaşına, metin düzeyine ve hangi beceride desteğe ihtiyaç duyduğuna bakmak gerekir. İlkokulda akıcılık ve okuma güveni öne çıkarken ortaokul ve lise düzeyinde paragraf yapısı, uzun metinler ve süre yönetimi daha belirgin olabilir.",
        "Yetişkin okurlar ise iş, eğitim veya kişisel okuma hedeflerine göre amaç odaklı ve seçici okuma üzerinde çalışabilir. Bu nedenle bütün programlar herkese aynı biçimde önerilmez; uygun başlangıç noktası hedef kitle ve ihtiyaç birlikte değerlendirilerek belirlenir.",
      ],
    },
    {
      id: "programlarin-farki",
      title: "Eğitim programları arasındaki farklar",
      paragraphs: [
        "İlkokul Akıcı Okuma eğitimi doğru, anlaşılır ve uygun tempolu okumayı; İlkokul Hızlı Okuma eğitimi ise yaşa uygun tempo ile anlama dengesini merkeze alır. Ortaokul ve lise programları ders metinleri, paragraf yapısı ve düzeye göre değişen okuma gereksinimleriyle ilerler.",
        "Paragraf Teknikleri metni çözümleme ve seçenekleri değerlendirme davranışına, Sınav Odaklı Hızlı Okuma süreli sınavlarda okuma stratejisine, Yetişkin Hızlı Okuma ise rapor, e-posta, kitap ve akademik metinlerde amaç odaklı okumaya yönelir.",
      ],
    },
    {
      id: "ortak-egitim-yaklasimi",
      title: "Programların ortak çalışma yaklaşımı",
      paragraphs: [
        "Programların kapsamı farklı olsa da hızın anlama ve doğruluktan ayrı değerlendirilmemesi ortak ilkedir. Metin türüne göre tempo ayarlama, önemli bilgiyi fark etme, gerektiğinde yavaşlama ve okuma sonrasında anlama kontrolü yapma sürecin temel parçalarıdır.",
        "Çalışmalar okurun başlangıç düzeyine göre planlanır ve düzenli uygulamalarla kademeli biçimde ilerletilir. Sonuçlar yaşa, okuma deneyimine, çalışma düzenine ve metin güçlüğüne göre değişebilir.",
      ],
    },
    {
      id: "egitim-ve-olcum",
      title: "Eğitim ile ölçüm arasındaki fark",
      paragraphs: [
        "Okuma ölçümü, belirli bir metin ve zaman aralığındaki tempo ile anlama sonucuna ilişkin başlangıç bilgisi sunabilir. Eğitim ise bu tek ölçümden daha geniştir; farklı metinlerde düzenli çalışma, tekniklerin uygulanması ve gelişimin zaman içinde izlenmesini içerir.",
        "Bir ölçüm sonucu okurun bütün becerilerini tek başına açıklamaz. Program seçimi yapılırken okuma davranışı, hedefler ve çalışma koşulları birlikte ele alınmalıdır.",
      ],
    },
  ],
  cardsHeading: "Fixoku eğitim programlarını hedefinize göre inceleyin",
  cardsIntro:
    "Yedi eğitim başlığı yaş grubu, metin düzeyi ve çalışma amacı bakımından birbirinden ayrılır. Size uygun başlangıç noktasını seçmek için program ayrıntılarını karşılaştırabilirsiniz.",
  cta: {
    title: "Uygun programı birlikte değerlendirin",
    text: "Okurun yaşı, mevcut okuma alışkanlığı ve çalışma hedefi hakkında bilgi paylaşarak eğitim seçenekleri konusunda destek alabilirsiniz.",
    primary: { label: "Fixoku ile İletişime Geçin", to: "/iletisim" },
    secondary: { label: "Hızlı Okuma Rehberini İnceleyin", to: "/hizli-okuma" },
  },
};

export const trainingArticles = [
  {
    kind: "article",
    slug: "ilkokul-akici-okuma",
    path: "/egitimler/ilkokul-akici-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "İlkokul Akıcı Okuma",
    navLabel: "İlkokul Akıcı Okuma",
    icon: "book",
    eyebrow: "İlkokul Öğrencileri",
    heading: "İlkokul Akıcı Okuma Eğitimi",
    seoTitle: "İlkokul Akıcı Okuma Eğitimi ve Çalışma Yaklaşımı | Fixoku",
    metaDescription:
      "İlkokul akıcı okuma eğitiminde kelime tanıma, satır takibi, duraklama, vurgu, uygun tempo ve anlamayı koruyan kısa çalışmaların yaklaşımını inceleyin.",
    readingTime: "6 dakika",
    audience: "İlkokul düzeyinde doğru, anlaşılır ve anlamı koruyan okuma üzerinde çalışmak isteyen öğrenciler",
    cardLabel: "Programı incele →",
    footerFeatured: true,
    summary:
      "Akıcı okuma; kelimeleri doğru tanıyarak, noktalama işaretlerine uygun duraklayarak ve metnin anlamını koruyan bir tempoda ilerleyebilmektir.",
    sections: [
      {
        id: "akici-okuma-nedir",
        title: "Akıcı okuma nedir?",
        paragraphs: [
          "Akıcı okuma yalnızca kelimeleri hızlı söylemek değildir. Öğrencinin kelimeleri doğru tanıması, satırı düzenli takip etmesi, noktalama işaretlerinde uygun biçimde durması ve cümlenin anlamına göre vurgu kullanması beklenir.",
          "Okuma çok yavaş ve parçalı olduğunda anlam kurmak zorlaşabilir; gereğinden hızlı olduğunda ise kelime atlama veya cümlenin anlamını kaçırma görülebilir. Amaç, doğruluk ile anlamı koruyan doğal bir tempo oluşturmaktır.",
        ],
      },
      {
        id: "desteklenen-beceriler",
        title: "Eğitim hangi becerileri destekler?",
        paragraphs: [
          "Çalışmalar öğrencinin sesli ve sessiz okuma sırasında daha düzenli ilerlemesini desteklemeyi amaçlar. Kelime tanıma ile cümle bütünlüğünü fark etme birlikte ele alınır.",
        ],
        bullets: [
          "Hecelemeden kelime bütününe geçişi destekleyen çalışmalar",
          "Satır ve kelime sırasını koruma",
          "Noktalama işaretlerinde uygun duraklama",
          "Cümlenin anlamına uygun vurgu ve tonlama",
          "Kısa metinlerde ana düşünce ve ayrıntıları fark etme",
          "Okuma sırasında güvenli ve sürdürülebilir bir tempo oluşturma",
        ],
      },
      {
        id: "calismalarin-planlanmasi",
        title: "Çalışmalar nasıl planlanır?",
        paragraphs: [
          "Başlangıçta öğrencinin yaşına ve okuma düzeyine uygun kısa metinler tercih edilir. Metin uzunluğu ve güçlüğü, öğrenci doğruluğu ve anlamayı koruyabildikçe kademeli olarak artırılabilir.",
          "Kısa ve düzenli uygulamalar, öğrencinin aynı beceriyi farklı kelime ve metinlerde tekrar etmesine yardımcı olur. Baskılı bir hız hedefi yerine doğru okuma, uygun tempo ve anlama sonucu birlikte izlenir.",
        ],
      },
      {
        id: "okuma-ve-anlama",
        title: "Okuma ve anlama birlikte nasıl ele alınır?",
        paragraphs: [
          "Metni seslendirebilmek, metni anlamakla aynı şey değildir. Bu nedenle çalışmaların ardından kısa sorular, anlatma etkinlikleri veya ana düşünceyi belirleme görevleriyle anlama kontrolü yapılabilir.",
          "Öğrenci kelimeleri daha rahat tanıdıkça dikkatini cümleler arasındaki ilişkiye ayırabilir. Yine de tempo yükselirken anlam düşüyorsa metin güçlüğü veya çalışma hızı yeniden ayarlanmalıdır.",
        ],
      },
      {
        id: "kimler-icin",
        title: "İlkokul Akıcı Okuma Eğitimi kimler için uygundur?",
        paragraphs: [
          "Eğitim, ilkokul düzeyinde heceleyerek okuma, sık duraksama, satır takibinde zorlanma veya vurgu ve noktalama kullanımını geliştirme ihtiyacı bulunan öğrenciler için değerlendirilebilir.",
          "Her öğrencinin okuma gelişimi aynı hızda ilerlemez. Çalışma içeriği öğrencinin mevcut düzeyine, okulda kullandığı metinlere ve okuma sırasında yaşadığı güçlüğe göre seçilmelidir.",
        ],
      },
      {
        id: "egitsel-sinir",
        title: "Eğitsel çalışma ile uzman desteğinin sınırı",
        paragraphs: [
          "Akıcı okuma eğitimi eğitsel bir çalışmadır; klinik değerlendirme veya özel eğitim desteğinin yerine geçmez. Süreğen ve belirgin okuma güçlüklerinde ailelerin okul rehberlik servisi ve uygun uzmanlarla görüşmesi yararlı olabilir.",
          "Eğitim planı, mevcut profesyonel desteklerle çelişmeyecek biçimde ve öğrencinin iyi oluşu gözetilerek yürütülmelidir.",
        ],
      },
    ],
    related: [
      "/egitimler/ilkokul-hizli-okuma",
      "/hizli-okuma",
      "/fixoku-egitimi/hizli-okuma-kitabi",
    ],
    cta: {
      title: "İlkokul öğrencisi için uygun başlangıç düzeyini değerlendirin",
      text: "Okuma davranışı ve çalışma hedefi hakkında bilgi paylaşarak akıcı okuma programının kapsamını inceleyebilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "ilkokul-hizli-okuma",
    path: "/egitimler/ilkokul-hizli-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "İlkokul Hızlı Okuma",
    navLabel: "İlkokul Hızlı Okuma",
    icon: "speed",
    eyebrow: "3. ve 4. Sınıf Öğrencileri",
    heading: "İlkokul Hızlı Okuma Eğitimi",
    seoTitle: "İlkokul Hızlı Okuma Eğitimi: Hız ve Anlama | Fixoku",
    metaDescription:
      "İlkokul hızlı okuma eğitiminde yaşa uygun tempo, kelime grupları, satır takibi, kısa metinler ve anlama kontrolünün nasıl dengelendiğini keşfedin.",
    readingTime: "6 dakika",
    audience: "Özellikle 3. ve 4. sınıfta, doğru okumayı koruyarak daha akıcı bir tempo geliştirmek isteyen öğrenciler",
    cardLabel: "Programı incele →",
    summary:
      "İlkokulda hızlı okuma, yetişkinlere yönelik hız hedeflerini uygulamak değil; öğrencinin yaşına uygun metinlerde doğruluğu ve anlamayı koruyarak daha akıcı ilerlemesini desteklemektir.",
    sections: [
      {
        id: "ilkokulda-hizli-okuma",
        title: "İlkokulda hızlı okuma ne anlama gelir?",
        paragraphs: [
          "İlkokul öğrencisi için hızlı okuma, kelimeleri mümkün olan en yüksek tempoda görmek anlamına gelmez. Öğrencinin heceleme ve gereksiz geri dönüşleri azaltırken cümlenin anlamını izleyebilmesi önemlidir.",
          "Çalışmalar yaşa uygun kısa metinler, tanıdık kelimeler ve açık yönergelerle başlar. Amaç öğrenciyi zorlamak değil, rahat okuyabildiği düzeyden daha düzenli bir okuma davranışına geçmesini desteklemektir.",
        ],
      },
      {
        id: "yasa-uygun-tempo",
        title: "Yaşa uygun tempo nasıl değerlendirilir?",
        paragraphs: [
          "Tempo, tek bir kelime sayısı hedefiyle değerlendirilmemelidir. Metnin güçlüğü, öğrencinin kelime bilgisi, doğruluk düzeyi ve metin sonundaki anlama sonucu birlikte incelenir.",
          "Öğrenci kolay bir hikâyede daha akıcı, yeni kavramlar içeren bir ders metninde daha yavaş okuyabilir. Bu değişim bir sorun değil, metnin gerektirdiği hızı seçme becerisinin parçasıdır.",
        ],
      },
      {
        id: "hiz-ve-anlama",
        title: "Anlama neden hızdan ayrı düşünülmez?",
        paragraphs: [
          "Okuma temposundaki değişim ancak öğrenci metnin ana düşüncesini ve temel ayrıntılarını izleyebiliyorsa anlamlıdır. Hız artarken anlama belirgin biçimde düşüyorsa çalışma düzeyi yeniden düzenlenmelidir.",
          "Kısa sorular, metni kendi sözleriyle anlatma ve başlık seçme gibi görevler anlama kontrolüne yardımcı olabilir. Böylece öğrencinin yalnızca satırı bitirmesi değil, okuduğu bilgiyi işlemesi de izlenir.",
        ],
      },
      {
        id: "uygulama-yaklasimi",
        title: "Çalışmalar nasıl uygulanır?",
        paragraphs: [
          "Satır takibi, kelime gruplarını fark etme, kısa süreli göz gezdirme ve farklı metin türlerinde tempo ayarlama çalışmaları kademeli biçimde kullanılabilir. Kitap, yazılım ve eğitmen yönlendirmesi aynı hedefi farklı uygulamalarla destekleyebilir.",
          "Her uygulamada doğruluk, anlama ve öğrencinin rahatlığı korunmalıdır. Süre veya tekrar sayısı öğrencinin günlük düzenine ve dikkatini sürdürebildiği çalışma aralığına göre belirlenir.",
        ],
      },
      {
        id: "veli-destegi",
        title: "Veliler süreci nasıl destekleyebilir?",
        paragraphs: [
          "Evde kısa bir okuma zamanı oluşturmak, öğrencinin ilgisini çeken metinleri seçmek ve sonuçtan çok düzenli katılımı önemsemek destekleyici olabilir. Okumayı sürekli süre tutulan bir yarışa dönüştürmemek gerekir.",
          "Veli, öğrenciden metni kısaca anlatmasını isteyebilir ve zorlandığı kelimeleri birlikte inceleyebilir. Karşılaştırma yapmak yerine öğrencinin kendi önceki çalışmasına göre ilerlemesini izlemek daha dengeli bir yaklaşım sunar.",
        ],
      },
    ],
    related: [
      "/egitimler/ilkokul-akici-okuma",
      "/hizli-okuma/hizli-okursam-anlar-miyim",
      "/fixoku-egitimi/hizli-okuma-kitabi",
    ],
    cta: {
      title: "Yaşa uygun hızlı okuma yaklaşımını inceleyin",
      text: "Öğrencinin sınıf düzeyi ve okuma alışkanlığı hakkında bilgi vererek programın uygunluğunu değerlendirebilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "ortaokul-hizli-okuma",
    path: "/egitimler/ortaokul-hizli-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "Ortaokul Hızlı Okuma",
    navLabel: "Ortaokul Hızlı Okuma",
    icon: "student",
    eyebrow: "5-8. Sınıf Öğrencileri",
    heading: "Ortaokul Hızlı Okuma Eğitimi",
    seoTitle: "Ortaokul Hızlı Okuma ve Paragraf Eğitimi | Fixoku",
    metaDescription:
      "Ortaokul hızlı okuma eğitiminde ders metinleri, paragraf yapısı, ana fikir, soru kökü, düzenli pratik ve süre yönetiminin nasıl ele alındığını öğrenin.",
    readingTime: "7 dakika",
    audience: "5-8. sınıfta ders metinleri, paragraf soruları ve süre yönetimi üzerinde çalışmak isteyen öğrenciler",
    cardLabel: "Programı incele →",
    summary:
      "Ortaokul Hızlı Okuma Eğitimi, öğrencinin ders ve paragraf metinlerinde ana düşünceyi izlerken okuma temposunu ve süre kullanımını daha bilinçli yönetmesini desteklemeyi amaçlar.",
    sections: [
      {
        id: "ortaokulda-okuma-gereksinimi",
        title: "Ortaokulda okuma gereksinimi nasıl değişir?",
        paragraphs: [
          "Ortaokulda ders metinleri uzar, yeni kavramların sayısı artar ve öğrenciden bilgileri ilişkilendirmesi beklenir. Yeni nesil sorular da yönerge, tablo ve paragraf gibi farklı bilgi parçalarını birlikte izlemeyi gerektirebilir.",
          "Bu dönemde amaç yalnızca satırları daha kısa sürede tamamlamak değildir. Öğrencinin konu, ana fikir, yardımcı düşünce ve soru kökü arasındaki ilişkiyi koruyarak ilerlemesi önemlidir.",
        ],
      },
      {
        id: "ders-ve-paragraf-metinleri",
        title: "Ders ve paragraf metinlerinde nasıl çalışılır?",
        paragraphs: [
          "Ders metinlerinde başlık, alt başlık, kavram ve örnekler; paragraf sorularında ise konu, ana düşünce ve düşünceler arasındaki bağlantılar ayrı çalışma başlıkları olarak ele alınabilir.",
          "Öğrenci metne başlamadan önce okuma amacını belirlediğinde ayrıntı ile temel bilgiyi ayırması kolaylaşabilir. Okuma sonrasında kısa bir özet çıkarmak veya metinden kanıt göstermek anlama kontrolünü destekler.",
        ],
      },
      {
        id: "sure-yonetimi",
        title: "Süre yönetimi nasıl desteklenir?",
        paragraphs: [
          "Süre yönetimi, her soruya aynı zamanı ayırmak değildir. Öğrenci metnin güçlüğünü ve sorunun istediği işlemi fark ederek temposunu ayarlamayı, gereksiz geri dönüşleri belirlemeyi ve takıldığı soruda zamanını yeniden planlamayı öğrenebilir.",
          "Süreli uygulamalar anlama ve doğruluk kontrolüyle birlikte yürütülmelidir. Sadece bitirme süresine bakmak, soru kökünü atlama veya yüzeysel okuma gibi davranışları görünmez bırakabilir.",
        ],
      },
      {
        id: "seviyeye-gore-program",
        title: "Program öğrencinin seviyesine nasıl uyarlanır?",
        paragraphs: [
          "Ortaokulun ilk ve son sınıflarında kullanılan metinlerin güçlüğü aynı değildir. Başlangıç ölçümü, okul düzeyi, kelime bilgisi ve öğrencinin zorlandığı soru türleri çalışma planının belirlenmesine yardımcı olabilir.",
          "Metin uzunluğu, görev süresi ve soru çeşidi kademeli değiştirilir. Öğrenci anlama dengesini korudukça daha yoğun metinlere ve farklı ders alanlarına geçilebilir.",
        ],
      },
      {
        id: "duzenli-calisma",
        title: "Düzenli çalışma neden önemlidir?",
        paragraphs: [
          "Okuma ve paragraf becerileri tek bir yoğun çalışmadan çok, farklı metinlerle yapılan düzenli uygulamalarla pekişir. Öğrenci böylece kullandığı yöntemi yalnızca bir metinde değil, ders ve soru türleri arasında aktarmayı deneyebilir.",
          "İlerleme; tempo, anlama, soru kökünü doğru yorumlama ve çalışma sırasında dikkati sürdürebilme gibi birden fazla göstergeyle ele alınmalıdır. LGS sürecinde bu yaklaşım okuma ve süre yönetimini destekleyebilir, ancak sınav sonucunu tek başına belirlemez.",
        ],
      },
    ],
    related: [
      "/egitimler/paragraf-teknikleri",
      "/dikkat-ve-odaklanma/ogrenmeye-etkisi",
      "/hizli-okuma",
    ],
    cta: {
      title: "Ortaokul düzeyine uygun çalışma planını değerlendirin",
      text: "Öğrencinin sınıfı, kullandığı metinler ve zorlandığı alanlar üzerinden program hakkında bilgi alabilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "lise-hizli-okuma",
    path: "/egitimler/lise-hizli-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "Lise Hızlı Okuma",
    navLabel: "Lise Hızlı Okuma",
    icon: "book",
    eyebrow: "Lise Öğrencileri",
    heading: "Lise Hızlı Okuma Eğitimi",
    seoTitle: "Lise Hızlı Okuma Eğitimi ve Seçici Okuma | Fixoku",
    metaDescription:
      "Lise hızlı okuma eğitiminde uzun ve yoğun metinler, seçici okuma, soru kökü, not alma, hız-doğruluk dengesi ve sınav süresi yaklaşımını inceleyin.",
    readingTime: "7 dakika",
    audience: "Lise dersleri, akademik metinler ve sınav hazırlığında okuma stratejisini geliştirmek isteyen öğrenciler",
    cardLabel: "Programı incele →",
    summary:
      "Lise Hızlı Okuma Eğitimi, uzun ve yoğun metinlerde okuma amacını belirleme, önemli bilgiyi seçme ve hız ile doğruluğu metin türüne göre dengeleme üzerinde durur.",
    sections: [
      {
        id: "lise-duzeyinde-okuma",
        title: "Lise düzeyinde okuma gereksinimleri nelerdir?",
        paragraphs: [
          "Lise öğrencileri ders kitapları, edebî metinler, denemeler ve sınav soruları gibi farklı amaçlarla yazılmış yoğun içeriklerle karşılaşır. Her metin aynı okuma biçimini gerektirmez.",
          "Bir kavramı öğrenmek için ayrıntılı, genel çerçeveyi görmek için daha akıcı, belirli bir bilgiyi bulmak için seçici okuma kullanılabilir. Eğitim bu amaçlar arasındaki farkı görmeye yardımcı olur.",
        ],
      },
      {
        id: "secici-okuma",
        title: "Uzun metinlerde seçici okuma nasıl kullanılır?",
        paragraphs: [
          "Seçici okuma metnin bazı bölümlerini gelişigüzel atlamak değildir. Başlıkları, anahtar kavramları, düşünce geçişlerini ve okuma amacına doğrudan hizmet eden bölümleri fark ederek dikkati yönetmektir.",
          "Öğrenci önce metnin yapısını gözden geçirebilir, ardından ayrıntılı okunması gereken bölümlere dönebilir. Bu yaklaşım özellikle ders tekrarı, araştırma ve uzun soru metinlerinde kullanılabilir.",
        ],
      },
      {
        id: "hiz-ve-dogruluk",
        title: "Hız ve doğruluk nasıl dengelenir?",
        paragraphs: [
          "Hız, metnin güçlüğü ve okuma amacı değiştikçe ayarlanmalıdır. Bilinen bir konuda daha akıcı ilerlemek mümkünken yeni bir kavram, yoğun bir çıkarım veya olumsuz soru kökü daha kontrollü okuma gerektirebilir.",
          "Çalışmalarda okuma süresi kadar ana düşünceyi belirleme, ayrıntıyı metinden gösterme ve soru kökünü doğru yorumlama da izlenir. Anlama azaldığında tempo yeniden düzenlenir.",
        ],
      },
      {
        id: "akademik-ve-sinav-metinleri",
        title: "Akademik ve sınav metinleri nasıl ele alınır?",
        paragraphs: [
          "Akademik metinlerde kavramlar arasındaki ilişkiyi görmek, kısa notlar almak ve bölüm sonlarında özet yapmak yararlı olabilir. Sınav metinlerinde ise soru kökünü, yön değiştirici ifadeleri ve seçeneklerin metinle ilişkisini dikkatle izlemek gerekir.",
          "TYT ve YKS hazırlığında okuma stratejisi, konu bilgisi ve soru deneyiminin yerine geçmez. Paragraf çalışmalarıyla hızlı okuma uygulamaları birbirini tamamlayabilir ve aynı plan içinde dengeli biçimde kullanılabilir.",
        ],
      },
      {
        id: "kimler-icin",
        title: "Lise Hızlı Okuma Eğitimi kimler için uygundur?",
        paragraphs: [
          "Program, uzun metinlerde sık geri dönen, soru kökünü izlemekte zorlanan, okuma amacına göre tempo değiştirmek veya not alma davranışını düzenlemek isteyen lise öğrencileri için değerlendirilebilir.",
          "Çalışma planı öğrencinin sınıfına, sınav takvimine, mevcut okuma düzeyine ve günlük ders yüküne göre uyarlanmalıdır. Puan veya net sonucu hakkında önceden belirlenmiş bir sonuç sunulmaz.",
        ],
      },
    ],
    related: [
      "/egitimler/paragraf-teknikleri",
      "/egitimler/sinav-odakli-hizli-okuma",
      "/blog/hizli-okumanin-sinav-basarisina-etkisi",
    ],
    cta: {
      title: "Lise düzeyindeki okuma hedeflerini değerlendirin",
      text: "Ders, sınav ve kişisel okuma hedeflerine göre programın çalışma yaklaşımı hakkında bilgi alabilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "paragraf-teknikleri",
    path: "/egitimler/paragraf-teknikleri",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "Paragraf Teknikleri",
    navLabel: "Paragraf Teknikleri",
    icon: "book",
    eyebrow: "Ortaokul, Lise ve Sınav Adayları",
    heading: "Paragraf Teknikleri Eğitimi",
    seoTitle: "Paragraf Teknikleri ve Soru Çözme Eğitimi | Fixoku",
    metaDescription:
      "Paragraf Teknikleri eğitiminde konu, ana düşünce, yardımcı düşünce, soru kökü, anlam bütünlüğü, çeldiriciler ve metinden kanıt bulmayı inceleyin.",
    readingTime: "7 dakika",
    audience: "Paragraf yapısını anlamak ve seçenekleri metindeki kanıtlarla değerlendirmek isteyen öğrenciler ve sınav adayları",
    cardLabel: "Programı incele →",
    footerFeatured: true,
    summary:
      "Paragraf Teknikleri Eğitimi, hazır kalıpları ezberletmek yerine metnin yapısını, soru kökünü ve seçeneklerin dayandığı kanıtları sistemli biçimde değerlendirmeyi amaçlar.",
    sections: [
      {
        id: "ilk-adim",
        title: "Paragraf sorusunda önce neye dikkat edilir?",
        paragraphs: [
          "Soruyu çözmeye başlamadan önce kökün ne istediği belirlenmelidir. Konu, ana düşünce, yardımcı düşünce, çıkarım veya anlam akışı soruları farklı okuma amaçları taşır.",
          "Soru kökündeki olumlu ve olumsuz ifadeleri fark etmek önemlidir. Öğrenci ne aradığını belirlediğinde metindeki bilgi ile seçenekler arasındaki ilişkiyi daha düzenli inceleyebilir.",
        ],
      },
      {
        id: "ana-dusunce",
        title: "Ana düşünce ve konu nasıl belirlenir?",
        paragraphs: [
          "Konu, paragrafın neyden söz ettiğini; ana düşünce ise yazarın bu konu hakkında vurguladığı temel yargıyı ifade eder. Tek bir kelimeyi seçmek yerine paragrafın bütününde tekrar eden düşünce ilişkisine bakmak gerekir.",
          "Başlangıç ve sonuç cümleleri yol gösterebilir ancak ana düşünce her zaman belirli bir cümlede açıkça verilmez. Öğrenci paragrafın tamamını kapsayan ve metnin sınırlarını aşmayan seçeneği aramalıdır.",
        ],
      },
      {
        id: "soru-koku",
        title: "Soru kökü neden önemlidir?",
        paragraphs: [
          "Soru kökü öğrenciden yapılacak işlemi tanımlar. “Ulaşılabilir” ile “ulaşılamaz” ya da “değinilmiştir” ile “değinilmemiştir” ifadeleri aynı metin için farklı cevap arama yolları oluşturur.",
          "Kökü aceleyle okumak, paragraf doğru anlaşılmış olsa bile yanlış seçeneğe yönelmeye neden olabilir. Bu nedenle kök, metin ve seçenekler arasında kısa bir doğrulama adımı kullanılabilir.",
        ],
      },
      {
        id: "celdirici-secenekler",
        title: "Çeldirici seçenekler nasıl değerlendirilir?",
        paragraphs: [
          "Çeldirici seçenekler metindeki bir sözcüğü tekrarlayabilir ancak yazarın düşüncesini eksik, dar veya aşırı geniş biçimde aktarabilir. Seçeneğin tanıdık görünmesi tek başına doğru olduğu anlamına gelmez.",
          "Her seçenek için metinden dayanak aramak ve seçeneğin soru kökünü tam karşılayıp karşılamadığını incelemek daha güvenli bir yöntemdir. Eleme, tahminden çok metinle karşılaştırmaya dayanmalıdır.",
        ],
      },
      {
        id: "anlam-butunlugu",
        title: "Anlam bütünlüğü ve geçiş ifadeleri nasıl izlenir?",
        paragraphs: [
          "Bağlaçlar, zamirler ve düşünce geçişleri cümleler arasındaki yönü gösterir. “Ancak”, “bu nedenle” veya “buna karşılık” gibi ifadeler önceki ve sonraki cümle arasındaki ilişkiyi anlamaya yardımcı olur.",
          "Cümle yerleştirme ve akış sorularında yalnızca konu benzerliğine değil, zaman, kişi, gönderme ve düşünce yönüne de bakılmalıdır.",
        ],
      },
      {
        id: "pekitirme",
        title: "Teknikler düzenli çalışmayla nasıl pekiştirilir?",
        paragraphs: [
          "Teknikleri ad olarak ezberlemek yerine farklı uzunluk ve türde paragraflarda uygulamak gerekir. Yanlış sorularda yalnızca doğru seçeneği görmek yerine hatanın kök, metin veya seçenek değerlendirmesinin hangi aşamasında oluştuğu incelenebilir.",
          "Düzenli çalışma, öğrencinin kendi okuma davranışını fark etmesine ve uygun yöntemi soru türüne göre seçmesine yardımcı olabilir. Sonuçlar metin güçlüğü, konu bilgisi ve çalışma düzenine göre değişir.",
        ],
      },
    ],
    related: [
      "/egitimler/ortaokul-hizli-okuma",
      "/egitimler/sinav-odakli-hizli-okuma",
      "/hizli-okuma/hizli-okursam-anlar-miyim",
    ],
    cta: {
      title: "Paragraf çalışma yaklaşımını ayrıntılı değerlendirin",
      text: "Öğrencinin düzeyi ve zorlandığı soru türleri hakkında bilgi paylaşarak program kapsamını inceleyebilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "yetiskin-hizli-okuma",
    path: "/egitimler/yetiskin-hizli-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "Yetişkin Hızlı Okuma",
    navLabel: "Yetişkin Hızlı Okuma",
    icon: "speed",
    eyebrow: "Yetişkin Okurlar",
    heading: "Yetişkin Hızlı Okuma Eğitimi",
    seoTitle: "Yetişkin Hızlı Okuma ve Verimli Okuma Eğitimi | Fixoku",
    metaDescription:
      "Yetişkin hızlı okuma eğitiminde rapor, e-posta, kitap ve akademik metinleri amaç odaklı okuma, seçici ilerleme, not alma ve tempo ayarını keşfedin.",
    readingTime: "7 dakika",
    audience: "İş, akademi, üniversite, sınav hazırlığı veya kişisel gelişim amacıyla yoğun metin okuyan yetişkinler",
    cardLabel: "Programı incele →",
    summary:
      "Yetişkin Hızlı Okuma Eğitimi, mevcut okuma alışkanlığını daha bilinçli yönetmeyi; metnin amacına göre tempo, seçicilik ve not alma yöntemlerini kullanmayı destekler.",
    sections: [
      {
        id: "neden-egitim",
        title: "Yetişkinler neden hızlı okuma eğitimi alır?",
        paragraphs: [
          "Yetişkinler iş, eğitim ve günlük yaşamda rapor, e-posta, sözleşme, kitap ve araştırma metinleriyle karşılaşabilir. Bu metinlerin her biri farklı ayrıntı ve dikkat düzeyi gerektirir.",
          "Eğitimin amacı her metni aynı hızda bitirmek değildir. Okuma amacını belirlemek, önemli bilgiyi ayırmak ve gereksiz tekrarları fark etmek yoğun okuma yükünü daha düzenli yönetmeye yardımcı olabilir.",
        ],
      },
      {
        id: "is-ve-egitim-metinleri",
        title: "İş ve eğitim metinlerinde nasıl uygulanır?",
        paragraphs: [
          "Bir e-postada istenen eylemi, raporda temel bulguyu, akademik metinde ana savı ve sözleşmede dikkat gerektiren koşulları bulmak farklı okuma stratejileri ister. Çalışmalar gerçek kullanım amaçlarına benzeyen metinlerle planlanabilir.",
          "Başlıkları gözden geçirme, anahtar kavramları işaretleme, bölüm sonunda kısa not alma ve gerektiğinde ayrıntılı okumaya dönme bu yaklaşımın parçalarıdır.",
        ],
      },
      {
        id: "metne-gore-tempo",
        title: "Her metin aynı hızda mı okunur?",
        paragraphs: [
          "Hayır. Tanıdık bir konuda yazılmış genel bilgilendirme metniyle hukuki, teknik veya yeni kavramlar içeren bir metin aynı hızda okunmamalıdır. Okur amacına ve metnin yoğunluğuna göre yavaşlayabilmeli veya daha akıcı ilerleyebilmelidir.",
          "Tempo seçimi, okuma becerisinin önemli bir parçasıdır. Metnin amacı yanlış değerlendirildiğinde hız artışı önemli ayrıntıların gözden kaçmasına yol açabilir.",
        ],
      },
      {
        id: "anlama-ve-not-alma",
        title: "Anlama ve not alma nasıl korunur?",
        paragraphs: [
          "Okuma öncesinde cevap aranacak soruyu belirlemek, bölüm sonunda kısa özet çıkarmak ve yalnızca anahtar bilgileri not etmek anlamayı destekleyebilir. Not alma, metni baştan sona yeniden yazmak yerine düşünce yapısını görünür kılmalıdır.",
          "Önemli karar veya öğrenme gerektiren metinlerde doğrulama için ilgili bölüme dönmek doğaldır. Amaç bütün geri dönüşleri kaldırmak değil, gereksiz ve alışkanlığa dönüşmüş tekrarları azaltmaktır.",
        ],
      },
      {
        id: "kimler-icin",
        title: "Yetişkin Hızlı Okuma Eğitimi kimler için uygundur?",
        paragraphs: [
          "Program; yöneticiler, çalışanlar, akademisyenler, üniversite öğrencileri, sınav adayları ve düzenli kitap okuyan yetişkinler tarafından farklı hedeflerle değerlendirilebilir.",
          "Her yetişkinin okuma geçmişi ve ihtiyacı farklıdır. Programın metinleri ve çalışma temposu mesleki alan, eğitim hedefi ve mevcut okuma alışkanlığına göre uyarlanmalıdır.",
        ],
      },
    ],
    related: [
      "/hizli-okuma",
      "/blog/turkiyede-hizli-okumanin-onemi",
      "/fixoku-egitimi",
    ],
    cta: {
      title: "Okuma yükünüze uygun çalışma yaklaşımını değerlendirin",
      text: "Sıklıkla okuduğunuz metin türlerini ve hedefinizi paylaşarak yetişkin programı hakkında bilgi alabilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
  {
    kind: "article",
    slug: "sinav-odakli-hizli-okuma",
    path: "/egitimler/sinav-odakli-hizli-okuma",
    collectionPath: TRAINING_HUB_PATH,
    collectionLabel,
    shortTitle: "Sınav Odaklı Hızlı Okuma",
    navLabel: "Sınav Odaklı Hızlı Okuma",
    icon: "target",
    eyebrow: "LGS, YKS ve Diğer Sınav Adayları",
    heading: "Sınav Odaklı Hızlı Okuma Eğitimi",
    seoTitle: "Sınav Odaklı Hızlı Okuma ve Süre Yönetimi | Fixoku",
    metaDescription:
      "Sınav odaklı hızlı okuma eğitiminde soru kökü, paragraf yoğunluğu, hız-doğruluk dengesi, deneme analizi ve metne göre süre yönetimini inceleyin.",
    readingTime: "7 dakika",
    audience: "LGS, YKS, KPSS, ALES, DGS, YDS ve benzeri sınavlarda okuma ile süre yönetimi üzerinde çalışmak isteyen adaylar",
    cardLabel: "Programı incele →",
    footerFeatured: true,
    summary:
      "Sınav Odaklı Hızlı Okuma Eğitimi, soru kökünü ve paragrafı doğru yorumlarken süreyi daha bilinçli kullanmaya yönelik okuma stratejilerini süreç içinde geliştirmeyi amaçlar.",
    sections: [
      {
        id: "sinavlarda-okuma-suresi",
        title: "Sınavlarda okuma süresi neden önemlidir?",
        paragraphs: [
          "Süreli sınavlarda aday yalnızca bilgiyi hatırlamaz; soru kökünü, verilen metni, tabloyu ve seçenekleri belirli bir zaman içinde değerlendirir. Aynı bölümü gereksiz yere tekrar okumak diğer sorulara ayrılabilecek süreyi etkileyebilir.",
          "Bununla birlikte hızlı bitirmek tek başına doğru sonuç anlamına gelmez. Okuma süresi, doğruluk ve anlama ile birlikte değerlendirildiğinde çalışma için daha anlamlı bir gösterge olur.",
        ],
      },
      {
        id: "soru-koku-ve-paragraf",
        title: "Soru kökü ve paragraf nasıl dengeli okunur?",
        paragraphs: [
          "Soru kökü adaydan yapılacak işlemi belirler; paragraf ise bu işlem için gerekli bilgiyi sunar. Olumsuz ifadeler, sınırlayıcı sözcükler ve çıkarım isteyen yönergeler özellikle dikkatle ele alınmalıdır.",
          "Çalışmalarda adayın kökü ne zaman okuyacağı tek bir kalıba bağlanmaz. Soru türüne göre önce kökü görmek veya metnin yapısını incelemek denenebilir; hangi yaklaşımın doğruluk ve süre açısından uygun olduğu sonuçlarla değerlendirilir.",
        ],
      },
      {
        id: "hiz-ve-dogruluk",
        title: "Hız ile doğruluk nasıl birlikte çalışılır?",
        paragraphs: [
          "Açık ve tanıdık bölümlerde akıcı ilerlemek, yoğun bilgi veya yön değişikliği içeren yerlerde yavaşlamak gerekir. Adayın bütün sorulara aynı tempoyu uygulaması yerine metnin gerektirdiği hızı seçmesi hedeflenir.",
          "Süre çalışmasının ardından yanlışlar incelenmeli; hatanın bilgi eksikliğinden, soru kökünü kaçırmaktan, seçenek değerlendirmesinden veya acele okumadan kaynaklanıp kaynaklanmadığı ayrılmalıdır.",
        ],
      },
      {
        id: "deneme-analizi",
        title: "Deneme sonuçları nasıl değerlendirilir?",
        paragraphs: [
          "Deneme analizi yalnızca doğru ve yanlış sayısını görmek değildir. Hangi soru türlerinde fazla süre kullanıldığı, nerede geri dönüş yapıldığı ve hangi ifadelerin gözden kaçtığı not edilebilir.",
          "Bu bilgiler sonraki çalışmanın metin türünü ve odağını belirlemeye yardımcı olur. Düzenli analiz, adayın kendi okuma davranışını fark etmesini ve stratejisini sınav türüne göre ayarlamasını destekleyebilir.",
        ],
      },
      {
        id: "programin-kapsami",
        title: "Program hangi adaylar için uygundur?",
        paragraphs: [
          "Program LGS, YKS, KPSS, ALES, DGS, YDS ve benzeri sınavlara hazırlanan; uzun soru metinlerinde, paragraf yoğunluğunda veya süre kullanımında çalışma ihtiyacı duyan adaylar için değerlendirilebilir.",
          "Her sınavın metin türü ve ölçtüğü beceriler farklıdır. Bu nedenle tek bir yöntem bütün sınavlara aynen uygulanmaz; çalışmalar sınav yapısı, adayın düzeyi ve hazırlık takvimi dikkate alınarak planlanır.",
        ],
      },
      {
        id: "surec-icinde-gelisim",
        title: "Çalışma neden süreç içine yayılır?",
        paragraphs: [
          "Okuma stratejisini sınavdan hemen önce yoğun biçimde denemek yerine hazırlık sürecinde farklı metin ve denemelerle uygulamak daha dengeli bir yaklaşım sunar. Aday böylece yöntemin doğruluk ve süre üzerindeki etkisini gözlemleyebilir.",
          "Program sınav bilgisi, konu çalışması veya deneme pratiğinin yerine geçmez. Okuma ve süre yönetimi, genel hazırlık planının bir parçası olarak ele alınır.",
        ],
      },
    ],
    related: [
      "/egitimler/paragraf-teknikleri",
      "/blog/hizli-okumanin-sinav-basarisina-etkisi",
      "/dikkat-ve-odaklanma",
    ],
    cta: {
      title: "Sınav türüne uygun okuma çalışmasını değerlendirin",
      text: "Hazırlandığınız sınavı, mevcut çalışma düzeninizi ve zorlandığınız metin türlerini paylaşarak bilgi alabilirsiniz.",
      primary: { label: "Bilgi Alın", to: "/egitim-paketleri" },
      secondary: { label: "Eğitim Paketlerini İnceleyin", to: "/egitim-paketleri" },
    },
  },
];

export const trainingPages = [trainingHub, ...trainingArticles];

export const trainingContentByPath = Object.fromEntries(
  trainingPages.map((page) => [page.path, page]),
);
