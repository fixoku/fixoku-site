import "./admin-panel.css";

const required = [
  ["Satıcı tüzel kişi ve ticaret sicili", "Tüm sözleşmeler ve KVKK metni"],
  ["Vergi numarası / vergi dairesi / MERSİS", "Mesafeli satış ve ön bilgilendirme"],
  ["Kayıtlı adres ve yetkili temsilci", "Kullanım ve üyelik sözleşmeleri"],
  ["Müşteri hizmetleri telefonu ve operasyon e-postaları", "İletişim, iade ve KVKK başvurusu"],
  ["Ödeme, teslimat, iade ve şikâyet işletim detayları", "Siparişe özgü hukuk metinleri"],
  ["Saklama süreleri ve sınır ötesi aktarım güvenceleri", "KVKK aydınlatma ve çerez politikası"],
  ["İYS operatörü / hesap ve ticari iletişim süreci", "Ticari elektronik ileti metni"],
] as const;

export function LegalPreparationPage() {
  return <main className="platform-foundation-panel admin-panel"><nav aria-label="Yönetim paneli menüsü"><a href="/panel/owner">Genel Bakış</a><a href="/panel/owner/e-posta-sablonlari">E-posta şablonları</a><a href="/panel/owner/olcumleme">Ölçümleme</a><a href="/panel/owner/yasal-hazirlik" aria-current="page">Yasal hazırlık</a></nav><h1>Yasal hazırlık</h1><p>Bu liste yayın öncesi sahiplik ve hukuk incelemesi içindir. Eksik şirket değerleri insan tarafından tamamlanana kadar açıklamalar beklemede tutulur.</p><section className="admin-package-grid">{required.map(([value, affected]) => <article className="admin-package-card" key={value}><span className="admin-status">Zorunlu bilgi bekleniyor</span><h2>{value}</h2><p>Etkilenen belgeler: {affected}</p></article>)}</section><section className="admin-package-card"><h2>Üretim yayımlama durumu</h2><p className="admin-status">Yayına hazır değil · hukuk incelemesi ve zorunlu bilgiler bekleniyor</p><p>Metinler taslaktır; KVKK Kurumu, Mevzuat Bilgi Sistemi, Ticaret Bakanlığı ve İYS’nin güncel kaynaklarıyla yetkili kişi tarafından doğrulanmalıdır.</p></section></main>;
}
