import { useState } from "react";
export function AssignmentAvatar({src,name,className=""}:{src:string;name:string;className?:string}) {
  const [failed,setFailed]=useState("");
  const initials=(name||"Eğitmen").trim().split(/\s+/u).slice(0,2).map(x=>x[0]).join("").toLocaleUpperCase("tr-TR");
  return <span className={`r395-avatar ${className}`} aria-hidden="true">{src && failed!==src ? <img src={src} alt="" loading="lazy" onError={()=>setFailed(src)}/> : <b>{initials}</b>}</span>;
}
export function assignmentError(code:unknown,fallback:string) {
 const messages:Record<string,string>={R6_TRAINING_PRODUCT_MISMATCH:"Eğitim ürününün kademe bilgisi paketle eşleşmiyor. Kataloğu kontrol edin.",R6_QUALIFICATION_MISMATCH:"Eğitmenin yetkinliği eğitimle eşleşmiyor.",R6_TRAINER_QUALIFICATION_REQUIRED:"Eğitmenin bu eğitim için aktif yetkinliği yok.",R6_PARTICIPANT_ALREADY_GROUPED:"Öğrenci zaten aktif bir grupta.",ACTIVE_ENTITLEMENT_REQUIRED:"Öğrencinin aktif eğitim hakkı bulunmuyor.",TRAINER_NOT_ELIGIBLE:"Eğitmenin bu eğitim için yetkisi bulunmuyor.",ALREADY_ASSIGNED:"Bu öğrenciye daha önce atama yapılmış.",COMPENSATION_AMOUNT_REQUIRED:"Geçerli bir hakediş tutarı girin.",GROUP_ASSIGNMENT_WORKFLOW_REQUIRED:"Bu eğitim grup ataması ekranından atanmalıdır.",R6_CAPACITY_INVALID:"Grup kapasitesi geçersiz.",OWNER_ONLY:"Bu işlem için Owner yetkisi gereklidir."};
 return messages[String(code)]||fallback;
}
