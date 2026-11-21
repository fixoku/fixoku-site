import {useEffect,useState} from "react";
type ProductCost={id:string;sku:string;title:string;productType:string;costVersion:number|null;unitCostMinor:number|null;isActive:boolean};
const currency=(minor:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(minor/100);
export function OwnerProductCostsR410({audience}:{audience:"STUDENT"|"TRAINER"}){
  const [products,setProducts]=useState<ProductCost[]>([]);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [available,setAvailable]=useState(false);
  const load=async()=>{try{const response=await fetch("/api/admin/r410-product-costs",{credentials:"same-origin",cache:"no-store"});if(!response.ok)throw new Error("Maliyet kayıtları henüz kullanılabilir değil.");const data=await response.json();if(!Array.isArray(data.products))throw new Error("Geçersiz ürün yanıtı.");setProducts(data.products);setAvailable(true);}catch{setAvailable(false);setMessage("Maliyet kayıtları henüz kullanılabilir değil. SQL geçişi ve yetkilendirme kontrol edilmeli.");}};
  useEffect(()=>{void load();},[]);
  const save=async(p:ProductCost)=>{
    const raw=amounts[p.id];
    if(!/^\d+(?:[.,]\d{1,2})?$/.test(raw||"")){setMessage("Lütfen geçerli bir TL maliyeti girin.");return;}
    const [whole,fraction=""]=raw.replace(",",".").split(".");const minor=Number(whole)*100+Number(fraction.padEnd(2,"0"));
    if(!Number.isSafeInteger(minor)||minor<0||minor>2147483647){setMessage("Maliyet tutarı geçersiz.");return;}
    if(minor===0&&!window.confirm("Bu ürünün maliyetini gerçekten sıfır TL olarak onaylıyor musunuz?"))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/admin/r410-product-costs",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({productId:p.id,costMinor:minor,expectedVersion:Number(p.costVersion||0),zeroCostConfirmed:minor===0})});
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error==="COST_STALE_VERSION"?"Maliyet değişmiş. Listeyi yenileyin.":"Maliyet kaydedilemedi.");}
      setAmounts(current=>({...current,[p.id]:""}));setMessage("Maliyet sürümü kaydedildi. Önceki kayıtlar korundu.");await load();
    }catch(e){setMessage(e instanceof Error?e.message:"Maliyet kaydedilemedi.");}finally{setBusy(false);}
  };
  const visible=products.filter(p=>p.isActive&&["PHYSICAL","SOFTWARE"].includes(p.productType));
  return <section className="panel-card" aria-label={audience==="STUDENT"?"Owner öğrenci ürün maliyetleri":"Owner eğitmen ürün maliyetleri"} style={{padding:20,marginTop:20}}>
    <div className="admin-section-heading"><div><span>YALNIZ OWNER</span><h2>Kitap ve yapay zekâ yazılımı maliyetleri</h2><p>Öğrenci ve eğitmen paketleri aynı ürün maliyet geçmişini paylaşır. Fiyatlar ve KDV değişmez.</p></div><button type="button" disabled={busy} onClick={()=>void load()}>Listeyi yenile</button></div>
    {message&&<p role="status">{message}</p>}
    {available?<div style={{display:"grid",gap:12}}>{visible.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,borderBottom:"1px solid #ccc",paddingBottom:12}}><div><strong>{p.title}</strong><div style={{fontSize:13}}>{p.sku} · {p.productType==="PHYSICAL"?"Kitap / fiziksel ürün":"Yapay zekâ / yazılım"} · Sürüm {p.costVersion||0}</div><small>Geçerli birim maliyet: {p.unitCostMinor==null?"Belirlenmedi":currency(Number(p.unitCostMinor))}</small></div><label>Birim maliyet (TL) <input type="text" inputMode="decimal" aria-label={`${p.title} alış maliyeti`} placeholder="Örn. 120,00" disabled={busy} value={amounts[p.id]||""} onChange={e=>setAmounts(a=>({...a,[p.id]:e.target.value}))}/></label><button type="button" disabled={busy||!amounts[p.id]} onClick={()=>void save(p)}>Maliyeti kaydet</button></div>)}</div>:<p>Maliyet verileri bekleniyor; bilinmeyen maliyet sıfır kabul edilmez.</p>}
    <p><small>Bu ekran ürünün geçerli maliyetini ve sürüm geçmişini yönetir. Geçmiş sipariş kârlılığı ancak değişmez sipariş maliyet anlık görüntüleriyle kesinleştirilebilir.</small></p>
  </section>;
}
