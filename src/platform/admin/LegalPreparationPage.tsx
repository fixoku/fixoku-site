import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./admin-panel.css";
import "./legal-owner-documents-v3.css";
import "./legal-020c-editor.css";
import legalDocuments from "./legal-owner-documents-v3.json";

type IconName = "file" | "check" | "alert" | "shield" | "search" | "print" | "book" | "shopping" | "graduation" | "lock" | "info" | "arrow" | "mail" | "layers";
type LegalDoc = (typeof legalDocuments)[number];
const categories = ["Tümü", "Kurum bilgileri", "Hesap ve üyelik", "Satın alma", "Satış sonrası", "Eğitim hizmetleri", "Kişisel veriler", "Pazarlama ve izin", "İç yönetim"] as const;
const unresolved = [
  "Resmî vergi levhası ve bildirilen 11 haneli numaranın niteliği",
  "Ticari kayıtlar, ETBİS durumu ve marka belgesi",
  "Kesin Sendeo kargo ücreti, teslimat süresi ve iade taşıyıcısı",
  "Paket bazında dijital erişim, cayma ve karma paket kuralları",
  "Çocuk öğrencinin kanuni temsilci doğrulaması",
  "Gerçek veri envanteri, hizmet sağlayıcı ülkeleri ve saklama süreleri",
  "İYS, pazarlama onay delilleri, ret kanalları ve güncel mevzuat kontrolü",
];
const placements = [
  { label: "Üye olma", note: "Üyelik koşulları, KVKK aydınlatması, çocuk öğrenci bilgilendirmesi", ids: [2, 8, 9], icon: "graduation" as IconName },
  { label: "Paket satın alma", note: "Siparişe özgü ön bilgilendirme, mesafeli satış ve cayma koşulları", ids: [3, 4, 5, 6, 7], icon: "shopping" as IconName },
  { label: "Eğitmen başvurusu", note: "Eğitmen veri aydınlatması ve hizmet koşulları", ids: [7, 10], icon: "book" as IconName },
  { label: "Çerez ve ileti izinleri", note: "Çerez tercihleri ve pazarlama için ayrı, isteğe bağlı onay", ids: [12, 13, 14], icon: "shield" as IconName },
  { label: "Site alt bilgisi ve destek", note: "Kurumsal bilgiler, gizlilik, iade, teslimat ve KVKK başvuruları", ids: [1, 5, 6, 8, 11, 15, 16], icon: "mail" as IconName },
];
function Icon({ name }: { name: IconName }) {
  const shapes: Record<IconName, ReactNode> = {
    file: <><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9"/></>,
    alert: <><path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
    shield: <><path d="m12 2 8 3v7c0 5-3 8-8 10-5-2-8-5-8-10V5l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    print: <><path d="M6 8V3h12v5M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 15h12v6H6z"/></>,
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/></>,
    shopping: <><rect x="4" y="8" width="16" height="13" rx="2"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></>,
    graduation: <><path d="m2 9 10-5 10 5-10 5L2 9Zm4 3v4c3 3 9 3 12 0v-4"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
function Inline({ value }: { value: string }) {
  const tokens = value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return <>{tokens.map((token,i) => token.startsWith("**") && token.endsWith("**") ? <strong key={i}>{token.slice(2,-2)}</strong> : token.startsWith("`") && token.endsWith("`") ? <code key={i}>{token.slice(1,-1)}</code> : <span key={i}>{token}</span>)}</>;
}
function DocText({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  return <div className="legal-v3-markdown">{lines.map((line,i) => {
    const value = line.trim();
    if (!value) return null;
    if (value === "---") return <hr key={i}/>;
    if (value.startsWith("### ")) return <h4 key={i}><Inline value={value.slice(4)}/></h4>;
    if (value.startsWith("## ")) return <h3 key={i}><Inline value={value.slice(3)}/></h3>;
    if (value.startsWith("# ")) return <h2 key={i}><Inline value={value.slice(2)}/></h2>;
    if (value.startsWith(">")) return <blockquote key={i}><Inline value={value.replace(/^>\s*/,"")}/></blockquote>;
    if (/^[-*] \[[ xX]\] /.test(value)) return <p key={i} className="legal-v3-checkline"><span className="legal-v3-checkmark">{value.charAt(3).toLowerCase() === "x" ? "✓" : "□"}</span><Inline value={value.slice(6)}/></p>;
    if (/^[-*] /.test(value)) return <p key={i} className="legal-v3-bullet"><span>•</span><Inline value={value.slice(2)}/></p>;
    if (/^\d+[.)] /.test(value)) return <p key={i} className="legal-v3-bullet"><Inline value={value}/></p>;
    if (value.startsWith("|")) return <p key={i} className="legal-v3-tablerow">{value.replace(/\|/g,"  |  ")}</p>;
    return <p key={i}><Inline value={value}/></p>;
  })}</div>;
}

export function LegalPreparationPage() {
  const [tab,setTab] = useState<"documents"|"placements"|"checks">("documents");
  const [category,setCategory] = useState<string>("Tümü");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(1);
  const [showInternal,setShowInternal] = useState(false);
  const [docs,setDocs]=useState<LegalDoc[]>(legalDocuments as LegalDoc[]);
  const [editorOpen,setEditorOpen]=useState(false);
  const [editorText,setEditorText]=useState("");
  const [editorBusy,setEditorBusy]=useState(false);
  const [editorMessage,setEditorMessage]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/admin/owner-legal-editor",{credentials:"same-origin",cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Belgeler sunucudan yüklenemedi.");return r.json();})
      .then(data=>{if(active&&Array.isArray(data.documents))setDocs(data.documents as LegalDoc[]);})
      .catch(()=>{if(active)setEditorMessage("Yerel düzenleme servisi kullanılamıyor. Kaydetmeden önce bağlantıyı kontrol edin.");});
    return ()=>{active=false;};
  },[]);

  const visible = useMemo(() => docs.filter(d => (showInternal || !d.internal) && (category === "Tümü" || d.category === category) && (!query.trim() || `${d.title} ${d.category} ${d.placement}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR").trim()))),[category,query,showInternal,docs]);
  const current = docs.find(d => d.id === selected) || docs[0];
  useEffect(()=>{setEditorText(current?.markdown||"");setEditorOpen(false);setEditorMessage("");},[selected,current?.markdown]);
  const saveEditing=async()=>{
    setEditorBusy(true);setEditorMessage("");
    try{
      const response=await fetch("/api/admin/owner-legal-editor",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({id:current.id,markdown:editorText,expectedSha256:current.originalSha256})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(payload.error||"Belge kaydedilemedi.");
      setDocs(list=>list.map(doc=>doc.id===current.id?payload.document as LegalDoc:doc));
      setEditorOpen(false);setEditorMessage("Yeni sürüm yerel belge kütüphanesine kaydedildi.");
    }catch(error){setEditorMessage(error instanceof Error?error.message:"Kaydetme başarısız.");}
    finally{setEditorBusy(false);}
  };

  const openDocument = (id: number) => {setSelected(id);setTab("documents");setCategory("Tümü");setQuery("");if (docs.find(d=>d.id===id)?.internal) setShowInternal(true);};
  return <main className="platform-foundation-panel admin-panel legal-document-center-v3">
    <header className="legal-v3-header"><div><span className="legal-v3-eyebrow">SİSTEM / HUKUKİ BELGELER</span><h1>Yasal ve Uyumluluk</h1><p>Fixoku'nun sözleşmelerini, bilgilendirmelerini ve hangi ekranda kullanılacaklarını tek merkezden inceleyin.</p></div><button type="button" className="legal-v3-btn secondary" onClick={()=>window.print()}><Icon name="print"/> Seçili belgeyi yazdır</button></header>
    <div className="legal-v3-summary">
      <article><span className="legal-v3-kpi-icon violet"><Icon name="file"/></span><div><small>Belge kütüphanesi</small><strong>21</strong><p>16 kullanıcı metni, 5 iç kontrol belgesi</p></div></article>
      <article><span className="legal-v3-kpi-icon mint"><Icon name="check"/></span><div><small>İşletme değerlendirmesi</small><strong>Onay bildirildi</strong><p>10 Ekim 2026 · Kullanıcı beyanı</p></div></article>
      <article><span className="legal-v3-kpi-icon amber"><Icon name="alert"/></span><div><small>Doğrulama alanları</small><strong>7 başlık</strong><p>Belge ve teknik kontroller bekleniyor</p></div></article>
      <article><span className="legal-v3-kpi-icon blue"><Icon name="lock"/></span><div><small>Yayın ve onay bağlantıları</small><strong>Kapalı</strong><p>Canlı üyelik/satış sistemine bağlanmadı</p></div></article>
    </div>
    <div className="legal-v3-banner"><span><Icon name="info"/></span><p><strong>İşletme onayı ile hukuki yayın onayı farklıdır.</strong> Belgeler işletme incelemesi için kabul edilmiş olsa da vergi kimliği, kargo tarifesi, KVKK envanteri, çocuk temsil süreci ve İYS gibi konular doğrulanmadan canlıya aktarılmaz. Burada yapılan işlem yalnızca yerel Owner inceleme arayüzüdür.</p></div>
    <div className="legal-v3-tabs" role="tablist" aria-label="Hukuki belgeler bölümleri"><button type="button" role="tab" aria-selected={tab==="documents"} className={tab==="documents"?"active":""} onClick={()=>setTab("documents")}><Icon name="book"/> Belge kütüphanesi <span>21</span></button><button type="button" role="tab" aria-selected={tab==="placements"} className={tab==="placements"?"active":""} onClick={()=>setTab("placements")}><Icon name="layers"/> Kullanılacağı ekranlar</button><button type="button" role="tab" aria-selected={tab==="checks"} className={tab==="checks"?"active":""} onClick={()=>setTab("checks")}><Icon name="shield"/> Yayın öncesi kontrol <span>7</span></button></div>
    {tab==="documents" && <section className="legal-v3-workspace" aria-label="Hukuki belge kütüphanesi">
      <aside className="legal-v3-nav"><div className="legal-v3-navtitle"><strong>Belgeler</strong><small>Kaynak sürüm: V0.1 · 10.10.2026</small></div><label className="legal-v3-search"><Icon name="search"/><input aria-label="Belge ara" placeholder="Belge adı veya kullanım alanı ara" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Belge kategorisi" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><label className="legal-v3-toggle"><input type="checkbox" checked={showInternal} onChange={e=>setShowInternal(e.target.checked)}/> İç yönetim belgelerini de göster</label><div className="legal-v3-doclist">{visible.map(d=><button type="button" key={d.id} className={selected===d.id?"selected":""} onClick={()=>setSelected(d.id)}><span className="legal-v3-docnum">{String(d.id).padStart(2,"0")}</span><span><strong>{d.title}</strong><small>{d.category}</small></span><Icon name="arrow"/></button>)}{!visible.length && <p className="legal-v3-empty">Aramayla eşleşen belge bulunamadı.</p>}</div><div className="legal-v3-navfoot">{visible.length} belge gösteriliyor · Metinler düzenlenmemiş kaynak taslaklarından okunuyor</div></aside>
      <article className="legal-v3-reading"><div className="legal-v3-readinghead"><span className="legal-v3-eyebrow">BELGE {String(current.id).padStart(2,"0")} / 21 · {current.category.toLocaleUpperCase("tr-TR")}</span><h2>{current.title}</h2><p><strong>Kullanım alanı:</strong> {current.placement}</p><div className="legal-v3-labels"><span>İşletme onayı bildirildi</span><span>Hukuki/teknik doğrulama bekliyor</span>{current.internal&&<span>Yalnız iç yönetim</span>}</div></div><div className="legal-v3-source-note"><Icon name="info"/><span>Kaynak belge 10.10.2026 tarihli V0.1 taslağıdır. İçindeki eski onay durumu satırları aynen korunmuştur; aşağıdaki metin imzalanmış veya yayımlanmış belge anlamına gelmez.</span></div><div className="legal020c-toolbar"><button type="button" onClick={()=>{setEditorOpen(!editorOpen);setEditorText(current.markdown);}}>{editorOpen?"Düzenlemeyi kapat":"Belgeyi Düzenle"}</button><small>Değişiklikler yalnızca yerel sürümlü dosyaya kaydedilir. Satışa otomatik yayınlanmaz.</small></div>
      {editorMessage&&<p className="legal020c-feedback" role="status">{editorMessage}</p>}
      {editorOpen?<div className="legal020c-editor"><label htmlFor="legal020c-textarea">{current.title} metni</label><textarea id="legal020c-textarea" rows={23} spellCheck={false} value={editorText} onChange={e=>setEditorText(e.target.value)}/><div className="legal020c-actions"><button type="button" disabled={editorBusy||editorText===current.markdown} onClick={()=>void saveEditing()}>{editorBusy?"Kaydediliyor...":"Kaydet ve Yeni Sürüm Oluştur"}</button><button type="button" disabled={editorBusy} onClick={()=>{setEditorOpen(false);setEditorText(current.markdown);}}>Vazgeç</button></div></div>:<DocText markdown={current.markdown}/>}<footer className="legal-v3-readingfoot">Kaynak SHA-256: {current.originalSha256.slice(0,16)}… · Belge içeriği yerel kaynak paketten alınmıştır.</footer></article>
    </section>}
    {tab==="placements" && <section className="legal-v3-placements"><div className="legal-v3-sectionhead"><h2>Belgeleri nerelerde kullanacağız?</h2><p>Bu eşleştirmeler uygulama planıdır. Üyelik, ödeme veya izin ekranlarında henüz canlı onay bağlantısı açılmadı.</p></div><div className="legal-v3-placements-grid">{placements.map(p=><article key={p.label}><div className="legal-v3-place-title"><span><Icon name={p.icon}/></span><div><h3>{p.label}</h3><p>{p.note}</p></div></div><div className="legal-v3-place-links">{p.ids.map(id=><button type="button" key={id} onClick={()=>openDocument(id)}><span>{String(id).padStart(2,"0")}</span>{docs.find(d=>d.id===id)?.title}<Icon name="arrow"/></button>)}</div></article>)}</div><div className="legal-v3-next"><Icon name="alert"/><p>Üye olma ve giriş arayüzünü sonraki çalışmada yeniden tasarlayacağız. Satın alma ön bilgilendirmesi, kullanıcının gerçek sepeti ve sözleşme sürümüyle oluşturulmadan ödeme akışına bağlanmayacak.</p></div></section>}
    {tab==="checks" && <section className="legal-v3-checks"><div className="legal-v3-sectionhead"><h2>Canlı kullanım için tamamlanması gerekenler</h2><p>İşletme onayı verildiği bildirildi. Ancak aşağıdaki maddeler belge ve teknik kanıtla doğrulanmadan “yayına hazır” durumu verilmez.</p></div><div className="legal-v3-checkgrid">{unresolved.map((t,i)=><article key={t}><span className="legal-v3-checknum">{String(i+1).padStart(2,"0")}</span><div><strong>{t}</strong><small>Doğrulama bekleniyor · Bu ekranda onay kaydı üretilmez</small></div><span className="legal-v3-wait">Bekliyor</span></article>)}</div><div className="legal-v3-next"><Icon name="shield"/><p>Bir sonraki aşamada belge sürümü, yetkili onay tutanağı, gerçek siparişe özel metin üretimi ve kanıtlanabilir kullanıcı kabul kayıtları için API/veritabanı tasarımı hazırlanacak. Bu yerel UI sürümü bunları yapmış gibi davranmaz.</p></div></section>}
  </main>;
}
