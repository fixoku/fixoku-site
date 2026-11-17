import { useEffect, useMemo, useState } from 'react';
import { PanelShell } from '../../panel/layout/PanelShell';
import './trainer-assignments-v4.css';
import { AssignmentAvatar } from '../../admin/AssignmentAvatarR395';
import { AssignmentModalR401 } from '../../admin/AssignmentModalR401';
import { FixokuPhotoV41F, packageImageDefaultV41F } from '../../admin/FixokuCatalogAssetsV41F';
import '../../admin/assignment-r401.css';
import './trainer-assignments-r402.css';

type Contact = { kind: "GUARDIAN" | "STUDENT"; name?: string | null; phone?: string | null; email?: string | null };
type User = { id: string; name: string; email?: string };
type Person = { contact?: Contact; packageTitle?: string | null; packageSlug?: string | null; packageCover?: string | null; targetId?: string; contactStatus?: string | null; agreedStartAt?: string | null; stage?: string; grade?: string | null; school?: string | null;  id?: string; studentUserId?: string; studentName?: string; studentEmail?: string; studentPhone?: string | null; phone?: string | null; photoUrl?: string | null; status?: string };
type Group = { id: string; trainingType?: string; educationStage?: string; mode?: string; status?: string; maxStudents?: number; activeParticipantCount?: number; participants?: Person[] };
type Enrollment = { id: string; programTitle?: string; progressPercent?: number; status?: string };
type Student = { id: string; name?: string; email?: string; phone?: string | null; profilePhotoUrl?: string | null; enrollments?: Enrollment[] };
type Mark = { plannedAt: string };
type Followup = { classNumber?: number | null; marks: Record<string, Mark>; eligibility: { ready: boolean; reason: string; daysLeft: number | null }; status: string; memberIds: string[]; freeReason?: string | null; scheduledStartAt?: string | null };
type Profile = { contact?: Contact; packageTitle?: string | null; packageSlug?: string | null; packageCover?: string | null; targetId?: string; contactStatus?: string | null; agreedStartAt?: string | null; studentUserId?: string; stage?: string; grade?: string | null; school?: string | null;  name?: string; email?: string; phone?: string | null; photoUrl?: string | null };
type FollowupResponse = { assignments: Record<string, Followup>; profiles: Record<string, Profile>; profilesByAssignment?: Record<string, Profile[]>; scope: string; completionDays: number };
type Assignment = { className?: string; key: string; type: 'group' | 'individual'; title: string; stage: string; status: string; people: Person[]; maxStudents: number; followup?: Followup };
type Filter = 'all' | 'group' | 'individual' | 'completed';

const stages: Record<string, string> = { PRIMARY: 'İlkokul', MIDDLE: 'Ortaokul', HIGH: 'Lise', ADULT: 'Yetişkin' };
const topics: Record<string, string> = { FAST_READING: 'Hızlı Okuma', PARAGRAPH: 'Paragraf', FAST_READING_AND_PARAGRAPH: 'Hızlı Okuma ve Paragraf' };
const tr = (v?: string, map?: Record<string,string>) => map?.[String(v || '').toUpperCase()] || String(v || 'Eğitim').replaceAll('_',' ');
const done = (v: string) => v === 'COMPLETED';
const disabledStatus = (v: string) => ['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(v);
const trStatus = (status: string, count: number, total: number, ready: boolean) => {
  if(done(status)) return { label: 'Tamamlandı', tone: 'done' };
  if(disabledStatus(status)) return {label:'Kapalı',tone:'muted'};
  if(ready) return {label:'Tamamlanabilir',tone:'done'};
  if(total > 0 && count === total) return {label:'Planlandı',tone:'info'};
  return {label: 'Planlama',tone:'pending'};
};
const todayTR=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function datesAllowed(){const today=todayTR(),[y,m,d]=today.split('-').map(Number),end=new Date(Date.UTC(y,m,1));end.setUTCDate(Math.min(d,new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate()));const result:string[]=[];for(let day=new Date(today+'T00:00:00Z');day<=end;day.setUTCDate(day.getUTCDate()+1))result.push(day.toISOString().slice(0,10));return result;}
const dateOnly=(v?:string|null)=>v?new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'long'}).format(new Date(v)):'Belirlenmedi';
function DateFields({value,onChange,disabled}:{value:string;onChange:(s:string)=>void;disabled:boolean}){
 const dates=datesAllowed(),v=dates.includes(value)?value:dates[0],years=[...new Set(dates.map(x=>x.slice(0,4)))],months=[...new Set(dates.filter(x=>x.startsWith(v.slice(0,4))).map(x=>x.slice(5,7)))],days=dates.filter(x=>x.startsWith(v.slice(0,7))).map(x=>x.slice(8));
 const choose=(prefix:string)=>onChange(dates.find(x=>x.startsWith(prefix))||dates[0]);
 return <div className="r402-datefields"><label>Yıl<select disabled={disabled} value={v.slice(0,4)} onChange={e=>choose(e.target.value)}>{years.map(x=><option key={x}>{x}</option>)}</select></label><label>Ay<select disabled={disabled} value={v.slice(5,7)} onChange={e=>choose(v.slice(0,4)+'-'+e.target.value)}>{months.map(x=><option key={x} value={x}>{new Intl.DateTimeFormat('tr-TR',{month:'long',timeZone:'UTC'}).format(new Date('2026-'+x+'-01T00:00:00Z'))}</option>)}</select></label><label>Gün<select disabled={disabled} value={v.slice(8)} onChange={e=>onChange(v.slice(0,7)+'-'+e.target.value)}>{days.map(x=><option key={x}>{x}</option>)}</select></label></div>;
}
function Cover({person}:{person?:Person}){return <span className="r402-cover"><FixokuPhotoV41F src={person?.packageCover} fallbackSrc={person?.packageSlug?packageImageDefaultV41F(person.packageSlug):undefined} alt={person?.packageTitle||'Eğitim paketi'}><span>{person?.packageTitle||'Eğitim paketi'}</span></FixokuPhotoV41F></span>}
function ContactActions({person,teacher,training,active}:{person:Person;teacher:string;training:string;active:boolean}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState('');const c=person.contact;
 let digits=(c?.phone||'').replace(/[^0-9+]/g,'');if(/^05\d{9}$/.test(digits))digits='+90'+digits.slice(1);else if(/^5\d{9}$/.test(digits))digits='+90'+digits;else if(/^90\d{10}$/.test(digits))digits='+'+digits;else if(/^00[1-9]\d{6,14}$/.test(digits))digits='+'+digits.slice(2);
 const valid=/^\+[1-9]\d{6,14}$/.test(digits);
 return <>{active&&valid&&person.contactStatus==='UNREACHABLE'&&<button type="button" className="r402-secondary" onClick={()=>{setMessage(`Merhaba ${c?.name||''},\n\nBen FIXOKU eğitmeni ${teacher}. ${person.packageTitle||training} eğitimi hakkında görüşmek için sizi aradım ancak ulaşamadım. Uygun olduğunuzda görüşerek eğitim başlangıç tarihini birlikte belirleyebiliriz.\n\nSaygılarımla,\n${teacher}\nFIXOKU Akademi`);setOpen(true);}}>WhatsApp mesajı hazırla</button>}{open&&<AssignmentModalR401 title="WhatsApp mesajı" onClose={()=>setOpen(false)}><label>Mesaj<textarea rows={8} value={message} onChange={e=>setMessage(e.target.value)}/></label><div className="r401-actions"><button type="button" onClick={()=>setOpen(false)}>Vazgeç</button>{message.trim()&&<a href={'https://wa.me/'+digits.slice(1)+'?text='+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">WhatsApp’ta aç</a>}</div></AssignmentModalR401>}</>;
}
function pictureUrl(url: string | null | undefined) {
  if (!url) return null;
  // Do not render arbitrary third-party image URLs or storage keys.
  return /^\/(?!\/)[^\\]*$/u.test(url) ? url : null;
}
const getError = (e: unknown) => e instanceof Error ? e.message : 'İşlem yapılamadı.';

export function TrainerAssignmentsPage({ user }: { user: User }) {
  const [groups,setGroups]=useState<Group[]>([]);
  const [legacy,setLegacy]=useState<Student[]>([]);
  const [follow,setFollow]=useState<FollowupResponse|null>(null);
  const [selected,setSelected]=useState('');
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [proposedDates,setProposedDates]=useState<Record<string,string>>({});
  const [draftDates,setDraftDates]=useState<Record<string,string>>({});
  const [confirmAction,setConfirmAction]=useState<"schedule"|"finish"|null>(null);
  async function load(silent=false) {
    if(!silent)setLoading(true); setError('');
    try {
      const [a,b,c]=await Promise.all([
        fetch('/api/admin/r6-training-groups',{credentials:'same-origin',cache:'no-store'}),
        fetch('/api/trainer/students',{credentials:'same-origin',cache:'no-store'}),
        fetch('/api/trainer/assignment-followup',{credentials:'same-origin',cache:'no-store'}),
      ]);
      if(!a.ok || !b.ok) throw new Error('Atama ve takip verileri yüklenemedi. Oturumu ve sunucuyu kontrol edin.');
      const [aj,bj,cj]=await Promise.all([a.json(),b.json(),c.ok ? c.json() : Promise.resolve({assignments:{},profiles:{}})]);
      setGroups(Array.isArray(aj.groups)?aj.groups:[]);
      setLegacy(Array.isArray(bj.students)?bj.students:[]);
      setFollow(cj as FollowupResponse);
    } catch(e) {setError(getError(e));} finally {if(!silent)setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const assignments=useMemo<Assignment[]>(()=>{
    const profiles=follow?.profilesByAssignment||{};
    const a:Assignment[]=groups.map(g=>{
      const key=`r6-${g.id}`,info=follow?.assignments?.[key];
      const people:Person[]=(profiles[key]||[]).map(p=>({contact:p.contact,packageTitle:p.packageTitle,packageSlug:p.packageSlug,packageCover:p.packageCover,targetId:p.targetId,contactStatus:p.contactStatus,agreedStartAt:p.agreedStartAt,studentUserId:p.studentUserId,studentName:p.name||'Öğrenci',studentEmail:p.email||'',studentPhone:p.phone||null,photoUrl:p.photoUrl||null,stage:p.stage||g.educationStage,grade:p.grade,school:p.school}));
      const className=String(g.mode).toUpperCase()==='GROUP' && typeof info?.classNumber==='number' && Number.isInteger(info.classNumber) && info.classNumber>0 ? `${user.name} · Sınıf ${info.classNumber}` : undefined;
      return { key, className, type:String(g.mode).toUpperCase()==='GROUP'?'group':'individual',title:tr(g.trainingType,topics),stage:tr(g.educationStage,stages),status:String(g.status||'').toUpperCase(),people,maxStudents:g.maxStudents||5,followup:info };
    });
    for(const s of legacy)for(const e of s.enrollments||[]) {
      const key=`legacy-${e.id}`,info=follow?.assignments?.[key];
      // Some enrolled legacy students are also represented by R6 groups; keep genuine distinct enrollments.
      const profile:Profile=profiles[key]?.[0]||{};
      a.push({key,type:'individual',title:e.programTitle||'Birebir eğitim',stage:'Birebir eğitim',status:String(e.status||'').toUpperCase(),maxStudents:1,followup:info,
        people:profile.targetId?[{contact:profile.contact,packageTitle:profile.packageTitle,packageSlug:profile.packageSlug,packageCover:profile.packageCover,targetId:profile.targetId,contactStatus:profile.contactStatus,agreedStartAt:profile.agreedStartAt,studentUserId:profile.studentUserId,studentName:profile.name||'Öğrenci',studentEmail:profile.email||'',studentPhone:profile.phone||null,photoUrl:profile.photoUrl||null,stage:profile.stage,grade:profile.grade,school:profile.school}]:[]});
    }
    return a;
  },[groups,legacy,follow,user.name]);

  const visible=useMemo(()=>assignments.filter(a=>{
    if(filter==='completed'&&!done(a.status))return false;
    if(filter==='group'&&(a.type!=='group'||done(a.status)))return false;
    if(filter==='individual'&&(a.type!=='individual'||done(a.status)))return false;
    const haystack=[a.className||'',a.title,a.stage,...a.people.flatMap(p=>[p.studentName||'',p.studentEmail||''])].join(' ').toLocaleLowerCase('tr');
    return haystack.includes(query.toLocaleLowerCase('tr').trim());
  }),[assignments,filter,query]);
  const current=visible.find(a=>a.key===selected)||visible[0];
  const memberId=(a:Assignment,p:Person)=>a.key.startsWith('r6-')?p.targetId:p.studentUserId;
  const ambiguous=(a:Assignment)=>a.people.some(p=>!memberId(a,p))||new Set(a.people.map(p=>memberId(a,p))).size!==a.people.length;
  const planned=(a:Assignment)=>a.people.filter(p=>!!a.followup?.marks?.[memberId(a,p)||'']?.plannedAt).length;
  const canComplete=(a:Assignment)=>!ambiguous(a) && a.people.length>0 && a.followup?.eligibility?.ready===true && (a.type==='group' ? ['ASSIGNED','IN_PROGRESS'].includes(a.status): !disabledStatus(a.status));

  async function post(input:Record<string,string>) {
    const response=await fetch('/api/trainer/assignment-followup',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
    const text=await response.text();let data:any={};try{data=JSON.parse(text);}catch{}
    if(!response.ok)throw new Error(({WAIT_21_DAYS:'21 günlük süre henüz dolmadı.',STUDENTS_NOT_ALL_PLANNED:'Önce bütün öğrenciler planlanmalı.',ASSIGNMENT_NOT_ACTIVE:'Bu eğitim artık aktif değil.',NOT_ASSIGNED_TO_TRAINER:'Bu öğrenci size atanmış değil.'} as Record<string,string>)[data.error]||data.error||'İşlem başarısız.');
    return data;
  }
  const istanbulDate=(value?:string|null)=>value ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)):'';
  const proposal=(a:Assignment)=>proposedDates[a.key]??istanbulDate(a.followup?.scheduledStartAt);
  const classOpen=(a:Assignment)=>(a.key.startsWith('r6-') ? ['ASSIGNED','IN_PROGRESS'].includes(a.status) : ['ACTIVE','PAUSED'].includes(a.status)) && !!a.followup && (!a.followup.scheduledStartAt || Date.parse(a.followup.scheduledStartAt)>Date.now());
  async function classAction(a:Assignment,action:string,p?:Person,status?:string){
    if(!classOpen(a)||busy||ambiguous(a))return;
    const startAt=proposal(a)?proposal(a)+'T00:00:00+03:00':'';
    if((action==='schedule'||status==='AGREED')&&(!startAt||!datesAllowed().includes(proposal(a)))){setMessage('Bugün ile bir takvim ayı sonrası arasında tarih seçiniz.');return;}
    if(action==='contact'&&!p?.targetId)return;
    setBusy(a.key);setMessage('');
    try{
      if(a.key.startsWith('legacy-')){
        const studentId=memberId(a,p||a.people[0]);if(!studentId)throw new Error('Öğrenci doğrulanamadı.');
        await post({assignmentKey:a.key,studentId,action,contactStatus:status||'',startAt});
      }else{
      const response=await fetch('/api/admin/r6-training-groups/'+encodeURIComponent(a.key.slice(3)),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action,participantId:p?.targetId,contactStatus:status,startAt})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'İşlem başarısız.');}
      await load(true);setMessage(action==='schedule'?'Eğitim başlangıç tarihi kaydedildi.':'Görüşme durumu kaydedildi.');
    }catch(e){setMessage(getError(e));}finally{setBusy('');}
  }
  async function finish(a:Assignment) {
    if(!canComplete(a))return;

    setBusy(a.key);setMessage('');
    try{await post({assignmentKey:a.key,action:'complete'});await load();setMessage('Eğitim tamamlama isteği işlendi.');}
    catch(e){setMessage(getError(e));}finally{setBusy('');}
  }

  const tabs:{id:Filter,label:string}[]=[{id:'all',label:'Tümü'},{id:'group',label:'Sınıf'},{id:'individual',label:'Birebir'},{id:'completed',label:'Bitenler'}];
  const overall=assignments.length;
  return <PanelShell user={user}>
    <main className="ta4-page r402-trainer"><header className="r402-top"><div><span className="ta4-overline">EĞİTİM OPERASYONU</span><h1>Atamalarım</h1><p>Öğrencilerinizle iletişime geçin, başlangıç tarihini belirleyin ve eğitimleri takip edin.</p></div><button type="button" className="r402-secondary" onClick={()=>void load(true)} disabled={!!busy}>Listeyi yenile</button></header><div className="r402-stats">{[["Atanan eğitimler",overall],["Sınıf eğitimleri",assignments.filter(a=>a.type==="group").length],["Birebir eğitimler",assignments.filter(a=>a.type==="individual").length],["Tamamlanan",assignments.filter(a=>done(a.status)).length]].map(([label,n])=><div key={label}><span>{label}</span><strong>{n}</strong></div>)}</div>
      
      <section className="ta4-block ta4-assigned" aria-labelledby="ta4-assigned-title">
        <div className="ta4-section-head"><div><h2 id="ta4-assigned-title">Atanan eğitimler</h2></div><span className="ta4-count">{overall} kayıt</span></div>
        <div className="ta4-tools"><div className="ta4-tabs" role="tablist" aria-label="Atama türü">{tabs.map(t=><button type="button" role="tab" aria-selected={filter===t.id} className={filter===t.id?'on':''} key={t.id} onClick={()=>setFilter(t.id)}>{t.label}</button>)}</div><label className="ta4-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Eğitim veya öğrenci ara" aria-label="Eğitim veya öğrenci ara" value={query} onChange={(e: { target: { value: string } })=>setQuery(e.target.value)}/></label></div>
        {loading?<p className="ta4-state" role="status">Atamalar yükleniyor…</p>:error?<p className="ta4-state is-error" role="alert">{error}</p>:visible.length?<div className="ta4-assignment-grid">{visible.map(a=>{
          const count=planned(a),st=trStatus(a.status,count,a.people.length,!!a.followup?.eligibility?.ready);
          return <button type="button" key={a.key} className={`ta4-assignment ${current?.key===a.key?'selected':''}`} aria-pressed={current?.key===a.key} onClick={()=>setSelected(a.key)}>
            <Cover person={a.people[0]}/><span className="r402-coursecopy"><span className="ta4-assignment-top"><span className="ta4-caps">{a.type==='group'?'SINIF EĞİTİMİ':'BİREBİR EĞİTİMİ'}</span><span className={`ta4-pill ${st.tone}`}>{st.label}</span></span>
            <strong className="ta4-lesson" style={{overflowWrap:"anywhere"}}>{a.className||a.title}</strong><span className="ta4-sub">{a.stage}{a.className?` · ${a.title}`:a.type==='group'?' · Sınıf numarası bekleniyor':''}</span>
            <span className="ta4-assignment-bottom"><span>{a.people.length}{a.type==='group'?`/${a.maxStudents}`:''} öğrenci</span><span>{done(a.status)?'Tamamlandı':`${count}/${a.people.length} planlandı`}</span></span></span>
          </button>;
        })}</div>:<p className="ta4-state">Bu bölümde eğitim bulunamadı.</p>}
      </section>
      {message&&<div role="status" className="r402-toast">{message}<button type="button" onClick={()=>setMessage('')}>Kapat</button></div>}
      {!loading&&!error&&current&&<section className="ta4-block ta4-detail" aria-labelledby="ta4-detail-title">
        <div className="ta4-detail-head"><div className="ta4-detail-id"><Cover person={current.people[0]}/><div><span className="ta4-overline">{current.type==='group'?'SINIF EĞİTİMİ':'BİREBİR EĞİTİMİ'} · {current.stage}</span><h2 id="ta4-detail-title" style={{overflowWrap:"anywhere"}}>{current.className||current.title}</h2>{current.className&&<span className="ta4-sub">{current.title}</span>}</div></div><span className={`ta4-pill ${trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).tone}`}>{trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).label}</span></div>
        <div className="ta4-divider"/>
        {current.followup?.freeReason && <div className="ta4-message" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}><strong>Ücretsiz atama · 0 ₺</strong><p>{current.followup.freeReason}</p></div>}
        <div className="r402-meta">{[["Öğrenci sayısı",`${current.people.length}${current.type==='group'?'/'+current.maxStudents:''}`],["Mutabakat",`${current.people.filter(p=>p.contactStatus==='AGREED'&&istanbulDate(p.agreedStartAt)===proposal(current)).length}/${current.people.length}`],["Eğitim başlangıcı",dateOnly(current.followup?.scheduledStartAt)],["Önerilen tarih",proposal(current)||'Belirlenmedi']].map(([label,v])=><div key={label}><span>{label}</span><strong>{v}</strong></div>)}</div>
        {ambiguous(current)&&<p role="status">Öğrenci atama kimlikleri doğrulanamadı. Planlama güvenlik nedeniyle kapalı.</p>}
        <div className="r402-datebox"><div><h3>{current.type==='group'?'Ortak sınıf başlangıcı':'Birebir eğitim başlangıcı'}</h3><p>Türkiye saatiyle bugün ve en fazla bir takvim ayı sonrası seçilebilir. Önce tarih önerin, ardından mutabakatı kaydedin.</p></div><div><DateFields value={draftDates[current.key]??proposal(current)} disabled={!classOpen(current)||!!busy} onChange={v=>setDraftDates(prev=>({...prev,[current.key]:v}))}/><div className="r402-dateactions"><button type="button" className="r402-secondary" disabled={!classOpen(current)||!!busy} onClick={()=>{setProposedDates(prev=>({...prev,[current.key]:draftDates[current.key]||proposal(current)||todayTR()}));setMessage('Önerilen başlangıç tarihi seçildi.');}}>Tarihi öner</button><button type="button" className="r402-primary" disabled={!classOpen(current)||!!busy||ambiguous(current)||!current.people.length||!datesAllowed().includes(proposal(current))||!current.people.every(p=>p.contactStatus==='AGREED'&&!!p.agreedStartAt&&Date.parse(p.agreedStartAt)===Date.parse(proposal(current)+'T00:00:00+03:00'))} onClick={()=>setConfirmAction('schedule')}>Başlangıcı kaydet</button></div></div></div>
        <div className="ta4-students-head"><h3>{current.type==='group'?'Sınıf öğrencileri':'Öğrenci ve veli bilgileri'}</h3><span>{current.people.filter(p=>p.contactStatus==='AGREED'&&istanbulDate(p.agreedStartAt)===proposal(current)).length}/{current.people.length} mutabakat sağlandı</span></div>
        <div className="r402-students">{current.people.map((p,i)=>{const id=memberId(current,p)||'',name=p.studentName||'Öğrenci',locked=!classOpen(current)||!!busy||!id;return <article className="r402-studentcard" key={`${current.key}:${p.targetId||id||i}`}><div className="r402-studenttop"><AssignmentAvatar src={pictureUrl(p.photoUrl)||''} name={name}/><div className="r402-grow"><h3>{name}</h3><p>{p.stage?tr(p.stage,stages):''}{p.grade?` · ${p.grade}. sınıf`:''}{p.school?` · ${p.school}`:''}</p></div><span className="ta4-pill info">{({PENDING:'Görüşme bekliyor',UNREACHABLE:'Telefonla ulaşılamadı',CONTACTED:'Görüşüldü',AGREED:'Mutabakat sağlandı'} as Record<string,string>)[p.contactStatus||'PENDING']}</span></div><div className="r402-studentbody"><div><h4>{p.contact?.kind==='GUARDIAN'?'Veli iletişim bilgileri':'Öğrenci iletişim bilgileri'}</h4><b>{p.contact?.name||'Belirtilmedi'}</b><p>Telefon: {p.contact?.phone||'Belirtilmedi'}</p><p>E-posta: {p.contact?.email||'Belirtilmedi'}</p></div><div><h4>Görüşme durumu</h4><div className="r402-contactchoices"><button className="r402-secondary" aria-pressed={p.contactStatus==='UNREACHABLE'} disabled={locked} onClick={()=>void classAction(current,'contact',p,'UNREACHABLE')}>Telefonla ulaşamadım</button><button className="r402-secondary" aria-pressed={['CONTACTED','AGREED'].includes(p.contactStatus||'')} disabled={locked} onClick={()=>void classAction(current,'contact',p,'CONTACTED')}>Görüşüldü</button></div><ContactActions person={p} teacher={user.name} training={current.title} active={!disabledStatus(current.status)}/></div><div><h4>Tarih mutabakatı</h4><b>{proposal(current)||'Belirlenmedi'}</b><label className="r402-agreement"><input type="checkbox" checked={p.contactStatus==='AGREED'&&!!p.agreedStartAt&&Date.parse(p.agreedStartAt)===Date.parse(proposal(current)+'T00:00:00+03:00')} disabled={locked||!datesAllowed().includes(proposal(current))||!['CONTACTED','AGREED'].includes(p.contactStatus||'')} onChange={e=>void classAction(current,'contact',p,e.target.checked?'AGREED':'CONTACTED')}/>{p.contact?.kind==='GUARDIAN'?'Veli':'Öğrenci'} ile eğitim başlangıç tarihi konusunda mutabık kalındı.</label><p>Mutabakat yalnız önerilen tarih için geçerlidir.</p></div></div></article>})}</div>
        {confirmAction&&<AssignmentModalR401 title={confirmAction==='schedule'?'Eğitim başlangıcını onayla':'Eğitimi tamamla'} busy={!!busy} onClose={()=>setConfirmAction(null)}><p>{confirmAction==='schedule'?`${proposal(current)} tarihinde eğitim başlangıcı kaydedilecek.`:'Eğitim tamamlanacak ve mevcut hakediş kuralları uygulanacaktır.'}</p><div className="r401-actions"><button type="button" onClick={()=>setConfirmAction(null)}>Vazgeç</button><button type="button" onClick={()=>{const action=confirmAction;setConfirmAction(null);if(action==='schedule')void classAction(current,'schedule');else void finish(current);}}>Onayla</button></div></AssignmentModalR401>}
        <footer className="ta4-finish"><div><strong>{done(current.status)?'✓ Eğitim tamamlandı':'Eğitimi tamamlama'}</strong><p>{done(current.status)?'Bu eğitim sistemde tamamlandı.':!current.followup?'Takip bilgisi alınamadı.':current.people.length===0?'Henüz öğrenci atanmadı.':planned(current)!==current.people.length?`Tüm öğrencileri planlayın (${planned(current)}/${current.people.length}).`:current.followup.eligibility.ready?'Bütün öğrenciler planlandı ve 21 gün geçti. Eğitim tamamlanabilir.':`21 gün kuralı • ${current.followup.eligibility.daysLeft??21} gün kaldı.`}</p></div>
          {done(current.status)?<span className="ta4-pill done">Tamamlandı</span>:<button className="ta4-btn finish" type="button" disabled={!canComplete(current)||!!busy} onClick={()=>setConfirmAction('finish')}>{canComplete(current)?'Eğitim Tamamlandı':'Eğitim Tamamlandı'}</button>}
        </footer>
      </section>}
      <div className="fixoku-assignments-refresh-bottom-020t"><button type="button" className="ta4-refresh" onClick={()=>void load()} disabled={loading||!!busy}>↻ Yenile</button></div>
    </main>
  </PanelShell>;
}
