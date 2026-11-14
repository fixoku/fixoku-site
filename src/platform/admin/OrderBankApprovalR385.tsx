import { useRef, useState } from "react";

type Order = {
  id: string;
  kind: "STUDENT" | "TRAINER";
  status: string;
  currency: string;
  totalMinor: number;
  customerName: string;
  packageTitle: string;
  paymentMethod: string | null;
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency
  }).format(minor / 100);

export function OrderBankApprovalR385({
  order,
  onApproved
}: {
  order: Order;
  onApproved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  const normalized = amount.trim().replace(",", ".");
  const validAmount = /^\d+(\.\d{1,2})?$/.test(normalized);

  const receivedAmountMinor = validAmount
    ? Math.round(Number(normalized) * 100)
    : 0;

  const exact =
    validAmount &&
    Number.isSafeInteger(receivedAmountMinor) &&
    receivedAmountMinor > 0 &&
    receivedAmountMinor === order.totalMinor;

  const ready =
    exact &&
    reference.trim().length >= 3 &&
    reference.trim().length <= 160 &&
    verified &&
    !busy &&
    !done;

  if (
    order.paymentMethod !== "BANK_TRANSFER" ||
    !["PENDING_PAYMENT", "PAYMENT_REVIEW"].includes(order.status)
  ) return null;

  async function approve() {
    if (!ready || lock.current) return;

    lock.current = true;
    setBusy(true);
    setMessage("");

    try {
      const endpoint = order.kind === "STUDENT"
        ? "/api/admin/student-bank-transfers"
        : "/api/admin/trainer-bank-transfers";

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId: order.id,
          action: "APPROVE",
          receivedAmountMinor,
          bankTransactionReference: reference.trim(),
          bankVerified: true
        })
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.status !== "APPROVED") {
        const code = String(body.error || "APPROVAL_FAILED");

        const errors: Record<string, string> = {
          BANK_TRANSFER_REFERENCE_ALREADY_USED:
            "Bu banka i\u015flem referans\u0131 ba\u015fka bir sipari\u015fte kullan\u0131lm\u0131\u015f.",
          BANK_TRANSFER_REFERENCE_INVALID:
            "Banka i\u015flem referans\u0131 ge\u00e7ersiz.",
          BANK_TRANSFER_AMOUNT_MISMATCH:
            "Banka tutar\u0131 sipari\u015fle e\u015fle\u015fmiyor.",
          BANK_TRANSFER_NOT_FOUND:
            "Havale bildirimi bulunamad\u0131.",
          FORBIDDEN:
            "Bu i\u015flem i\u00e7in yetkiniz bulunmuyor.",
          OWNER_ONLY:
            "Bu i\u015flemi yaln\u0131zca Owner yapabilir.",
          BANK_TRANSFER_NOT_REVIEWABLE:
            "Sipari\u015f art\u0131k onay beklemiyor.",
          BANK_TRANSFER_VERIFICATION_REQUIRED:
            "Banka kontrol bilgileri eksik."
        };

        throw new Error(
          errors[code] || `Onay tamamlanamad\u0131 (${code}).`
        );
      }

      setDone(true);
      setMessage("\u00d6deme onayland\u0131.");
      onApproved();

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "\u0130\u015flem tamamlanamad\u0131."
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <section
      className="fixoku-owner-bank-r385"
      aria-label="Havale EFT onayi"
    >
      <header>
        <h3>{"Havale / EFT Onay\u0131"}</h3>
        <span className="fixoku-owner-bank-status-r385">
          {done ? "Onayland\u0131" : "\u00d6deme bekleniyor"}
        </span>
      </header>

      <div className="fixoku-owner-bank-summary-r385">
        <div>
          <small>{"M\u00fc\u015fteri"}</small>
          <strong>{order.customerName}</strong>
        </div>

        <div>
          <small>{"Sipari\u015f numaras\u0131"}</small>
          <strong>{order.id.slice(0,8).toUpperCase()}</strong>
        </div>

        <div>
          <small>{"E\u011fitim paketi"}</small>
          <strong>{order.packageTitle}</strong>
        </div>

        <div>
          <small>{"Sipari\u015f tutar\u0131"}</small>
          <strong className="fixoku-owner-bank-price-r385">
            {money(order.totalMinor,order.currency)}
          </strong>
        </div>
      </div>

      <div className="fixoku-owner-bank-fields-r385">
        <label>
          <span>{"Bankaya ula\u015fan ger\u00e7ek tutar (TL)"}</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="11990,00"
            value={amount}
            disabled={busy || done}
            onChange={e=>setAmount(e.target.value)}
          />
        </label>

        <label>
          <span>{"Banka i\u015flem / dekont referans\u0131"}</span>
          <input
            type="text"
            maxLength={160}
            value={reference}
            disabled={busy || done}
            placeholder="Banka islem numarasi"
            onChange={e=>setReference(e.target.value)}
          />
        </label>
      </div>

      <div className="fixoku-owner-bank-difference-r385">
        <span>{"Eksik \u00f6deme"}</span>
        <strong>
          {money(
            Math.max(0,order.totalMinor-receivedAmountMinor),
            order.currency
          )}
        </strong>
      </div>

      {amount && !exact && (
        <p className="fixoku-owner-bank-error-r385" role="alert">
          {"Girilen tutar sipari\u015f tutar\u0131yla e\u015fle\u015fmiyor."}
        </p>
      )}

      <label className="fixoku-owner-bank-check-r385">
        <input
          type="checkbox"
          checked={verified}
          disabled={busy || done}
          onChange={e=>setVerified(e.target.checked)}
        />
        <span>
          {"Banka hesab\u0131na ula\u015fan \u00f6demeyi kontrol ettim."}
        </span>
      </label>

      {message && (
        <p role="status" className={done
          ? "fixoku-owner-bank-success-r385"
          : "fixoku-owner-bank-error-r385"}>
          {message}
        </p>
      )}

      <button
        type="button"
        className="fixoku-owner-bank-approve-r385"
        disabled={!ready}
        onClick={()=>void approve()}
      >
        {busy
          ? "Onaylan\u0131yor..."
          : done
            ? "\u00d6deme onayland\u0131"
            : "\u2713 \u00d6demeyi onayla"}
      </button>
    </section>
  );
}