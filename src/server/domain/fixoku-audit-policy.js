/** Fixoku denetim olayı ilkeleri. İşletme onayı: 2026-10-10.
 * Bu katalog olay kaydı OLUŞTURMAZ. Yalnızca izin verilen kayıt düzeyini tanımlar.
 * "SOURCE_MATCH" statüsü kapsam testidir; uçtan uca doğrulanmış çalışma kanıtı değildir.
 */
export const APPROVED_AUDIT_POLICY_VERSION = "FIXOKU-AUDIT-79-20261010";
export const APPROVED_AUDIT_POLICIES = Object.freeze(
  [
  {
    "id": 1,
    "group": "Hesap ve güvenlik",
    "event": "Yeni kullanıcı hesabı oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 2,
    "group": "Hesap ve güvenlik",
    "event": "E-posta doğrulaması tamamlandı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 3,
    "group": "Hesap ve güvenlik",
    "event": "Başarılı kullanıcı girişi",
    "mode": "THRESHOLD",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 4,
    "group": "Hesap ve güvenlik",
    "event": "Şüpheli veya tekrarlanan başarısız giriş",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 5,
    "group": "Hesap ve güvenlik",
    "event": "Şifre sıfırlama talebi oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 6,
    "group": "Hesap ve güvenlik",
    "event": "Şifre değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 7,
    "group": "Hesap ve güvenlik",
    "event": "Oturumlar güvenlik nedeniyle sonlandırıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 8,
    "group": "Hesap ve güvenlik",
    "event": "Çok adımlı doğrulama ayarları değişti",
    "mode": "FEATURE_GATED",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 9,
    "group": "Hesap ve güvenlik",
    "event": "Kullanıcı hesabı askıya alındı veya açıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 10,
    "group": "Hesap ve güvenlik",
    "event": "Kritik kullanıcı bilgileri değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 11,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci hesabı oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 12,
    "group": "Öğrenci ve aile",
    "event": "Kanuni temsilci bağlantısı değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 13,
    "group": "Öğrenci ve aile",
    "event": "Öğrencinin sınıfı değişti",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 14,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci paketi satın alındı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 15,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci paket erişimi etkinleştirildi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 16,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci paket erişimi iptal edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 17,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci eğitim programına başladı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 18,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci eğitim ilerlemesi kaydedildi",
    "mode": "THRESHOLD",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 19,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci eğitimi tamamlandı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 20,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci sınav veya ölçme kaydı oluştu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 21,
    "group": "Öğrenci ve aile",
    "event": "Öğrenci destek başvurusu açıldı veya kapatıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 22,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen daveti gönderildi veya kabul edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 23,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen eğitim paketi satın alındı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 24,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen uzmanlığı satın alma sonrası etkinleşti",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 25,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen uzmanlık yetkisi kaldırıldı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 26,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmene birebir öğrenci atandı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 27,
    "group": "Eğitmen ve eğitim",
    "event": "Öğrenci ataması değiştirildi veya iptal edildi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 28,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitim grubu açıldı veya kontenjanı değişti",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 29,
    "group": "Eğitmen ve eğitim",
    "event": "Gruba öğrenci eklendi veya gruptan çıkarıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 30,
    "group": "Eğitmen ve eğitim",
    "event": "Ders planı oluşturuldu veya ertelendi",
    "mode": "FEATURE_GATED",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 31,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitim tamamlanma kaydı oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 32,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen uygunluk saatlerini değiştirdi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 33,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen banka hesap bilgilerini değiştirdi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 34,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen hakedişi oluştu veya düzeltildi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 35,
    "group": "Eğitmen ve eğitim",
    "event": "Eğitmen hakedişi ödendi olarak işaretlendi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 36,
    "group": "Satış ve paket",
    "event": "Paket taslağı oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 37,
    "group": "Satış ve paket",
    "event": "Paket yayımlandı veya yayından kaldırıldı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 38,
    "group": "Satış ve paket",
    "event": "Paket fiyatı veya kapsamı değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 39,
    "group": "Satış ve paket",
    "event": "Sepete ürün eklendi veya çıkarıldı",
    "mode": "ANALYTICS_ONLY",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 40,
    "group": "Satış ve paket",
    "event": "Sipariş oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 41,
    "group": "Satış ve paket",
    "event": "Sipariş iptal edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 42,
    "group": "Satış ve paket",
    "event": "İndirim veya kupon kullanıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 43,
    "group": "Satış ve paket",
    "event": "Özel teklif oluşturuldu veya değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 44,
    "group": "Satış ve paket",
    "event": "Özel teklif kabul edildi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 45,
    "group": "Ödeme ve iade",
    "event": "PayTR ödeme işlemi doğrulandı veya reddedildi",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 46,
    "group": "Ödeme ve iade",
    "event": "Havale bildirimi oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 47,
    "group": "Ödeme ve iade",
    "event": "Havale yönetici tarafından onaylandı veya reddedildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 48,
    "group": "Ödeme ve iade",
    "event": "İade başvurusu alındı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 49,
    "group": "Ödeme ve iade",
    "event": "İade başvurusu onaylandı veya reddedildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 50,
    "group": "Ödeme ve iade",
    "event": "Ödeme iadesi gerçekleşti",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 51,
    "group": "Ödeme ve iade",
    "event": "Fatura düzenlendi veya iptal edildi",
    "mode": "FEATURE_GATED",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 52,
    "group": "Kargo ve stok",
    "event": "Kitap sevkiyat kaydı oluşturuldu",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 53,
    "group": "Kargo ve stok",
    "event": "Sipariş hazırlanmaya başlandı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 54,
    "group": "Kargo ve stok",
    "event": "Ürün kargoya teslim edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 55,
    "group": "Kargo ve stok",
    "event": "Ürün müşteriye teslim edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 56,
    "group": "Kargo ve stok",
    "event": "Kargo iptal edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 57,
    "group": "Kargo ve stok",
    "event": "İade edilen kitap teslim alındı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 58,
    "group": "Kargo ve stok",
    "event": "Kargo takip bilgisi güncellendi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 59,
    "group": "Kargo ve stok",
    "event": "Stok girişi çıkışı veya düzeltmesi yapıldı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 60,
    "group": "Yönetim ve yetki",
    "event": "Yönetici daveti gönderildi veya kabul edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 61,
    "group": "Yönetim ve yetki",
    "event": "Yöneticiye yetki verildi veya kaldırıldı",
    "mode": "EACH",
    "sourceEvidence": "Kaynakta log yazımı var",
    "approved": true
  },
  {
    "id": 62,
    "group": "Yönetim ve yetki",
    "event": "Hesap erişim kapsamı değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 63,
    "group": "Yönetim ve yetki",
    "event": "Entegrasyon veya önemli sistem ayarı değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 64,
    "group": "Yönetim ve yetki",
    "event": "Kritik bir kullanıcı kaydı yönetici tarafından değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 65,
    "group": "Uyumluluk",
    "event": "Üyelik veya satış sözleşmesinin belirli sürümü kabul edildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 66,
    "group": "Uyumluluk",
    "event": "Ticari ileti izni verildi veya geri çekildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 67,
    "group": "Uyumluluk",
    "event": "KVKK başvurusu alındı veya sonuçlandırıldı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 68,
    "group": "Uyumluluk",
    "event": "Hukuki metin yayımlandı veya değiştirildi",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 69,
    "group": "Uyumluluk",
    "event": "Veri silme veya anonimleştirme talebi uygulandı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 70,
    "group": "Bildirimler",
    "event": "İşlemsel e-posta kuyruğa alındı",
    "mode": "EACH",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 71,
    "group": "Bildirimler",
    "event": "İşlemsel e-posta gönderilemedi",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 72,
    "group": "Bildirimler",
    "event": "Pazarlama iletisi gönderildi",
    "mode": "THRESHOLD",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 73,
    "group": "Bildirimler",
    "event": "SMS veya WhatsApp gönderim hatası oluştu",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 74,
    "group": "Sistem ve güvenlik",
    "event": "Yetkisiz erişim girişimi tespit edildi",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 75,
    "group": "Sistem ve güvenlik",
    "event": "Ödeme bildirim imzası doğrulanamadı",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 76,
    "group": "Sistem ve güvenlik",
    "event": "Zamanlanmış görev başarısız oldu",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 77,
    "group": "Sistem ve güvenlik",
    "event": "Kritik entegrasyon bağlantısı kesildi",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 78,
    "group": "Sistem ve güvenlik",
    "event": "Önemli veritabanı yazma hatası gerçekleşti",
    "mode": "EXCEPTION",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  },
  {
    "id": 79,
    "group": "Sistem ve güvenlik",
    "event": "Sayfa görüntülendi veya düğmeye basıldı",
    "mode": "ANALYTICS_ONLY",
    "sourceEvidence": "Doğrulanacak",
    "approved": true
  }
].map((entry) => Object.freeze(entry)),
);
export function getApprovedAuditPolicy(id) {
  return APPROVED_AUDIT_POLICIES.find((entry) => entry.id === id) || null;
}
/** Yalnızca çağıranın BAŞARILI DB işleminin aynı transaction client'ı ile kullanılmalıdır.
 * Ham request, banka, kart, çocuk profili, token veya mesaj metni kabul etmez.
 */
export async function recordApprovedAuditEvent(client, input) {
  const policy = getApprovedAuditPolicy(input?.policyId);
  if (!policy || !policy.approved || policy.mode !== "EACH") throw new Error("AUDIT_POLICY_NOT_ALLOWED");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const actor = String(input.actorUserId || "");
  const action = String(input.action || "");
  const subjectType = String(input.subjectType || "");
  const subjectId = String(input.subjectId || "");
  if (!uuid.test(actor) || !/^[a-z][a-z0-9_.]{3,119}$/.test(action) ||
      !/^[a-z][a-z0-9_]{1,63}$/.test(subjectType) ||
      !/^[a-zA-Z0-9_.:-]{1,128}$/.test(subjectId)) throw new Error("AUDIT_FIELDS_INVALID");
  if (!client || typeof client.query !== "function") throw new Error("AUDIT_TRANSACTION_REQUIRED");
  await client.query(
    `insert into platform_audit_events(actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json)
     values($1,$2,$3,$4,'SUCCESS',gen_random_uuid(),'{}')`,
    [actor, action, subjectType, subjectId],
  );
}
