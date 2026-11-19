import { Link } from "react-router-dom";
import { corporateArticles, corporateHub } from "../data/corporateContent.js";
import { contactPhones } from "../data/legalContent.js";
import { trainingArticles, trainingHub } from "../data/trainingContent.js";

const corporateFooterLinks = [
  { label: corporateHub.heading, to: corporateHub.path },
  ...corporateArticles.map((article) => ({ label: article.navLabel, to: article.path })),
];

const trainingFooterLinks = [
  { label: trainingHub.navLabel, to: trainingHub.path },
  ...trainingArticles
    .filter((article) => article.footerFeatured)
    .map((article) => ({ label: article.navLabel, to: article.path })),
];

const footerColumns = [
  {
    title: "Eğitimlerimiz",
    links: trainingFooterLinks,
  },
  {
    title: "Fixoku Eğitimi",
    links: [
      { label: "Fixoku Eğitimi", to: "/fixoku-egitimi" },
      { label: "Neden Fixoku?", to: "/fixoku-egitimi/neden-fixoku" },
      { label: "Eğitim Nasıl Veriliyor", to: "/fixoku-egitimi/egitim-sureci" },
      { label: "Yapay Zekâ Destekli Yazılım", to: "/fixoku-egitimi/yazilim" },
      { label: "Hızlı Okuma Kitabı", to: "/fixoku-egitimi/hizli-okuma-kitabi" },
      { label: "Egzersiz Kitapları", to: "/fixoku-egitimi/egzersiz-kitaplari" },
      { label: "Paragraf Kitapları", to: "/fixoku-egitimi/paragraf-kitaplari" },
    ],
  },
  {
    title: "Kurumsal",
    links: corporateFooterLinks,
  },
  {
    title: "Ücretsiz Testler",
    links: [
      { label: "Okuma Hızı Testi", to: "/?test=reading" },
      { label: "Okuma ve Anlama Testi", to: "/?test=reading" },
      { label: "Dikkat Testi", to: "/?test=attention" },
      { label: "Odaklanma Testi", to: "/?test=attention" },
    ],
  },
  {
    title: "Bilgi Merkezi",
    links: [
      { label: "Bilgi Merkezi", to: "/blog" },
      { label: "Hızlı Okuma Rehberi", to: "/hizli-okuma" },
      { label: "Dikkat ve Odaklanma Rehberi", to: "/dikkat-ve-odaklanma" },
      { label: "Sık Sorulan Sorular", to: "/sss" },
      { label: "İletişim", to: "/iletisim" },
    ],
  },
];

function Footer({ showCta = true }) {
  return (
    <footer className="site-footer">
      {showCta && <div className="footer-cta-band">
        <div className="footer-cta-inner">
          <div className="footer-cta-text">
            <h2>Çocuğunuzun Akademik Gelişimini Ertelemeyin</h2>
            <p>
              Okuma, anlama, dikkat ve odaklanma becerilerini geliştirmek için
              ücretsiz seviye tespiti yapın ve uzman eğitmenlerimizden destek alın.
            </p>
          </div>

          <div className="footer-cta-actions">
            <Link to="/?test=reading" className="footer-cta-btn primary">
              <span>Ücretsiz Seviye Tespiti Yap</span>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <Link to="/iletisim" className="footer-cta-btn secondary">
              <span>Eğitim Hakkında Bilgi Al</span>
            </Link>
          </div>
        </div>
      </div>}

      <div className="footer-main">
        <div className="footer-main-inner">
          <div className="footer-brand">
            <Link to="/" className="footer-logo" aria-label="Fixoku Ana Sayfa">
              <img src="/logo-fixoku.png" alt="Fixoku Logo" />
            </Link>

            <p className="footer-brand-subtitle">YENİ NESİL AKADEMİK GELİŞİM SİSTEMİ</p>

            <p className="footer-brand-text">
              Fixoku; kitap, yazılım ve uzman eğitmen desteğini bir araya getiren
              hızlı okuma, anlama, dikkat ve odaklanma, paragraf teknikleri ile
              öğrencilerin akademik başarılarına katkı sağlayan eğitim sistemidir.
            </p>

            <div className="footer-socials">
              <a href="https://www.instagram.com/fixokuakademi" target="_blank" rel="noopener noreferrer" aria-label="Fixoku Instagram hesabını yeni sekmede aç" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
                </svg>
              </a>

              <a href="https://www.youtube.com/@fixoku" target="_blank" rel="noopener noreferrer" aria-label="Fixoku YouTube kanalını yeni sekmede aç" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 12c0 2.7-.3 4.4-.6 5.3a2.8 2.8 0 0 1-2 2C17.4 20 15 20 12 20s-5.4 0-6.4-.7a2.8 2.8 0 0 1-2-2C3.3 16.4 3 14.7 3 12s.3-4.4.6-5.3a2.8 2.8 0 0 1 2-2C6.6 4 9 4 12 4s5.4 0 6.4.7a2.8 2.8 0 0 1 2 2c.3.9.6 2.6.6 5.3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path d="M10 9.2 15.2 12 10 14.8V9.2Z" fill="currentColor" />
                </svg>
              </a>

              <a href="https://www.facebook.com/fixoku" target="_blank" rel="noopener noreferrer" aria-label="Fixoku Facebook sayfasını yeni sekmede aç" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13.2 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4H16V5.4c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.2v1.8H8.8V14H11v7h2.2Z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              <a href="https://www.linkedin.com/company/fixoku" target="_blank" rel="noopener noreferrer" aria-label="Fixoku LinkedIn sayfasını yeni sekmede aç" className="footer-social-link">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6.2 8.8H3.4V20h2.8V8.8Zm.2-3.4A1.6 1.6 0 1 1 3.2 5.4a1.6 1.6 0 0 1 3.2 0ZM20.6 13.1c0-3.3-1.8-4.8-4.2-4.8-1.9 0-2.8 1.1-3.3 1.8v-1.5h-2.7V20h2.8v-5.6c0-1.5.3-2.9 2.1-2.9s1.8 1.7 1.8 3V20h2.8v-6.9Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
            <div className="footer-brand-extras">

              <div className="footer-etbis">
  <a href="https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=2dce6d96-f0b8-4644-a7a2-73c51682be64" target="_blank" rel="noopener noreferrer" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
    <img src="/logo-etbis.png" alt="ETBİS" />
    <span style={{fontSize:"12px",color:"#333333",textDecoration:"underline",textAlign:"center"}}>ETBİS Kaydımızı Sorgulayın</span>
  </a>
</div>
            </div>
          </div>

          {[[0, 3], [1, 4], [2]].map((indices) => (
            <div className="footer-column-stack" key={indices[0]}>
              {indices[0] === 2 && (
          <div className="footer-contact">
            <h3>İletişim</h3>

            <div className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18v12H3z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <a href="mailto:info@fixoku.com" data-analytics-placement="footer" data-cta-id="footer-email">info@fixoku.com</a>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.52 3.48A11.94 11.94 0 0 0 12.01 0C5.39 0 0 5.39 0 12.01c0 2.12.55 4.19 1.61 6.02L0 24l6.13-1.61A11.99 11.99 0 0 0 12 24h.01C18.63 24 24 18.62 24 12c0-3.2-1.25-6.21-3.48-8.52ZM12 21.97a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.77.99 1.01-3.67-.23-.38A9.97 9.97 0 0 1 2.03 12C2.03 6.51 6.51 2.03 12 2.03c2.67 0 5.18 1.04 7.06 2.93A9.9 9.9 0 0 1 21.97 12c0 5.5-4.47 9.97-9.97 9.97Zm5.47-7.47c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61l.45-.52c.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
              </span>
              <div className="footer-contact-details">
                <span className="footer-contact-label">{contactPhones.mobile.label}</span>
                <a href={contactPhones.mobile.telUri} aria-label="Fixoku cep telefonunu ara" data-analytics-placement="footer" data-cta-id="footer-mobile-phone">
                  {contactPhones.mobile.display}
                </a>
                <a href={`${contactPhones.mobile.whatsappUrl}?text=${encodeURIComponent("Merhaba Fixoku, internet siteniz üzerinden size ulaşıyorum. Eğitimleriniz ve hizmetleriniz hakkında bilgi ve destek almak istiyorum. Yardımcı olabilir misiniz?")}`} target="_blank" rel="noopener noreferrer" aria-label="Fixoku WhatsApp destek hattını aç" data-analytics-placement="footer" data-cta-id="footer-whatsapp">
                  WhatsApp üzerinden yazın
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 2h4l2 5-2 2a14 14 0 006 6l2-2 5 2v4c0 1-1 2-2 2C10 21 3 14 3 6c0-1 1-2 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <div className="footer-contact-details">
                <span className="footer-contact-label">{contactPhones.office.label}</span>
                <a href={contactPhones.office.telUri} aria-label="Fixoku ofis telefonunu ara" data-analytics-placement="footer" data-cta-id="footer-office-phone">
                  {contactPhones.office.display}
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <span>Yenişehir, Konak / İzmir</span>
            </div>

            <div className="footer-contact-consent"><button type="button" className="footer-consent-link" onClick={() => window.dispatchEvent(new CustomEvent("fixoku:consent-open"))}>Çerez Tercihleri</button></div>
          </div>
              )}
              {indices.map((index) => {
                const column = footerColumns[index];
                return (
                  <div className="footer-links-group" key={column.title}>
                    <h3>{column.title}</h3>
                    <ul>
                      {column.links.map((link) => (
                        <li key={`${column.title}-${link.to}-${link.label}`}>
                          <Link to={link.to}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            </div>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-legal-copy">
            <p>© 2026 Fixoku. Tüm hakları saklıdır.</p>
            <p className="footer-agency-text">Fixoku, Mavi Yeşil Ajans kuruluşudur.</p>
            <p className="footer-legal-name">
              Fixoku Yayınları — Mavi Yeşil Ajans
            </p>
          </div>

          <div className="footer-bottom-links">
            <Link to="/kvkk-aydinlatma-metni">KVKK</Link>
            <Link to="/satici-bilgileri">Satıcı Bilgileri</Link>
            <Link to="/gizlilik-politikasi">Gizlilik</Link>
            <Link to="/cerez-politikasi">Çerez Politikası</Link>
            <Link to="/mesafeli-satis-sozlesmesi">Mesafeli Satış</Link>
            <Link to="/on-bilgilendirme-formu">Ön Bilgilendirme</Link>
            <Link to="/iptal-iade-cayma-politikasi">İptal / İade / Cayma</Link>
            <Link to="/teslimat-kargo-politikasi">Teslimat / Kargo</Link>
            <Link to="/kullanim-kosullari">Kullanım Koşulları</Link>
            <Link to="/uyelik-sozlesmesi">Üyelik Sözleşmesi</Link>
            <Link to="/musteri-sikayetleri-ve-uyusmazlik">Şikâyet ve Uyuşmazlık</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
