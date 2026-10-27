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
  packageId:string; packageVersionId:string; slug:string; title:string; description:string; shortDescription?:string|null; features:string[]; iconReference?:string|null;
  priceGrossMinor:number; priceNetMinor?:number|null; vatRateBps:number; currency:string; shippingPolicy:"FREE"|"FIXED_PRICE"; shippingPriceMinor:number;
  accessState:"OWNED"|"PENDING_PAYMENT"|"AVAILABLE"; expertiseActive?:boolean; entitlementSource?:string|null; pendingOrderId?:string|null; inCart:boolean;
  components?:Array<{componentType:string;title:string;quantity:number;sku?:string|null;imageReference?:string|null;displayOrder:number}>;
};

const money=(minor:number,currency="TRY")=>new Intl.NumberFormat("tr-TR",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);
const errorLabels:Record<string,string>={PACKAGE_ALREADY_OWNED:"Bu pakete erişiminiz zaten aktif.",ORDER_ALREADY_EXISTS:"Bu paket için ödeme bekleyen siparişiniz var.",PACKAGE_ALREADY_IN_CART:"Bu paket zaten sepetinizde.",PACKAGE_UNAVAILABLE:"Paket şu anda satın alınamıyor."};
const stateLabel=(row:TrainerPackageRow)=>row.accessState==="OWNED"?(row.entitlementSource==="MANUAL_GIFT"?"Owner Erişimi":"Satın Alındı"):row.accessState==="PENDING_PAYMENT"?"Ödeme Bekleniyor":"Kilitli";

export function TrainerTrainingsPage({user,candidatePreview=false}:{packages?:boolean;user:{id:string;name:string;email:string};candidatePreview?:boolean}){
 const navigate=useNavigate();const [rows,setRows]=useState<TrainerPackageRow[]>([]);const [open,setOpen]=useState<string|null>(null);const [status,setStatus]=useState("loading");const [message,setMessage]=useState("");
 const load=async()=>{setStatus("loading");try{const response=await fetch(candidatePreview?"/api/trainer-candidate?action=catalog":"/api/trainer/packages",{credentials:"include",cache:"no-store"});if(!response.ok)throw Error();const body=await response.json();setRows((body.packages||[]).map((item:TrainerPackageRow)=>candidatePreview?{...item,accessState:"AVAILABLE" as const,inCart:false,components:item.components||[],features:item.features||[]}:item));setStatus("ready");if(!candidatePreview)window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));}catch{setStatus("error")}};
 useEffect(()=>{void load()},[]);
 const add=async(row:TrainerPackageRow,buy=false)=>{if(candidatePreview)return;setMessage("");const response=await fetch("/api/trainer/cart",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({packageVersionId:row.packageVersionId})});const body=await response.json().catch(()=>({}));if(!response.ok&&body.error!=="PACKAGE_ALREADY_IN_CART"){setMessage(errorLabels[body.error]||"Paket sepete eklenemedi.");return}window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));await load();if(buy)navigate("/panel/egitmen/sepet");else setMessage("Paket sepetinize eklendi.");};
 return <PanelShell user={user}><main className="trainer-trainings-page trainer-commerce-catalog">
  {/* FIXOKU_020U_TRAININGS_TOP_BANNER_REMOVED */}
  {message&&<p className="trainer-commerce-message" role="status">{message}</p>}
  {status==="loading"&&<div className="trainings-state" role="status">Eğitim paketleri yükleniyor…</div>}
  {status==="error"&&<div className="trainings-state" role="alert"><h3>Eğitim paketleri yüklenemedi</h3><button type="button" onClick={()=>void load()}>Tekrar dene</button></div>}
  {status==="ready"&&<section className="trainer-package-grid" aria-label="Eğitmen eğitim paketleri">{rows.map((row,index)=>{const owned=row.accessState==="OWNED";const pending=row.accessState==="PENDING_PAYMENT";const expanded=open===row.packageId;const cover=trainerCourseCover020P(row.title,row.slug);const textItems=(row.components||[]).filter((item)=>item.componentType==="TEXT_ITEM");const contentCount=textItems.length||row.features.length;return <article key={row.packageId} className={`trainer-package-card ${owned?"is-owned":"is-locked"}`}>
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
      <div className="trainer-card-modules-020q" aria-label="Eğitim bölümleri">
       <span><TrainerIcon name="video" size={21}/><strong>Videolar</strong></span>
       <span><TrainerIcon name="book" size={21}/><strong>Müfredat</strong></span>
       <span><TrainerIcon name="presentation" size={21}/><strong>Sunumlar</strong></span>
      </div>
      <div className="trainer-card-meta-020q">
       {contentCount>0&&<span><TrainerIcon name="info" size={15}/>{contentCount} paket tanıtım maddesi</span>}
       {!owned&&<div className="trainer-package-price"><small>Paket Fiyatı</small><strong>{money(row.priceGrossMinor,row.currency)}</strong></div>}
      </div>
      <div className="trainer-package-actions">{owned?<div className="trainer-owned-actions"><Link className="trainer-package-primary" to={`/panel/egitmen/egitimlerim/${row.slug}`}>Eğitime Git <TrainerIcon name="arrow" size={19}/></Link><button type="button" className="trainer-package-inspect trainer-owned-details-toggle" aria-expanded={expanded} aria-controls={`trainer-package-details-${row.packageId}`} onClick={()=>setOpen(expanded?null:row.packageId)}>{expanded?"Paket Detaylarını Kapat ↑":"Paket Detayları ↓"}</button></div>:<button type="button" className="trainer-package-inspect" aria-expanded={expanded} aria-controls={`trainer-package-details-${row.packageId}`} onClick={()=>setOpen(expanded?null:row.packageId)}>{expanded?"İçeriği Kapat ↑":"Eğitimi İncele ↓"}</button>}</div>
     </div>
    </div>
   </div>
   {owned&&<div className="trainer-package-note">{row.expertiseActive?"Uzmanlık Aktif":"Bu eğitime erişiminiz aktif."}</div>}
   {candidatePreview&&<div className="trainer-package-note">Eğitimi ve fiyatını inceleyebilirsiniz. Satın alma işlemleri eğitmen hesabı yetkilendirildiğinde açılır.</div>}
   {expanded&&<div id={`trainer-package-details-${row.packageId}`} className="trainer-package-details"><div><h4>Paket İçeriği</h4><ul className="trainer-package-feature-list">{(row.components?.some((item)=>item.componentType==="TEXT_ITEM") ? (row.components||[]).filter((item)=>item.componentType==="TEXT_ITEM").map((item)=>item.title) : row.features).map((feature,index)=><li key={`${feature}-${index}`}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>{Boolean(row.components?.some((item)=>item.componentType==="PHYSICAL_PRODUCT"))&&<><h4>Pakete Dahil Kitaplar</h4><div className="trainer-package-books">{row.components?.filter((item)=>item.componentType==="PHYSICAL_PRODUCT").map((item,index)=><div className="trainer-package-book" key={`${item.sku||item.title}-${index}`}><div className="trainer-package-book-cover"><FixokuPhotoV41F src={item.imageReference} fallbackSrc={productImageDefaultV41F(item.sku||"")} alt={item.title}><span aria-label="Kitap görseli yok">▧</span></FixokuPhotoV41F></div><div className="trainer-package-book-copy"><strong>{item.title}</strong><small>{item.quantity} adet · Pakete dahil</small></div></div>)}</div></>}{!owned&&!candidatePreview&&<footer><div><small>Paket Fiyatı</small><strong>{money(row.priceGrossMinor,row.currency)}</strong></div>{pending?<button type="button" disabled>Ödeme Bekleniyor</button>:<>{row.inCart&&<button type="button" className="trainer-package-cart-link" onClick={()=>navigate("/panel/egitmen/sepet")}>Sepete Git <TrainerIcon name="shopping-cart" size={17}/></button>}<button type="button" disabled={row.inCart} onClick={()=>void add(row)}>{row.inCart?"Sepette":"Sepete Ekle"}</button><button type="button" className="trainer-package-primary" onClick={()=>void add(row,true)}>Satın Al</button></>}</footer>}</div></div>}
  </article>})}</section>}
  <img className="trainings-bottom-banner" src="/images/teacher-panel/banners/trainer-trainings-bottom.png" width={2580} height={152} alt="Bilgi, paylaştıkça çoğalır. Daha fazla öğren, daha fazla öğret, daha güçlü nesiller yetiştir."/>
 </main></PanelShell>;
}
