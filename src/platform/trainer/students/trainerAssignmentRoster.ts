/** RELEASE-020A: read-only union of the SAME authorized assignment feeds as Atamalarım. */
export type RosterAssignment = {
  key: string;
  name: string;
  stage: string;
  type: 'GROUP' | 'INDIVIDUAL';
  status: string;
  planned: boolean;
};
export type RosterStudent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  assignments: RosterAssignment[];
};
export type TrainerRoster = {
  students: RosterStudent[];
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  newlyAssignedStudents: number;
  activeTrainings: number;
  completedTrainings: number;
  groupTrainings: number;
  individualTrainings: number;
};
type Loose = Record<string, unknown>;
const labels: Record<string,string> = {PRIMARY:'İlkokul',MIDDLE:'Ortaokul',HIGH:'Lise',ADULT:'Yetişkin',FAST_READING:'Hızlı Okuma',PARAGRAPH:'Paragraf',FAST_READING_AND_PARAGRAPH:'Hızlı Okuma ve Paragraf'};
const label = (value: unknown) => labels[String(value || '').toUpperCase()] || String(value || 'Eğitim').replace(/_/g,' ');
const finished = (status: string) => status === 'COMPLETED';
const closed = (status: string) => ['COMPLETED','ARCHIVED','CANCELLED'].includes(status);
const obj = (x: unknown): Loose => x && typeof x === 'object' && !Array.isArray(x) ? x as Loose : {};
const arr = (x: unknown): Loose[] => Array.isArray(x) ? x.map(obj) : [];
const word = (x: unknown): string => typeof x === 'string' ? x.trim() : '';
const photo = (x: unknown): string | null => {const p=word(x);return /^\/(?!\/)[^\\]*$/.test(p)?p:null;};
/** Local preview labels for known synthetic test accounts; original API data and IDs stay intact. */
function previewStudentIdentity(name: string, email: string, phone: string | null) {
  const localhost = typeof window !== 'undefined' && ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  if (!import.meta.env.DEV || !localhost) return { name, email, phone };
  const examples = [
    { pattern: /^Grup Test Öğrencisi 1$/iu, name: 'Deniz Yılmaz', email: 'deniz.yilmaz@fixoku.com', phone: '0500 000 00 01' },
    { pattern: /^Grup Test Öğrencisi 2$/iu, name: 'Ece Demir', email: 'ece.demir@fixoku.com', phone: '0500 000 00 02' },
    { pattern: /^İlk Atama Test Öğrencisi$/iu, name: 'Mert Kaya', email: 'mert.kaya@fixoku.com', phone: '0500 000 00 03' },
  ];
  const example = examples.find(item => item.pattern.test(name));
  return example ? { name: example.name, email: example.email, phone: example.phone } : { name, email, phone };
}

const get = async (url: string): Promise<Loose> => {
  const res = await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(!res.ok) throw new Error('Öğrenci ve atama kayıtlarına erişilemiyor ('+res.status+').');
  return obj(await res.json());
};
export async function loadTrainerRoster(): Promise<TrainerRoster> {
  const [groupsResponse,legacyResponse,followResponse] = await Promise.all([
    get('/api/admin/r6-training-groups'),get('/api/trainer/students'),get('/api/trainer/assignment-followup'),
  ]);
  const groups=arr(groupsResponse.groups), legacy=arr(legacyResponse.students);
  const follow=obj(followResponse.assignments),profiles=obj(followResponse.profiles);
  const people=new Map<string,RosterStudent>();
  const education=new Map<string,{status:string;type:'GROUP'|'INDIVIDUAL'}>();
  function add(id:string,name:string,email:string,phone:string|null,image:string|null,a:RosterAssignment) {
    if(!id)return;
    let p=people.get(id);
    if(!p){const display=previewStudentIdentity(name,email,phone);p={id,name:display.name||'Öğrenci',email:display.email||'',phone:display.phone,image,assignments:[]};people.set(id,p);}
    else {if(p.name==='Öğrenci'&&name)p.name=name;if(!p.email&&email)p.email=email;if(!p.phone&&phone)p.phone=phone;if(!p.image&&image)p.image=image;}
    if(!p.assignments.some(k=>k.key===a.key))p.assignments.push(a);
  }
  for(const group of groups){
    const id=word(group.id);if(!id)continue;
    const key='r6-'+id, info=obj(follow[key]);
    // Mirror Atamalarım: only the groups that the authenticated trainer is entitled to see.
    if(!follow[key])continue;
    const status=word(group.status).toUpperCase();
    const type: 'GROUP'|'INDIVIDUAL'=word(group.mode).toUpperCase()==='GROUP'?'GROUP':'INDIVIDUAL';
    const members=arr(group.participants);
    const byId=new Map(members.map(m=>[word(m.studentUserId)||word(m.id),m]));
    const memberIds=Array.isArray(info.memberIds) ? info.memberIds.map(word) : members.map(m=>word(m.studentUserId)||word(m.id));
    const marks=obj(info.marks);
    for(const uid of new Set(memberIds.filter(Boolean))){
      const m=obj(byId.get(uid)),pr=obj(profiles[uid]);
      add(uid,word(m.studentName)||word(pr.name),word(m.studentEmail)||word(pr.email),word(m.studentPhone)||word(m.phone)||word(pr.phone)||null,photo(m.photoUrl)||photo(pr.photoUrl),{
        key,name:label(group.trainingType),stage:label(group.educationStage),type,status,planned:Boolean(obj(marks[uid]).plannedAt)
      });
    }
    education.set(key,{status,type});
  }
  for(const st of legacy){
    const studentId=word(st.id);if(!studentId)continue;
    const pr=obj(profiles[studentId]);
    for(const enroll of arr(st.enrollments)){
      const eid=word(enroll.id);if(!eid)continue;
      const key='legacy-'+eid,info=obj(follow[key]);
      const status=word(enroll.status).toUpperCase();
      const assignedId=Array.isArray(info.memberIds)&&info.memberIds.length?word(info.memberIds[0]):studentId;
      const marks=obj(info.marks);
      add(assignedId,word(st.name)||word(pr.name),word(st.email)||word(pr.email),word(st.phone)||word(pr.phone)||null,photo(st.profilePhotoUrl)||photo(pr.photoUrl),{
        key,name:word(enroll.programTitle)||'Birebir eğitim',stage:'Birebir eğitim',type:'INDIVIDUAL',status,planned:Boolean(obj(marks[assignedId]).plannedAt)
      });
      education.set(key,{status,type:'INDIVIDUAL'});
    }
  }
  const students=Array.from(people.values()).sort((a,b)=>a.name.localeCompare(b.name,'tr'));
  return {
    students,totalStudents:students.length,
    activeStudents:students.filter(p=>p.assignments.some(a=>!closed(a.status))).length,
    completedStudents:students.filter(p=>p.assignments.length>0&&p.assignments.every(a=>finished(a.status))).length,
    newlyAssignedStudents:students.filter(p=>p.assignments.some(a=>a.status==='ASSIGNED'||a.status==='DRAFT')).length,
    activeTrainings:[...education.values()].filter(a=>!closed(a.status)).length,
    completedTrainings:[...education.values()].filter(a=>finished(a.status)).length,
    groupTrainings:[...education.values()].filter(a=>a.type==='GROUP'&&!closed(a.status)).length,
    individualTrainings:[...education.values()].filter(a=>a.type==='INDIVIDUAL'&&!closed(a.status)).length,
  };
}
export const rosterStatus=(x: string)=>x==='COMPLETED'?'Tamamlandı':x==='IN_PROGRESS'?'Devam ediyor':x==='ASSIGNED'?'Atandı':x==='DRAFT'?'Planlama':x==='CANCELLED'?'İptal':'Eğitim süreci';
