import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { AdminDataTable, type AdminTableFeatures } from "./AdminDataTable";
import { PanelIcon } from "../panel/components/PanelIcon";
import "./admin-panel.css";
import "./user-operations-owner-v3.css";

type Membership = { role: string; status: string; scopeType: string };
type UserRow = {
  userId: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  memberships: Membership[];
};
type Response = {
  users: UserRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
};
type LegacyTrainerInvitation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
  inviteStatus: "PENDING" | "ACTIVATED" | "EXPIRED";
};
type LifecycleResponse = {
  legacyTrainerInvitations: LegacyTrainerInvitation[];
};

const roleLabels: Record<string, string> = {
  OWNER: "owner",
  SUPER_ADMIN: "yönetici",
  TRAINER: "eğitmen",
  STUDENT: "öğrenci",
};
const statusLabels: Record<string, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Askıya Alındı",
  REVOKED: "İptal Edildi",
};
const invitationStatusLabels: Record<string, string> = {
  PENDING: "Davet bekleniyor",
  ACTIVATED: "Hesap etkinleştirildi",
  EXPIRED: "Süresi doldu",
};


const ADMIN_AREA_DRAFT_OPTIONS = [
  { id: "orders", title: "Siparişler", group: "Satışlar", icon: "orders" },
  { id: "offers", title: "Özel Teklifler", group: "Satışlar", icon: "offers" },
  { id: "payouts", title: "Öğretmen Hakedişleri", group: "Satışlar", icon: "payouts" },
  { id: "students", title: "Öğrenci Yönetimi", group: "Eğitim Operasyonu", icon: "students" },
  { id: "assignments", title: "Birebir ve Grup Atamaları", group: "Eğitim Operasyonu", icon: "assignments" },
  { id: "trainers", title: "Eğitmen Yönetimi", group: "Eğitmenler", icon: "trainers" },
  { id: "catalog", title: "Ürün ve Paket Kataloğu", group: "Katalog", icon: "catalog" },
  { id: "shipments", title: "Kargo ve Gönderiler", group: "Operasyon", icon: "shipments" },
  { id: "integrations", title: "Entegrasyon Durumu", group: "Sistem", icon: "integrations" },
  { id: "audits", title: "Denetim Kayıtları", group: "Sistem", icon: "audits" },
  { id: "userAccess", title: "Kullanıcı ve Erişim Yönetimi", group: "Sistem", icon: "userAccess" },
] as const;

type AdminAreaDraftIcon = typeof ADMIN_AREA_DRAFT_OPTIONS[number]["icon"];

function AdminAreaIcon({ name }: { name: AdminAreaDraftIcon }) {
  switch (name) {
    case "orders":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 6.5h12l-1.1 6.4a2 2 0 0 1-2 1.6H9.3a2 2 0 0 1-2-1.6L6 5H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="18.5" r="1.25" fill="currentColor"/><circle cx="16" cy="18.5" r="1.25" fill="currentColor"/></svg>;
    case "offers":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.8 12 12 4.8l7.2 7.2-7.2 7.2L4.8 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><path d="m9.7 14.3 4.6-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "payouts":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="6" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M9.2 10.1c.2-.7.9-1.1 1.8-1.1 1 0 1.8.5 1.8 1.3 0 .7-.5 1.1-1.7 1.4-1.2.3-1.9.7-1.9 1.5 0 .9.8 1.5 2 1.5.9 0 1.6-.3 1.9-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "students":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.2 12 5l8 4.2L12 13.3 4 9.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M7 11.2v3.1c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-3.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "assignments":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="13" y="12.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M11 8.2h2.2c1.4 0 2.5 1.1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "trainers":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M6.5 18.2a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="m17.3 6.7 1.2 1.2 2.2-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "catalog":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 5.5A2.5 2.5 0 0 1 8.5 3H18v16.5h-9.5A2.5 2.5 0 0 0 6 22V5.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M6 6h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "shipments":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 8.5h10v8h-10z" stroke="currentColor" strokeWidth="1.8"/><path d="M14.5 10h3.2l1.8 2.4v4.1h-5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="8" cy="18" r="1.4" fill="currentColor"/><circle cx="17" cy="18" r="1.4" fill="currentColor"/></svg>;
    case "integrations":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.8v3.1M12 17.1v3.1M4.9 12H8M16 12h3.1M6.6 6.6l2.2 2.2M15.2 15.2l2.2 2.2M17.4 6.6l-2.2 2.2M8.8 15.2l-2.2 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8"/></svg>;
    case "audits":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4.8h8l3 3V19a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 19V6.6A1.8 1.8 0 0 1 7.8 4.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 10.2h4M10 13.3h4M10 16.4h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "userAccess":
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M4.8 17a4.6 4.6 0 0 1 8.4-1.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.3 11.3 19.2 14l-2.9 2.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.8 14h5.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    default:
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/></svg>;
  }
}


async function loadUsers(params: URLSearchParams) {
  const response = await fetch(`/api/admin/users?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error();
  return response.json() as Promise<Response>;
}

async function loadLifecycle() {
  const response = await fetch("/api/admin/account-lifecycle", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error();
  return response.json() as Promise<LifecycleResponse>;
}

export function AdminUserOperationsPage({ uiRole }: { uiRole: "OWNER" | "ADMIN" }) {
  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [activeSection, setActiveSection] = useState<"students" | "trainers" | "adminInvites">("students");
  const [trainerInviteModalOpen, setTrainerInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatus, setInviteStatus] = useState("all");

  const [adminInvitationEmail, setAdminInvitationEmail] = useState("");
  const [adminAreaDraft, setAdminAreaDraft] = useState<string[]>([]);

  const [trainerInvite, setTrainerInvite] = useState({ firstName: "", lastName: "", email: "" });
  const [trainerInviteMessage, setTrainerInviteMessage] = useState("");
  const [trainerInviteError, setTrainerInviteError] = useState("");
  const [trainerInviteSubmitting, setTrainerInviteSubmitting] = useState(false);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      sort: sorting[0]?.id || "createdAt",
      direction: sorting[0]?.desc === false ? "asc" : "desc",
    });
    if (search.trim()) value.set("search", search.trim());
    const effectiveRole = activeSection === "trainers" ? "TRAINER" : "STUDENT";
    if (effectiveRole) value.set("role", effectiveRole);
    if (membershipStatus) value.set("membershipStatus", membershipStatus);
    return value;
  }, [activeSection, membershipStatus, page, search, sorting]);

  const query = useQuery({
    queryKey: ["admin-users", params.toString()],
    queryFn: () => loadUsers(params),
    enabled: activeSection !== "adminInvites",
  });

  const trainerTotals = useQuery({
    queryKey: ["admin-user-access", "trainer-totals-v4"],
    queryFn: () => loadUsers(new URLSearchParams({ page: "1", pageSize: "1", role: "TRAINER", sort: "createdAt", direction: "desc" })),
  });
  const studentTotals = useQuery({
    queryKey: ["admin-user-access", "student-totals-v4"],
    queryFn: () => loadUsers(new URLSearchParams({ page: "1", pageSize: "1", role: "STUDENT", sort: "createdAt", direction: "desc" })),
  });

  const lifecycle = useQuery({
    queryKey: ["admin-account-lifecycle"],
    queryFn: loadLifecycle,
  });

  const verifiedTick = (verified: boolean) => verified ? (
    <span className="user-owner-v4-verified" role="img" aria-label="E-posta doğrulandı" title="E-posta doğrulandı">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.3 14.9 4l3.3.4.5 3.2 2.1 2.6-1.3 3 0 3.2-3 1.2-2 2.4-3.1-.8-3.1.8-2-2.4-3-1.2v-3.2l-1.3-3 2.1-2.6.5-3.2L9.1 4 12 2.3Z" fill="#2384ef" />
        <path d="m8.1 11.9 2.6 2.6 5.2-5.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : null;

  const columns = useMemo<ColumnDef<AdminTableFeatures, UserRow, any>[]>(() => [
    {
      accessorKey: "displayName",
      header: "Kullanıcı",
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <strong className="user-owner-v4-verified-name">{row.original.displayName} {verifiedTick(row.original.emailVerified)}</strong>
          <small>{row.original.email}</small>
        </>
      ),
    },
    {
      accessorKey: "memberships",
      header: "Rol / Roller",
      enableSorting: false,
      cell: ({ row }) => row.original.memberships.length
        ? row.original.memberships.map((item) => roleLabels[item.role] || "Tanımlanmamış").join(", ")
        : "Atanmadı",
    },
    {
      id: "membershipStatus",
      header: "Üyelik Durumu",
      enableSorting: false,
      cell: ({ row }) => row.original.memberships.length
        ? row.original.memberships.map((item) => statusLabels[item.status] || item.status).join(", ")
        : "Üyelik yok",
    },
    {
      accessorKey: "emailVerified",
      header: "E-posta Doğrulama",
      enableSorting: false,
      cell: ({ getValue }) => getValue() ? "Doğrulandı" : "Doğrulanmadı",
    },
    {
      accessorKey: "createdAt",
      header: "Kayıt Tarihi",
      cell: ({ getValue }) => new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(getValue())),
    },
  ], []);

  const sendLegacyTrainerInvitation = async () => {
    const firstName = trainerInvite.firstName.trim();
    const lastName = trainerInvite.lastName.trim();
    const email = trainerInvite.email.trim().toLowerCase();

    setTrainerInviteMessage("");
    setTrainerInviteError("");

    if (!firstName || !lastName) {
      setTrainerInviteError("Ad ve soyad alanlarını doldurun.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      setTrainerInviteError("Geçerli bir e-posta adresi girin.");
      return;
    }

    setTrainerInviteSubmitting(true);
    try {
      const response = await fetch("/api/admin/account-lifecycle/trainer-invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 201) {
        setTrainerInvite({ firstName: "", lastName: "", email: "" });
        setTrainerInviteMessage(
          "Eğitmen daveti gönderildi. Bağlantı 48 saat geçerlidir; öğretmen yalnızca şifresini oluşturacaktır.",
        );
        await lifecycle.refetch();
        void trainerTotals.refetch();
        setTrainerInviteModalOpen(false);
        return;
      }

      const code = String(payload.error || "");
      if (response.status === 409 && code === "ACCOUNT_ALREADY_EXISTS") {
        setTrainerInviteError("Bu e-posta adresiyle zaten bir platform hesabı bulunuyor.");
      } else if (response.status === 409 && code === "INVITATION_ALREADY_EXISTS") {
        setTrainerInviteError("Bu e-posta adresi için hâlâ geçerli bir eğitmen daveti bulunuyor.");
      } else if (response.status === 409 && code === "TRAINER_APPLICATION_EXISTS") {
        setTrainerInviteError("Bu e-posta adresi için mevcut bir eğitmen başvurusu bulunuyor. Başvuru sürecinden onaylayın.");
      } else if (response.status === 403) {
        setTrainerInviteError("Eski eğitmen daveti yalnızca sistem sahibi tarafından gönderilebilir.");
      } else {
        setTrainerInviteError("Eğitmen daveti gönderilemedi. Lütfen tekrar deneyin.");
      }
    } catch {
      setTrainerInviteError("Eğitmen daveti gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setTrainerInviteSubmitting(false);
    }
  };

  const legacyInvitations = lifecycle.data?.legacyTrainerInvitations || [];

  const visibleUsers = (query.data?.users || []).filter((user) => (
    verificationFilter === "all" || (verificationFilter === "verified" ? user.emailVerified : !user.emailVerified)
  ));
  const pendingInvites = legacyInvitations.filter((item) => item.inviteStatus === "PENDING").length;
  const visibleInvitations = legacyInvitations.filter((item) => {
    const matchesText = `${item.firstName} ${item.lastName} ${item.email}`.toLocaleLowerCase("tr-TR").includes(inviteSearch.toLocaleLowerCase("tr-TR"));
    return matchesText && (inviteStatus === "all" || inviteStatus === item.inviteStatus);
  });
  const displayColumns = useMemo<ColumnDef<AdminTableFeatures, UserRow, any>[]>(() => [
    ...columns,
    {
      id: "actions",
      header: "İşlem",
      enableSorting: false,
      cell: ({ row }) => <button type="button" className="user-owner-v3-view" onClick={() => setSelectedUser(row.original)}>Ayrıntılar <span aria-hidden="true">→</span></button>,
    },
  ], [columns]);
  useEffect(() => {
    if (!selectedUser) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedUser(null); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [selectedUser]);
  const niceDate = (date: string) => {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? "Tarih bilinmiyor" : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
  };
  const refreshAll = () => {
    void query.refetch(); void lifecycle.refetch();
    void trainerTotals.refetch(); void studentTotals.refetch();
  };
  const chooseSection = (section: typeof activeSection) => {
    setActiveSection(section);
    setPage(1);
    setSelectedUser(null);
  };
  useEffect(() => {
    if (!trainerInviteModalOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !trainerInviteSubmitting) setTrainerInviteModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [trainerInviteModalOpen, trainerInviteSubmitting]);

  return (
    <main className="platform-foundation-panel admin-panel admin-user-operations-page user-ops-v2 user-owner-v3">
      <header className="user-owner-v3-heading">
        <div>
          <span className="user-owner-v3-eyebrow">KULLANICI YÖNETİMİ</span>
          <h1>Kullanıcı &amp; Erişim</h1>
          <p>Öğrenci ve öğretmen hesaplarını inceleyin, yönetici erişimini planlayın.</p>
        </div>
        <div className="user-owner-v3-head-actions">
          <button type="button" className="user-owner-v3-secondary" onClick={refreshAll} disabled={query.isFetching || lifecycle.isFetching}>Yenile</button>
          {uiRole === "OWNER" && activeSection === "trainers" && <button type="button" className="user-owner-v3-primary" onClick={() => {setTrainerInviteError("");setTrainerInviteMessage("");setTrainerInviteModalOpen(true);}}>+ Eğitmen Daveti</button>}
        </div>
      </header>

      <div className="user-owner-v3-summary user-owner-v5-summary" aria-label="Öğrenci, öğretmen ve davet özeti">
        <div className="user-owner-v3-metric"><span className="user-owner-v3-metric-symbol is-orange"><PanelIcon name="users" size={21}/></span><div><small>Öğrenciler</small><strong>{studentTotals.isLoading ? "…" : (studentTotals.data?.pagination.total ?? "—")}</strong><em>Öğrenci rolü bulunan hesaplar</em></div></div>
        <div className="user-owner-v3-metric"><span className="user-owner-v3-metric-symbol is-green"><PanelIcon name="user-check" size={21}/></span><div><small>Öğretmenler</small><strong>{trainerTotals.isLoading ? "…" : (trainerTotals.data?.pagination.total ?? "—")}</strong><em>Eğitmen rolü bulunan hesaplar</em></div></div>
        <div className="user-owner-v3-metric"><span className="user-owner-v3-metric-symbol is-blue"><PanelIcon name="mail" size={21}/></span><div><small>Bekleyen eğitmen davetleri</small><strong>{lifecycle.isLoading ? "…" : (lifecycle.isError ? "—" : pendingInvites)}</strong><em>Henüz kullanılmamış gerçek davetler</em></div></div>
      </div>

      <div className="user-owner-v3-tabs" role="tablist" aria-label="Kullanıcı erişimi bölümleri">
        <button type="button" role="tab" aria-selected={activeSection === "students"} className={activeSection === "students" ? "is-active" : ""} onClick={() => chooseSection("students")}><PanelIcon name="users" size={18}/> Öğrenciler <span>{studentTotals.data?.pagination.total ?? "—"}</span></button>
        <button type="button" role="tab" aria-selected={activeSection === "trainers"} className={activeSection === "trainers" ? "is-active" : ""} onClick={() => chooseSection("trainers")}><PanelIcon name="user-check" size={18}/> Öğretmenler <span>{trainerTotals.data?.pagination.total ?? "—"}</span></button>
        {uiRole === "OWNER" && <button type="button" role="tab" aria-selected={activeSection === "adminInvites"} className={activeSection === "adminInvites" ? "is-active" : ""} onClick={() => chooseSection("adminInvites")}><PanelIcon name="shield" size={18}/> Yönetici Davetleri</button>}
      </div>

      {(["trainers", "students"] as const).includes(activeSection as "trainers" | "students") && <>
      <section role="tabpanel" className="user-owner-v3-panel user-owner-v3-user-panel">
        <div className="user-owner-v3-panel-head"><div><h2>{activeSection === "trainers" ? "Öğretmenler" : "Öğrenciler"}</h2><p>{activeSection === "trainers" ? "Eğitmenleri ve doğrulanmış e-posta bilgilerini yönetin." : "Öğrenci hesaplarını ve üyelik durumlarını inceleyin."}</p></div><strong>{query.data?.pagination.total ?? 0} kayıt</strong></div>
        <div className="user-owner-v3-toolbar">
          <label className="is-search">Ad, soyad veya e-posta ara<input type="search" maxLength={100} value={search} placeholder="Kullanıcı veya e-posta ara" onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></label>
          <label>Üyelik<select value={membershipStatus} onChange={(event) => { setMembershipStatus(event.target.value); setPage(1); }}><option value="">Tüm durumlar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>E-posta doğrulama<select value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value)}><option value="all">Tümü</option><option value="verified">Doğrulandı</option><option value="unverified">Doğrulanmadı</option></select></label>
          <button type="button" onClick={() => {setSearch(""); setMembershipStatus(""); setVerificationFilter("all"); setPage(1);}}>Temizle</button>
        </div>
        {verificationFilter !== "all" && <p className="user-owner-v3-filter-note">E-posta doğrulama filtresi yalnızca gösterilen sayfadaki kayıtları süzer.</p>}
        {query.isError ? <div role="alert" className="user-owner-v3-empty">Kullanıcı listesi yüklenemedi. <button type="button" onClick={() => void query.refetch()}>Tekrar dene</button></div>
          : <AdminDataTable columns={displayColumns} data={visibleUsers} sorting={sorting} onSortingChange={(value) => {setSorting(value); setPage(1);}} loading={query.isLoading} emptyMessage="Seçilen filtrelere uygun kullanıcı bulunamadı." />}
        <div className="user-owner-v3-table-footer"><span>Gösterilen: {visibleUsers.length} · Toplam: {query.data?.pagination.total ?? 0}</span>
          {query.data && <div className="user-owner-v3-pages"><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage((p) => p-1)}>← Önceki</button><span>{page} / {Math.max(1, query.data.pagination.pageCount)}</span><button type="button" disabled={page >= query.data.pagination.pageCount || query.isFetching} onClick={() => setPage((p) => p+1)}>Sonraki →</button></div>}
        </div>
      </section>

      {activeSection === "trainers" && uiRole === "OWNER" && trainerInviteMessage && <p role="status" className="user-owner-v3-success user-owner-v4-success-banner">{trainerInviteMessage}</p>}
      {activeSection === "trainers" && uiRole === "OWNER" && <section className="user-owner-v3-panel user-owner-v3-history user-owner-v4-trainer-history" aria-label="Eğitmen davet geçmişi">
        <div className="user-owner-v3-panel-head"><div><div className="user-owner-v3-eyebrow">DAVET GEÇMİŞİ</div><h2>Son Eğitmen Davetleri</h2><p>Gönderilen ve etkinleştirilen gerçek davetler.</p></div><strong>{legacyInvitations.length} kayıt</strong></div>
        <div className="user-owner-v3-history-filters"><input type="search" value={inviteSearch} placeholder="İsim veya e-posta ara" aria-label="Eğitmen daveti ara" onChange={(event) => setInviteSearch(event.target.value)}/><select aria-label="Davet durumu" value={inviteStatus} onChange={(event) => setInviteStatus(event.target.value)}><option value="all">Tüm durumlar</option><option value="PENDING">Bekliyor</option><option value="ACTIVATED">Etkinleştirildi</option><option value="EXPIRED">Süresi doldu</option></select></div>
        {lifecycle.isLoading ? <div className="user-owner-v3-empty">Davet geçmişi yükleniyor…</div> : lifecycle.isError ? <div className="user-owner-v3-empty" role="alert">Davet geçmişi alınamadı. <button type="button" onClick={() => void lifecycle.refetch()}>Yenile</button></div> : visibleInvitations.length ? <ul>{visibleInvitations.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,30).map((item) => <li key={item.id}><div><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small><small>{niceDate(item.createdAt)}</small></div><span className={`user-owner-v3-chip is-${item.inviteStatus.toLowerCase()}`}>{invitationStatusLabels[item.inviteStatus] || item.inviteStatus}</span></li>)}</ul> : <div className="user-owner-v3-empty">Bu ölçütlerde eğitmen daveti bulunmuyor.</div>}
      </section>}
      </>}

      {trainerInviteModalOpen && uiRole === "OWNER" && <div className="user-owner-v4-invite-overlay" onMouseDown={() => {if (!trainerInviteSubmitting) setTrainerInviteModalOpen(false);}}>
        <section className="user-owner-v4-invite-modal" role="dialog" aria-modal="true" aria-labelledby="trainer-invite-modal-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="user-owner-v4-invite-modal-head"><div><div className="user-owner-v3-eyebrow">EĞİTMEN DAVETİ</div><h2 id="trainer-invite-modal-title">Eski Eğitmeni Sisteme Davet Et</h2></div><button type="button" aria-label="Pencereyi kapat" disabled={trainerInviteSubmitting} onClick={() => setTrainerInviteModalOpen(false)}>✕</button></div>
          <div className="user-owner-v4-invite-modal-content">
          <p>Mevcut eğitmenleriniz başvuru aşamasını tekrar geçmeden hesaplarını etkinleştirebilir.</p>
          <form className="user-owner-v3-invite-form" onSubmit={(event) => {event.preventDefault(); void sendLegacyTrainerInvitation();}}>
            <label>Ad<input required value={trainerInvite.firstName} maxLength={100} autoComplete="given-name" placeholder="Eğitmen adı" onChange={(event) => setTrainerInvite((current) => ({...current, firstName: event.target.value}))}/></label>
            <label>Soyad<input required value={trainerInvite.lastName} maxLength={100} autoComplete="family-name" placeholder="Eğitmen soyadı" onChange={(event) => setTrainerInvite((current) => ({...current, lastName: event.target.value}))}/></label>
            <label className="is-wide">E-posta adresi<input type="email" required value={trainerInvite.email} maxLength={254} autoComplete="email" placeholder="egitmen@ornek.com" onChange={(event) => setTrainerInvite((current) => ({...current, email: event.target.value}))}/></label>
            <button type="submit" className="user-owner-v3-primary is-wide" disabled={trainerInviteSubmitting}>{trainerInviteSubmitting ? "Davet gönderiliyor…" : "Eğitmen Daveti Gönder"}</button>
          </form>
          {trainerInviteMessage && <p role="status" className="user-owner-v3-success">{trainerInviteMessage}</p>}
          {trainerInviteError && <p role="alert" className="user-owner-v3-error">{trainerInviteError}</p>}
          <div className="user-owner-v3-info"><PanelIcon name="shield" size={20}/><div><strong>48 saat · tek kullanım</strong><span>Eğitmen davet bağlantısından yalnızca şifresini belirleyerek giriş yapar.</span></div></div>
          </div>
        </section>
      </div>}

      {activeSection === "adminInvites" && uiRole === "OWNER" && <section role="tabpanel" className="user-owner-v3-panel user-owner-v5-admin-invite">
        <div className="user-owner-v3-panel-head"><div><div className="user-owner-v3-eyebrow">YÖNETİCİ DAVETLERİ</div><h2>Yönetici Daveti ve Erişim Alanları</h2><p>Yöneticiye davet göndermeden önce erişebileceği alanları seçin. Başlangıçta hiçbir alan seçili değildir.</p></div></div>
        <div className="user-owner-v5-admin-grid">
          <div className="user-owner-v5-admin-controls">
            <label className="user-owner-v5-admin-email">Yönetici e-posta adresi<input type="email" value={adminInvitationEmail} maxLength={254} placeholder="yonetici@ornek.com" autoComplete="email" onChange={(event) => setAdminInvitationEmail(event.target.value)} /></label>
            <div className="user-owner-v5-permission-heading"><h3>Panel erişim alanları</h3><span>{adminAreaDraft.length} / {ADMIN_AREA_DRAFT_OPTIONS.length} seçili</span></div>
            <div className="user-owner-v5-permission-list">
              {ADMIN_AREA_DRAFT_OPTIONS.map((option) => (
                <label key={option.id} className="user-owner-v5-permission-option">
                  <input type="checkbox" checked={adminAreaDraft.includes(option.id)} onChange={(event) => setAdminAreaDraft((current) => event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id))} />
                  <span className="user-owner-v5-permission-icon" aria-hidden="true"><AdminAreaIcon name={option.icon} /></span>
                  <span className="user-owner-v5-permission-copy"><strong>{option.title}</strong><small>{option.group}</small></span>
                </label>
              ))}
            </div>
            <button type="button" className="user-owner-v3-secondary" onClick={() => setAdminAreaDraft([])}>Seçimi temizle</button>
            <div className="user-owner-v5-admin-blocked" role="status">
              <strong>Davet gönderimi güvenlik kontrolü tamamlanana kadar kapalı.</strong>
              <p>Mevcut API yalnızca e-posta kabul ediyor; seçilen yetkileri sunucuda saklamıyor ve uygulamıyor. Bu nedenle sınırsız yönetici erişimi oluşturacak eski davet işlemi burada bilinçli olarak devre dışı bırakıldı.</p>
            </div>
            <button type="button" className="user-owner-v3-primary user-owner-v5-disabled-send" disabled aria-disabled="true">Yetkili Yönetici Daveti Gönder</button>
          </div>
          <aside className="user-owner-v5-admin-review" aria-label="Davet erişim özeti">
            <div className="user-owner-v3-eyebrow">DAVET ÖNCESİ KONTROL</div>
            <h3>Seçilen erişimler</h3>
            <p>{adminInvitationEmail.trim() || "Henüz e-posta girilmedi"}</p>
            {adminAreaDraft.length ? <ul className="user-owner-v5-admin-review-list">{ADMIN_AREA_DRAFT_OPTIONS.filter((option) => adminAreaDraft.includes(option.id)).map((option) => <li key={option.id}><span className="user-owner-v5-review-icon" aria-hidden="true"><AdminAreaIcon name={option.icon} /></span><span><strong>{option.title}</strong><small>{option.group}</small></span></li>)}</ul> : <div className="user-owner-v3-empty">Henüz erişim alanı seçilmedi.</div>}
            <p className="user-owner-v5-admin-caution">Bu seçimler şimdilik ekran taslağıdır, gerçek yetki değildir. Yetki kaydı, davet kabulü ve bütün korumalı API kontrolleri tamamlanınca davet gönderimi açılacaktır.</p>
          </aside>
        </div>
      </section>}

      {selectedUser && <div className="user-owner-v3-overlay" onMouseDown={() => setSelectedUser(null)}>
        <aside className="user-owner-v3-drawer" role="dialog" aria-modal="true" aria-label="Kullanıcı ayrıntıları" onMouseDown={(event) => event.stopPropagation()}>
          <div className="user-owner-v3-drawer-head"><div><span className="user-owner-v3-eyebrow">KULLANICI AYRINTILARI</span><h2 className="user-owner-v4-verified-name">{selectedUser.displayName} {verifiedTick(selectedUser.emailVerified)}</h2><p>{selectedUser.email}</p></div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Kapat">✕</button></div>
          <div className="user-owner-v3-drawer-body"><dl>
            <div><dt>Kullanıcı</dt><dd>{selectedUser.displayName}</dd></div>
            <div><dt>E-posta</dt><dd>{selectedUser.email}</dd></div>
            <div><dt>Kullanıcı rolü</dt><dd>{selectedUser.memberships.length ? selectedUser.memberships.map((item) => roleLabels[item.role] || "Tanımlanmamış").join(", ") : "Atanmadı"}</dd></div>
            <div><dt>Üyelik</dt><dd>{selectedUser.memberships.length ? selectedUser.memberships.map((item) => statusLabels[item.status] || item.status).join(", ") : "Üyelik yok"}</dd></div>
            <div><dt>E-posta doğrulaması</dt><dd>{selectedUser.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}</dd></div>
            <div><dt>Kayıt tarihi</dt><dd>{niceDate(selectedUser.createdAt)}</dd></div>
          </dl><p className="user-owner-v3-drawer-note">Bu ekran yalnızca kayıtlı bilgileri gösterir; erişim yetkisini değiştirmez.</p></div>
          <div className="user-owner-v3-drawer-foot"><button type="button" className="user-owner-v3-primary" onClick={() => setSelectedUser(null)}>Listeye Dön</button></div>
        </aside>
      </div>}
    </main>
  );
}
