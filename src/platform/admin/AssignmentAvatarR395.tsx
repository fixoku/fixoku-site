import { useState } from "react";
const avatarStages: Record<string,{size:number; y:number; color:string; bg:string}> = {
  PRIMARY:{size:12,y:23,color:"#2563eb",bg:"#dbeafe"},
  MIDDLE:{size:13,y:22,color:"#0f766e",bg:"#ccfbf1"},
  HIGH:{size:14,y:21,color:"#6d28d9",bg:"#ede9fe"},
  ADULT:{size:15,y:20,color:"#475569",bg:"#e2e8f0"}
};
export function StudentStageAvatar({stage}:{stage?:string}) {
  const a=avatarStages[String(stage||"").toUpperCase()] || avatarStages.ADULT;
  return <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" style={{display:"block",borderRadius:"50%"}}><circle cx="32" cy="32" r="32" fill={a.bg}/><circle cx="32" cy={a.y} r={a.size} fill={a.color}/><path d="M7 64V59C7 43 18 38 32 38S57 43 57 59V64Z" fill={a.color}/>{stage==="PRIMARY"||stage==="MIDDLE"?<path d="M24 44L32 48L40 44" fill="none" stroke={a.bg} strokeWidth="3" strokeLinecap="round"/>:null}</svg>;
}
export function AssignmentAvatar({src,name,className="",student=false,stage}:{src:string;name:string;className?:string;student?:boolean;stage?:string}) {
  const [failed,setFailed]=useState("");
  const initials=(name||"Eğitmen").trim().split(/\s+/u).filter((_,i,all)=>i===0||i===all.length-1).map(x=>x[0]).join("").toLocaleUpperCase("tr-TR");
  return <span className={`r395-avatar ${className}`} aria-hidden="true">{src && failed!==src ? <img src={src} alt="" loading="lazy" onError={()=>setFailed(src)}/> : <b>{initials}</b>}</span>;
}
export function assignmentError(code:unknown,fallback:string) {
 const messages:Record<string,string>={R6_TRAINING_PRODUCT_MISMATCH:"Eğitim ürününün kademe bilgisi paketle eşleşmiyor. Kataloğu kontrol edin.",R6_QUALIFICATION_MISMATCH:"Eğitmenin yetkinliği eğitimle eşleşmiyor.",R6_TRAINER_QUALIFICATION_REQUIRED:"Eğitmenin bu eğitim için aktif yetkinliği yok.",R6_PARTICIPANT_ALREADY_GROUPED:"Öğrenci zaten aktif bir sınıfta.",ACTIVE_ENTITLEMENT_REQUIRED:"Öğrencinin aktif eğitim hakkı bulunmuyor.",TRAINER_NOT_ELIGIBLE:"Eğitmenin bu eğitim için yetkisi bulunmuyor.",ALREADY_ASSIGNED:"Bu öğrenciye daha önce atama yapılmış.",COMPENSATION_AMOUNT_REQUIRED:"Geçerli bir hakediş tutarı girin.",GROUP_ASSIGNMENT_WORKFLOW_REQUIRED:"Bu eğitim sınıf ataması ekranından atanmalıdır.",R6_CAPACITY_INVALID:"Sınıf kapasitesi geçersiz.",ASSIGNMENT_ALREADY_PLANNED:"Eğitim planlandığı için atama kaldırılamaz.",ASSIGNMENT_CHANGED:"Atama değişti. Kaydı yeniden açın.",OWNER_ONLY:"Bu işlem için Owner yetkisi gereklidir."};
 return messages[String(code)]||fallback;
}
