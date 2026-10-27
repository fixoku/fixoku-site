export const QUICK_READING_HUB_PATH = "/hizli-okuma";

export const quickReadingHub = {
  kind: "hub",
  path: QUICK_READING_HUB_PATH,
  navLabel: "Hızlı Okuma",
  eyebrow: "Hızlı Okuma İçerik Merkezi",
  heading: "Hızlı Okuma: Temel Bilgiler ve Eğitim Yaklaşımları",
  seoTitle: "Hızlı Okuma Rehberi: Temel Bilgiler ve Eğitim | Fixoku",
  metaDescription:
    "Hızlı okumanın ne olduğunu, anlama ile ilişkisini, kimler için uygun olabileceğini ve eğitim modeli seçerken nelere bakılması gerektiğini öğrenin.",
  readingTime: "4 dakika",
  summary:
    "Hızlı okuma, metni yalnızca daha kısa sürede bitirmeye değil; okuma amacına uygun bir tempoyla ana düşünceyi ve önemli ayrıntıları yakalamaya odaklanan bir beceri alanıdır.",
  sections: [
    {
      id: "hizli-okumanin-amaci",
      title: "Hızlı okumanın amacı nedir?",
      paragraphs: [
        "Okuma sırasında gözler metin üzerinde kısa duraklamalar ve sıçramalarla ilerler. Eğitim çalışmalarında bu doğal hareketin daha düzenli kullanılması, gereksiz geri dönüşlerin azaltılması ve kelimelerin anlamlı gruplar halinde algılanması hedeflenebilir.",
        "Buradaki amaç her metni aynı hızda okumak değildir. Bir ders kitabı, sınav sorusu, rapor ya da edebi eser farklı dikkat düzeyleri gerektirir. Etkili okuma, hızın metnin zorluğuna ve okuyucunun amacına göre ayarlanabilmesini de kapsar.",
      ],
    },
    {
      id: "kimler-yararlanabilir",
      title: "Kimler yararlanabilir?",
      paragraphs: [
        "Okurken sık sık satır başına dönen, uzun metinlerde dikkatini kaybeden, sınavlarda süre yönetmekte zorlanan ya da düzenli okuma alışkanlığı geliştirmek isteyen kişiler yapılandırılmış çalışmalardan yararlanabilir.",
        "Uygun çalışma biçimi yaşa, başlangıç seviyesine, okuma amacına ve anlama performansına göre değişir. Bu nedenle tek bir hız hedefi yerine kişinin mevcut becerilerini dikkate alan bir plan daha sağlıklı bir başlangıç sunar.",
      ],
    },
    {
      id: "hiz-ve-anlama",
      title: "Hız ve anlama birlikte ele alınmalıdır",
      paragraphs: [
        "Okuma hızındaki artış, anlama korunmadığında tek başına anlamlı bir ilerleme sayılmaz. Sağlıklı bir çalışmada ana fikir, yardımcı düşünceler, kavramlar ve metin içindeki ilişkiler düzenli olarak kontrol edilir.",
        "Okuyucu bazı bölümlerde yavaşlayabilmeli, gerektiğinde not alabilmeli ve metnin güçlük düzeyine göre temposunu değiştirebilmelidir. Esnek okuma, hız ile anlama arasında sürdürülebilir bir denge kurulmasına yardımcı olur.",
      ],
    },
  ],
  cardsHeading: "Hızlı okuma hakkında doğru içeriği seçin",
  cardsIntro:
    "Konuya temel tanımdan başlayabilir, ihtiyacınıza göre eğitim modelleri veya hız-anlama ilişkisi gibi daha özel başlıklara geçebilirsiniz.",
  cta: {
    title: "Okuma becerilerinizi planlı bir çalışmayla ele alın",
    text: "Fixoku eğitim seçeneklerini inceleyebilir veya hangi yaklaşımın ihtiyacınıza uygun olabileceği hakkında bilgi alabilirsiniz.",
    primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
    secondary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
  },
};

export const quickReadingArticles = [
  {
    kind: "article",
    slug: "nedir",
    path: "/hizli-okuma/nedir",
    navLabel: "Hızlı Okuma Nedir?",
    icon: "question",
    eyebrow: "Temel Kavramlar",
    heading: "Hızlı Okuma Nedir?",
    seoTitle: "Hızlı Okuma Nedir, Nasıl Çalışır? | Fixoku Rehberi",
    metaDescription:
      "Hızlı okumanın temel mantığını; göz hareketleri, kelime grupları, görme alanı, iç seslendirme ve anlama dengesi üzerinden sade biçimde keşfedin.",
    readingTime: "6 dakika",
    summary:
      "Hızlı okuma; gözün metin üzerindeki hareketini, görsel algıyı ve anlam kurma sürecini daha verimli kullanmayı hedefleyen tekniklerin bütünüdür. Amaç, kelimeleri aceleyle geçmek değil, metni uygun bir tempoda ve anlamı koruyarak işlemektir.",
    sections: [
      {
        id: "okuma-sureci",
        title: "Okuma süreci nasıl işler?",
        paragraphs: [
          "Gözler okurken satır üzerinde kesintisiz biçimde kaymaz. Kısa süreli duraklamalar yapar, ardından bir sonraki bölgeye sıçrar. Anlamlandırma büyük ölçüde bu duraklamalar sırasında gerçekleşir.",
          "Okuma eğitimi, bu hareketi zorlamadan daha düzenli hale getirmeyi amaçlar. Gereksiz duraklamaların ve alışkanlık haline gelmiş geri dönüşlerin fark edilmesi, metnin daha akıcı izlenmesine katkı sağlayabilir.",
        ],
      },
      {
        id: "kelime-gruplari",
        title: "Kelimeleri tek tek değil, anlam gruplarıyla görmek",
        paragraphs: [
          "Geleneksel okuma alışkanlığında dikkat çoğu zaman tek bir kelimeye yönelir. Oysa cümle anlamı, kelimeler arasındaki ilişkilerden doğar. Birbiriyle bağlantılı sözcükleri küçük anlam grupları halinde algılamak, düşünce akışını takip etmeyi kolaylaştırabilir.",
          "Bu yaklaşım bütün satırı tek bakışta görme iddiasına dayanmaz. Okuyucunun görsel alanını ve dikkatini, seviyesine uygun kısa egzersizlerle daha verimli kullanmasına odaklanır.",
        ],
      },
      {
        id: "gorme-alani",
        title: "Görme alanı ve odak noktası",
        paragraphs: [
          "Bir noktaya bakarken yalnızca merkezdeki harfi değil, çevresindeki sınırlı alanı da algılarız. Okuma çalışmaları, satırın başından sonuna kadar daha dengeli odak noktaları kullanmayı ve kenarlardaki kelimeleri fark etmeyi destekleyebilir.",
          "Görsel alanı kullanmak, başı hızla sağa sola çevirmek veya metni bulanıklaştıracak kadar acele etmek anlamına gelmez. Rahat göz hareketi, okunabilir yazı boyutu ve uygun mesafe önemini korur.",
        ],
      },
      {
        id: "ic-seslendirme",
        title: "İç seslendirme tamamen bırakılmalı mı?",
        paragraphs: [
          "Birçok kişi okuduğu kelimeleri zihninde seslendirir. Bu alışkanlık özellikle yeni, teknik ya da yoğun metinlerde anlam kurmaya yardımcı olabilir. Bu nedenle iç seslendirmeyi tümüyle ortadan kaldırmak herkes için doğru bir hedef değildir.",
          "Daha tanıdık ve kolay metinlerde her kelimeyi ayrı ayrı zihinden telaffuz etme ihtiyacını azaltmak akıcılığı destekleyebilir. Okuma amacı değiştiğinde seslendirme düzeyi ve tempo da değişebilir.",
        ],
      },
      {
        id: "etkili-calisma",
        title: "Etkili bir hızlı okuma çalışması ne içerir?",
        paragraphs: [
          "Sağlıklı bir çalışma yalnızca süre tutmaz. Başlangıç düzeyini belirler, metin türlerini çeşitlendirir ve okuma sonrasında anlama soruları ya da kısa özetlerle sonucu kontrol eder.",
        ],
        bullets: [
          "Okuma hızını ve anlama düzeyini birlikte ölçmek",
          "Gereksiz geri dönüşleri fark etmek",
          "Kelime gruplarıyla okuma alıştırmaları yapmak",
          "Metnin güçlüğüne göre hız değiştirmek",
          "Kısa ve düzenli çalışmalarla ilerlemeyi izlemek",
        ],
      },
    ],
    related: [
      "/hizli-okuma/hizli-okursam-anlar-miyim",
      "/hizli-okuma/neden-onemli",
      "/hizli-okuma/firmalar-ve-egitim-modelleri",
    ],
    cta: {
      title: "Temel becerilerinizi ölçerek başlayın",
      text: "Okuma hedeflerinize uygun eğitim seçeneklerini inceleyebilir veya süreç hakkında bilgi alabilirsiniz.",
      primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
      secondary: { label: "Hızlı Okuma Merkezine Dön", to: QUICK_READING_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "neden-onemli",
    path: "/hizli-okuma/neden-onemli",
    navLabel: "Hızlı Okuma Neden Önemli?",
    icon: "speed",
    eyebrow: "Okuma Verimliliği",
    heading: "Hızlı Okuma Neden Önemli?",
    seoTitle: "Hızlı Okuma Neden Önemli? Kullanım Alanları | Fixoku",
    metaDescription:
      "Hızlı okumanın zaman yönetimi, odaklanma, akademik metinler, sınavlar ve iş hayatındaki rolünü; anlama dengesini koruyan bir yaklaşımla inceleyin.",
    readingTime: "5 dakika",
    summary:
      "Gün içinde ders notları, raporlar, e-postalar ve uzun açıklamalarla karşılaşırız. Okuma sürecini daha bilinçli yönetebilmek, bu metinlere ayrılan zamanı planlamaya ve dikkati önemli bilgilere yöneltmeye yardımcı olabilir.",
    sections: [
      {
        id: "zaman-yonetimi",
        title: "Bilgi yoğunluğunda zaman yönetimi",
        paragraphs: [
          "Hızlı okumanın en pratik yönü, her metni hızla bitirmek değil, hangi bölümün ayrıntılı okunması gerektiğini ayırt edebilmektir. Ön izleme, başlıkları tarama ve anahtar kavramları belirleme gibi alışkanlıklar okuma süresinin daha bilinçli kullanılmasını sağlar.",
          "Bir metnin amacı belli olduğunda okuyucu, gerekli bölümlere daha fazla zaman ayırabilir; tekrar eden ya da daha az önemli kısımlarda ise akıcı ilerleyebilir.",
        ],
      },
      {
        id: "odaklanma",
        title: "Odaklanma ve zihinsel katılım",
        paragraphs: [
          "Çok yavaş ve dağınık okuma, dikkatin metinden kopmasına yol açabilir. Okuyucunun seviyesine uygun, akıcı bir tempo ise metinle zihinsel teması canlı tutmaya yardımcı olabilir.",
          "Bununla birlikte hız tek başına odaklanma sağlamaz. Bildirimleri azaltmak, kısa çalışma aralıkları belirlemek ve okuma amacını önceden tanımlamak da sürecin önemli parçalarıdır.",
        ],
      },
      {
        id: "akademik-okuma",
        title: "Akademik metinler ve sınavlarda kullanım",
        paragraphs: [
          "Öğrenciler ders kitaplarında, kaynaklarda ve sınav sorularında farklı uzunlukta metinlerle karşılaşır. Ana düşünceyi, soru kökünü ve metindeki kanıtları ayırt edebilmek süre yönetimini destekleyebilir.",
          "Hız çalışmaları sınav sonucunu garanti etmez. Alan bilgisi, soru çözme stratejisi, dikkat düzeyi ve düzenli tekrar gibi etkenlerle birlikte ele alındığında daha anlamlı hale gelir.",
        ],
      },
      {
        id: "is-hayati",
        title: "İş hayatında seçici ve amaçlı okuma",
        paragraphs: [
          "E-posta, teklif, rapor ve toplantı notlarında her satır aynı öneme sahip değildir. Önce metnin yapısını görmek, ardından karar için gerekli ayrıntılara dönmek profesyonel okumayı daha verimli hale getirebilir.",
          "Teknik veya hukuki metinlerde ise hızdan çok doğruluk önceliklidir. Etkili okuyucu, metnin riskine ve karmaşıklığına göre yavaşlamayı bilir.",
        ],
      },
      {
        id: "esnek-okuma",
        title: "Asıl kazanım: Esnek okuma",
        paragraphs: [
          "Hızlı okumanın uzun vadeli değeri, tek bir yüksek hıza ulaşmaktan çok farklı metinlere farklı stratejilerle yaklaşabilmektir. Okuyucu; tarama, dikkatli okuma, not alma ve yeniden okuma seçeneklerini bilinçli biçimde kullanır.",
          "Bu esneklik, okuma hızını amaç haline getirmeden zamanı ve dikkati daha dengeli yönetmeyi destekler.",
        ],
      },
    ],
    related: [
      "/hizli-okuma/nedir",
      "/hizli-okuma/hizli-okursam-anlar-miyim",
      "/hizli-okuma/kimler-egitim-almali",
    ],
    cta: {
      title: "Okuma hedefinizi ihtiyacınıza göre belirleyin",
      text: "Eğitim içeriklerini inceleyerek çalışma biçimleri hakkında daha ayrıntılı bilgi edinebilirsiniz.",
      primary: { label: "Okuma Becerileri Hakkında Bilgi Al", to: "/iletisim" },
      secondary: { label: "Hızlı Okuma Merkezine Dön", to: QUICK_READING_HUB_PATH },
    },
  },
  {
    kind: "article",
    slug: "kimler-egitim-almali",
    path: "/hizli-okuma/kimler-egitim-almali",
    navLabel: "Kimler Hızlı Okuma Eğitimi Almalı?",
    icon: "student",
    eyebrow: "İhtiyaç ve Seviye",
    heading: "Kimler Hızlı Okuma Eğitimi Almalı?",
    seoTitle: "Hızlı Okuma Eğitimi Kimler İçin Uygundur? | Fixoku",
    metaDescription:
      "Yavaş okuyanlar, dikkat ve anlama güçlüğü yaşayanlar, sınav öğrencileri, yetişkinler ve okuma alışkanlığı kazanmak isteyenler için açıklayıcı rehber.",
    readingTime: "6 dakika",
    summary:
      "Hızlı okuma eğitimi yalnızca çok yavaş okuyan kişiler için değildir. Okuma sırasında dikkatini sürdürmek, metni anlamlandırmak, süreyi yönetmek veya düzenli okuma alışkanlığı geliştirmek isteyen farklı yaş grupları da yapılandırılmış çalışmalardan yararlanabilir.",
    sections: [
      {
        id: "yavas-okuyanlar",
        title: "Yavaş veya sık duraklayarak okuyanlar",
        paragraphs: [
          "Kelimeleri tek tek çözümlemek, satır üzerinde sık sık geri dönmek ya da okuma sırasında ritmi kaybetmek metni tamamlamayı zorlaştırabilir. Bu durumda önce sorunun kaynağını anlamak gerekir.",
          "Akıcılık çalışmaları, göz hareketlerini ve kelime gruplarını fark etmeyi destekleyebilir. Ancak görme, dil gelişimi veya öğrenme güçlüğü şüphesi varsa eğitim programından önce ilgili uzmanın değerlendirmesi önemlidir.",
        ],
      },
      {
        id: "anlama-guclugu",
        title: "Okuduğunu anlamakta zorlananlar",
        paragraphs: [
          "Bir metni bitirmek, onu anladığımız anlamına gelmez. Ana fikri bulmakta, ayrıntıları ilişkilendirmekte veya okuduklarını kendi cümleleriyle açıklamakta zorlanan kişiler anlama odaklı çalışmalara ihtiyaç duyabilir.",
          "Bu grupta hız hedefi ikinci plandadır. Kısa metinler, özetleme, soru yanıtlama ve kelime bilgisi çalışmalarıyla sağlam bir anlama temeli kurulması gerekir.",
        ],
      },
      {
        id: "dikkat-sorunu",
        title: "Uzun metinlerde dikkatini koruyamayanlar",
        paragraphs: [
          "Okurken çevresel uyaranlara sıkça yönelmek, aynı paragrafı tekrar tekrar okumak ya da kısa sürede zihinsel yorgunluk yaşamak okuma verimini düşürebilir.",
          "Süreyi kademeli artıran kısa çalışmalar, dikkat dağıtıcıları azaltma ve metin sonu kontrol soruları kişinin okuma davranışını daha görünür hale getirebilir. Sonuçlar kişiden kişiye değişir ve düzenli çalışma gerektirir.",
        ],
      },
      {
        id: "sinav-ogrencileri",
        title: "Sınavlara hazırlanan öğrenciler",
        paragraphs: [
          "LGS, TYT, AYT, KPSS, ALES ve benzeri sınavlarda uzun soru kökleriyle karşılaşılabilir. Soru kökünü doğru okumak, metindeki kanıtları ayırt etmek ve gerektiğinde hız değiştirmek süre yönetimini destekler.",
          "Hızlı okuma çalışması tek başına sınav başarısı sağlamaz. Ders bilgisi, soru pratiği, uyku düzeni ve sınav stratejileriyle birlikte düşünülmelidir.",
        ],
      },
      {
        id: "ogrenciler-ve-yetiskinler",
        title: "Öğrenciler, yetişkinler ve profesyoneller",
        paragraphs: [
          "İlkokul döneminde temel hedef akıcı okuma, anlama ve okuma sevgisidir. Ortaokul ve lise döneminde ders metinleri ile sınav soruları öne çıkarken yetişkinlerde rapor, akademik yayın veya mesleki dokümanlar önem kazanabilir.",
          "Bu nedenle aynı programın her yaşa aynı biçimde uygulanması uygun değildir. Metin seçimi, egzersiz süresi ve ölçüm yöntemi kişinin yaşına, deneyimine ve hedefine göre planlanmalıdır.",
        ],
      },
      {
        id: "okuma-aliskanligi",
        title: "Okuma alışkanlığı geliştirmek isteyenler",
        paragraphs: [
          "Bazı kişiler için temel ihtiyaç hız değil, düzenli okumaya başlamaktır. İlgi alanına uygun kitaplar seçmek, ulaşılabilir günlük hedefler koymak ve ilerlemeyi baskı oluşturmadan izlemek kalıcı alışkanlık için daha değerlidir.",
          "Hız çalışmaları, okuma deneyimini zorlaştırmak yerine akıcılığı ve merakı desteklediği ölçüde bu sürece katkı sağlayabilir.",
        ],
      },
      {
        id: "baslangic-degerlendirmesi",
        title: "Eğitime başlamadan önce ne değerlendirilmeli?",
        paragraphs: [
          "Uygun bir başlangıç için yalnızca dakikadaki kelime sayısına bakılmaz. Anlama düzeyi, metin türü, okuma alışkanlığı, dikkat süresi ve kişinin hedefi birlikte değerlendirilmelidir.",
        ],
        bullets: [
          "Yaşa ve seviyeye uygun metinlerle başlangıç ölçümü",
          "Hız ile birlikte anlama kontrolü",
          "Kişinin okuma amacı ve günlük çalışma zamanı",
          "Görme veya öğrenme güçlüğü gibi uzman değerlendirmesi gerektirebilecek durumlar",
          "Gerçekçi ve izlenebilir gelişim hedefleri",
        ],
      },
    ],
    related: [
      "/hizli-okuma/firmalar-ve-egitim-modelleri",
      "/hizli-okuma/neden-onemli",
      "/hizli-okuma/nedir",
    ],
    cta: {
      title: "İhtiyacınıza uygun çalışma biçimini değerlendirin",
      text: "Yaş, seviye ve okuma hedefi hakkında bilgi paylaşarak eğitim seçeneklerini daha yakından inceleyebilirsiniz.",
      primary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
      secondary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
    },
  },
  {
    kind: "article",
    slug: "firmalar-ve-egitim-modelleri",
    path: "/hizli-okuma/firmalar-ve-egitim-modelleri",
    navLabel: "Hızlı Okuma Firmaları ve Eğitim Modelleri",
    icon: "chart",
    eyebrow: "Program Seçme Rehberi",
    heading: "Hızlı Okuma Firmaları ve Eğitim Modelleri",
    seoTitle: "Hızlı Okuma Firmaları ve Eğitim Modelleri | Fixoku",
    metaDescription:
      "Hızlı okuma firması veya eğitim modeli seçerken seviye tespiti, şeffaf hedefler, yaşa uygunluk, ölçüm, eğitmen desteği ve sürdürülebilirliği değerlendirin.",
    readingTime: "7 dakika",
    summary:
      "Hızlı okuma eğitimi seçerken kurumun büyüklüğünden veya iddialı vaatlerinden önce programın nasıl ölçüm yaptığına, yaşa uygunluğuna, anlama becerisini nasıl izlediğine ve çalışmayı nasıl sürdürülebilir hale getirdiğine bakmak gerekir.",
    sections: [
      {
        id: "seviye-tespiti",
        title: "1. Başlangıç seviyesi nasıl belirleniyor?",
        paragraphs: [
          "Nitelikli bir program, herkese aynı hız hedefini vermeden önce mevcut okuma davranışını inceler. Kullanılan metnin yaşa uygunluğu, okuma süresi ve anlama sonucu birlikte değerlendirilmelidir.",
          "Yalnızca yüksek bir kelime sayısı göstermek, öğrencinin metni doğru anladığını kanıtlamaz. Başlangıç ölçümünün yöntemi ve sonuçların nasıl yorumlandığı açıkça anlatılmalıdır.",
        ],
      },
      {
        id: "hedefler-ve-iddialar",
        title: "2. Hedefler şeffaf ve gerçekçi mi?",
        paragraphs: [
          "Programın hangi becerileri geliştirmeyi hedeflediği, ne sıklıkta çalışma gerektirdiği ve ilerlemenin hangi ölçütlerle değerlendirileceği anlaşılır olmalıdır.",
          "Belirli bir sürede herkese aynı sonucu vadeden, kesin başarı veya sabit hız artışı sunan ifadeler dikkatle değerlendirilmelidir. Gelişim; başlangıç seviyesi, devamlılık, metin türü ve kişisel ihtiyaçlara göre değişebilir.",
        ],
      },
      {
        id: "yasa-uygunluk",
        title: "3. İçerik yaşa ve amaca uygun mu?",
        paragraphs: [
          "İlkokul öğrencisinin akıcı okuma ve okuma sevgisi ihtiyacı ile sınava hazırlanan bir lise öğrencisinin süre yönetimi ihtiyacı aynı değildir. Yetişkinler ise mesleki ya da akademik metinlere odaklanabilir.",
          "Metin zorluğu, egzersiz süresi, geri bildirim biçimi ve hedefler yaş grubuna göre farklılaşmalıdır. Çocuklarda hız baskısı oluşturmayan, anlamayı ve motivasyonu koruyan bir yaklaşım tercih edilmelidir.",
        ],
      },
      {
        id: "egzersiz-yapisi",
        title: "4. Egzersizler nasıl yapılandırılmış?",
        paragraphs: [
          "Tek bir tekniğin sürekli tekrarı yerine göz hareketi, kelime grupları, dikkat, metin tarama ve anlama kontrollerini dengeli biçimde içeren çalışmalar daha bütüncül bir yapı sunar.",
          "Egzersizlerin amacı açıklanmalı ve güçlük düzeyi aşamalı ilerlemelidir. Öğrencinin yalnızca ekrana daha hızlı bakması değil, okuma stratejisini bilinçli kullanması hedeflenmelidir.",
        ],
      },
      {
        id: "olcum-ve-geri-bildirim",
        title: "5. Ölçüm ve geri bildirim nasıl yapılıyor?",
        paragraphs: [
          "İlerleme takibi, aynı türde tek bir metinle yapılan karşılaştırmadan ibaret olmamalıdır. Farklı metin türleri, benzer güçlük düzeyleri ve düzenli anlama kontrolleri daha dengeli bir değerlendirme sağlar.",
          "Kullanıcıya yalnızca sonuç puanı değil, hangi beceride zorlandığını açıklayan anlaşılır geri bildirim sunulması önemlidir. Teknik altyapı hakkında doğrulanamayan yapay zeka veya anlık kişiselleştirme iddiaları yerine somut özellikler değerlendirilmelidir.",
        ],
      },
      {
        id: "egitmen-destegi",
        title: "6. Eğitmen veya rehberlik desteği var mı?",
        paragraphs: [
          "Eğitmen desteği sunulan modellerde geri bildirimin sıklığı, iletişim kanalı ve eğitmenin rolü açık olmalıdır. Eğitmen, öğrencinin yalnızca hızını değil, anlama düzeyini ve çalışma düzenini de izleyebilmelidir.",
          "Tamamen bireysel ilerleyen dijital modellerde ise yönergelerin açık, ölçümlerin anlaşılır ve yardım kaynaklarının erişilebilir olması beklenir.",
        ],
      },
      {
        id: "egitim-modelleri",
        title: "7. Yüz yüze, çevrim içi ve karma modeller",
        paragraphs: [
          "Yüz yüze eğitim doğrudan gözlem ve anlık geri bildirim sunabilir. Çevrim içi programlar zaman ve konum esnekliği sağlayabilir. Karma modeller ise bireysel egzersizleri belirli aralıklarla yapılan eğitmen görüşmeleriyle birleştirir.",
          "En uygun model, kişinin yaşı, çalışma disiplini, teknik erişimi ve geri bildirim ihtiyacına göre değişir. Modelin adı yerine uygulamanın niteliği değerlendirilmelidir.",
        ],
      },
      {
        id: "surdurulebilirlik",
        title: "8. Program sonrasında beceri nasıl korunacak?",
        paragraphs: [
          "Okuma becerisi kısa süreli bir egzersiz döneminden sonra kendiliğinden sabit kalmayabilir. Programın düzenli okuma alışkanlığı, farklı metinlerle pratik ve kişinin kendi ilerlemesini izleme konusunda yol göstermesi önemlidir.",
          "Sürdürülebilir bir model, kullanıcıyı sürekli bir ürüne bağımlı kılmak yerine öğrendiği stratejileri günlük okuma yaşamına aktarabilmesini destekler.",
        ],
      },
    ],
    related: [
      "/hizli-okuma/kimler-egitim-almali",
      "/hizli-okuma/nedir",
      "/hizli-okuma/hizli-okursam-anlar-miyim",
    ],
    cta: {
      title: "Programları ölçütleriyle birlikte değerlendirin",
      text: "Fixoku eğitim seçeneklerinin kapsamı ve çalışma biçimi hakkında ayrıntılı bilgi alabilirsiniz.",
      primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
      secondary: { label: "Fixoku ile İletişime Geç", to: "/iletisim" },
    },
  },
  {
    kind: "article",
    slug: "hizli-okursam-anlar-miyim",
    path: "/hizli-okuma/hizli-okursam-anlar-miyim",
    navLabel: "Hızlı Okursam Anlar mıyım?",
    icon: "book",
    eyebrow: "Hız ve Anlama Dengesi",
    heading: "Hızlı Okursam Anlar mıyım?",
    seoTitle: "Hızlı Okursam Anlar mıyım? Hız ve Anlama | Fixoku",
    metaDescription:
      "Hızlı okurken anlamanın nasıl korunacağını; metin türü, okuma amacı, esnek tempo, iç seslendirme ve anlama kontrolleri üzerinden pratik biçimde öğrenin.",
    readingTime: "6 dakika",
    summary:
      "Evet, uygun teknik ve doğru hız seçimiyle daha akıcı okurken anlamı korumak mümkündür. Ancak yalnızca daha hızlı hareket etmek anlama sağlamaz; okuma amacı, metnin zorluğu ve kişinin başlangıç düzeyi belirleyicidir.",
    sections: [
      {
        id: "hiz-tek-basina-yeterli-degil",
        title: "Hız tek başına yeterli değildir",
        paragraphs: [
          "Okuma süresini azaltmaya çalışırken ana düşünce, kavramlar ve metindeki ilişkiler kayboluyorsa tempo gereğinden yüksektir. Hızlı okumanın amacı metni atlamak değil, gereksiz yavaşlıkları azaltırken anlam kurmayı sürdürmektir.",
          "Bu nedenle gelişim, dakikadaki kelime sayısı ile anlama sonucu birlikte izlenerek değerlendirilmelidir. Birindeki artış diğerindeki belirgin düşüş pahasına gerçekleşmemelidir.",
        ],
      },
      {
        id: "metin-turu-ve-amac",
        title: "Metin türü ve okuma amacı hızı değiştirir",
        paragraphs: [
          "Bir haber metnini genel bilgi edinmek için okumakla, bir sözleşmeyi karar vermek için okumak aynı değildir. Edebi metinler, teknik açıklamalar ve sınav soruları da farklı dikkat düzeyleri ister.",
          "Okuyucu önce ne aradığını belirlemeli; genel çerçeve gerekiyorsa daha akıcı, ayrıntı veya kanıt gerekiyorsa daha yavaş ilerlemelidir. Gerektiğinde aynı metin içinde bile hız değiştirmek doğaldır.",
        ],
      },
      {
        id: "anlama-kontrolleri",
        title: "Anlama nasıl kontrol edilir?",
        paragraphs: [
          "Bir bölümü okuduktan sonra ana fikri kendi cümleleriyle söylemek, önemli ayrıntıları hatırlamak ve metnin amacını açıklamak basit fakat etkili kontrol yollarıdır.",
        ],
        bullets: [
          "Metnin ana düşüncesini kısa bir cümleyle ifade etmek",
          "Önemli kavramlar arasındaki ilişkiyi açıklamak",
          "Metne dayalı soruları yanıtlamak",
          "Bilginin hangi bölümde yer aldığını göstermek",
          "Gerekli yerde yavaşlayıp yeniden okumak",
        ],
      },
      {
        id: "ic-seslendirme-ve-anlama",
        title: "İç seslendirme ve anlam ilişkisi",
        paragraphs: [
          "İç seslendirme bazı metinlerde ritmi yavaşlatabilir; ancak yeni kavramları, yabancı kelimeleri veya karmaşık cümleleri anlamaya da yardımcı olabilir. Amaç bunu tamamen yok etmek değil, ihtiyaç duyulmayan yerlerde her kelimeyi ayrı ayrı zihinden söyleme alışkanlığını azaltmaktır.",
          "Kolay ve tanıdık metinlerde kelime gruplarıyla ilerlemek akıcılığı destekleyebilir. Yoğun bir bölümde ise zihinsel seslendirmeye dönmek veya not almak anlamayı güçlendirebilir.",
        ],
      },
      {
        id: "fazla-hizli-okuma-belirtileri",
        title: "Gereğinden hızlı okuduğunuzu nasıl anlarsınız?",
        paragraphs: [
          "Okuma sonrasında metnin konusunu açıklayamamak, soru kökünü yanlış anlamak, ayrıntıları sürekli karıştırmak veya sık sık geriye dönmek hızın uygun olmadığını gösterebilir.",
          "Bu durumda tempoyu düşürmek başarısızlık değildir. Etkili okuyucu, anlama zayıfladığında hızını ayarlar ve zor bölümlere daha fazla dikkat verir.",
        ],
      },
      {
        id: "dengeyi-gelistirmek",
        title: "Hız ve anlama dengesi nasıl geliştirilir?",
        paragraphs: [
          "Kısa, seviyeye uygun metinlerle başlayıp süre ve anlama sonuçlarını birlikte kaydetmek gelişimi görünür kılar. Metinler giderek çeşitlendirilebilir; ancak güçlük artarken anlama kontrolü korunmalıdır.",
          "Düzenli çalışma, uygun geri bildirim ve esnek hız kullanımı zaman içinde daha akıcı bir okuma deneyimine katkı sağlayabilir. Her kişinin başlangıç noktası ve ilerleme süresi farklıdır.",
        ],
      },
    ],
    related: [
      "/hizli-okuma/nedir",
      "/hizli-okuma/neden-onemli",
      "/hizli-okuma/firmalar-ve-egitim-modelleri",
    ],
    cta: {
      title: "Hız kadar anlamayı da izleyen bir çalışma seçin",
      text: "Okuma ve anlama becerilerini birlikte ele alan eğitim seçenekleri hakkında bilgi edinebilirsiniz.",
      primary: { label: "Eğitim Programlarını İncele", to: "/egitimler" },
      secondary: { label: "Hızlı Okuma Merkezine Dön", to: QUICK_READING_HUB_PATH },
    },
  },
];

export const quickReadingPages = [quickReadingHub, ...quickReadingArticles];

export const quickReadingContentByPath = Object.fromEntries(
  quickReadingPages.map((page) => [page.path, page]),
);
