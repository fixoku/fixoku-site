import { useEffect, useRef, useState } from "react";
import "./admin-panel.css";
import "../commerce/fixoku-paytr-r408.css";

type Attempt = {
  merchantOid: string;
  status: string;
  displayStatus?: string;
  expiresAt: string;
  createdAt: string;
  providerVerified: boolean;
  callbackCount: number;
  reconciliationRequired?: boolean;
  lastErrorCode?: string | null;
};

const endpoint = "/api/owner/paytr-acceptance-r408";

const statusLabels: Record<string,string> = {
  CREATED:"Hazırlanıyor",
  TOKEN_PENDING:"Bağlantı kuruluyor",
  TOKEN_READY:"Ödeme bekleniyor",
  SUCCEEDED:"Test başarılı",
  FAILED:"Test başarısız",
  REVIEW_REQUIRED:"İnceleme gerekiyor",
  EXPIRED:"Süre doldu"
};

export function OwnerPaytrAcceptanceR408() {
  const [attempts,setAttempts] = useState<Attempt[]>([]);
  const [enabled,setEnabled] = useState(false);
  const [blocked,setBlocked] = useState(true);
  const [confirmed,setConfirmed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [iframe,setIframe] = useState("");
  const lock = useRef(false);
  const activeOid = useRef("");

  async function refresh() {
    try {
      const response = await fetch(endpoint,{
        credentials:"same-origin",
        cache:"no-store",
        signal:AbortSignal.timeout(10000)
      });

      const data = await response.json();

      if (!response.ok || data.enabled !== true) {
        setEnabled(false);
        setBlocked(true);
        setConfirmed(false);
        setIframe("");
        setMessage("PayTR test sistemi şu anda kapalı.");
        return;
      }

      const rows:Attempt[] = Array.isArray(data.attempts)
        ? data.attempts : [];

      setEnabled(true);
      setBlocked(data.newTestBlocked !== false);
      setAttempts(rows);
      setMessage("");

      const current = rows.find(
        row=>row.merchantOid===activeOid.current
      );

      if (current && (
        ["SUCCEEDED","FAILED","REVIEW_REQUIRED","EXPIRED"]
          .includes(current.displayStatus || current.status)
      )) {
        setIframe("");
      }
    } catch {
      setBlocked(true);
      setConfirmed(false);      setIframe("");

      setMessage("Test durumu doğrulanamadı.");
    }
  }

  useEffect(()=>{
    if (window.location.hostname !== "fixoku.com") {
      setMessage("Test sistemi yalnız canlı adres kabulünde açılabilir.");
      return;
    }
    void refresh();
  },[]);

  useEffect(()=>{
    if (!iframe) return;
    const timer = window.setInterval(()=>void refresh(),5000);
    return ()=>window.clearInterval(timer);
  },[iframe]);

  async function start() {
    if (!enabled || blocked || !confirmed || lock.current)
      return;

    lock.current=true;
    setBusy(true);
    setBlocked(true);

    try {
      const response = await fetch(endpoint,{
        method:"POST",
        credentials:"same-origin",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          action:"START_TEST",
          confirmTestOnly:true
        }),
        signal:AbortSignal.timeout(30000)
      });

      const data = await response.json();

      if (!response.ok || data.testOnly !== true ||
          !/^FIXOKUR408TEST[0-9A-F]{32}$/.test(data.merchantOid))
        throw new Error("TEST_START_REJECTED");

      const url = new URL(data.iframeUrl);

      if (url.origin !== "https://www.paytr.com" ||
          !/^\/odeme\/guvenli\/[^/]+$/.test(url.pathname) ||
          url.username || url.password || url.search || url.hash)
        throw new Error("UNTRUSTED_PAYTR_URL");

      activeOid.current=data.merchantOid;
      setIframe(url.href);
      setConfirmed(false);
      await refresh();
    } catch {
      setMessage("Test başlatılamadı. Yeni işlemden önce durumu kontrol edin.");
    } finally {
      setBusy(false);
      lock.current=false;
    }
  }

  return <main className="platform-foundation-panel admin-panel r408-owner-paytr">
    <h1>PayTR Test İşlemleri</h1>
    <p>Bu alan gerçek müşteri siparişlerinden bağımsızdır.</p>

    <section className="panel-card">
      <div className="r408-paytr-summary">
        <span>Test işlem tutarı</span>
        <strong className="r408-paytr-total">1,00 TL</strong>
        <p>Test modu · Tek çekim</p>
      </div>

      <p role="status">
        {message || (enabled ? "Test sistemi hazır." : "Test sistemi kapalı.")}
      </p>

      <label style={{display:"flex",gap:10,margin:"20px 0"}}>
        <input type="checkbox" checked={confirmed}
          disabled={!enabled || blocked || busy}
          onChange={e=>setConfirmed(e.target.checked)}/>
        Yalnızca PayTR test işlemi başlatacağımı onaylıyorum.
      </label>

      <button type="button" className="r408-paytr-primary"
        disabled={!enabled || blocked || !confirmed || busy}
        onClick={()=>void start()}>
        {busy?"Hazırlanıyor...":"Test ödemesini başlat"}
      </button>

      <button type="button" disabled={busy}
        onClick={()=>void refresh()}>
        Test durumunu yenile
      </button>

      {iframe && <iframe title="PayTR test ödeme formu"
        src={iframe} referrerPolicy="strict-origin-when-cross-origin"
        style={{width:"100%",minHeight:620,border:0,marginTop:20}}/>}
    </section>

    <section className="panel-card">
      <h2>Test geçmişi</h2>
      {!attempts.length && <p>Görüntülenecek test kaydı yok.</p>}
      {attempts.map(row=><article className="r408-test-row"
        key={row.merchantOid}>
        <strong>{statusLabels[row.displayStatus || row.status] || row.status}</strong>
        <small>{row.merchantOid}</small>
        <span>
          {new Date(row.createdAt).toLocaleString("tr-TR",{
            timeZone:"Europe/Istanbul"
          })}
        </span>
        <span>PayTR doğrulaması: {row.providerVerified?"Tamam":"Bekleniyor"}</span>
        <span>Bildirim sayısı: {row.callbackCount}</span>
        {row.reconciliationRequired &&
          <p role="alert">İşlem incelenmeden yeni test başlatılamaz.</p>}
      </article>)}
    </section>
  </main>;
}