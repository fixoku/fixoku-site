import { useState } from "react";

type Reason =
  | "NOT_RECEIVED"
  | "PARTIAL_PAYMENT"
  | "PROOF_REQUEST";

type Props = {
  orderId: string;
  totalMinor: number;
  currency: string;
  onQueued: () => void;
};

export function StudentBankTransferFollowUp({
  orderId,
  totalMinor,
  currency,
  onQueued
}: Props) {
  const [reason, setReason] =
    useState<Reason>("NOT_RECEIVED");
  const [received, setReceived] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (busy) return;

    const minor = reason === "PARTIAL_PAYMENT"
      ? Math.round(Number(received.replace(",", ".")) * 100)
      : 0;

    if (reason === "PARTIAL_PAYMENT" &&
        (!Number.isSafeInteger(minor) ||
         minor <= 0 || minor >= totalMinor)) {
      setMessage(
        "Alinan tutar sifirdan buyuk ve siparis " +
        "tutarindan kucuk olmalidir."
      );
      return;
    }

    if (!window.confirm(
      "Musteriye havale/EFT takip e-postasi " +
      "gonderim kuyruguna alinsin mi?"
    )) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/student-bank-transfers",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            orderId,
            action: "FOLLOW_UP",
            reason,
            receivedMinor: minor,
            note
          })
        }
      );

      const body = await response.json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body.error === "FOLLOW_UP_COOLDOWN_24H"
            ? "Son 24 saatte takip mesaji olusturuldu."
            : body.error || "Islem basarisiz."
        );
      }

      setMessage(
        "E-posta kuyruga alindi. SMTP teslimati " +
        "ayrica dogrulanmalidir."
      );
      setReceived("");
      setNote("");
      onQueued();
    } catch (error) {
      setMessage(String((error as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: "grid",
      gap: 6,
      minWidth: 190
    }}>
      <label>
        Odeme durumu
        <select
          aria-label="Havale takip nedeni"
          value={reason}
          disabled={busy}
          onChange={(e) => {
            setReason(e.target.value as Reason);
            setMessage("");
          }}
        >
          <option value="NOT_RECEIVED">
            Hesaba henuz yansimadi
          </option>
          <option value="PARTIAL_PAYMENT">
            Eksik odeme alindi
          </option>
          <option value="PROOF_REQUEST">
            Dekont / bilgi iste
          </option>
        </select>
      </label>

      {reason === "PARTIAL_PAYMENT" && (
        <label>
          Hesaba gecen tutar ({currency})
          <input
            type="text"
            inputMode="decimal"
            value={received}
            maxLength={15}
            placeholder="Orn. 5000"
            onChange={(e) =>
              setReceived(e.target.value)}
          />
        </label>
      )}

      <label>
        Istege bagli not
        <input
          type="text"
          value={note}
          maxLength={500}
          placeholder="Musteriye not"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="admin-secondary-button"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy
          ? "Kaydediliyor..."
          : "Musteriye e-posta hazirla ve siraya al"}
      </button>

      {message && <small role="status">
        {message}
      </small>}
    </div>
  );
}