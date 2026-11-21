import {useCallback,useEffect,useState} from 'react';
type Row={kind:string;orderId:string;orderStatus:string;costLines:number;recordedCostMinor:number|null;paytrAttempts:number;earningRecords:number;shipmentRecords:number;blockers:string[]};
type Report={status:string;certifiedProfit:false;contributionMinor:null;scopeOrderCount?:number;shownOrderCount?:number;truncated?:boolean;rows?:Row[];disclaimer?:string};
const money=(x:number|null)=>x===null?'Bilinmiyor':new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(x/100);
export function OwnerOrderEvidenceGapsR410({from,to,packageId,trainerId,currency}:{from:string;to:string;packageId:string;trainerId:string;currency:string}){
 const [status,setStatus]=useState<'loading'|'ready'|'pending'|'error'>('loading');const [data,setData]=useState<Report|null>(null);const [refresh,setRefresh]=useState(0);
 const load=useCallback(async()=>{
  setStatus('loading');setData(null);
  try{const p=new URLSearchParams();for(const [k,v] of Object.entries({from,to,packageId,trainerId,currency}))if(v)p.set(k,v);
   const r=await fetch('/api/admin/r410-order-evidence-gaps?'+p.toString(),{credentials:'same-origin',cache:'no-store'});
   if(r.status===503){setStatus('pending');return;}if(!r.ok){setStatus('error');return;}
   const j:Report=await r.json();if(j.certifiedProfit!==false||j.contributionMinor!==null||!['EVIDENCE_GAPS','FILTER_NOT_SUPPORTED'].includes(j.status)){setStatus('error');return;}
   setData(j);setStatus('ready');
  }catch{setStatus('error');}
 },[from,to,packageId,trainerId,currency]);
 useEffect(()=>{void load();},[load,refresh]);
 return <section className="panel-card finance-table-card" aria-label="Sipariş bazlı muhasebe kanıt kontrolü">
  <div className="admin-section-heading"><div><span>MUHASEBE KONTROLÜ</span><h2>Sipariş bazlı kanıt eksikleri</h2><p>Kitap, yazılım, hakediş, kargo ve ödeme kayıtlarının varlığı incelenir. Kesin kâr hesaplanmaz.</p></div><button type="button" onClick={()=>setRefresh(v=>v+1)}>Kontrolü yenile</button></div>
  {status==='loading'&&<p role="status">Kontrol ediliyor…</p>}
  {status==='pending'&&<p role="status">İzole SQL testleri tamam; bu ortamda maliyet geçişi henüz uygulanmadı.</p>}
  {status==='error'&&<p role="alert">Kanıt kontrolü okunamadı. Kâr doğrulanmış sayılmaz.</p>}
  {status==='ready'&&data&&<><p role="status">{data.status==='FILTER_NOT_SUPPORTED'?data.disclaimer:`Toplam ${data.scopeOrderCount} siparişin ${data.shownOrderCount} tanesi incelendi. ${data.truncated?'Liste ilk 100 kayıtla sınırlı.':'Tüm siparişler listelendi.'}`}</p>
   {data.rows?.map(x=><article key={x.kind+':'+x.orderId} className="finance-table-card" style={{borderBottom:'1px solid #ddd',padding:'12px 0'}}>
    <strong>{x.kind==='STUDENT_ORDER'?'Öğrenci':'Eğitmen'} siparişi · {x.orderId.slice(0,8)}</strong>
    <p>Durum: {x.orderStatus} · Kayıtlı maliyet: {money(x.recordedCostMinor)} · Maliyet satırı: {x.costLines}</p>
    <p>Ödeme denemesi: {x.paytrAttempts} · Hakediş kaydı: {x.earningRecords} · Gönderi: {x.shipmentRecords}</p>
    <small>Eksik doğrulamalar: {x.blockers.join(' · ')}</small>
   </article>)}<p><strong>Kesin kâr: Doğrulanmadı.</strong> {data.disclaimer}</p></>}
 </section>;
}
