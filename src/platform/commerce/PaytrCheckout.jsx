import { useCallback, useEffect, useRef, useState } from "react";
import PaytrInstallmentTable from "./PaytrInstallmentTable.jsx";
import InstallmentCampaignBanner from "../../shared/InstallmentCampaignBanner";

const stateText = { idle: "Kartla güvenli ödeme başlatılmadı.", loading: "Ödeme hazırlanıyor…", ready: "Güvenli PayTR ödeme ekranı hazır.", verifying: "Ödeme doğrulanıyor…", succeeded: "Ödeme başarıyla doğrulandı.", failed: "Ödeme tamamlanmadı. Yeni bir tahsilat başlatmadan önce sipariş durumunu kontrol edin.", review: "Ödeme sonucu inceleniyor. Önceki işlem doğrulanmadan tekrar tahsilat başlatılamaz." };

export default function PaytrCheckout({ orderId, summary = null, legalReady = true, configured = true, amountMinor = null, statusUrl = `/api/student/orders?orderId=${encodeURIComponent(orderId || "")}`, initialStatus = "PENDING_PAYMENT", onPaymentState = () => {} }) {
  const [state, setState] = useState(() => initialStatus === "PAYMENT_REVIEW" ? "review" : "idle");
  const [error, setError] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [providerConfigured, setProviderConfigured] = useState(null);
  const requestLock = useRef(false);
  const paymentStateCallback = useRef(onPaymentState);
  useEffect(() => { paymentStateCallback.current = onPaymentState; }, [onPaymentState]);
  const setPaymentState = useCallback((next) => { setState(next); paymentStateCallback.current(next); }, []);
  const pollingActive = state === "ready" || state === "verifying";
  useEffect(() => { let active = true; fetch("/api/paytr/runtime", { credentials: "same-origin", cache: "no-store" }).then(async response => response.ok ? response.json() : null).then(body => { if (active) setProviderConfigured(body?.configured === true); }).catch(() => { if (active) setProviderConfigured(false); }); return () => { active = false; }; }, []);
  const paymentConfigured = configured && providerConfigured === true;

  useEffect(() => {
    if (!pollingActive || !orderId) return undefined;
    let cancelled = false;
    let controller;
    let timer;
    let requestTimeout;
    let count = 0;
    setPaymentState("verifying");
    const poll = async () => {
      if (cancelled) return;
      count += 1;
      controller = new AbortController();
      requestTimeout = window.setTimeout(() => controller.abort(), 10000);
      let terminal = null;
      try {
        const response = await fetch(statusUrl, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (response.ok) {
          const body = await response.json();
          const order = body.order?.id === orderId ? body.order : (Array.isArray(body.orders) ? body.orders.find((item) => item.id === orderId) : null);
          if (order?.status === "PAID") terminal = "succeeded";
          else if (["PAYMENT_FAILED", "CANCELLED", "REJECTED", "REFUNDED"].includes(order?.status)) terminal = "failed";
          else if (["PAYMENT_REVIEW", "UNKNOWN", "REVIEW"].includes(order?.status)) terminal = "review";
        }
      } catch { /* transient status read failure; bounded polling continues */ }
      finally { window.clearTimeout(requestTimeout); }
      if (cancelled) return;
      if (terminal || count >= 12) { setIframeUrl(""); setError(""); setPaymentState(terminal || "review"); return; }
      timer = window.setTimeout(() => void poll(), 5000);
    };
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(requestTimeout);
      controller?.abort();
    };
  }, [pollingActive, statusUrl, orderId, setPaymentState]);

  const start = async () => {
    if (!legalReady || !paymentConfigured || !orderId || requestLock.current || state !== "idle") return;
    requestLock.current = true; setIframeUrl(""); setPaymentState("loading"); setError("");
    let reviewError = false;
    try {
      const response = await fetch("/api/paytr/token", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId }), signal: AbortSignal.timeout(25000) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (["PAYTR_TOKEN_REQUEST_IN_PROGRESS", "PAYTR_TOKEN_RESULT_UNKNOWN", "PAYTR_ATTEMPT_REVIEW", "PAYTR_ATTEMPT_UNKNOWN", "PAYTR_TOKEN_RECONCILIATION_REQUIRED"].includes(body.error)) { reviewError = true; setPaymentState("review"); }
        throw new Error(body.error || "PAYTR_TOKEN_FAILED");
      }
      const parsed = new URL(String(body?.iframeUrl || ""));
      if (!body?.token || String(body.token).length > 4096 || parsed.href !== (`https://www.paytr.com/odeme/guvenli/${encodeURIComponent(String(body.token))}`) || parsed.protocol !== "https:" || parsed.host !== "www.paytr.com" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("UNTRUSTED_PAYTR_URL");
      setIframeUrl(parsed.href); setPaymentState("ready");
      window.dispatchEvent(new CustomEvent("fixoku:paytr-ready", { detail: { orderId, orderKind: body.orderKind } }));
    } catch { if (!reviewError) { setPaymentState("review"); setError("Güvenli ödeme ekranı açılamadı. Sipariş durumu doğrulanmadan tekrar denemeyin."); } }
    finally { requestLock.current = false; }
  };

  const checkStatus = async () => {
    if (!orderId || requestLock.current) return;
    requestLock.current = true;
    setError("");
    try {
      const response = await fetch(statusUrl, { method: "GET", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("ORDER_STATUS_UNAVAILABLE");
      const body = await response.json();
      const order = body.order?.id === orderId ? body.order : (Array.isArray(body.orders) ? body.orders.find(item => item.id === orderId) : null);
      if (!order) throw new Error("ORDER_STATUS_UNAVAILABLE");
      if (order.status === "PAID") { setIframeUrl(""); setPaymentState("succeeded"); }
      else if (["PAYMENT_FAILED", "CANCELLED", "REJECTED", "REFUNDED"].includes(order.status)) { setIframeUrl(""); setPaymentState("failed"); }
      else { setIframeUrl(""); setPaymentState("review"); setError("Ödeme henüz doğrulanmadı. Yeni tahsilat başlatmayın; sipariş durumunu yeniden kontrol edebilirsiniz."); }
    } catch { setPaymentState("review"); setError("Sipariş durumu doğrulanamadı. Yeni ödeme başlatmayın."); }
    finally { requestLock.current = false; }
  };

  return <section className="paytr-checkout" aria-labelledby="paytr-title" style={{ border: 0, padding: 0, background: "transparent" }}>
    <InstallmentCampaignBanner />
    <div style={{ marginBottom: 16 }}><div><h2 id="paytr-title" style={{ fontSize: 24, margin: "0 0 5px", color: "#17283c" }}>Güvenli kart ödemesi</h2><p style={{ margin: 0, color: "#64748b" }}>Kart bilgileriniz yalnızca resmi PayTR iframe’inde alınır.</p></div></div>
    {summary && <div style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}><strong>{summary.title}</strong><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap" }}><span>{summary.delivery}</span><strong>{summary.price}</strong></div></div>}
    <p role={state === "failed" || state === "review" ? "alert" : "status"} style={{ color: state === "review" ? "#92400e" : "#475569", lineHeight: 1.6 }}>{error || stateText[state]}</p>
    {!paymentConfigured && providerConfigured !== null && <p role="status">Kart ödeme sistemi şu anda yapılandırılmadı. Aktif tahsilat başlatılamaz.</p>}
    {paymentConfigured && state === "idle" && <button type="button" onClick={start} disabled={!legalReady} style={{ width: "100%", padding: "14px 20px", fontWeight: 700, borderRadius: 10 }}>Güvenli ödemeye geç</button>}
    {["failed", "review"].includes(state) && <button type="button" onClick={checkStatus} style={{ width: "100%", padding: "14px 20px", fontWeight: 700, borderRadius: 10 }}>Sipariş durumunu kontrol et</button>}
    {!legalReady && <p>Zorunlu yasal onayları tamamlayın.</p>}
    {iframeUrl && <div id="paytr_iframe" style={{ marginTop: 12, overflow: "hidden", borderRadius: 12 }}><iframe id="paytriframe" title="PayTR güvenli ödeme formu" src={iframeUrl} loading="eager" referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", minHeight: 460, height: "min(720px, calc(100vh - 220px))", border: 0, display: "block" }} /></div>}
    <PaytrInstallmentTable amountMinor={amountMinor} />
  </section>;
}
