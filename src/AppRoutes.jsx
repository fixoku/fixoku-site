import "./platform/student/child-profiles-021a.css";
import { Suspense } from "react";
import ConsentManager from "./martech/ConsentManager.jsx";
import "./martech/events.js";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import App from "./App.jsx";
import SeoRouteManager from "./components/seo/Seo.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import {
  attentionFocusArticles,
  attentionFocusHub,
} from "./data/attentionFocusContent.js";
import { contentCatalogByPath } from "./data/contentCatalog.js";
import { corporateArticles, corporateHub } from "./data/corporateContent.js";
import {
  fixokuEducationArticles,
  fixokuEducationHub,
} from "./data/fixokuEducationContent.js";
import { knowledgeCenterHub } from "./data/knowledgeCenterContent.js";
import { legalPages } from "./data/legalContent.js";
import { blogArticles } from "./data/blogContent.js";
import { quickReadingArticles } from "./data/quickReadingContent.js";
import { trainingArticles, trainingHub } from "./data/trainingContent.js";
import { INSTITUTION_READING_LANDING_PATH } from "./data/institutionReadingLanding.js";
import { INSTRUCTOR_READING_LANDING_PATH } from "./data/instructorReadingLanding.js";
import NotFound from "./pages/NotFound.jsx";
import QuickReadingArticle from "./pages/content/QuickReadingArticle.jsx";
import QuickReadingHub from "./pages/content/QuickReadingHub.jsx";
import TopicArticle from "./pages/content/TopicArticle.jsx";
import TopicHub from "./pages/content/TopicHub.jsx";
import Iletisim from "./pages/iletisim.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import StudentReadingLanding from "./pages/StudentReadingLanding.jsx";
import EducationPackagesPage from "./pages/EducationPackagesPage.jsx";
import InstitutionReadingLanding from "./pages/InstitutionReadingLanding.jsx";
import InstructorReadingLanding from "./pages/InstructorReadingLanding.jsx";
import Giris from "./pages/Giris.jsx";
import LoginGatewayPage from "./pages/LoginGatewayPage.jsx";
import { RoleLoginPage, StudentRegistrationPage, PasswordForgotPage, PasswordResetPage, EmailVerificationPage, TrainerApplicationPage, AccountSecurityPage, InvitationAcceptPage, AccountClosurePage, TwoFactorPage } from "./pages/AuthLifecycle.jsx";
import OwnerPrivateLogin from "./pages/OwnerPrivateLogin.jsx";
import { TrainerPanelEntrySwitch } from "./pages/TrainerCandidatePage.jsx";
import LocalReviewHub from "./pages/LocalReviewHub.jsx";
import { localReviewEnabled } from "./pages/local-review-data.js";
import { PanelShell } from "./platform/panel/layout/PanelShell";
import { AdminDashboardPage } from "./platform/admin/AdminDashboardPage";
import { OwnerDashboardPage } from "./platform/admin/OwnerDashboardPage";
import { ProviderStatusPage } from "./platform/admin/ProviderStatusPage";
import { AdminAssignmentPage } from "./platform/admin/AdminAssignmentPage";
import { AdminTrainerCommercePage } from "./platform/admin/AdminTrainerCommercePage";
// FIXOKU_020J_OWNER_TRAINER_PACKAGES
import { OwnerTrainerPackagesPage } from "./platform/admin/OwnerTrainerPackagesPage";
import { AdminStudentCommercePage } from "./platform/admin/AdminStudentCommercePage";
import { AdminStudentEntitlementsPage } from "./platform/admin/AdminStudentEntitlementsPage";
import { AdminOrdersPage } from "./platform/admin/AdminOrdersPage";
import { AdminPaymentsPage } from "./platform/admin/AdminPaymentsPage";
import { AdminStudentsPage } from "./platform/admin/AdminStudentsPage";
import { AdminAuditHistoryPage } from "./platform/admin/AdminAuditHistoryPage";
import { AdminUserOperationsPage } from "./platform/admin/AdminUserOperationsPage";
import { AdminQueryProvider } from "./platform/admin/AdminQueryProvider";
import { ProtectedPanelEntry, ProtectedPanelRouter, ProtectedTrainerProfile, ProtectedTrainerAssignments, ProtectedTrainerCart, ProtectedTrainerCheckout, ProtectedTrainerVideo, ProtectedTrainerResources, ProtectedTrainerEarnings, ProtectedTrainerAvailability, ProtectedTrainerStudents, ProtectedTrainerStudentDetail, ProtectedStudentPortal, ProtectedStudentPackages, ProtectedStudentCart, ProtectedStudentCheckout, ProtectedAdminTrainers, ProtectedOwnerFinance, ProtectedOwnerRefundWorkspace, ProtectedAdminShipments, ProtectedAdminProducts, ProtectedAdminProductDetail, ProtectedStudentShipments, ProtectedStudentProfile, ProtectedStudentChildren, ProtectedNotifications, ProtectedMeasurement, ProtectedEmailTemplates, ProtectedLegalPreparation, ProtectedR6CustomOffers, ProtectedR6TrainingGroups, ProtectedR6Payouts, FoundationPanel } from "./platform/auth/ProtectedPanelEntry";

const ManagementShell=({user,uiRole,children})=><PanelShell user={user} role={uiRole === "OWNER" ? "OWNER" : "ADMIN"}>{children}</PanelShell>;
const OwnerShell=({user,children})=><PanelShell user={user} role="OWNER">{children}</PanelShell>;
function ProtectedAdminDashboard(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminDashboardPage /></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedOwnerDashboard(){return <ProtectedPanelEntry requiredRole="OWNER">{({user})=><OwnerShell user={user}><OwnerDashboardPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminAssignments(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminAssignmentPage /></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminTrainerCommerce(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminTrainerCommercePage /></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedOwnerTrainerPackages(){return <ProtectedPanelEntry requiredRole="OWNER">{({user})=><OwnerShell user={user}><OwnerTrainerPackagesPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminStudentCommerce(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminStudentCommercePage /></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminStudentEntitlements(){return <ProtectedPanelEntry requiredRole="OWNER">{({user})=><OwnerShell user={user}><AdminStudentEntitlementsPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminOrders(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminQueryProvider><AdminOrdersPage /></AdminQueryProvider></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminPayments(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminQueryProvider><AdminPaymentsPage /></AdminQueryProvider></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminStudents(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminQueryProvider><AdminStudentsPage /></AdminQueryProvider></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminAuditHistory(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminQueryProvider><AdminAuditHistoryPage /></AdminQueryProvider></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedAdminUserOperations(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><AdminQueryProvider><AdminUserOperationsPage uiRole={uiRole} /></AdminQueryProvider></ManagementShell>}</ProtectedPanelEntry>}
function ProtectedProviderStatus({ ownerOnly = false }) { const requiredRole = ownerOnly ? "OWNER" : ["OWNER", "SUPER_ADMIN"]; return <ProtectedPanelEntry requiredRole={requiredRole}>{({user,uiRole})=><ManagementShell user={user} uiRole={uiRole}><ProviderStatusPage /></ManagementShell>}</ProtectedPanelEntry>; }
function LegacyTrainerLoginRedirect() {
  const location = useLocation();
  return <Navigate replace to={{ pathname: "/ogretmen-girisi", search: location.search, hash: location.hash }} />;
}

export default function AppRoutes() {
  return (
    <>
      <ConsentManager />
      <SeoRouteManager />
      <ScrollToTop />
      <Routes>
        {localReviewEnabled() && <Route path="/yerel-inceleme" element={<LocalReviewHub />} />}
        <Route path="/giris" element={<LoginGatewayPage />} />
        <Route path="/egitim-platformu-girisi" element={<Giris />} />
        <Route path="/ogrenci-girisi" element={<RoleLoginPage role="STUDENT" />} />
        <Route path="/egitmen-girisi" element={<LegacyTrainerLoginRedirect />} />
        <Route path="/ogretmen-girisi" element={<RoleLoginPage role="TRAINER" />} />
        <Route path="/admin-girisi" element={<RoleLoginPage role="ADMIN" />} />
        <Route path="/owner-girisi" element={<RoleLoginPage role="OWNER" />} />
        <Route path="/seniseviim" element={<OwnerPrivateLogin />} />
        <Route path="/ogrenci-kayit" element={<StudentRegistrationPage />} />
        <Route path="/ogretmen-basvuru" element={<TrainerApplicationPage />} />
        <Route path="/e-posta-dogrula" element={<EmailVerificationPage />} />
        <Route path="/hesap/guvenlik" element={<AccountSecurityPage />} />
        <Route path="/sifremi-unuttum" element={<PasswordForgotPage />} />
        <Route path="/sifre-sifirla" element={<PasswordResetPage />} />
        <Route path="/ogretmen-aktivasyon" element={<InvitationAcceptPage kind="trainer" />} />
        <Route path="/ogretmen-aday-aktivasyon" element={<InvitationAcceptPage kind="candidate" />} />
        <Route path="/panel/egitmen-aday" element={<Navigate to="/panel/egitmen" replace />} />
        <Route path="/admin-davet-kabul" element={<InvitationAcceptPage kind="admin" />} />
        <Route path="/hesap-kapatma" element={<AccountClosurePage />} />
        <Route path="/hesap/iki-adimli-dogrulama" element={<TwoFactorPage />} />
        <Route path="/egitim-paketleri" element={<EducationPackagesPage />} />
        <Route path="/" element={<App />} />
        <Route path="/iletisim" element={<Iletisim />} />
        <Route
          path="/ogrenciler-icin-hizli-okuma-egitimi"
          element={<StudentReadingLanding />}
        />
        <Route
          path={INSTITUTION_READING_LANDING_PATH}
          element={<InstitutionReadingLanding />}
        />
        <Route
          path={INSTRUCTOR_READING_LANDING_PATH}
          element={<InstructorReadingLanding />}
        />        <Route
          path="/egitmen-ol"
          element={<Navigate replace to={INSTRUCTOR_READING_LANDING_PATH} />}
        />
        <Route
          path="/okullar-icin"
          element={<Navigate replace to={INSTITUTION_READING_LANDING_PATH} />}
        />
        {/* FIXOKU LEGACY ROUTE REDIRECTS M2C */}
        <Route path="/hizli-okuma" element={<QuickReadingHub />} />
        {quickReadingArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<QuickReadingArticle article={article} />}
          />
        ))}
        <Route
          path={attentionFocusHub.path}
          element={<TopicHub articles={attentionFocusArticles} hub={attentionFocusHub} />}
        />
        {attentionFocusArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<TopicArticle article={article} contentByPath={contentCatalogByPath} />}
          />
        ))}
        <Route
          path={fixokuEducationHub.path}
          element={<TopicHub articles={fixokuEducationArticles} hub={fixokuEducationHub} />}
        />
        {fixokuEducationArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<TopicArticle article={article} contentByPath={contentCatalogByPath} />}
          />
        ))}
        <Route
          path={knowledgeCenterHub.path}
          element={<TopicHub articles={blogArticles} hub={knowledgeCenterHub} />}
        />
        {blogArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<TopicArticle article={article} contentByPath={contentCatalogByPath} />}
          />
        ))}
        <Route
          path={trainingHub.path}
          element={<TopicHub articles={trainingArticles} hub={trainingHub} />}
        />
        {trainingArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<TopicArticle article={article} contentByPath={contentCatalogByPath} />}
          />
        ))}
        <Route
          path={corporateHub.path}
          element={<TopicHub articles={corporateArticles} hub={corporateHub} />}
        />
        {corporateArticles.map((article) => (
          <Route
            key={article.path}
            path={article.path}
            element={<TopicArticle article={article} contentByPath={contentCatalogByPath} />}
          />
        ))}
        {legalPages.map((page) => (
          <Route key={page.path} path={page.path} element={<LegalPage page={page} />} />
        ))}
        <Route path="/panel/egitmen" element={<TrainerPanelEntrySwitch />} />
        <Route path="/panel/egitmen/profil" element={<TrainerPanelEntrySwitch view="profile" />} />
        <Route path="/panel/egitmen/paketler" element={<Navigate to="/panel/egitmen/egitimlerim" replace />} />
        <Route path="/panel/egitmen/egitimlerim" element={<TrainerPanelEntrySwitch view="catalog" />} />
        <Route path="/panel/egitmen/atamalarim" element={<ProtectedTrainerAssignments />} />
        <Route path="/panel/egitmen/egitimlerim/:slug" element={<ProtectedTrainerVideo />} />
        <Route path="/panel/egitmen/sepet" element={<ProtectedTrainerCart />} />
        <Route path="/panel/egitmen/checkout" element={<ProtectedTrainerCheckout />} />
        <Route path="/panel/egitmen/sunumlarim" element={<TrainerPanelEntrySwitch view="presentations" />} />
        <Route path="/panel/egitmen/kaynaklarim" element={<ProtectedTrainerResources />} />
        <Route path="/panel/egitmen/ogrencilerim" element={<ProtectedTrainerStudents />} />
        <Route path="/panel/egitmen/ogrencilerim/:id" element={<ProtectedTrainerStudentDetail />} />
        <Route path="/panel/egitmen/musaitlik" element={<ProtectedTrainerAvailability />} />
        <Route path="/panel/egitmen/hakedislerim" element={<ProtectedTrainerEarnings />} />
        <Route path="/panel/egitmen/bakiyem" element={<Navigate to="/panel/egitmen/hakedislerim" replace />} />
        <Route path="/panel/egitmen/kazanclarim" element={<Navigate to="/panel/egitmen/hakedislerim" replace />} />
        <Route path="/panel/egitmen/payout-hesabim" element={<Navigate to="/panel/egitmen/hakedislerim?sekme=odeme-hesabim" replace />} />
        <Route path="/panel/egitmen/odeme-hesabim" element={<Navigate to="/panel/egitmen/hakedislerim?sekme=odeme-hesabim" replace />} />
        <Route path="/panel/admin" element={<ProtectedAdminDashboard />} />
        <Route path="/panel/owner" element={<ProtectedOwnerDashboard />} />
        <Route path="/panel/owner/aile-teklifleri" element={<Navigate to="/panel/owner/ozel-teklifler?tab=family" replace />} />
        <Route path="/panel/admin/atamalar" element={<ProtectedAdminAssignments />} />
        <Route path="/panel/admin/paketler" element={<Navigate to="/panel/admin/ogrenci-ticaret" replace />} />
        <Route path="/panel/admin/paketler/:id" element={<Navigate to="/panel/admin/ogrenci-ticaret" replace />} />
        <Route path="/panel/admin/egitmen-ticaret" element={<ProtectedAdminTrainerCommerce />} />
<Route path="/panel/owner/egitmen-egitim-paketleri" element={<ProtectedOwnerTrainerPackages />} />
        <Route path="/panel/admin/ogrenci-ticaret" element={<ProtectedAdminStudentCommerce />} />
        <Route path="/panel/admin/ogrenci-erisimleri" element={<ProtectedAdminStudentEntitlements />} />
        <Route path="/panel/admin/siparisler" element={<ProtectedAdminOrders />} />
        <Route path="/panel/admin/odemeler" element={<ProtectedAdminPayments />} />
        <Route path="/panel/admin/ogrenciler" element={<ProtectedAdminStudents />} />
        <Route path="/panel/admin/denetim-gecmisi" element={<ProtectedAdminAuditHistory />} />
        <Route path="/panel/admin/kullanici-islemleri" element={<ProtectedAdminUserOperations />} />
        <Route path="/panel/admin/egitmenler" element={<ProtectedAdminTrainers />} />
        <Route path="/panel/admin/egitmenler/:id" element={<ProtectedAdminTrainers />} />
        <Route path="/panel/admin/kargo" element={<ProtectedAdminShipments />} />
        <Route path="/panel/admin/urunler" element={<ProtectedAdminProducts />} />
        <Route path="/panel/admin/urunler/:id" element={<ProtectedAdminProductDetail />} />
        <Route path="/panel/admin/saglayicilar" element={<ProtectedProviderStatus />} />
        <Route path="/panel/owner/saglayicilar" element={<ProtectedProviderStatus ownerOnly />} />
        <Route path="/panel/owner/finance" element={<ProtectedOwnerFinance />} />
        <Route path="/panel/owner/iadeler" element={<ProtectedOwnerRefundWorkspace />} />
        <Route path="/panel/owner/ozel-teklifler" element={<ProtectedR6CustomOffers />} />
        <Route path="/panel/owner/egitim-gruplari" element={<ProtectedR6TrainingGroups />} />
        <Route path="/panel/owner/hakedisler" element={<ProtectedR6Payouts />} />
        <Route path="/panel/owner/olcumleme" element={<ProtectedMeasurement />} />
        <Route path="/panel/owner/e-posta-sablonlari" element={<ProtectedEmailTemplates />} />
        <Route path="/panel/owner/yasal-hazirlik" element={<ProtectedLegalPreparation />} />
        <Route path="/panel/ogrenci" element={<ProtectedStudentPortal />} />
        <Route path="/panel/ogrenci/paketler" element={<ProtectedStudentPackages />} />
        <Route path="/panel/ogrenci/sepet" element={<ProtectedStudentCart />} />
        <Route path="/panel/ogrenci/checkout" element={<ProtectedStudentCheckout />} />
        <Route path="/panel/ogrenci/kargolar" element={<ProtectedStudentShipments />} />
        <Route path="/panel/ogrenci/profil" element={<ProtectedStudentProfile />} />
        <Route path="/panel/ogrenci/profiller" element={<ProtectedStudentChildren />} />
        <Route path="/panel/bildirimler" element={<ProtectedNotifications />} />
        <Route path="/panel/notifications" element={<ProtectedNotifications />} />
        <Route
          path="/panel/*"
          element={(
            <Suspense fallback={<div className="route-loading-status" role="status" aria-live="polite">Panel yükleniyor…</div>}>
              <ProtectedPanelRouter />
            </Suspense>
          )}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
