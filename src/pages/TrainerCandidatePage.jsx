import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import './auth-lifecycle.css';
const fields=[['phone','Telefon (isteğe bağlı)'],['city','Şehir'],['district','İlçe'],['profession','Meslek'],['institution','Kurum'],['educationBackground','Eğitim bilgileri'],['experience','Deneyim'],['specialties','Uzmanlık alanları'],['bio','Kısa açıklama']];
export default function TrainerCandidatePage(){
 const [state,setState]=useState({loading:true,data:null,error:''});const [form,setForm]=useState({});const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{let live=true;fetch('/api/trainer-candidate?action=profile',{credentials:'same-origin',cache:'no-store'}).then(async r=>{const x=await r.json().catch(()=>({}));if(!r.ok)throw Error(r.status===401?'Giriş yapmanız gerekiyor.':'Aday hesabı bulunamadı.');return x;}).then(x=>{if(live){setState({loading:false,data:x,error:''});setForm(x.profile||{});}}).catch(e=>live&&setState({loading:false,data:null,error:e.message}));return()=>{live=false};},[]);
 async function save(e){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/api/trainer-candidate?action=profile',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(form)});const x=await r.json().catch(()=>({}));if(!r.ok)throw Error('Profil kaydedilemedi. Bilgileri kontrol edin.');setState(s=>({...s,data:{...s.data,profileComplete:x.profileComplete}}));setMessage(x.profileComplete?'Profiliniz tamamlandı. Owner değerlendirmesini bekliyorsunuz.':'Bilgileriniz kaydedildi. Eksik alanları tamamlayabilirsiniz.');}catch(e){setMessage(e.message);}finally{setBusy(false)}}
 if(state.loading)return <main className="fixoku-login-page"><p role="status">Aday hesabı yükleniyor…</p></main>;
 if(state.error)return <main className="fixoku-login-page"><section className="fixoku-login-card"><h1>Eğitmen adayı</h1><p>{state.error}</p><Link to="/ogretmen-girisi?returnTo=%2Fpanel%2Fegitmen-aday">Eğitmen girişine git</Link></section></main>;
 const d=state.data;return <main className="fixoku-login-page auth-lifecycle-page"><section className="fixoku-login-card auth-lifecycle-card" style={{maxWidth:660}}><img src="/siyah-logo-fixoku.png" alt="Fixoku" style={{width:180,maxWidth:'100%'}}/><h1>Hoş geldiniz, {d.name}</h1>
 {!d.emailVerified&&<p role="alert">E-posta adresinizi doğrulamanız gerekiyor.</p>}
 {d.emailVerified&&!d.profileComplete&&<p role="status">E-postanız doğrulandı. Lütfen profil bilgilerinizi tamamlayın.</p>}
 {d.profileComplete&&!d.ownerApproved&&<p role="status">Profiliniz tamamlandı. Owner onayı bekleniyor.</p>}
 {d.profileComplete&&d.ownerApproved&&<p role="status">Eğitmen yetkiniz açıldı. <Link to="/panel/egitmen">Eğitmen paneline geçin</Link></p>}
 <form onSubmit={save}>{fields.map(([id,title])=><label key={id}>{title}<input name={id} value={form[id]||''} maxLength={id==='bio'?500:200} onChange={e=>setForm(x=>({...x,[id]:e.target.value}))}/></label>)}<button type="submit" disabled={busy||!d.emailVerified}>{busy?'Kaydediliyor…':'Bilgilerimi kaydet'}</button></form>{message&&<p role="status">{message}</p>}</section></main>;
}
