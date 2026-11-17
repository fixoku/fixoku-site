export const OWNER_EMAIL_EDITORIAL = Object.freeze({
  "owner-trainer-registration": {
    "subject": "Yeni Eğitmen Kaydı – {{personName}}",
    "title": "Yeni Eğitmen Kaydı",
    "paragraphs": [
      "E-posta doğrulaması tamamlanan yeni eğitmen hesabı oluşturuldu."
    ],
    "fields": [
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "email",
        "label": "E-posta"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "city",
        "label": "Şehir / İlçe"
      },
      {
        "key": "profession",
        "label": "Meslek"
      },
      {
        "key": "institution",
        "label": "Kurum"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "personName": "Örnek Kullanıcı",
      "email": "ornek@example.invalid",
      "phone": "Örnek telefon",
      "city": "İstanbul",
      "profession": "Öğretmen",
      "institution": "Örnek kurum",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "personName"
    ],
    "status": "review"
  },
  "owner-student-registration": {
    "subject": "Yeni Öğrenci Kaydı – {{personName}}",
    "title": "Yeni Öğrenci Kaydı",
    "paragraphs": [
      "E-posta doğrulaması tamamlanan yeni öğrenci hesabı oluşturuldu."
    ],
    "fields": [
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "grade",
        "label": "Sınıf"
      },
      {
        "key": "school",
        "label": "Okul"
      },
      {
        "key": "city",
        "label": "Şehir / İlçe"
      },
      {
        "key": "email",
        "label": "E-posta"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "guardianName",
        "label": "Veli"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "personName": "Örnek Kullanıcı",
      "grade": "4. sınıf",
      "school": "Örnek okul",
      "city": "İstanbul",
      "email": "ornek@example.invalid",
      "phone": "Örnek telefon",
      "guardianName": "Örnek veli",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "personName"
    ],
    "status": "review"
  },
  "owner-student-sale": {
    "subject": "Yeni Öğrenci Paketi Satışı – {{amount}}",
    "title": "Yeni Öğrenci Paketi Satışı",
    "paragraphs": [
      "Öğrenci paketi ödemesi onaylandı."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "studentName",
        "label": "Öğrenci"
      },
      {
        "key": "packageName",
        "label": "Paket"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "paymentMethod",
        "label": "Ödeme yöntemi"
      },
      {
        "key": "discount",
        "label": "İndirim"
      },
      {
        "key": "shipping",
        "label": "Kargo"
      },
      {
        "key": "vat",
        "label": "KDV"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "personName": "Örnek Kullanıcı",
      "studentName": "Örnek Öğrenci",
      "packageName": "Örnek eğitim paketi",
      "date": "15.11.2026",
      "paymentMethod": "Havale / EFT",
      "discount": "0,00 ₺",
      "shipping": "0,00 ₺",
      "vat": "Örnek KDV",
      "amount": "12.500,00 ₺",
      "status": "Örnek durum"
    },
    "required": [
      "amount"
    ],
    "status": "review"
  },
  "owner-trainer-sale": {
    "subject": "Yeni Eğitmen Paketi Satışı – {{amount}}",
    "title": "Yeni Eğitmen Paketi Satışı",
    "paragraphs": [
      "Eğitmen paketi ödemesi onaylandı."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "packageName",
        "label": "Paket"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "paymentMethod",
        "label": "Ödeme yöntemi"
      },
      {
        "key": "discount",
        "label": "İndirim"
      },
      {
        "key": "shipping",
        "label": "Kargo"
      },
      {
        "key": "vat",
        "label": "KDV"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "trainerName": "Örnek Eğitmen",
      "packageName": "Örnek eğitim paketi",
      "date": "15.11.2026",
      "paymentMethod": "Havale / EFT",
      "discount": "0,00 ₺",
      "shipping": "0,00 ₺",
      "vat": "Örnek KDV",
      "amount": "12.500,00 ₺",
      "status": "Örnek durum"
    },
    "required": [
      "amount"
    ],
    "status": "review"
  },
  "owner-bank-review": {
    "subject": "Havale / EFT Onayı Bekliyor – {{amount}}",
    "title": "Havale / EFT Onayı Bekliyor",
    "paragraphs": [
      "Havale / EFT siparişi veya müşteri ödeme bildirimi inceleme bekliyor. Banka hesabını kontrol etmeden ödeme onayı vermeyiniz."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "packageName",
        "label": "Paket"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "reportedAmount",
        "label": "Bildirilen ödeme"
      },
      {
        "key": "payerName",
        "label": "Gönderen hesap sahibi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "personName": "Örnek Kullanıcı",
      "packageName": "Örnek eğitim paketi",
      "date": "15.11.2026",
      "amount": "12.500,00 ₺",
      "reportedAmount": "12.500,00 ₺",
      "payerName": "Örnek müşteri",
      "status": "Örnek durum"
    },
    "required": [
      "amount"
    ],
    "status": "review"
  },
  "owner-shipment": {
    "subject": "Yeni Kargo Hazırlama Talebi – {{reference}}",
    "title": "Yeni Kargo Hazırlama Talebi",
    "paragraphs": [
      "Fiziksel ürünler için hazırlama kaydı oluşturuldu."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "city",
        "label": "Şehir / İlçe"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "shipping",
        "label": "Kargo"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "personName": "Örnek Kullanıcı",
      "city": "İstanbul",
      "phone": "Örnek telefon",
      "date": "15.11.2026",
      "shipping": "0,00 ₺",
      "status": "Örnek durum"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "owner-guardian-registration": {
    "subject": "Yeni Veli Kaydı – {{personName}}",
    "title": "Yeni Veli Kaydı",
    "paragraphs": [
      "E-posta doğrulaması tamamlanan veli hesabı oluşturuldu."
    ],
    "fields": [
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "email",
        "label": "E-posta"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "personName": "Örnek Kullanıcı",
      "email": "ornek@example.invalid",
      "phone": "Örnek telefon",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "personName"
    ],
    "status": "review"
  },
  "owner-qualification": {
    "subject": "Eğitmen Yeni Uzmanlık Kazandı – {{trainerName}}",
    "title": "Eğitmen Yeni Uzmanlık Kazandı",
    "paragraphs": [
      "Eğitmenin yeni uzmanlık kaydı etkinleşti."
    ],
    "fields": [
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "qualificationName",
        "label": "Uzmanlık"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "trainerName": "Örnek Eğitmen",
      "qualificationName": "İlkokul hızlı okuma",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "trainerName"
    ],
    "status": "review"
  },
  "owner-assignment": {
    "subject": "Öğrenci Eğitmen Ataması Bekliyor – {{studentName}}",
    "title": "Öğrenci Eğitmen Ataması Bekliyor",
    "paragraphs": [
      "Yeni birebir eğitim atama talebi oluşturuldu."
    ],
    "fields": [
      {
        "key": "studentName",
        "label": "Öğrenci"
      },
      {
        "key": "programName",
        "label": "Eğitim"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "studentName": "Örnek Öğrenci",
      "programName": "Hızlı okuma",
      "date": "15.11.2026",
      "reference": "FX-ORNEK-001",
      "status": "Örnek durum"
    },
    "required": [
      "studentName"
    ],
    "status": "review"
  },
  "owner-completion": {
    "subject": "Öğrenci Eğitimi Tamamlandı – {{studentName}}",
    "title": "Öğrenci Eğitimi Tamamlandı",
    "paragraphs": [
      "Öğrenci eğitiminin tamamlanması kaydedildi."
    ],
    "fields": [
      {
        "key": "studentName",
        "label": "Öğrenci"
      },
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "programName",
        "label": "Eğitim"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "studentName": "Örnek Öğrenci",
      "trainerName": "Örnek Eğitmen",
      "programName": "Hızlı okuma",
      "date": "15.11.2026"
    },
    "required": [
      "studentName"
    ],
    "status": "review"
  },
  "owner-earning": {
    "subject": "Yeni Eğitmen Hakedişi Oluştu – {{amount}}",
    "title": "Yeni Eğitmen Hakedişi Oluştu",
    "paragraphs": [
      "Eğitmen hakediş kaydı oluşturuldu."
    ],
    "fields": [
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "studentName",
        "label": "Öğrenci"
      },
      {
        "key": "programName",
        "label": "Eğitim"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "earningPeriod",
        "label": "Hakediş dönemi"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "trainerName": "Örnek Eğitmen",
      "studentName": "Örnek Öğrenci",
      "programName": "Hızlı okuma",
      "amount": "12.500,00 ₺",
      "earningPeriod": "Kasım 2026",
      "date": "15.11.2026"
    },
    "required": [
      "amount"
    ],
    "status": "review"
  },
  "owner-refund": {
    "subject": "Yeni İade / İptal Talebi – {{reference}}",
    "title": "Yeni İade / İptal Talebi",
    "paragraphs": [
      "Yeni iade veya iptal talebi inceleme bekliyor."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "reason",
        "label": "Gerekçe"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "personName": "Örnek Kullanıcı",
      "amount": "12.500,00 ₺",
      "reason": "Örnek gerekçe",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "owner-contact": {
    "subject": "Yeni İletişim Mesajı – {{personName}}",
    "title": "Yeni İletişim Mesajı",
    "paragraphs": [
      "İletişim formundan yeni mesaj alındı."
    ],
    "fields": [
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "email",
        "label": "E-posta"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "messageSummary",
        "label": "Mesaj özeti"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "personName": "Örnek Kullanıcı",
      "email": "ornek@example.invalid",
      "phone": "Örnek telefon",
      "messageSummary": "Örnek mesaj",
      "date": "15.11.2026",
      "reference": "FX-ORNEK-001"
    },
    "required": [
      "personName"
    ],
    "status": "review"
  },
  "owner-institution": {
    "subject": "Yeni Kurum Başvurusu – {{institution}}",
    "title": "Yeni Kurum Başvurusu",
    "paragraphs": [
      "Yeni kurum başvurusu inceleme bekliyor."
    ],
    "fields": [
      {
        "key": "institution",
        "label": "Kurum"
      },
      {
        "key": "personName",
        "label": "Adı soyadı"
      },
      {
        "key": "email",
        "label": "E-posta"
      },
      {
        "key": "phone",
        "label": "Telefon"
      },
      {
        "key": "city",
        "label": "Şehir / İlçe"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "institution": "Örnek kurum",
      "personName": "Örnek Kullanıcı",
      "email": "ornek@example.invalid",
      "phone": "Örnek telefon",
      "city": "İstanbul",
      "date": "15.11.2026",
      "reference": "FX-ORNEK-001"
    },
    "required": [
      "institution"
    ],
    "status": "review"
  },
  "owner-payment-error": {
    "subject": "Ödeme Sistemi Hatası – {{reference}}",
    "title": "Ödeme Sistemi Hatası",
    "paragraphs": [
      "Ödeme sürecinde inceleme gerektiren hata kaydedildi."
    ],
    "fields": [
      {
        "key": "reference",
        "label": "Kayıt / sipariş numarası"
      },
      {
        "key": "errorCode",
        "label": "Hata kodu"
      },
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "reference": "FX-ORNEK-001",
      "errorCode": "EXAMPLE_ERROR",
      "date": "15.11.2026",
      "status": "Örnek durum"
    },
    "required": [
      "reference"
    ],
    "status": "review"
  },
  "owner-daily-summary": {
    "subject": "Günlük Yönetim Özeti – {{date}}",
    "title": "Günlük Yönetim Özeti",
    "paragraphs": [
      "Önceki takvim gününün kayıt, satış, tahsilat ve operasyon özeti."
    ],
    "fields": [
      {
        "key": "date",
        "label": "İşlem tarihi"
      },
      {
        "key": "amount",
        "label": "Toplam tutar"
      },
      {
        "key": "studentSales",
        "label": "Öğrenci paketi satışları"
      },
      {
        "key": "trainerSales",
        "label": "Eğitmen paketi satışları"
      },
      {
        "key": "cardReceipts",
        "label": "Kart tahsilatı"
      },
      {
        "key": "bankReceipts",
        "label": "Havale tahsilatı"
      },
      {
        "key": "pendingBank",
        "label": "Bekleyen havaleler"
      },
      {
        "key": "refunds",
        "label": "İadeler"
      },
      {
        "key": "earnings",
        "label": "Oluşan hakediş"
      },
      {
        "key": "newTrainers",
        "label": "Yeni eğitmen"
      },
      {
        "key": "newStudents",
        "label": "Yeni öğrenci"
      },
      {
        "key": "newGuardians",
        "label": "Yeni veli"
      },
      {
        "key": "orderCount",
        "label": "Sipariş adedi"
      },
      {
        "key": "pendingAssignments",
        "label": "Atama bekleyen"
      },
      {
        "key": "pendingShipments",
        "label": "Kargo bekleyen"
      },
      {
        "key": "pendingRefunds",
        "label": "İade / iptal bekleyen"
      },
      {
        "key": "completedTrainings",
        "label": "Tamamlanan eğitim"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "date": "15.11.2026",
      "amount": "87.500,00 ₺",
      "studentSales": "50.000,00 ₺",
      "trainerSales": "37.500,00 ₺",
      "cardReceipts": "35.000,00 ₺",
      "bankReceipts": "52.500,00 ₺",
      "pendingBank": "15.000,00 ₺",
      "refunds": "0,00 ₺",
      "earnings": "5.000,00 ₺",
      "newTrainers": "5",
      "newStudents": "12",
      "newGuardians": "8",
      "orderCount": "7",
      "pendingAssignments": "4",
      "pendingShipments": "5",
      "pendingRefunds": "0",
      "completedTrainings": "4"
    },
    "required": [
      "date"
    ],
    "status": "review"
  }
,
  "owner-class-scheduled": {
    "subject": "Sınıf Eğitim Başlangıcı Belirlendi",
    "title": "Sınıf Eğitim Başlangıcı Belirlendi",
    "paragraphs": [
      "Sınıfın ortak eğitim başlangıç tarihi kaydedildi."
    ],
    "fields": [
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "programName",
        "label": "Eğitim"
      },
      {
        "key": "reference",
        "label": "Sınıf"
      },
      {
        "key": "sessionDate",
        "label": "Yeni başlangıç (Türkiye saati)"
      },
      {
        "key": "date",
        "label": "Önceki başlangıç (Türkiye saati)"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "trainerName": "Örnek Eğitmen",
      "programName": "İlkokul Hızlı Okuma",
      "reference": "Sınıf 1",
      "sessionDate": "23.11.2026 14:00",
      "date": "22.11.2026 14:00",
      "status": "Mutabakat tamamlandı"
    },
    "required": [
      "trainerName",
      "programName",
      "reference",
      "sessionDate"
    ],
    "status": "review"
  },
  "owner-class-rescheduled": {
    "subject": "Sınıf Eğitim Başlangıcı Değiştirildi",
    "title": "Sınıf Eğitim Başlangıcı Değiştirildi",
    "paragraphs": [
      "Sınıfın ortak eğitim başlangıç tarihi güncellendi."
    ],
    "fields": [
      {
        "key": "trainerName",
        "label": "Eğitmen"
      },
      {
        "key": "programName",
        "label": "Eğitim"
      },
      {
        "key": "reference",
        "label": "Sınıf"
      },
      {
        "key": "sessionDate",
        "label": "Yeni başlangıç (Türkiye saati)"
      },
      {
        "key": "date",
        "label": "Önceki başlangıç (Türkiye saati)"
      },
      {
        "key": "status",
        "label": "Durum"
      }
    ],
    "cta": "Owner panelini açın",
    "path": "/panel/owner",
    "fixture": {
      "recipientName": "Ersin Bey",
      "trainerName": "Örnek Eğitmen",
      "programName": "İlkokul Hızlı Okuma",
      "reference": "Sınıf 1",
      "sessionDate": "23.11.2026 14:00",
      "date": "22.11.2026 14:00",
      "status": "Mutabakat tamamlandı"
    },
    "required": [
      "trainerName",
      "programName",
      "reference",
      "sessionDate"
    ],
    "status": "review"
  },
  "owner-reassignment-pending": {
  "subject": "Öğrenci Yeniden Atama Bekliyor",
  "title": "Öğrenci Yeniden Atama Bekliyor",
  "paragraphs": [
    "Öğrencinin mevcut ataması kaldırıldı. Geçerli eğitim hakkı korunuyor; yeni atamayı yönetim panelinden değerlendirebilirsiniz."
  ],
  "fields": [
    {
      "key": "studentName",
      "label": "Öğrenci"
    },
    {
      "key": "programName",
      "label": "Eğitim"
    },
    {
      "key": "reference",
      "label": "Kayıt"
    },
    {
      "key": "date",
      "label": "İşlem tarihi"
    },
    {
      "key": "status",
      "label": "Durum"
    }
  ],
  "cta": "Owner panelini açın",
  "path": "/panel/owner",
  "fixture": {
    "recipientName": "Ersin Bey",
    "studentName": "Örnek Öğrenci",
    "programName": "Hızlı okuma",
    "reference": "Örnek kayıt",
    "date": "17.11.2026",
    "status": "Yeniden atama bekliyor"
  },
  "required": [
    "studentName",
    "programName",
    "reference"
  ],
  "status": "review"
}
});
