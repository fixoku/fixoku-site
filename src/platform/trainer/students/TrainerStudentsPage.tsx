import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {PanelShell} from '../../panel/layout/PanelShell';
import {PanelIcon} from '../../panel/components/PanelIcon';
import {TrainerStudentRail} from './TrainerStudentRail';
import {loadTrainerRoster,rosterStatus,type TrainerRoster} from './trainerAssignmentRoster';
import './trainer-students.css';
import './trainer-roster-v20.css';

export type TrainerStudent = { id:string; name:string; email:string; grade:string|null; school:string|null; status:string; linkedAt?:string|null; enrollments?:{id:string;status:string;programTitle:string|null}[] };

const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toLocaleUpperCase('tr-TR')||'').join('')||'Ö';
export function TrainerStudentsPage({user}:{user:{id:string;name:string;email:string}}){
  const [data,setData]=useState<TrainerRoster|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const load=useCallback(async()=>{
    setState('loading');setError('');
    try{const result=await loadTrainerRoster();setData(result);setState('ready');}
    catch(e){setError(e instanceof Error?e.message:'Öğrenciler yüklenemedi.');setState('error');}
  },[]);
  useEffect(()=>{void load();},[load]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('tr');
    return(data?.students||[]).filter(p=>[p.name,p.email,...p.assignments.map(a=>a.name)].join(' ').toLocaleLowerCase('tr').includes(q));
  },[data,query]);
  return <PanelShell user={user}><main className="trainer-students-page roster20">
    {state==='loading'&&<div className="students-state" role="status">Öğrenciler yükleniyor…</div>}
    {state==='error'&&<div className="students-state" role="alert"><h3>Öğrenciler yüklenemedi</h3><p>{error}</p><button type="button" onClick={()=>void load()}>Tekrar dene</button></div>}
    {state==='ready'&&data&&<><div className="students-layout"><div className="students-content">
      <section className="student-stats" aria-label="Öğrenci özeti">
        <div><PanelIcon name="users" size={30}/><span>Aktif Öğrenciler<strong>{data.activeStudents} Öğrenci</strong></span></div>
        <div><PanelIcon name="users" size={30}/><span>Yeni Atanan<strong>{data.newlyAssignedStudents} Öğrenci</strong></span></div>
        <div><PanelIcon name="users" size={30}/><span>Eğitimi Tamamlanan<strong>{data.completedStudents} Öğrenci</strong></span></div>
      </section>
      <section className="student-list-card" aria-labelledby="roster20-title">
        <div className="student-list-head"><div><h3 id="roster20-title">Öğrenci Listesi</h3><p>{data.totalStudents} farklı öğrenci · {data.activeTrainings} devam eden eğitim · {data.completedTrainings} tamamlanan eğitim</p></div>
          <label className="student-search"><PanelIcon name="search" size={18}/><span className="sr-only">Öğrenci ara</span><input type="search" placeholder="Öğrenci veya eğitim ara" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
        {!filtered.length?<div className="students-empty" role="status"><h3>{data.totalStudents?'Aramanızla eşleşen öğrenci yok':'Henüz atanmış öğrenci yok'}</h3><p>{data.totalStudents?'Başka bir isim veya eğitim arayın.':'Owner tarafından öğrenci atandığında burada görünecek.'}</p></div>:
        <div className="roster20-list">{filtered.map(p=>{
          const completed=p.assignments.every(a=>a.status==='COMPLETED');
          const status=completed?'Tamamlandı':p.assignments.some(a=>a.status==='IN_PROGRESS')?'Devam ediyor':'Planlama / Atandı';
          return <article className="roster20-person" key={p.id}>
            <div className="roster20-person-head"><span className="roster20-avatar">{p.image?<img src={p.image} alt=""/>:initials(p.name)}</span><div><strong>{p.name}</strong><span>{p.email||'E-posta bilgisi yok'}</span>{p.phone&&<span>{p.phone}</span>}</div><span className={`roster20-status ${completed?'done':''}`}>{status}</span></div>
            <div className="roster20-courses">{p.assignments.map(a=><div className="roster20-course" key={a.key}><span className="roster20-kind">{a.type==='GROUP'?'Grup':'Birebir'}</span><strong>{a.name}</strong><small>{a.stage} · {rosterStatus(a.status)}{a.planned?' · Planlandı':''}</small></div>)}</div>
          </article>;
        })}</div>}
      </section>
      <div className="roster20-actions"><Link to="/panel/egitmen/atamalarim">Atamalarımı görüntüle →</Link><button type="button" onClick={()=>void load()}>↻ Yenile</button></div>
    </div><TrainerStudentRail/></div><img className="students-bottom-banner" src="/images/teacher-panel/banners/trainer-students-bottom.png" width={2572} height={222} alt="Her öğrenci, doğru yönlendirmeyle daha güçlü bir gelişim yolculuğuna çıkar."/></>}
  </main></PanelShell>;
}
