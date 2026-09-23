import { useEffect, useState } from "react";
import { PanelShell } from "../../panel/layout/PanelShell";
import { TrainerIcon as PanelIcon } from "../components/TrainerIcon";
import "../earnings/trainer-earnings.css";

type Account = { configured: boolean; accountHolderName?: string; bankName?: string; iban?: string; ibanMasked?: string; note?: string };
export function TrainerPayoutAccountContent({ user }: { user: { id: string; name: string; email: string } }) {
  const [account, setAccount] = useState<Account>({ configured: false });
  const [form, setForm] = useState({ accountHolderName: user.name, bankName: "", iban: "", note: "" });
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/trainer/payout-account", { credentials: "same-origin" }).then(async (r) => { if (!r.ok) throw Error(); const b = await r.json(); setAccount(b.payoutAccount); if (b.payoutAccount?.configured) setForm({ accountHolderName: b.payoutAccount.accountHolderName || user.name, bankName: b.payoutAccount.bankName || "", iban: b.payoutAccount.iban || "", note: b.payoutAccount.note || "" }); }).catch(() => setMessage("Ödeme hesabı yüklenemedi."));
  useEffect(() => { void load(); }, []);
  const save = async (e: React.FormEvent) => { e.preventDefault(); const r = await fetch("/api/trainer/payout-account", { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const b = await r.json().catch(() => ({})); setMessage(r.ok ? "Ödeme hesabınız kaydedildi." : (b.errors ? Object.values(b.errors).filter(Boolean).join(" ") : "Ödeme hesabı kaydedilemedi.")); if (r.ok) setAccount(b.payoutAccount); };
  return <div className="payout-page">
    {message && <p className="payout-message" role="status">{message}</p>}
    <form className="earnings-card payout-account-form" onSubmit={(e) => void save(e)}>
      <h3><PanelIcon name="briefcase" size={26} />Ödeme hesabı bilgileri</h3>
      <div className="payout-form-grid">
        <label>Hesap sahibi<input required value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></label>
        <label>Banka<input required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></label>
        <label className="payout-field-wide">IBAN<input required inputMode="text" autoComplete="off" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" /><small>TR ile başlayan 26 haneli IBAN</small></label>
        <label className="payout-field-wide">Not <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="İsteğe bağlı not" /></label>
      </div>
      <button type="submit"><PanelIcon name="save" size={22} />Ödeme hesabımı kaydet</button>
    </form>
    <aside className="payout-rail" aria-label="Ödeme hesabı bilgileri ve açıklamalar">
      <div className="payout-security" role="note"><PanelIcon name="info" size={24} /><div><strong>Bilgileriniz güvende</strong><p>IBAN bilginiz yalnızca güvenli ödeme işlemleri için kullanılır ve listelerde maskelenir.</p></div></div>
      <section className="payout-rail-card"><h3><PanelIcon name="wallet" size={24} />Kayıtlı hesap</h3>{account.configured ? <div className="payout-preview"><span>Kayıtlı hesap önizlemesi</span><strong>{account.accountHolderName} · {account.bankName}</strong><code>{account.ibanMasked}</code></div> : <p>Henüz kayıtlı bir ödeme hesabınız bulunmuyor.</p>}</section>
      <section className="payout-rail-card"><h3><PanelIcon name="info" size={24} />Bilgilendirme</h3><p>Ödeme talebi ve banka aktarımı bu fazda kullanılabilir değildir.</p></section>
    </aside>
  </div>;
}

export function TrainerPayoutAccountPage({ user }: { user: { id: string; name: string; email: string } }) { return <PanelShell user={user}><main className="trainer-earnings-page"><TrainerPayoutAccountContent user={user} /></main></PanelShell>; }
