import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PanelIcon } from "../panel/components/PanelIcon";
import "./admin-panel.css";
import { TrainerQualificationBadgeR5 } from "../../shared/FixokuTrainerBadgeR5"; // FIXOKU_BADGES_R7

type Trainer={id:string;displayName:string;email:string;qualificationId:string|null;programTitle:string|null;qualificationStatus:string|null;source:string|null;reason:string|null};

const adminTrainerPhotoV11=(name:string)=>{
  const key=name.trim().toLocaleLowerCase("tr-TR");
  if(key==="elif usta") return "/images/profiles/elif.jpg";
  if(key==="özlem kaplan") return "/images/profiles/ozlem.jpg";
  return "";
};type Program={id:string;title:string;slug:string};
const statusLabel:Record<string,string>={ACTIVE:"Yetkili",SUSPENDED:"Askıya alındı",REVOKED:"İptal edildi"};
const sourceLabel:Record<string,string>={ADMIN_GRANT:"Yönetici tarafından verildi",PACKAGE_COMPLETION:"Paket/eğitim tamamlama",LEGACY_IMPORT:"Eski sistem aktarımı"};
const searchText = (value: string) => value.toLocaleLowerCase("tr-TR");


type TrainerQualificationSymbolV29="speed"|"flow"|"focus"|"paragraph"|"understand"|"coach"|"exam";

const trainerQualificationSymbolV29=(title:string):TrainerQualificationSymbolV29=>{
  const key=title.toLocaleLowerCase("tr-TR");
  if(key.includes("hızlı"))return "speed";
  if(key.includes("akıcı"))return "flow";
  if(key.includes("dikkat"))return "focus";
  if(key.includes("paragraf"))return "paragraph";
  if(key.includes("anlama")||key.includes("kitap")||key.includes("dijital"))return "understand";
  if(key.includes("koç")||key.includes("usta"))return "coach";
  return "exam";
};


/* FIXOKU_OWNER_HIDE_EMPTY_AND_PASTEL_ICONS_V37B */
const trainerEducationVisualKeyV37 = (title: string) => {
  const key = title.toLocaleLowerCase("tr-TR");
  if (key.includes("ilkokul")) return "primary-kids";
  if (key.includes("ortaokul") && key.includes("paragraf")) return "middle-paragraph";
  if (key.includes("ortaokul")) return "middle-reading";
  if (key.includes("lise") && key.includes("paragraf")) return "high-paragraph";
  if (key.includes("lise")) return "high-reading";
  if (key.includes("yetişkin")) return "adult-reading";
  if (key.includes("akıcı")) return "flow-reading";
  if (key.includes("paragraf")) return "paragraph";
  if (key.includes("kitap") || key.includes("dijital")) return "digital-book";
  if (key.includes("eğitmen destekli")) return "guided-reading";
  if (key.includes("usta") || key.includes("yetkinlik")) return "mentor";
  if (key.includes("dikkat") || key.includes("odak")) return "focus-practice";
  if (key.includes("anlama") || key.includes("yorumlama")) return "comprehension";
  if (key.includes("koç") || key.includes("rehber")) return "coaching";
  if (key.includes("sınav") || key.includes("strateji")) return "exam-strategy";
  return "general";
};

function TrainerEducationSvgV37({ title }: { title: string }) {
  const kind = trainerEducationVisualKeyV37(title);
  const common = {
    width: 30,
    height: 30,
    viewBox: "0 0 32 32",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    "aria-hidden": true,
  } as const;

  const tile = (bg: string, color: string, body: any) => (
    <svg {...common}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="10" fill={bg} />
      <g stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {body}
      </g>
    </svg>
  );

  if (kind === "primary-kids") {
    return tile("#FFF3D9", "#D69717", <>
      <path d="M8 22V11.7c0-1 .8-1.7 1.7-1.7H22" />
      <path d="M10.4 10h9.9c1 0 1.7.8 1.7 1.7V22" />
      <path d="M11 14h8" />
      <path d="M11 17.5h6.2" />
      <path d="M24.5 7.5v3" />
      <path d="M23 9h3" />
    </>);
  }
  if (kind === "middle-paragraph") {
    return tile("#F4E8FF", "#8C57D8", <>
      <path d="M9 9.5h13" />
      <path d="M9 14h13" />
      <path d="M9 18.5h9.5" />
      <path d="M9 23h11.2" />
      <circle cx="6" cy="9.5" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="14" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="18.5" r="1.2" fill="#8C57D8" stroke="none" />
      <circle cx="6" cy="23" r="1.2" fill="#8C57D8" stroke="none" />
    </>);
  }
  if (kind === "middle-reading") {
    return tile("#E8F7EE", "#2FAF6B", <>
      <path d="M7.5 18a8.5 8.5 0 0 1 17 0" />
      <path d="M16 17.5l4.8-4.8" />
      <circle cx="16" cy="17.5" r="1.8" fill="#2FAF6B" stroke="none" />
      <path d="M9 24h14" />
    </>);
  }
  if (kind === "high-paragraph") {
    return tile("#E8F2FF", "#4E7EDB", <>
      <path d="M8 23.2V10.2" />
      <path d="M12 23.2V10.2" />
      <path d="M8 10.2h9.5a4 4 0 0 1 0 8H12" />
      <path d="M20.2 8.4 23 5.6" />
      <path d="M21.8 10.5h3" />
    </>);
  }
  if (kind === "high-reading") {
    return tile("#E8F8FF", "#2998C5", <>
      <path d="M8.5 22.5 13 10.2l4.2 6 2.8-3.7 3.4 10" />
      <path d="M8 24h16" />
      <path d="M13.2 10.2h3.1" />
    </>);
  }
  if (kind === "adult-reading") {
    return tile("#FFF0E7", "#D97A3C", <>
      <path d="M10 23V11.5c0-.9.7-1.5 1.5-1.5H20" />
      <path d="M12.5 10h7.8c.9 0 1.7.8 1.7 1.7V23" />
      <path d="M12.8 14.3h6.8" />
      <path d="M12.8 17.8h5.5" />
      <path d="M7.5 20.5v-7" />
      <path d="M7.5 13.5h3" />
    </>);
  }
  if (kind === "flow-reading") {
    return tile("#FFF6DB", "#D6A300", <>
      <path d="M7 12h11" />
      <path d="M7 17h15" />
      <path d="M7 22h10" />
      <path d="m17 10 4 2-4 2" />
      <path d="m19 15 4 2-4 2" />
    </>);
  }
  if (kind === "paragraph") {
    return tile("#F4F0FF", "#7A63D1", <>
      <path d="M10 9h10.5" />
      <path d="M10 13.5h10.5" />
      <path d="M10 18h7.6" />
      <path d="M10 22.5h9.2" />
      <path d="M6.6 8.7v14" />
      <path d="M5 8.7h3.2" />
    </>);
  }
  if (kind === "digital-book") {
    return tile("#E8FBF6", "#1FAE8A", <>
      <rect x="8.5" y="7.8" width="15" height="16.4" rx="2.8" />
      <path d="M12.2 11.5h7.6" />
      <path d="M12.2 15.5h7.6" />
      <path d="M12.2 19.5h4.8" />
      <path d="M10 26h12" />
    </>);
  }
  if (kind === "guided-reading") {
    return tile("#FFF1F7", "#D56A95", <>
      <circle cx="11" cy="12" r="2.4" />
      <circle cx="20.2" cy="10.8" r="2" />
      <path d="M7.8 21c.6-3.4 2.2-5 4.4-5s3.8 1.6 4.4 5" />
      <path d="M17.8 21c.3-2.4 1.4-3.8 3.1-4.1" />
      <path d="M17.4 15.2h6" />
    </>);
  }
  if (kind === "mentor") {
    return tile("#FDEFD9", "#C98A11", <>
      <path d="M16 7.8 18.1 12l4.6.7-3.3 3.2.8 4.5L16 18.2l-4.2 2.2.8-4.5-3.3-3.2 4.6-.7Z" />
      <path d="M10.4 23.2h11.2" />
    </>);
  }
  if (kind === "focus-practice") {
    return tile("#FFECEF", "#CF597F", <>
      <circle cx="16" cy="16" r="8" />
      <circle cx="16" cy="16" r="3.3" />
      <path d="M16 4v4M16 24v4M4 16h4M24 16h4" />
    </>);
  }
  if (kind === "comprehension") {
    return tile("#E8F6FF", "#268BBF", <>
      <path d="M7 10.5c2.7-1.5 5.8-1.8 9-.5v13c-3.2-1.3-6.3-1-9 .5Z" />
      <path d="M16 10c3.2-1.3 6.3-1 9 .5v13c-2.7-1.5-5.8-1.8-9-.5Z" />
      <path d="m12 16 2 2 4-4" />
    </>);
  }
  if (kind === "coaching") {
    return tile("#F0E9FF", "#9164D0", <>
      <circle cx="13" cy="11" r="3" />
      <path d="M7 24c.4-5.4 2.4-8 6-8 3 0 4.8 2 5.5 6" />
      <path d="m19 13 2.2 2.2 4.5-5" />
    </>);
  }
  if (kind === "exam-strategy") {
    return tile("#FFF3DE", "#B87B16", <>
      <rect x="9" y="7" width="14" height="18" rx="2" />
      <path d="M12 12h7M12 16h7M12 20h4" />
      <path d="m18.5 22 1.5 1.5 3-3" />
    </>);
  }
  return tile("#EEF2FF", "#5C78D8", <>
    <path d="M9 22V10.8c0-.9.7-1.6 1.6-1.6H22" />
    <path d="M11.2 9.2h9.3c1 0 1.8.8 1.8 1.8V22" />
    <path d="M12.2 13h7.2" />
    <path d="M12.2 16.8h5.8" />
    <path d="m18.8 22.2 1.9 1.9 3.8-4.2" />
  </>);
}

function TrainerQualificationSvgV29({title}:{title:string}){
  const symbol=trainerQualificationSymbolV29(title);
  const common={width:28,height:28,viewBox:"0 0 26 26",fill:"none",xmlns:"http://www.w3.org/2000/svg","aria-hidden":true} as const;
  if(symbol==="speed")return <svg {...common}><path d="M4 15a9 9 0 1 1 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 14l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="13" cy="14" r="2" fill="currentColor"/></svg>;
  if(symbol==="flow")return <svg {...common}><path d="M4 8h12M4 13h18M4 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m18 6 4 2-4 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
  if(symbol==="focus")return <svg {...common}><circle cx="13" cy="13" r="8" stroke="currentColor" strokeWidth="2"/><circle cx="13" cy="13" r="3" fill="currentColor"/><path d="M13 2v3M13 21v3M2 13h3M21 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
  if(symbol==="paragraph")return <svg {...common}><path d="M7 5h12M7 10h12M7 15h8M7 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="4" cy="5" r="1.3" fill="currentColor"/><circle cx="4" cy="10" r="1.3" fill="currentColor"/><circle cx="4" cy="15" r="1.3" fill="currentColor"/><circle cx="4" cy="20" r="1.3" fill="currentColor"/></svg>;
  if(symbol==="understand")return <svg {...common}><path d="M5 7.5C7.5 5 10 4 13 4s5.5 1 8 3.5V20c-2.5-1.6-5-2.4-8-2.4S7.5 18.4 5 20V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M13 4v13.5" stroke="currentColor" strokeWidth="2"/></svg>;
  if(symbol==="coach")return <svg {...common}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2"/><path d="M4 21c.5-5 2.5-7 5-7s4.5 2 5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m17 10 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg {...common}><path d="M5 5h16v16H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 10h8M9 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="m15 18 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function AdminTrainersPage(){
  const [rows,setRows]=useState<Trainer[]>([]);
  const [programs,setPrograms]=useState<Program[]>([]);
  const [message,setMessage]=useState("");
  const [tab,setTab]=useState<"directory"|"qualification">("directory");
  const [userSearch,setUserSearch]=useState("");
  const [programSearch,setProgramSearch]=useState("");
  const [form,setForm]=useState({userId:"",trainingProgramId:"",action:"grant",source:"ADMIN_GRANT",reason:""});
  const [directoryStatusV24,setDirectoryStatusV24]=useState<"ALL"|"ACTIVE"|"NONE">("ALL");
  const [directoryProgramV24,setDirectoryProgramV24]=useState("ALL");
  const [directorySortV24,setDirectorySortV24]=useState<"AZ"|"ZA">("AZ");

  const load=()=>fetch("/api/admin/trainers",{credentials:"same-origin"}).then(r=>r.json()).then(x=>{setRows(x.trainers||[]);setPrograms(x.trainingPrograms||[])}).catch(()=>setMessage("Eğitmen listesi yüklenemedi."));
  useEffect(()=>{void load()},[]);

  const operationalRows=rows.filter((r)=>!r.email.toLocaleLowerCase("tr-TR").endsWith("@example.test"));
  const trainerGroups=useMemo(()=> {
    const map=new Map<string,{id:string;displayName:string;email:string;qualifications:Trainer[]}>();
    operationalRows.forEach(row=>{
      const current=map.get(row.id)||{id:row.id,displayName:row.displayName,email:row.email,qualifications:[]};
      if(row.qualificationId)current.qualifications.push(row);
      map.set(row.id,current);
    });
    return Array.from(map.values());
  },[operationalRows]);

  const normalizedUserSearch=searchText(userSearch.trim());
  const filteredTrainerGroups=trainerGroups.filter((r)=>!normalizedUserSearch||searchText(`${r.displayName} ${r.email}`).includes(normalizedUserSearch));
  const normalizedProgramSearch=searchText(programSearch.trim());
  const filteredPrograms=programs.filter((p)=>!normalizedProgramSearch||searchText(p.title).includes(normalizedProgramSearch));
  const directoryProgramsV24=Array.from(new Set(operationalRows.filter(row=>row.qualificationStatus==="ACTIVE"&&row.programTitle).map(row=>row.programTitle as string))).sort((a,b)=>a.localeCompare(b,"tr"));
  const visibleTrainerGroupsV24=filteredTrainerGroups
    .filter((trainer)=>{
      const active=trainer.qualifications.filter(q=>q.qualificationStatus==="ACTIVE");
      if(directoryStatusV24==="ACTIVE"&&!active.length)return false;
      if(directoryStatusV24==="NONE"&&active.length)return false;
      if(directoryProgramV24!=="ALL"&&!active.some(item=>item.programTitle===directoryProgramV24))return false;
      return true;
    })
    .sort((a,b)=>directorySortV24==="AZ"?a.displayName.localeCompare(b.displayName,"tr"):b.displayName.localeCompare(a.displayName,"tr"));
  const activeQualificationCount=operationalRows.filter(row=>row.qualificationStatus==="ACTIVE").length;

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    const response=await fetch("/api/admin/trainers",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
    const body=await response.json().catch(()=>({}));
    setMessage(response.ok?"Yetkinlik güncellendi.":body.error||"İşlem başarısız.");
    if(response.ok){void load();setTab("directory");}
  };

  const unqualifiedCount=trainerGroups.filter(item=>!item.qualifications.some(q=>q.qualificationStatus==="ACTIVE")).length;
  const routeTrainerIdV29=decodeURIComponent(window.location.pathname.match(/\/egitmenler\/([^/]+)$/)?.[1]||"");
  const routeTrainerV29=trainerGroups.find(item=>item.id===routeTrainerIdV29)||null;

  return <main className="platform-foundation-panel admin-panel trainer-exact-v24">
    <header className="trainer-exact-header-v24">
      <div>
        <span className="trainer-exact-eyebrow-v24">EĞİTMENLER</span>
        <h1>Eğitmen Yönetimi</h1>
        <p>Eğitmen, yetkinlik, eğitim satın alma ve özel erişim işlemlerini tek merkezden yönetin.</p>
      </div>
    </header>

    <section className="trainer-exact-kpis-v24 trainer-exact-kpis-v24--three" aria-label="Eğitmen özeti">
      <article>
        <span className="is-blue"><PanelIcon name="users" size={24}/></span>
        <div><small>Kayıtlı eğitmen</small><strong>{trainerGroups.length}</strong><em>Operasyon hesabı</em></div>
        <b>›</b>
      </article>
      <article>
        <span className="is-green"><PanelIcon name="user-check" size={24}/></span>
        <div><small>Aktif yetkinlik</small><strong>{activeQualificationCount}</strong><em>Program bazlı kayıt</em></div>
        <b>›</b>
      </article>
      <article>
        <span className="is-orange"><PanelIcon name="info" size={24}/></span>
        <div><small>Yetkinliksiz eğitmen</small><strong>{unqualifiedCount}</strong><em>Program yetkisi yok</em></div>
        <b>›</b>
      </article>
    </section>

    <nav className="trainer-exact-tabs-v24" aria-label="Eğitmen yönetimi bölümleri">
      <a className={tab==="directory"?"is-active is-directory":"is-directory"} href="/panel/admin/egitmenler?section=directory">
        <span className="trainer-exact-tab-number-v24">1</span>
        <span><strong>Eğitmen Listesi</strong><small>Profil ve yetkinlik özeti</small></span>
        <i><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 18c.7-3.8 2.6-5.8 5.5-5.8s4.8 2 5.5 5.8"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 13.2c2.5-.2 4.2 1.2 4.8 3.8"/></svg></i>
      </a>
      <a className="is-sales" href="/panel/admin/egitmen-ticaret?section=purchases">
        <span className="trainer-exact-tab-number-v24">3</span>
        <span><strong>Eğitim Satışları</strong><small>Satın alma ve ödeme kayıtları</small></span>
        <i><svg viewBox="0 0 24 24" fill="none"><path d="M3 4h2l2 10h10l2-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg></i>
      </a>
      <a className="is-access" href="/panel/admin/egitmen-ticaret?section=manual">
        <span className="trainer-exact-tab-number-v24">4</span>
        <span><strong>Özel Eğitim Erişimi</strong><small>Owner ücretsiz erişimi</small></span>
        <i><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="12" r="4"/><path d="m12.5 9.5 7-7M16 3l2 2M14 5l2 2"/></svg></i>
      </a>
    </nav>

    {message&&<div className="admin-callout" role="status">{message}</div>}

    {routeTrainerV29&&(()=>{
      const active=routeTrainerV29.qualifications.filter(q=>q.qualificationStatus==="ACTIVE");
      return <section className="trainer-detail-v29">
        <div className="trainer-detail-person-v29">
          <span className="trainer-exact-avatar-v24">
            {adminTrainerPhotoV11(routeTrainerV29.displayName)?<img src={adminTrainerPhotoV11(routeTrainerV29.displayName)} alt={routeTrainerV29.displayName+" profil fotoğrafı"}/>:routeTrainerV29.displayName.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}
          </span>
          <div><span className="trainer-exact-eyebrow-v24">EĞİTMEN DETAYI</span><h2>{routeTrainerV29.displayName}</h2><p>{routeTrainerV29.email}</p></div>
        </div>
        <div className="trainer-detail-qualifications-v29">
          <strong>{active.length} aktif yetkinlik</strong>
          <div className="trainer-qualification-logos-v29">
            {active.map(item=>{const label=item.programTitle||"Yetkinlik";return <span className="trainer-qualification-logo-v29" key={item.qualificationId||label} title={label} aria-label={label}><TrainerQualificationBadgeR5 title={label} size={52} fallback={<TrainerEducationSvgV37 title={label}/>} /><span className="sr-only">{label}</span></span>})}
          </div>
        </div>
        <div className="trainer-detail-actions-v29">
          <Link to="/panel/admin/egitmenler?section=directory">Listeye dön</Link>
          <Link className="is-primary" to={`/panel/admin/egitmen-ticaret?section=manual&trainer=${encodeURIComponent(routeTrainerV29.id)}`}>Özel eğitim erişimi</Link>
        </div>
      </section>;
    })()}

    {tab==="directory" ? (
      <section className="trainer-exact-directory-v24">
        <header className="trainer-exact-panel-head-v24">
          <div>
            <span className="trainer-exact-eyebrow-v24">EĞİTMEN LİSTESİ</span>
            <h2>Kayıtlı eğitmenler</h2>
            <p>Yetkinlik durumunu ve program kapsamını tek satırda görün.</p>
          </div>
          <label className="trainer-exact-search-v24">
            <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg></span>
            <input type="search" value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Ad veya e-posta ara..." />
          </label>
          <Link className="trainer-exact-add-inside-v25" to="/panel/admin/kullanici-islemleri">+ Yeni eğitmen ekle</Link>
        </header>

        <div className="trainer-exact-directory-tools-v24">
          <select value={directoryStatusV24} onChange={e=>setDirectoryStatusV24(e.target.value as "ALL"|"ACTIVE"|"NONE")}>
            <option value="ALL">Tüm durumlar</option>
            <option value="ACTIVE">Aktif yetkinliği olan</option>
            <option value="NONE">Yetkinlik bekleyen</option>
          </select>
          <select value={directoryProgramV24} onChange={e=>setDirectoryProgramV24(e.target.value)}>
            <option value="ALL">Tüm yetkinlikler</option>
            {directoryProgramsV24.map(title=><option key={title} value={title}>{title}</option>)}
          </select>
          <select value={directoryProgramV24} onChange={e=>setDirectoryProgramV24(e.target.value)}>
            <option value="ALL">Tüm programlar</option>
            {directoryProgramsV24.map(title=><option key={title} value={title}>{title}</option>)}
          </select>
          <span />
          <select value={directorySortV24} onChange={e=>setDirectorySortV24(e.target.value as "AZ"|"ZA")}>
            <option value="AZ">Sırala: Ad (A-Z)</option>
            <option value="ZA">Sırala: Ad (Z-A)</option>
          </select>
        </div>

        <div className="trainer-exact-table-v24" role="table" aria-label="Eğitmen listesi">
          <div className="trainer-exact-table-head-v24" role="row">
            <span>Eğitmen</span><span>Yetkinlikler</span><span>Durum</span><span>İşlemler</span>
          </div>
          {visibleTrainerGroupsV24.map((trainer)=>{
            const active=trainer.qualifications.filter(q=>q.qualificationStatus==="ACTIVE");
            return <div className="trainer-exact-table-row-v24" role="row" key={trainer.id}>
              <div className="trainer-exact-person-v24">
                <span className="trainer-exact-avatar-v24">
                  {adminTrainerPhotoV11(trainer.displayName)
                    ? <img src={adminTrainerPhotoV11(trainer.displayName)} alt={trainer.displayName+" profil fotoğrafı"}/>
                    : trainer.displayName.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}
                </span>
                <div><strong>{trainer.displayName}<i>✓</i></strong><small>✉ {trainer.email}</small></div>
              </div>
              <div className="trainer-exact-programs-v24 trainer-qualification-logos-v29">
                {active.length?active.map(item=>{
                  const label=item.programTitle||"Yetkinlik";
                  return <span className="trainer-qualification-logo-v29" key={item.qualificationId||label} title={label} aria-label={label}>
                    <TrainerQualificationBadgeR5 title={label} size={52} fallback={<TrainerEducationSvgV37 title={label}/>} />
                    <span className="sr-only">{label}</span>
                  </span>;
                }):<em>Aktif yetkinlik yok</em>}
              </div>
              <div className="trainer-exact-status-wrap-v24">
                <span className={`trainer-exact-status-v24 ${active.length?"is-active":"is-pending"}`}>{active.length?`${active.length} aktif yetkinlik`:"Yetkinlik bekliyor"}</span>
                <i className={active.length?"is-green":"is-orange"}/>
              </div>
              <div className="trainer-exact-actions-v24">
                <Link to={`/panel/admin/egitmenler/${trainer.id}`}>Detay <PanelIcon name="arrow" size={15}/></Link>
                <details className="trainer-row-menu-v29">
                  <summary aria-label="Diğer işlemler">⋮</summary>
                  <div>
                    <Link to={`/panel/admin/egitmenler/${trainer.id}`}>Eğitmen detayı</Link>
                    <Link to={`/panel/admin/egitmen-ticaret?section=manual&trainer=${encodeURIComponent(trainer.id)}`}>Özel eğitim erişimi ver</Link>
                    <Link to={`/panel/admin/egitmen-ticaret?section=purchases&trainer=${encodeURIComponent(trainer.id)}`}>Eğitim satışlarını gör</Link>
                  </div>
                </details>
              </div>
            </div>;
          })}
          {!visibleTrainerGroupsV24.length&&<div className="trainer-exact-empty-v24">Arama ölçütlerine uygun eğitmen bulunamadı.</div>}
        </div>
      </section>
    ) : (
      <section className="trainer-exact-qualification-layout-v24">
        <form className="trainer-exact-qualification-form-v24" onSubmit={(e)=>void submit(e)}>
          <header>
            <span className="trainer-exact-eyebrow-v24">YETKİNLİK YÖNETİMİ</span>
            <h2>Program yetkinliği işlemi</h2>
            <p>Eğitmenin öğrenciye hangi programı verebileceğini belirleyin.</p>
          </header>
          <div className="trainer-exact-form-grid-v24">
            <label>Kullanıcı ara<div className="trainer-exact-input-icon-v24"><span>⌕</span><input type="search" value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Ad veya e-posta ara..." autoComplete="off"/></div></label>
            <label>Eğitmen<select required value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})}><option value="">Eğitmen seçin</option>{filteredTrainerGroups.map(r=><option key={r.id} value={r.id}>{r.displayName} · {r.email}</option>)}</select></label>
            <label>Program ara<div className="trainer-exact-input-icon-v24"><span>⌕</span><input type="search" value={programSearch} onChange={e=>setProgramSearch(e.target.value)} placeholder="Program adı ara..." autoComplete="off"/></div></label>
            <label>Program<select required value={form.trainingProgramId} onChange={e=>setForm({...form,trainingProgramId:e.target.value})}><option value="">Program seçin</option>{filteredPrograms.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
            <label>İşlem<select value={form.action} onChange={e=>setForm({...form,action:e.target.value})}><option value="grant">Yetkilendir</option><option value="reactivate">Yeniden etkinleştir</option><option value="suspend">Askıya al</option><option value="revoke">İptal et</option></select></label>
            <label>Kaynak<select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}><option value="ADMIN_GRANT">Yönetici tarafından verildi</option><option value="PACKAGE_COMPLETION">Paket/eğitim tamamlama</option><option value="LEGACY_IMPORT">Eski sistem aktarımı</option></select></label>
            <label className="is-wide">Gerekçe<textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Bu yetkinliğin verilme nedenini yazın..."/></label>
          </div>
          <button className="trainer-exact-primary-v24" type="submit">＋ Yetkinliği kaydet</button>
        </form>

        <aside className="trainer-exact-qualification-side-v24">
          <section className="trainer-exact-info-card-v24">
            <div className="trainer-exact-side-title-v24"><div><span className="trainer-exact-eyebrow-v24">ÖNEMLİ AYRIM</span><h2>Yetkinlik ≠ Eğitim erişimi</h2></div><i>ⓘ</i></div>
            <p><strong>Yetkinlik:</strong> Eğitmenin öğrenciye hangi programı verebileceğini belirler.</p>
            <p><strong>Eğitim erişimi:</strong> Eğitmenin satın aldığı veya Owner tarafından açılan eğitmen eğitim içerikleridir.</p>
            <a href="/panel/admin/egitmen-ticaret?section=manual">Eğitim erişimlerini yönet →</a>
          </section>
          <section className="trainer-exact-summary-card-v24">
            <div className="trainer-exact-side-title-v24"><div><span className="trainer-exact-eyebrow-v24">İŞLEM ÖZETİ</span><h2>Yetkilendirme sonucu</h2></div><i className="is-purple">▤</i></div>
            <p>Bu işlem ile eğitmene aşağıdaki yetki verilecektir.</p>
            <div className="trainer-exact-checklist-v24">
              <span><i>✓</i> Seçilen programı öğrencilere verebilir</span>
              <span><i>✓</i> Eğitim içeriklerine erişim hakkı vermez</span>
              <span><i>✓</i> Program bazlı yetkilendirme yapılır</span>
              <span><i>✓</i> İstendiğinde geri alınabilir</span>
              <span><i>✓</i> İşlem geçmişi kaydedilir</span>
            </div>
          </section>
        </aside>
      </section>
    )}
  </main>;
}
