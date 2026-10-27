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
  ["trainer-welcome", "TRAINER", "FIXOKU'ya Hoş Geldiniz | Eğitmen Hesabınız", "Eğitmen hesabınız oluşturuldu", "Başvurunuz alındı ve eğitmen hesabınız oluşturuldu."],
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

function renderVariableText(value, data) {
  return text(value).replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu, (_match, key) => escapeHtml(data[key] == null ? "" : data[key]));
}

function sanitizeOverrideHtml(value, data) {
  let html = renderVariableText(value, data).slice(0, 20000);
  if (/<script|<iframe|<object|<embed|javascript\s*:/iu.test(html)) throw new Error("EMAIL_TEMPLATE_HTML_UNSAFE");
  html = html.replace(/<!--([\s\S]*?)-->/gu, "").replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "");
  html = html.replace(/\s+(?:style|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "");
  html = html.replace(/\s+(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu, (_full, name, quoted1, quoted2, bare) => {
    const raw = quoted1 || quoted2 || bare;
    try {
      const url = new URL(raw, "https://fixoku.com");
      if (url.origin !== "https://fixoku.com" || !["https:", "http:"].includes(url.protocol)) return "";
      return ` ${name.toLowerCase()}="${escapeHtml(url.toString())}"`;
    } catch { return ""; }
  });
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "h2", "h3"]);
  return html.replace(/<\/?([a-z0-9-]+)(?:\s[^>]*)?>/giu, (tag, name) => allowed.has(name.toLowerCase()) ? tag : "").trim();
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
  const override = options.templateOverride && typeof options.templateOverride === "object" ? options.templateOverride : {};
  const effectiveTemplate = { ...template, subject: text(override.subject, template.subject), title: text(override.title, template.title), body: text(override.body, template.body) };
  const selectedBody = data.body && text(data.body).trim() !== effectiveTemplate.body
    ? `${effectiveTemplate.body}\n\n${text(data.body).trim()}` : effectiveTemplate.body;
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
  const blackLogoUrl = text(options.blackLogoUrl, `${baseUrl}/siyah-logo-fixoku.png`);
  const supportEmail = text(data.supportEmail, template.id === "trainer-welcome" ? "info@fixoku.com" : "destek@fixoku.com");
  const footerLegal = template.marketing
    ? `<p style="margin:22px 0 0;color:#667085;font-size:12px;line-height:1.6">Bu ileti, verdiğiniz pazarlama iznine dayanır. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b21a8">Abonelikten çık</a> · <a href="${escapeHtml(preferenceUrl)}" style="color:#6b21a8">İletişim tercihlerini yönet</a></p>`
    : `<p style="margin:22px 0 0;color:#667085;font-size:12px;line-height:1.6">Bu işlemsel ileti hesabınızın veya talebinizin güvenli yürütülmesi için gönderilmiştir.</p>`;
  // Outlook desktop drops CSS gradients and may hide remote white logos. Keep
  // the approved colorful header for modern clients, and provide a readable
  // black-logo/white-background table yedek for the Outlook branch.
  const headerMarkup = `<!--[if mso]><tr><td align="center" bgcolor="#ffffff" style="padding:24px 28px;background-color:#ffffff;text-align:center"><img src="${escapeHtml(blackLogoUrl)}" width="200" alt="FIXOKU" style="display:block;width:200px;max-width:100%;height:auto;max-height:76px;margin:0 auto;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700"></td></tr><![endif]--><!--[if !mso]><!--><tr><td align="center" style="padding:24px 28px;background-color:#51156f;background:linear-gradient(110deg,#51156f,#d6601b);text-align:center"><img src="${escapeHtml(logoUrl)}" width="200" alt="FIXOKU" style="display:block;width:200px;max-width:100%;height:auto;max-height:76px;margin:0 auto;object-fit:contain;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700"></td></tr><!--<![endif]-->`;
  const customHtml = override.htmlBody ? sanitizeOverrideHtml(override.htmlBody, data) : "";
  const bodyMarkup = customHtml || `<p>${escapeHtml(selectedBody).replace(/\n\n/gu, "</p><p>")}</p>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(effectiveTemplate.subject)}</title></head><body style="margin:0;background:#f6f4f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(effectiveTemplate.body)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f8"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(31,41,55,.08)">${headerMarkup}<tr><td style="padding:30px 28px 24px"><p style="margin:0 0 10px;color:#8b5cf6;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700">${escapeHtml(displayEmailCategory(effectiveTemplate.category))}</p><h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#311348">${escapeHtml(effectiveTemplate.title)}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.6">${escapeHtml(greeting)}</p><div style="margin:0;font-size:16px;line-height:1.6">${bodyMarkup}</div>${rowsMarkup ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid #eee;border-radius:10px;overflow:hidden">${rowsMarkup}</table>` : ""}<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 20px;background:#bf531a;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">${escapeHtml(ctaLabel)}</a>${data.secondaryCtaPath ? `<a href="${escapeHtml(safeUrl(data.secondaryCtaPath, baseUrl))}" style="display:inline-block;margin-left:12px;color:#6b21a8;font-weight:700">${escapeHtml(data.secondaryCtaLabel || "Ayrıntıları gör")}</a>` : ""}<p style="margin:24px 0 0;color:#667085;font-size:13px;line-height:1.6">Sorularınız için <a href="mailto:${escapeHtml(supportEmail)}" style="color:#6b21a8">${escapeHtml(supportEmail)}</a> adresinden bize ulaşabilirsiniz.</p>${footerLegal}</td></tr><tr><td style="padding:18px 28px;background:#fafafa;color:#667085;font-size:12px;line-height:1.6">Fixoku · Eğitim ve gelişim platformu<br><a href="${escapeHtml(`${baseUrl}/iletisim`)}" style="color:#667085">İletişim</a> · <a href="${escapeHtml(`${baseUrl}/gizlilik-politikasi`)}" style="color:#667085">Gizlilik</a> · <a href="${escapeHtml(`${baseUrl}/kvkk-aydinlatma-metni`)}" style="color:#667085">KVKK</a></td></tr></table></td></tr></table></body></html>`;
  const plainText = `${effectiveTemplate.title}\n\n${greeting}\n\n${renderVariableText(selectedBody, data)}\n\n${rowsPlain}\n\n${ctaLabel}: ${ctaUrl}\n\nSorularınız için ${supportEmail}\n${effectiveTemplate.marketing ? `Abonelikten çık: ${unsubscribeUrl}\nİletişim tercihlerini yönet: ${preferenceUrl}\n` : ""}\nFixoku · ${baseUrl}`;
  const result = { templateId: template.id, templateRevisionId: override.revisionId || null, category: effectiveTemplate.category, subject: text(data.subject, effectiveTemplate.subject), from: identity.address, replyTo: identity.replyTo, html, text: plainText };
  if (template.marketing) result.headers = { "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:kampanya@fixoku.com?subject=unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return result;
}

export function renderEmailForEvent(eventType, data = {}, options = {}) {
  const normalized = text(eventType).toLowerCase().replace(/_/gu, "-");
  const aliases = { "account-email-verification": "email-verification", "account-password-reset": "password-reset", "account-activation": "welcome", "student-registration-welcome": "welcome", "student-order-received": "order-received", "student-payment-successful": "payment-successful", "student-trainer-assignment": "trainer-assigned", "student-shipment": "shipment-shipped", "trainer-application-received": "trainer-application-received", "trainer-welcome": "trainer-welcome", "trainer-student-assigned": "trainer-assigned", "trainer-assignment": "trainer-assigned", "trainer-reassignment": "trainer-reassigned", "trainer-earning": "earning-created", "education-completion": "education-completed", "enrollment-completion": "education-completed", "trainer-earning-created": "earning-created", "trainer-earning-payable": "earning-payable", "trainer-payout-completed": "payout-completed", marketing: "marketing-permission-aware" };
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
  const baseUrl = text(options.baseUrl, DEFAULT_BASE_URL).replace(/\/$/u, "");
  try {
    const actionUrl = new URL(url, baseUrl);
    const expectedOrigin = new URL(baseUrl).origin;
    if (!["http:", "https:"].includes(actionUrl.protocol) || actionUrl.origin !== expectedOrigin) throw new Error("LIFECYCLE_URL_ORIGIN_MISMATCH");
  } catch (error) {
    if (error?.message === "LIFECYCLE_URL_ORIGIN_MISMATCH") throw error;
    throw new Error("LIFECYCLE_URL_INVALID");
  }
  const templateId = kind === "reset" ? "password-reset" : kind === "verification" ? "email-verification" : null;
  if (!templateId) throw new Error("LIFECYCLE_KIND_UNKNOWN");
  return renderEmail(templateId, {
    recipientName: text(value.recipientName).trim() || undefined,
    actionUrl: url,
  }, options);
}
export const EMAIL_TEMPLATE_COUNT = EMAIL_TEMPLATE_CATALOG.length;
