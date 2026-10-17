import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { TrainerDashboardPreview } from "../trainer/dashboard/TrainerDashboardPreview";
import { TrainerProfilePage } from "../trainer/profile/TrainerProfilePage";
import { TrainerTrainingsPage } from "../trainer/trainings/TrainerTrainingsPage";
import { TrainerAssignmentsPage } from "../trainer/trainings/TrainerAssignmentsPage";
import { TrainerResourcesPage } from "../trainer/resources/TrainerResourcesPage";
import { TrainerStudentsPage } from "../trainer/students/TrainerStudentsPage";
import { TrainerStudentDetailPage } from "../trainer/students/TrainerStudentDetailPage";
import { TrainerAvailabilityPage } from "../trainer/availability/TrainerAvailabilityPage";
import { TrainerEarningsPage } from "../trainer/earnings/TrainerEarningsPage";
import { StudentPortalPage } from "../student/StudentPortalPage";
import { StudentPackagesPage } from "../student/StudentPackagesPage";
import { StudentCartPage } from "../student/StudentCartPage";
import { StudentCheckoutPage } from "../student/StudentCheckoutPage";
import { AdminTrainersPage } from "../admin/AdminTrainersPage";
import { OwnerFinancePage } from "../admin/OwnerFinancePage";
import { AdminShipmentsPage } from "../admin/AdminShipmentsPage";
import { StudentShipmentsPage } from "../student/StudentShipmentsPage";
import { StudentProfilePage } from "../student/StudentProfilePage";
import { StudentChildrenPage } from "../student/StudentChildrenPage";
import { TrainerPayoutAccountPage } from "../trainer/payout/TrainerPayoutAccountPage";
import { AdminProductsPage } from "../admin/AdminProductsPage";
import { AdminProductDetailPage } from "../admin/AdminProductDetailPage";
import { NotificationCenterPage } from "../panel/notifications/NotificationCenterPage";
import { MeasurementPage } from "../admin/MeasurementPage";
import { EmailTemplatesPage } from "../admin/EmailTemplatesPage";
import { LegalPreparationPage } from "../admin/LegalPreparationPage";
import { R6CustomOffersPage } from "../admin/R6CustomOffersPage";
import { R6TrainingGroupsPage } from "../admin/R6TrainingGroupsPage";
import { R6PayoutsPage } from "../admin/R6PayoutsPage";
import { TrainerCartPage } from "../trainer/commerce/TrainerCartPage";
import { TrainerCheckoutPage } from "../trainer/commerce/TrainerCheckoutPage";
import { TrainerVideoPage } from "../trainer/commerce/TrainerVideoPage";
import "../../pages/local-review-hub.css";
import { localReviewEnabled } from "../../pages/local-review-data.js";
import { PanelShell } from "../panel/layout/PanelShell";

type PanelUiRole = "OWNER" | "ADMIN" | "TRAINER" | "STUDENT";
type PanelContext = { user: { id: string; name: string; email: string }; roles: string[]; uiRole: PanelUiRole; destination: string | null; destinations?: string[]; selectionRequired?: boolean };
function OwnerShell({ user, children }: { user: PanelContext["user"]; children: ReactNode }) { return <PanelShell user={user} role="OWNER">{children}</PanelShell>; }

function LocalReviewToolbar({ context }: { context: PanelContext }) {
  const navigate = useNavigate();
  const location = useLocation();
  const local = localReviewEnabled();
  if (!local) return null;
  const role = context.uiRole === "OWNER" ? "Owner / Yönetici" : context.uiRole === "ADMIN" ? "Yönetici" : context.uiRole === "TRAINER" ? "Usta Öğretici" : context.uiRole === "STUDENT" ? "Öğrenci" : "Kullanıcı";
  return <aside className="local-review-toolbar" aria-label="Yerel inceleme araçları"><span className="local-review-toolbar-label">Yerel inceleme</span><strong>{context.user.name}</strong><span>{role}</span><button type="button" onClick={() => navigate("/yerel-inceleme")}>İnceleme Merkezi</button><button type="button" onClick={() => navigate(`/yerel-inceleme?from=${encodeURIComponent(location.pathname)}`)}>Kullanıcı Değiştir</button></aside>;
}

export function ProtectedPanelEntry({ requiredRole, children }: { requiredRole?: string | readonly string[]; children?: (context: PanelContext) => ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; context: PanelContext } | { status: "denied" }>({ status: "loading" });
  useEffect(() => {
    let active = true;
    // New view aliases reuse the existing trainer permission checks and data APIs.
    const panelPath = location.pathname === "/panel/egitmen/hakedislerim" ? "/panel/egitmen/bakiyem" : location.pathname === "/panel/egitmen/paketler" ? "/panel/egitmen/egitimlerim" : location.pathname;
    const query = requiredRole ? `?panel=${encodeURIComponent(panelPath)}` : "";
    fetch(`/api/panel-context${query}`, { credentials: "include", cache: "no-store" }).then(async (response) => {
      if (!response.ok) { if (active) setState({ status: "denied" }); return; }
      const context = await response.json() as PanelContext;
      if (active) setState({ status: "ready", context });
    }).catch(() => active && setState({ status: "denied" }));
    return () => { active = false; };
  }, [location.pathname, requiredRole]);
  if (state.status === "loading") return <main className="route-loading-status" aria-live="polite">Oturum doğrulanıyor…</main>;
  if (state.status === "denied") {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace to={`/giris?returnTo=${encodeURIComponent(returnTo)}`} />;
  }
  const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : [];
  if (allowedRoles.length && !allowedRoles.some((role) => state.context.roles.includes(role))) return <main className="platform-access-denied"><h1>Bu panele erişim izniniz yok.</h1><p>Hesabınızın yetkili olduğu panele devam edebilirsiniz.</p><button type="button" onClick={() => navigate(state.context.destination ?? state.context.destinations?.[0] ?? "/giris")}>Yetkili panele git</button></main>;
  return <><LocalReviewToolbar context={state.context} />{children?.(state.context)}</>;
}

export function ProtectedTrainerDashboard() {
  return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerDashboardPreview user={user} />}</ProtectedPanelEntry>;
}

export function ProtectedTrainerProfile() {
  return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerProfilePage user={user} />}</ProtectedPanelEntry>;
}
export function ProtectedTrainerTrainings({ packages = false }: { packages?: boolean } = {}) { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerTrainingsPage user={user} packages={packages} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerAssignments() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerAssignmentsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerCart() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerCartPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerCheckout() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerCheckoutPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerVideo() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerVideoPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerResources() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerResourcesPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerStudents() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerStudentsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerStudentDetail() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerStudentDetailPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerAvailability() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerAvailabilityPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerEarnings() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerEarningsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerPayoutAccount() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerPayoutAccountPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedStudentPackages() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentPackagesPage user={user} guardian={roles.includes("GUARDIAN")} />}</ProtectedPanelEntry>; }
export function ProtectedStudentCart() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentCartPage user={user} guardian={roles.includes("GUARDIAN")} />}</ProtectedPanelEntry>; }
export function ProtectedStudentCheckout() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentCheckoutPage user={user} guardian={roles.includes("GUARDIAN")} />}</ProtectedPanelEntry>; }
export function ProtectedAdminTrainers() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user, uiRole }) => <PanelShell user={user} role={uiRole}><AdminTrainersPage /></PanelShell>}</ProtectedPanelEntry>; }
export function ProtectedOwnerFinance() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><OwnerFinancePage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminShipments() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user, uiRole }) => <PanelShell user={user} role={uiRole}><AdminShipmentsPage /></PanelShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminProducts() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user, uiRole }) => <PanelShell user={user} role={uiRole}><AdminProductsPage /></PanelShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminProductDetail() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user, uiRole }) => <PanelShell user={user} role={uiRole}><AdminProductDetailPage /></PanelShell>}</ProtectedPanelEntry>; }
export function ProtectedStudentShipments() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user }) => <StudentShipmentsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedStudentProfile() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentProfilePage user={user} guardian={roles.includes("GUARDIAN") && !roles.includes("STUDENT")} />}</ProtectedPanelEntry>; }
function FamilyOfferChildrenGate({ user, guardian }: { user: PanelContext["user"]; guardian: boolean }) {
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");
  useEffect(() => {
    let active = true;
    fetch("/api/student/family-offers", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { offers: [] })
      .then((data) => {
        if (active) setAccess(Array.isArray(data.offers) && data.offers.some((offer: { status?: string }) => offer.status === "SENT") ? "allowed" : "denied");
      })
      .catch(() => { if (active) setAccess("denied"); });
    return () => { active = false; };
  }, []);
  if (access === "loading") return <main className="route-loading-status" role="status">Aile teklifi erişimi kontrol ediliyor…</main>;
  if (access === "denied") return <Navigate replace to="/panel/ogrenci" />;
  return <StudentChildrenPage user={user} guardian={guardian} />;
}
export function ProtectedStudentChildren() {
  return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <FamilyOfferChildrenGate user={user} guardian={roles.includes("GUARDIAN") && !roles.includes("STUDENT")} />}</ProtectedPanelEntry>;
}

export function ProtectedStudentPortal() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentPortalPage user={user} roles={roles} />}</ProtectedPanelEntry>; }
export function ProtectedNotifications() { return <ProtectedPanelEntry>{({ user, roles }) => <NotificationCenterPage user={user} role={roles.includes("OWNER") ? "OWNER" : roles.includes("SUPER_ADMIN") ? "ADMIN" : roles.includes("STUDENT") || roles.includes("GUARDIAN") ? "STUDENT" : "TRAINER"} />}</ProtectedPanelEntry>; }
export function ProtectedMeasurement() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><MeasurementPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedEmailTemplates() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><EmailTemplatesPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedLegalPreparation() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><LegalPreparationPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedR6CustomOffers() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><R6CustomOffersPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedR6TrainingGroups() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><R6TrainingGroupsPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedR6Payouts() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><R6PayoutsPage /></OwnerShell>}</ProtectedPanelEntry>; }

export function ProtectedPanelRouter() {
  return <ProtectedPanelEntry>{({ destination, destinations = [] }) => destination ? <Navigate replace to={destination as string} /> : <main className="platform-panel-chooser"><h1>Panel seçin</h1><p>Hesabınızın yetkili olduğu paneli seçin.</p><div>{destinations.map((target) => <button type="button" key={target} onClick={() => window.location.assign(target)}>{target}</button>)}</div></main>}</ProtectedPanelEntry>;
}

export function FoundationPanel({ title, role }: { title: string; role: string | readonly string[] }) {
  return <ProtectedPanelEntry requiredRole={role}>{({ user }) => <main className="platform-foundation-panel"><h1>{title}</h1><p>Hoş geldiniz, {user.name}.</p><p>Bu panel temeli Phase 1C kapsamında hazırlanmıştır.</p></main>}</ProtectedPanelEntry>;
}
