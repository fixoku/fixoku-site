import { EMAIL_EDITORIAL_V1, EMAIL_EDITORIAL_DRAFTS_V1 } from "./email-editorial-v1.js";
/*
 * Provider-neutral Fixoku email renderer.
 *
 * The renderer deliberately accepts a small structured data object and never
 * treats database values as HTML. Both the TEST transport and a future SMTP
 * transport use the same renderEmail() result.
 */

const DEFAULT_LOGO_URL = "https://fixoku.com/logo-fixoku.png";
const DEFAULT_BASE_URL = "https://fixoku.com";

export const EMAIL_TEMPLATE_CATALOG = [
  ["welcome", "ACCOUNT", "Fixoku'ya hoş geldiniz", "Hesabınız hazır", "Hesap bilgilerinizi tamamlayarak başlayın."],
  ["email-verification", "ACCOUNT", "E-posta adresinizi doğrulayın", "E-posta adresinizi doğrulayın", "Hesabınızı korumak için e-posta adresinizi doğrulayın."],
  ["password-reset", "ACCOUNT", "Şifrenizi yenileyin", "Şifre yenileme bağlantınız hazır", "Hesabınıza güvenli şekilde erişmek için yeni bir şifre belirleyin."],
  ["profile-completion", "ACCOUNT", "Profilinizi tamamlayın", "Profilinizde birkaç adım kaldı", "Size daha iyi bir Fixoku deneyimi sunabilmemiz için profilinizi tamamlayın."],
  ["order-received", "COMMERCE", "Siparişiniz alındı", "Siparişinizi aldık", "Sipariş bilgileriniz kaydedildi. Güncel durumu panelinizden takip edebilirsiniz."],
  ["payment-successful", "COMMERCE", "Ödemeniz başarıyla alındı", "Ödemeniz onaylandı", "Ödemeniz güvenli şekilde işlendi. Siparişiniz hazırlanmaya başlayacak."],
  ["payment-failed", "COMMERCE", "Ödeme tamamlanamadı", "Ödeme işlemi tamamlanamadı", "Ödeme sağlayıcısı işlemi tamamlayamadı. Siparişinizi panelden yeniden deneyebilirsiniz."],
  ["package-activated", "COMMERCE", "Paketiniz etkinleştirildi", "Paketiniz kullanıma hazır", "Satın aldığınız paket hesabınıza tanımlandı."],
  ["digital-content-available", "COMMERCE", "Dijital içeriğiniz hazır", "Dijital içeriğinize erişebilirsiniz", "Yetkiniz bulunan içerikler panelinizde sizi bekliyor."],
  ["trainer-assigned", "TRAINER", "Yeni öğrenci ataması", "Yeni öğrenci atamanız hazır", "Atama ayrıntılarını güvenli eğitmen panelinizden inceleyebilirsiniz."],
  ["trainer-reassigned", "TRAINER", "Atamanız güncellendi", "Eğitmen atamanız güncellendi", "Atama bilgilerinizde bir değişiklik yapıldı. Güncel ayrıntılar panelinizde."],
  ["trainer-qualification-approved", "TRAINER", "Yeterliliğiniz onaylandı", "Eğitmen yeterliliğiniz onaylandı", "Fixoku eğitmen programına devam etmek için panelinizi açabilirsiniz."],
  ["trainer-qualification-suspended", "TRAINER", "Yeterlilik durumunuz değişti", "Yeterlilik durumunuz askıya alındı", "Durum ayrıntılarını ve sonraki adımları panelinizde bulabilirsiniz."],
  ["education-started", "TRAINER", "Eğitim başladı", "Eğitim süreci başladı", "Eğitim takviminiz ve kaynaklarınız artık panelinizde."],
  ["education-reminder", "TRAINER", "Eğitim hatırlatması", "Yaklaşan eğitim etkinliğiniz var", "Takviminizi kontrol etmek için eğitmen panelinizi açın."],
  ["education-completed", "TRAINER", "Eğitim tamamlandı", "Eğitim tamamlandı", "Tamamlanma bilgisi hesabınıza işlendi."],
  ["earning-created", "TRAINER", "Kazanç kaydı oluşturuldu", "Yeni kazanç kaydınız hazır", "Kazanç hareketinizi güvenli panelinizden inceleyebilirsiniz."],
  ["earning-payable", "TRAINER", "Kazancınız ödenebilir durumda", "Kazancınız ödeme için hazır", "Ödeme durumunu ve hesabınızı panelinizden kontrol edebilirsiniz."],
  ["payout-completed", "TRAINER", "Ödeme tamamlandı", "Ödemeniz tamamlandı", "Ödeme kaydınız panelinizde güncellendi."],
  ["shipment-preparing", "SHIPPING", "Siparişiniz hazırlanıyor", "Siparişiniz hazırlanıyor", "Siparişiniz paketleme aşamasında."],
  ["shipment-shipped", "SHIPPING", "Siparişiniz kargoya verildi", "Siparişiniz yola çıktı", "Kargo durumunu panelinizden takip edebilirsiniz."],
  ["shipment-delivered", "SHIPPING", "Siparişiniz teslim edildi", "Siparişiniz teslim edildi", "Teslimat kaydı oluşturuldu."],
  ["shipment-returned-cancelled", "SHIPPING", "Gönderi durumunuz güncellendi", "Gönderi durumunuz güncellendi", "İade veya iptal ayrıntıları için destek ekibimiz yanınızda."],
  ["support-request-received", "SUPPORT", "Destek talebiniz alındı", "Destek talebinizi aldık", "Talebiniz kayıt altına alındı. Ekibimiz en kısa sürede dönüş yapacak."],
  ["institution-application-received", "APPLICATION", "Kurum başvurunuz alındı", "Kurum başvurunuzu aldık", "Başvurunuz incelenmek üzere güvenli şekilde kaydedildi."],
  ["trainer-application-received", "APPLICATION", "Eğitmen başvurunuz alındı", "Eğitmen başvurunuzu aldık", "Başvurunuz incelenmek üzere kaydedildi."],
  ["marketing-permission-aware", "MARKETING", "Fixoku'dan size özel gelişmeler", "Fixoku'dan yeni gelişmeler", "İlginizi çekebilecek yeni eğitim ve ürün haberlerini sizin için derledik."],
].map(([id, category, subject, title, body]) => ({
  id, category,
  subject: EMAIL_EDITORIAL_V1[id]?.subject || subject,
  title: EMAIL_EDITORIAL_V1[id]?.title || title,
  body: EMAIL_EDITORIAL_V1[id]?.paragraphs?.join("\n\n") || body,
  marketing: category === "MARKETING",
}));
// Yeni olay adayları yalnızca editoryal taslaktır; gönderim tetikleyicisi değildir.
export const EMAIL_EDITORIAL_DRAFTS = EMAIL_EDITORIAL_DRAFTS_V1;

const CATALOG_BY_ID = new Map(EMAIL_TEMPLATE_CATALOG.map((template) => [template.id, template]));

export const EMAIL_IDENTITIES = [
  { address: "destek@fixoku.com", purpose: "Destek", kind: "REAL INBOX", replyTo: "destek@fixoku.com" },
  { address: "egitmen@fixoku.com", purpose: "Eğitmen operasyonu", kind: "REAL INBOX", replyTo: "destek@fixoku.com" },
  { address: "muhasebe@fixoku.com", purpose: "Muhasebe", kind: "REAL INBOX", replyTo: "muhasebe@fixoku.com" },
  { address: "kvkk@fixoku.com", purpose: "KVKK başvuruları", kind: "REAL INBOX", replyTo: "kvkk@fixoku.com" },
  { address: "bildirim@fixoku.com", purpose: "İşlemsel bildirimler", kind: "ALIAS / SYSTEM SENDER", replyTo: "destek@fixoku.com" },
  { address: "siparis@fixoku.com", purpose: "Sipariş ve kargo", kind: "ALIAS / SYSTEM SENDER", replyTo: "destek@fixoku.com" },
  { address: "kampanya@fixoku.com", purpose: "İzinli pazarlama", kind: "MARKETING SENDER", replyTo: "destek@fixoku.com" },
];

const DEFAULT_DATA = { ctaLabel: "Hesabımı görüntüle", ctaPath: "/giris" };

function text(value, fallback = "") {
  return value == null ? fallback : String(value);
}

export function escapeHtml(value) {
  return text(value).replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function safeUrl(value, baseUrl) {
  try {
    const url = new URL(text(value, "/panel/owner"), baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return `${baseUrl}/panel/owner`;
    return url.toString();
  } catch { return `${baseUrl}/panel/owner`; }
}

// Technical categories remain unchanged for routing; only customer-facing labels are localized.
const EMAIL_CATEGORY_TR = Object.freeze({
  ACCOUNT: "Hesap", COMMERCE: "Ticaret", TRAINER: "Eğitmen", STUDENT: "Öğrenci",
  SHIPPING: "Kargo", SUPPORT: "Destek", APPLICATION: "Başvuru", MARKETING: "Pazarlama",
});
function displayEmailCategory(category) {
  return EMAIL_CATEGORY_TR[category] || String(category || "");
}

function identityFor(template) {
  if (template.marketing) return EMAIL_IDENTITIES.find((item) => item.address.startsWith("kampanya@"));
  if (template.category === "TRAINER") return EMAIL_IDENTITIES.find((item) => item.address.startsWith("egitmen@"));
  if (template.category === "COMMERCE" || template.category === "SHIPPING") return EMAIL_IDENTITIES.find((item) => item.address.startsWith("siparis@"));
  return EMAIL_IDENTITIES.find((item) => item.address.startsWith("bildirim@"));
}

// Bilgi satırları yalnızca seçilen olaya ait, sağlanmış gerçek alanlardan üretilir.
function detailRows(templateId, data) {
  const def = EMAIL_EDITORIAL_V1[templateId];
  if (!def) return [];
  return def.fields.map(({ label, key }) => ({ label, value: text(data[key]).trim() }))
    .filter(({ value }) => value && value !== "—" && !/^(FX-LOCAL-2026|FX-2026-005A)$/u.test(value));
}
function dataBlock(data, templateId) {
  return detailRows(templateId, data).map(({ label, value }) =>
    `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#667085;font-size:13px">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;color:#1f2937;font-weight:700;font-size:14px">${escapeHtml(value)}</td></tr>`
  ).join("");
}
function plainDataBlock(data, templateId) {
  return detailRows(templateId, data).map(({ label, value }) => `${label}: ${value}`).join("\n");
}

/** Render HTML and plain text from one structured template contract. */
export function renderEmail(templateId, input = {}, options = {}) {
  const template = CATALOG_BY_ID.get(templateId);
  if (!template) throw new Error("EMAIL_TEMPLATE_UNKNOWN");
  const definition = EMAIL_EDITORIAL_V1[templateId];
  const fixture = options.preview === true ? definition?.fixture || {} : {};
  const data = { ...DEFAULT_DATA, ...fixture, ...(input && typeof input === "object" ? input : {}) };
  const selectedBody = data.body && text(data.body).trim() !== template.body
    ? `${template.body}\n\n${text(data.body).trim()}` : template.body;
  const baseUrl = text(options.baseUrl, DEFAULT_BASE_URL).replace(/\/$/u, "");
  const logoUrl = text(options.logoUrl, DEFAULT_LOGO_URL);
  const identity = identityFor(template);
  const ctaUrl = safeUrl(data.actionUrl || data.ctaPath || definition?.path, baseUrl);
  const ctaLabel = data.ctaLabel === DEFAULT_DATA.ctaLabel ? definition?.cta || DEFAULT_DATA.ctaLabel : data.ctaLabel;
  const rowsMarkup = dataBlock(data, template.id);
  const rowsPlain = plainDataBlock(data, template.id);
  const unsubscribeUrl = safeUrl(data.unsubscribePath || "/iletisim?unsubscribe=1", baseUrl);
  const preferenceUrl = safeUrl(data.preferencePath || "/iletisim?preferences=1", baseUrl);
  const greeting = text(data.recipientName).trim() ? `Merhaba ${text(data.recipientName).trim()},` : "Merhaba,";
  const footerLegal = template.marketing
    ? `<p style="margin:22px 0 0;color:#667085;font-size:12px;line-height:1.6">Bu ileti, verdiğiniz pazarlama iznine dayanır. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b21a8">Abonelikten çık</a> · <a href="${escapeHtml(preferenceUrl)}" style="color:#6b21a8">İletişim tercihlerini yönet</a></p>`
    : `<p style="margin:22px 0 0;color:#667085;font-size:12px;line-height:1.6">Bu işlemsel ileti hesabınızın veya talebinizin güvenli yürütülmesi için gönderilmiştir.</p>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(template.subject)}</title></head><body style="margin:0;background:#f6f4f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(template.body)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(31,41,55,.08)"><tr><td style="padding:24px 28px;background:linear-gradient(110deg,#51156f,#d6601b);text-align:center" align="center"><img src="${escapeHtml(logoUrl)}" width="200" alt="Fixoku" style="display:block;width:200px;max-width:100%;height:auto;max-height:76px;margin:0 auto;object-fit:contain"></td></tr><tr><td style="padding:30px 28px 24px"><p style="margin:0 0 10px;color:#8b5cf6;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700">${escapeHtml(displayEmailCategory(template.category))}</p><h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#311348">${escapeHtml(template.title)}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.6">${escapeHtml(greeting)}</p><p style="margin:0;font-size:16px;line-height:1.6">${escapeHtml(selectedBody).replace(/\n\n/gu, "</p><p style=\"margin:13px 0 0;font-size:16px;line-height:1.6\">")}</p>${rowsMarkup ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #eee;border-radius:10px;overflow:hidden">${rowsMarkup}</table>` : ""}<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 20px;background:#bf531a;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">${escapeHtml(ctaLabel)}</a>${data.secondaryCtaPath ? `<a href="${escapeHtml(safeUrl(data.secondaryCtaPath, baseUrl))}" style="display:inline-block;margin-left:12px;color:#6b21a8;font-weight:700">${escapeHtml(data.secondaryCtaLabel || "Ayrıntıları gör")}</a>` : ""}<p style="margin:24px 0 0;color:#667085;font-size:13px;line-height:1.6">Sorularınız için <a href="mailto:destek@fixoku.com" style="color:#6b21a8">destek@fixoku.com</a> adresinden bize ulaşabilirsiniz.</p>${footerLegal}</td></tr><tr><td style="padding:18px 28px;background:#fafafa;color:#667085;font-size:12px;line-height:1.6">Fixoku · Eğitim ve gelişim platformu<br><a href="${escapeHtml(`${baseUrl}/iletisim`)}" style="color:#667085">İletişim</a> · <a href="${escapeHtml(`${baseUrl}/gizlilik-politikasi`)}" style="color:#667085">Gizlilik</a> · <a href="${escapeHtml(`${baseUrl}/kvkk-aydinlatma-metni`)}" style="color:#667085">KVKK</a></td></tr></table></td></tr></table></body></html>`;
  const plainText = `${template.title}\n\n${greeting}\n\n${selectedBody}\n\n${rowsPlain}\n\n${ctaLabel}: ${ctaUrl}\n\nSorularınız için destek@fixoku.com\n${template.marketing ? `Abonelikten çık: ${unsubscribeUrl}\nİletişim tercihleri: ${preferenceUrl}\n` : ""}\nFixoku · ${baseUrl}`;
  const result = { templateId: template.id, category: template.category, subject: text(data.subject, template.subject), from: identity.address, replyTo: identity.replyTo, html, text: plainText };
  if (template.marketing) result.headers = { "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:kampanya@fixoku.com?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return result;
}

export function renderEmailForEvent(eventType, data = {}, options = {}) {
  const normalized = text(eventType).toLowerCase().replace(/_/gu, "-");
  const aliases = { "account-email-verification": "email-verification", "account-password-reset": "password-reset", "account-activation": "welcome", "student-registration-welcome": "welcome", "student-order-received": "order-received", "student-payment-successful": "payment-successful", "student-trainer-assignment": "trainer-assigned", "student-shipment": "shipment-shipped", "trainer-application-received": "trainer-application-received", "trainer-student-assigned": "trainer-assigned", "trainer-assignment": "trainer-assigned", "trainer-reassignment": "trainer-reassigned", "trainer-earning": "earning-created", "education-completion": "education-completed", "enrollment-completion": "education-completed", "trainer-earning-created": "earning-created", "trainer-earning-payable": "earning-payable", "trainer-payout-completed": "payout-completed", marketing: "marketing-permission-aware" };
  const template = EMAIL_TEMPLATE_CATALOG.find((candidate) => candidate.id === (aliases[normalized] || normalized));
  if (!template) throw new Error("EMAIL_EVENT_UNKNOWN");
  const definition = EMAIL_EDITORIAL_V1[template.id];
  if (template.marketing && options.preview !== true) {
    throw new Error("EMAIL_MARKETING_CONSENT_UNSUBSCRIBE_NOT_VERIFIED");
  }
  if (options.preview !== true) {
    if (!text(data.recipientName).trim() || /^Fixoku kullanıcısı$/iu.test(text(data.recipientName).trim())) throw new Error("EMAIL_RECIPIENT_NAME_REQUIRED");
    for (const key of definition.required) {
      if (!text(data[key]).trim()) throw new Error(`EMAIL_REQUIRED_FIELD_${key.toUpperCase()}`);
    }
  }
  return renderEmail(template.id, data, options);
}

/** Render Better Auth lifecycle mail from the provider URL without logging or regenerating it. */
export function renderLifecycleEmail(kind, input = {}, options = {}) {
  const value = input && typeof input === "object" ? input : {};
  const url = String(value.url || "");
  if (!url) throw new Error("LIFECYCLE_URL_REQUIRED");
  const reset = kind === "reset";
  const subject = reset ? "FIXOKU | Şifre Sıfırlama" : "FIXOKU | E-posta Adresinizi Doğrulayın";
  const title = reset ? "Şifrenizi güvenle sıfırlayın" : "E-posta adresinizi doğrulayın";
  const body = reset ? "Şifre sıfırlama talebiniz alındı." : "FIXOKU hesabınızı korumak için e-posta adresinizi doğrulayın.";
  const cta = reset ? "Şifremi sıfırla" : "E-posta adresimi doğrula";
  const note = reset ? "Bu talebi siz oluşturmadıysanız e-postayı yok sayabilirsiniz." : "Doğrulama bağlantısı Better Auth tarafından belirlenen geçerlilik süresi içinde kullanılmalıdır.";
  const greeting = "Merhaba " + String(value.recipientName || "Fixoku kullanıcısı") + ",";
  const escapedUrl = escapeHtml(url);
  const baseUrl = text(options.baseUrl, DEFAULT_BASE_URL).replace(/\/$/u, "");
  const html = "<!doctype html><html lang=\"tr\"><body><h1>" + escapeHtml(title) + "</h1><p>" + escapeHtml(greeting) + "</p><p>" + escapeHtml(body) + "</p><p><a href=\"" + escapedUrl + "\">" + escapeHtml(cta) + "</a></p><p>" + escapeHtml(note) + "</p><p>FIXOKU · " + escapeHtml(baseUrl) + "</p></body></html>";
  const plainText = title + "\n\n" + greeting + "\n\n" + body + "\n\n" + cta + ": " + url + "\n\n" + note + "\n\nFIXOKU · " + baseUrl;
  return { subject, from: "", replyTo: "destek@fixoku.com", html, text: plainText };
}
export const EMAIL_TEMPLATE_COUNT = EMAIL_TEMPLATE_CATALOG.length;
