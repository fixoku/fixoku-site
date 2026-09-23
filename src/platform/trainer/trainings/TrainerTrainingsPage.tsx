import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrainerHeading } from "../components/TrainerVisual";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon } from "../components/TrainerIcon";
import "./trainer-trainings.css";

export type TrainerPackageRow = {
  packageId:string; packageVersionId:string; slug:string; title:string; description:string; shortDescription?:string|null; features:string[]; iconReference?:string|null;
  priceGrossMinor:number; priceNetMinor?:number|null; vatRateBps:number; currency:string; shippingPolicy:"FREE"|"FIXED_PRICE"; shippingPriceMinor:number;
  accessState:"OWNED"|"PENDING_PAYMENT"|"AVAILABLE"; expertiseActive?:boolean; entitlementSource?:string|null; pendingOrderId?:string|null; inCart:boolean;
  components?:Array<{componentType:string;title:string;quantity:number;imageReference?:string|null;displayOrder:number}>;
};

const money=(minor:number,currency="TRY")=>new Intl.NumberFormat("tr-TR",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);
const errorLabels:Record<string,string>={PACKAGE_ALREADY_OWNED:"Bu pakete erişiminiz zaten aktif.",ORDER_ALREADY_EXISTS:"Bu paket için ödeme bekleyen siparişiniz var.",PACKAGE_ALREADY_IN_CART:"Bu paket zaten sepetinizde.",PACKAGE_UNAVAILABLE:"Paket şu anda satın alınamıyor."};
const stateLabel=(row:TrainerPackageRow)=>row.accessState==="OWNED"?"Satın Alındı":row.accessState==="PENDING_PAYMENT"?"Ödeme Bekleniyor":"Kilitli";

export function TrainerTrainingsPage({user}:{packages?:boolean;user:{id:string;name:string;email:string}}){
 const navigate=useNavigate();const [rows,setRows]=useState<TrainerPackageRow[]>([]);const [open,setOpen]=useState<string|null>(null);const [status,setStatus]=useState("loading");const [message,setMessage]=useState("");
 const load=async()=>{setStatus("loading");try{const response=await fetch("/api/trainer/packages",{credentials:"include",cache:"no-store"});if(!response.ok)throw Error();const body=await response.json();setRows(body.packages||[]);setStatus("ready");window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));}catch{setStatus("error")}};
 useEffect(()=>{void load()},[]);
 const add=async(row:TrainerPackageRow,buy=false)=>{setMessage("");const response=await fetch("/api/trainer/cart",{method:"POST",credentials:"include",headers:{"content-type":"application/json"},body:JSON.stringify({packageVersionId:row.packageVersionId})});const body=await response.json().catch(()=>({}));if(!response.ok&&body.error!=="PACKAGE_ALREADY_IN_CART"){setMessage(errorLabels[body.error]||"Paket sepete eklenemedi.");return}window.dispatchEvent(new CustomEvent("fixoku:trainer-cart-updated"));await load();if(buy)navigate("/panel/egitmen/sepet");else setMessage("Paket sepetinize eklendi.");};
 return <PanelShell user={user}><main className="trainer-trainings-page trainer-commerce-catalog">
  <div className="trainings-heading"><TrainerHeading title="Eğitimlerim" description="Satın aldığınız eğitmen eğitimlerine erişin, diğer eğitim paketlerini inceleyin."/><img className="trainings-hero-art" src="/images/teacher-panel/banners/trainer-trainings-hero.png" width={1180} height={308} alt=""/></div>
  {message&&<p className="trainer-commerce-message" role="status">{message}</p>}
  {status==="loading"&&<div className="trainings-state" role="status">Eğitim paketleri yükleniyor…</div>}
  {status==="error"&&<div className="trainings-state" role="alert"><h3>Eğitim paketleri yüklenemedi</h3><button type="button" onClick={()=>void load()}>Tekrar dene</button></div>}
  {status==="ready"&&<section className="trainer-package-grid" aria-label="Eğitmen eğitim paketleri">{rows.map((row,index)=>{const owned=row.accessState==="OWNED";const pending=row.accessState==="PENDING_PAYMENT";const expanded=open===row.packageId;return <article key={row.packageId} className={`trainer-package-card ${owned?"is-owned":"is-locked"}`}>
   <div className="trainer-package-main"><div className="trainer-package-head"><span className="trainer-package-icon"><TrainerIcon name={index%3===0?"book":index%3===1?"chart":"cap"} size={38}/></span><div className="trainer-package-title"><span className="trainer-package-status">{stateLabel(row)}</span><h3>{row.title}</h3><p>{row.shortDescription||row.description}</p></div>{!owned&&<div className="trainer-package-price"><small>Paket Fiyatı</small><strong>{money(row.priceGrossMinor,row.currency)}</strong></div>}</div>
   <div className="trainer-package-actions">{owned?<Link className="trainer-package-primary" to={`/panel/egitmen/egitimlerim/${row.slug}`}>Eğitime Git <TrainerIcon name="arrow" size={19}/></Link>:<button type="button" className="trainer-package-inspect" aria-expanded={expanded} onClick={()=>setOpen(expanded?null:row.packageId)}>{expanded?"İçeriği Kapat ↑":"Eğitimi İncele ↓"}</button>}</div></div>
   {owned&&<div className="trainer-package-note">{row.expertiseActive?"Uzmanlık Aktif":"Bu eğitime erişiminiz aktif."}</div>}
   {!owned&&expanded&&<div className="trainer-package-details"><div><h4>Paket içeriği</h4><ul>{(row.components?.filter((item)=>item.componentType==="TEXT_ITEM")?.map((item)=>item.title)||row.features).map(feature=><li key={feature}><span>✓</span>{feature}</li>)}</ul>{Boolean(row.components?.some((item)=>item.componentType==="PHYSICAL_PRODUCT"))&&<><h4>Paketle gelen kitaplar</h4><ul>{row.components?.filter((item)=>item.componentType==="PHYSICAL_PRODUCT").map((item,index)=><li key={`${item.title}-${index}`}>{item.imageReference?<img src={item.imageReference} alt="" width={36} height={36}/>:<span>▧</span>}{item.title}{item.quantity>1?` × ${item.quantity}`:""}</li>)}</ul></>}<footer><div><small>Paket Fiyatı</small><strong>{money(row.priceGrossMinor,row.currency)}</strong></div>{pending?<button type="button" disabled>Ödeme Bekleniyor</button>:<>{row.inCart&&<button type="button" className="trainer-package-cart-link" onClick={()=>navigate("/panel/egitmen/sepet")}>Sepete Git <TrainerIcon name="shopping-cart" size={17}/></button>}<button type="button" disabled={row.inCart} onClick={()=>void add(row)}>{row.inCart?"Sepette":"Sepete Ekle"}</button><button type="button" className="trainer-package-primary" onClick={()=>void add(row,true)}>Satın Al</button></>}</footer></div></div>}
  </article>})}</section>}
  <img className="trainings-bottom-banner" src="/images/teacher-panel/banners/trainer-trainings-bottom.png" width={2580} height={152} alt="Bilgi, paylaştıkça çoğalır. Daha fazla öğren, daha fazla öğret, daha güçlü nesiller yetiştir."/>
 </main></PanelShell>;
}
