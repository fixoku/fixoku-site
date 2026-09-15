import { Suspense } from "react";
import ConsentManager from "./martech/ConsentManager.jsx";
import "./martech/events.js";
import { Navigate, Route, Routes } from "react-router-dom";
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
import InstitutionReadingLanding from "./pages/InstitutionReadingLanding.jsx";
import InstructorReadingLanding from "./pages/InstructorReadingLanding.jsx";
import Giris from "./pages/Giris.jsx";
import { RoleLoginPage, StudentRegistrationPage, PasswordForgotPage, PasswordResetPage, EmailVerificationPage, TrainerApplicationPage, AccountSecurityPage, InvitationAcceptPage, AccountClosurePage, TwoFactorPage } from "./pages/AuthLifecycle.jsx";
import LocalReviewHub from "./pages/LocalReviewHub.jsx";
import { localReviewEnabled } from "./pages/local-review-data.js";
import { PanelShell } from "./platform/panel/layout/PanelShell";
import { AdminDashboardPage } from "./platform/admin/AdminDashboardPage";
import { OwnerDashboardPage } from "./platform/admin/OwnerDashboardPage";
import { ProviderStatusPage } from "./platform/admin/ProviderStatusPage";
import { AdminAssignmentPage } from "./platform/admin/AdminAssignmentPage";
import { AdminPackagesPage } from "./platform/admin/AdminPackagesPage";
import { AdminPackageDetailPage } from "./platform/admin/AdminPackageDetailPage";
import { ProtectedPanelEntry, ProtectedPanelRouter, ProtectedTrainerDashboard, ProtectedTrainerProfile, ProtectedTrainerTrainings, ProtectedTrainerPresentations, ProtectedTrainerResources, ProtectedTrainerEarnings, ProtectedTrainerAvailability, ProtectedTrainerStudents, ProtectedTrainerStudentDetail, ProtectedStudentPortal, ProtectedStudentPackages, ProtectedAdminTrainers, ProtectedOwnerFinance, ProtectedAdminShipments, ProtectedAdminProducts, ProtectedAdminProductDetail, ProtectedStudentShipments, ProtectedStudentProfile, ProtectedTrainerPayoutAccount, ProtectedNotifications, ProtectedMeasurement, ProtectedEmailTemplates, ProtectedLegalPreparation, FoundationPanel } from "./platform/auth/ProtectedPanelEntry";

const OwnerShell=({user,children})=><PanelShell user={user} role="OWNER">{children}</PanelShell>;
function ProtectedAdminDashboard(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user})=><OwnerShell user={user}><AdminDashboardPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedOwnerDashboard(){return <ProtectedPanelEntry requiredRole="OWNER">{({user})=><OwnerShell user={user}><OwnerDashboardPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminAssignments(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user})=><OwnerShell user={user}><AdminAssignmentPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminPackages(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user})=><OwnerShell user={user}><AdminPackagesPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedAdminPackageDetail(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user})=><OwnerShell user={user}><AdminPackageDetailPage /></OwnerShell>}</ProtectedPanelEntry>}
function ProtectedProviderStatus(){return <ProtectedPanelEntry requiredRole={["OWNER","SUPER_ADMIN"]}>{({user})=><OwnerShell user={user}><ProviderStatusPage /></OwnerShell>}</ProtectedPanelEntry>}

export default function AppRoutes() {
  return (
    <>
      <ConsentManager />
      <SeoRouteManager />
      <ScrollToTop />
      <Routes>
        {localReviewEnabled() && <Route path="/yerel-inceleme" element={<LocalReviewHub />} />}
        <Route path="/giris" element={<Giris />} />
        <Route path="/ogrenci-girisi" element={<RoleLoginPage role="STUDENT" />} />
        <Route path="/ogretmen-girisi" element={<RoleLoginPage role="TRAINER" />} />
        <Route path="/admin-girisi" element={<RoleLoginPage role="ADMIN" />} />
        <Route path="/owner-girisi" element={<RoleLoginPage role="OWNER" />} />
        <Route path="/ogrenci-kayit" element={<StudentRegistrationPage />} />
        <Route path="/ogretmen-basvuru" element={<TrainerApplicationPage />} />
        <Route path="/e-posta-dogrula" element={<EmailVerificationPage />} />
        <Route path="/hesap/guvenlik" element={<AccountSecurityPage />} />
        <Route path="/sifremi-unuttum" element={<PasswordForgotPage />} />
        <Route path="/sifre-sifirla" element={<PasswordResetPage />} />
        <Route path="/ogretmen-aktivasyon" element={<InvitationAcceptPage kind="trainer" />} />
        <Route path="/admin-davet-kabul" element={<InvitationAcceptPage kind="admin" />} />
        <Route path="/hesap-kapatma" element={<AccountClosurePage />} />
        <Route path="/hesap/iki-adimli-dogrulama" element={<TwoFactorPage />} />
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
        <Route path="/panel/egitmen" element={<ProtectedTrainerDashboard />} />
        <Route path="/panel/egitmen/profil" element={<ProtectedTrainerProfile />} />
        <Route path="/panel/egitmen/egitimlerim" element={<ProtectedTrainerTrainings />} />
        <Route path="/panel/egitmen/sunumlarim" element={<ProtectedTrainerPresentations />} />
        <Route path="/panel/egitmen/kaynaklarim" element={<ProtectedTrainerResources />} />
        <Route path="/panel/egitmen/ogrencilerim" element={<ProtectedTrainerStudents />} />
        <Route path="/panel/egitmen/ogrencilerim/:id" element={<ProtectedTrainerStudentDetail />} />
        <Route path="/panel/egitmen/musaitlik" element={<ProtectedTrainerAvailability />} />
        <Route path="/panel/egitmen/bakiyem" element={<ProtectedTrainerEarnings />} />
        <Route path="/panel/egitmen/payout-hesabim" element={<ProtectedTrainerPayoutAccount />} />
        <Route path="/panel/admin" element={<ProtectedAdminDashboard />} />
        <Route path="/panel/owner" element={<ProtectedOwnerDashboard />} />
        <Route path="/panel/admin/atamalar" element={<ProtectedAdminAssignments />} />
        <Route path="/panel/admin/paketler" element={<ProtectedAdminPackages />} />
        <Route path="/panel/admin/paketler/:id" element={<ProtectedAdminPackageDetail />} />
        <Route path="/panel/admin/egitmenler" element={<ProtectedAdminTrainers />} />
        <Route path="/panel/admin/egitmenler/:id" element={<ProtectedAdminTrainers />} />
        <Route path="/panel/admin/kargo" element={<ProtectedAdminShipments />} />
        <Route path="/panel/admin/urunler" element={<ProtectedAdminProducts />} />
        <Route path="/panel/admin/urunler/:id" element={<ProtectedAdminProductDetail />} />
        <Route path="/panel/admin/saglayicilar" element={<ProtectedProviderStatus />} />
        <Route path="/panel/owner/saglayicilar" element={<ProtectedProviderStatus />} />
        <Route path="/panel/owner/finance" element={<ProtectedOwnerFinance />} />
        <Route path="/panel/owner/olcumleme" element={<ProtectedMeasurement />} />
        <Route path="/panel/owner/e-posta-sablonlari" element={<ProtectedEmailTemplates />} />
        <Route path="/panel/owner/yasal-hazirlik" element={<ProtectedLegalPreparation />} />
        <Route path="/panel/ogrenci" element={<ProtectedStudentPortal />} />
        <Route path="/panel/ogrenci/paketler" element={<ProtectedStudentPackages />} />
        <Route path="/panel/ogrenci/kargolar" element={<ProtectedStudentShipments />} />
        <Route path="/panel/ogrenci/profil" element={<ProtectedStudentProfile />} />
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
