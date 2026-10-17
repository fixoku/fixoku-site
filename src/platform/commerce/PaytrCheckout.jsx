import { useState } from "react";

export default function PaytrCheckout({ orderId, summary = null, legalReady = true }) {
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const start = async () => {
    if (!legalReady || !orderId || state === "loading") return;
    setIframeUrl(""); setState("loading"); setError("");
    try {
      const response = await fetch("/api/paytr/token", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "PAYTR_CONFIG_REQUIRED" ? "Ödeme sistemi henüz yapılandırılmadı." : "Ödeme başlatılamadı.");
      let safeIframeUrl;
      try {
        const parsed = new URL(String(body?.iframeUrl || ""));
        if (!body?.token || String(body.token).length > 4096 || parsed.href !== ("https://www.paytr.com/odeme/guvenli/" + encodeURIComponent(String(body.token))) || parsed.protocol !== "https:" || parsed.host !== "www.paytr.com" || parsed.username || parsed.password || parsed.search || parsed.hash) {
          throw new Error("UNTRUSTED_PAYTR_URL");
        }
        safeIframeUrl = parsed.href;
      } catch {
        throw new Error("PayTR ödeme adresi doğrulanamadı.");
      }
      setIframeUrl(safeIframeUrl);
      setState("ready");
      window.dispatchEvent(new CustomEvent("fixoku:paytr-ready", { detail: body }));
    } catch (cause) { setState("error"); setError(cause.message); }
  };
  return <section className="paytr-checkout" aria-labelledby="paytr-title"><h2 id="paytr-title">Güvenli ödeme</h2><p className="paytr-config-state" role="status">{state === "loading" ? "Ödeme formu hazırlanıyor." : state === "ready" ? "Güvenli ödeme formu açıldı." : "Ödeme PayTR üzerinden güvenli şekilde başlatılır."}</p>{summary && <dl className="paytr-order-summary" aria-label="Sipariş özeti"><div><dt>Ürün / paket</dt><dd>{summary.title}</dd></div><div><dt>Tutar</dt><dd>{summary.price}</dd></div><div><dt>Teslim</dt><dd>{summary.delivery}</dd></div></dl>}{state === "idle" && <><p>Devam ettiğinizde PayTR güvenli ödeme formu açılır. Sipariş yalnızca ödeme bildirimi doğrulandıktan sonra tamamlanır.</p><button type="button" onClick={start} disabled={!legalReady}>Ödemeye geç</button>{!legalReady && <p className="paytr-legal-hint">Devam etmek için zorunlu sipariş ve gizlilik onaylarını tamamlayın.</p>}</>}{state === "loading" && <p role="status">Ödeme hazırlanıyor…</p>}{state === "error" && <p role="alert">{error}</p>}{state === "ready" && iframeUrl && <div id="paytr_iframe"><iframe id="paytriframe" title="PayTR güvenli ödeme formu" src={iframeUrl} loading="eager" referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: 760, border: 0 }} /></div>}</section>;
}
