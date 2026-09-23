import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./admin-panel.css";

type Program = { id: string; title: string; slug: string };
type Version = { id: string; versionNumber: number; title: string; description: string; priceMinor: number; currency: string; status: string; deliveryMode: string | null; trainingProgramIds: string[] };
type PackageRow = { id: string; slug: string; status: string; updatedAt: string; versions: Version[] };
type Payload = { packages: PackageRow[]; trainingPrograms: Program[] };
const money = (minor: number | null | undefined, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((minor ?? 0) / 100);
const updated = (value: string) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const statusLabel: Record<string, string> = { DRAFT: "Taslak", PUBLISHED: "Yayında", RETIRED: "Emekli" };
const modeLabel: Record<string, string> = { SELF_PACED: "Kendi hızında", TRAINER_LED: "Eğitmen destekli", HYBRID: "Hibrit" };

export function AdminPackagesPage() {
  const navigate = useNavigate(); const [data, setData] = useState<Payload>({ packages: [], trainingPrograms: [] }); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const response = await fetch("/api/admin/packages", { credentials: "same-origin" }); if (!response.ok) throw new Error(); setData(await response.json() as Payload); } catch { setMessage("Paket kataloğu yüklenemedi."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);


 return <main className="platform-foundation-panel admin-panel"><nav aria-label="Yönetim paneli menüsü"><Link to="/panel/admin">Genel Bakış</Link><Link to="/panel/admin/atamalar">Eğitmen Atamaları</Link><Link to="/panel/admin/paketler" aria-current="page">Paket Yönetimi</Link></nav><h1>Paket Yönetimi</h1><p>Öğrenci paketlerinin sürüm ve erişim tanımlarını yönetin.</p>{message && <p role="status">{message}</p>}<section className="admin-package-layout"><p className="panel-card">Yeni paket oluşturma bu yönetim yüzeyinde kapalıdır. Mevcut paketleri aşağıdaki katalogdan düzenleyin.</p><section className="panel-card admin-package-list" aria-labelledby="package-list-title"><h2 id="package-list-title">Katalog</h2>{loading ? <p role="status">Paketler yükleniyor…</p> : !data.packages.length ? <p>Henüz paket bulunmuyor.</p> : <div className="admin-package-grid">{data.packages.map((item) => { const version = item.versions[0]; return <article key={item.id} className="admin-package-card"><div><span className={`admin-status admin-status-${item.status.toLowerCase()}`}>{statusLabel[item.status] || "Durum bilinmiyor"}</span><h3>{version?.title || item.slug}</h3><p>{version?.description || "Sürüm tanımı yok."}</p></div><dl><div><dt>Sürüm</dt><dd>{version ? `v${version.versionNumber}` : "—"}</dd></div><div><dt>Fiyat</dt><dd>{version ? money(version.priceMinor, version.currency) : "—"}</dd></div><div><dt>Teslim</dt><dd>{modeLabel[version?.deliveryMode || ""] || "—"}</dd></div><div><dt>Son güncelleme</dt><dd>{updated(item.updatedAt)}</dd></div></dl><Link to={`/panel/admin/paketler/${item.id}`}>Paketi düzenle <span aria-hidden="true">›</span></Link></article>; })}</div>}</section></section></main>;
}
