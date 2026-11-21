import { useEffect,useState } from "react";
import "./book-parcel-settings-r408.css";

type Profile = {
  bookCount:number;
  packageCount:number;
  widthCm:string;
  lengthCm:string;
  heightCm:string;
  weightKg:string;
};

type Field =
  "widthCm" | "lengthCm" | "heightCm" | "weightKg";

const fields:Field[] = [
  "widthCm","lengthCm","heightCm","weightKg"
];

const labels:Record<Field,string> = {
  widthCm:"En (cm)",
  lengthCm:"Boy (cm)",
  heightCm:"Yükseklik (cm)",
  weightKg:"Bir koli ağırlığı (kg)"
};

const empty = ():Profile[] =>
  Array.from({length:10},(_,i)=>({
    bookCount:i+1,
    packageCount:1,
    widthCm:"",
    lengthCm:"",
    heightCm:"",
    weightKg:""
  }));

function normalize(value:unknown):string {
  const text=String(value ?? "").trim();

  return text.replace(",",".");
}

function positive(value:string):boolean {
  const n=Number(normalize(value));

  return value.trim()!=="" &&
    Number.isFinite(n) &&
    n>0 &&
    n<=1000 &&
    Math.abs(n*1000-Math.round(n*1000))<0.000001;
}

function fromServer(profiles:any[]):Profile[] {
  return empty().map(row=>{
    const p=profiles.find(
      item=>Number(item.bookCount)===row.bookCount
    );

    if (!p) return row;

    return {
      ...row,
      widthCm:String(p.widthCm ?? ""),
      lengthCm:String(p.lengthCm ?? ""),
      heightCm:String(p.heightCm ?? ""),
      weightKg:String(p.weightKg ?? "")
    };
  });
}

const endpoint="/api/owner/book-parcel-profiles-r408";

export function BookParcelSettingsR408() {
  const [rows,setRows]=useState<Profile[]>(empty);
  const [loading,setLoading]=useState(true);
  const [ready,setReady]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;

    fetch(endpoint,{
      credentials:"same-origin",
      cache:"no-store"
    })
      .then(async response=>{
        if (!response.ok) throw new Error("LOAD_FAILED");

        const data=await response.json();

        if (!Array.isArray(data.profiles))
          throw new Error("INVALID_RESPONSE");

        if (active) {
          setRows(fromServer(data.profiles));
          setReady(true);
        }
      })
      .catch(()=>{
        if(active)
          setError("Paketleme ayarları yüklenemedi. Sayfayı yenileyin.");
      })
      .finally(()=>{
        if(active) setLoading(false);
      });

    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!dirty) return;

    const guard=(event:BeforeUnloadEvent)=>{
      event.preventDefault();
      event.returnValue="";
    };

    window.addEventListener("beforeunload",guard);

    return ()=>window.removeEventListener("beforeunload",guard);
  },[dirty]);

  const filled=rows.filter(
    row=>fields.every(key=>positive(row[key]))
  ).length;

  function change(index:number,key:Field,value:string) {
    setRows(previous=>previous.map((row,i)=>
      i===index ? {...row,[key]:value} : row
    ));

    setDirty(true);
    setNotice("");
    setError("");
  }

  async function save() {
    if(!ready || saving || filled!==10) return;

    setSaving(true);
    setNotice("");
    setError("");

    try {
      const profiles=rows.map(row=>({
        bookCount:row.bookCount,
        packageCount:1,
        widthCm:Number(normalize(row.widthCm)),
        lengthCm:Number(normalize(row.lengthCm)),
        heightCm:Number(normalize(row.heightCm)),
        weightKg:Number(normalize(row.weightKg))
      }));

      const response=await fetch(endpoint,{
        method:"POST",
        credentials:"same-origin",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({profiles})
      });

      const data=await response.json();

      if(!response.ok ||
         data.saved!==true ||
         !Array.isArray(data.profiles) ||
         data.profiles.length!==10)
        throw new Error("SAVE_FAILED");

      setRows(fromServer(data.profiles));

      setDirty(false);
      setNotice("10 kitap paketleme profili başarıyla kaydedildi.");

    } catch {
      setError("Ayarlar kaydedilemedi. Bilgilerinizi kontrol edip tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="r408-parcel-settings">
      <h2>Kitap Adedine Göre Paketleme</h2>

      <p>
        Paket ölçülerini ve toplam koli ağırlığını
        bir kez belirleyin. Sistem siparişlerde
        bu bilgileri otomatik kullanacaktır.
      </p>

      {loading && <p role="status">Ayarlar yükleniyor...</p>}
      {error && <p role="alert" className="parcel-error">{error}</p>}
      {notice && <p role="status" className="parcel-success">{notice}</p>}

      {ready && <>
        <div className="parcel-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kitap adedi</th>
                <th>Koli adedi</th>
                {fields.map(key=>(
                  <th key={key}>{labels[key]}</th>
                ))}
                <th>Tahmini desi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,index)=>{
                const desi=
                  positive(row.widthCm) &&
                  positive(row.lengthCm) &&
                  positive(row.heightCm)
                  ? Number(normalize(row.widthCm)) *
                    Number(normalize(row.lengthCm)) *
                    Number(normalize(row.heightCm)) / 3000
                  : null;

                return (
                  <tr key={row.bookCount}>
                    <td><strong>{row.bookCount} kitap</strong></td>
                    <td>1</td>

                    {fields.map(key=>(
                      <td key={key}>
                        <input
                          aria-label={`${row.bookCount} kitap ${labels[key]}`}
                          inputMode="decimal"
                          value={row[key]}
                          placeholder="Ölçü girin"
                          disabled={saving}
                          onChange={e=>change(index,key,e.target.value)}
                        />
                      </td>
                    ))}

                    <td className="parcel-desi">
                      {desi===null ? "—" :
                        desi.toLocaleString("tr-TR",{
                          maximumFractionDigits:2
                        })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="parcel-footer">
          <div>
            <strong>{filled}/10 profil hazır</strong>
            <small>
              10'dan fazla kitap için 10'luk koliler
              ve kalan kitap profili kullanılır.
            </small>
          </div>

          <button
            type="button"
            disabled={saving || filled!==10 || !dirty}
            onClick={save}
          >
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
        </div>

        <p className="parcel-help">
          Desi: En × Boy × Yükseklik / 3000.
          Taşıyıcının gerçek ölçümü ve faturası
          ayrıca esas alınır.
        </p>
      </>}
    </section>
  );
}