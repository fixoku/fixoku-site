import { useEffect, useState } from "react";

type Summary = { status: string; totalAttempts?: number; verifiedAttempts?: number; unresolvedAttempts?: number; deductionMinor?: number | null; providerNetMinor?: number | null; customerDifferenceMinor?: number | null; merchantCostMinor?: number | null; singleCostMinor?: number | null; twoCostMinor?: number | null };
const money = (n: number | null | undefined) => n == null ? "—" : new Intl.NumberFormat("tr-TR", {style:"currency",currency:"TRY"}).format(n/100);
export function PaytrFinanceSummaryR410({value}: {value?: Summary | null}) {
  return <section className="panel-card finance-table-card" aria-label="PayTR komisyon özeti">
    <div className="admin-section-heading"><div><span className="admin-eyebrow">PAYTR</span><h2>Ödeme maliyetleri</h2></div></div>
    {<>
      {(!value || value.status !== "AVAILABLE") && <p role="status">PayTR maliyet verileri henüz doğrulanmadı. Bilinmeyen tutarlar sıfır kabul edilmez.</p>}
      <div className="finance-reading-list">
        {[["PayTR kesintisi",value?.deductionMinor],["İşletmenin net ödeme maliyeti",value?.merchantCostMinor],["Tek çekim maliyeti",value?.singleCostMinor],["Vade farksız iki taksit maliyeti",value?.twoCostMinor],["Müşterinin ödediği vade farkı",value?.customerDifferenceMinor],["PayTR bildirilen net tutar",value?.providerNetMinor]].map(([label,amount])=><p key={String(label)}><strong>{label}</strong><span>{money(typeof amount === "number" ? amount : null)}</span></p>)}
        <p><strong>Doğrulanmış işlemler</strong><span>{value?.verifiedAttempts ?? "—"} / {value?.totalAttempts ?? "—"}</span></p>
        <p><strong>İnceleme veya kayıt bekleyen işlemler</strong><span>{value?.unresolvedAttempts ?? "—"}</span></p>
      </div>
      <p>Yalnızca doğrulanmış, iadesiz gerçek ödeme denemeleri; ödeme tarihi esas alınır. Eski veya deneme kaydı olmayan siparişler kapsam dışı olabilir. Net tutar banka aktarımı kanıtı değildir.</p>
    </>}
  </section>;
}
type ProfitRow={kind:"STUDENT"|"TRAINER";contributionMinor:number|null;physicalProductCostMinor?:number|null;shippingCostMinor?:number|null;costEvidenceCount?:number};
type FinanceData={metrics?:{physicalProductCostMinor?:number|null;shippingCostMinor?:number|null;knownShippingCostMinorR410?:number|null;unknownShippingCostCountR410?:number|null};paytrFinanceR410?:Summary|null;packageProfitability?:ProfitRow[]};
type FinanceTab="general"|"student"|"trainer"|"details";
const financeMoney=(amount:number|null|undefined)=>amount==null?"—":money(amount);
const financeCards=(entries:Array<[string,number|null|undefined]>)=><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10,marginTop:12}}>{entries.map(([label,value])=><div key={label} style={{padding:"13px 15px",border:"1px solid #e3e9f2",borderRadius:11,background:"#f9fbfe"}}><span style={{display:"block",fontSize:12,color:"#6a788a"}}>{label}</span><strong style={{display:"block",fontSize:18,marginTop:4,color:"#17314d"}}>{financeMoney(value)}</strong></div>)}</div>;
export function DashboardPaytrFinanceR410({from,to}: {from:string;to:string}) {
  const [tab,setTab]=useState<FinanceTab>("general");
  const [data,setData]=useState<FinanceData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();const params=new URLSearchParams({from,to,currency:"TRY"});
    setLoading(true);setError(false);setData(null);
    fetch(`/api/owner/finance?${params}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(async r=>{if(!r.ok)throw new Error("FINANCE_UNAVAILABLE");return await r.json() as FinanceData;})
      .then(value=>{if(!controller.signal.aborted)setData(value);})
      .catch(()=>{if(!controller.signal.aborted)setError(true);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[from,to]);
  const paytr=data?.paytrFinanceR410;
  const paytrOK=paytr?.status==="AVAILABLE";
  const metrics=data?.metrics;
  const rows=data?.packageProfitability||[];
  const audienceTotals=(kind:"STUDENT"|"TRAINER")=>{
    const selected=rows.filter(r=>r.kind===kind);
    const shipping=selected.length>0&&selected.every(r=>r.shippingCostMinor!=null)?selected.reduce((sum,r)=>sum+Number(r.shippingCostMinor),0):null;
    const products=selected.length>0&&selected.every(r=>Number(r.costEvidenceCount)>0)?selected.reduce((sum,r)=>sum+Number(r.physicalProductCostMinor||0),0):null;
    const profit=selected.length>0&&selected.every(r=>r.contributionMinor!=null)?selected.reduce((sum,r)=>sum+Number(r.contributionMinor),0):null;
    return {shipping,products,profit};
  };
  const group=audienceTotals(tab==="student"?"STUDENT":"TRAINER");
  const wholeProfit=rows.length>0&&rows.every(r=>r.contributionMinor!=null)?rows.reduce((sum,r)=>sum+Number(r.contributionMinor),0):null;
  return <section className="owner-v5-card" aria-label="Finans ve kârlılık özeti" style={{padding:"18px 20px",margin:"18px 0",minWidth:0}}>
    <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap",alignItems:"center"}}>
      <div><h2 style={{margin:0,fontSize:18}}>Finans ve Kârlılık Özeti</h2><p style={{fontSize:12,color:"#6a788c",margin:"5px 0 0"}}>Ciro üstte, doğrulanmış gider ve kâr bilgileri burada.</p></div>
      <div role="tablist" aria-label="Finans sekmeleri" style={{display:"flex",gap:6,flexWrap:"wrap"}}>{([ ["general","Genel Bakış"],["student","Öğrenci"],["trainer","Eğitmen"],["details","Detay"] ] as const).map(([id,label])=><button type="button" key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} style={{border:"1px solid #dce4ee",borderRadius:9,padding:"8px 12px",background:tab===id?"#182f4c":"#fff",color:tab===id?"#fff":"#243752",fontWeight:tab===id?700:500}}>{label}</button>)}</div>
    </div>
    {loading?<p role="status">Finans verileri yükleniyor…</p>:error?<p role="status">Finans verileri şu anda okunamıyor. Bilinmeyen maliyetler sıfır kabul edilmez.</p>:<>
      {tab==="general"&&financeCards([
        ["PayTR gideri",paytrOK?paytr?.merchantCostMinor:null],
        ["Kargo gideri",metrics?.shippingCostMinor],
        ["Kayıtlı ürün maliyeti",metrics?.physicalProductCostMinor&&metrics.physicalProductCostMinor>0?metrics.physicalProductCostMinor:null],
        ["Doğrulanmış net kâr",wholeProfit]
      ])}
      {(tab==="student"||tab==="trainer")&&financeCards([
        ["PayTR gideri (ayrıştırılmış)",null],
        ["Kargo gideri",group.shipping],
        ["Ürün maliyeti",group.products],
        ["Doğrulanmış net kâr",group.profit]
      ])}
      {tab==="details"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:"6px 20px",marginTop:12}}>{([
        ["PayTR kesintisi",paytrOK?paytr?.deductionMinor:null],
        ["İşletme ödeme maliyeti",paytrOK?paytr?.merchantCostMinor:null],
        ["Tek çekim gideri",paytrOK?paytr?.singleCostMinor:null],
        ["İki taksit gideri",paytrOK?paytr?.twoCostMinor:null],
        ["Müşteri vade farkı",paytrOK?paytr?.customerDifferenceMinor:null],
        ["PayTR net tutarı",paytrOK?paytr?.providerNetMinor:null],
        ["Kayıtlı kargo gideri",metrics?.knownShippingCostMinorR410]
      ] as Array<[string,number|null|undefined]>).map(([label,amount])=><div key={label} style={{display:"flex",justifyContent:"space-between",gap:10,borderBottom:"1px solid #edf0f4",padding:"9px 0",fontSize:12}}><span>{label}</span><strong>{financeMoney(amount)}</strong></div>)}</div>}
      <p style={{fontSize:11,color:"#6f7b8f",margin:"12px 0 0"}}>— : gider kanıtı bulunmuyor. Sıfır TL değildir. Eksik kargo, ürün, hakediş ve ödeme bilgileriyle net kâr hesaplanmaz.</p>
    </>}
  </section>;
}