import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./trainer-expertise-journey.css";

type Badge = { id?: string; label?: string };
type Package = { slug?: string; title?: string; accessState?: string; priceGrossMinor?: number; currency?: string };
const qualifications = [
  { code: "PRIMARY_FAST", label: "İlkokul Hızlı Okuma", slugs: ["ilkokul-akici-hizli-okuma-egitimi"], hints: ["ilkokul"] },
  { code: "MIDDLE_FAST", label: "Ortaokul Hızlı Okuma", slugs: ["ortaokul-hizli-okuma-egitimi", "ortaokul-lise-yetiskin-hizli-okuma-egitimi"], hints: ["ortaokul", "hızlı"] },
  { code: "HIGH_FAST", label: "Lise Hızlı Okuma", slugs: ["lise-hizli-okuma-egitimi", "ortaokul-lise-yetiskin-hizli-okuma-egitimi"], hints: ["lise", "hızlı"] },
  { code: "ADULT_FAST", label: "Yetişkin Hızlı Okuma", slugs: ["yetiskin-hizli-okuma-egitimi", "ortaokul-lise-yetiskin-hizli-okuma-egitimi"], hints: ["yetişkin"] },
  { code: "MIDDLE_PARAGRAPH", label: "Ortaokul Paragraf", slugs: ["ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs", "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set"], hints: ["ortaokul", "paragraf"] },
  { code: "HIGH_PARAGRAPH", label: "Lise Paragraf", slugs: ["lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt", "ortaokul-lise-paragraf-egitmen-egitimi-ikili-set"], hints: ["lise", "paragraf"] },
] as const;
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
function qualificationActive(badges: Badge[], code: string, hints: readonly string[]) {
  return badges.some((badge) => {
    const id = String(badge.id || "").toUpperCase();
    if (id === code) return true;
    const normalized = normalize(String(badge.label || ""));
    return hints.every((word) => normalized.includes(normalize(word)));
  });
}
export function TrainerExpertiseJourney({ compact = false }: { compact?: boolean }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch("/api/trainer/profile", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/trainer/packages", { credentials: "same-origin", cache: "no-store" }),
    ]).then(async ([profile, catalog]) => {
      if (!profile.ok || !catalog.ok) throw Error("TRAINER_EXPERTISE_READ_FAILED");
      const [p, c] = await Promise.all([profile.json(), catalog.json()]);
      if (mounted) { setBadges(Array.isArray(p.badges) ? p.badges : []); setPackages(Array.isArray(c.packages) ? c.packages : []); setState("ready"); }
    }).catch(() => { if (mounted) setState("error"); });
    return () => { mounted = false; };
  }, []);
  const active = qualifications.filter(q => qualificationActive(badges, q.code, q.hints));
  const senior = active.length === 6;
  return <section className={`fixoku-expertise-journey ${compact ? "is-compact" : ""}`} aria-label="Uzmanlık Yolculuğum">
    <div className="fej-heading"><div><h2>Uzmanlık Yolculuğum</h2><p>Altı temel uzmanlık, tek bir gelişim haritası.</p></div><Link to="/panel/egitmen/egitimlerim">Eğitimleri incele →</Link></div>
    {state === "loading" ? <p role="status">Uzmanlıklar doğrulanıyor…</p> : state === "error" ? <p role="alert">Uzmanlık bilgileri şu anda okunamadı. İlerlemeniz tahmini gösterilmiyor.</p> : <>
      <div className="fej-progress"><div><strong>{active.length}/6</strong><span> aktif uzmanlık</span></div><span>{senior ? "Kıdemli Eğitmen kazanıldı" : `Kıdemli Eğitmen için ${6-active.length} uzmanlık kaldı`}</span><div className="fej-track" role="progressbar" aria-valuenow={active.length} aria-valuemin={0} aria-valuemax={6} aria-label="Aktif uzmanlık sayısı"><i style={{width:`${active.length/6*100}%`}} /></div></div>
      <div className="fej-grid">{qualifications.map(q => {
        const owned = qualificationActive(badges, q.code, q.hints);
        const offered = packages.filter(p => q.slugs.some(slug => slug === p.slug));
        const available = offered.find(p => p.accessState === "AVAILABLE") || offered.find(p => p.accessState !== "OWNED");
        return <div className={`fej-item ${owned ? "is-owned" : ""}`} key={q.code}><div className="fej-item-top"><span aria-hidden="true">{owned ? "✓" : "○"}</span><strong>{q.label}</strong></div><small>{owned ? "Uzmanlık aktif" : "Henüz kazanılmadı"}</small>{!owned && !compact && available && <Link to="/panel/egitmen/egitimlerim" className="fej-cta">{available.accessState === "PENDING_PAYMENT" ? "Ödeme bekleniyor" : "Eğitim paketini incele →"}</Link>}</div>;
      })}</div>
      <p className="fej-senior">{senior ? "★ Altı uzmanlığın tamamı aktif: Kıdemli Eğitmen" : "☆ Yedinci rozet ayrı satılmaz. Altı aktif uzmanlık tamamlandığında otomatik kazanılır."}</p>
      {compact && <Link className="fej-bottom-link" to="/panel/egitmen/egitimlerim">Uzmanlıklarımı ve eksik eğitimleri gör →</Link>}
    </>}
  </section>;
}
