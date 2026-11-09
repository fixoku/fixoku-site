/* FIXOKU shared WhatsApp and scroll controls. No external dependencies. */
(()=>{
  'use strict';
  if(window.__fxwFloatingMounted) return;
  window.__fxwFloatingMounted=true;
  const cfg=window.FIXOKU_FLOATING_CONFIG||{};
  const subjects=[
    {id:'student',label:'Öğrenciyim / Veliyim',icon:'users',groups:[]},
    {id:'trainer',label:'Eğitmenim',icon:'cap',groups:[
      {label:'Eğitmenlik ve eğitimler',options:['Eğitmen olmak istiyorum','Eğitmen eğitim paketleri']},
      {label:'Eğitmen hesabı ve çalışmalar',options:['Eğitmen paneli ve hesap desteği','Öğrenci ve grup eğitimleri','Hakediş ve ödemeler']}]},
    {id:'institution',label:'Okul / Kurum Başvuruları',icon:'building',groups:[
      {label:'İş birliği',options:['Okul iş birliği','Kurumlara özel eğitimler']},
      {label:'Kurumsal işlemler',options:['Toplu paket satın alma','Kurumsal hesap ve panel desteği']}]},
    {id:'other',label:'Diğer Konular',icon:'help',groups:[
      {label:'Ürün ve siparişler',options:['Kitap ve yazılım ürünleri','Sipariş, ödeme ve fatura','Kargo ve teslimat','İade ve iptal']},
      {label:'Destek',options:['Teknik destek','Diğer talepler']}]}];
  const levels=[{name:'İlkokul',grades:['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf']},{name:'Ortaokul',grades:['5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf']},{name:'Lise',grades:['9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf']},{name:'Yetişkin',grades:[]}];
  const studentTopics=['Öğrenci eğitim paketleri','Öğrenci kaydı ve giriş','Veli hesabı ve öğrenci takibi','Eğitime erişim ve ilerleme','Eğitmen desteği'];
  const paths={users:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1"/>',cap:'<path d="m2 9 10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6m4-2v8"/>',building:'<rect x="4" y="3" width="11" height="18" rx="1"/><path d="M15 9h5v12H2m5-14h2m2 0h1m-5 4h2m2 0h1m-5 4h2m2 0h1"/>',help:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4v1"/><path d="M12 18h.01"/>',whatsapp:'<path d="M20.2 11.8a8.3 8.3 0 0 1-12.6 7.1L3 20l1.2-4.3a8.4 8.4 0 1 1 16-3.9Z"/><path d="M9 8.4c-.6-.6-1 .3-1 1 0 2.5 3 5.4 5.5 5.7.7.1 2-.6 1.5-1.3l-1.5-1-1.1 1c-1.4-.6-2.1-1.4-2.7-2.7l.9-1.1Z"/>'};
  const svg=(name)=>`<span class="fxw-svg" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name]||paths.help}</svg></span>`;
  const esc=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={open:false,section:'',stage:'',level:'',grade:'',group:-1,topic:''};
  const root=document.createElement('div');root.id='fxw-root';
  root.innerHTML=`<section class="fxw-panel" id="fxw-panel" role="dialog" aria-modal="false" aria-label="Fixoku WhatsApp Desteği"><header class="fxw-head"><span class="fxw-head-icon">${svg('whatsapp')}</span><span>Fixoku WhatsApp Desteği</span><button class="fxw-close" type="button" aria-label="Menüyü kapat">×</button></header><div class="fxw-content" id="fxw-content"></div></section><div class="fxw-actions"><button type="button" class="fxw-top" aria-label="Sayfanın başına dön">↑</button><button type="button" class="fxw-launch" aria-expanded="false" aria-controls="fxw-panel">${svg('whatsapp')} <span>WhatsApp</span></button></div>`;
  const content=root.querySelector('#fxw-content');const panel=root.querySelector('#fxw-panel');const launch=root.querySelector('.fxw-launch');const top=root.querySelector('.fxw-top');
  function getPhone(){
    const fromConfig=String(cfg.whatsappNumber||'').replace(/\D/g,'');
    if(fromConfig.length>=10 && fromConfig.length<=15) return fromConfig;
    // Match the FIXOKU site's own official contact link, not the TEKSOY number.
    const el=[...document.querySelectorAll('a[href*="wa.me/"],a[href*="api.whatsapp.com/send"]')].find(a=>!root.contains(a));
    if(!el)return '';
    try{const u=new URL(el.href);return (u.hostname==='wa.me'?u.pathname.slice(1):u.searchParams.get('phone')||'').replace(/\D/g,'');}catch{return '';}
  }
  // FIXOKU_WA_APPROVED_MESSAGES_R4
  const requestPhrases = {
  "Öğrenci eğitim paketleri": "Seçtiğim seviye ve sınıfa uygun eğitim paketlerinizi öğrenmek istiyorum.",
  "Öğrenci kaydı ve giriş": "Öğrenci hesabı oluşturma veya giriş işlemleri hakkında destek almak istiyorum.",
  "Veli hesabı ve öğrenci takibi": "Veli panelinden öğrencimin eğitim sürecini nasıl takip edebileceğimi öğrenmek istiyorum.",
  "Eğitime erişim ve ilerleme": "Eğitimlere erişim ve ilerleme takibi hakkında destek almak istiyorum.",
  "Eğitmen desteği": "Eğitim aldığım eğitmenle ilgili destek almak istiyorum.",
  "Eğitmen olmak istiyorum": "FIXOKU bünyesinde eğitmen olma koşulları ve başvuru süreci hakkında bilgi almak istiyorum.",
  "Eğitmen eğitim paketleri": "Eğitmen eğitim paketlerinin içerikleri ve koşulları hakkında bilgi almak istiyorum.",
  "Eğitmen paneli ve hesap desteği": "Eğitmen paneli ve hesabımla ilgili destek almak istiyorum.",
  "Öğrenci ve grup eğitimleri": "Öğrenci ve grup eğitimlerinin atanması ve yönetimi hakkında bilgi almak istiyorum.",
  "Hakediş ve ödemeler": "Eğitmen hakedişleri ve ödeme süreçleri hakkında bilgi almak istiyorum.",
  "Okul iş birliği": "Okulumuz için FIXOKU ile eğitim iş birliği olanaklarını görüşmek istiyorum.",
  "Kurumlara özel eğitimler": "Kurumumuza yönelik eğitim programları hakkında bilgi almak istiyorum.",
  "Toplu paket satın alma": "Kurumumuz için toplu eğitim paketi satın alma koşullarını öğrenmek istiyorum.",
  "Kurumsal hesap ve panel desteği": "Kurumsal hesap ve panel kullanımı hakkında destek almak istiyorum.",
  "Kitap ve yazılım ürünleri": "Kitap ve yazılım ürünleriniz hakkında bilgi almak istiyorum.",
  "Sipariş, ödeme ve fatura": "Sipariş, ödeme veya fatura işlemleri hakkında destek almak istiyorum.",
  "Kargo ve teslimat": "Kargo ve teslimat süreci hakkında bilgi almak istiyorum.",
  "İade ve iptal": "İade veya iptal işlemleri hakkında bilgi almak istiyorum.",
  "Teknik destek": "FIXOKU web sitesi veya yazılımıyla ilgili teknik destek almak istiyorum.",
  "Diğer talepler": "FIXOKU ile ilgili farklı bir konuda bilgi almak istiyorum."
};
  function msg(s){
    const parts=['Merhaba FIXOKU.','Başvuru türüm: '+s.label];
    if(s.id==='student'){
      parts.push('Okul seviyesi: '+state.level);
      if(state.grade) parts.push('Sınıf: '+state.grade);
    }
    parts.push('Konu: '+state.topic);
    let request = requestPhrases[state.topic] || 'Bilgi almak istiyorum.';
    if(s.id==='student' && state.topic==='Öğrenci eğitim paketleri'){
      request = state.level==='Yetişkin'
        ? 'Yetişkinlere yönelik eğitim programlarınız hakkında bilgi almak istiyorum.'
        : (state.grade ? state.grade.toLocaleLowerCase('tr-TR')+' için uygun eğitim paketleriniz hakkında bilgi almak istiyorum.' : request);
    }
    parts.push(request);
    return parts.join('\n');
  }
  function sendMarkup(s){if(!state.topic)return '';const number=getPhone();return number?`<a class="fxw-send" data-fxw-send="1" href="https://wa.me/${number}?text=${encodeURIComponent(msg(s))}" target="_blank" rel="noopener noreferrer" data-conversion-event="whatsapp_click" data-target-kind="fixoku-floating-whatsapp">WhatsApp ile bilgi sor</a>`:`<p class="fxw-alert">FIXOKU'nun doğrulanmış WhatsApp numarası mevcut iletişim bağlantısında bulunamadı. Numara yapılandırılınca yönlendirme etkinleşecek.</p><button class="fxw-send" disabled>WhatsApp ile bilgi sor</button>`;}
  function row(txt,action,icon,expanded){return `<button type="button" class="fxw-row" data-fxw-action="${esc(action)}" aria-expanded="${!!expanded}">${icon?svg(icon):''}<span class="fxw-grow">${esc(txt)}</span><span class="fxw-arrow">${expanded?'⌄':'›'}</span></button>`;}
  // FIXOKU_WA_INLINE_BUTTON_R4
  function options(xs,s){return xs.map(t=>`<div class="fxw-option-stack"><button type="button" class="fxw-option ${state.topic===t?'is-selected':''}" data-fxw-option="${esc(t)}" aria-pressed="${state.topic===t}"><span class="fxw-grow">${esc(t)}</span><span class="fxw-check">${state.topic===t?'✓':''}</span></button>${state.topic===t?sendMarkup(s):''}</div>`).join('');}
  function render(){
    let html='<h2 class="fxw-title">Hızlı Seçim Menüsü</h2><div class="fxw-menu">';
    for(const s of subjects){
      html+=`<div>${row(s.label,'section:'+s.id,s.icon,state.section===s.id)}`;
      if(state.section===s.id){
        html+='<div class="fxw-sub">';
        if(s.id==='student'){
          html+='<div class="fxw-subtitle">Okul seviyesini seçin</div>';
          for(const l of levels){html+=row(l.name,'level:'+l.name,null,state.level===l.name);if(state.level===l.name){
            if(l.grades.length){html+='<div class="fxw-subtitle">Sınıfınızı seçin</div>';for(const g of l.grades){html+=row(g,'grade:'+g,null,state.grade===g);if(state.grade===g){html+='<div class="fxw-subtitle">Hangi konuda bilgi almak istiyorsunuz?</div>'+options(studentTopics,s);}}}
            else html+='<div class="fxw-subtitle">Hangi konuda bilgi almak istiyorsunuz?</div>'+options(studentTopics,s);
          }}
        } else {
          s.groups.forEach((g,i)=>{html+=row(g.label,'group:'+i,null,state.group===i);if(state.group===i){html+='<div class="fxw-subtitle">Hangi konuda bilgi almak istiyorsunuz?</div>'+options(g.options,s);}});
        }
        html+='</div>';
      }
      html+='</div>';
    }
    content.innerHTML=html+'</div>';
  }
  function handleOpen(){state.open=!state.open;panel.classList.toggle('is-open',state.open);launch.setAttribute('aria-expanded',String(state.open));render();if(state.open)root.querySelector('.fxw-close').focus();}
  function activePath(){
    let path='/';
    try { path=decodeURIComponent(location.pathname||'/').toLowerCase().replace(/\/+$/,'')||'/'; }
    catch { return false; } // fail closed on malformed routes
    // Private areas including nested owner, instructor, student and parent panels.
    if(/(?:^|\/)(?:panel|dashboard|admin|owner|hesabim|hesap|yerel-inceleme)(?:\/|$)/.test(path))return false;
    if(/(?:^|\/)(?:egitmen-panel|ogrenci-panel|veli-panel|ogretmen-panel|kurum-panel)(?:\/|$)/.test(path))return false;
    // Login, registration, verification, invitation, reset and account flows.
    if(/(?:^|\/)(?:giris|giris-yap|login|sign-in|signin|signup|sign-up|register|registration|kayit|kayit-ol|uye-ol|auth|authentication|verify-email|forgot-password|reset-password|sifre|sifremi-unuttum|sifre-sifirla|e-posta-dogrula|eposta-dogrula|hesap-kapatma)(?:\/|$)/.test(path))return false;
    if(/(?:^|\/)(?:ogrenci|egitmen|ogretmen|veli|owner|admin|kurum)-(?:giris|girisi|kayit|kaydi|basvuru|aktivasyon|davet|sifre|panel)(?:\/|$)/.test(path))return false;
    if(/(?:^|\/)(?:egitim-platformu-girisi|admin-davet-kabul|ogretmen-aday-aktivasyon|seniseviim)(?:\/|$)/.test(path))return false;
    return true;
  }
  function refreshVisibility(){const visible=activePath();root.style.display=visible?'':'none';if(!visible&&state.open){state.open=false;panel.classList.remove('is-open');launch.setAttribute('aria-expanded','false');}top.classList.toggle('is-shown',window.scrollY>250);}
  root.addEventListener('click',(e)=>{
    if(e.target.closest('.fxw-launch'))return handleOpen();
    if(e.target.closest('.fxw-close'))return handleOpen();
    if(e.target.closest('.fxw-top'))return window.scrollTo({top:0,behavior:'smooth'});
    const op=e.target.closest('[data-fxw-option]');if(op){state.topic=op.getAttribute('data-fxw-option');return render();}
    const rowEl=e.target.closest('[data-fxw-action]');if(rowEl){
      const [kind,...rest]=rowEl.dataset.fxwAction.split(':');const val=rest.join(':');
      if(kind==='section'){state.section=state.section===val?'':val;state.level='';state.grade='';state.group=-1;state.topic='';}
      else if(kind==='level'){state.level=state.level===val?'':val;state.grade='';state.topic='';}
      else if(kind==='grade'){state.grade=state.grade===val?'':val;state.topic='';}
      else if(kind==='group'){state.group=state.group===Number(val)?-1:Number(val);state.topic='';}
      return render();
    }
    // Native link click: preserve existing site's delegated conversion tracking.
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)handleOpen();});
  function mount(){if(!document.body)return;document.body.append(root);render();refreshVisibility();window.addEventListener('scroll',refreshVisibility,{passive:true});const observe=new MutationObserver(refreshVisibility);observe.observe(document.getElementById('root')||document.body,{subtree:true,childList:true});window.addEventListener('popstate',refreshVisibility);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
