import { useCallback, useEffect, useMemo, useState } from "react";
import "./owner-refund-workspace.css";

type Order = {
  id: string;
  status: string;
  currency: string;
  totalMinor: number;
  refundMinor: number;
  netMinor: number;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  beneficiaryName: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  items: Array<{ id: string; title: string; quantity: number; totalMinor: number; currency: string }>;
  activeEntitlementCount: number;
  enrollmentCount: number;
  activeAssignmentCount: number;
};

type RefundEvent = {
  id: string;
  event_type: string;
  previous_status: string | null;
  next_status: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

type RefundRequest = {
  id: string;
  order_id: string;
  status: string;
  amount_minor: number;
  currency: string;
  reason: string;
  provider: string | null;
  provider_reference: string | null;
  provider_transaction_id: string | null;
  provider_verification_reference: string | null;
  provider_verified_at: string | null;
  entitlement_revoked_at: string | null;
  payout_reconciled_at: string | null;
  created_at: string;
  updated_at: string;
  orderStatus: string;
  paymentStatus: string | null;
  events: RefundEvent[];
  entitlementSummary?: { active: number; revoked: number; total: number };
  financeSummary?: { entries: number; amountMinor: number };
};

const money = (minor: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(Number(minor || 0) / 100);

const dateTime = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const statusLabels: Record<string, string> = {
  REQUESTED: "Talep alındı",
  OWNER_APPROVED: "Owner onayladı",
  REFUND_PENDING_PROVIDER: "Provider doğrulaması bekleniyor",
  REFUNDED: "Provider kanıtı doğrulandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal edildi",
};
const orderLabels: Record<string, string> = { PAID: "Ödendi", REFUNDED: "İade kaydı kapandı", PARTIALLY_REFUNDED: "Kısmi iade" };
const eventLabels: Record<string, string> = {
  REQUESTED: "İade talebi oluşturuldu",
  OWNER_APPROVED: "Owner onayı kaydedildi",
  PROVIDER_VERIFIED: "Provider kanıtı doğrulandı",
  ENTITLEMENTS_REVOKED: "Eğitim hakları geri alındı",
  PAYOUT_RECONCILED: "Hakediş uzlaştırıldı",
  REJECTED: "İade talebi reddedildi",
};

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.error || "İşlem tamamlanamadı."));
  return body;
}

export function OwnerRefundWorkspacePage() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [providerTransactionId, setProviderTransactionId] = useState("");
  const [verificationReference, setVerificationReference] = useState("");
  const [evidenceToken, setEvidenceToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selected = useMemo(() => requests.find((item) => item.id === selectedId) || requests[0] || null, [requests, selectedId]);

  const loadRefunds = useCallback(async (id: string) => {
    const body = await readJson(await fetch(`/api/admin/order-refunds?orderId=${encodeURIComponent(id)}`, { credentials: "same-origin", cache: "no-store" }));
    const next = Array.isArray(body.refundRequests) ? body.refundRequests as RefundRequest[] : [];
    setRequests(next);
    setSelectedId((current) => next.some((item) => item.id === current) ? current : next[0]?.id || "");
  }, []);

  const loadOrder = useCallback(async (id: string) => {
    setLoading(true); setError(""); setMessage("");
    try {
      const query = new URLSearchParams({ search: id, page: "1", pageSize: "1" });
      const body = await readJson(await fetch(`/api/admin/orders?${query.toString()}`, { credentials: "same-origin", cache: "no-store" }));
      const match = body.orders?.find((item: Order) => String(item.id) === id) || body.orders?.[0];
      if (!match) throw new Error("ORDER_NOT_FOUND");
      setOrder(match);
      await loadRefunds(String(match.id));
    } catch (cause) {
      setOrder(null); setRequests([]); setSelectedId("");
      setError(String(cause instanceof Error ? cause.message : "Sipariş okunamadı."));
    } finally { setLoading(false); }
  }, [loadRefunds]);

  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("orderId") || "";
    if (queryId) { setOrderIdInput(queryId); void loadOrder(queryId); }
  }, [loadOrder]);

  const postAction = async (action: string, request: RefundRequest | null = selected) => {
    if (!order || (action !== "REQUEST" && !request)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const actionReason = reason.trim() || (action === "APPROVE" ? "Owner tarafından politika uygunluğu onaylandı" : action === "REJECT" ? "Owner tarafından reddedildi" : "");
      const body: Record<string, unknown> = { action, orderId: order.id, reason: actionReason };
      if (action === "REQUEST") body.idempotencyKey = `OWNER_UI_REFUND:${order.id}`;
      if (request) body.refundRequestId = request.id;
      if (action === "VERIFY_REFUND") Object.assign(body, {
        providerReference: providerReference.trim(),
        providerTransactionId: providerTransactionId.trim(),
        verificationReference: verificationReference.trim(),
        providerEvidenceToken: evidenceToken.trim(),
        confirmedAmountMinor: request?.amount_minor,
      });
      await readJson(await fetch("/api/admin/order-refunds", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      setMessage(action === "REQUEST" ? "İade talebi oluşturuldu." : action === "APPROVE" ? "Owner onayı kaydedildi. Provider doğrulaması olmadan ödeme durumu değişmedi." : action === "REJECT" ? "İade talebi reddedildi." : "Provider kanıtı doğrulandı; uzlaştırma kayıtları yenilendi.");
      setReason("");
      await loadOrder(order.id);
    } catch (cause) { setError(String(cause instanceof Error ? cause.message : "İşlem tamamlanamadı.")); }
    finally { setBusy(false); }
  };

  return <main className="platform-foundation-panel admin-panel owner-refund-workspace">
    <header className="admin-pro-header owner-refund-header">
      <div><span className="admin-eyebrow">OWNER FİNANS / İADE</span><h1>İade çalışma alanı</h1><p>Sipariş, ödeme, iade talebi, eğitim hakkı ve hakediş uzlaştırmasını aynı kayıt üzerinden izleyin.</p></div>
      <div className="owner-refund-safety"><strong>Güvenli akış</strong><span>Talep ve onay ödeme yapmaz. REFUNDED yalnız güvenilir sunucu kanıtı doğrulandığında yazılır.</span></div>
    </header>

    <section className="panel-card owner-refund-lookup" aria-label="Sipariş ara">
      <form onSubmit={(event) => { event.preventDefault(); if (orderIdInput.trim()) void loadOrder(orderIdInput.trim()); }}>
        <label>Sipariş UUID<input required value={orderIdInput} onChange={(event) => setOrderIdInput(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
        <button type="submit" disabled={loading}>{loading ? "Okunuyor…" : "Siparişi getir"}</button>
      </form>
      <p>Yalnız yetkili Owner sipariş ve ödeme kaydını görebilir. 5276 referans veritabanına yazılmaz.</p>
    </section>

    {error && <div className="admin-callout is-danger" role="alert">{error}</div>}
    {message && <div className="admin-callout" role="status">{message}</div>}

    {order && <>
      <section className="owner-refund-order-grid" aria-label="Sipariş özeti">
        <article className="panel-card owner-refund-order-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">SİPARİŞ</span><h2>#{order.id.slice(0, 8)}</h2></div><span className={`owner-refund-status status-${order.status.toLowerCase()}`}>{orderLabels[order.status] || order.status}</span></div><dl className="owner-refund-details"><div><dt>Alıcı</dt><dd>{order.buyerName}<small>{order.buyerEmail}</small></dd></div><div><dt>Öğrenci</dt><dd>{order.beneficiaryName}</dd></div><div><dt>Oluşturulma</dt><dd>{dateTime(order.createdAt)}</dd></div><div><dt>Ödeme</dt><dd>{order.paymentMethod || "—"} · {order.paymentStatus || "—"}</dd></div></dl><div className="owner-refund-items">{order.items?.map((item) => <div key={item.id}><span>{item.title} · {item.quantity} adet</span><strong>{money(item.totalMinor, item.currency)}</strong></div>)}</div><div className="owner-refund-total"><span>Toplam</span><strong>{money(order.totalMinor, order.currency)}</strong></div></article>
        <article className="panel-card owner-refund-state-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">ETKİLER</span><h2>İade sonrası durum</h2></div></div><div className="owner-refund-kpis"><div><span>Aktif hak</span><strong>{order.activeEntitlementCount}</strong></div><div><span>Enrollment</span><strong>{order.enrollmentCount}</strong></div><div><span>Aktif atama</span><strong>{order.activeAssignmentCount}</strong></div><div><span>İade toplamı</span><strong>{money(order.refundMinor, order.currency)}</strong></div></div><p className="owner-refund-muted">İade doğrulandığında ilgili entitlement REVOKED, enrollment/atama ve hakediş uzlaştırma durumları audit kaydıyla birlikte görünür.</p></article>
      </section>

      <section className="owner-refund-main-grid">
        <article className="panel-card owner-refund-request-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">STATE MACHINE</span><h2>İade talebi ve onay</h2></div><span className="admin-section-meta">{requests.length} kayıt</span></div>{requests.length ? <div className="owner-refund-request-list">{requests.map((item) => <button type="button" key={item.id} className={`owner-refund-request-row ${selected?.id === item.id ? "is-selected" : ""}`} onClick={() => setSelectedId(item.id)}><span><strong>{statusLabels[item.status] || item.status}</strong><small>{dateTime(item.created_at)} · {money(item.amount_minor, item.currency)}</small></span><span aria-hidden="true">›</span></button>)}</div> : <p className="owner-refund-empty">Bu sipariş için henüz iade talebi yok.</p>}
          <label className="owner-refund-field">İşlem notu<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Politika gerekçesi ve operasyon notu" maxLength={500} /></label>
          <div className="owner-refund-actions"><button type="button" onClick={() => void postAction("REQUEST", null)} disabled={busy || Boolean(requests.some((item) => ["REQUESTED", "OWNER_APPROVED", "REFUND_PENDING_PROVIDER"].includes(item.status))) || order.status !== "PAID"}>Yetkili iade talebi oluştur</button><button type="button" className="admin-secondary-button" onClick={() => void postAction("APPROVE")} disabled={busy || !selected || selected.status !== "REQUESTED"}>Owner olarak onayla</button><button type="button" className="admin-text-button" onClick={() => void postAction("REJECT")} disabled={busy || !selected || !["REQUESTED", "OWNER_APPROVED"].includes(selected.status)}>Talebi reddet</button></div>
          {selected && <div className="owner-refund-selected-state"><strong>{statusLabels[selected.status] || selected.status}</strong><span>{selected.reason}</span>{selected.status === "OWNER_APPROVED" && <small>Provider doğrulaması bekleniyor; bu aşamada sipariş ve eğitim hakkı değişmedi.</small>}</div>}
        </article>

        <article className="panel-card owner-refund-verify-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">PROVIDER KANITI</span><h2>Doğrulama kaydı</h2></div></div><p className="owner-refund-muted">Bu alan yalnız provider’ın güvenilir sunucu akışından üretilen imzalı kanıtı kabul eder. UI’ya yazılan sahte transaction/reference değeri tek başına REFUNDED sonucu oluşturamaz.</p><div className="owner-refund-form-grid"><label>Provider referansı<input value={providerReference} onChange={(event) => setProviderReference(event.target.value)} placeholder="PayTR / banka referansı" /></label><label>Provider transaction ID<input value={providerTransactionId} onChange={(event) => setProviderTransactionId(event.target.value)} /></label><label>Doğrulama referansı<input value={verificationReference} onChange={(event) => setVerificationReference(event.target.value)} /></label><label>İmzalı kanıt tokeni<input value={evidenceToken} onChange={(event) => setEvidenceToken(event.target.value)} placeholder="Sunucu tarafından sağlanır" /></label></div><button type="button" onClick={() => void postAction("VERIFY_REFUND")} disabled={busy || !selected || selected.status !== "OWNER_APPROVED" || !evidenceToken.trim()}>Provider kanıtını doğrula</button>{selected?.status === "REFUNDED" && selected.provider_verified_at && <div className="owner-refund-confirmation" role="status"><strong>Provider kanıtı doğrulandı</strong><span>{dateTime(selected.provider_verified_at)} · {selected.provider}</span><small>İade transaction’ı, entitlement geri alma ve hakediş uzlaştırması audit kaydında.</small></div>}</article>
      </section>

      <section className="panel-card owner-refund-audit-card"><div className="admin-section-heading"><div><span className="admin-eyebrow">DENETİM</span><h2>İşlem geçmişi ve audit kaydı</h2></div></div>{selected?.events?.length ? <ol className="owner-refund-timeline">{selected.events.map((event) => <li key={event.id}><span className="owner-refund-timeline-dot" /><div><strong>{eventLabels[event.event_type] || event.event_type}</strong><small>{dateTime(event.created_at)} · {event.previous_status ? `${statusLabels[event.previous_status] || event.previous_status} → ` : ""}{statusLabels[event.next_status] || event.next_status}</small></div></li>)}</ol> : <p className="owner-refund-empty">Seçili talep için audit olayı yok.</p>}<div className="owner-refund-reconciliation"><span>Entitlement geri alma</span><strong>{selected?.entitlement_revoked_at ? `Tamamlandı · ${dateTime(selected.entitlement_revoked_at)}` : "Bekliyor"}</strong><span>Hakediş uzlaştırması</span><strong>{selected?.payout_reconciled_at ? `Tamamlandı · ${dateTime(selected.payout_reconciled_at)}` : "Bekliyor"}</strong><span>Finans kayıtları</span><strong>{selected?.financeSummary ? `${selected.financeSummary.entries} kayıt · ${money(selected.financeSummary.amountMinor, selected.currency)}` : "Bekliyor"}</strong></div></section>
    </>}
  </main>;
}
