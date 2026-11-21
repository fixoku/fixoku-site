import {useEffect,useState} from "react";
type ProductCost={id:string;sku:string;title:string;productType:string;costVersion:number|null;unitCostMinor:number|null;isActive:boolean};
const currency=(minor:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(minor/100);
const toMinor=(raw:string)=>{
  const v=raw.trim();
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(v))return null;
  const amount=Math.round(Number(v.replace(/\./g,"").replace(",","."))*100);
  return Number.isSafeInteger(amount)&&amount>=0&&amount<=2147483647?amount:null;
};
export function OwnerProductCostsR410({audience}:{audience:"STUDENT"|"TRAINER"}){
  const [products,setProducts]=useState<ProductCost[]>([]);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [available,setAvailable]=useState(false);
  const load=async()=>{
    try{
      const response=await fetch("/api/admin/r410-product-costs",{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error("LOAD_FAILED");
      const data=await response.json();
      if(!Array.isArray(data.products))throw new Error("INVALID_RESPONSE");
      setProducts(data.products);setAvailable(true);setMessage("");
    }catch{setAvailable(false);setMessage("Maliyetler yüklenemedi. Owner yetkisi ve veritabanı bağlantısı kontrol edilmeli.");}
  };
  useEffect(()=>{void load();},[]);
  const save=async(p:ProductCost)=>{
    const minor=toMinor(amounts[p.id]||"");
    if(minor===null){setMessage("Tutarı TL olarak yazın. Örneğin 120,00 veya 1.250,50.");return;}
    if(minor===0&&!window.confirm("Bu ürünün maliyetini gerçekten sıfır TL olarak onaylıyor musunuz?"))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/admin/r410-product-costs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({productId:p.id,costMinor:minor,expectedVersion:Number(p.costVersion||0),zeroCostConfirmed:minor===0})});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error==="COST_STALE_VERSION"?"Maliyet değişmiş. Listeyi yenileyin.":data.error||"Maliyet kaydedilemedi.");}
      setAmounts(current=>({...current,[p.id]:""}));await load();setMessage("Maliyet yeni sürüm olarak kaydedildi. Önceki sürümler korundu.");
    }catch(e){setMessage(e instanceof Error?e.message:"Maliyet kaydedilemedi.");}finally{setBusy(false);}
  };
  const visible=products.filter(p=>["PHYSICAL","SOFTWARE"].includes(p.productType));
  return <section className="panel-card" aria-label={audience==="STUDENT"?"Owner öğrenci ürün maliyetleri":"Owner eğitmen ürün maliyetleri"} style={{padding:"20px clamp(12px, 2vw, 26px)",marginTop:16,minWidth:0}}>
    <div className="admin-section-heading" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><span>YALNIZ OWNER</span><h2>Maliyetler</h2><p>Kitap ve yapay zekâ yazılımı alış maliyetleri. Aynı ürünün öğrenci ve eğitmen satışlarında maliyet geçmişi ortaktır.</p></div>
      <button type="button" disabled={busy} onClick={()=>void load()}>Listeyi yenile</button>
    </div>
    {message&&<p role="status" style={{padding:10,background:"#f3f6fb",borderRadius:8}}>{message}</p>}
    {available?<div style={{display:"grid",gap:10,minWidth:0}}>
      {visible.map(p=><article key={p.id} style={{display:"flex",gap:14,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",border:"1px solid #e3e8f0",borderRadius:12,padding:14,minWidth:0}}>
        <div style={{flex:"2 1 240px",minWidth:0}}><strong>{p.title}</strong><div style={{fontSize:12,color:"#68758a",overflowWrap:"anywhere"}}>{p.sku} · {p.productType==="SOFTWARE"?"Yazılım":"Kitap"} · Sürüm {p.costVersion||0}{p.isActive?"":" · Pasif ürün"}</div><small>Geçerli maliyet: <strong>{p.unitCostMinor==null?"Belirlenmedi":currency(Number(p.unitCostMinor))}</strong></small></div>
        <label style={{display:"grid",gap:5,flex:"1 1 190px",fontSize:12,fontWeight:650}}>Birim alış maliyeti (TL)<input type="text" inputMode="decimal" aria-label={`${p.title} alış maliyeti`} placeholder="Örn. 120,00" disabled={busy} value={amounts[p.id]||""} onChange={e=>setAmounts(a=>({...a,[p.id]:e.target.value}))} style={{width:"100%",minWidth:0,boxSizing:"border-box"}}/></label>
        <button type="button" disabled={busy||toMinor(amounts[p.id]||"")===null} onClick={()=>void save(p)} style={{whiteSpace:"nowrap"}}>Maliyeti kaydet</button>
      </article>)}
      {!visible.length&&<p>Kitap veya yazılım kaydı bulunamadı.</p>}
      {!visible.some(p=>p.productType==="SOFTWARE")&&<p role="status">Yazılım ürününün maliyet kaydı listede bulunamadı. Katalog eşlemesi kontrol edilmeli, başka ürüne maliyet yazılmamalı.</p>}
    </div>:<p>Maliyet verileri bekleniyor; bilinmeyen maliyet sıfır kabul edilmez.</p>}
    <p style={{fontSize:12,color:"#67768c",marginTop:15}}>Geçmiş sipariş kârlılığı, ancak siparişe özgü doğrulanmış maliyet kayıtlarıyla kesinleştirilebilir.</p>
  </section>;
}