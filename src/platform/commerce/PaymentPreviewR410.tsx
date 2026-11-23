type Props = { amountMinor: number };

export default function PaymentPreviewR410({ amountMinor }: Props) {
  const total = Number.isSafeInteger(amountMinor) && amountMinor > 0
    ? amountMinor : 0;

  const first = Math.ceil(total / 2);
  const second = total - first;

  const money = (minor: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY"
    }).format(minor / 100);

  return (
    <section
      role="region"
      aria-label="Kartlı ödeme örnek görünümü"
      style={{
        marginTop: 16,
        padding: 18,
        border: "1px solid #dbe4ed",
        borderRadius: 12,
        background: "#f8fafc",
        display: "grid",
        gap: 12
      }}
    >
      <strong>Kartlı Ödeme Önizlemesi</strong>

      <p style={{ margin: 0 }}>
        Örnek görünüm. Kart tahsilatı kapalıdır.
        Gerçek kart bilgisi girmeyin.
      </p>

      <div style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))"
      }}>
        <label>
          Kart üzerindeki isim
          <input disabled placeholder="ÖRNEK KART SAHİBİ" />
        </label>
        <label>
          Kart numarası
          <input disabled placeholder="•••• •••• •••• ••••" />
        </label>
        <label>
          Son kullanma tarihi
          <input disabled placeholder="AA / YY" />
        </label>
        <label>
          Güvenlik kodu
          <input disabled placeholder="CVV" />
        </label>
      </div>

      <strong>2 Taksit Vade Farksız | Örnek Hesaplama</strong>

      <table>
        <thead>
          <tr>
            <th>Taksit</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1. taksit</td><td>{money(first)}</td></tr>
          <tr><td>2. taksit</td><td>{money(second)}</td></tr>
          <tr>
            <td><b>Toplam</b></td>
            <td><b>{money(total)}</b></td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: 0, fontSize: 12 }}>
        Bu tablo yalnızca örnektir. Gerçek taksit koşulları
        PayTR ve kart bankası tarafından doğrulanmalıdır.
        Bu ekrandan kartla ödeme alınmaz.
      </p>
    </section>
  );
}