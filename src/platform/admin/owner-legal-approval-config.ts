export const legalWorkflowStates = [
  { key: "DRAFT", label: "Taslak", description: "Metin kaynakta taslak olarak tutulur." },
  { key: "REVIEW_PENDING", label: "İnceleme bekliyor", description: "Hukuki inceleme kanıtı beklenir." },
  { key: "LEGAL_REVIEW_COMPLETED", label: "Hukuki inceleme tamamlandı", description: "Hukukçu incelemesi ve referansı gerekir." },
  { key: "OWNER_APPROVAL_PENDING", label: "Owner onayı", description: "Owner kararı ve gerekçesi gerekir." },
  { key: "PUBLISHED", label: "Yayımlandı", description: "Sadece server-side koşullar tamamlanınca mümkün." },
] as const;

export type LegalWorkflowState = typeof legalWorkflowStates[number]["key"];

export const legalDocumentRequirements: Record<number, readonly string[]> = {
  1: ["Resmî satıcı unvanı, vergi levhası/VKN niteliği", "Sicil, marka ve ETBİS durumu", "Ticari satış alan adları"],
  2: ["Doğrulanmış satıcı kimliği", "Çocuk/kanuni temsilci üyelik sınırı"],
  3: ["Gerçek sipariş satırları, vergi ve kargo", "Teslim süresi birimi ve cayma istisnası", "Kalıcı sürüm/teyit kaydı"],
  4: ["Sipariş alıcısı, fiyat, vergi ve teslimat", "Çocuk temsil yetkisi ve sözleşme sürümü"],
  5: ["Ürün bazlı cayma istisnaları", "İade taşıyıcısı, bedeli ve karma paket hesabı"],
  6: ["Sendeo sözleşmesi ve gerçek tarife", "Teslim süresi birimi, azami süre ve iade taşıyıcısı"],
  7: ["Dijital erişim ve eğitim kapsamı", "Karma paket ve başlangıç/cayma koşulları"],
  8: ["Gerçek veri envanteri ve hukuki sebepler", "Sağlayıcı/ülke, saklama ve yetki matrisi"],
  9: ["Kanuni temsil doğrulama ve guardian akışı", "Çocuk profil/erişim sınırları"],
  10: ["Eğitmen sözleşme modeli", "Gerçek saklanan veri ve hakediş/vergi koşulları"],
  11: ["Gerçek barındırma, DB, e-posta ve yedekleme kanıtı", "Anahtar ve erişim yönetimi"],
  12: ["Çerez adı, sağlayıcı, amaç, süre ve aktarım envanteri"],
  13: ["İYS kaydı ve mevcut izin kanıtları", "Kolay ret mekanizması"],
  14: ["Somut veri, amaç/alıcı ve saklama", "Geri çekme ve yurt dışı aktarım güvencesi"],
  15: ["Gerçek başvuru kanalı ve süreç sahibi", "Kimlik doğrulama ve cevap kaydı"],
  16: ["Şikâyet kayıt sistemi ve yasal süre takibi", "İade/fatura/ödeme eskalasyonu"],
  17: ["Kategori bazında saklama/silme planı", "Sağlayıcı, ülke ve yedek temizleme"],
  18: ["Vergi/ETBİS/kargo/çocuk/İYS kanıtları", "Owner onay tarihi ve sürümü"],
  19: ["Gerçek route/API/DB kabul kanıtı", "Sipariş snapshot ve ayrı onay kayıtları"],
  20: ["Eski alan adı ve Dersfix.com geçişi", "Reklam iddialarının dayanağı"],
  21: ["Güncel hukukçu incelemesi", "Yayın sınırı ve mevzuat referansı"],
};

export const vatApprovalRows = [
  { key: "BOOK", label: "Kitap", source: "0 bps kaynak projeksiyonu", state: "DRAFT", evidence: "Vergi sınıflandırması + fatura örneği + mali müşavir yazılı kararı" },
  { key: "DIGITAL_SOFTWARE", label: "Dijital yazılım", source: "2000 bps kaynak projeksiyonu", state: "DRAFT", evidence: "Ürün/hizmet sınıflandırması + fatura kanıtı" },
  { key: "STUDENT_PACKAGE", label: "Öğrenci eğitim paketi", source: "Bileşen bazlı", state: "DRAFT", evidence: "26 paket için line-level fiyat/KDV kararı" },
  { key: "TRAINER_PACKAGE", label: "Eğitmen eğitim paketi", source: "2000 bps kaynak projeksiyonu", state: "DRAFT", evidence: "8 paket, hizmet türü ve fatura modeli" },
  { key: "MIXED_PACKAGE", label: "Karma paket", source: "Bileşen snapshot altyapısı", state: "DRAFT", evidence: "Kitap/yazılım/eğitim ayrı oran ve bedel kararı" },
  { key: "SHIPPING", label: "Kargo", source: "Doğrulanmış oran yok", state: "DRAFT", evidence: "Taşıyıcı sözleşmesi, fatura ve shipping KDV kararı" },
] as const;
