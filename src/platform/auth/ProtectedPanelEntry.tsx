import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { TrainerDashboardPreview } from "../trainer/dashboard/TrainerDashboardPreview";
import { TrainerProfilePage } from "../trainer/profile/TrainerProfilePage";
import { TrainerTrainingsPage } from "../trainer/trainings/TrainerTrainingsPage";
import { TrainerPresentationsPage } from "../trainer/presentations/TrainerPresentationsPage";
import { TrainerResourcesPage } from "../trainer/resources/TrainerResourcesPage";
import { TrainerStudentsPage } from "../trainer/students/TrainerStudentsPage";
import { TrainerStudentDetailPage } from "../trainer/students/TrainerStudentDetailPage";
import { TrainerAvailabilityPage } from "../trainer/availability/TrainerAvailabilityPage";
import { TrainerEarningsPage } from "../trainer/earnings/TrainerEarningsPage";
import { StudentPortalPage } from "../student/StudentPortalPage";
import { StudentPackagesPage } from "../student/StudentPackagesPage";
import { AdminTrainersPage } from "../admin/AdminTrainersPage";
import { OwnerFinancePage } from "../admin/OwnerFinancePage";
import { AdminShipmentsPage } from "../admin/AdminShipmentsPage";
import { StudentShipmentsPage } from "../student/StudentShipmentsPage";
import { StudentProfilePage } from "../student/StudentProfilePage";
import { TrainerPayoutAccountPage } from "../trainer/payout/TrainerPayoutAccountPage";
import { AdminProductsPage } from "../admin/AdminProductsPage";
import { AdminProductDetailPage } from "../admin/AdminProductDetailPage";
import { NotificationCenterPage } from "../panel/notifications/NotificationCenterPage";
import { MeasurementPage } from "../admin/MeasurementPage";
import { EmailTemplatesPage } from "../admin/EmailTemplatesPage";
import { LegalPreparationPage } from "../admin/LegalPreparationPage";
import "../../pages/local-review-hub.css";
import { localReviewEnabled } from "../../pages/local-review-data.js";
import { PanelShell } from "../panel/layout/PanelShell";

type PanelContext = { user: { id: string; name: string; email: string }; roles: string[]; destination: string | null; destinations?: string[]; selectionRequired?: boolean };
function OwnerShell({ user, children }: { user: PanelContext["user"]; children: ReactNode }) { return <PanelShell user={user} role="OWNER">{children}</PanelShell>; }

function LocalReviewToolbar({ context }: { context: PanelContext }) {
  const navigate = useNavigate();
  const location = useLocation();
  const local = localReviewEnabled();
  if (!local) return null;
  const role = context.roles.includes("OWNER") ? "Owner / Yönetici" : context.roles.includes("TRAINER") ? "Usta Öğretici" : context.roles.includes("STUDENT") || context.roles.includes("GUARDIAN") ? "Öğrenci" : context.roles[0] || "Kullanıcı";
  return <aside className="local-review-toolbar" aria-label="Yerel inceleme araçları"><span className="local-review-toolbar-label">Yerel inceleme</span><strong>{context.user.name}</strong><span>{role}</span><button type="button" onClick={() => navigate("/yerel-inceleme")}>İnceleme Merkezi</button><button type="button" onClick={() => navigate(`/yerel-inceleme?from=${encodeURIComponent(location.pathname)}`)}>Kullanıcı Değiştir</button></aside>;
}

export function ProtectedPanelEntry({ requiredRole, children }: { requiredRole?: string | readonly string[]; children?: (context: PanelContext) => ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; context: PanelContext } | { status: "denied" }>({ status: "loading" });
  useEffect(() => {
    let active = true;
    const query = requiredRole ? `?panel=${encodeURIComponent(location.pathname)}` : "";
    fetch(`/api/panel-context${query}`, { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) { if (active) setState({ status: "denied" }); return; }
      const context = await response.json() as PanelContext;
      if (active) setState({ status: "ready", context });
    }).catch(() => active && setState({ status: "denied" }));
    return () => { active = false; };
  }, [location.pathname, requiredRole]);
  if (state.status === "loading") return <main className="route-loading-status" aria-live="polite">Oturum doğrulanıyor…</main>;
  if (state.status === "denied") return <Navigate replace to={`/giris?returnTo=${encodeURIComponent(location.pathname)}`} />;
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
export function ProtectedTrainerTrainings() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerTrainingsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerPresentations() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerPresentationsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerResources() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerResourcesPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerStudents() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerStudentsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerStudentDetail() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerStudentDetailPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerAvailability() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerAvailabilityPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerEarnings() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerEarningsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedTrainerPayoutAccount() { return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerPayoutAccountPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedStudentPackages() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentPackagesPage user={user} guardian={roles.includes("GUARDIAN")} />}</ProtectedPanelEntry>; }
export function ProtectedAdminTrainers() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><AdminTrainersPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedOwnerFinance() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><OwnerFinancePage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminShipments() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><AdminShipmentsPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminProducts() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><AdminProductsPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedAdminProductDetail() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><AdminProductDetailPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedStudentShipments() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user }) => <StudentShipmentsPage user={user} />}</ProtectedPanelEntry>; }
export function ProtectedStudentProfile() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentProfilePage user={user} guardian={roles.includes("GUARDIAN") && !roles.includes("STUDENT")} />}</ProtectedPanelEntry>; }

export function ProtectedStudentPortal() { return <ProtectedPanelEntry requiredRole={["STUDENT", "GUARDIAN"]}>{({ user, roles }) => <StudentPortalPage user={user} roles={roles} />}</ProtectedPanelEntry>; }
export function ProtectedNotifications() { return <ProtectedPanelEntry>{({ user, roles }) => <NotificationCenterPage user={user} role={roles.includes("OWNER") ? "OWNER" : roles.includes("SUPER_ADMIN") ? "ADMIN" : roles.includes("STUDENT") || roles.includes("GUARDIAN") ? "STUDENT" : "TRAINER"} />}</ProtectedPanelEntry>; }
export function ProtectedMeasurement() { return <ProtectedPanelEntry requiredRole="OWNER">{({ user }) => <OwnerShell user={user}><MeasurementPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedEmailTemplates() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><EmailTemplatesPage /></OwnerShell>}</ProtectedPanelEntry>; }
export function ProtectedLegalPreparation() { return <ProtectedPanelEntry requiredRole={["OWNER", "SUPER_ADMIN"]}>{({ user }) => <OwnerShell user={user}><LegalPreparationPage /></OwnerShell>}</ProtectedPanelEntry>; }

export function ProtectedPanelRouter() {
  return <ProtectedPanelEntry>{({ destination, destinations = [] }) => destination ? <Navigate replace to={destination as string} /> : <main className="platform-panel-chooser"><h1>Panel seçin</h1><p>Hesabınızın yetkili olduğu paneli seçin.</p><div>{destinations.map((target) => <button type="button" key={target} onClick={() => window.location.assign(target)}>{target}</button>)}</div></main>}</ProtectedPanelEntry>;
}

export function FoundationPanel({ title, role }: { title: string; role: string | readonly string[] }) {
  return <ProtectedPanelEntry requiredRole={role}>{({ user }) => <main className="platform-foundation-panel"><h1>{title}</h1><p>Hoş geldiniz, {user.name}.</p><p>Bu panel temeli Phase 1C kapsamında hazırlanmıştır.</p></main>}</ProtectedPanelEntry>;
}
