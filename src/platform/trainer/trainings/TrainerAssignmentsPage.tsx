import { useEffect, useMemo, useState } from 'react';
import { PanelShell } from '../../panel/layout/PanelShell';
import './trainer-assignments-v4.css';

type User = { id: string; name: string; email?: string };
type Person = { id?: string; studentUserId?: string; studentName?: string; studentEmail?: string; studentPhone?: string | null; phone?: string | null; photoUrl?: string | null };
type Group = { id: string; trainingType?: string; educationStage?: string; mode?: string; status?: string; maxStudents?: number; activeParticipantCount?: number; participants?: Person[] };
type Enrollment = { id: string; programTitle?: string; progressPercent?: number; status?: string };
type Student = { id: string; name?: string; email?: string; phone?: string | null; profilePhotoUrl?: string | null; enrollments?: Enrollment[] };
type Mark = { plannedAt: string };
type Followup = { marks: Record<string, Mark>; eligibility: { ready: boolean; reason: string; daysLeft: number | null }; status: string; memberIds: string[] };
type Profile = { name?: string; email?: string; phone?: string | null; photoUrl?: string | null };
type FollowupResponse = { assignments: Record<string, Followup>; profiles: Record<string, Profile>; scope: string; completionDays: number };
type Assignment = { key: string; type: 'group' | 'individual'; title: string; stage: string; status: string; people: Person[]; maxStudents: number; followup?: Followup };
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
const initials = (name: string) => name.trim().split(/\s+/u).slice(0,2).map(s=>s.charAt(0).toLocaleUpperCase('tr-TR')).join('') || 'Ö';
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
  async function load() {
    setLoading(true); setError('');
    try {
      const [a,b,c]=await Promise.all([
        fetch('/api/admin/r6-training-groups',{credentials:'same-origin',cache:'no-store'}),
        fetch('/api/trainer/students',{credentials:'same-origin',cache:'no-store'}),
        fetch('/api/trainer/assignment-followup',{credentials:'same-origin',cache:'no-store'}),
      ]);
      if(!a.ok || !b.ok || !c.ok) throw new Error('Atama ve takip verileri yüklenemedi. Oturumu ve sunucuyu kontrol edin.');
      const [aj,bj,cj]=await Promise.all([a.json(),b.json(),c.json()]);
      setGroups(Array.isArray(aj.groups)?aj.groups:[]);
      setLegacy(Array.isArray(bj.students)?bj.students:[]);
      setFollow(cj as FollowupResponse);
    } catch(e) {setError(getError(e));} finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const assignments=useMemo<Assignment[]>(()=>{
    const profiles=follow?.profiles||{};
    const a:Assignment[]=groups.filter(g=>Boolean(follow?.assignments?.[`r6-${g.id}`])).map(g=>{
      const key=`r6-${g.id}`,info=follow?.assignments?.[key];
      const source=(Array.isArray(g.participants)?g.participants:[]);
      const byId=new Map<string,Person>(); for(const p of source){const id=p.studentUserId||p.id;if(id)byId.set(id,p);}
      const memberIds=info?.memberIds||source.map(p=>p.studentUserId||'').filter(Boolean);
      const people=memberIds.map(id=>{
        const p:Person=byId.get(id)||{}; const profile:Profile=profiles[id]||{};
        return { ...p, studentUserId:id, studentName:p.studentName||profile.name||'Öğrenci', studentEmail:p.studentEmail||profile.email||'', studentPhone:p.studentPhone||p.phone||profile.phone||null, photoUrl:p.photoUrl||profile.photoUrl||null };
      });
      return { key, type:String(g.mode).toUpperCase()==='GROUP'?'group':'individual',title:tr(g.trainingType,topics),stage:tr(g.educationStage,stages),status:String(g.status||'').toUpperCase(),people,maxStudents:g.maxStudents||5,followup:info };
    });
    for(const s of legacy)for(const e of s.enrollments||[]) {
      const key=`legacy-${e.id}`,info=follow?.assignments?.[key];
      // Some enrolled legacy students are also represented by R6 groups; keep genuine distinct enrollments.
      const profile:Profile=profiles[s.id]||{};
      a.push({key,type:'individual',title:e.programTitle||'Birebir eğitim',stage:'Birebir eğitim',status:String(e.status||'').toUpperCase(),maxStudents:1,followup:info,
        people:[{studentUserId:info?.memberIds?.[0]||s.id,studentName:s.name||profile.name||'Öğrenci',studentEmail:s.email||profile.email||'',studentPhone:s.phone||profile.phone||null,photoUrl:s.profilePhotoUrl||profile.photoUrl||null}]});
    }
    return a;
  },[groups,legacy,follow]);

  const visible=useMemo(()=>assignments.filter(a=>{
    if(filter==='completed'&&!done(a.status))return false;
    if(filter==='group'&&(a.type!=='group'||done(a.status)))return false;
    if(filter==='individual'&&(a.type!=='individual'||done(a.status)))return false;
    const haystack=[a.title,a.stage,...a.people.flatMap(p=>[p.studentName||'',p.studentEmail||''])].join(' ').toLocaleLowerCase('tr');
    return haystack.includes(query.toLocaleLowerCase('tr').trim());
  }),[assignments,filter,query]);
  const current=visible.find(a=>a.key===selected)||visible[0];
  const planned=(a:Assignment)=>a.people.filter(p=>!!a.followup?.marks?.[p.studentUserId||'']?.plannedAt).length;
  const canComplete=(a:Assignment)=>a.followup?.eligibility?.ready===true && (a.type==='group' ? ['ASSIGNED','IN_PROGRESS'].includes(a.status): !disabledStatus(a.status));

  async function post(input:Record<string,string>) {
    const response=await fetch('/api/trainer/assignment-followup',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
    const text=await response.text();let data:any={};try{data=JSON.parse(text);}catch{}
    if(!response.ok)throw new Error(({WAIT_21_DAYS:'21 günlük süre henüz dolmadı.',STUDENTS_NOT_ALL_PLANNED:'Önce bütün öğrenciler planlanmalı.',ASSIGNMENT_NOT_ACTIVE:'Bu eğitim artık aktif değil.',NOT_ASSIGNED_TO_TRAINER:'Bu öğrenci size atanmış değil.'} as Record<string,string>)[data.error]||data.error||'İşlem başarısız.');
    return data;
  }
  async function togglePlan(a:Assignment,p:Person) {
    const studentId=p.studentUserId;if(!studentId||!a.followup)return;
    const old=a.followup.marks?.[studentId];
    if(old&&!window.confirm(`${p.studentName||'Öğrenci'} için planlandı işaretini kaldırmak istiyor musunuz? 21 günlük süre yeniden hesaplanır.`))return;
    setBusy(`${a.key}:${studentId}`);setMessage('');
    try{await post({assignmentKey:a.key,studentId,action:old?'unplan':'plan'});await load();setMessage(old?'Planlandı işareti kaldırıldı.':'Eğitim planlandı olarak işaretlendi.');}
    catch(e){setMessage(getError(e));}finally{setBusy('');}
  }
  async function finish(a:Assignment) {
    if(!canComplete(a))return;
    if(!window.confirm('Tüm öğrencilerin eğitiminin tamamlandığını onaylıyor musunuz? Bu işlem gerçek eğitim tamamlama ve hakediş sürecini başlatabilir.'))return;
    setBusy(a.key);setMessage('');
    try{await post({assignmentKey:a.key,action:'complete'});await load();setMessage('Eğitim tamamlama isteği işlendi.');}
    catch(e){setMessage(getError(e));}finally{setBusy('');}
  }

  const tabs:{id:Filter,label:string}[]=[{id:'all',label:'Tümü'},{id:'group',label:'Grup'},{id:'individual',label:'Birebir'},{id:'completed',label:'Bitenler'}];
  const overall=assignments.length;
  return <PanelShell user={user}>
    <main className="ta4-page">
      
      <section className="ta4-block ta4-assigned" aria-labelledby="ta4-assigned-title">
        <div className="ta4-section-head"><div><h2 id="ta4-assigned-title">Atanan eğitimler</h2></div><span className="ta4-count">{overall} kayıt</span></div>
        <div className="ta4-tools"><div className="ta4-tabs" role="tablist" aria-label="Atama türü">{tabs.map(t=><button type="button" role="tab" aria-selected={filter===t.id} className={filter===t.id?'on':''} key={t.id} onClick={()=>setFilter(t.id)}>{t.label}</button>)}</div><label className="ta4-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Eğitim veya öğrenci ara" aria-label="Eğitim veya öğrenci ara" value={query} onChange={(e: { target: { value: string } })=>setQuery(e.target.value)}/></label></div>
        {loading?<p className="ta4-state" role="status">Atamalar yükleniyor…</p>:error?<p className="ta4-state is-error" role="alert">{error}</p>:visible.length?<div className="ta4-assignment-grid">{visible.map(a=>{
          const count=planned(a),st=trStatus(a.status,count,a.people.length,!!a.followup?.eligibility?.ready);
          return <button type="button" key={a.key} className={`ta4-assignment ${current?.key===a.key?'selected':''}`} aria-pressed={current?.key===a.key} onClick={()=>setSelected(a.key)}>
            <span className="ta4-assignment-top"><span className="ta4-caps">{a.type==='group'?'GRUP EĞİTİMİ':'BİREBİR EĞİTİMİ'}</span><span className={`ta4-pill ${st.tone}`}>{st.label}</span></span>
            <strong className="ta4-lesson">{a.title}</strong><span className="ta4-sub">{a.stage}{a.type==='group'?' • Atanan grup':''}</span>
            <span className="ta4-assignment-bottom"><span>♙ {a.people.length}{a.type==='group'?`/${a.maxStudents}`:''} öğrenci</span><span>{done(a.status)?'Tamamlandı':`${count}/${a.people.length} planlandı`}</span></span>
          </button>;
        })}</div>:<p className="ta4-state">Bu bölümde eğitim bulunamadı.</p>}
      </section>
      {message&&<div role="status" className="ta4-message">{message}</div>}
      {!loading&&!error&&current&&<section className="ta4-block ta4-detail" aria-labelledby="ta4-detail-title">
        <div className="ta4-detail-head"><div className="ta4-detail-id"><span className="ta4-big-icon" aria-hidden="true">{current.type==='group'?'♧':'♙'}</span><div><span className="ta4-overline">{current.type==='group'?'GRUP EĞİTİMİ':'BİREBİR EĞİTİMİ'} · {current.stage}</span><h2 id="ta4-detail-title">{current.title}</h2></div></div><span className={`ta4-pill ${trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).tone}`}>{trStatus(current.status,planned(current),current.people.length,!!current.followup?.eligibility?.ready).label}</span></div>
        <div className="ta4-divider"/>
        <div className="ta4-students-head"><h3>{current.type==='group'?'Grup öğrencileri':'Atanan öğrenci'}</h3><span>{planned(current)}/{current.people.length} eğitim planlandı</span></div>
        <div className="ta4-students">{current.people.map((p,i)=>{
          const id=p.studentUserId||'',isPlanned=!!current.followup?.marks?.[id]?.plannedAt;
          const phone=p.studentPhone||p.phone||null,image=pictureUrl(p.photoUrl);
          const displayName=p.studentName||'Öğrenci';
          return <article className={`ta4-student ${isPlanned?'is-planned':''}`} key={`${current.key}:${id||i}`}>
            <div className="ta4-person"><span className={`ta4-portrait shade-${i%3}`}>{image?<img src={image} alt={`${displayName} profil fotoğrafı`} />:<span aria-label="Profil resmi bulunmuyor">{initials(displayName)}</span>}</span>
              <div className="ta4-contact"><strong>{displayName}</strong><span>☎ {phone||'Telefon bilgisi yok'}</span><span>✉ {p.studentEmail||'E-posta bilgisi yok'}</span></div></div>
            <div className="ta4-actions">
              
              {done(current.status)?<span className="ta4-pill done">✓ Tamamlandı</span>:<button type="button" className={`ta4-btn ${isPlanned?'planned':'plan'}`} disabled={!id||!!busy||!current.followup||disabledStatus(current.status)} aria-pressed={isPlanned} onClick={()=>void togglePlan(current,p)}>{isPlanned?'✓ Planlandı':'▣ Eğitim Planlandı'}</button>}
            </div>
          </article>;
        })}</div>
        <footer className="ta4-finish"><div><strong>{done(current.status)?'✓ Eğitim tamamlandı':'Eğitimi tamamlama'}</strong><p>{done(current.status)?'Bu eğitim sistemde tamamlandı.':!current.followup?'Takip bilgisi alınamadı.':current.people.length===0?'Henüz öğrenci atanmadı.':planned(current)!==current.people.length?`Tüm öğrencileri planlayın (${planned(current)}/${current.people.length}).`:current.followup.eligibility.ready?'Bütün öğrenciler planlandı ve 21 gün geçti. Eğitim tamamlanabilir.':`21 gün kuralı • ${current.followup.eligibility.daysLeft??21} gün kaldı.`}</p></div>
          {done(current.status)?<span className="ta4-pill done">Tamamlandı</span>:<button className="ta4-btn finish" type="button" disabled={!canComplete(current)||!!busy} onClick={()=>void finish(current)}>{canComplete(current)?'✓ Eğitim Tamamlandı':'♙ Eğitim Tamamlandı'}</button>}
        </footer>
      </section>}
      <p className="ta4-local-note">Yerel test: Planlama kayıtları bu sunucuda tutulur. Canlı kullanım öncesinde veritabanına taşınmalıdır.</p>
      <div className="fixoku-assignments-refresh-bottom-020t"><button type="button" className="ta4-refresh" onClick={()=>void load()} disabled={loading||!!busy}>↻ Yenile</button></div>
    </main>
  </PanelShell>;
}
