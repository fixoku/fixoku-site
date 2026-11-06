import { useEffect, useRef, useState, type FormEvent } from "react";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon as PanelIcon } from "../components/TrainerIcon";
import "../earnings/trainer-earnings.css";

// FIXOKU_PAYOUT_AUTO_BANK_R12: TCMB IBAN positions 5-9, selected code mappings.
// Names/codes must be reviewed when TCMB's payment-system participant list changes.
const BANK_BY_CODE: Record<string, string> = {
  "00010": "T.C. Ziraat Bankası A.Ş.",
  "00012": "Türkiye Halk Bankası A.Ş.",
  "00015": "Türkiye Vakıflar Bankası T.A.O.",
  "00032": "Türk Ekonomi Bankası A.Ş.",
  "00046": "Akbank T.A.Ş.",
  "00059": "Şekerbank T.A.Ş.",
  "00062": "Türkiye Garanti Bankası A.Ş.",
  "00064": "Türkiye İş Bankası A.Ş.",
  "00067": "Yapı ve Kredi Bankası A.Ş.",
  "00099": "ING Bank A.Ş.",
  "00103": "Fibabanka A.Ş.",
  "00111": "QNB Bank A.Ş.",
  "00123": "HSBC Bank A.Ş.",
  "00124": "Alternatifbank A.Ş.",
  "00125": "Burgan Bank A.Ş.",
  "00134": "DenizBank A.Ş.",
  "00135": "Anadolubank A.Ş.",
  "00146": "Odea Bank A.Ş.",
  "00157": "Enpara Bank A.Ş.",
  "00203": "Albaraka Türk Katılım Bankası A.Ş.",
  "00205": "Kuveyt Türk Katılım Bankası A.Ş.",
  "00206": "Türkiye Finans Katılım Bankası A.Ş.",
  "00209": "Ziraat Katılım Bankası A.Ş.",
  "00210": "Vakıf Katılım Bankası A.Ş.",
  "00211": "Türkiye Emlak Katılım Bankası A.Ş.",
};

const normalizeIban = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/gu, "").slice(0, 26);
const formatIban = (value: string) => normalizeIban(value).replace(/(.{4})/gu, "$1 ").trim();
function validTrIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^TR[0-9]{2}[0-9]{5}0[A-Z0-9]{16}$/u.test(iban)) return false;
  let remainder = 0;
  for (const char of `${iban.slice(4)}${iban.slice(0, 4)}`) {
    const digits = char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

type Account = { configured: boolean; accountHolderName?: string; bankName?: string; iban?: string; ibanMasked?: string; note?: string };
type Notice = { kind: "success" | "error" | "info"; text: string } | null;
export function TrainerPayoutAccountContent({ user }: { user: { id: string; name: string; email: string } }) {
  const [account, setAccount] = useState<Account>({ configured: false });
  const [form, setForm] = useState({ accountHolderName: user.name, bankName: "", iban: "", note: "" });
  const [manualBank, setManualBank] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedback = (kind: "success" | "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), kind === "error" ? 7500 : 4000);
  };
  useEffect(() => {
    let active = true;
    fetch("/api/trainer/payout-account", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw Error(); return r.json(); })
      .then((body) => {
        if (!active) return;
        const a: Account = body.payoutAccount ?? { configured: false };
        setAccount(a);
        if (a.configured) {
          setForm({ accountHolderName: user.name, bankName: a.bankName || "", iban: a.iban || "", note: a.note || "" });
          if (!BANK_BY_CODE[normalizeIban(a.iban || "").slice(4, 9)]) setManualBank(a.bankName || "");
        }
      })
      .catch(() => { if (active) feedback("error", "Ödeme hesabı yüklenemedi."); });
    return () => { active = false; if (noticeTimer.current) clearTimeout(noticeTimer.current); };
  }, [user.name]);

  // Read the actual trainer profile. The stored payout name must not override it.
  useEffect(() => {
    let active = true;
    fetch("/api/trainer/profile", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw Error("PROFILE_READ_FAILED"); return r.json(); })
      .then((body) => {
        if (!active) return;
        const p = body.profile;
        const fullName = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
        if (fullName) setForm((old) => ({ ...old, accountHolderName: fullName }));
      })
      .catch(() => { /* Keep authenticated session name if profile is unavailable. */ });
    return () => { active = false; };
  }, [user.id]);

  const iban = normalizeIban(form.iban);
  const bankCode = iban.length >= 9 ? iban.slice(4, 9) : "";
  const detectedBank = bankCode ? BANK_BY_CODE[bankCode] : undefined;
  const valid = validTrIban(iban);
  const unknownBank = iban.length >= 9 && !detectedBank;
  const actualBank = detectedBank || (unknownBank ? manualBank.trim() : "");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (form.accountHolderName.trim().length < 2) return feedback("error", "Hesap sahibi adını kontrol edin.");
    if (!valid) return feedback("error", "Geçerli, 26 karakterli bir Türkiye IBAN'ı girin.");
    if (!actualBank) return feedback("error", "Banka tanınamadı. Banka adını girin.");
    setSaving(true);
    setSaved(false);
    try {
      const r = await fetch("/api/trainer/payout-account", {
        method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountHolderName: form.accountHolderName.trim(), bankName: actualBank, iban, note: form.note }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.payoutAccount?.configured) throw Error("SAVE_FAILED");
      setAccount(body.payoutAccount);
      setForm((old) => ({ ...old, bankName: actualBank, iban }));
      setSaved(true);
      feedback("success", "Ödeme hesabınız kaydedildi.");
    } catch {
      feedback("error", "Ödeme hesabınız kaydedilemedi.");
    } finally { setSaving(false); }
  }

  return <div className="payout-page">
    <form className="earnings-card payout-account-form" onSubmit={(e) => void save(e)}>
      <h3><PanelIcon name="briefcase" size={26} />Ödeme hesabı bilgileri</h3>
      <div className="payout-form-grid">
        <label>Hesap sahibi<input required readOnly value={form.accountHolderName} title="Eğitmen profilindeki ad ve soyad" /></label>
        <label className="payout-field-wide">IBAN
          <span className="fixoku-auto-iban-wrap">
            <PanelIcon name="wallet" size={21} />
            <input required inputMode="text" autoComplete="off" spellCheck={false} maxLength={33} value={formatIban(form.iban)} onChange={(e) => { setSaved(false); setManualBank(""); setForm({ ...form, iban: normalizeIban(e.target.value), bankName: "" }); }} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </span>
          {iban.length === 26 && !valid && <small className="fixoku-auto-iban-error">IBAN geçersiz.</small>}
        </label>
                {/* FIXOKU_R13_AUTO_BANK_CARD: only appear for a mathematically valid IBAN. */}
        {valid && detectedBank && (
          <div className="fixoku-r13-bank-card payout-field-wide" role="status" aria-label="IBAN bankası tanındı">
            <PanelIcon name="briefcase" size={24} />
            <strong>{detectedBank}</strong>
            <PanelIcon name="check-circle" size={24} />
          </div>
        )}
        {valid && unknownBank && (
          <label className="payout-field-wide fixoku-r13-fallback">
            Banka kodu tanınamadı. Banka adını yazın
            <input required value={manualBank} maxLength={120} onChange={(e) => { setSaved(false); setManualBank(e.target.value); }} placeholder="Banka resmi adı" />
          </label>
        )}

      </div>
      <div className="fixoku-auto-save-area">
        {notice && <div className={`fixoku-auto-toast is-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} aria-live="polite"><PanelIcon name={notice.kind === "success" ? "check-circle" : "info"} size={19} />{notice.text}</div>}
        <button type="submit" disabled={saving} className="fixoku-auto-save-button"><PanelIcon name="save" size={21} />{saving ? "Kaydediliyor..." : saved ? "Ödeme hesabınız kaydedildi" : "Ödeme hesabımı kaydet"}</button>
      </div>
    </form>
    <aside className="payout-rail" aria-label="Ödeme hesabı bilgileri ve açıklamalar">
      <div className="payout-security" role="note"><PanelIcon name="info" size={24} /><div><strong>Bilgileriniz güvende</strong><p>IBAN bilginiz yalnızca güvenli ödeme işlemleri için kullanılır ve listelerde maskelenir.</p></div></div>
      <section className="payout-rail-card"><h3><PanelIcon name="wallet" size={24} />Kayıtlı hesap</h3>{account.configured ? <div className="payout-preview"><span>Kayıtlı hesap önizlemesi</span><strong>{account.accountHolderName} · {account.bankName}</strong><code>{account.ibanMasked}</code></div> : <p>Henüz kayıtlı bir ödeme hesabınız bulunmuyor.</p>}</section>
      <section className="payout-rail-card"><h3><PanelIcon name="info" size={24} />Bilgilendirme</h3><p>Ödeme talebi ve banka aktarımı bu fazda kullanılabilir değildir.</p></section>
    </aside>
  </div>;
}
export function TrainerPayoutAccountPage({ user }: { user: { id: string; name: string; email: string } }) { return <PanelShell user={user}><main className="trainer-earnings-page"><TrainerPayoutAccountContent user={user} /></main></PanelShell>; }