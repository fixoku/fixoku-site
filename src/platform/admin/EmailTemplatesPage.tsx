import { useEffect, useMemo, useState } from "react";
import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_CATALOG, renderEmail } from "../../server/domain/email-renderer.js";
import "./admin-panel.css";
import "./email-templates-owner-ux-v1.css";
import "./email-templates-owner-ux-v2.css";
import "./email-templates-owner-ux-v3.css";
import "./email-templates-owner-ux-v4.css";
import "./email-templates-owner-ux-v5.css";

type Revision = { revisionId?: string; revisionNumber?: number; status?: string; displayName?: string; subject?: string; htmlBody?: string; textBody?: string; variableAllowlist?: string[]; createdAt?: string; publishedAt?: string };
type TemplateRecord = { templateKey: string; displayName: string; category: string; active: boolean; revisionId?: string; revisionNumber?: number; revisionStatus?: string; subject: string; htmlBody: string; textBody: string; variableAllowlist?: string[]; draft?: Revision | null; history?: Revision[] };

function categoryLabel(value: string) {
  const labels: Record<string, string> = { ACCOUNT: "Hesap", COMMERCE: "Ticaret", TRAINER: "Eğitmen", SHIPPING: "Kargo", APPLICATION: "Başvuru", MARKETING: "Pazarlama", SUPPORT: "Destek" };
  return labels[value] || value;
}
function fallbackRecords(): TemplateRecord[] {
  return EMAIL_TEMPLATE_CATALOG.map((template) => ({ templateKey: template.id, displayName: template.title, category: template.category, active: true, revisionNumber: 0, revisionStatus: "STATIC_FALLBACK", subject: template.subject, htmlBody: `<p>${template.body.split(/\n\n/gu).map((part) => part.replace(/[&<>]/gu, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char))).join("</p><p>")}</p>`, textBody: template.body, variableAllowlist: [] }));
}

export function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(EMAIL_TEMPLATE_CATALOG[0].id);
  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [view, setView] = useState<"html" | "text">("html");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  async function loadTemplates() {
    try {
      const response = await fetch("/api/owner/email-templates?history=1", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("EMAIL_TEMPLATE_LIST_FAILED");
      const data = await response.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setVariables(Array.isArray(data.variables) ? data.variables : []);
      setLoadedFromApi(true);
    } catch {
      setTemplates(fallbackRecords());
      setVariables(["recipientName", "packageName", "orderNumber", "amount", "actionUrl", "ctaPath"]);
      setLoadedFromApi(false);
    }
  }
  useEffect(() => { void loadTemplates(); }, []);

  const filtered = useMemo(() => templates.filter((item) => {
    const matchesQuery = !query.trim() || `${item.templateKey} ${item.displayName} ${item.subject}`.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR"));
    return matchesQuery && (category === "ALL" || item.category === category);
  }), [templates, query, category]);
  const selected = templates.find((item) => item.templateKey === selectedId) || templates[0] || null;
  const base: TemplateRecord | null = selected ? (selected.draft ? { ...selected, ...selected.draft, templateKey: selected.templateKey, category: selected.category, active: selected.active, draft: selected.draft, history: selected.history } : selected) : null;
  const form = editing || base;
  const dirty = Boolean(form && selected && (form.subject !== base?.subject || form.displayName !== base?.displayName || form.htmlBody !== base?.htmlBody || form.textBody !== base?.textBody || Boolean(form.active) !== Boolean(selected.active)));
  const rendered = useMemo(() => {
    if (!form) return null;
    const origin = typeof window === "undefined" ? "https://fixoku.com" : window.location.origin;
    return renderEmail(selectedId, { recipientName: "Deniz Yılmaz", reference: "FX-R97E2-PREVIEW", packageName: "Fixoku eğitim paketi", amount: "1.200 TL", actionUrl: "/panel/owner" }, { preview: true, baseUrl: origin, logoUrl: `${origin}/logo-fixoku.png`, templateOverride: { revisionId: form.revisionId, title: form.displayName, subject: form.subject, body: form.textBody, htmlBody: form.htmlBody } });
  }, [form, selectedId]);

  useEffect(() => { if (base) setEditing(base); }, [selectedId, selected?.revisionId, selected?.draft?.revisionId]);
  function updateField(field: keyof TemplateRecord, value: string | boolean) { setEditing((current) => current ? { ...current, [field]: value } : current); setNotice(null); }
  async function mutate(action: "SAVE" | "PUBLISH" | "REVERT", extra: Record<string, unknown> = {}) {
    if (!form || !selected || !loadedFromApi) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/owner/email-templates", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, templateKey: selected.templateKey, expectedRevision: form.revisionNumber || selected.revisionNumber || 0, displayName: form.displayName, subject: form.subject, htmlBody: form.htmlBody, textBody: form.textBody, active: form.active, ...extra }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "EMAIL_TEMPLATE_OPERATION_FAILED");
      setTemplates((current) => current.map((item) => item.templateKey === selected.templateKey ? data.template : item));
      setEditing(data.template?.draft ? { ...data.template, ...data.template.draft, active: data.template.active, templateKey: data.template.templateKey, category: data.template.category, draft: data.template.draft, history: data.template.history } : data.template);
      setNotice({ kind: "success", text: action === "PUBLISH" ? "Yayımlandı" : action === "REVERT" ? "Yeni taslak oluşturuldu" : "Taslak kaydedildi" });
      window.setTimeout(() => setNotice(null), 1000);
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "İşlem başarısız" }); }
    finally { setBusy(false); }
  }
  const categories = Array.from(new Set(templates.map((item) => item.category)));

  return <main className="platform-foundation-panel admin-panel email-template-review email-template-pro">
    <header className="admin-pro-header"><div><span className="admin-eyebrow">SİSTEM · İLETİŞİM</span><h1>E-posta Şablonları</h1><p>Owner taslaklarını güvenli biçimde kaydedin, önizleyin ve yeni immutable revision olarak yayımlayın.</p></div></header>
    <section className="admin-kpi-grid fixoku-mail-v4-kpis"><article><span>Toplam şablon</span><strong>{templates.length || EMAIL_TEMPLATE_CATALOG.length}</strong><small>{loadedFromApi ? "Veritabanı kataloğu" : "Statik güvenli yedek"}</small></article><article><span>Kategori</span><strong>{categories.length || 7}</strong><small>Şablon sınıfı</small></article><article><span>Aktif</span><strong>{templates.filter((item) => item.active).length}</strong><small>Sunucu tarafı durum</small></article><article><span>Değişken</span><strong>{variables.length}</strong><small>Allowlist</small></article></section>
    <section className="email-template-workspace">
      <aside className="panel-card email-template-library" aria-label="E-posta şablonu seçimi"><div className="admin-section-heading"><span className="admin-eyebrow">KÜTÜPHANE</span><h2>Şablonlar</h2><input aria-label="Şablon ara" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara..." /><select aria-label="Kategori filtrele" value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">Tüm kategoriler</option>{categories.map((item) => <option value={item} key={item}>{categoryLabel(item)}</option>)}</select></div><div className="email-template-list">{filtered.map((item) => <button type="button" className={item.templateKey === selectedId ? "is-active" : ""} key={item.templateKey} onClick={() => setSelectedId(item.templateKey)}><span>{categoryLabel(item.category)}</span><strong>{item.displayName}</strong><small>{item.active ? "Aktif" : "Pasif"} · {item.draft ? `Taslak v${item.draft.revisionNumber}` : `Yayın v${item.revisionNumber || 1}`}</small></button>)}</div></aside>
      <div className="email-template-main">
        {form && <>
          <section className="panel-card email-template-toolbar-pro"><div><span className="admin-eyebrow">DÜZENLEME</span><h2>{form.displayName}</h2><p>{form.revisionStatus || "DRAFT"} · Revision {form.revisionNumber || 1}</p></div><div className="email-template-controls"><label><input type="checkbox" checked={Boolean(form.active)} onChange={(event) => updateField("active", event.target.checked)} disabled={selectedId === "email-verification" || selectedId === "password-reset"} /> Aktif</label><button type="button" onClick={() => void mutate("SAVE")} disabled={busy || !loadedFromApi}>{busy ? "Kaydediliyor..." : "Taslağı kaydet"}</button><button type="button" onClick={() => void mutate("PUBLISH")} disabled={busy || !loadedFromApi || !selected?.draft}>Yayımla</button>{notice && <span className={notice.kind === "success" ? "email-template-success" : "email-template-error"} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</span>}</div></section>
          {dirty && <p className="email-template-dirty" role="status">Kaydedilmemiş değişiklikler var.</p>}
          <section className="panel-card email-template-editor-fields"><label>Şablon adı<input value={form.displayName || ""} onChange={(event) => updateField("displayName", event.target.value)} /></label><label>Konu<input value={form.subject || ""} onChange={(event) => updateField("subject", event.target.value)} /></label><label>HTML içerik<textarea value={form.htmlBody || ""} onChange={(event) => updateField("htmlBody", event.target.value)} rows={8} /></label><label>Düz metin<textarea value={form.textBody || ""} onChange={(event) => updateField("textBody", event.target.value)} rows={7} /></label><div className="email-template-variable-list"><strong>Kullanılabilir değişkenler</strong>{variables.map((item) => <code key={item}>{`{{${item}}}`}</code>)}</div></section>
          <section className="panel-card email-template-toolbar-pro"><div><span className="admin-eyebrow">ÖNİZLEME</span><h2>{form.displayName}</h2></div><div className="email-template-controls"><div className="email-template-segmented"><button type="button" className={view === "html" ? "is-selected" : ""} onClick={() => setView("html")}>Görsel</button><button type="button" className={view === "text" ? "is-selected" : ""} onClick={() => setView("text")}>Düz metin</button></div>{view === "html" && <div className="email-template-segmented"><button type="button" className={viewport === "desktop" ? "is-selected" : ""} onClick={() => setViewport("desktop")}>Masaüstü</button><button type="button" className={viewport === "mobile" ? "is-selected" : ""} onClick={() => setViewport("mobile")}>Mobil</button></div>}</div></section>
          <section className="email-template-preview-card admin-package-card" aria-label="E-posta önizlemesi">{view === "html" ? <div className={`email-template-frame email-template-frame-${viewport}`}><iframe title={`${form.displayName} HTML önizlemesi`} srcDoc={rendered?.html || ""} /></div> : <pre className="email-template-plain">{rendered?.text || ""}</pre>}</section>
          <section className="panel-card email-template-history"><h2>Revision geçmişi</h2>{(selected.history || []).map((revision) => <div className="email-template-history-row" key={revision.revisionId}><span>v{revision.revisionNumber} · {revision.status}</span><span>{revision.createdAt ? new Date(revision.createdAt).toLocaleString("tr-TR") : ""}</span>{revision.status !== "DRAFT" && <button type="button" onClick={() => void mutate("REVERT", { revisionId: revision.revisionId })} disabled={busy || !loadedFromApi}>Bu revision'dan taslak oluştur</button>}</div>)}</section>
        </>}
      </div>
    </section>
    <section className="panel-card email-identity-details" aria-label="Gönderici ve yanıt adresleri"><h2>Gönderici ve yanıt adresleri</h2><div className="email-identity-table">{EMAIL_IDENTITIES.map((identity) => <div className="email-identity-row" key={identity.address}><span>{identity.address}</span><span>{identity.purpose}</span><span>{identity.replyTo}</span></div>)}</div></section>
  </main>;
}
