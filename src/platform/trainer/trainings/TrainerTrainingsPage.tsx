import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatTrainerCourseTitle } from "../../../shared/formatTrainerCourseTitle";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import { FixokuPhotoV41F, productImageDefaultV41F } from "../../admin/FixokuCatalogAssetsV41F";
import { trainerCourseCover020P } from "../components/trainerCourseCovers020P";
import "./trainer-course-covers-020p.css";
import "./trainer-trainings.css";
import "./trainer-cards-020q.css";

export type TrainerPackageRow = {
  packageId:string; packageVersionId:string; slug:string; title:string; description:string; shortDescription?:string|null; features:string[]; contentItems?:string[]; iconReference?:string|null;
  priceGrossMinor:number; priceNetMinor?:number|null; vatRateBps:number; currency:string; verifiedVideoCount?:number|null; catalogGrossMinor?:number|null; contentSource?:string|null; shippingPolicy:"FREE"|"FIXED_PRICE"; shippingPriceMinor:number;
  accessState:"OWNED"|"PENDING_PAYMENT"|"AVAILABLE"; expertiseActive?:boolean; entitlementSource?:string|null; pendingOrderId?:string|null; inCart:boolean;
  components?:Array<{componentType:string;title:string;quantity:number;sku?:string|null;imageReference?:string|null;productType?:string|null;listGrossMinor?:number|null;displayOrder:number}>;
};

const money=(minor:number,currency="TRY")=>(currency==="TRY"?new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}).format(minor/100)+" ₺":new Intl.NumberFormat("tr-TR",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100));
const moneyAnalysis=(minor:number,currency="TRY")=>(currency==="TRY"?new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100)+" ₺":new Intl.NumberFormat("tr-TR",{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100));
const errorLabels:Record<string,string>={PACKAGE_ALREADY_OWNED:"Bu pakete erişiminiz zaten aktif.",ORDER_ALREADY_EXISTS:"Bu paket için ödeme bekleyen siparişiniz var.",PACKAGE_ALREADY_IN_CART:"Bu paket zaten sepetinizde.",PACKAGE_UNAVAILABLE:"Paket şu anda satın alınamıyor."};
// H5CE: visual fallback for the six approved trainer-training service products.
// Never substitutes a product record; maps only an existing component image.
const trainerTrainingImage=(item:{sku?:string|null;title:string;imageReference?:string|null})=>{
 const name=String(item.title||"").toLocaleLowerCase("tr-TR");
 const trainer=/eğitmen eğitimi|egitmen egitimi/i.test(name);
 if(!trainer)return productImageDefaultV41F(item.sku||"");
 const primary=/ilkokul/.test(name);
 const middle=/ortaokul/.test(name);
 const high=/lise/.test(name);
 const adult=/yetişkin|yetiskin/.test(name);
 const paragraph=/paragraf/.test(name);
 const sku=paragraph?(middle?"FX-TRN-MIDDLE-PARAGRAPH":high?"FX-TRN-HIGH-PARAGRAPH":"")
   :primary?"FX-TRN-PRIMARY-FAST":middle?"FX-TRN-MIDDLE-FAST":high?"FX-TRN-HIGH-FAST":adult?"FX-TRN-ADULT-FAST":"";
 return productImageDefaultV41F(item.sku||"")||productImageDefaultV41F(sku);
};
type TrainerSpecialOffer = { id: string; title: string; currency: string; listGrossMinor: number; specialGrossMinor: number; discountMinor: number; discountPercentBps: number; expiresAt?: string | null; lines: Array<{ titleSnapshot: string; packageVersionId: string; grossMinor: number }> };
const stateLabel=(row:TrainerPackageRow)=>row.accessState==="OWNED"?(row.entitlementSource==="MANUAL_GIFT"?"Owner Erişimi":"Satın Alındı"):row.accessState==="PENDING_PAYMENT"?"Ödeme Bekleniyor":"Kilitli";

export function TrainerTrainingsPage({user,candidatePreview=false}:{packages?:boolean;user:{id:string;name:string;email:string};candidatePreview?:boolean}){
 const navigate=useNavigate();const [rows,setRows]=useState<TrainerPackageRow[]>([]);const [specialOffers,setSpecialOffers]=useState<TrainerSpecialOffer[]>([]);const [openPair,setOpenPair]=useState<number|null>(null);const [status,setStatus]=useState("loading");const [message,setMessage]=useState("");
 const load=async()=>{setStatus("loading");try{const [response,offerResponse]=await Promise.all([fetch(candidatePreview?"/api/trainer-candidate?action=catalog":"/api/trainer/packages",{credentials:"include",cache:"no-store"}),candidatePreview?Promise.resolve(null):fetch("/api/trainer/custom-offers",{credentials:"include",cache:"no-store"})]);if(!response.ok)throw Error();const body=await response.json();setRows((body.packages||[]).map((item:TrainerPackageRow)=>candidatePreview?{...item,accessState:"AVAILABLE" as const,inCart:false,components:item.components||[],features:item.features||[]}:item));if(offerResponse?.ok){const offerBody=await offerResponse.json().catch(()=>({}));setSpecialOffers(offerBody.offers||[]);}else setSpecialOffers([]);setStatus("ready");if(!candidatePreview)window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));}catch{setStatus("error")}};
 useEffect(()=>{void load()},[]);
 const prepareOffer=async(offer:TrainerSpecialOffer)=>{setMessage("");const response=await fetch("/api/trainer/custom-offers",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({offerId:offer.id})});const body=await response.json().catch(()=>({}));if(!response.ok){setMessage(errorLabels[body.error]||"Özel teklif hazırlanamadı.");return}navigate(body.checkoutPath||`/panel/egitmen/checkout?customOfferId=${encodeURIComponent(offer.id)}`);};
 const add=async(row:TrainerPackageRow,buy=false)=>{if(candidatePreview)return;setMessage("");const response=await fetch("/api/trainer/cart",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({packageVersionId:row.packageVersionId})});const body=await response.json().catch(()=>({}));if(!response.ok&&body.error!=="PACKAGE_ALREADY_IN_CART"){setMessage(errorLabels[body.error]||"Paket sepete eklenemedi.");return}window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));await load();if(buy)navigate("/panel/egitmen/sepet");else setMessage("Paket sepetinize eklendi.");};
 return <PanelShell user={user}><main className="trainer-trainings-page trainer-commerce-catalog">
  {/* FIXOKU_020U_TRAININGS_TOP_BANNER_REMOVED */}
  {message&&<p className="trainer-commerce-message" role="status">{message}</p>}
  {!candidatePreview&&specialOffers.length>0&&<section className="trainer-special-offers" aria-label="Size Özel Paket Teklifiniz"><h2>Size Özel Paket Teklifiniz</h2><p>FIXOKU tarafından bu eğitmen hesabına özel sunuldu.</p>{specialOffers.map((offer)=><article key={offer.id} className="trainer-special-offer-card"><div><span>FIXOKU HESABINIZA ÖZEL</span><h3>{offer.title}</h3><p><del>{money(offer.listGrossMinor,offer.currency)}</del> <strong>{money(offer.specialGrossMinor,offer.currency)}</strong> · %{(offer.discountPercentBps/100).toFixed(2)} indirim</p>{offer.expiresAt&&<small>Son geçerlilik: {new Date(offer.expiresAt).toLocaleString("tr-TR")}</small>}</div><button type="button" className="trainer-package-primary" onClick={()=>void prepareOffer(offer)}>Sepete Ekle / Satın Al</button></article>)}</section>}
  {status==="loading"&&<div className="trainings-state" role="status">Eğitim paketleri yükleniyor…</div>}
  {status==="error"&&<div className="trainings-state" role="alert"><h3>Eğitim paketleri yüklenemedi</h3><button type="button" onClick={()=>void load()}>Tekrar dene</button></div>}
  {status==="ready"&&<section className="trainer-package-grid" aria-label="Eğitmen eğitim paketleri">{rows.map((row,index)=>{const owned=row.accessState==="OWNED";const pending=row.accessState==="PENDING_PAYMENT";const pairIndex=Math.floor(index/2);const expanded=openPair===pairIndex;const cover=trainerCourseCover020P(row.title,row.slug);const products=(row.components||[]).filter((item)=>item.componentType!=="TEXT_ITEM");
 const softwareProducts=products.filter((item)=>item.productType==="SOFTWARE"||/SOFTWARE|YAZILIM/i.test(`${item.componentType} ${item.sku||""} ${item.title||""}`));
 const bookProducts=products.filter((item)=>!softwareProducts.includes(item)&& !/eğitmen eğitimi|egitmen egitimi/i.test(item.title||"") && (/kitab|kitap/i.test(item.title||"")||item.productType==="PHYSICAL"));
 const trainingProducts=products.filter((item)=>!bookProducts.includes(item)&&!softwareProducts.includes(item));
 const itemQuantity=(items:typeof products)=>items.reduce((total,item)=>total+Math.max(0,Number(item.quantity||0)),0);
 const bookCount=itemQuantity(bookProducts);const softwareCount=itemQuantity(softwareProducts);const trainingCount=itemQuantity(trainingProducts);
 const comboSet=/ikili-set|uclu-set|üçlü|ikili|ortaokul-lise-yetiskin/i.test(row.slug);
 const completePrices=products.length>0&&products.every(item=>Number.isSafeInteger(Number(item.listGrossMinor))&&Number(item.listGrossMinor)>0);
 const localGrossMinor=completePrices?products.reduce((total,item)=>total+Number(item.listGrossMinor)*Math.max(0,Number(item.quantity||0)),0):null;
 const normalGrossMinor=Number.isSafeInteger(row.catalogGrossMinor)&&Number(row.catalogGrossMinor)>0
   ? Number(row.catalogGrossMinor) : localGrossMinor;
 const showDiscount=comboSet&&normalGrossMinor!==null&&normalGrossMinor>row.priceGrossMinor;
 const videoLabel=Number.isSafeInteger(row.verifiedVideoCount)&&Number(row.verifiedVideoCount)>=0?String(row.verifiedVideoCount):"—";
 const discountMinor=showDiscount ? normalGrossMinor!-row.priceGrossMinor : 0;
 // H5CJ: The dual set has no saved Owner notes. Show linked-product names as
 // an explicitly identified isolated-review preview, never as published Owner text.
 const linkedProductPreview = row.slug === "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set" &&
   !row.contentItems?.length && !row.features?.length &&
   window.location.hostname === "127.0.0.1" && window.location.port === "5174";
 const contentNotes = linkedProductPreview
   ? products.map((part)=>part.title).filter((title)=>Boolean(title))
   : ((row.contentItems?.length?row.contentItems:row.features)||[]);
 const contentCount=contentNotes.length;return <article key={row.packageId} className={`trainer-package-card ${owned?"is-owned":"is-locked"}`}>
   <div className="trainer-package-main trainer-package-main-020q">
    <div className="trainer-card-layout-020q">
     <div className="trainer-card-cover-020q">
      {cover ? <img src={cover} loading="lazy" alt={`${row.title} kapak görseli`}/> : <span className="trainer-card-cover-fallback-020q"><TrainerIcon name={index%3===0?"book":index%3===1?"chart":"cap"} size={50}/></span>}
     </div>
     <div className="trainer-card-info-020q">
      <div className="trainer-card-top-020q">
       <span className="trainer-package-status">{candidatePreview?"Eğitmen adayı":stateLabel(row)}</span>
       <h3>{formatTrainerCourseTitle(row.title)}</h3>
       {(row.shortDescription||row.description)&&<p>{row.shortDescription||row.description}</p>}
      </div>
      <div className="h5cf-module-grid" aria-label="Paket kapsamı">
       <span className="h5cf-module h5cf-video"><TrainerIcon name="video" size={19}/><strong>Videolar</strong><b title={videoLabel==="—"?"Sistemden doğrulanmış video sayısı bulunamadı":"Video sayısı"}>{videoLabel}</b></span>
       <span className="h5cf-module h5cf-curriculum"><TrainerIcon name="book" size={19}/><strong>Müfredat</strong><b>1</b></span>
       <span className="h5cf-module h5cf-presentations"><TrainerIcon name="presentation" size={19}/><strong>Sunumlar</strong><b>5</b></span>
       <span className="h5cf-module h5cf-books"><TrainerIcon name="book" size={19}/><strong>Kitaplar</strong><b>{bookCount}</b></span>
       <span className="h5cf-module h5cf-software"><TrainerIcon name="chart" size={19}/><strong>Yazılım</strong><b>{softwareCount}</b></span>
       <span className="h5cf-module h5cf-training"><TrainerIcon name="cap" size={19}/><strong>Eğitim</strong><b>{trainingCount}</b></span>
      </div>
      <div className="trainer-card-meta-020q">
       {contentCount>0&&<span><TrainerIcon name="info" size={15}/>{contentCount} paket tanıtım maddesi</span>}
       {!owned&&<div className="trainer-package-price h5cf-price">
        {showDiscount&&<div className="h5cf-price-discount"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12.5V5a2 2 0 0 1 2-2h7.5L21 11.5a2 2 0 0 1 0 2.8L13.5 21a2 2 0 0 1-2.8 0L3 13.3Z"/><circle cx="8" cy="8" r="1.2"/><path d="m10 16 5-5"/></svg><span>Paket avantajı</span><del>{money(normalGrossMinor!,row.currency)}</del></div>}
        {showDiscount?<div className="h5cl-combo-price-line"><span>Paket Fiyatı -</span><strong>{money(row.priceGrossMinor,row.currency)}</strong></div>:<><small>Paket Fiyatı</small><strong>{money(row.priceGrossMinor,row.currency)}</strong></>}</div>}
      </div>
      <div className="trainer-package-actions">{owned?<div className="trainer-owned-actions"><Link className="trainer-package-primary" to={`/panel/egitmen/egitimlerim/${row.slug}`}>Eğitime Git <TrainerIcon name="arrow" size={19}/></Link><button type="button" className="trainer-package-inspect trainer-owned-details-toggle" aria-expanded={expanded} aria-controls={`trainer-package-details-${row.packageId}`} onClick={()=>setOpenPair(expanded?null:pairIndex)}>{expanded?"Paket Detaylarını Kapat ↑":"Paket Detayları ↓"}</button></div>:<button type="button" className="trainer-package-inspect" aria-expanded={expanded} aria-controls={`trainer-package-details-${row.packageId}`} onClick={()=>setOpenPair(expanded?null:pairIndex)}>{expanded?"İçeriği Kapat ↑":"Eğitimi İncele ↓"}</button>}</div>
     </div>
    </div>
   </div>
   {owned&&<div className="trainer-package-note">{row.expertiseActive?"Uzmanlık Aktif":"Bu eğitime erişiminiz aktif."}</div>}
   {candidatePreview&&<div className="trainer-package-note">Eğitimi ve fiyatını inceleyebilirsiniz. Satın alma işlemleri eğitmen hesabı yetkilendirildiğinde açılır.</div>}
   {expanded&&<div id={`trainer-package-details-${row.packageId}`} className="trainer-package-details"><div>
    {showDiscount&&<section className="h5cg-price-analysis" aria-label="Paket fiyat analizi">
      <div className="h5cg-analysis-heading"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.4"/><path d="m10 16 6-6"/></svg><strong>Avantajlı Paket Fiyatı</strong></div>
      <div><span>Ürünler toplamı</span><del>{moneyAnalysis(normalGrossMinor!,row.currency)}</del></div>
      <div><span>Paket iskontosu</span><strong className="h5cg-discount-amount">−{moneyAnalysis(discountMinor,row.currency)}</strong></div>
      <div className="h5cg-analysis-total"><strong>Satış fiyatı</strong><strong>{moneyAnalysis(row.priceGrossMinor,row.currency)}</strong></div>
    </section>}
    <h4>Paket İçeriği</h4>
    {row.contentSource==="HISTORICAL_OWNER_EDITOR_PREVIEW_NOT_SAVED"&&<p className="h5cd-empty-note" role="note">Yerel önizleme: Owner ekranındaki tarihsel içerik. Bu maddeler henüz paket veritabanına kaydedilmiş veya yayınlanmış değildir.</p>}
    {linkedProductPreview&&<p className="h5cd-empty-note" role="note">Geçici önizleme: Bu ikili sette kaydedilmiş Owner içerik maddesi bulunmuyor. Aşağıdaki başlıklar yalnızca bağlı gerçek ürünlerden alınmıştır; onaylı paket açıklaması değildir.</p>}
    {contentNotes.length?<ul className="h5cd-content-notes h5cj-check-list">{contentNotes.map((note,index)=><li key={`${row.packageId}-note-${index}`}><span className="h5cj-check-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg></span><span>{note}</span></li>)}</ul>:<p className="h5cd-empty-note">Bu yayımlanmış paket sürümünde içerik maddesi kaydı bulunamadı. Owner taslak sürümündeki maddeler ayrıca kontrol edilecek.</p>}
    {bookProducts.length>0&&<><h4>Pakete Dahil Kitaplar</h4><div className="trainer-package-books">{bookProducts.map((item,index)=><div className="trainer-package-book" key={`${item.sku||item.title}-${index}`}><div className="trainer-package-book-cover"><FixokuPhotoV41F src={item.imageReference} fallbackSrc={productImageDefaultV41F(item.sku||"")} alt={item.title}><span aria-label="Kitap görseli yok">▧</span></FixokuPhotoV41F></div><div className="trainer-package-book-copy"><strong>{item.title}</strong><small>{item.quantity} adet · Pakete dahil</small></div></div>)}</div></>}
    {softwareProducts.length>0&&<><h4>Pakete Dahil Yazılımlar</h4><div className="h5cd-product-grid">{softwareProducts.map((item,index)=><div className="h5cd-product-item" key={`${item.sku||item.title}-${index}`}><div className="h5cd-product-image"><FixokuPhotoV41F src={item.imageReference} fallbackSrc={productImageDefaultV41F(item.sku||"")} alt={item.title}><span aria-label="Yazılım görseli yok">▧</span></FixokuPhotoV41F></div><div><strong>{item.title}</strong><small>{item.quantity} adet · Pakete dahil</small></div></div>)}</div></>}
    {trainingProducts.length>0&&<><h4>Pakete Dahil Eğitmen Eğitimleri</h4><div className="h5cd-product-grid">{trainingProducts.map((item,index)=><div className="h5cd-product-item" key={`${item.sku||item.title}-${index}`}><div className="h5cd-product-image"><FixokuPhotoV41F src={item.imageReference} fallbackSrc={trainerTrainingImage(item)} alt={item.title}><span aria-label="Eğitim görseli yok">▧</span></FixokuPhotoV41F></div><div><strong>{item.title}</strong><small>{item.quantity} adet · Pakete dahil</small></div></div>)}</div></>}
    {products.length===0&&<p className="h5cd-empty-note">Bu pakette bağlı ürün henüz bulunmuyor.</p>}
    {bookCount>0&&<div className="h5cf-shipping-notice"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 6h12v11H2zM14 10h4l4 4v3h-8z"/><circle cx="6.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/></svg><strong>Siparişinizin kargo ücreti FIXOKU tarafından karşılanacaktır.</strong></div>}
    {!owned&&!candidatePreview&&<footer><div><small>Paket Fiyatı</small><strong className="h5cf-footer-price">{money(row.priceGrossMinor,row.currency)}</strong></div>{pending?<button type="button" disabled>Ödeme Bekleniyor</button>:<>{row.inCart&&<button type="button" className="trainer-package-cart-link" onClick={()=>navigate("/panel/egitmen/sepet")}>Sepete Git <TrainerIcon name="shopping-cart" size={17}/></button>}<button type="button" disabled={row.inCart} onClick={()=>void add(row)}>{row.inCart?"Sepette":"Sepete Ekle"}</button><button type="button" className="trainer-package-primary" onClick={()=>void add(row,true)}>Satın Al</button></>}</footer>}
   </div></div>}
  </article>})}</section>}
  <img className="trainings-bottom-banner" src="/images/teacher-panel/banners/trainer-trainings-bottom.png" width={2580} height={152} alt="Bilgi, paylaştıkça çoğalır. Daha fazla öğren, daha fazla öğret, daha güçlü nesiller yetiştir."/>
 </main></PanelShell>;
}
