import { useEffect, useState } from "react";
import { FixokuPhotoV41F, productImageDefaultV41F } from "./FixokuCatalogAssetsV41F";

type ProductCost = {
  id: string;
  sku: string;
  title: string;
  productType: string;
  imageReference?: string | null;
  costVersion: number | null;
  unitCostMinor: number | null;
  isActive: boolean;
};

const currency = (minor: number) => `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)} ₺`;
const toMinor = (raw: string) => {
  const v = raw.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(v)) return null;
  const amount = Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 2147483647 ? amount : null;
};
const isAiSoftware = (p: ProductCost) => p.sku === "FIXOKU-STUDENT-YAPAY-ZEKA" || p.sku === "FIXOKU-SOFTWARE-AI";
const softwareProduct = (p: ProductCost) => p.productType === "SOFTWARE" || (p.productType === "DIGITAL" && isAiSoftware(p));

export function OwnerProductCostsR410({ audience }: { audience: "STUDENT" | "TRAINER" }) {
  const [products, setProducts] = useState<ProductCost[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);

  const load = async () => {
    try {
      const response = await fetch("/api/admin/r410-product-costs", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("LOAD_FAILED");
      const data = await response.json();
      if (!Array.isArray(data.products)) throw new Error("INVALID_RESPONSE");
      setProducts(data.products);
      setAvailable(true);
      setMessage("");
    } catch {
      setAvailable(false);
      setMessage("Maliyetler yüklenemedi. Owner yetkisi ve veritabanı bağlantısı kontrol edilmeli.");
    }
  };
  useEffect(() => { void load(); }, []);

  const save = async (p: ProductCost) => {
    const minor = toMinor(amounts[p.id] || "");
    if (minor === null) { setMessage("Tutarı ₺ biçiminde yazın. Örneğin 120,00 veya 1.250,50."); return; }
    if (minor === 0 && !window.confirm("Bu ürünün maliyetini gerçekten 0,00 ₺ olarak onaylıyor musunuz?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/r410-product-costs", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: p.id, costMinor: minor, expectedVersion: Number(p.costVersion || 0), zeroCostConfirmed: minor === 0 })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error === "COST_STALE_VERSION" ? "Maliyet değişmiş. Listeyi yenileyin." : data.error || "Maliyet kaydedilemedi.");
      }
      setAmounts(current => ({ ...current, [p.id]: "" }));
      await load();
      setMessage("Maliyet yeni sürüm olarak kaydedildi. Önceki sürümler korundu.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Maliyet kaydedilemedi.");
    } finally { setBusy(false); }
  };
  const visible = products.filter(p => p.productType === "PHYSICAL" || softwareProduct(p));
  return <section className="panel-card" aria-label={audience === "STUDENT" ? "Owner öğrenci ürün maliyetleri" : "Owner eğitmen ürün maliyetleri"} style={{ padding: "20px clamp(12px, 2vw, 26px)", marginTop: 16, minWidth: 0 }}>
    <style>{`
      .fx-r410-cost-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
      .fx-r410-cost-card { display:flex; flex-direction:column; gap:12px; min-width:0; padding:16px; border:1px solid #e1e6ef; border-radius:14px; background:#fff; }
      .fx-r410-cost-head { display:flex; align-items:center; gap:15px; min-width:0; }
      .fx-r410-cost-cover { flex:0 0 106px; width:106px; height:142px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:#f3f6fb; overflow:hidden; }
      .fx-r410-cost-cover img { width:100%; height:100%; object-fit:contain; }
      .fx-r410-cost-info { flex:1; min-width:0; }
      .fx-r410-cost-title { display:block; color:#102a4c; font-weight:750; font-size:15px; line-height:1.4; }
      .fx-r410-cost-meta { margin:5px 0; font-size:11px; color:#66758a; overflow-wrap:anywhere; }
      .fx-r410-cost-controls { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:10px; }
      .fx-r410-cost-label { display:grid; gap:6px; font-size:12px; font-weight:650; min-width:0; }
      .fx-r410-cost-input-wrap { position:relative; display:block; }
      .fx-r410-cost-input { width:100%; min-width:0; box-sizing:border-box; padding:11px 35px 11px 12px; border:1px solid #d5dfeb; border-radius:9px; }
      .fx-r410-cost-symbol { position:absolute; top:50%; right:13px; transform:translateY(-50%); color:#314967; font-weight:750; pointer-events:none; }
      .fx-r410-cost-save { background:#f65b0a; border:1px solid #ed5200; color:#fff; border-radius:9px; font-weight:750; padding:11px 14px; cursor:pointer; white-space:nowrap; min-height:42px; }
      .fx-r410-cost-save:hover:not(:disabled) { background:#df5005; }
      .fx-r410-cost-save:disabled { opacity:.55; cursor:not-allowed; }
      @media (max-width:1050px) { .fx-r410-cost-grid { grid-template-columns:1fr; } }
      @media (max-width:520px) { .fx-r410-cost-head { align-items:flex-start; } .fx-r410-cost-cover { width:90px; height:120px; flex-basis:90px; } .fx-r410-cost-controls { grid-template-columns:1fr; } .fx-r410-cost-save { width:100%; } }
    `}</style>
    <div className="admin-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div><span>YALNIZ OWNER</span><h2>Maliyetler</h2><p>Kitap ve yapay zekâ yazılımı alış maliyetleri. Aynı ürünün öğrenci ve eğitmen satışlarında maliyet geçmişi ortaktır.</p></div>
      <button type="button" disabled={busy} onClick={() => void load()}>Listeyi yenile</button>
    </div>
    {message && <p role="status" style={{ padding: 10, background: "#f3f6fb", borderRadius: 8 }}>{message}</p>}
    {available ? <div className="fx-r410-cost-grid">
      {visible.map(p => <article className="fx-r410-cost-card" key={p.id}>
        <div className="fx-r410-cost-head">
          <div className="fx-r410-cost-cover">
            <FixokuPhotoV41F src={p.imageReference} fallbackSrc={productImageDefaultV41F(p.sku)} alt={p.title}>
              <span style={{ fontSize: 12, textAlign: "center", color: "#6b7788" }}>{softwareProduct(p) ? "Yazılım" : "Kitap"}</span>
            </FixokuPhotoV41F>
          </div>
          <div className="fx-r410-cost-info"><strong className="fx-r410-cost-title">{p.title}</strong>
            <div className="fx-r410-cost-meta">{p.sku} · {softwareProduct(p) ? "Yazılım" : "Kitap"} · Sürüm {p.costVersion || 0}{p.isActive ? "" : " · Pasif ürün"}</div>
            <small>Geçerli maliyet: <strong>{p.unitCostMinor == null ? "Belirlenmedi" : currency(Number(p.unitCostMinor))}</strong></small>
          </div>
        </div>
        <div className="fx-r410-cost-controls">
          <label className="fx-r410-cost-label">Birim alış maliyeti (₺)
            <span className="fx-r410-cost-input-wrap">
              <input className="fx-r410-cost-input" type="text" inputMode="decimal" aria-label={`${p.title} alış maliyeti`} placeholder="Örn. 120,00" disabled={busy} value={amounts[p.id] || ""}
                onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value }))}
                onBlur={() => setAmounts(a => { const n = toMinor(a[p.id] || ""); return n === null ? a : { ...a, [p.id]: currency(n).replace(/ ₺$/, "") }; })} />
              <span className="fx-r410-cost-symbol">₺</span>
            </span>
          </label>
          <button className="fx-r410-cost-save" type="button" disabled={busy || toMinor(amounts[p.id] || "") === null} onClick={() => void save(p)}>Maliyeti kaydet</button>
        </div>
      </article>)}
      {!visible.length && <p>Kitap veya yazılım kaydı bulunamadı.</p>}
      {!visible.some(softwareProduct) && <p role="status" style={{ gridColumn: "1 / -1" }}>Fixoku Yapay Zekâ Destekli Yazılım katalog kaydı maliyet listesinde bulunamadı. Ürün tipi veya katalog kimliği doğrulanmadan başka ürüne maliyet yazılamaz.</p>}
    </div> : <p>Maliyet verileri bekleniyor; bilinmeyen maliyet sıfır kabul edilmez.</p>}
    <p style={{ fontSize: 12, color: "#67768c", marginTop: 15 }}>Geçmiş sipariş kârlılığı, ancak siparişe özgü doğrulanmış maliyet kayıtlarıyla kesinleştirilebilir.</p>
  </section>;
}