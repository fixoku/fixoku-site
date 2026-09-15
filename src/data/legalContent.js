export const contactPhones = {
  mobile: {
    label: "Cep / WhatsApp",
    display: "+90 533 478 92 53",
    telUri: "tel:+905334789253",
    whatsappUrl: "https://wa.me/905334789253",
  },
  office: {
    label: "Ofis",
    display: "+90 232 462 07 43",
    telUri: "tel:+902324620743",
  },
};

export const businessIdentity = {
  brandName: "Fixoku",
  legalName: "Fixoku Yayınları — Mavi Yeşil Ajans",
  address: "1202/2 Sok. No:80/L Temsil Plaza, Yenişehir, Konak / İzmir",
  email: "info@fixoku.com",
  mobilePhone: contactPhones.mobile,
  officePhone: contactPhones.office,
  socialProfiles: [
    "https://www.instagram.com/fixokuakademi",
    "https://www.youtube.com/@fixoku",
    "https://www.facebook.com/fixoku",
    "https://www.linkedin.com/company/fixoku",
  ],
};

const updatedAt = "19 Temmuz 2026";

export const legalPages = [
  {
    kind: "legal",
    slug: "kvkk",
    path: "/kvkk",
    eyebrow: "Yasal Bilgilendirme",
    heading: "Kişisel Verilerin Korunması ve Aydınlatma Metni",
    seoTitle: "KVKK Aydınlatma Metni ve Kişisel Veriler | Fixoku",
    metaDescription:
      "Fixoku tarafından işlenebilecek kişisel veri kategorilerini, işleme amaçlarını, hukuki sebepleri, saklama yaklaşımını ve KVKK haklarınızı inceleyin.",
    summary:
      "Bu aydınlatma metni, Fixoku ile iletişim kurduğunuzda veya mevcut test araçlarını kullandığınızda kişisel verilerin hangi koşullarda işlenebileceğini açıklar.",
    readingTime: "8 dakika",
    schemaType: "WebPage",
    updatedAt,
    sections: [
      {
        id: "veri-sorumlusu",
        title: "Veri sorumlusu ve iletişim bilgileri",
        paragraphs: [
          "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu Fixoku Yayınları — Mavi Yeşil Ajans’tır. Fixoku marka adıyla sunulan hizmetlere ilişkin başvurularınızı 1202/2 Sok. No:80/L Temsil Plaza, Yenişehir, Konak / İzmir adresine veya info@fixoku.com e-posta adresine iletebilirsiniz.",
          "Telefon ve WhatsApp iletişim numarası +90 533 478 92 53'tür. Bu metin açık rıza beyanı veya kullanıcı sözleşmesi değildir; veri işleme faaliyetleri hakkında bilgilendirme sağlar.",
        ],
      },
      {
        id: "kapsam-ve-veriler",
        title: "Kapsam ve doğrulanan kişisel veri kategorileri",
        paragraphs: [
          "Mevcut site kaynaklarında ad-soyad, telefon, e-posta, şehir, öğrencinin sınıf düzeyi, kullanıcı tarafından yazılan mesajlar ile okuma ve dikkat testlerinde oluşan sonuçların iletişim amacıyla kullanılabildiği görülmektedir. Bu bilgiler yalnızca kullanıcı bunları e-posta, telefon veya WhatsApp gibi bir iletişim kanalı üzerinden Fixoku'ya ulaştırdığında Fixoku tarafından teslim alınır.",
          "Sitedeki iletişim formu mevcut teknik yapıda veriyi bir sunucuya göndermemektedir. Okuma ve dikkat testi sonuç ekranlarındaki alanlar tarayıcı içinde tutulur; kullanıcı WhatsApp bağlantısını seçerse yazdığı bilgiler ve test özeti WhatsApp mesajına eklenir.",
          "Okuma testi metin rotasyonunun korunması için tarayıcıda kişiyi doğrudan tanımlamayan teknik bir localStorage kaydı kullanılır. Mevcut kaynaklarda reklam profili, analiz kimliği, ödeme kartı verisi veya aktif bir ödeme sağlayıcısına veri aktarımı doğrulanmamıştır.",
        ],
      },
      {
        id: "isleme-amaclari",
        title: "Kişisel verilerin işlenme amaçları",
        paragraphs: [
          "Fixoku'ya ulaştırılan veriler; bilgi ve destek taleplerini yanıtlamak, öğrenci eğitimi, eğitmenlik veya kurum iş birliği hakkında iletişim kurmak, talebin içeriğine uygun yönlendirme yapmak, hizmet güvenliğini sağlamak ve hukuki yükümlülükleri yerine getirmek amaçlarıyla işlenebilir.",
          "Test sonuçları kullanıcı tarafından paylaşılırsa, talep edilen eğitimsel bilgilendirmeyi bağlama oturtmak için kullanılabilir. Testler tıbbi tanı aracı değildir ve sonuçlar sağlık değerlendirmesi amacıyla işlenmez.",
        ],
      },
      {
        id: "toplama-yontemi",
        title: "Toplama yöntemleri ve hukuki sebepler",
        paragraphs: [
          "Kişisel veriler; e-posta, telefon, WhatsApp ve kullanıcı tarafından başlatılan diğer doğrudan iletişim kanalları üzerinden elektronik veya sözlü olarak toplanabilir. Tarayıcıdaki teknik rotasyon kaydı ise test işlevinin kullanıcı tercihine uygun sürdürülmesi sırasında otomatik olarak oluşur.",
          "Somut işleme faaliyetine göre KVKK madde 5/2 kapsamındaki bir hakkın tesisi, kullanılması veya korunması; hukuki yükümlülüklerin yerine getirilmesi; bir sözleşmenin kurulması ya da ifasıyla doğrudan ilgili olma ve ilgili kişinin temel haklarına zarar vermemek kaydıyla meşru menfaat hukuki sebeplerine dayanılabilir. Açık rıza yalnızca mevzuatın bunu gerektirdiği ayrı durumlarda, belirli ve bilgilendirilmiş biçimde talep edilir.",
        ],
      },
      {
        id: "aktarimlar",
        title: "Kişisel verilerin aktarılması",
        paragraphs: [
          "Veriler, talebin karşılanması için gerektiğinde yetkili çalışanlar ve teknik hizmet sağlayıcılarla; hukuki yükümlülük bulunması halinde yetkili kamu kurumları veya adli mercilerle sınırlı ve ölçülü biçimde paylaşılabilir.",
          "WhatsApp üzerinden iletişim başlatılması hâlinde kullanıcı tarafından mesaj içine eklenen veriler WhatsApp'ın altyapısı üzerinden iletilir ve bu hizmetin kendi gizlilik koşulları geçerli olur. Mevcut teknik yapıda aktif ödeme entegrasyonu kanıtlanmadığı için herhangi bir ödeme sağlayıcısı bu metinde veri alıcısı olarak gösterilmemiştir.",
        ],
      },
      {
        id: "saklama-imha",
        title: "Saklama ve imha yaklaşımı",
        paragraphs: [
          "Kişisel veriler, işleme amacı ve uygulanabilir yasal yükümlülükler için gerekli süre boyunca saklanır. Amaç ve hukuki saklama gereği sona erdiğinde veriler uygun yöntemlerle silinir, yok edilir veya anonim hâle getirilir.",
          "Tarayıcıdaki okuma metni rotasyon kaydının otomatik bitiş tarihi yoktur; kullanıcı tarayıcı site verilerini temizlediğinde veya uygulamadaki kayıt yapısı sıfırlandığında kaldırılır.",
        ],
      },
      {
        id: "ilgili-kisi-haklari",
        title: "KVKK madde 11 kapsamındaki haklarınız",
        paragraphs: [
          "KVKK madde 11 uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme haklarına sahipsiniz.",
          "Ayrıca eksik veya yanlış işlenen verilerin düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini, bu işlemlerin aktarım yapılan üçüncü kişilere bildirilmesini, otomatik sistemlerle analiz sonucuna itiraz etmeyi ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep edebilirsiniz.",
        ],
      },
      {
        id: "basvuru",
        title: "Başvuru kanalları ve güncelleme",
        paragraphs: [
          "Haklarınıza ilişkin başvuruda talebinizi açıkça belirterek kimliğinizi doğrulamaya elverişli bilgilerle birlikte info@fixoku.com adresine veya veri sorumlusunun yukarıdaki posta adresine başvurabilirsiniz. Başvurular, mevzuatta öngörülen usul ve süreler içinde değerlendirilir.",
          `Son güncelleme: ${updatedAt}. Metin, teknik işleyiş veya mevzuat değiştiğinde güncellenebilir.`,
        ],
      },
    ],
  },
  {
    kind: "legal",
    slug: "gizlilik-politikasi",
    path: "/gizlilik-politikasi",
    eyebrow: "Gizlilik ve Veri Güvenliği",
    heading: "Gizlilik Politikası",
    seoTitle: "Gizlilik Politikası ve Veri Güvenliği | Fixoku",
    metaDescription:
      "Fixoku sitesinde iletişim, test ve tarayıcı işlevleri kapsamında verilerin nasıl ele alındığını, güvenlik yaklaşımını, saklama ve kullanıcı haklarını öğrenin.",
    summary:
      "Bu politika, Fixoku web sitesini kullanırken paylaşabileceğiniz bilgilerin mevcut teknik yapı içinde nasıl ele alındığını ve hangi gizlilik ilkelerinin uygulandığını açıklar.",
    readingTime: "7 dakika",
    schemaType: "WebPage",
    updatedAt,
    sections: [
      {
        id: "politika-kapsami",
        title: "Politikanın kapsamı",
        paragraphs: [
          "Bu politika Fixoku'nun kamuya açık web sitesi, iletişim kanalları, okuma hızı ve dikkat testi arayüzleri ile mevcut demo panel deneyimi için geçerlidir. Başka internet siteleri ve kullanıcı tarafından seçilerek açılan üçüncü taraf hizmetler kendi gizlilik politikalarına tabidir.",
          "Mevcut teknik incelemede gerçek bir sunucu kimlik doğrulaması, ödeme entegrasyonu, analiz veya reklam izleme sistemi doğrulanmamıştır. Bu nedenle politika yalnızca güncel teknik yapıda kanıtlanan işleyişi açıklar.",
        ],
      },
      {
        id: "toplanan-veriler",
        title: "Gerçekte kullanılan ve paylaşılabilen veri türleri",
        paragraphs: [
          "Kullanıcılar e-posta, telefon veya WhatsApp üzerinden iletişim kurarken ad-soyad, telefon, e-posta, şehir, öğrencinin sınıfı ve mesaj içeriği gibi bilgileri paylaşabilir. Test sonuçları, ancak kullanıcı bunları WhatsApp mesajına ekleyip göndermeyi seçerse iletişim verisine dönüşür.",
          "Site içindeki iletişim formuna yazılan bilgiler yalnızca React bileşeninin geçici sayfa belleğinde tutulur ve herhangi bir sunucuya gönderilmez. Form, geçerli bilgilerden bir WhatsApp mesajı önizlemesi hazırlar; veriler ancak kullanıcı “WhatsApp’ta Devam Et” bağlantısını seçerse WhatsApp’ın mesaj hazırlama ekranına aktarılır.",
          "Okuma metni rotasyonu için \"fixoku-reading-text-rotation-v1\" adlı birinci taraf localStorage anahtarı kullanılır. Kayıt, sınıf havuzunda daha önce gösterilen metinleri yönetir; ad, telefon veya e-posta içermez.",
        ],
      },
      {
        id: "kullanim-amaclari",
        title: "Verilerin kullanım amaçları",
        paragraphs: [
          "Doğrudan iletişim kanallarıyla Fixoku'ya gönderilen bilgiler talebi yanıtlamak, uygun eğitim veya destek başlığını belirlemek, geri dönüş sağlamak ve gerekli kayıtları yönetmek için kullanılabilir.",
          "Tarayıcıdaki teknik rotasyon bilgisi, aynı sınıf havuzundaki bütün ölçüm metinleri kullanılmadan tekrar oluşmasını önlemek için kullanılır. Bu kayıt pazarlama, reklam hedefleme veya kullanıcı profilleme amacı taşımaz.",
        ],
      },
      {
        id: "hesap-ve-panel",
        title: "Panel ve hesap verileri",
        paragraphs: [
          "Mevcut panel uygulaması demo kullanıcıları ve tarayıcı belleğinde tutulan geçici oturum durumu ile çalışır. Gerçek bir üyelik veritabanı, sunucuya gönderilen parola veya kalıcı oturum anahtarı güncel teknik yapıda doğrulanmamıştır.",
          "Gerçek hesap ve üyelik altyapısı devreye alındığında işlenen veri kategorileri, güvenlik önlemleri, saklama süreleri ve kullanıcı tercihleri bu politika ile ilgili aydınlatma metinlerinde ayrıca güncellenmelidir.",
        ],
      },
      {
        id: "guvenlik",
        title: "Teknik ve organizasyonel güvenlik yaklaşımı",
        paragraphs: [
          "Fixoku, kişisel verilere yetkisiz erişim, kayıp, değişiklik veya açıklama riskini azaltmak için işleme faaliyetinin niteliğine uygun teknik ve organizasyonel tedbirler uygulamayı hedefler. Erişimlerin sınırlandırılması, güncel yazılım kullanımı, güvenli iletişim ve gerekli kayıtların kontrollü tutulması bu yaklaşımın parçalarıdır.",
          "Bununla birlikte hiçbir internet aktarımı veya saklama yöntemi sıfır risk garantisi vermez. Kullanıcılar e-posta veya mesaj yoluyla parola, kart bilgisi ya da talep için gerekmeyen hassas verileri göndermemelidir.",
        ],
      },
      {
        id: "hizmet-saglayicilar",
        title: "Hizmet sağlayıcılar, dış bağlantılar ve aktarımlar",
        paragraphs: [
          "WhatsApp bağlantısı kullanıcı tarafından seçildiğinde mesaj WhatsApp altyapısı üzerinden gönderilir. Instagram, YouTube, Facebook ve LinkedIn bağlantıları da ilgili üçüncü taraf siteleri açar. Bu hizmetlerin veri işleme uygulamaları kendi koşullarına tabidir.",
          "Yasal zorunluluklar veya bir hakkın korunması gerektiğinde bilgiler yetkili kamu kurumları ve adli mercilerle paylaşılabilir. Mevcut kaynaklarda aktif reklam ağı, analiz sağlayıcısı veya ödeme sağlayıcısı bulunmadığından bu tür taraflar veri alıcısı olarak gösterilmez.",
        ],
      },
      {
        id: "cocuklar",
        title: "Çocuklar, öğrenciler ve kanuni temsilciler",
        paragraphs: [
          "Fixoku'nun test ve eğitim içerikleri öğrenciler tarafından kullanılabilir. Çocuklara ait iletişim bilgileri paylaşılırken veli veya kanuni temsilci gözetimi sağlanmalı ve yalnızca talebin karşılanması için gerekli bilgiler iletilmelidir.",
          "Test sonuçları öğrencinin kapasitesi hakkında kesin hüküm veya tıbbi değerlendirme değildir. Çocuğa ait gereksiz hassas bilgi, sağlık bilgisi ya da özel nitelikli kişisel veri iletişim alanlarına yazılmamalıdır.",
        ],
      },
      {
        id: "saklama-ve-haklar",
        title: "Saklama yaklaşımı ve kullanıcı hakları",
        paragraphs: [
          "Fixoku'ya ulaşan kişisel veriler, iletişim talebinin yönetilmesi ve uygulanabilir hukuki yükümlülükler için gerekli süreyle sınırlı olarak saklanır; gerek kalmadığında silinir, yok edilir veya anonim hâle getirilir.",
          "Kişisel verilerinize ilişkin bilgi, düzeltme, silme, itiraz ve diğer KVKK taleplerinizi info@fixoku.com adresine iletebilirsiniz. Ayrıntılı hak ve başvuru açıklamaları KVKK Aydınlatma Metni'nde yer alır.",
        ],
      },
      {
        id: "guncelleme-ve-iletisim",
        title: "Güncelleme ve iletişim",
        paragraphs: [
          `Son güncelleme: ${updatedAt}. Politika, sitenin teknik işleyişi veya uygulanabilir mevzuat değiştiğinde güncellenebilir.`,
          "Gizlilik uygulamalarıyla ilgili sorularınız için info@fixoku.com adresine yazabilir, +90 533 478 92 53 numarasından iletişim kurabilir veya 1202/2 Sok. No:80/L Temsil Plaza, Yenişehir, Konak / İzmir adresine başvurabilirsiniz.",
        ],
      },
    ],
  },
  {
    kind: "legal",
    slug: "cerez-politikasi",
    path: "/cerez-politikasi",
    eyebrow: "Tarayıcı Teknolojileri",
    heading: "Çerez Politikası",
    seoTitle: "Çerez Politikası ve Tarayıcı Depolaması | Fixoku",
    metaDescription:
      "Fixoku sitesinde doğrulanan localStorage kullanımını, çerez ve tarayıcı depolama farkını, saklama yaklaşımını ve tarayıcı kontrollerini inceleyin.",
    summary:
      "Bu politika, Fixoku'nun kamuya açık sitesinde doğrulanan tarayıcı depolama teknolojisini ve kullanıcıların bu teknoloji üzerindeki kontrollerini açıklar.",
    readingTime: "5 dakika",
    schemaType: "WebPage",
    updatedAt,
    sections: [
      {
        id: "teknoloji-nedir",
        title: "Çerezler ve tarayıcı depolaması nedir?",
        paragraphs: [
          "Çerezler bir internet sitesinin tarayıcıya kaydedebildiği küçük veri parçalarıdır. localStorage ise aynı tarayıcı içinde siteye ait işlevsel bilgilerin anahtar-değer biçiminde saklanmasını sağlayan ayrı bir browser storage teknolojisidir.",
          "Mevcut teknik yapıda document.cookie, sessionStorage, Google Analytics, Google Tag Manager, Meta Pixel veya benzeri reklam ve analiz izleme kodu bulunmamaktadır. Bu nedenle aktif olmayan çerez kategorileri veya hayali çerez adları bu politikaya eklenmemiştir.",
        ],
      },
      {
        id: "zorunlu-teknoloji",
        title: "Doğrulanan işlevsel depolama kaydı",
        paragraphs: [
          "Fixoku sitesinde doğrulanan tek kalıcı tarayıcı depolama kaydı \"fixoku-reading-text-rotation-v1\" adlı birinci taraf localStorage anahtarıdır. Bu kayıt, öğrencinin seçtiği sınıf havuzunda hangi okuma ölçüm metinlerinin kullanıldığını izleyerek bütün metinler gösterilmeden tekrar oluşmasını önler.",
          "Kayıt kişiyi doğrudan tanımlayan ad, telefon, e-posta veya reklam kimliği içermez. Otomatik bir sona erme süresi tanımlı değildir; kullanıcı tarayıcıdaki site verilerini temizlediğinde veya uygulama kayıt yapısı sıfırlandığında kaldırılır.",
        ],
      },
      {
        id: "gecici-bellek",
        title: "Geçici arayüz belleği",
        paragraphs: [
          "Test adımları, cevaplar, sonuçlar, modal açık-kapalı durumu ve iletişim formuna yazılan değerler React bileşenlerinin geçici belleğinde tutulur. Bunlar çerez veya localStorage kaydı değildir ve sayfa yenilendiğinde sıfırlanır.",
          "Test sonuç ekranında WhatsApp bağlantısı seçilirse kullanıcı tarafından yazılan bilgiler mesaj metnine eklenir. Aktarım, kullanıcı dış bağlantıyı açıp mesajı göndermeyi seçtiğinde gerçekleşir.",
        ],
      },
      {
        id: "kategori-ve-taraflar",
        title: "Kategori ve birinci/üçüncü taraf ayrımı",
        paragraphs: [
          "Doğrulanan localStorage kaydı Fixoku alan adı altında çalışan birinci taraf ve işlevsel bir teknolojidir. Mevcut site açılışında zorunlu olmayan analiz, reklam veya davranışsal hedefleme çerezi yüklenmez.",
          "WhatsApp ve sosyal medya platformları site içine gömülü değildir; yalnızca kullanıcı tarafından seçilebilen dış bağlantılar olarak sunulur. Bu platformlara geçildiğinde ilgili sağlayıcının kendi depolama ve gizlilik uygulamaları geçerli olabilir.",
        ],
      },
      {
        id: "kullanici-kontrolleri",
        title: "Tarayıcı ve kullanıcı kontrolleri",
        paragraphs: [
          "Tarayıcınızın gizlilik veya site verileri bölümünden fixoku.com için kaydedilen localStorage verisini görüntüleyebilir ve silebilirsiniz. Bu kaydı silmek testlere erişimi engellemez; yalnızca metin rotasyonu geçmişi sıfırlanır ve daha önce görülen bir metnin yeniden seçilme ihtimali oluşur.",
          "Tarayıcıyı özel modda kullanmak veya site depolamasını engellemek de kalıcı rotasyonu sınırlandırabilir. Böyle bir durumda test çalışmaya devam eder ancak metin geçmişi tarayıcı oturumları arasında korunamayabilir.",
        ],
      },
      {
        id: "guncelleme",
        title: "Politika güncellemeleri ve iletişim",
        paragraphs: [
          `Son güncelleme: ${updatedAt}. Yeni bir çerez, analiz veya reklam teknolojisi kullanılmaya başlanırsa bu envanter ve gerekiyorsa tercih mekanizması kullanım öncesinde güncellenmelidir.`,
          "Çerez ve tarayıcı depolaması hakkındaki sorularınızı info@fixoku.com adresine iletebilir veya +90 533 478 92 53 numarasından Fixoku ile iletişim kurabilirsiniz.",
        ],
      },
    ],
  },
];

const draftLegalRoutes = [
  ["/kvkk-aydinlatma-metni", "KVKK Aydınlatma Metni"],
  ["/acik-riza", "Açık Rıza Metni"],
  ["/ticari-elektronik-ileti", "Ticari Elektronik İleti"],
  ["/kullanim-kosullari", "Kullanım Koşulları"],
  ["/uyelik-sozlesmesi", "Üyelik Sözleşmesi"],
  ["/mesafeli-satis-sozlesmesi", "Mesafeli Satış Sözleşmesi"],
  ["/on-bilgilendirme-formu", "Ön Bilgilendirme Formu"],
  ["/iptal-iade-cayma-politikasi", "İptal, İade ve Cayma Politikası"],
  ["/teslimat-kargo-politikasi", "Teslimat ve Kargo Politikası"],
  ["/dijital-icerik-ve-hizmet-kosullari", "Dijital İçerik ve Hizmet Koşulları"],
  ["/veri-sahibi-basvuru-formu", "Veri Sahibi Başvuru Formu"],
].map(([path, heading]) => ({
  kind: "legal", slug: path.slice(1), path, eyebrow: "Yasal Taslak", heading,
  seoTitle: `${heading} | Fixoku`, metaDescription: `${heading} hakkında Fixoku taslak bilgilendirmesi.`,
  summary: "Bu metin hukuki inceleme için hazırlanmış taslaktır. Yayından önce şirket bilgileri ve uygulanabilir mevzuat doğrulanmalıdır.", readingTime: "3 dakika", schemaType: "WebPage", updatedAt,
  sections: [{ id: "taslak", title: "Taslak ve hukuki inceleme", paragraphs: ["LEGAL_VALUE_REQUIRED — Bu belgede yer alan şirket, vergi, iletişim, fiyat, teslimat ve hizmete özgü bilgiler yetkili kişi tarafından doğrulanıp tamamlanmalıdır.", "Fixoku; fiziksel ürün, dijital içerik, dijital erişim ve eğitim hizmetleri için koşulları ürün ve sipariş türüne göre ayrı sunar. İsteğe bağlı pazarlama izni hizmetin kurulması için zorunlu değildir.", `Son güncelleme: ${updatedAt}. Bu belge avukat onayı değildir.`] }],
}));
legalPages.push(...draftLegalRoutes);

export const legalContentByPath = Object.fromEntries(
  legalPages.map((page) => [page.path, page]),
);
