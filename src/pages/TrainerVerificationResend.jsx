import { useEffect, useState } from "react";

// This component only requests a new verification link. It does not create a
// session, approve an application, or bypass requireEmailVerification.
const WAIT_SECONDS = 90;
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);

export default function TrainerVerificationResend({ email = "", allowEmailInput = false, highlighted = false }) {
  const [typedEmail, setTypedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [availability, setAvailability] = useState("pending");
  const address = String(allowEmailInput ? typedEmail : email).trim().toLowerCase();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/verification-resend-capability", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active) setAvailability(payload?.available === true ? "available" : "disabled");
      })
      .catch(() => { if (active) setAvailability("disabled"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = window.setTimeout(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  async function requestVerification(event) {
    event.preventDefault();
    if (availability !== "available" || busy || secondsLeft > 0) return;
    if (!isEmail(address)) {
      setError(true);
      setNotice("Önce geçerli bir e-posta adresi yazın.");
      return;
    }
    setBusy(true);
    setNotice("");
    setError(false);
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address, callbackURL: "/ogretmen-girisi" }),
      });
      if (response.status === 429) {
        setSecondsLeft(WAIT_SECONDS);
        throw new Error("Çok fazla istek yapıldı. Lütfen daha sonra tekrar deneyin.");
      }
      if (!response.ok) throw new Error("Doğrulama bağlantısı şu anda istenemedi. Lütfen biraz sonra tekrar deneyin.");
      setSecondsLeft(WAIT_SECONDS);
      // Do not disclose whether the account exists or is already verified.
      setNotice("Bu adrese ait doğrulanmamış bir hesap varsa yeni doğrulama bağlantısı e-posta kutusuna gönderilecektir. Gerekiyorsa spam klasörünü kontrol edin.");
    } catch (cause) {
      setError(true);
      setNotice(cause instanceof Error ? cause.message : "İstek tamamlanamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  if (availability !== "available") return null;

  return <section className="auth-trainer-verification-resend" aria-label="Eğitmen e-posta doğrulama bağlantısı" style={{ margin: "18px 0", padding: "16px", border: highlighted ? "1px solid #f6a15f" : "1px solid #e4e8ef", borderRadius: 12, background: "#fafbfe" }}>
    <strong style={{ display: "block", fontSize: 14, marginBottom: 7, color: "#173050" }}>Doğrulama e-postası gelmedi mi?</strong>
    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#52657d", lineHeight: 1.5 }}>E-posta adresiniz doğrulanmadan eğitmen paneline giriş yapamazsınız. Yeni bağlantıyı kendiniz isteyebilirsiniz.</p>
    <form onSubmit={requestVerification}>
      {allowEmailInput && <label htmlFor="trainer-verification-email" style={{ display: "block", marginBottom: 10 }}>E-posta adresiniz
        <input id="trainer-verification-email" type="email" value={typedEmail} onChange={(event) => { setTypedEmail(event.target.value); setNotice(""); }} autoComplete="email" required maxLength={254} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6 }} />
      </label>}
      <button type="submit" disabled={busy || secondsLeft > 0 || !isEmail(address)} className="auth-secondary-button" style={{ width: "100%", borderRadius: 9, border: "1px solid #ef6b15", background: "#fff5ed", color: "#a94309", padding: "11px 14px", fontWeight: 700, cursor: busy || secondsLeft > 0 ? "not-allowed" : "pointer" }}>
        {busy ? "İstek gönderiliyor…" : secondsLeft > 0 ? `Yeniden iste (${secondsLeft} sn)` : "Doğrulama e-postasını yeniden gönder"}
      </button>
    </form>
    {notice && <p role={error ? "alert" : "status"} style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: error ? "#b42318" : "#31533d", lineHeight: 1.5 }}>{notice}</p>}
  </section>;
}
