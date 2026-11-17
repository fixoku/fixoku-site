import { useEffect, useMemo, useState } from 'react';
import { PanelShell } from '../../panel/layout/PanelShell';
import './trainer-assignments-v4.css';
import { StudentStageAvatar } from '../../admin/AssignmentAvatarR395';

type Contact = { kind: "GUARDIAN" | "STUDENT"; name?: string | null; phone?: string | null; email?: string | null };
type User = { id: string; name: string; email?: string };
type Person = { contact?: Contact; packageTitle?: string | null; targetId?: string; contactStatus?: string | null; agreedStartAt?: string | null; stage?: string; grade?: string | null; school?: string | null;  id?: string; studentUserId?: string; studentName?: string; studentEmail?: string; studentPhone?: string | null; phone?: string | null; photoUrl?: string | null; status?: string };
type Group = { id: string; trainingType?: string; educationStage?: string; mode?: string; status?: string; maxStudents?: number; activeParticipantCount?: number; participants?: Person[] };
type Enrollment = { id: string; programTitle?: string; progressPercent?: number; status?: string };
type Student = { id: string; name?: string; email?: string; phone?: string | null; profilePhotoUrl?: string | null; enrollments?: Enrollment[] };
type Mark = { plannedAt: string };
type Followup = { classNumber?: number | null; marks: Record<string, Mark>; eligibility: { ready: boolean; reason: string; daysLeft: number | null }; status: string; memberIds: string[]; freeReason?: string | null; scheduledStartAt?: string | null };
type Profile = { contact?: Contact; packageTitle?: string | null; targetId?: string; contactStatus?: string | null; agreedStartAt?: string | null; studentUserId?: string; stage?: string; grade?: string | null; school?: string | null;  name?: string; email?: string; phone?: string | null; photoUrl?: string | null };
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
function ProfilePortrait({image,name,stage,index}:{image:string|null;name:string;stage?:string;index:number}) {
  const [failed,setFailed]=useState('');
  return <span className={`ta4-portrait shade-${index%3}`}>{image&&failed!==image?<img src={image} alt={`${name} profil fotoğrafı`} onError={()=>setFailed(image)}/>:<StudentStageAvatar stage={stage}/>}</span>;
}
function ContactActions({person,teacher,training,active,onUnreachable,contactLocked}:{person:Person;teacher:string;training:string;active:boolean;onUnreachable?:(checked:boolean)=>void; contactLocked?:boolean}) {
  const [localUnreachable,setUnreachable]=useState(false);
  const unreachable=onUnreachable?person.contactStatus==='UNREACHABLE':localUnreachable;
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState('');
  const c=person.contact;
  if(!c)return <span>İletişim bilgisi alınamadı.</span>;
  const guardian=c.kind==='GUARDIAN';
  const raw=c.phone||'';
  let digits=raw.replace(/[\s().-]/g,'');
  if(/^05\d{9}$/.test(digits))digits='+90'+digits.slice(1);
  else if(/^5\d{9}$/.test(digits))digits='+90'+digits;
  else if(/^90\d{10}$/.test(digits))digits='+'+digits;
  else if(/^00[1-9]\d{6,14}$/.test(digits))digits='+'+digits.slice(2);
  const valid=/^\+[1-9]\d{6,14}$/.test(digits);
  const email=c.email||'';
  const validEmail=/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email);
  function compose(){
    const name=c?.name|| (guardian?'Veli':'Öğrenci');
    const student=person.studentName||'Öğrenci';
    const label=person.packageTitle||training;
    setMessage(`İyi günler Sayın ${name},\n\nBen FİXOKU Akademi’den ${teacher} Öğretmen. Nasılsınız?\n\n${guardian?student+' adlı öğrencimizin':'Sizin'} ${label} eğitimi hakkında görüşmek üzere sizi aradım ancak ulaşamadım.\n\nEğitim sürecimizi birlikte planlamak ve sizi bilgilendirmek için uygun olduğunuzda görüşmeyi heyecanla bekliyorum.\n\nSaygılarımla,\n${teacher} Öğretmen\nFİXOKU Akademi`);
    setOpen(true);
  }
  return <div style={{display:'grid',gap:6}}>
    <strong>{guardian?'Veli iletişim bilgileri':'Öğrenci iletişim bilgileri'}</strong>
    {guardian&&<span>{c.name||'Veli adı belirtilmedi'}</span>}
    <span>☎ {active&&valid?<a href={'tel:'+digits}>{raw}</a>:raw||'Telefon bilgisi yok'}</span>
    <span>✉ {active&&validEmail?<a href={'mailto:'+email}>{email}</a>:email||'E-posta bilgisi yok'}</span>
    {active&&valid&&<><label><input type="checkbox" checked={unreachable} disabled={contactLocked} onChange={e=>{if(onUnreachable)onUnreachable(e.target.checked);else setUnreachable(e.target.checked);setOpen(false);}}/> Telefonla ulaşamadım</label>
    {unreachable&&<button type="button" className="ta4-btn" onClick={compose}>WhatsApp mesajı hazırla</button>}
    {unreachable&&open&&<div role="dialog" aria-label="WhatsApp mesajı" style={{whiteSpace:'normal',display:'grid',gap:8}}>
      {!person.packageTitle&&<span>Satın alınan paket adı doğrulanamadı; eğitim adı kullanıldı.</span>}
      <label>Mesajı düzenleyiniz<textarea rows={10} style={{width:'100%'}} value={message} onChange={e=>setMessage(e.target.value)}/></label>
      {message.trim()&&<a href={'https://wa.me/'+digits.slice(1)+'?text='+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">WhatsApp’ta aç</a>}
      <button type="button" onClick={()=>setOpen(false)}>Vazgeç</button>
    </div>}</>}
  </div>;
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
  async function load() {
    setLoading(true); setError('');
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
    } catch(e) {setError(getError(e));} finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const assignments=useMemo<Assignment[]>(()=>{
    const profiles=follow?.profilesByAssignment||{};
    const a:Assignment[]=groups.map(g=>{
      const key=`r6-${g.id}`,info=follow?.assignments?.[key];
      const people:Person[]=(profiles[key]||[]).map(p=>({contact:p.contact,packageTitle:p.packageTitle,targetId:p.targetId,contactStatus:p.contactStatus,agreedStartAt:p.agreedStartAt,studentUserId:p.studentUserId,studentName:p.name||'Öğrenci',studentEmail:p.email||'',studentPhone:p.phone||null,photoUrl:p.photoUrl||null,stage:p.stage||g.educationStage,grade:p.grade,school:p.school}));
      const className=String(g.mode).toUpperCase()==='GROUP' && typeof info?.classNumber==='number' && Number.isInteger(info.classNumber) && info.classNumber>0 ? `${user.name} · Sınıf ${info.classNumber}` : undefined;
      return { key, className, type:String(g.mode).toUpperCase()==='GROUP'?'group':'individual',title:tr(g.trainingType,topics),stage:tr(g.educationStage,stages),status:String(g.status||'').toUpperCase(),people,maxStudents:g.maxStudents||5,followup:info };
    });
    for(const s of legacy)for(const e of s.enrollments||[]) {
      const key=`legacy-${e.id}`,info=follow?.assignments?.[key];
      // Some enrolled legacy students are also represented by R6 groups; keep genuine distinct enrollments.
      const profile:Profile=profiles[key]?.[0]||{};
      a.push({key,type:'individual',title:e.programTitle||'Birebir eğitim',stage:'Birebir eğitim',status:String(e.status||'').toUpperCase(),maxStudents:1,followup:info,
        people:profile.targetId?[{contact:profile.contact,packageTitle:profile.packageTitle,targetId:profile.targetId,studentUserId:profile.studentUserId,studentName:profile.name||'Öğrenci',studentEmail:profile.email||'',studentPhone:profile.phone||null,photoUrl:profile.photoUrl||null,stage:profile.stage,grade:profile.grade,school:profile.school}]:[]});
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
  async function togglePlan(a:Assignment,p:Person) {
    const studentId=memberId(a,p);if(!studentId||!a.followup||ambiguous(a))return;
    const old=a.followup.marks?.[studentId];
    if(old&&!window.confirm(`${p.studentName||'Öğrenci'} için planlandı işaretini kaldırmak istiyor musunuz? 21 günlük süre yeniden hesaplanır.`))return;
    setBusy(`${a.key}:${studentId}`);setMessage('');
    try{await post({assignmentKey:a.key,studentId,action:old?'unplan':'plan'});await load();setMessage(old?'Planlandı işareti kaldırıldı.':'Eğitim planlandı olarak işaretlendi.');}
    catch(e){setMessage(getError(e));}finally{setBusy('');}
  }
  const istanbulDate=(value?:string|null)=>value ? new Date(new Date(value).getTime()+3*3600000).toISOString().slice(0,16):'';
  const proposal=(a:Assignment)=>proposedDates[a.key]??istanbulDate(a.followup?.scheduledStartAt);
  const classOpen=(a:Assignment)=>a.type==='group' && ['ASSIGNED','IN_PROGRESS'].includes(a.status) && !!a.followup && (!a.followup.scheduledStartAt || Date.parse(a.followup.scheduledStartAt)>Date.now());
  async function classAction(a:Assignment,action:string,p?:Person,status?:string){
    if(!classOpen(a)||busy||ambiguous(a))return;
    const startAt=proposal(a)?proposal(a)+':00+03:00':'';
    if((action==='schedule'||status==='AGREED')&&(!startAt||Date.parse(startAt)<=Date.now())){setMessage('Türkiye saatine göre gelecekteki başlangıç tarihini seçiniz.');return;}
    if(action==='contact'&&!p?.targetId)return;
    setBusy(a.key);setMessage('');
    try{
      const response=await fetch('/api/admin/r6-training-groups/'+encodeURIComponent(a.key.slice(3)),{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action,participantId:p?.targetId,contactStatus:status,startAt})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'İşlem başarısız.');
      await load();setMessage(action==='schedule'?'Sınıf başlangıç tarihi kaydedildi.':'Görüşme durumu kaydedildi.');
    }catch(e){setMessage(getError(e));}finally{setBusy('');}
  }
  async function finish(a:Assignment) {
    if(!canComplete(a))return;
    if(!window.confirm('Tüm öğrencilerin eğitiminin tamamlandığını onaylıyor musunuz? Bu işlem gerçek eğitim tamamlama ve hakediş sürecini başlatabilir.'))return;
    setBusy(a.key);setMessage('');
    try{await post({assignmentKey:a.key,action:'complete'});await load();setMessage('Eğitim tamamlama isteği işlendi.');}
    catch(e){setMessage(getError(e));}finally{setBusy('');}
  }

  const tabs:{id:Filter,label:string}[]=[{id:'all',label:'Tümü'},{id:'group',label:'Sınıf'},{id:'individual',label:'Birebir'},{id:'completed',label:'Bitenler'}];
  const overall=assignments.length;
  return <PanelShell user={user}>
    <main className="ta4-page">
      
      <section className="ta4-block ta4-assigned" aria-labelledby="ta4-assigned-title">
        <div className="ta4-section-head"><div><h2 id="ta4-assigned-title">Atanan eğitimler</h2></div><span className="ta4-count">{overall} kayıt</span></div>
        <div className="ta4-tools"><div className="ta4-tabs" role="tablist" aria-label="Atama türü">{tabs.map(t=><button type="button" role="tab" aria-selected={filter===t.id} className={filter===t.id?'on':''} key={t.id} onClick={()=>setFilter(t.id)}>{t.label}</button>)}</div><label className="ta4-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Eğitim veya öğrenci ara" aria-label="Eğitim veya öğrenci ara" value={query} onChange={(e: { target: { value: string } })=>setQuery(e.target.value)}/></label></div>
        {loading?<p className="ta4-state" role="status">Atamalar yükleniyor…</p>:error?<p className="ta4-state is-error" role="alert">{error}</p>:visible.length?<div className="ta4-assignment-grid">{visible.map(a=>{
          const count=planned(a),st=trStatus(a.status,count,a.people.length,!!a.followup?.eligibility?.ready);
          return <button type="button" key={a.key} className={`ta4-assignment ${current?.key===a.key?'selected':''}`} aria-pressed={current?.key===a.key} onClick={()=>setSelected(a.key)}>
            <span className="ta4-assignment-top"><span className="ta4-caps">{a.type==='group'?'SINIF EĞİTİMİ':'BİREBİR EĞİTİMİ'}</span><span className={`ta4-pill ${st.tone}`}>{st.label}</span></span>
            <strong className="ta4-lesson" style={{overflowWrap:"anywhere"}}>{a.className||a.title}</strong><span className="ta4-sub">{a.stage}{a.className?` · ${a.title}`:a.type==='group'?' · Sınıf numarası bekleniyor':''}</span>
            <span className="ta4-assignment-bottom"><span>♙ {a.people.length}{a.type==='group'?`/${a.maxStudents}`:''} öğrenci</span><span>{done(a.status)?'Tamamlandı':`${count}/${a.people.length} planlandı`}</span></span>
          </button>;
        })}</div>:<p className="ta4-state">Bu bölümde eğitim bulunamadı.</p>}
      </section>
      {message&&<div role="status" className="ta4-message">{message}</div>}
      {!loading&&!error&&current&&<section className="ta4-block ta4-detail" aria-labelledby="ta4-detail-title">
        <div className="ta4-detail-head"><div className="ta4-detail-id"><span className="ta4-big-icon" aria-hidden="true">{current.type==='group'?'♧':'♙'}</span><div><span className="ta4-overline">{current.type==='group'?'SINIF EĞİTİMİ':'BİREBİR EĞİTİMİ'} · {current.stage}</span><h2 id="ta4-detail-title" style={{overflowWrap:"anywhere"}}>{current.className||current.title}</h2>{current.className&&<span className="ta4-sub">{current.title}</span>}</div></div><span className={`ta4-pill ${trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).tone}`}>{trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).label}</span></div>
        <div className="ta4-divider"/>
        {current.followup?.freeReason && <div className="ta4-message" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}><strong>Ücretsiz atama · 0 ₺</strong><p>{current.followup.freeReason}</p></div>}
        <div className="ta4-students-head"><h3>{current.type==='group'?'Sınıf öğrencileri':'Atanan öğrenci'}</h3><span>{planned(current)}/{current.people.length} eğitim planlandı</span></div>
        {ambiguous(current)&&<p role="status">Öğrenci atama kimlikleri doğrulanamadı. Planlama güvenlik nedeniyle kapalı.</p>}
        {current.type==='group'&&<div style={{display:'grid',gap:8,marginBottom:12}}>
          <strong>Ortak sınıf başlangıcı: {current.followup?.scheduledStartAt?new Date(current.followup.scheduledStartAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Belirlenmedi'}</strong>
          {classOpen(current)&&<><label>Önerilen başlangıç (Türkiye saati) <input type="datetime-local" value={proposal(current)} onChange={e=>setProposedDates(prev=>({...prev,[current.key]:e.target.value}))}/></label>
          <button type="button" className="ta4-btn" disabled={!!busy||ambiguous(current)||!current.people.length||!proposal(current)||!current.people.every(p=>p.contactStatus==='AGREED'&&p.agreedStartAt&&Date.parse(p.agreedStartAt)===Date.parse(proposal(current)+':00+03:00'))} onClick={()=>void classAction(current,'schedule')}>Ortak başlangıç tarihini kaydet</button></>}
        </div>}
        <div className="ta4-students">{current.people.map((p,i)=>{
          const id=memberId(current,p)||'',isPlanned=!!current.followup?.marks?.[id]?.plannedAt;
          const image=pictureUrl(p.photoUrl);
          const displayName=p.studentName||'Öğrenci';
          return <article className={`ta4-student ${isPlanned?'is-planned':''}`} key={`${current.key}:${p.targetId||id||i}`}>
            <div className="ta4-person"><ProfilePortrait image={image} name={displayName} stage={p.stage} index={i}/>
              <div className="ta4-contact"><strong>{displayName}</strong><span>{p.stage?tr(p.stage,stages):"Kademe belirtilmedi"}{p.grade?` · ${p.grade}. sınıf`:""}</span>{p.school&&<span>{p.school}</span>}<ContactActions person={p} teacher={user.name} training={current.title} active={!disabledStatus(current.status)} contactLocked={current.type==='group'&&(!classOpen(current)||!!busy)} onUnreachable={current.type==='group'?(checked)=>{if(classOpen(current))void classAction(current,'contact',p,checked?'UNREACHABLE':'PENDING');}:undefined}/></div></div>
            <div className="ta4-actions">
              
              {current.type==='group'?<div style={{display:'grid',gap:6}}>
                <span>{({PENDING:'Görüşme bekliyor',UNREACHABLE:'Ulaşılamadı',CONTACTED:'Görüşüldü',AGREED:'Mutabakat sağlandı'} as Record<string,string>)[p.contactStatus||'PENDING']||'Görüşme bekliyor'}</span>
                {p.agreedStartAt&&<span>{new Date(p.agreedStartAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</span>}
                {classOpen(current)&&<><button type="button" disabled={!!busy||!id} onClick={()=>void classAction(current,'contact',p,'CONTACTED')}>Görüşüldü</button>
                  <label><input type="checkbox" checked={p.contactStatus==='AGREED'&&!!p.agreedStartAt&&Date.parse(p.agreedStartAt)===Date.parse(proposal(current)+':00+03:00')} disabled={!!busy||!id||!proposal(current)} onChange={e=>void classAction(current,'contact',p,e.target.checked?'AGREED':'CONTACTED')}/>{p.contact?.kind==='GUARDIAN'?'Veli':'Öğrenci'} ile görüşüldü, Eğitime Başlama tarihi konusunda mutabık kalındı.</label></>}
              </div>:done(current.status)?<span className="ta4-pill done">✓ Tamamlandı</span>:<button type="button" className={`ta4-btn ${isPlanned?'planned':'plan'}`} disabled={!id||!!busy||!current.followup||ambiguous(current)||disabledStatus(current.status)} aria-pressed={isPlanned} onClick={()=>void togglePlan(current,p)}>{isPlanned?'✓ Planlandı':'▣ Eğitim Planlandı'}</button>}
            </div>
          </article>;
        })}</div>
        <footer className="ta4-finish"><div><strong>{done(current.status)?'✓ Eğitim tamamlandı':'Eğitimi tamamlama'}</strong><p>{done(current.status)?'Bu eğitim sistemde tamamlandı.':!current.followup?'Takip bilgisi alınamadı.':current.people.length===0?'Henüz öğrenci atanmadı.':planned(current)!==current.people.length?`Tüm öğrencileri planlayın (${planned(current)}/${current.people.length}).`:current.followup.eligibility.ready?'Bütün öğrenciler planlandı ve 21 gün geçti. Eğitim tamamlanabilir.':`21 gün kuralı • ${current.followup.eligibility.daysLeft??21} gün kaldı.`}</p></div>
          {done(current.status)?<span className="ta4-pill done">Tamamlandı</span>:<button className="ta4-btn finish" type="button" disabled={!canComplete(current)||!!busy} onClick={()=>void finish(current)}>{canComplete(current)?'✓ Eğitim Tamamlandı':'♙ Eğitim Tamamlandı'}</button>}
        </footer>
      </section>}
      <div className="fixoku-assignments-refresh-bottom-020t"><button type="button" className="ta4-refresh" onClick={()=>void load()} disabled={loading||!!busy}>↻ Yenile</button></div>
    </main>
  </PanelShell>;
}
