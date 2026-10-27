import { useRef, useState, type ReactNode } from "react";
import { FixokuPhotoV41F } from "./FixokuCatalogAssetsV41F";

export function FixokuImageUploadV41F({kind, id, value, fallback, label, width, height, onChange, children}:{
  kind:"product"|"package";id:string;value:string;fallback?:string;label:string;
  width:number;height:number;onChange:(value:string)=>void;children:ReactNode;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const onFile = async (file?:File) => {
    if (!file) return;
    if (!id) {setMessage("Önce kayıt seçin.");return;}
    if (!["image/webp","image/jpeg","image/png"].includes(file.type)) {setMessage("Yalnız WebP, JPG veya PNG yükleyebilirsiniz.");return;}
    if (file.size>2*1024*1024) {setMessage("Resim en fazla 2 MB olabilir.");return;}
    setBusy(true);setMessage("");
    try {
      const bitmap=await createImageBitmap(file);
      const actualWidth=bitmap.width,actualHeight=bitmap.height;bitmap.close();
      if (actualWidth!==width || actualHeight!==height) throw Error(`Resim ölçüsü ${actualWidth}×${actualHeight}. Bu ürün için tam ${width}×${height} piksel gerekiyor.`);
      const dataUri=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onerror=()=>reject(new Error("Resim okunamadı."));
        reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file);
      });
      const result=await fetch("/api/admin/catalog-image-upload",{
        method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({kind,id,contentType:file.type,base64:dataUri.split(",")[1]}),
      });
      const payload=await result.json().catch(()=>({}));
      if(!result.ok || typeof payload.imageReference!=="string") throw Error(payload.error || "Görsel yüklenemedi.");
      onChange(payload.imageReference);
      setMessage("Görsel yüklendi. Kayda bağlamak için formun Kaydet düğmesine basın.");
    } catch(error) {setMessage(error instanceof Error?error.message:"Görsel yüklenemedi.");}
    finally {setBusy(false);if(fileInput.current)fileInput.current.value="";}
  };
  return <div className="fx41f-image-upload">
    <div className="fx41f-upload-photo"><FixokuPhotoV41F src={value} fallbackSrc={fallback} alt={label}>{children}</FixokuPhotoV41F></div>
    <div className="fx41f-upload-actions">
      <strong>{label}</strong><small>{width} × {height} piksel · WebP tercih edilir · En fazla 2 MB</small>
      <input ref={fileInput} type="file" accept="image/webp,image/jpeg,image/png" aria-label={`${label} dosyası seç`} onChange={(event)=>void onFile(event.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}>{busy?"Yükleniyor...":"Bilgisayardan Resim Seç ve Yükle"}</button>
      {message && <small role="status">{message}</small>}
    </div>
  </div>;
}
