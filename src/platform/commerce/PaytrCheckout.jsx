import { useState } from "react";

export default function PaytrCheckout({ orderId, summary = null, legalReady = true }) {
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const start = async () => {
    setState("loading"); setError("");
    try {
      const response = await fetch("/api/paytr/token", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "PAYTR_CONFIG_REQUIRED" ? "Ödeme sistemi henüz yapılandırılmadı." : "Ödeme başlatılamadı.");
      setState("ready");
      window.dispatchEvent(new CustomEvent("fixoku:paytr-ready", { detail: body }));
    } catch (cause) { setState("error"); setError(cause.message); }
  };
  return <section className="paytr-checkout" aria-labelledby="paytr-title"><h2 id="paytr-title">Güvenli ödeme</h2><p className="paytr-config-state" role="status">Ödeme sistemi henüz yapılandırılmadı.</p>{summary && <dl className="paytr-order-summary" aria-label="Sipariş özeti"><div><dt>Ürün / paket</dt><dd>{summary.title}</dd></div><div><dt>Tutar</dt><dd>{summary.price}</dd></div><div><dt>Teslim</dt><dd>{summary.delivery}</dd></div></dl>}{state === "idle" && <><p>Ödeme, PayTR güvenli iFrame üzerinden başlatılır. Gerçek merchant bilgileri bulunmadığı için ödeme şu anda başlatılamaz.</p><button type="button" onClick={start} disabled={!legalReady}>Ödemeye geç</button>{!legalReady && <p className="paytr-legal-hint">Devam etmek için zorunlu sipariş ve gizlilik onaylarını tamamlayın.</p>}</>}{state === "loading" && <p role="status">Ödeme hazırlanıyor…</p>}{state === "error" && <p role="alert">{error}</p>}{state === "ready" && <div id="paytr_iframe"><p role="status">PayTR ödeme ekranı hazırlanıyor.</p></div>}</section>;
}
