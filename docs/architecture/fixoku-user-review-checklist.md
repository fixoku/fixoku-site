# Fixoku kullanıcı inceleme kontrol listesi

Bu belge, Fixoku yerel inceleme sunucusunu teknik bilgi gerektirmeden denemeniz için hazırlanmıştır. Her ekranda sayfanın açılmasını, metinlerin anlaşılır olmasını ve düğmelerin beklenen işi yapmasını kontrol edin. Bir sorun görürseniz ekranın adresini ve ne olduğunu not edin.

## İnceleme adresi

- **Ana Sayfa:** http://127.0.0.1:5173/
- **Giriş:** http://127.0.0.1:5173/giris?returnTo=%2Fpanel%2Fowner

Yerel test giriş ekranındaki kimlikler:

- Ersin (Owner)
- Özlem KAPLAN (Eğitmen)
- Elif USTA (Eğitmen)
- Hatice Kübra USTA (Öğrenci)
- Ali Asaf USTA (Öğrenci)

Her kimlikte giriş düğmesine basın ve doğru panelin açıldığını kontrol edin. Çıkış yaptıktan sonra diğer kimlikle devam edin.

## Owner ve operasyon ekranları

- **Ersin Owner / finans özeti:** http://127.0.0.1:5173/panel/owner
- **E-posta Şablonları:** http://127.0.0.1:5173/panel/owner/e-posta-sablonlari
- **Ölçümleme:** http://127.0.0.1:5173/panel/owner/olcumleme
- **Yasal Hazırlık:** http://127.0.0.1:5173/panel/owner/yasal-hazirlik
- **Sağlayıcı Durumu:** http://127.0.0.1:5173/panel/owner/saglayicilar
- **Bildirimler:** http://127.0.0.1:5173/panel/bildirimler
- **Yönetim kargo ekranı:** http://127.0.0.1:5173/panel/admin/kargo

Kontroller:

- görünüm doğru mu?
- başlıklar ve açıklamalar anlaşılır mı?
- çalışan düğmeler beklenen sonucu veriyor mu?
- devre dışı veya yapılandırma bekleyen işlemin nedeni açıkça yazıyor mu?
- yetkiniz olmayan bir ekran güvenli biçimde engelleniyor mu?
- telefonda yatay taşma var mı?

Ölçümleme ekranında gerçek kimlik veya gizli anahtar görünmemelidir. GTM, GA4, Google Ads, Meta ve TikTok için yapılandırma bekleyen durumun açıkça gösterilmesi beklenir.

E-posta ekranında seçim kutusundan şablonları tek tek seçin. Konu, gönderen, Yanıtla adresi, HTML ve düz metin önizlemelerini kontrol edin. Masaüstü ve mobil görünüm düğmelerini deneyin.

Yasal hazırlık ekranında yedi adet `LEGAL_VALUE_REQUIRED` maddesinin ve üretim yayınının hukuk incelemesi beklediğinin görünür olduğunu kontrol edin. Eksik şirket bilgileri uydurulmamalıdır.

Sağlayıcı durumunda kargo firmasının henüz seçilmediği ve ShipEntegra'nın etkin olmadığı açıkça görünmelidir.

## Öğrenci ekranları

- **Öğrenci paneli:** http://127.0.0.1:5173/panel/ogrenci
- **Student profile / Profilim:** http://127.0.0.1:5173/panel/ogrenci/profil
- **Checkout / Paketler:** http://127.0.0.1:5173/panel/ogrenci/paketler
- **Student shipment / Kargolarım:** http://127.0.0.1:5173/panel/ogrenci/kargolar
- **Notifications / Bildirimler:** http://127.0.0.1:5173/panel/bildirimler

Hatice ve Ali ile giriş yaparak:

- profil bilgilerinin okunabilir olduğunu,
- paket ve erişim durumlarının anlaşılır olduğunu,
- kargo durumunun ve ürün satırlarının düzgün göründüğünü,
- bildirimlerin açılabildiğini ve okundu durumunun anlaşılır olduğunu,
- sayfanın telefonda kullanılabildiğini kontrol edin.

Bir paket için **Sipariş başlat** akışını deneyin. Checkout ekranında ürün/paket, tutar, para birimi, teslim bilgisi, ön bilgilendirme, mesafeli satış, KVKK ve isteğe bağlı pazarlama seçeneği görünmelidir. Zorunlu üç onay verilmeden devam düğmesi çalışmamalı; isteğe bağlı pazarlama seçeneği önceden işaretli olmamalıdır. PayTR kimlik bilgileri bulunmadığı için beklenen durum `Ödeme sistemi henüz yapılandırılmadı.` mesajıdır; sahte ödeme başarısı gösterilmemelidir.

## Eğitmen ekranları

- **Trainer profile / Profil:** http://127.0.0.1:5173/panel/egitmen/profil
- **Eğitmen paneli:** http://127.0.0.1:5173/panel/egitmen
- **Eğitimlerim:** http://127.0.0.1:5173/panel/egitmen/egitimlerim
- **Sunumlarım:** http://127.0.0.1:5173/panel/egitmen/sunumlarim
- **Kaynaklarım:** http://127.0.0.1:5173/panel/egitmen/kaynaklarim
- **Müsaitlik:** http://127.0.0.1:5173/panel/egitmen/musaitlik
- **Bakiye / kazançlar:** http://127.0.0.1:5173/panel/egitmen/bakiyem
- **Trainer payout / ödeme hesabı:** http://127.0.0.1:5173/panel/egitmen/payout-hesabim

Özlem ve Elif ile ayrı ayrı giriş yapın. Profilde kaydet düğmesini, müsaitlikte ekleme işlemini ve ödeme hesabındaki alanların kullanılabilirliğini kontrol edin. Gerçek banka bilgisi girmeyin; yalnızca ekran düzenini ve doğrulama mesajlarını inceleyin.

## Genel site ve yasal metinler

- **KVKK:** http://127.0.0.1:5173/kvkk-aydinlatma-metni
- **Gizlilik Politikası:** http://127.0.0.1:5173/gizlilik-politikasi
- **Çerez Politikası:** http://127.0.0.1:5173/cerez-politikasi
- **Açık Rıza:** http://127.0.0.1:5173/acik-riza
- **Ticari Elektronik İleti:** http://127.0.0.1:5173/ticari-elektronik-ileti
- **Kullanım Koşulları:** http://127.0.0.1:5173/kullanim-kosullari
- **Üyelik Sözleşmesi:** http://127.0.0.1:5173/uyelik-sozlesmesi
- **Mesafeli Satış:** http://127.0.0.1:5173/mesafeli-satis-sozlesmesi
- **Ön Bilgilendirme Formu:** http://127.0.0.1:5173/on-bilgilendirme-formu
- **İptal, İade ve Cayma:** http://127.0.0.1:5173/iptal-iade-cayma-politikasi
- **Teslimat ve Kargo:** http://127.0.0.1:5173/teslimat-kargo-politikasi
- **Dijital İçerik ve Hizmet Koşulları:** http://127.0.0.1:5173/dijital-icerik-ve-hizmet-kosullari
- **Veri Sahibi Başvuru Formu:** http://127.0.0.1:5173/veri-sahibi-basvuru-formu
- **İletişim:** http://127.0.0.1:5173/iletisim

Her sayfada:

- sayfa açılıyor mu?
- başlık ve paragraflar okunabilir mi?
- ham şablon işareti veya `undefined`/`null` görünüyor mu?
- metin telefonda taşmadan okunuyor mu?
- alt bilgi bağlantıları doğru sayfaya götürüyor mu?

## Çerez ve gizlilik denemesi

İlk ziyarette çerez bandının göründüğünü ve **Tümünü Kabul Et**, **Tümünü Reddet**, **Tercihleri Yönet** düğmelerinin bulunduğunu kontrol edin. Tümünü kabul etme, tümünü reddetme ve tercihleri tek tek kaydetme seçeneklerini ayrı tarayıcı bağlamlarında deneyin. Sayfayı yenilediğinizde seçimin korunmasını kontrol edin. Alt bilgideki **Çerez Tercihleri** bağlantısı yöneticiyi yeniden açmalıdır.

Telefon kontrolünde önerilen görünüm 390×844, masaüstünde 1440×900'dür. Menü, pencereler, formlar ve çerez yöneticisi ekrana sığmalıdır. Yatay kaydırma oluşursa adresi ve ekran görüntüsünü not edin.

## Geri bildirim

Her ekran için şu kısa notları kullanabilirsiniz:

- görünüm doğru mu?
- metin anlaşılır mı?
- buton çalışıyor mu?
- telefonda taşma var mı?
- değiştirmek istediğiniz metin var mı?
- gördüğünüz sorun hangi adres ve hangi kullanıcıyla oluştu?

Bu yerel inceleme ortamında gerçek PayTR, SMTP, S3, kargo, GTM, GA4, Google Ads, Meta veya TikTok hesabı kullanılmaz. Yapılandırma bekleyen durumlar, gerçek hesap bilgileri sağlanana kadar beklenen davranıştır.
