import "./fixoku-shipment-r408.css";

type ShipmentRow = {
  id: string;
  orderId?: string;
  status?: string;
  dispatchStatus?: string;
  providerName?: string;
  carrier?: string;
  providerTrackingNumber?: string;
  trackingNumber?: string;
  providerTrackingUrl?: string;
  trackingUrl?: string;
  createdAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items?: Array<{ titleSnapshot?: string; quantity?: number }>;
};

const states: Record<string, string> = {
  WAITING: "Bekliyor",
  PREPARING: "Hazırlanıyor",
  PACKED: "Paketlendi",
  READY: "Paketlendi",
  CREATED: "Kargo kaydı oluşturuldu",
  HANDED_OVER: "Kargoya verildi",
  SHIPPED: "Kargoya verildi",
  IN_TRANSIT: "Yolda",
  OUT_FOR_DELIVERY: "Dağıtımda",
  DELIVERED: "Teslim edildi",
  RETURNING: "İade sürecinde",
  RETURNED: "İade edildi",
  CANCELLED: "İptal edildi",
  REVIEW_REQUIRED: "İnceleme gerekiyor",
  FAILED: "Teslimat sorunu"
};

const stages: Record<string, number> = {
  WAITING: 0,
  PREPARING: 0,
  PACKED: 0,
  READY: 0,
  CREATED: 0,
  HANDED_OVER: 1,
  SHIPPED: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3
};

const stepLabels = [
  "Hazırlanıyor",
  "Kargoya verildi",
  "Yolda",
  "Teslim edildi"
];

function dateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" :
    new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeZone: "Europe/Istanbul"
    }).format(date);
}

function safeTracking(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" &&
      url.hostname === "sube.kolaygelsin.com" &&
      !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function ShipmentCardR408({ row }: { row: ShipmentRow }) {
  const status = String(row.dispatchStatus || row.status || "").toUpperCase();
  const current = stages[status] ?? -1;
  const label = states[status] || "Durum bekleniyor";
  const tracking = row.providerTrackingNumber || row.trackingNumber || "";
  const trackingUrl = safeTracking(row.providerTrackingUrl || row.trackingUrl);
  const carrier = row.providerName || row.carrier || "";
  const items = Array.isArray(row.items) ? row.items : [];

  return (
    <article className="student-portal__card student-shipment-card r408-shipment-card">
      <header className="r408-shipment-header">
        <div>
          <small>{row.orderId ? `Sipariş #${row.orderId.slice(0,8)}` : "Gönderi"}</small>
          <h2>{items.length === 1 ? items[0].titleSnapshot || "Fiziksel ürün" : "Eğitim materyalleri"}</h2>
          <span>{items.reduce((sum,item)=>sum+Number(item.quantity || 0),0)} ürün</span>
        </div>
        <strong className={`r408-shipment-status ${current === 3 ? "is-delivered" : current < 0 ? "is-special" : ""}`}>{label}</strong>
      </header>

      {current >= 0 ? (
        <ol className="r408-shipment-progress" aria-label="Gönderi ilerlemesi">
          {stepLabels.map((step,index)=>(
            <li key={step}
              className={`${index < current || current === 3 ? "is-done" : index === current ? "is-current" : "is-next"}`}
              aria-current={index === current ? "step" : undefined}>
              <span className="r408-progress-dot" aria-hidden="true">
                {index < current || current === 3 ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10"/></svg>
                ) : index === current ? <i/> : null}
              </span>
              <span className="r408-progress-label">{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="r408-shipment-attention" role="status">{label}</div>
      )}

      <div className="r408-shipment-products">
        <h3>Gönderilen ürünler</h3>
        {items.length ? items.map((item,index)=>(
          <div key={index}><span>{item.titleSnapshot || "Ürün"}</span><strong>{item.quantity || 0} adet</strong></div>
        )) : <p>Ürün bilgisi henüz mevcut değil.</p>}
      </div>

      <dl className="r408-shipment-data">
        <div><dt>Kargo firması</dt><dd>{carrier === "LOCAL_TEST" ? "Test taşıyıcısı" : carrier || "Henüz belirlenmedi"}</dd></div>
        <div><dt>Takip numarası</dt><dd>{tracking || "Henüz oluşturulmadı"}</dd></div>
        {dateLabel(row.createdAt) && <div><dt>Sipariş gönderi kaydı</dt><dd>{dateLabel(row.createdAt)}</dd></div>}
        {dateLabel(row.shippedAt) && <div><dt>Kargoya verilme</dt><dd>{dateLabel(row.shippedAt)}</dd></div>}
        {dateLabel(row.deliveredAt) && <div><dt>Teslimat tarihi</dt><dd>{dateLabel(row.deliveredAt)}</dd></div>}
      </dl>

      <footer className="r408-shipment-footer">
        {trackingUrl ? (
          <a href={trackingUrl} target="_blank" rel="noopener noreferrer">Kargomu takip et <span aria-hidden="true">↗</span></a>
        ) : (
          <p>Doğrulanmış takip bağlantısı oluşturulduğunda burada görünecektir.</p>
        )}
      </footer>
    </article>
  );
}