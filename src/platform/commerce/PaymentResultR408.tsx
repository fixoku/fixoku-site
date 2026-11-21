import { Link } from "react-router-dom";
import "./fixoku-payment-result-r408.css";

type Props = {
  status: string;
  paymentMethod: string;
  reference: string;
  total: string;
  packages: string[];
  returnPath: string;
  returnLabel: string;
};

export function PaymentResultR408(props: Props) {
  const paid = props.status === "PAID";
  const pending = ["PENDING_PAYMENT","PAYMENT_REVIEW"].includes(props.status);
  const bankPending = pending && props.paymentMethod === "BANK_TRANSFER";
  const positive = paid || bankPending;

  const title = paid
    ? "Ödemeniz başarıyla tamamlandı!"
    : bankPending
      ? "Ödeme bildiriminiz alındı!"
      : "Siparişinizin ödeme durumu";

  const description = paid
    ? "Ödemeniz doğrulandı. Paketinizin durumunu hesabınızdan görüntüleyebilirsiniz."
    : bankPending
      ? "Banka transferiniz doğrulandıktan sonra eğitim paketiniz erişime açılacaktır."
      : "Siparişiniz için yeni bir ödeme yapmadan önce hesabınızdaki güncel durumu kontrol edin.";

  const label = paid
    ? "Ödeme tamamlandı"
    : bankPending
      ? "Ödeme doğrulaması bekleniyor"
      : ({
          REJECTED:"Ödeme reddedildi",
          CANCELLED:"Sipariş iptal edildi",
          REFUNDED:"Ödeme iade edildi",
          PAYMENT_FAILED:"Ödeme tamamlanamadı"
        } as Record<string,string>)[props.status] || "İnceleme gerekiyor";

  return (
    <section className="r408-payment-result" aria-labelledby="r408-payment-result-title">
      <header>
        <div className={`r408-result-icon ${positive?"positive":"neutral"}`} aria-hidden="true">
          {positive ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m5 12 5 5 9-10"/></svg> : "!"}
        </div>
        <h2 id="r408-payment-result-title">{title}</h2>
        <p>{description}</p>
        <small>{paid?"Ödenen toplam tutar":"Sipariş toplam tutarı"}</small>
        <strong className="r408-result-total">{props.total}</strong>
        <span className={`r408-result-status ${paid?"paid":bankPending?"pending":"closed"}`}>{label}</span>
      </header>

      <div className="r408-result-reference">
        <small>Sipariş referansı</small>
        <strong>{props.reference}</strong>
      </div>

      {props.packages.length > 0 && (
        <div className="r408-result-packages">
          <h3>Sipariş kapsamı</h3>
          <ul>{props.packages.map((title,index)=><li key={index}>{title}</li>)}</ul>
        </div>
      )}

      {bankPending && (
        <div className="r408-result-timeline">
          <h3>Ödeme süreciniz</h3>
          <ol>
            <li className="complete"><span aria-hidden="true">✓</span><div><strong>Ödeme bildirimi alındı</strong><small>Bilgileriniz kaydedildi.</small></div></li>
            <li className="current"><span aria-hidden="true">2</span><div><strong>Banka transferi doğrulanacak</strong><small>Yönetici kontrolü bekleniyor.</small></div></li>
            <li><span aria-hidden="true">3</span><div><strong>Eğitim erişimi açılacak</strong><small>Ödeme onaylandıktan sonra.</small></div></li>
          </ol>
        </div>
      )}

      <Link className="r408-result-return" to={props.returnPath}>{props.returnLabel}</Link>
    </section>
  );
}