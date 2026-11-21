import {useCallback,useEffect,useState} from 'react';
type Overview={status:'INCOMPLETE_EVIDENCE'|'FILTER_NOT_SUPPORTED';certifiedProfit:false;coverageVerified:false;contributionMinor:null;scopeOrderCount?:number;shownOrderCount?:number;withSnapshot?:number;withoutSnapshot?:number;recordedCostMinor?:number;truncated?:boolean;disclaimer:string};
const money=(minor:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(minor/100);
export function OwnerProfitCoverageR410({from,to,packageId,trainerId,currency}:{from:string;to:string;packageId:string;trainerId:string;currency:string}){
 const [state,setState]=useState<'loading'|'ready'|'pending'|'error'>('loading');
 const [report,setReport]=useState<Overview|null>(null);
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  setState('loading');setReport(null);
  try{
   const p=new URLSearchParams();for(const [k,v] of Object.entries({from,to,packageId,trainerId,currency}))if(v)p.set(k,v);
   const r=await fetch('/api/admin/r410-profit-coverage?'+p.toString(),{credentials:'same-origin',cache:'no-store'});
   if(r.status===503){setState('pending');return;}
   if(!r.ok){setState('error');return;}
   const j:Overview=await r.json();
   if(!['INCOMPLETE_EVIDENCE','FILTER_NOT_SUPPORTED'].includes(j.status)||j.certifiedProfit!==false||j.coverageVerified!==false||j.contributionMinor!==null){setState('error');return;}
   setReport(j);setState('ready');
  }catch{setState('error');}
 },[from,to,packageId,trainerId,currency]);
 useEffect(()=>{void load();},[load,revision]);
 return <section className="panel-card finance-table-card" aria-label="Kârlılık kanıt kapsamı">
  <div className="admin-section-heading"><div><span className="admin-eyebrow">MUTABAKAT</span><h2>Kârlılık kanıt kapsamı</h2><p>Gerçek sipariş sayısı ile maliyet kaydı bulunan siparişleri karşılaştırır. Kesin kâr hesaplamaz.</p></div><button type="button" onClick={()=>setRevision(n=>n+1)}>Kapsamı yenile</button></div>
  {state==='loading'&&<p role="status">Kapsam kontrol ediliyor…</p>}
  {state==='pending'&&<p role="status">Maliyet SQL geçişi henüz uygulanmadı. Mutabakat bekliyor.</p>}
  {state==='error'&&<p role="alert">Kapsam kanıtı okunamadı. Kâr doğrulanamaz.</p>}
  {state==='ready'&&report&&<>
   {report.status==='FILTER_NOT_SUPPORTED'?<p role="status">{report.disclaimer}</p>:<>
    <div className="admin-kpi-grid"><article><span>İlgili sipariş</span><strong>{report.scopeOrderCount}</strong></article><article><span>Maliyet kaydı olan</span><strong>{report.withSnapshot}</strong></article><article><span>Maliyet kaydı olmayan / gerekmeyen</span><strong>{report.withoutSnapshot}</strong></article><article><span>İncelenen kayıt maliyeti</span><strong>{money(report.recordedCostMinor||0)}</strong><small>Yalnız gösterilen kayıtlar; tam maliyet değildir</small></article><article><span>Kesin kâr</span><strong>Doğrulanmadı</strong></article></div>
    {report.truncated&&<p role="status">İlk {report.shownOrderCount} sipariş gösterildi. Toplam kapsam daha geniştir; rakamlar dönem toplamı değildir.</p>}
    <p role="status">{report.disclaimer}</p>
   </>}
  </>}
 </section>;
}
