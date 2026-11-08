import { useRef, useState, type ReactNode } from "react";
import { FixokuPhotoV41F } from "./FixokuCatalogAssetsV41F";

export function FixokuImageUploadV41F({kind, id, value, fallback, label, width, height, onChange, children}:{
  kind:"product"|"package"|"trainer-package";id:string;value:string;fallback?:string;label:string;
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
      const result=await fetch("/api/admin/catalog-media-upload-url",{
        method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({kind,id,contentType:file.type,size:file.size}),
      });
      const payload=await result.json().catch(()=>({}));
      if(!result.ok || typeof payload.uploadUrl!=="string" || typeof payload.storageKey!=="string") throw Error(payload.error || "Kalıcı medya sağlayıcısı hazır değil.");
      const upload=await fetch(payload.uploadUrl,{method:"PUT",headers:{"content-type":file.type},body:file});
      if(!upload.ok) throw Error("Görsel depolamaya yazılamadı.");
      const finalized=await fetch("/api/admin/catalog-media-finalize",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({storageKey:payload.storageKey})});
      const finalPayload=await finalized.json().catch(()=>({}));
      if(!finalized.ok || finalPayload.verified!==true || typeof finalPayload.mediaReference!=="string") throw Error(finalPayload.error || "Görsel doğrulanamadı.");
      onChange(finalPayload.mediaReference);
      setMessage("Görsel kalıcı depolamaya yüklendi. Kayda bağlamak için formu ayrıca kaydedin.");
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
