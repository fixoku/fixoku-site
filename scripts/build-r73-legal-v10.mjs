import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v02Path = path.join(root, "src", "platform", "admin", "legal-owner-documents-v3.json");
const v10Path = path.join(root, "src", "platform", "admin", "legal-owner-documents-v10.json");
const v02 = JSON.parse(fs.readFileSync(v02Path, "utf8"));
const v02ById = new Map(v02.map((document) => [document.id, document]));

const seller = `
Satıcı / sağlayıcı: Mavi Yeşil Ajans Ersin USTA
Şahıs işletmesi sahibi: Ersin USTA
Vergi dairesi: Ege Vergi Dairesi
Ticaret sicil numarası: 171925
FIXOKU marka tescili: 2023 118161
Alan adı: https://fixoku.com
Adres: Temsil Plaza, Mersinli Mah. (Yenişehir), 1202/2. Sk. No: 80/L, 35170 Konak / İzmir
İletişim: destek@fixoku.com · KVKK başvuruları: kvkk@fixoku.com
Telefon: +90 232 462 07 43 / +90 533 478 92 53
Çalışma saatleri: Pazartesi–Cumartesi 08.30–20.00`.trim();

const payment = `
Ödeme seçenekleri: PayTR kredi/banka kartı ve FIXOKU'nun kendi banka hesabına Havale/EFT/FAST. PayTR'nin Havale/EFT ürünü kullanılmaz. Banka transferinde eğitim veya dijital erişim, yalnızca FIXOKU yetkili işletme sorumlusunun gerçek banka hareketini doğrulamasından sonra açılır; dekont veya ekran görüntüsü tek başına ödeme kanıtı değildir.`.trim();

const businessRules = `
Fiyatlar tüketiciye KDV dâhil gösterilir. İşletme kararı kitap kaleminde %0, diğer ürün ve hizmetlerde %20'dir. Vergisel işlem türü ve faturadaki istisna kodu mali müşavir incelemesi tamamlanana kadar etkinleştirilmez. İlk ticari açılış dijital eğitimler ve eğitmenli paketlerle sınırlıdır; fiziksel kitap ve kargo satışı bu açılışta kapalıdır.`.trim();

const bodies = {
  1: `\n${seller}\n\n${businessRules}\n\nMavi Yeşil Ajans Ersin USTA, FIXOKU üzerinden kendi dijital eğitim paketlerini ve eğitmenli hizmetlerini doğrudan sunar. Eğitmenler bağımsız hizmet sağlayıcılarıdır; müşterinin sözleşmesi satıcıyla kurulur. Çocuk öğrenciler için hesap ve satın alma işlemi veli veya kanuni temsilci tarafından yapılır. Görüntülü dersler kaydedilmez. Başarılı ödeme doğrulamasından sonra satın alınan dijital eğitim hakkı ilgili paket koşullarına göre açılır.\n\nBu künye, FIXOKU'nun satıcı ve hizmet modelini açıklar. Tüketicinin diğer yasal hakları saklıdır.`,
  2: `\n${seller}\n\n1. Kapsam\nFixoku; dijital eğitim, eğitmenli eğitim ve ilgili hesap hizmetlerini sunan bir platformdur. Satışa ilişkin bilgiler, sipariş öncesi Ön Bilgilendirme Formu ve siparişe özel Mesafeli Satış Sözleşmesi ile birlikte değerlendirilir.\n\n2. Hesap ve güvenlik\nKullanıcı doğru ve güncel bilgi verir, hesap güvenliğini korur ve şüpheli işlemleri destek@fixoku.com adresine bildirir. Erişim sınırlandırmaları ölçülü uygulanır; kanuni başvuru hakları saklıdır.\n\n3. Satın alma ve erişim\n${payment}\nBaşarılı ödeme doğrulamasından sonra paket kapsamındaki dijital eğitim hakkı açılır. Paket süresi, seans sayısı, kapsam ve teknik gereksinimler satın alma ekranında ve sipariş özetinde gösterilir.\n\n4. Çocuk öğrenciler\nÇocuk öğrencinin hesabı ve satın alma işlemi veli veya kanuni temsilci tarafından yapılır. Çocuğun tek başına sözleşme onayı verdiği varsayılmaz; temsil ve yaş doğrulaması uygulanır.\n\n5. Eğitmenli hizmet\nEğitmenler bağımsız hizmet sağlayıcılarıdır. İlk ders başlamadan yapılan uygun iptal taleplerinde tam iade uygulanır; cayma, ayıplı veya eksik ifa ve diğer tüketici hakları saklıdır. Görüntülü dersler kaydedilmez.\n\n6. Fikrî haklar, veri ve değişiklikler\nİçerikler sözleşmede tanınan kullanım amacıyla kullanılır. Kişisel veriler ilgili aydınlatma metinlerinde açıklanan amaçlarla sınırlı işlenir. Pazarlama izinleri üyelik veya satın alma şartı değildir.`,
  3: `\n${seller}\n\n${businessRules}\n\n${payment}\n\nBu form, her sipariş için gerçek sipariş verileriyle oluşturulur ve ödeme adımından önce tüketiciye gösterilir. Ürün veya hizmet satırları; ad, kapsam, adet, kullanım süresi, seans niteliği, teknik gereksinim ve bedel bilgilerini içerir. Alıcı, sipariş kimliği, fiyat, vergi, ödeme yöntemi, varsa teslimat ve ilgili onay kayıtları gerçek işlemden alınır. Boş veya gerçek veriye bağlanmamış sipariş alanlarıyla satış tamamlanmaz.\n\nDijital eğitim hakkı, PayTR'nin doğrulanmış başarılı ödeme bildirimi veya FIXOKU banka hesabındaki gerçek tahsilatın yetkili işletme sorumlusu tarafından teyidi sonrasında açılır. Fiziksel kitap ve kargo satışı ilk ticari açılışta kullanılmaz.\n\nTüketicinin cayma, iade, ayıplı ifa, eksik ifa ve diğer yasal hakları saklıdır. Eğitmenli hizmette ilk ders başlamadan yapılan uygun iptal talebinde tam iade uygulanır. Dijital içeriğe erişim ve olası cayma istisnaları, sipariş türüne ve gerekli ayrı açık onaya göre değerlendirilir.`,
  4: `\n${seller}\n\nBu sözleşme, FIXOKU üzerinden verilen belirli bir sipariş için gerçek alıcı, ürün, bedel, vergi, ödeme, teslim veya hizmet ifası ve onay kayıtları kullanılarak oluşturulur. Siparişe özel metin, ödeme öncesinde tüketiciye gösterilir ve satın alma sonrasında kalıcı veri saklayıcısıyla iletilir.\n\n${payment}\n\nDijital eğitim hakkı gerçek tahsilat doğrulamasından sonra açılır. Çocuk öğrencinin siparişi veli veya kanuni temsilci tarafından verilir. Eğitmenli hizmette ilk ders başlamadan yapılan uygun iptal talebinde tam iade uygulanır; kanuni cayma, ayıplı veya eksik ifa ve diğer tüketici hakları saklıdır. Görüntülü dersler kaydedilmez.\n\nİlk ticari açılışta fiziksel kitap ve kargo satışı yapılmaz. Karma veya ileride açılacak fiziksel ürün siparişlerinde ürün satırları, teslimat ve kargo bilgileri gerçek işlem verilerinden ayrıca gösterilir.`,
  5: `\n${seller}\n\n1. Genel ilke\nTüketicinin cayma, iade, ayıplı mal veya hizmet, eksik ifa ve diğer kanuni hakları korunur. Bu politika hiçbir yasal hakkı genel bir hükümle ortadan kaldırmaz.\n\n2. Eğitmenli hizmet\nİlk ders başlamadan yapılan uygun iptal talebinde tahsil edilen bedelin tamamı iade edilir. İlk ders başladıktan sonra başvurular hizmetin fiilî durumu ve uygulanabilir tüketici mevzuatına göre değerlendirilir. Eğitmenin ertelemesi veya hizmetin eksik ya da ayıplı ifası satıcının tüketiciye karşı yükümlülüklerini ortadan kaldırmaz.\n\n3. Dijital eğitim\nErişim gerçek ödeme doğrulamasından sonra açılır. Dijital içeriğin ifasına başlanması veya cayma hakkı istisnası, ürün türü ve tüketicinin gerekli ayrı açık talebi/onayına göre değerlendirilir; paket açıldı diye tüm dijital alımlar otomatik olarak iade dışı bırakılamaz.\n\n4. Ödeme ve başvuru\n${payment}\nCayma ve iade talepleri sipariş numarasıyla destek@fixoku.com adresine iletilebilir. İade, ödeme yöntemine ve uygulanabilir yasal süreye uygun olarak yürütülür.\n\n5. Fiziksel ürünler\nFiziksel kitap ve kargo satışı ilk ticari açılışta kapalıdır. Fiziksel satış açılırsa teslim, iade taşıyıcısı, ücret ve ürün bazlı kurallar ödeme öncesinde ayrıca gösterilir.`,
  6: `\n${seller}\n\nFiziksel kitap ve kargo satışı FIXOKU'nun ilk ticari açılışında yapılmaz. Bu nedenle ilk açılışta tüketiciden kitap veya kargo bedeli alınmaz.\n\nFiziksel ürün satışı ileride açılırsa ürün sayfasında ve sipariş özetinde gerçek stok, taşıyıcı, kargo ücreti, hazırlama süresi, azami teslim süresi, takip bilgisi, iade adresi ve iade taşıyıcısı ödeme öncesinde gösterilir. Sahte takip numarası veya doğrulanmamış teslim taahhüdü oluşturulmaz.\n\nYanlış, eksik veya hasarlı teslimat ile gecikme başvuruları destek@fixoku.com üzerinden alınır. Tüketicinin cayma, ayıplı ifa ve diğer yasal hakları saklıdır. İade adresi: Temsil Plaza, Mersinli Mah. (Yenişehir), 1202/2. Sk. No: 80/L, 35170 Konak / İzmir.`,
  7: `\n${seller}\n\n${businessRules}\n\n1. Hizmet kapsamı\nFIXOKU dijital eğitim içerikleri, birebir veya grup eğitmenli hizmetleri ve ilgili paketleri ayrı veya birlikte sunabilir. Her ürünün erişim süresi, seans sayısı, kapsamı, kontenjanı, teknik gereksinimleri ve bedeli satın alma ekranında açıklanır.\n\n2. Ödeme ve erişim\n${payment}\nBaşarılı ödeme doğrulamasından sonra satın alınan dijital eğitim hakkı açılır.\n\n3. Çocuk öğrenciler ve kayıt\nÇocuk adına hesap ve satın alma veli veya kanuni temsilci tarafından yapılır. Görüntülü dersler kaydedilmez. Öğretmen erişimi yalnızca ilgili aktif atamanın gerektirdiği ölçüde verilir.\n\n4. Eğitmenli hizmet ve iade\nİlk ders başlamadan yapılan uygun iptal talebinde tam iade uygulanır. Hizmetin başlamaması, eksik veya ayıplı ifası ve diğer tüketici hakları mevzuata göre değerlendirilir. Eğitmenler bağımsız hizmet sağlayıcılarıdır; bu durum FIXOKU'nun tüketiciye karşı yükümlülüklerini ortadan kaldırmaz.\n\n5. Eğitmen paketleri\nBir eğitmen eğitim paketinin kapsadığı uzmanlıklar, başarılı ödeme doğrulamasıyla teknik olarak ilgili hesaba tanımlanabilir. Bu tanım, mevzuatın aradığı mesleki ruhsat veya sertifikanın verildiği anlamına gelmez.`,
  8: `\n${seller}\n\n1. Veri sorumlusu\nMavi Yeşil Ajans Ersin USTA, FIXOKU hizmetleri bakımından veri sorumlusudur. Başvurular kvkk@fixoku.com adresinden alınır.\n\n2. İşlenen veri grupları\nHesap, iletişim, sipariş, ödeme doğrulaması, eğitim ve atama kayıtları; çocuk öğrenciler bakımından gerekli temsil ve eğitim bilgileri; eğitmenler bakımından başvuru, uzmanlık, atama ve hakediş bilgileri; destek başvuruları ve güvenlik kayıtları, hizmetin gerektirdiği ölçüde işlenebilir. Gerçekte toplanmayan veri kategorileri işlenmiş gibi gösterilmez.\n\n3. Amaç ve hukuki sebep\nVeriler hesap ve sözleşmenin kurulması veya ifası, ödeme ve muhasebe yükümlülükleri, hizmet güvenliği, destek ve uyuşmazlık yönetimi amaçlarıyla gerekli ölçüde işlenir. Zorunlu olmayan analiz ve pazarlama faaliyetleri ayrı ve geçerli izin kurallarına tabidir.\n\n4. Aktarım ve saklama\nÖdeme için PayTR ve banka, hizmet için gerekli teknik sağlayıcılar ve eğitmenler, yalnızca işlem amacı ve yetki sınırları içinde alıcı olabilir. Görüntülü ders kaydı tutulmaz. Hizmet sağlayıcı, ülke, saklama ve aktarım ayrıntıları gerçek veri envanterine göre açıklanır; doğrulanmamış bir sağlayıcı veya süre kesin bilgi gibi sunulmaz.\n\n5. Çocuklar ve haklar\nÇocuk öğrencilerin verilerine yaşa uygun bilgilendirme, kanuni temsilci doğrulaması ve asgari yetki ilkesiyle erişilir. İlgili kişiler 6698 sayılı Kanun kapsamındaki hakları için kvkk@fixoku.com adresine başvurabilir.`,
  9: `\n${seller}\n\nÇocuk öğrencinin ilk hesabı ve satın alma işlemi veli veya kanuni temsilci tarafından yapılır. Çocuğun eğitim ve ilerleme kayıtları ayrı çocuk profiliyle yönetilir; öğretmen erişimi yalnızca aktif atamanın gerektirdiği ölçüdedir. Görüntülü dersler kaydedilmez.\n\nÇocuğa açıklama\nFixoku, eğitimini planlamak ve gelişimini takip etmek için adın, sınıfın, eğitim paketin ve öğrenme çalışmaların gibi gerekli bilgileri kullanabilir. Bu bilgilere yalnızca görevi gerektiren kişiler erişir. Şifreni paylaşma; yardıma ihtiyacın olursa güvendiğin yetişkinden veya destek@fixoku.com adresinden yardım iste.\n\nVeli veya kanuni temsilci; temsil yetkisi, yaşa uygun bilgilendirme, satın alma, veri erişimi ve gerektiğinde onay süreçlerinden sorumludur. Genel üyelik kabulü çocuğun adına tüm işlemleri kendiliğinden geçerli kılmaz. Temsil doğrulaması ve veri erişimi, işlemin niteliğine göre uygulanır. Çocuğun görüntüsü, başarı ölçümü veya referansı reklam amacıyla gerekli ayrı değerlendirme ve izin olmadan kullanılmaz.`,
  10: `\n${seller}\n\nEğitmenler FIXOKU personeli değil, bağımsız hizmet sağlayıcılarıdır. Eğitmen başvurusu, davet, uzmanlık, öğrenci veya grup ataması, profil, hakediş ve ödeme süreçleri için gerekli kişisel veriler amaçla sınırlı işlenir.\n\nİsim, iletişim, profil, uzmanlık, atama, hakediş ve ödeme bilgileri; sözleşmenin yürütülmesi, ödeme ve vergi yükümlülükleri, güvenlik ve uyuşmazlık yönetimi için gerekli ölçüde kullanılabilir. Gereksiz özel nitelikli veri veya öğrenci verisi talep edilmez.\n\nEğitmene yalnızca aktif atamasını yürütmek için gerekli öğrenci bilgisi gösterilir. Atama sona erdiğinde erişim güncellenir; kişisel pazarlama veya ilgisiz üçüncü taraf paylaşımı yapılmaz. Hakedişin vergisel belgelendirme ve ödeme biçimi, eğitmenin durumuna ve uygulanabilir mevzuata göre belirlenir.\n\nBaşvuru ve KVKK talepleri kvkk@fixoku.com adresinden iletilebilir.`,
  11: `\n${seller}\n\nFIXOKU, hesap, sipariş ve eğitim bilgilerinin yetkisiz erişim, kayıp ve amaç dışı kullanımı riskini azaltmak için rol ve görev temelli erişim, güvenli kimlik doğrulama, yetki iptali, denetim kayıtları ve olay değerlendirmesi gibi uygun kontrolleri uygular. Kullanıcı verileri yalnızca gerekli amaç ve yetki kapsamında erişilebilir.\n\nÖdeme kartı bilgileri PayTR'nin ödeme akışı üzerinden işlenir; FIXOKU tam kart bilgisi saklamaz. Görüntülü dersler kaydedilmez. Çocuk öğrencilerin eğitim ve ilerleme kayıtlarına asgari yetkiyle erişilir.\n\nBir güvenlik şüphesi destek@fixoku.com, kişisel veri başvurusu kvkk@fixoku.com üzerinden bildirilir. Teknik kontroller ve hizmet sağlayıcı bilgileri yalnızca fiilen kullanılan ve doğrulanan yapı için açıklanır; sınırsız güvenlik garantisi verilmez.`,
  12: `\n${seller}\n\nFixoku web sitesi ve kullanıcı panellerinde kullanılan çerezler ve benzer teknolojiler, işlevlerin yürütülmesi ve tercihlerin yönetilmesi amacıyla kullanılır.\n\nKesinlikle gerekli teknolojiler; oturum, giriş, sepet ve güvenlik gibi hizmet için zorunlu işlevlerle sınırlıdır. Tercih, analiz ve pazarlama teknolojileri gerekli bilgilendirme ve aktif kullanıcı tercihi olmadan başlatılmaz. Kullanıcı Kabul et, Reddet ve Tercihleri yönet seçeneklerine dengeli biçimde erişebilir; verdiği tercihleri sonradan değiştirebilir.\n\nÇerez tercihi e-posta, SMS veya WhatsApp ticari ileti izni değildir. Gerçek çerez adı, sağlayıcısı, alan adı, süresi, kategorisi, aktarım bilgisi ve rıza gereği kullanılan teknolojiye göre çerez tercih panelinde gösterilir. Sorular kvkk@fixoku.com adresinden alınır.`,
  13: `\n${seller}\n\nTicari elektronik iletiler isteğe bağlıdır ve üyelik ya da satın alma hizmetinin şartı değildir. Sipariş, ödeme, hesap güvenliği ve şifre gibi işlemsel bildirimler pazarlama iletilerinden ayrı yürütülür.\n\nKullanıcı, FIXOKU eğitimleri ve kampanyaları için e-posta, SMS veya WhatsApp kanallarını ayrı ayrı seçebilir. Önceden işaretli kutu kullanılmaz; kanal, kapsam, metin sürümü, tarih ve izin kanıtı kaydedilir. Kullanıcı iznini kolayca geri çekebilir ve ret talebi nedeniyle ek ücret veya hizmet kaybı yaşamaz.\n\nİletilerde gönderici kimliği ve kolay ret yöntemi bulunur. İYS ve diğer mevzuat yükümlülükleri tamamlanmadan pazarlama gönderimi başlatılmaz. Ret talepleri destek@fixoku.com üzerinden alınır; uygun kanallardaki doğrudan ret yöntemi ayrıca işletilir.`,
  14: `\n${seller}\n\nAçık rıza, aydınlatma yükümlülüğünden ayrı ve isteğe bağlıdır. Yalnızca belirli, açıkça anlatılmış ve hizmet için zorunlu olmayan bir işleme amacı için alınır; üyelik veya satın alma rızaya bağlanmaz.\n\nKişiselleştirilmiş ürün önerisi, analiz veya reklam gibi bir amaç için rıza istenirse işlenecek veri kategorileri, amaç, alıcılar, saklama süresi, yurt dışı aktarım güvenceleri ve geri çekme yöntemi rıza ekranında açıkça gösterilir. Bu bilgiler gösterilmeden ilgili seçenek sunulmaz.\n\nRıza kaydı metin sürümü, amaç, kanal ve tarih bilgisiyle tutulur. Rıza ileriye dönük işlemler bakımından her zaman geri çekilebilir. Çocuklar için yaş ve kanuni temsil koşulları ayrıca değerlendirilir.`,
  15: `\n${seller}\n\nKVKK kapsamındaki talepler kvkk@fixoku.com adresine veya mevzuatta öngörülen geçerli diğer kanallara iletilebilir. İlgili kişi veya yetkili kanuni temsilci, başvurunun işlenmesi için gerekli asgari kimlik ve temsil bilgisini sunar; gereksiz kimlik belgesi istenmez.\n\nBaşvuru; referans, kanal, tarih ve talep türüyle kaydedilir. Kimlik ve temsil yetkisi ölçülü biçimde doğrulanır. Erişim, düzeltme, silme, aktarım, itiraz ve diğer talepler ilgili süreç sahibine yönlendirilir. Kanuni cevap süresi izlenir ve yanıt gerekçeli olarak iletilir. Kanuni saklama yükümlülüğü bulunan kayıtlar korunur ve gerekçe açıklanır.\n\nBaşvuruda şifre, kart numarası veya gereksiz özel nitelikli veri paylaşılmamalıdır.`,
  16: `\n${seller}\n\nSipariş, ödeme, dijital erişim, eğitmen ataması, teslimat, fatura ve iade başvuruları destek@fixoku.com üzerinden alınır. Başvuru için sipariş numarası ve sorunun kısa açıklaması yeterlidir; gereksiz veri istenmez.\n\nBaşvuruya bir takip numarası verilir; konu, sorumlu, uygulanabilir yasal süre, sonraki işlem ve sonuç izlenir. Gerekli hallerde düzeltme, telafi, iade veya ilgili uzman değerlendirmesi yapılır. Eğitmenli hizmette ilk ders başlamadan yapılan uygun iptal talebinde tam iade uygulanır; ders sonrasında kanuni tüketici hakları korunur.\n\nTüketiciler, yürürlükteki parasal sınırlar ve yetki kuralları çerçevesinde tüketici hakem heyeti veya tüketici mahkemelerine başvurabilir. KVKK talepleri 15 numaralı başvuru sürecine göre yürütülür.`
};

const requiredEvidence = {
  1: ["Güncel vergi levhası ve resmî vergi kimlik bilgisinin teyidi", "Ticaret sicil numarası 171925 için resmî belge"],
  2: ["Güncel satıcı kimliğinin hukuki incelemesi", "Çocuk kanuni temsil doğrulama akışı"],
  3: ["Sipariş alanlarının gerçek checkout verisinden üretimi", "Ürün bazlı cayma ve KDV kararı", "Satıcı tanımlayıcılarının teyidi"],
  4: ["Sipariş snapshot ve immutable sürüm kaydı", "Ürün, vergi, teslimat ve onay alanlarının gerçek verilerden üretimi"],
  5: ["Ürün bazlı cayma istisnası ve iade akışı", "Mali müşavir KDV/fatura değerlendirmesi"],
  6: ["Fiziksel ürün satışının yeniden açılması için taşıyıcı, tarife ve süre kanıtı"],
  7: ["Paket süreleri, kapsamı ve seans bilgilerinin katalogla eşleştirilmesi", "Hukuki inceleme ve KDV kararı"],
  8: ["Gerçek veri envanteri, sağlayıcı/ülke ve saklama çizelgesi", "Resmî veri sorumlusu tanımlayıcıları"],
  9: ["Yaş, velayet ve kanuni temsil doğrulama yöntemi", "Çocuk veri erişimi ve temsil geri çekme akışı"],
  10: ["Bağımsız eğitmen sözleşme ve hakediş vergilendirme modeli", "Gerçek veri kategorileri ve saklama süreleri"],
  11: ["Fiilî barındırma, yedekleme, erişim ve olay yönetimi kanıtı"],
  12: ["Gerçek çerez/CMP envanteri ve yurt dışı aktarım değerlendirmesi"],
  13: ["İYS kaydı, mevcut izin kanıtları ve çalışan ret mekanizması"],
  14: ["Amaç, veri kategorisi, alıcı, saklama ve aktarım alanlarının doldurulması"],
  15: ["Kimlik/temsil doğrulama ve başvuru kayıt sorumlusu"],
  16: ["Şikâyet kayıt sistemi, yasal süre takibi ve karar yetkisi"]
};

const dynamicFields = {
  3: ["buyer", "legalRepresentative", "orderLines", "unitPrices", "discount", "tax", "paymentMethod", "delivery", "cancellationBasis", "snapshotVersion", "acceptedAt", "orderId"],
  4: ["buyer", "orderId", "orderDate", "orderLines", "taxInclusiveTotal", "payment", "delivery", "snapshotVersion", "acceptanceRecord"],
  5: ["orderId", "productType", "paymentReference", "refundReference"],
  6: ["deliveryAddress", "carrier", "shippingFee", "deliveryDeadline", "trackingReference"],
  7: ["packageId", "accessPeriod", "sessionCount", "scope", "startAt"],
  8: ["dataCategories", "providers", "retentionSchedule"],
  9: ["childProfileId", "representativeVerification", "accessScope"],
  10: ["trainerProfile", "assignmentScope", "payoutReference"]
};

const customer = Object.entries(bodies).map(([id, markdown]) => {
  const n = Number(id);
  const original = v02ById.get(n);
  const text = `# ${original.title}\n\n**Belge sürümü:** 1.0 · **Tarih:** 20.10.2026\n\n${markdown.trim()}\n`;
  return {
    ...original,
    markdown: text,
    sourceVersion: "1.0",
    sourceDate: "2026-10-20",
    derivedFromVersion: "0.2",
    originalSha256: crypto.createHash("sha256").update(original.markdown, "utf8").digest("hex"),
    contentSha256: crypto.createHash("sha256").update(text, "utf8").digest("hex"),
    publicationStatus: "BLOCKED_P0",
    requiredEvidence: requiredEvidence[n],
    dynamicFields: dynamicFields[n] || [],
    changeSummary: "İç taslak, onay ve geliştirme notları çıkarıldı; satış modeli, tüketici hakları ve gerçek sipariş alanları korunarak sadeleştirildi."
  };
});

const internal = v02.filter((document) => document.internal).map((document) => ({
  ...document,
  sourceVersion: "0.2",
  sourceDate: "2026-10-19",
  derivedFromVersion: "0.2",
  originalSha256: crypto.createHash("sha256").update(document.markdown, "utf8").digest("hex"),
  publicationStatus: "INTERNAL_ONLY",
  requiredEvidence: ["İç inceleme kapsamında Owner ve hukuk kanıtı"],
  dynamicFields: [],
  changeSummary: "İç yönetim belgesi korunmuştur; public route/API için kapalıdır."
}));

const documents = [...customer, ...internal].sort((a, b) => a.id - b.id);
fs.writeFileSync(v10Path, `${JSON.stringify(documents, null, 2)}\n`, "utf8");

const p0 = [
  "# FIXOKU R73 — P0 Zorunlu Bilgi ve Yayın Engeli Raporu",
  "",
  "**Tarih:** 20.10.2026",
  "**Kapsam:** 16 müşteri belgesi v1.0 hazırlık metni",
  "**Karar:** Hiçbir müşteri belgesi bu rapordaki zorunlu kanıtlar tamamlanmadan PUBLISHED durumuna geçirilemez.",
  "",
  "> Ersin USTA'nın işletme içeriğini onayladığı bilgisi kayda alınmış bir Owner onayı, hukukçu görüşü veya yayına alma kararı değildir. approved_by, approved_at ya da hukuk kanıtı üretilmemiştir.",
  "",
  "## Ortak P0 engeller",
  "",
  "1. Güncel vergi levhası ve resmî vergi kimlik bilgisinin niteliği/numarası sağlanmadı; hiçbir numara uydurulmayacaktır.",
  "2. Ticaret sicil numarası 171925 için resmî belge teyidi açık.",
  "3. 21 belgenin hukuki incelemesi ve belge bazında Owner kararı kaydedilmedi.",
  "4. Kitap %0, diğer ürün/hizmet %20 işletme kararı için mali müşavir incelemesi, işlem türü ve fatura istisna kodu kanıtı yok.",
  "5. 0041 migration kalıcı Owner DB/Neon'a uygulanmadı; yayın butonları kapalı kalmalıdır.",
  "",
  "## Belge bazında P0",
  "",
  ...customer.map((document) => `- **${String(document.id).padStart(2, "0")} — ${document.title}:** BLOCKED_P0 — ${document.requiredEvidence.join("; ")}.`),
  "",
  "## Açılış kapsamı",
  "",
  "İlk ticari açılış dijital eğitim ve eğitmenli paketlerle sınırlıdır. Fiziksel kitap/kargo satışı açılmadığı için 06 numaralı metin yalnızca gelecekteki kapsamı açıklar; fiziksel satış için ayrıca taşıyıcı, tarife, süre ve KDV kanıtı gerekir.",
  "",
  "## Checkout etkisi",
  "",
  "Hukuki belge ve KDV kararları EFFECTIVE/PUBLISHED olmadan checkout fail-closed kalır. Gerçek sipariş verisiyle ön bilgilendirme ve sözleşme snapshot'ı üretilemezse ödeme tamamlanmaz; manuel banka transferinde yetkili işletme tahsilat teyidi olmadan hak açılmaz."
].join("\n");
fs.writeFileSync(path.join(root, "docs", "legal", "FIXOKU_R73_P0_Eksik_Bilgi_Raporu.md"), `${p0}\n`, "utf8");

const diff = [
  "# FIXOKU R73 — V0.2 → V1.0 Fark Raporu",
  "",
  "**Kaynak:** `src/platform/admin/legal-owner-documents-v3.json`",
  "**Hazırlık çıktısı:** `src/platform/admin/legal-owner-documents-v10.json`",
  "**Sonuç:** 16 müşteri metni v1.0 hazırlık diline dönüştürüldü; 5 iç yönetim belgesi v0.2 olarak korundu.",
  "",
  "## Ortak dönüşümler",
  "",
  "- TASLAK, hukuki inceleme bekliyor, Owner talimatı ve teknik geliştirme/migration notları müşteri metinlerinden çıkarıldı.",
  "- Eski fixoku.com.tr geçiş bilgisi müşteri metinlerinden çıkarıldı; kanonik alan adı `https://fixoku.com` olarak kullanıldı.",
  "- Satıcı, ödeme, çocuk/kanuni temsil, görüntülü ders kaydı tutulmaması, başarılı ödeme sonrası erişim, eğitmenli hizmette ilk ders öncesi tam iade ve KDV kararları korunarak sadeleştirildi.",
  "- Siparişe özgü alanların gerçek sipariş verilerinden immutable snapshot olarak üretilmesi vurgulandı; statik boş alanlarla satış engellendi.",
  "- Teyitsiz zorunlu bilgiler müşteri metninde uydurulmadı; `BLOCKED_P0` metadata ve ayrı P0 raporu ile yayın kapısı korundu.",
  "",
  "## Belge sonuçları",
  "",
  ...customer.map((document) => `- **${String(document.id).padStart(2, "0")} — ${document.title}:** V0.2 → V1.0; ${document.changeSummary} Durum: ${document.publicationStatus}.`),
  "",
  "## İç belgeler",
  "",
  ...internal.map((document) => `- **${String(document.id).padStart(2, "0")} — ${document.title}:** v0.2 korunmuştur; ${document.publicationStatus}.`),
  "",
  "## Yayın sonucu",
  "",
  "V1.0 metinleri Owner paneli önizlemesi ve kanıt tamamlanması için hazırlanmıştır. Gerçek Owner oturumu, hukukçu kanıtı, mali müşavir KDV kanıtı, 0041 migration ve gerekli veri/entegrasyon kanıtları olmadan public route/API'ye bağlanmaz."
].join("\n");
fs.writeFileSync(path.join(root, "docs", "legal", "FIXOKU_R73_V02_V10_Diff.md"), `${diff}\n`, "utf8");

const readiness = [
  "# FIXOKU R73 — OWNER_APPROVAL_READINESS",
  "",
  "**Hazırlık durumu:** READY_FOR_OWNER_REVIEW / PUBLISHED değil",
  "**Onay sahibi:** Yetkili GLOBAL OWNER oturumu",
  "",
  "## Owner paneli akışı",
  "",
  "1. Owner, v0.2 kaynak metnini ve v1.0 önizlemesini aynı belge kimliğiyle açar.",
  "2. V0.2 → V1.0 farklarını, zorunlu kanıt listesini ve P0 raporunu inceler.",
  "3. Hukuki inceleme kanıtı, mali müşavir KDV kanıtı ve satıcı kimlik belgeleri sisteme gerçek referanslarıyla eklenir.",
  "4. Owner, gerçek oturumundan belge bazında APPROVED veya REJECTED kararı verir; actor, zaman, gerekçe ve içerik SHA-256 kaydedilir.",
  "5. Yayın adayı ancak hukuki inceleme + Owner onayı + ilgili işletme/KDV kanıtı tamamlanınca oluşturulur.",
  "6. PUBLISHED kararı ve canlı bağlantı, 0041 migration uygulanmış kalıcı DB'de transaction ve append-only audit ile yapılır.",
  "",
  "## Güvenlik kapıları",
  "",
  "- Yerel JSON düzenlemesi approved_by, approved_at veya hukuk kanıtı üretmez.",
  "- 0041 migration uygulanmadan server-side onay/yayın mutation'ları kapalıdır.",
  "- İç yönetim belgeleri (17–21) public route/API üzerinden yayınlanamaz.",
  "- V1.0 metinleri `BLOCKED_P0` durumundadır; checkout hukuk/KDV guard'ları gevşetilmez.",
  "- Gerçek Owner oturumu ve gerekli kanıtlar yoksa sonuç `OWNER_APPROVAL_READINESS=READY_FOR_OWNER_REVIEW`, `PUBLICATION_GATES=BLOCKED` olur."
].join("\n");
fs.writeFileSync(path.join(root, "docs", "legal", "FIXOKU_R73_OWNER_APPROVAL_READINESS.md"), `${readiness}\n`, "utf8");

const packageText = [
  "# FIXOKU R73 — V1.0 Owner Önizleme Paketi",
  "",
  "**Durum:** READY_FOR_OWNER_REVIEW / BLOCKED_P0",
  "**Kapsam:** 21 belge · 16 müşteri v1.0 hazırlık metni · 5 iç yönetim belgesi",
  "**Onay:** Gerçek Owner oturumundan alınmalıdır; bu paket onay kaydı üretmez.",
  "",
  "> V1.0 metinleri temiz müşteri dili için hazırlanmıştır. Zorunlu teyitsiz alanlar P0 raporunda listelenir ve publication gate kapalıdır.",
  "",
  "## Belge listesi",
  "",
  ...documents.map((document) => `${String(document.id).padStart(2, "0")}. ${document.title} — ${document.internal ? "İç yönetim / INTERNAL_ONLY" : `Müşteri / ${document.publicationStatus}`}`),
  "",
  "---",
  "",
  ...documents.flatMap((document) => [
    `## ${String(document.id).padStart(2, "0")} — ${document.title}`,
    "",
    `- **Kapsam:** ${document.internal ? "İç yönetim" : "Müşteri"}`,
    `- **Sürüm:** ${document.sourceVersion}`,
    `- **Durum:** ${document.publicationStatus}`,
    `- **Gerekli kanıtlar:** ${(document.requiredEvidence || []).join("; ")}`,
    "",
    document.markdown.trimEnd(),
    "",
    "---",
    ""
  ])
].join("\n");
fs.writeFileSync(path.join(root, "docs", "legal", "FIXOKU_R73_V10_OWNER_PREVIEW.md"), `${packageText}\n`, "utf8");

console.log(JSON.stringify({
  sourceVersion: "0.2",
  outputVersion: "1.0",
  documents: documents.length,
  customerDocuments: customer.length,
  internalDocuments: internal.length,
  publicationStatus: "BLOCKED_P0",
  databaseMutation: "NONE",
  ownerApproval: "NOT_RECORDED"
}));
