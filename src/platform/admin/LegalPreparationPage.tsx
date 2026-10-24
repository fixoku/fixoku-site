import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import "./admin-panel.css";
import "./legal-owner-documents-v3.css";
import "./legal-020c-editor.css";
import legalDocumentsV02 from "./legal-owner-documents-v3-customer.json";
import legalDocumentsV10 from "./legal-owner-documents-v10-customer.json";
import { legalDocumentRequirements, legalWorkflowStates, vatApprovalRows } from "./owner-legal-approval-config";
import { CUSTOMER_LEGAL_DOCUMENT_INTEGRATION, INTERNAL_LEGAL_DOCUMENT_INTEGRATION } from "./legal-document-integration-v10";

type IconName = "file" | "check" | "alert" | "shield" | "search" | "print" | "book" | "shopping" | "graduation" | "lock" | "info" | "arrow" | "mail" | "layers";
type LegalDoc = (typeof legalDocumentsV02)[number] & {
  publicationStatus?: string;
  requiredEvidence?: string[];
  dynamicFields?: string[];
  changeSummary?: string;
  derivedFromVersion?: string;
  contentSha256?: string;
  databaseId?: string;
  documentKey?: string;
  sourceDocumentId?: number;
  versionNumber?: number;
  status?: "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
  scope?: "CUSTOMER" | "INTERNAL";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  decisions?: Array<{ decisionType: string; actorUserId: string; actorDisplayName?: string; decisionNote: string; evidenceReference?: string | null; createdAt: string }>;
  events?: Array<{ id: string; previousStatus?: string | null; nextStatus: string; actorUserId: string; actorDisplayName?: string; eventNote: string; correlationId: string; createdAt: string }>;
  auditRecords?: Array<{ id: string; action: string; result: string; actorUserId: string; actorDisplayName?: string; correlationId: string; createdAt: string }>;
};
const categories = ["Tümü", "Kurum bilgileri", "Hesap ve üyelik", "Satın alma", "Satış sonrası", "Eğitim hizmetleri", "Kişisel veriler", "Pazarlama ve izin", "İç yönetim"] as const;
const operationalChecks = [
  { label: "Satıcı kimliği ve ticari kaynak", state: "SOURCE_CONFIRMED", note: "Mavi Yeşil Ajans · Ersin USTA · Ege Vergi Dairesi · 171925 · FIXOKU 2023 118161" },
  { label: "Vergi levhası kaynağı", state: "SOURCE_SUPPLIED", note: "İşletme tarafından daha önce sağlanan kaynak esas alınır; hassas tanımlayıcılar kamuya açılmaz." },
  { label: "KEP adresi", state: "NOT_OBTAINED", note: "KEP alınmadı; ETBİS kaydı için tek operasyonel takip maddesi." },
  { label: "ETBİS kaydı", state: "PENDING_KEP", note: "KEP tamamlandığında resmî yayın kontrolünde ayrıca değerlendirilir." },
  { label: "16 müşteri belgesinin yerel entegrasyonu", state: "SOURCE_PASS", note: "Her belge için kamu rotası veya ilgili kayıt, izin, destek ve checkout yüzeyi tanımlı." },
  { label: "5 iç belgenin erişimi", state: "OWNER_ONLY", note: "Route yok; yalnız Owner API ve /panel/owner/yasal-hazirlik kütüphanesi." },
  { label: "Production satış açılışı", state: "BLOCKED_P0", note: "PayTR canlı geçişi, ETBİS/KEP ve resmî yayın kararı ayrı kapıda tutulur." },
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

function latestServerDocuments(rows: LegalDoc[]) {
  const latest = new Map<number, LegalDoc>();
  for (const row of rows) {
    const sourceId = Number(row.sourceDocumentId);
    if (!Number.isInteger(sourceId)) continue;
    const previous = latest.get(sourceId);
    if (!previous || Number(row.versionNumber || 0) > Number(previous.versionNumber || 0)) latest.set(sourceId, row);
  }
  return [...latest.values()].map((row) => {
    const source = (legalDocumentsV10 as LegalDoc[]).find((document) => document.id === Number(row.sourceDocumentId));
    return { ...source, ...row, id: Number(row.sourceDocumentId), databaseId: row.id || row.databaseId, internal: row.scope === "INTERNAL", originalSha256: row.contentSha256 || source?.originalSha256 } as LegalDoc;
  }).sort((left, right) => left.id - right.id);
}

function displayVersion(document: LegalDoc) {
  if (document.scope === "CUSTOMER" && Number(document.versionNumber) === 10) return "1.0";
  if (document.scope === "INTERNAL" && Number(document.versionNumber) === 2) return "0.2";
  return String(document.versionNumber || "1.0");
}

const internalPlaceholders: LegalDoc[] = INTERNAL_LEGAL_DOCUMENT_INTEGRATION.map((integration) => ({
  id: integration.id,
  title: `İç belge ${String(integration.id).padStart(2, "0")}`,
  category: "İç yönetim",
  placement: "Owner paneli · yetkili API",
  internal: true,
  markdown: "Bu belgenin içeriği yalnızca yetkili Owner oturumunda yüklenir.",
  sourceVersion: "0.2",
  sourceDate: "2026-10-19",
  originalSha256: "",
} as LegalDoc));

export function LegalPreparationPage() {
  const [tab,setTab] = useState<"documents"|"placements"|"checks"|"approval"|"diff">("documents");
  const [release,setRelease] = useState<"v10"|"v02">("v10");
  const [category,setCategory] = useState<string>("Tümü");
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState(1);
  const [showInternal,setShowInternal] = useState(false);
  const [docs,setDocs]=useState<LegalDoc[]>(legalDocumentsV02 as LegalDoc[]);
  const [privateInternalDocs,setPrivateInternalDocs]=useState<LegalDoc[]>([]);
  const [editorOpen,setEditorOpen]=useState(false);
  const [editorText,setEditorText]=useState("");
  const [editorBusy,setEditorBusy]=useState(false);
  const [editorMessage,setEditorMessage]=useState("");
  const [serverDocs,setServerDocs]=useState<LegalDoc[]>([]);
  const [serverApprovalMessage,setServerApprovalMessage]=useState("");
  const [approvalBusy,setApprovalBusy]=useState(false);
  const [approvalNote,setApprovalNote]=useState("");
  const [approvalEvidence,setApprovalEvidence]=useState("");
  const [legalReviewerName,setLegalReviewerName]=useState("");
  const [legalReviewedAt,setLegalReviewedAt]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/admin/owner-legal-editor",{credentials:"same-origin",cache:"no-store"})
      .then(async r=>{if(!r.ok)throw Error("Belgeler sunucudan yüklenemedi.");return r.json();})
      .then(data=>{if(active&&Array.isArray(data.documents)){const documents=data.documents as LegalDoc[];setDocs(documents);setPrivateInternalDocs(documents.filter((document)=>document.internal));}})
      .catch(()=>{if(active)setEditorMessage("Yerel düzenleme servisi kullanılamıyor. Kaydetmeden önce bağlantıyı kontrol edin.");});
    return ()=>{active=false;};
  },[]);

  const loadServerApproval = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/owner-legal-approval", { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(payload.error || "SERVER_APPROVAL_UNAVAILABLE");
      setServerDocs(latestServerDocuments(Array.isArray(payload.documents) ? payload.documents as LegalDoc[] : []));
      setServerApprovalMessage(payload.publication === "BLOCKED_P0" ? "DB onayı kullanılabilir; yayın kapısı BLOCKED_P0 olarak kalır." : "");
    } catch (error) {
      setServerDocs([]);
      setServerApprovalMessage(error instanceof Error && error.message === "LEGAL_APPROVAL_MIGRATION_REQUIRED" ? "0041 migration uygulanmadı. Server-side Owner onayı bu yerel ortamda henüz yazılamaz." : "Server-side Owner onay servisi kullanılamıyor.");
    }
  }, []);

  useEffect(() => { void loadServerApproval(); }, [loadServerApproval]);

  const runApprovalAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setApprovalBusy(true);
    setServerApprovalMessage("");
    try {
      const response = await fetch("/api/admin/owner-legal-approval", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(result.error || "OWNER_LEGAL_ACTION_FAILED");
      setApprovalNote("");
      setApprovalEvidence("");
      await loadServerApproval();
      return result;
    } catch (error) {
      setServerApprovalMessage(error instanceof Error ? error.message : "OWNER_LEGAL_ACTION_FAILED");
      return null;
    } finally { setApprovalBusy(false); }
  };

  const activeDocs = release === "v10" ? (serverDocs.length ? serverDocs : [...(legalDocumentsV10 as LegalDoc[]), ...(privateInternalDocs.length ? privateInternalDocs : internalPlaceholders)]) : docs;
  const visible = useMemo(() => activeDocs.filter(d => (showInternal || !d.internal) && (category === "Tümü" || d.category === category) && (!query.trim() || `${d.title} ${d.category} ${d.placement}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR").trim()))),[category,query,showInternal,activeDocs]);
  const current = activeDocs.find(d => d.id === selected) || activeDocs[0];
  useEffect(()=>{setEditorText(current?.markdown||"");setEditorOpen(false);setEditorMessage("");},[selected,current?.markdown,release]);
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

  const openDocument = (id: number) => {setSelected(id);setTab("documents");setCategory("Tümü");setQuery("");if (activeDocs.find(d=>d.id===id)?.internal) setShowInternal(true);};
  return <main className="platform-foundation-panel admin-panel legal-document-center-v3">
     <header className="legal-v3-header"><div><span className="legal-v3-eyebrow">SİSTEM / HUKUKİ BELGELER</span><h1>Yasal ve Uyumluluk</h1><p>Fixoku'nun sözleşmelerini, bilgilendirmelerini ve hangi ekranda kullanılacaklarını tek merkezden inceleyin.</p></div><div className="legal-v3-header-actions"><a className="legal-v3-btn secondary" href={release === "v10" ? "/api/admin/owner-legal-v10-package" : "/api/admin/owner-legal-review-package"} download={release === "v10" ? "fixoku-r73-v10-owner-preview.md" : "fixoku-owner-legal-review-package.md"}><Icon name="file"/> {release === "v10" ? "V1.0 önizlemeyi indir" : "V0.2 paketi indir"}</a><button type="button" className="legal-v3-btn secondary" onClick={()=>window.print()}><Icon name="print"/> Seçili belgeyi yazdır</button></div></header>
    <div className="legal-v3-summary">
      <article><span className="legal-v3-kpi-icon violet"><Icon name="file"/></span><div><small>Belge kütüphanesi</small><strong>21</strong><p>16 kullanıcı metni, 5 iç kontrol belgesi</p></div></article>
      <article><span className="legal-v3-kpi-icon mint"><Icon name="check"/></span><div><small>Belge içeriği</small><strong>USER_CONFIRMED</strong><p>21 kabul edilmiş kaynak · V1.0 müşteri metinleri</p></div></article>
      <article><span className="legal-v3-kpi-icon amber"><Icon name="alert"/></span><div><small>İşletme işlemleri</small><strong>KEP / ETBİS</strong><p>KEP alınmadı · ETBİS KEP bekliyor</p></div></article>
      <article><span className="legal-v3-kpi-icon blue"><Icon name="lock"/></span><div><small>Production satış</small><strong>BLOCKED_P0</strong><p>Yerel entegrasyon hazır; canlı açılış ayrı yayın kontrolünde</p></div></article>
    </div>
     <div className="legal-v3-banner"><span><Icon name="info"/></span><p><strong>Belge içeriği kabul edildi ve yerel entegrasyon kaydı ayrıdır.</strong> 16 CUSTOMER belgesi sayfalara, kayıt ve checkout yüzeylerine bağlanır; 5 INTERNAL belge yalnız Owner alanında tutulur. KEP/ETBİS ve gerçek Production satış açılışı ayrı operasyonel yayın kontrolünde kalır.</p></div>
     <div className="legal-v3-tabs" role="tablist" aria-label="Hukuki belgeler bölümleri"><button type="button" role="tab" aria-selected={tab==="documents"} className={tab==="documents"?"active":""} onClick={()=>setTab("documents")}><Icon name="book"/> Belge kütüphanesi <span>21</span></button><button type="button" role="tab" aria-selected={tab==="placements"} className={tab==="placements"?"active":""} onClick={()=>setTab("placements")}><Icon name="layers"/> Kullanılacağı ekranlar</button><button type="button" role="tab" aria-selected={tab==="checks"} className={tab==="checks"?"active":""} onClick={()=>setTab("checks")}><Icon name="shield"/> Yayın öncesi kontrol <span>7</span></button><button type="button" role="tab" aria-selected={tab==="diff"} className={tab==="diff"?"active":""} onClick={()=>setTab("diff")}><Icon name="layers"/> V0.2 → V1.0 farkları</button><button type="button" role="tab" aria-selected={tab==="approval"} className={tab==="approval"?"active":""} onClick={()=>setTab("approval")}><Icon name="lock"/> Onay ve KDV hazırlığı <span>BLOCKED</span></button></div>
     <div className="legal-v3-toolbar" role="group" aria-label="Belge sürümü"><strong>Görünüm:</strong><button type="button" className={release === "v10" ? "active" : ""} onClick={()=>{setRelease("v10");setSelected(1);setShowInternal(false);}}>V1.0 kabul edilmiş içerik</button><button type="button" className={release === "v02" ? "active" : ""} onClick={()=>{setRelease("v02");setSelected(1);}}>V0.2 tarihçe</button><span>{release === "v10" ? "16 müşteri metni temizlendi · 5 iç belge INTERNAL_ONLY · 16 CUSTOMER yerel entegrasyon · Production yayın BLOCKED_P0" : "Önceki kaynak paketi · yalnız tarihçe"}</span></div>
    {tab==="documents" && <section className="legal-v3-workspace" aria-label="Hukuki belge kütüphanesi">
       <aside className="legal-v3-nav"><div className="legal-v3-navtitle"><strong>Belgeler</strong><small>{release === "v10" ? "Önizleme sürümü: V1.0 · 20.10.2026" : "Kaynak sürüm: V0.2 · 19.10.2026"}</small></div><label className="legal-v3-search"><Icon name="search"/><input aria-label="Belge ara" placeholder="Belge adı veya kullanım alanı ara" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Belge kategorisi" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><label className="legal-v3-toggle"><input type="checkbox" checked={showInternal} onChange={e=>setShowInternal(e.target.checked)}/> İç yönetim belgelerini de göster</label><div className="legal-v3-doclist">{visible.map(d=><button type="button" key={d.id} className={selected===d.id?"selected":""} onClick={()=>setSelected(d.id)}><span className="legal-v3-docnum">{String(d.id).padStart(2,"0")}</span><span><strong>{d.title}</strong><small>{d.category}</small></span><Icon name="arrow"/></button>)}{!visible.length && <p className="legal-v3-empty">Aramayla eşleşen belge bulunamadı.</p>}</div><div className="legal-v3-navfoot">{visible.length} belge gösteriliyor · {release === "v10" ? "V1.0 Owner önizlemesi · yayın kapısı BLOCKED_P0" : "V0.2 kaynak inceleme paketi · yayınlanmamış"}</div></aside>
       <article className="legal-v3-reading"><div className="legal-v3-readinghead"><span className="legal-v3-eyebrow">BELGE {String(current.id).padStart(2,"0")} / 21 · {current.category.toLocaleUpperCase("tr-TR")}</span><h2>{current.title}</h2><p><strong>Kullanım alanı:</strong> {current.placement}</p><div className="legal-v3-labels">{release === "v10" ? <><span>İçerik: USER_CONFIRMED</span><span>Entegrasyon: {current.internal ? "OWNER_ONLY" : "LOCAL_SITE_INTEGRATED"}</span><span>Production yayın: BLOCKED_P0</span></> : <><span>Taslak</span><span>İnceleme bekliyor</span><span>Owner onayı kapalı</span></>}{current.internal&&<span>Yalnız iç yönetim</span>}</div></div><div className="legal-v3-source-note"><Icon name="info"/><span>{release === "v10" ? "Bu belge işletme tarafından kabul edilen V1.0 kaynak metnidir. Sistem entegrasyonu ve gerçek Owner işlem kaydı ayrı gösterilir; KEP/ETBİS beklemesi müşteri içeriğini taslak durumuna düşürmez." : "Kaynak belge 19.10.2026 tarihli V0.2 inceleme taslağıdır. İçindeki eski onay durumu satırları aynen korunmuştur; aşağıdaki metin imzalanmış veya yayımlanmış belge anlamına gelmez."}</span></div><div className="legal-v3-workflow-strip" aria-label="Belge onay durumu">{legalWorkflowStates.map((state,index)=><div key={state.key} className={index===0?"is-current":"is-locked"}><span>{index+1}</span><strong>{state.label}</strong><small>{release === "v10" ? (index === 0 ? "V1.0 hazırlık" : "DB/kanıt gerekli") : (index===0?"Mevcut kaynak durumu":"DB onayı gerekli")}</small></div>)}</div><div className="legal-v3-requirements"><strong>{release === "v10" ? "Bu belge için zorunlu kanıtlar" : "Bu belge için bekleyen alanlar"}</strong><ul>{(release === "v10" ? (current.requiredEvidence || []) : (legalDocumentRequirements[current.id] || ["Kaynak metin ve kanıtlar Owner incelemesi bekliyor"])).map(item=><li key={item}>{item}</li>)}</ul></div>{release === "v02" && <div className="legal020c-toolbar"><button type="button" onClick={()=>{setEditorOpen(!editorOpen);setEditorText(current.markdown);}}>{editorOpen?"Düzenlemeyi kapat":"Belgeyi Düzenle"}</button><small>Değişiklikler yalnızca yerel sürümlü dosyaya kaydedilir. Server-side Owner onayı ve yayın bağlantısı migration uygulanana kadar kapalıdır.</small></div>}
       {editorMessage&&<p className="legal020c-feedback" role="status">{editorMessage}</p>}
       {release === "v02" && editorOpen?<div className="legal020c-editor"><label htmlFor="legal020c-textarea">{current.title} metni</label><textarea id="legal020c-textarea" rows={23} spellCheck={false} value={editorText} onChange={e=>setEditorText(e.target.value)}/><div className="legal020c-actions"><button type="button" disabled={editorBusy||editorText===current.markdown} onClick={()=>void saveEditing()}>{editorBusy?"Kaydediliyor...":"Kaydet ve Yeni Sürüm Oluştur"}</button><button type="button" disabled={editorBusy} onClick={()=>{setEditorOpen(false);setEditorText(current.markdown);}}>Vazgeç</button></div></div>:<DocText markdown={current.markdown}/>}<footer className="legal-v3-readingfoot">{release === "v10" ? `V1.0 içerik SHA-256: ${(current.contentSha256 || current.originalSha256).slice(0,16)}… · ${current.publicationStatus || "BLOCKED_P0"}` : `Kaynak SHA-256: ${current.originalSha256.slice(0,16)}… · Belge içeriği yerel kaynak paketten alınmıştır.`}</footer></article>
    </section>}
     {tab==="placements" && <section className="legal-v3-placements"><div className="legal-v3-sectionhead"><h2>Belgeleri nerelerde kullanacağız?</h2><p>Her müşteri belgesi için rota veya kullanım yüzeyi aşağıdaki entegrasyon matrisiyle izlenir. İç belgelerin kamu rotası yoktur.</p></div><div className="legal-v3-placements-grid">{placements.map(p=><article key={p.label}><div className="legal-v3-place-title"><span><Icon name={p.icon}/></span><div><h3>{p.label}</h3><p>{p.note}</p></div></div><div className="legal-v3-place-links">{p.ids.map(id=><button type="button" key={id} onClick={()=>openDocument(id)}><span>{String(id).padStart(2,"0")}</span>{activeDocs.find(d=>d.id===id)?.title}<Icon name="arrow"/></button>)}</div></article>)}</div><div className="legal-v3-integration-matrix" aria-label="16 müşteri belgesi entegrasyon matrisi">{CUSTOMER_LEGAL_DOCUMENT_INTEGRATION.map((integration)=><article key={integration.id}><strong>{String(integration.id).padStart(2,"0")}</strong><span>{activeDocs.find((document)=>document.id===integration.id)?.title}</span><code>{integration.route}</code><small>{integration.surfaces.join(" · ")}</small></article>)}<div className="legal-v3-integration-matrix__internal"><strong>INTERNAL_ONLY (5)</strong><span>{INTERNAL_LEGAL_DOCUMENT_INTEGRATION.map((integration)=>`#${integration.id}`).join(" · ")}</span><small>Rota yok · Owner paneli ve yetkili API ile sınırlı</small></div></div><div className="legal-v3-next"><Icon name="alert"/><p>Siparişe özgü belgeler gerçek checkout verileriyle immutable snapshot ve SHA-256 kaydına bağlanır. Production yayın kapısı ayrı tutulur.</p></div></section>}
    {tab==="checks" && <section className="legal-v3-checks"><div className="legal-v3-sectionhead"><h2>Entegrasyon ve işletme işlemleri</h2><p>Belge içeriği ve yerel bağlantılar hazırdır. KEP/ETBİS ile Production satış açılışı ayrı operasyonel kapılardır.</p></div><div className="legal-v3-checkgrid">{operationalChecks.map((check,i)=><article key={check.label}><span className="legal-v3-checknum">{String(i+1).padStart(2,"0")}</span><div><strong>{check.label}</strong><small>{check.note}</small></div><span className="legal-v3-wait">{check.state}</span></article>)}</div><div className="legal-v3-next"><Icon name="shield"/><p>Gerçek Owner işlem kaydı yalnız yetkili oturum, 0041 migration ve izole DB kanıtı mevcut olduğunda yazılır. Bu ekran belge içeriğini yeniden onaylatmaz.</p></div></section>}
     {tab==="diff" && <section className="legal-v3-checks"><div className="legal-v3-sectionhead"><h2>V0.2 → V1.0 farkları</h2><p>V1.0 müşteri metinleri iç yazışma, geliştirme ve eski alan adı notlarından arındırıldı. Zorunlu eksik bilgiler P0 raporunda tutulur; hiçbir metin kendiliğinden yayımlanmaz.</p></div><div className="legal-v3-checkgrid">{(legalDocumentsV10 as LegalDoc[]).filter(document=>!document.internal).map(document=><article key={document.id}><span className="legal-v3-checknum">{String(document.id).padStart(2,"0")}</span><div><strong>{document.title}</strong><small>{document.changeSummary || "V0.2 kaynağından temiz müşteri metni"}</small></div><span className="legal-v3-wait">{document.publicationStatus || "BLOCKED_P0"}</span></article>)}</div><div className="legal-v3-next"><Icon name="info"/><p>5 iç yönetim belgesi V0.2 olarak korunur ve INTERNAL_ONLY durumundadır. Ayrıntılı P0 raporu, Owner onay akışı ve yayın kapıları için R73 paketindeki belgeler kullanılır.</p></div></section>}
     {tab==="approval" && <section className="legal-v3-approval"><div className="legal-v3-sectionhead"><h2>Onay ve KDV hazırlığı</h2><p>Belgeyi tek tek okuyun, gerçek hukuk kanıtını kaydedin ve yalnızca kanıtı tamamlanan belgeyi APPROVED durumuna taşıyın. Yayın kapısı hukuki/vergisel P0 engelleri nedeniyle açık tutulmaz.</p></div><div className="legal-v3-approval-callout"><Icon name="lock"/><div><strong>{serverDocs.length ? "SERVER-SIDE ONAY KAYDI ETKİN" : "SERVER-SIDE ONAY HAZIRLIĞI"}</strong><p>{serverApprovalMessage || "Yerel JSON yalnızca önizlemedir. Gerçek karar, migration uygulanmış DB ve yetkili Owner oturumuyla kaydedilir."}</p></div></div><div className="legal-v3-approval-toolbar"><button type="button" className="legal-v3-btn" disabled={approvalBusy} onClick={()=>void loadServerApproval()}>DB durumunu yenile</button>{!serverDocs.length&&<button type="button" className="legal-v3-btn primary" disabled={approvalBusy} onClick={()=>void runApprovalAction("import_drafts")}>21 V1.0 taslağını DB’ye al</button>}<span>{serverDocs.length ? `${serverDocs.length} sürümlü DB kaydı yüklendi` : "DB kaydı yok veya migration bekleniyor"}</span></div><h3>Seçili belge için Owner kararı</h3><div className="legal-v3-approval-document"><strong>{current.title}</strong><span>{current.internal ? "INTERNAL_ONLY" : "CUSTOMER"} · {current.status || "DRAFT / yerel önizleme"} · V{displayVersion(current)}</span><code>SHA-256: {(current.contentSha256 || current.originalSha256 || "").slice(0,16)}…</code></div>{serverDocs.length > 0 && current.databaseId && <><div className="legal-v3-approval-form"><label>Karar notu<textarea rows={3} value={approvalNote} onChange={event=>setApprovalNote(event.target.value)} placeholder="Gerçek karar gerekçesini yazın."/></label><label>Kanıt referansı<input value={approvalEvidence} onChange={event=>setApprovalEvidence(event.target.value)} placeholder="Hukukçu belge/referans kodu"/></label>{current.status === "REVIEW" && <><label>Hukukçu adı<input value={legalReviewerName} onChange={event=>setLegalReviewerName(event.target.value)} placeholder="Gerçek hukukçu adı"/></label><label>Hukuk inceleme tarihi<input value={legalReviewedAt} onChange={event=>setLegalReviewedAt(event.target.value)} placeholder="2026-10-20"/></label></>}</div><div className="legal-v3-approval-actions">{current.status === "DRAFT"&&<button type="button" className="legal-v3-btn" disabled={approvalBusy||!approvalNote.trim()} onClick={()=>void runApprovalAction("transition_document",{documentVersionId:current.databaseId,nextStatus:"REVIEW",note:approvalNote})}>İncelemeye al</button>}{current.status === "REVIEW"&&<><button type="button" className="legal-v3-btn" disabled={approvalBusy||!approvalNote.trim()||!legalReviewerName.trim()||!legalReviewedAt.trim()||!approvalEvidence.trim()} onClick={()=>void runApprovalAction("record_legal_review",{documentVersionId:current.databaseId,legalReviewerName,reviewedAt:legalReviewedAt,evidenceReference:approvalEvidence,note:approvalNote})}>Hukuk incelemesini kaydet</button><button type="button" className="legal-v3-btn primary" disabled={approvalBusy||!approvalNote.trim()||!approvalEvidence.trim()} onClick={()=>void runApprovalAction("transition_document",{documentVersionId:current.databaseId,nextStatus:"APPROVED",note:approvalNote,evidenceReference:approvalEvidence})}>Owner olarak APPROVED yap</button></>}{current.status === "APPROVED"&&<span className="legal-v3-approval-locked">Owner kararı kaydedildi. Belge içeriği değiştirilemez; PUBLISHED kapısı BLOCKED_P0.</span>}</div><div className="legal-v3-audit-grid"><div><strong>Kararlar</strong>{(current.decisions||[]).map(decision=><p key={`${decision.decisionType}-${decision.createdAt}`}><b>{decision.decisionType}</b> · {decision.actorDisplayName || decision.actorUserId} · {decision.createdAt}<br/><small>{decision.decisionNote}{decision.evidenceReference ? ` · ${decision.evidenceReference}` : ""}</small></p>)}{!current.decisions?.length&&<small>Henüz karar kaydı yok.</small>}</div><div><strong>Durum olayları</strong>{(current.events||[]).map(event=><p key={event.id}><b>{event.previousStatus || "—"} → {event.nextStatus}</b> · {event.actorDisplayName || event.actorUserId}<br/><small>{event.eventNote} · {event.createdAt}</small></p>)}{!current.events?.length&&<small>Henüz durum olayı yok.</small>}</div></div></>}{serverDocs.length === 0 && <div className="legal-v3-next"><Icon name="shield"/><p>Owner paneli yerel V1.0 metnini gösterebilir; migration uygulanmadan import, hukuk incelemesi veya Owner APPROVED kararı yazılamaz. Bu durumda buton yalnızca güvenli DB durumunu yeniler.</p></div>}<h3>Belge state zinciri</h3><div className="legal-v3-state-table">{legalWorkflowStates.map((state,index)=><div key={state.key}><span>{index+1}</span><strong>{state.label}</strong><small>{state.description}</small><em>{state.key === "PUBLISHED" ? "BLOCKED_P0" : index===0?"V1.0 hazırlık":"Kanıt ve Owner işlemi gerekli"}</em></div>)}</div><h3>KDV karar alanları</h3><div className="legal-v3-vat-table"><div className="legal-v3-vat-row legal-v3-vat-head"><strong>Kategori</strong><strong>Kaynak değer</strong><strong>Gerekli kanıt</strong><strong>Durum</strong></div>{vatApprovalRows.map(row=><div className="legal-v3-vat-row" key={row.key}><strong>{row.label}</strong><span>{row.source}</span><small>{row.evidence}</small><em>{row.state}</em></div>)}</div><div className="legal-v3-next"><Icon name="shield"/><p>Vergi levhası, sicil teyidi, hukukçu ve mali müşavir kanıtı tamamlanmadan hiçbir müşteri belgesi PUBLISHED yapılamaz ve hiçbir KDV kararı EFFECTIVE olamaz.</p></div></section>}
  </main>;
}
