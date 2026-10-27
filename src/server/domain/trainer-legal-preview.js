// 020F: authenticated, read-only contract preview. Never substitutes fictitious customer or merchant data.
const clean = value => String(value ?? '').trim();
const money = minor => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(minor||0)/100);
const fullAddress = address => [clean(address?.addressLine),clean(address?.district),clean(address?.city)].filter(Boolean).join(', ');
const asText = value => clean(value) || null;
function details(cart) {
  return (cart?.items||[]).map(item=>{
    const line = `${clean(item.title)} (1 adet, ${money(item.priceGrossMinor)})`;
    const books=(item.physicalItems||[]).map(p=>`${clean(p.title)} (${Number(p.quantity||1)} adet)`).join(', ');
    return books ? `${line}; pakete dahil kitaplar: ${books}` : line;
  }).join('\n');
}
export function renderTrainerLegalPreview({document,cart,shipping,email,paymentMethod}) {
  if (!document || typeof document.markdown!=='string') throw Error('LEGAL_DOCUMENT_REQUIRED');
  const name=[clean(shipping?.firstName),clean(shipping?.lastName)].filter(Boolean).join(' ');
  const address=fullAddress(shipping);
  const items=details(cart);
  const total=money(cart?.totalMinor);
  const shippingPrice=money(cart?.shippingMinor);
  const method=paymentMethod==='BANK_TRANSFER'?'Havale/EFT':paymentMethod==='PAYTR'?'Kart ile ödeme (PayTR)':null;
  const purchaseInfo=[name,clean(email),address].filter(Boolean).join(' · ');
  const map={
    alici_ad_soyad:asText(name), alici_eposta:asText(email), alici_bilgileri:asText(purchaseInfo),
    teslimat_adresi:asText(address), kanuni_temsilci:null, urun_satirlari:asText(items),
    urunler_ve_ayrik_nitelikleri:asText(items), birim_fiyat:asText((cart?.items||[]).map(item=>`${clean(item.title)}: ${money(item.priceGrossMinor)}`).join('; ')),
    indirim:money(0), vergi:null, kargo:shippingPrice, genel_toplam:total, toplam_bedel:total,
    odeme_yontemi:method, odeme_bilgisi:method?`${method}, toplam ${total}`:null,
    taksit_detayi:paymentMethod==='BANK_TRANSFER'?'Taksit uygulanmaz.':null,
    siparis_no:null, siparis_kimligi:null, siparis_tarihi:null,
    on_bilgilendirme_surumu:clean(document.version), surum:clean(document.version),
    onay_zamani:null,onay_kaydi:null,cayma_uygunlugu_ve_gerekcesi:null,
    kargo_sirketi:null,teslimat_suresi:null
  };
  const missing=new Set();
  const filled=String(document.markdown).replace(/\{([^{}]+)\}/gu,(match,key)=>{
    if (!(key in map)||map[key] == null){missing.add(key);return `‹${key}: doğrulanmış bilgi gerekli›`;}
    return `**${map[key]}**`;
  });
  const dynamicBlock = ["PRE_INFO", "DISTANCE"].includes(String(document.code)) ? [
    "",
    "---",
    "SİPARİŞE ÖZGÜ GERÇEK VERİLER",
    `Alıcı: ${purchaseInfo || "doğrulanmış checkout bilgisi gerekli"}`,
    `Paketler ve satırlar: ${items || "doğrulanmış checkout bilgisi gerekli"}`,
    `Ödeme yöntemi: ${method || "doğrulanmış ödeme yöntemi gerekli"}`,
    `Kargo: ${shippingPrice}`,
    `Toplam: ${total}`,
    "Sipariş kimliği ve kabul zamanı, sipariş oluşturulurken immutable snapshot kaydına eklenir.",
  ].join("\n") : "";
  const unverified=/TASLAK\s*\/|\[(?:DOĞRULANACAK|İŞ GÜNÜ MÜ|[^\]]*DOĞRULANACAK)[^\]]*\]|hukuki inceleme bekleniyor|bu metin henüz yayıma/iu.test(filled);
  return {code:document.code,title:document.title,version:document.version,sourceSha256:document.sourceSha256,markdown:filled + dynamicBlock,missingFields:[...missing].sort(),legalReviewRequired:unverified,ready:missing.size===0&&!unverified,sourceDocumentId:document.sourceDocumentId||null,publicationStatus:document.publicationStatus||"LOCAL_SITE_INTEGRATED"};
}
