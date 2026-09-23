import { useEffect, useState } from "react";

type Admin = { userId: string; displayName: string; email: string };
type Grant = { adminUserId: string; permission: string; revokedAt: string | null };
const permissionLabels = [
  ["PACKAGE_READ", "Paketleri görüntüle"],
  ["PACKAGE_CREATE", "Taslak oluştur"],
  ["PACKAGE_EDIT", "Paket içeriğini düzenle"],
  ["PACKAGE_PRICE_EDIT", "Fiyat değiştir"],
  ["PACKAGE_PUBLISH", "Yayımla / yayından kaldır"],
] as const;

export function OwnerAdminPackagePermissions() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const [usersResponse, grantsResponse] = await Promise.all([
      fetch("/api/admin/users?role=SUPER_ADMIN&pageSize=100", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/package-permissions", { credentials: "same-origin", cache: "no-store" }),
    ]);
    if (!usersResponse.ok || !grantsResponse.ok) throw new Error(grantsResponse.status === 503 ? "Yetki şeması henüz uygulanmadı." : "Yönetici yetkileri yüklenemedi.");
    const users = await usersResponse.json() as { users: Admin[] };
    const permissions = await grantsResponse.json() as { permissions: Grant[] };
    setAdmins(users.users || []);
    setGrants(permissions.permissions || []);
    setSelected((current) => current || users.users?.[0]?.userId || "");
  };
  useEffect(() => { void load().catch((cause) => setError(cause.message)); }, []);

  const change = async (permission: string, active: boolean) => {
    if (!selected) return;
    setBusy(permission); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/package-permissions", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminUserId: selected, permission, action: active ? "revoke" : "grant" }),
      });
      if (!response.ok) throw new Error("Yetki değiştirilemedi; işlem kaydedilmedi.");
      await load();
      setMessage(active ? "Yetki geri alındı ve denetim kaydı oluşturuldu." : "Yetki verildi ve denetim kaydı oluşturuldu.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Yetki değiştirilemedi."); }
    finally { setBusy(""); }
  };

  return <section className="panel-card" aria-label="Yönetici paket yetkileri">
    <h2>Yönetici Paket Yetkileri</h2>
    <p>Yalnız sahip hesabı bu yetkileri verebilir veya geri alabilir. Yönetici rolü tek başına paket yayımlama hakkı sağlamaz.</p>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <label>Yönetici seçin <select value={selected} onChange={(event) => setSelected(event.target.value)}>
      {admins.map((admin) => <option key={admin.userId} value={admin.userId}>{admin.displayName} · {admin.email}</option>)}
    </select></label>
    {selected && <div className="admin-package-permission-list">{permissionLabels.map(([permission, label]) => {
      const active = grants.some((grant) => grant.adminUserId === selected && grant.permission === permission && !grant.revokedAt);
      return <label key={permission}><input type="checkbox" checked={active} disabled={Boolean(busy || error)} onChange={() => void change(permission, active)} />{label}</label>;
    })}</div>}
  </section>;
}
