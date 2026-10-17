// Fixoku kurumsal mesaj içerikleri. Bu dosya tek başına e-posta göndermez.
export const EMAIL_EDITORIAL_V1 = Object.freeze({
  "welcome": {
    "subject": "Fixoku | Eğitim yolculuğunuza hoş geldiniz",
    "title": "Fixoku ailesine hoş geldiniz",
    "paragraphs": [
      "Fixoku'ya katıldığınız için teşekkür ederiz. Okuma becerilerinizi geliştirmeye yönelik eğitimlerimizi ve size uygun kaynakları hesabınızdan inceleyebilirsiniz.",
      "Eğitim yolculuğunuzun her aşamasında anlaşılır ve güvenilir bir deneyim sunmak için buradayız."
    ],
    "fields": [],
    "cta": "Hesabıma git",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz"
    },
    "required": [],
    "status": "review"
  },
  "email-verification": {
    "subject": "Fixoku | E-posta adresinizi doğrulayın",
    "title": "E-posta adresinizi doğrulayın",
    "paragraphs": [
      "Hesabınızın güvenliği ve size doğru şekilde ulaşabilmemiz için e-posta adresinizi doğrulamanızı rica ederiz.",
      "Bu işlemi siz başlatmadıysanız e-postayı dikkate almayabilirsiniz."
    ],
    "fields": [],
    "cta": "E-postamı doğrula",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "actionUrl": "https://fixoku.com/giris?ornek=1"
    },
    "required": [
      "actionUrl"
    ],
    "status": "review"
  },
  "password-reset": {
    "subject": "Fixoku | Şifre yenileme isteğiniz",
    "title": "Şifrenizi güvenle yenileyin",
    "paragraphs": [
      "Hesabınız için bir şifre yenileme isteği aldık. İşlemi siz başlattıysanız aşağıdaki bağlantıyı kullanabilirsiniz.",
      "Bu isteği siz oluşturmadıysanız hesabınızda değişiklik yapmanız gerekmez."
    ],
    "fields": [],
    "cta": "Şifremi yenile",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "actionUrl": "https://fixoku.com/giris?ornek-sifre=1"
    },
    "required": [
      "actionUrl"
    ],
    "status": "review"
  },
  "profile-completion": {
    "subject": "Fixoku | Profilinizi tamamlayın",
    "title": "Profilinizde birkaç adım kaldı",
    "paragraphs": [
      "Eğitim ve destek süreçlerini size uygun biçimde sürdürebilmemiz için profilinizdeki eksik alanları tamamlamanızı rica ederiz.",
      "Bilgilerinizi hesabınızdan dilediğiniz zaman inceleyebilirsiniz."
    ],
    "fields": [],
    "cta": "Profilimi görüntüle",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz"
    },
    "required": [],
    "status": "review"
  },
  "order-received": {
    "subject": "Fixoku | Siparişiniz alındı",
    "title": "Siparişinizi aldık",
    "paragraphs": [
      "Fixoku'yu tercih ettiğiniz için teşekkür ederiz. Siparişiniz kayda alındı; işlem durumunu hesabınızdan takip edebilirsiniz.",
      "Fiziksel ürün içeren siparişlerde gönderim bilgileri hazır olduğunda ayrıca bilgilendirileceksiniz."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Ürün / paket",
        "key": "packageName"
      }
    ],
    "cta": "Siparişimi görüntüle",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1001",
      "packageName": "Hızlı Okuma Başlangıç Paketi"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "payment-successful": {
    "subject": "Fixoku | Ödemeniz onaylandı",
    "title": "Ödemeniz başarıyla onaylandı",
    "paragraphs": [
      "Ödemenizin onaylandığını memnuniyetle bildiririz. Satın aldığınız ürün veya eğitime ilişkin erişim ve teslimat bilgilerini hesabınızdan takip edebilirsiniz.",
      "Eğitmen uzmanlık paketlerinde satın alınan yetkinlikler, doğrulanan ödeme sonrasında paket kapsamına göre etkinleşir."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Ödenen tutar",
        "key": "amount"
      },
      {
        "label": "Ürün / paket",
        "key": "packageName"
      }
    ],
    "cta": "Satın alımımı incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-ODM-1002",
      "amount": "1.250,00 ₺",
      "packageName": "Fixoku Hızlı Okuma Eğitimi"
    },
    "required": [
      "reference",
      "amount"
    ],
    "status": "review"
  },
  "payment-failed": {
    "subject": "Fixoku | Ödemeniz tamamlanamadı",
    "title": "Ödeme işleminiz tamamlanamadı",
    "paragraphs": [
      "Ödeme işleminiz ödeme hizmeti tarafından tamamlanamadı. Hesabınızdan sipariş durumunu kontrol ederek uygun olduğunuzda yeniden deneyebilirsiniz.",
      "Ödeme alınmadıysa siparişin ödendiğini varsaymayın. Bir sorun yaşarsanız destek ekibimiz yardımcı olmaktan memnuniyet duyar."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Ürün / paket",
        "key": "packageName"
      }
    ],
    "cta": "Siparişimi kontrol et",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1003",
      "packageName": "Paragraf Çalışma Seti"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "package-activated": {
    "subject": "Fixoku | Eğitim paketiniz kullanıma hazır",
    "title": "Paketiniz etkinleştirildi",
    "paragraphs": [
      "Satın aldığınız eğitim paketinin hesabınızda etkinleştirildiğini memnuniyetle bildiririz.",
      "Eğitim içeriklerine ve kullanım ayrıntılarına paneliniz üzerinden erişebilirsiniz."
    ],
    "fields": [
      {
        "label": "Etkinleşen paket",
        "key": "packageName"
      },
      {
        "label": "Etkinleşme tarihi",
        "key": "activationDate"
      }
    ],
    "cta": "Eğitimlerimi incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "packageName": "Ortaokul Hızlı Okuma Eğitimi",
      "activationDate": "10 Ekim 2026"
    },
    "required": [
      "packageName"
    ],
    "status": "review"
  },
  "digital-content-available": {
    "subject": "Fixoku | Dijital içeriğiniz hazır",
    "title": "Dijital içeriğinize erişebilirsiniz",
    "paragraphs": [
      "Erişim hakkınız bulunan dijital eğitim materyalleri hesabınıza tanımlandı.",
      "İçerikleri kişisel panelinizden güvenle inceleyebilir, eğitim süreciniz boyunca kullanabilirsiniz."
    ],
    "fields": [
      {
        "label": "İçerik / eğitim",
        "key": "packageName"
      }
    ],
    "cta": "İçeriğimi aç",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "packageName": "Paragraf Gelişim Çalışmaları"
    },
    "required": [
      "packageName"
    ],
    "status": "review"
  },
  "trainer-assigned": {
    "subject": "Fixoku | Yeni öğrenci atamanız oluşturuldu",
    "title": "Yeni öğrenci atamanız hazır",
    "paragraphs": [
      "Fixoku eğitim programları kapsamında size yeni bir öğrenci atandığını bildiririz.",
      "Atama ayrıntılarını ve eğitim süreci için gerekli bilgileri eğitmen panelinizden incelemenizi rica ederiz. Öğrencimizin gelişimine sağlayacağınız katkı için teşekkür ederiz."
    ],
    "fields": [
      {
        "label": "Öğrenci",
        "key": "studentName"
      },
      {
        "label": "Eğitim programı",
        "key": "programName"
      },
      {
        "label": "Atama tarihi",
        "key": "assignmentDate"
      }
    ],
    "cta": "Atamamı incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "studentName": "Ali Asaf Usta",
      "programName": "Ortaokul Hızlı Okuma",
      "assignmentDate": "10 Ekim 2026"
    },
    "required": [
      "studentName",
      "programName"
    ],
    "status": "review"
  },
  "trainer-reassigned": {
    "subject": "Fixoku | Atama bilgileriniz güncellendi",
    "title": "Atama bilgileriniz güncellendi",
    "paragraphs": [
      "Sorumluluğunuzdaki bir eğitim atamasıyla ilgili değişiklik yapıldı.",
      "Güncel öğrenci, program ve takvim bilgilerini eğitmen panelinizden kontrol etmenizi rica ederiz."
    ],
    "fields": [
      {
        "label": "Öğrenci",
        "key": "studentName"
      },
      {
        "label": "Eğitim programı",
        "key": "programName"
      },
      {
        "label": "Güncelleme tarihi",
        "key": "assignmentDate"
      }
    ],
    "cta": "Güncel atamayı incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "studentName": "Ali Asaf Usta",
      "programName": "Ortaokul Hızlı Okuma",
      "assignmentDate": "11 Ekim 2026"
    },
    "required": [
      "studentName",
      "programName"
    ],
    "status": "review"
  },
  "trainer-qualification-approved": {
    "subject": "Fixoku | Eğitmen uzmanlığınız etkin",
    "title": "Uzmanlık yetkiniz etkinleştirildi",
    "paragraphs": [
      "Sahip olduğunuz eğitmen eğitim paketinin kapsamındaki uzmanlık yetkileriniz hesabınızda etkin görünüyor.",
      "Bu uzmanlıklarla uyumlu öğrenci ve grup atamalarını panelinizden takip edebilirsiniz. Eğitim süreçlerindeki değerli katkınız için teşekkür ederiz."
    ],
    "fields": [
      {
        "label": "Etkin uzmanlık",
        "key": "qualificationName"
      },
      {
        "label": "Etkinleşme tarihi",
        "key": "activationDate"
      }
    ],
    "cta": "Uzmanlıklarımı incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "qualificationName": "Lise Hızlı Okuma Eğitmenliği",
      "activationDate": "10 Ekim 2026"
    },
    "required": [
      "qualificationName"
    ],
    "status": "review"
  },
  "trainer-qualification-suspended": {
    "subject": "Fixoku | Eğitmen uzmanlık durumunuz değişti",
    "title": "Uzmanlık durumunuz hakkında bilgilendirme",
    "paragraphs": [
      "Hesabınızdaki bir uzmanlık yetkisinin durumunda değişiklik yapılmıştır.",
      "Hangi yetkinliğin etkilendiğini ve varsa izlenmesi gereken adımları panelinizden inceleyebilirsiniz. Sorularınız için ekibimize ulaşabilirsiniz."
    ],
    "fields": [
      {
        "label": "İlgili uzmanlık",
        "key": "qualificationName"
      },
      {
        "label": "Güncel durum",
        "key": "qualificationStatus"
      }
    ],
    "cta": "Durumu incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "qualificationName": "Lise Hızlı Okuma Eğitmenliği",
      "qualificationStatus": "İnceleme bekliyor"
    },
    "required": [
      "qualificationName",
      "qualificationStatus"
    ],
    "status": "review"
  },
  "education-started": {
    "subject": "Fixoku | Eğitim süreciniz başladı",
    "title": "Eğitim süreciniz başladı",
    "paragraphs": [
      "Planlanan eğitim sürecinin başladığını bildiririz.",
      "Eğitim kaynakları, oturum bilgileri ve takvim ayrıntıları için panelinizi inceleyebilirsiniz. Verimli bir öğrenme süreci dileriz."
    ],
    "fields": [
      {
        "label": "Eğitim programı",
        "key": "programName"
      },
      {
        "label": "Başlangıç tarihi",
        "key": "startDate"
      }
    ],
    "cta": "Eğitimi görüntüle",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "programName": "Hızlı Okuma Eğitimi",
      "startDate": "12 Ekim 2026"
    },
    "required": [
      "programName"
    ],
    "status": "review"
  },
  "education-reminder": {
    "subject": "Fixoku | Yaklaşan eğitim etkinliğiniz",
    "title": "Yaklaşan eğitim etkinliğinizi hatırlatıyoruz",
    "paragraphs": [
      "Planlanan eğitim etkinliğiniz yaklaşıyor.",
      "Katılım saati ve oturum bilgilerini önceden kontrol etmenizi rica eder, verimli bir çalışma dileriz."
    ],
    "fields": [
      {
        "label": "Eğitim",
        "key": "programName"
      },
      {
        "label": "Etkinlik tarihi",
        "key": "sessionDate"
      },
      {
        "label": "Saat",
        "key": "sessionTime"
      }
    ],
    "cta": "Takvimimi görüntüle",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "programName": "Ortaokul Hızlı Okuma",
      "sessionDate": "15 Ekim 2026",
      "sessionTime": "14.00"
    },
    "required": [
      "programName",
      "sessionDate"
    ],
    "status": "review"
  },
  "education-completed": {
    "subject": "Fixoku | Eğitim tamamlanma bilginiz",
    "title": "Eğitiminiz tamamlandı",
    "paragraphs": [
      "Eğitim programınızın tamamlandığını memnuniyetle bildiririz.",
      "Eğitim durumunuzu ve varsa sonraki aşamaları panelinizden inceleyebilirsiniz. Gösterdiğiniz emek ve istikrar için teşekkür ederiz."
    ],
    "fields": [
      {
        "label": "Tamamlanan eğitim",
        "key": "programName"
      },
      {
        "label": "Tamamlanma tarihi",
        "key": "completionDate"
      }
    ],
    "cta": "Eğitim bilgilerimi gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "programName": "Hızlı Okuma Eğitimi",
      "completionDate": "10 Ekim 2026"
    },
    "required": [
      "programName",
      "completionDate"
    ],
    "status": "review"
  },
  "earning-created": {
    "subject": "Fixoku | Yeni hakediş kaydınız",
    "title": "Hakediş kaydınız oluşturuldu",
    "paragraphs": [
      "Tamamlanan eğitim çalışmanıza ilişkin hakediş kaydı sistemimize işlendi.",
      "Bu kayıt ödemenin yapıldığı anlamına gelmez. Hakediş tutarını ve durumunu eğitmen panelinizde inceleyebilirsiniz."
    ],
    "fields": [
      {
        "label": "Eğitim",
        "key": "programName"
      },
      {
        "label": "Hakediş dönemi",
        "key": "earningPeriod"
      },
      {
        "label": "Hakediş tutarı",
        "key": "amount"
      }
    ],
    "cta": "Hakedişimi incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "programName": "Hızlı Okuma Eğitimi",
      "earningPeriod": "Eylül 2026",
      "amount": "400,00 ₺"
    },
    "required": [
      "earningPeriod",
      "amount"
    ],
    "status": "review"
  },
  "earning-payable": {
    "subject": "Fixoku | Hakediş ödeme gününüz",
    "title": "Hakedişiniz ödeme gününe ulaştı",
    "paragraphs": [
      "Hakediş kaydınız için belirlenen ödeme gününe ulaşıldığını bildiririz.",
      "Bu bildirim tek başına banka transferi yapıldığı anlamına gelmez. Ödeme gerçekleştiğinde sistemde ayrıca kaydedilecektir."
    ],
    "fields": [
      {
        "label": "Hakediş dönemi",
        "key": "earningPeriod"
      },
      {
        "label": "Ödeme günü",
        "key": "dueDate"
      },
      {
        "label": "Ödenebilir tutar",
        "key": "amount"
      }
    ],
    "cta": "Hakediş durumunu gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "earningPeriod": "Eylül 2026",
      "dueDate": "1 Ekim 2026",
      "amount": "400,00 ₺"
    },
    "required": [
      "earningPeriod",
      "dueDate",
      "amount"
    ],
    "status": "review"
  },
  "payout-completed": {
    "subject": "Fixoku | Hakediş ödemeniz kaydedildi",
    "title": "Ödemeniz kaydedildi",
    "paragraphs": [
      "Hakedişinizin ödendiğine ilişkin kayıt sisteme işlenmiştir.",
      "İlgili dönemi, kaydedilen tutarı ve gerçek ödeme tarihini eğitmen panelinizden kontrol edebilirsiniz."
    ],
    "fields": [
      {
        "label": "Hakediş dönemi",
        "key": "earningPeriod"
      },
      {
        "label": "Ödenen tutar",
        "key": "amount"
      },
      {
        "label": "Ödeme tarihi",
        "key": "paymentDate"
      }
    ],
    "cta": "Ödeme geçmişimi gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Özlem Kaplan",
      "earningPeriod": "Eylül 2026",
      "amount": "400,00 ₺",
      "paymentDate": "10 Ekim 2026"
    },
    "required": [
      "earningPeriod",
      "amount",
      "paymentDate"
    ],
    "status": "review"
  },
  "shipment-preparing": {
    "subject": "Fixoku | Siparişiniz hazırlanıyor",
    "title": "Siparişiniz özenle hazırlanıyor",
    "paragraphs": [
      "Siparişinizdeki fiziksel ürünler gönderim için hazırlanmaktadır.",
      "Kargoya teslim edildiğinde taşıyıcı ve takip bilgileri hazırsa bunları ayrıca paylaşacağız."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Ürün",
        "key": "productName"
      }
    ],
    "cta": "Siparişimi takip et",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1010",
      "productName": "Fixoku Hızlı Okuma Kitabı"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "shipment-shipped": {
    "subject": "Fixoku | Siparişiniz kargoya verildi",
    "title": "Siparişiniz yola çıktı",
    "paragraphs": [
      "Siparişiniz kargo firmasına teslim edildi.",
      "Gönderinizin güncel durumunu taşıyıcı bilgilerinden veya Fixoku panelinizden takip edebilirsiniz."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Kargo firması",
        "key": "carrierName"
      },
      {
        "label": "Takip numarası",
        "key": "trackingNumber"
      }
    ],
    "cta": "Gönderimi incele",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1010",
      "carrierName": "Sendeo",
      "trackingNumber": "TEST-TAKIP-001"
    },
    "required": [
      "reference",
      "carrierName",
      "trackingNumber"
    ],
    "status": "review"
  },
  "shipment-delivered": {
    "subject": "Fixoku | Siparişiniz teslim edildi",
    "title": "Gönderiniz teslim edildi",
    "paragraphs": [
      "Taşıyıcıdan gelen kayda göre siparişiniz teslim edilmiştir.",
      "Ürünlerinizle ilgili herhangi bir sorunuz olursa destek ekibimizle iletişime geçebilirsiniz."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Teslim tarihi",
        "key": "deliveryDate"
      }
    ],
    "cta": "Sipariş bilgilerimi gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1010",
      "deliveryDate": "10 Ekim 2026"
    },
    "required": [
      "reference",
      "deliveryDate"
    ],
    "status": "review"
  },
  "shipment-returned-cancelled": {
    "subject": "Fixoku | Gönderi durumunuz güncellendi",
    "title": "Gönderiniz hakkında bilgilendirme",
    "paragraphs": [
      "Gönderinizin taşıma veya iade durumunda bir değişiklik olmuştur.",
      "Son durumu ve uygulanacak sonraki adımları panelinizden inceleyebilirsiniz. Sorularınız için destek ekibimiz yanınızda."
    ],
    "fields": [
      {
        "label": "Sipariş numarası",
        "key": "reference"
      },
      {
        "label": "Güncel gönderi durumu",
        "key": "shipmentStatus"
      }
    ],
    "cta": "Gönderi durumunu gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "reference": "FX-SIP-1011",
      "shipmentStatus": "İade sürecinde"
    },
    "required": [
      "reference",
      "shipmentStatus"
    ],
    "status": "review"
  },
  "support-request-received": {
    "subject": "Fixoku | Destek talebinizi aldık",
    "title": "Destek talebiniz bize ulaştı",
    "paragraphs": [
      "İlettiğiniz konuyu kayıt altına aldık. Talebiniz ilgili ekip tarafından incelenecek.",
      "Gerekli olması hâlinde sizinle kayıtlı iletişim bilgileriniz üzerinden bağlantı kuracağız. Anlayışınız için teşekkür ederiz."
    ],
    "fields": [
      {
        "label": "Talep konusu",
        "key": "requestSubject"
      },
      {
        "label": "Talep numarası",
        "key": "reference"
      }
    ],
    "cta": "Destek bilgilerimi gör",
    "path": "/giris",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "requestSubject": "Eğitim erişimi",
      "reference": "FX-DST-1012"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "institution-application-received": {
    "subject": "Fixoku | Kurum başvurunuz alındı",
    "title": "Kurum başvurunuz için teşekkür ederiz",
    "paragraphs": [
      "Kurumunuzun Fixoku eğitim programlarına gösterdiği ilgi için teşekkür ederiz.",
      "Başvurunuz değerlendirilmek üzere kayıt altına alındı. Gerekli görülmesi hâlinde yetkilimiz sizinle iletişime geçecektir."
    ],
    "fields": [
      {
        "label": "Kurum adı",
        "key": "institutionName"
      },
      {
        "label": "Başvuru tarihi",
        "key": "applicationDate"
      }
    ],
    "cta": "Fixoku ile iletişime geç",
    "path": "/iletisim",
    "fixture": {
      "recipientName": "Merve Yıldız",
      "institutionName": "Örnek Eğitim Kurumu",
      "applicationDate": "10 Ekim 2026"
    },
    "required": [
      "institutionName"
    ],
    "status": "review"
  },
  "trainer-application-received": {
    "subject": "Fixoku | Eğitmen başvurunuz alındı",
    "title": "Eğitmen başvurunuz bize ulaştı",
    "paragraphs": [
      "Eğitim alanındaki deneyiminizi Fixoku ile paylaşma isteğiniz için teşekkür ederiz.",
      "Başvurunuz ilgili ekip tarafından incelenecek; süreçte gerekli bir gelişme olduğunda sizinle iletişime geçilecektir."
    ],
    "fields": [
      {
        "label": "Başvuru alanı",
        "key": "applicationField"
      },
      {
        "label": "Başvuru tarihi",
        "key": "applicationDate"
      }
    ],
    "cta": "Fixoku ile iletişime geç",
    "path": "/iletisim",
    "fixture": {
      "recipientName": "Selin Yıldız",
      "applicationField": "Hızlı Okuma Eğitmenliği",
      "applicationDate": "10 Ekim 2026"
    },
    "required": [
      "applicationField"
    ],
    "status": "review"
  },
  "marketing-permission-aware": {
    "subject": "Fixoku | Eğitim dünyasından yenilikler",
    "title": "Eğitim dünyasından yenilikler",
    "paragraphs": [
      "Okuma, anlama ve öğrenme becerilerini destekleyen içerik ve programlarımızdan seçtiğimiz gelişmeleri sizinle paylaşıyoruz.",
      "Eğitimlerle ilgili yeni duyuruları yalnızca izin ve iletişim tercihlerinize uygun olduğunda göndereceğiz."
    ],
    "fields": [
      {
        "label": "Duyuru başlığı",
        "key": "campaignTitle"
      }
    ],
    "cta": "Eğitimleri incele",
    "path": "/egitimlerimiz",
    "fixture": {
      "recipientName": "Deniz Yılmaz",
      "campaignTitle": "Yeni dönem eğitim içerikleri"
    },
    "required": [
      "campaignTitle"
    ],
    "status": "review"
  }
});

export const EMAIL_EDITORIAL_DRAFTS_V1 = Object.freeze([
  {
    "id": "trainer-invitation",
    "title": "Eğitmen daveti",
    "event": "Davet sunucuda kaydedildiğinde, 48 saatlik tek kullanımlık bağlantı doğrulanır"
  },
  {
    "id": "admin-invitation-with-permissions",
    "title": "Yetkileri belirlenmiş yönetici daveti",
    "event": "Seçilen alanlar sunucu RBAC tarafından uygulandıktan sonra"
  },
  {
    "id": "trainer-specialization-activated",
    "title": "Eğitmen uzmanlık paketi etkinleştirildi",
    "event": "Ödeme onaylandığı anda paketteki tüm uzmanlıklar otomatik etkinleştiğinde"
  },
  {
    "id": "group-assignment-created",
    "title": "Grup eğitimi ataması",
    "event": "Doğrulanmış grup, kapasite ve eğitmen eşlemesi sonrasında"
  },
  {
    "id": "shipment-delivery-failed",
    "title": "Kargo teslim edilemedi",
    "event": "Taşıyıcı tarafından kesinleşmiş teslim edilememe kaydında"
  },
  {
    "id": "payout-date-recorded",
    "title": "Hakediş ödeme kaydı / tarihi",
    "event": "Owner gerçekten ödendi işaretleyip banka hareketi tarihini onayladığında"
  }
]);

// Yeni is akislari icin kurumsal metin taslaklari; canli katalog / outbox olaylari degildir.
export const EMAIL_NEW_DRAFT_COPY_V1 = Object.freeze({
  "trainer-invitation": {
    subject: "Fixoku | Eğitmen davetiniz",
    paragraphs: ["Fixoku eğitim ekibine davet edildiğinizi memnuniyetle bildiririz.", "Davet bağlantınız 48 saat boyunca ve yalnızca bir kez kullanılabilir. Daveti siz beklemiyorsanız bu iletiyi dikkate almayabilirsiniz."],
    required: ["recipientName", "invitationUrl", "expiresAt"]
  },
  "admin-invitation-with-permissions": {
    subject: "Fixoku | Yönetim paneli davetiniz",
    paragraphs: ["Fixoku yönetim paneline, belirlenmiş erişim alanlarıyla davet edildiniz.", "Davetinizi kabul etmeden önce erişiminize açılacak bölümleri kontrol etmenizi rica ederiz. Bu davet, yetkiler sunucuda doğrulanmadan gönderilmez."],
    required: ["recipientName", "invitationUrl", "permissions", "expiresAt"]
  },
  "trainer-specialization-activated": {
    subject: "Fixoku | Uzmanlıklarınız etkinleştirildi",
    paragraphs: ["Satın aldığınız eğitmen eğitim paketinin kapsamındaki uzmanlıklar hesabınızda etkinleştirildi.", "Paketinize tanımlanan uzmanlıklar için ayrıca eğitim tamamlama veya yönetici onayı beklemeniz gerekmez. Güncel yetkinliklerinizi panelinizden görebilirsiniz."],
    required: ["recipientName", "packageName", "qualificationNames", "activatedAt"]
  },
  "group-assignment-created": {
    subject: "Fixoku | Yeni grup atamanız oluşturuldu",
    paragraphs: ["Yeni bir grup eğitim atamanız oluşturuldu.", "Program, öğrenci sayısı ve oturum bilgilerini panelinizden kontrol etmenizi rica ederiz. Çalışmalarınız için teşekkür ederiz."],
    required: ["recipientName", "groupName", "programName", "groupSize"]
  },
  "shipment-delivery-failed": {
    subject: "Fixoku | Gönderiniz için teslimat bilgilendirmesi",
    paragraphs: ["Taşıyıcıdan gelen güncel kayda göre gönderiniz henüz teslim edilemedi.", "Takip bilgilerini kontrol etmenizi rica ederiz. Gerektiğinde destek ekibimizle iletişime geçebilirsiniz."],
    required: ["recipientName", "orderNumber", "carrierName", "trackingNumber", "shipmentStatus"]
  },
  "payout-date-recorded": {
    subject: "Fixoku | Hakediş ödemeniz kaydedildi",
    paragraphs: ["Eğitim çalışmalarınıza ilişkin ödemenizin kaydedildiğini bildiririz.", "Gerçek ödeme tarihi, ödenen tutar ve ilgili dönemi panelinizden inceleyebilirsiniz. Değerli katkınız için teşekkür ederiz."],
    required: ["recipientName", "earningPeriod", "amount", "paymentDate"]
  }
});
