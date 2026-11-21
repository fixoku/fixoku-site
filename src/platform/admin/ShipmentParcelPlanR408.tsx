import { useEffect,useState,useRef } from "react";

type Parcel = {
  parcelNo:number;
  bookCount:number;
  widthCm:number;
  lengthCm:number;
  heightCm:number;
  weightKg:number;
  estimatedDesi:number;
};

export type ParcelPlanR408 = {
  bookCount:number;
  packageCount:number;
  totalWeightKg:number;
  totalEstimatedDesi:number;
  parcels:Parcel[];
};

const numberText=(n:number)=>
  Number(n).toLocaleString("tr-TR",{
    maximumFractionDigits:3
  });

export function ShipmentParcelPlanR408({
  shipmentId,
  shipmentKind,
  refreshKey,
  onPlan
}:{
  shipmentId:string;
  shipmentKind:"STUDENT"|"TRAINER";
  refreshKey:number;
  onPlan:(p:{plan:ParcelPlanR408;saved:boolean}|null)=>void;
}) {
  const [result,setResult]=useState<{
    plan:ParcelPlanR408;
    saved:boolean;
    editable?:boolean;
    revision?:string;
  }|null>(null);

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [draft,setDraft]=useState<Parcel[]|null>(null);
  const [reason,setReason]=useState("");
  const [saving,setSaving]=useState(false);
  const generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  async function saveOverride(){
    if(!draft || !result?.revision || saving) return;
    const token=generation.current;
    setSaving(true);setError("");
    try {
      const response=await fetch("/api/admin/shipments/dispatch",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"PARCEL_OVERRIDE",shipmentKind,shipmentId,revision:result.revision,reason,parcels:draft.map(({parcelNo,widthCm,lengthCm,heightCm,weightKg})=>({parcelNo,widthCm,lengthCm,heightCm,weightKg}))})});
      const data=await response.json();
      if(!response.ok || !data.plan || data.plan.shipmentId!==shipmentId || data.plan.shipmentKind!==shipmentKind) throw new Error("PARCEL_OVERRIDE_FAILED");
      if(token!==generation.current)return;
      setResult(data);setDraft(null);setReason("");onPlan(data);
    }catch{if(token===generation.current)setError("Ölçüler kaydedilemedi. Gönderiyi yeniden açıp güncel durumu kontrol edin.");}
    finally{if(token===generation.current)setSaving(false);}
  }

  useEffect(()=>{
    let active=true;
    generation.current++;setDraft(null);setSaving(false);setReason("");

    setLoading(true);
    setError("");
    setResult(null);
    onPlan(null);

    const query=new URLSearchParams({
      action:"PARCEL_PLAN",
      shipmentKind,
      shipmentId
    });

    fetch(
      "/api/admin/shipments/dispatch?"+query.toString(),
      {credentials:"same-origin",cache:"no-store"}
    )
      .then(async response=>{
        const data=await response.json();

        if(!response.ok)
          throw new Error(data.error || "PARCEL_PLAN_UNAVAILABLE");

        const plan=data.plan;

        if(!plan ||
           plan.shipmentId!==shipmentId ||
           plan.shipmentKind!==shipmentKind ||
           !Number.isSafeInteger(plan.packageCount) ||
           plan.packageCount<1 ||
           !Array.isArray(plan.parcels) ||
           plan.parcels.length!==plan.packageCount)
          throw new Error("PARCEL_PLAN_INVALID");

        return {plan,saved:data.saved===true,editable:data.editable===true,revision:typeof data.revision==="string"?data.revision:undefined};
      })
      .then(data=>{
        if(active) {
          setResult(data);
          onPlan(data);
        }
      })
      .catch(e=>{
        if(!active) return;

        const messages:Record<string,string>={
          BOOK_PARCEL_PROFILE_MISSING:
            "Bu kitap adedi için paketleme ayarı eksik.",
          PAYMENT_NOT_SETTLED:
            "Siparişin ödemesi henüz onaylanmadı.",
          HISTORICAL_PARCEL_PLAN_UNAVAILABLE:
            "Eski gönderiye ait kayıtlı koli ölçüleri bulunmuyor.",
          NON_BOOK_PHYSICAL_ITEM_REVIEW_REQUIRED:
            "Standart kitap haricinde fiziksel ürün bulunuyor."
        };

        setError(messages[e.message] ||
          "Paketleme bilgileri hesaplanamadı. Ayarları kontrol edin.");
      })
      .finally(()=>{
        if(active) setLoading(false);
      });

    return ()=>{active=false;};

  },[shipmentId,shipmentKind,refreshKey,onPlan]);

  return <section className="fx-cargo-drawcard">
    <h3>Otomatik Paketleme Bilgileri</h3>

    {loading && <p role="status">Hesaplanıyor...</p>}
    {error && <p role="alert">{error}</p>}

    {result && <>
      <div className="parcel-order-summary-r408">
        <div>
          <small>Toplam kitap</small>
          <strong>{result.plan.bookCount} adet</strong>
        </div>
        <div>
          <small>Toplam koli</small>
          <strong>{result.plan.packageCount} koli</strong>
        </div>
        <div>
          <small>Toplam ağırlık</small>
          <strong>{numberText(result.plan.totalWeightKg)} kg</strong>
        </div>
        <div>
          <small>Tahmini toplam desi</small>
          <strong>{numberText(result.plan.totalEstimatedDesi)}</strong>
        </div>
      </div>

      {result.plan.parcels.map(p=>
        <div className="parcel-summary-line-r408" key={p.parcelNo}>
          <b>{p.parcelNo}. koli · {p.bookCount} kitap</b>
          <p>
            {numberText(p.widthCm)} × {numberText(p.lengthCm)}
            {" × "}{numberText(p.heightCm)} cm
            {" · "}{numberText(p.weightKg)} kg
            {" · "}{numberText(p.estimatedDesi)} desi
          </p>
        </div>
      )}

      {result.editable && !draft && <button type="button" className="fx-cargo-button" onClick={()=>{setDraft(result.plan.parcels.map(p=>({...p})));onPlan(null);}}>İstisnai ölçü düzeltmesi</button>}
      {draft && <div>
        {draft.map((p,i)=><div key={p.parcelNo}><b>{p.parcelNo}. koli</b>{([ ["widthCm","En (cm)"],["lengthCm","Boy (cm)"],["heightCm","Yükseklik (cm)"],["weightKg","Ağırlık (kg)"] ] as const).map(([field,label])=><label key={field} style={{display:"block"}}>{label}<input type="number" min="0.001" max="1000" step="0.001" disabled={saving} value={p[field]||""} onChange={e=>setDraft(prev=>prev?.map((v,j)=>j===i?{...v,[field]:Number(e.target.value)}:v)||null)}/></label>)}</div>)}
        <label>Değişiklik gerekçesi<textarea maxLength={300} disabled={saving} value={reason} onChange={e=>setReason(e.target.value)}/></label>
        <button type="button" className="fx-cargo-button primary" disabled={saving||reason.trim().length<5} onClick={()=>void saveOverride()}>Ölçüleri kaydet</button>
        <button type="button" className="fx-cargo-button" disabled={saving} onClick={()=>{setDraft(null);setReason("");setError("");onPlan(result);}}>Vazgeç</button>
      </div>}
      <p className="fx-cargo-drawhelp">
        {result.saved
          ? "Bu gönderinin paketleme bilgileri kaydedilmiştir."
          : "Paketleme ayarlarından otomatik hesaplandı."}
      </p>
    </>}
  </section>;
}