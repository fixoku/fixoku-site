import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StudentPanelShell } from "./StudentPanelShell";
import "./student-portal.css";
import PaytrCheckout from "../commerce/PaytrCheckout.jsx";
import CheckoutLegalConsents from "../commerce/CheckoutLegalConsents.jsx";
import { pushEvent } from "../../martech/events.js";

type StudentChoice = { studentProfileId: string; name: string };
type PackageRow = { packageVersionId: string; packageId: string; versionNumber: number; title: string; description: string; priceMinor: number; currency: string; deliveryMode: string; accessState: "AVAILABLE" | "OWNED" | "PENDING_PAYMENT" | "REVOKED" | "EXPIRED"; entitlementId?: string | null; pendingOrderId?: string | null };
type Body = { role: "STUDENT" | "GUARDIAN"; context: { studentProfileId: string; studentUserId: string; studentName?: string } | null; students: StudentChoice[]; packages: PackageRow[] };
const modeLabel: Record<string, string> = { SELF_PACED: "Kendi hızında", TRAINER_LED: "Eğitmen destekli", HYBRID: "Hibrit" };
const stateLabel: Record<string, string> = { AVAILABLE: "Satın alınabilir", OWNED: "Erişim aktif", PENDING_PAYMENT: "Ödeme bekliyor", REVOKED: "Erişim sonlandırıldı", EXPIRED: "Erişim süresi doldu" };
const checkoutErrorLabel: Record<string, string> = { PAYMENT_PROVIDER_NOT_CONFIGURED: "Ödeme sistemi henüz yapılandırılmadı.", ORDER_ALREADY_EXISTS: "Bu paket için bekleyen bir siparişiniz var.", PACKAGE_NOT_FOUND: "Paket bulunamadı.", ORDER_UNAVAILABLE: "Sipariş şu anda oluşturulamıyor.", DEV_SETTLEMENT_DISABLED: "Yerel test ödemesi şu anda kullanılamıyor." };
const checkoutError = (code: unknown, fallback: string) => checkoutErrorLabel[String(code || "")] || fallback;
const money = (minor: number | null | undefined, currency = "TRY") => new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((minor ?? 0) / 100);

export function StudentPackagesPage({ user, guardian }: { user: { name: string; email?: string }; guardian: boolean }) {
  const navigate = useNavigate();
  const [body, setBody] = useState<Body | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [settlementOrderId, setSettlementOrderId] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<{ title: string; price: string; delivery: string } | null>(null);
  const [legalReady, setLegalReady] = useState(false);
  const load = async () => { setState("loading"); try { const response = await fetch(`/api/student/entitlements${window.location.search}`, { credentials: "same-origin" }); if (!response.ok) throw new Error(); const next = await response.json() as Body; setBody(next); setState("ready"); if (next.packages.length) pushEvent("view_item_list", { item_list_id: "student_packages", item_count: next.packages.length }); } catch { setState("error"); } };
  useEffect(() => { void load(); }, []);
  const changeChild = (studentProfileId: string) => { navigate(`/panel/ogrenci/paketler?studentProfileId=${encodeURIComponent(studentProfileId)}`); window.location.reload(); };
  const initiate = async (item: PackageRow) => { setMessage(""); setSettlementOrderId(null); pushEvent("view_item", { item_id: item.packageVersionId, item_name: item.title, currency: item.currency, value_minor: item.priceMinor }); pushEvent("add_to_cart", { item_id: item.packageVersionId, item_name: item.title, currency: item.currency, value_minor: item.priceMinor }); const response = await fetch("/api/commerce/orders", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "Idempotency-Key": `panel-${item.packageVersionId}-${body?.context?.studentProfileId || "self"}` }, body: JSON.stringify({ packageVersionId: item.packageVersionId, studentProfileId: body?.context?.studentProfileId }) }); const result = await response.json().catch(() => ({})); if (!response.ok) { pushEvent("form_error", { form_id: "checkout", response_status: response.status }); setMessage(checkoutError(result.error, "Sipariş başlatılamadı.")); return; } pushEvent("begin_checkout", { item_id: item.packageVersionId, currency: item.currency, value_minor: item.priceMinor }); setCheckoutOrderId(result.order?.id || null); setCheckoutSummary({ title: item.title, price: money(item.priceMinor, item.currency), delivery: modeLabel[item.deliveryMode] || item.deliveryMode }); setMessage(result.checkoutState === "PAYMENT_PROVIDER_NOT_CONFIGURED" ? "Sipariş oluşturuldu; ödeme sistemi henüz yapılandırılmadı." : "Sipariş oluşturuldu."); if (result.order?.id && result.devSettlementAvailable !== false) setSettlementOrderId(result.order.id); void load(); };
  const settle = async () => { if (!settlementOrderId) return; const response = await fetch("/api/commerce/dev-settle", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: settlementOrderId }) }); const result = await response.json().catch(() => ({})); setMessage(response.ok ? "Yerel test ödemesi işlendi ve erişim tanımlandı." : checkoutError(result.error, "Yerel test ödemesi tamamlanamadı.")); if (response.ok) { setSettlementOrderId(null); void load(); } };
  const shell = (content: ReactNode) => <StudentPanelShell user={user} guardian>{content}</StudentPanelShell>;
  if (state === "loading") return shell(<div className="student-portal__state" role="status">Paketler yükleniyor…</div>);
  if (state === "error" || !body) return shell(<div className="student-portal__state" role="alert"><h3>Paketler yüklenemedi</h3><p>Paket bilgilerine şu anda ulaşılamıyor.</p><button type="button" onClick={() => void load()}>Tekrar dene</button></div>);
  const studentName = body.context?.studentName;
  return shell(<>
    <div className="student-portal__hero"><div><h2>{guardian && studentName ? `${studentName} için paketler` : "Paketler"}</h2><p>Yayınlanmış eğitim paketlerini ve erişim durumlarını görüntüleyin.</p></div>{guardian && body.students.length > 0 && <div className="student-portal__context"><small>Görüntülenen öğrenci</small><label htmlFor="package-student-context" className="student-portal__sr-only">Öğrenci seçin</label><select id="package-student-context" value={body.context?.studentProfileId || ""} onChange={(event) => changeChild(event.target.value)}>{body.students.map((student) => <option key={student.studentProfileId} value={student.studentProfileId}>{student.name}</option>)}</select></div>}</div>
    {guardian && studentName && <div className="student-portal__banner" role="status">Paketler, {studentName} için görüntüleniyor.</div>}
    {message && <p className="student-portal__banner" role="status">{message}</p>}
    {checkoutOrderId && <><CheckoutLegalConsents digitalOrService onChange={(consents: { preInformation: boolean; distanceSales: boolean; privacy: boolean }) => setLegalReady(Boolean(consents.preInformation && consents.distanceSales && consents.privacy))} /><PaytrCheckout orderId={checkoutOrderId} summary={checkoutSummary} legalReady={legalReady} /></>}
    {state === "ready" && !body.packages.length && <div className="student-portal__state"><h3>Yayınlanmış paket bulunmuyor</h3><p>Yeni bir paket yayınlandığında burada görüntülenecek.</p></div>}
    <section className="student-package-grid" aria-label="Eğitim paketleri">{body.packages.map((item) => <article className="student-package-card" key={item.packageVersionId}><div className="student-package-card__head"><span className={`student-package-state state-${item.accessState.toLowerCase()}`}>{stateLabel[item.accessState]}</span><span className="student-package-version">Sürüm {item.versionNumber}</span></div><h3>{item.title}</h3><p>{item.description}</p><dl><div><dt>Fiyat</dt><dd>{money(item.priceMinor, item.currency)}</dd></div><div><dt>Teslim</dt><dd>{modeLabel[item.deliveryMode] || "Teslim şekli bilinmiyor"}</dd></div></dl>{item.accessState === "AVAILABLE" && <button type="button" onClick={() => void initiate(item)}>Sipariş başlat</button>}{item.accessState === "PENDING_PAYMENT" && <button type="button" onClick={() => { if (item.pendingOrderId) setSettlementOrderId(item.pendingOrderId); }} className="student-package-secondary">Ödeme durumunu görüntüle</button>}{item.accessState === "OWNED" && <Link className="student-package-link" to="/panel/ogrenci">Eğitime git <span aria-hidden="true">›</span></Link>}{(item.accessState === "REVOKED" || item.accessState === "EXPIRED") && <span className="student-package-muted">Yeni işlem kullanılamıyor</span>}</article>)}</section>
    {settlementOrderId && <aside className="student-dev-settlement" aria-label="Yerel test ödemesi"><strong>Yalnızca yerel test</strong><p>Gerçek ödeme sağlayıcısı kullanılmıyor. Yerel test akışını çalıştırmak ister misiniz?</p><button type="button" onClick={() => void settle()}>Yerel test ödemesini tamamla</button></aside>}
  </>);
}
