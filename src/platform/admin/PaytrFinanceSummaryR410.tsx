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
export function DashboardPaytrFinanceR410({from,to}: {from:string;to:string}) {
  const [result,setResult]=useState<{key:string;value:Summary}|null>(null);
  const key=from+"/"+to;
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({from,to,currency:"TRY",paytrFinance:"1"});
    fetch(`/api/owner/finance?${params}`,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(async r=>{if(!r.ok)throw new Error();return await r.json() as Summary;})
      .then(value=>{if(!controller.signal.aborted)setResult({key,value});})
      .catch(()=>{if(!controller.signal.aborted)setResult({key,value:{status:"UNAVAILABLE"}});});
    return ()=>controller.abort();
  },[from,to,key]);
  return <PaytrFinanceSummaryR410 value={result?.key===key?result.value:null}/>;
}