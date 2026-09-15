# FIXOKU_PROD_001 release candidate manifest

Candidate path: `C:\Users\Seslendirme Ajansı\Desktop\fixoku-site\phase2b-worktrees\integration`

This manifest records the evidence-first candidate assembled from the proven public patch snapshot and the integration R4 worktree. No files were staged or committed.

## Public post-Vercel change manifest

| Path | Authority/source | Reason | GitHub difference | Integration difference |
| --- | --- | --- | --- | --- |
| `src/components/StoryVideoModal.jsx` | `release-r7-r8-patch-20260911` | callback-ref playback, remount, bounded modal sequence controls, keyboard boundaries, poster | absent at `a749c270` | missing from integration before merge |
| `src/components/StudentStoriesSection.jsx` | `release-r7-r8-patch-20260911` | real numbered media catalogue and modal next/previous autoplay wiring | older card-only modal | older card-only modal |
| `src/components/TrainerStoriesSection.jsx` | `release-r7-r8-patch-20260911` | real trainer media catalogue and modal next/previous autoplay wiring | older card-only modal | older card-only modal |
| `src/data/publicVideoMedia.js` | `release-r7-r8-patch-20260911` | canonical student/trainer video and poster mapping | absent at `a749c270` | missing from integration before merge |
| `src/data/trainerStories.js` | `release-r7-r8-patch-20260911` | trainerStories now delegates to canonical media data | older placeholder data | older placeholder data |
| `src/components/SharedPromoVideo.jsx` and `src/components/shared-promo-video.css` | `release-r7-r8-patch-20260911` | supplied promo poster/video player and cover sizing | absent/older public implementation | missing from integration before merge |
| `src/data/promoVideoMedia.js` | `release-r7-r8-patch-20260911` | context-specific supplied poster mapping | absent at `a749c270` | missing from integration before merge |
| `public/media/**` (47 files) | `release-r7-r8-patch-20260911` | supplied promo, student and trainer video/poster assets | absent at `a749c270` | absent from integration before merge |
| `src/App.jsx` | public patch behavior merged into R4 file | SharedPromoVideo, stable viewport subscription, homepage model class | older public state | preserved integration routes/platform code |
| `src/pages/StudentReadingLanding.jsx` plus student CSS | public patch behavior merged into R4 file | supplied shared promo artwork and responsive ratio | placeholder media | preserved integration form/platform instrumentation |
| `src/pages/InstructorReadingLanding.jsx` plus instructor CSS | public patch behavior merged into R4 file | supplied shared promo artwork and responsive ratio | placeholder media | preserved integration form/platform instrumentation |
| `src/pages/InstitutionReadingLanding.jsx` plus institution CSS | public patch behavior merged into R4 file | supplied shared promo artwork in both media slots | placeholder media | preserved integration form/platform instrumentation |
| `scripts/validate-rendered-seo.mjs` and `scripts/validate-seo.mjs` | candidate contract update | rendered/static checks now assert current shared promo, legal draft, supplied asset and generated-file contracts | stale placeholder/count/source-shape assertions | updated without changing SEO source or design |

## Counts

- Tracked files changed from `99f0534`: 84
- Required untracked files (recursive, excluding generated output, snapshots and local secrets): 214
- Required public media files: 47
- Required public video/promo module files: 5

## Required untracked file list

```text
api/account-lifecycle.js
api/admin/account-lifecycle.js
api/admin/assignment-requests.js
api/admin/assignment-requests/[id].js
api/admin/finance.js
api/admin/inventory.js
api/admin/packages.js
api/admin/packages/[id].js
api/admin/payouts.js
api/admin/products.js
api/admin/products/[id].js
api/admin/shipments.js
api/admin/shipments/[id].js
api/admin/trainers.js
api/admin/trainers/[id].js
api/commerce/dev-settle.js
api/commerce/legal-snapshots.js
api/commerce/orders.js
api/commerce/webhooks.js
api/invitation-accept.js
api/local-review/switch-user.js
api/notifications.js
api/owner/finance.js
api/owner/payout-accounts.js
api/owner/payouts.js
api/paytr/callback.js
api/paytr/token.js
api/provider-status.js
api/student/downloads/[id].js
api/student/entitlements.js
api/student/packages.js
api/student/profile.js
api/student/shipments.js
api/trainer/completions.js
api/trainer/payout-account.js
api/trainer/profile/photo.js
api/trainer/progress.js
docs/architecture/drizzle-migration-authority-manifest.json
docs/architecture/drizzle-migration-authority-recovery.md
docs/architecture/drizzle-migration-schema-diff.json
docs/architecture/fixoku-consent-martech.md
docs/architecture/fixoku-marketing-deliverability-checklist.md
docs/architecture/fixoku-user-review-checklist.md
docs/architecture/owner-bootstrap.md
docs/architecture/panel-003b-execution-ledger.md
docs/architecture/panel-003c-execution-ledger.md
docs/architecture/panel-003d-acceptance-evidence.md
docs/architecture/panel-003e-execution-ledger.md
docs/architecture/panel-003f-acceptance-ledger.md
docs/architecture/panel-004a-provider-runtime-ledger.md
docs/architecture/panel-004b-activation-ledger.md
docs/architecture/panel-frontend-backend-parity.md
docs/architecture/panel-source-adoption.md
docs/architecture/platform-005a-execution-ledger.md
docs/architecture/platform-005b-visual-review-ledger.md
docs/architecture/platform-005c-full-browser-acceptance-ledger.md
docs/architecture/platform-005d-engineering-hardening-ledger.md
docs/architecture/platform-005e-local-review-ledger.md
docs/architecture/platform-006-ux-review-ledger.md
docs/architecture/platform-006d-r2-quality-ledger.md
docs/architecture/platform-007-unified-panel-ux-ledger.md
docs/architecture/seslendirme-to-fixoku-martech-port-map.md
docs/legal/fixoku-legal-values-required.md
drizzle/migrations/0015_package_catalog_foundation.sql
drizzle/migrations/0016_trainer_assignment_foundation.sql
drizzle/migrations/0017_package_commerce_entitlement_foundation.sql
drizzle/migrations/0018_owner_trainer_authority.sql
drizzle/migrations/0019_fulfillment_download_notifications_finance.sql
drizzle/migrations/0020_operational_products_shipments.sql
drizzle/migrations/0021_download_delivery_email_outbox.sql
drizzle/migrations/0022_panel_profile_payout_parity.sql
drizzle/migrations/0023_account_lifecycle_foundation.sql
drizzle/migrations/meta/0022_snapshot.json
public/media/promo/neden-fixoku-masa-ustu-ana-sayfa.jpg
public/media/promo/neden-fixoku-masa-ustu-egtmen-ol-sayfasi.jpg
public/media/promo/neden-fixoku-masa-ustu-kurum-sayfasi.jpg
public/media/promo/neden-fixoku-masa-ustu-ogrenci-sayfasi.jpg
public/media/promo/neden-fixoku-mobil-ana-sayfa.jpg
public/media/promo/neden-fixoku-mobil-egtmen-ol-sayfasi.png
public/media/promo/neden-fixoku-mobil-kurum-sayfasi.jpg
public/media/promo/neden-fixoku-mobil-ogrenci-sayfasi.jpg
public/media/promo/neden-fixoku.mp4
public/media/students/student-01.jpg
public/media/students/student-01.mp4
public/media/students/student-02.jpg
public/media/students/student-02.mp4
public/media/students/student-03.jpg
public/media/students/student-03.mp4
public/media/students/student-04.mp4
public/media/students/student-04.png
public/media/students/student-05.mp4
public/media/students/student-05.png
public/media/students/student-06.jpg
public/media/students/student-06.mp4
public/media/students/student-07.jpg
public/media/students/student-07.mp4
public/media/students/student-08.mp4
public/media/students/student-08.png
public/media/students/student-09.jpg
public/media/students/student-09.mp4
public/media/trainers/trainer-01-ozlem-peksaygili-ilcigen.jpg
public/media/trainers/trainer-01-ozlem-peksaygili-ilcigen.mp4
public/media/trainers/trainer-02-ozlem-kaplan.jpg
public/media/trainers/trainer-02-ozlem-kaplan.mp4
public/media/trainers/trainer-03-sema-kursunlu.jpg
public/media/trainers/trainer-03-sema-kursunlu.mp4
public/media/trainers/trainer-04-elif-usta.jpg
public/media/trainers/trainer-04-elif-usta.mp4
public/media/trainers/trainer-05-nihal-toprakci.jpg
public/media/trainers/trainer-05-nihal-toprakci.mp4
public/media/trainers/trainer-06-nurcan-yildirim.jpg
public/media/trainers/trainer-06-nurcan-yildirim.mp4
public/media/trainers/trainer-07-selma-akyildiz-gelen.jpg
public/media/trainers/trainer-07-selma-akyildiz-gelen.mp4
public/media/trainers/trainer-08-ferzan-yuca.jpg
public/media/trainers/trainer-08-ferzan-yuca.mp4
public/media/trainers/trainer-09-meral-oruc.jpg
public/media/trainers/trainer-09-meral-oruc.mp4
public/media/trainers/trainer-10-muharrem-gelen.jpg
public/media/trainers/trainer-10-muharrem-gelen.mp4
scripts/bootstrap-owner.mjs
scripts/capture-phase2b.mjs
scripts/diagnose-migration-authority.mjs
scripts/disposable-test-db.mjs
scripts/phase2b-fixtures.mjs
scripts/process-email-outbox.mjs
scripts/run-bundled-node.ps1
scripts/secret-safety-audit.mjs
scripts/seed-package-catalog-shadow.mjs
scripts/seed-panel-003d-demo.mjs
scripts/test-account-closure-r2.mjs
scripts/test-commerce-foundation.mjs
scripts/test-email-capture.mjs
scripts/test-email-renderer.mjs
scripts/test-migration-from-zero.mjs
scripts/test-package-immutability.mjs
scripts/test-package-visibility.mjs
scripts/test-panel-003b-security.mjs
scripts/test-panel-003c-delivery.mjs
scripts/test-panel-003c-profile.mjs
scripts/test-panel-003f-acceptance.mjs
scripts/test-panel-text-integrity.mjs
scripts/test-phase2b-a11y.mjs
scripts/test-platform-contracts.mjs
scripts/test-platform-phase2b.mjs
scripts/test-provider-browser.mjs
scripts/test-provider-runtime.mjs
scripts/test-r2-auth-contracts.mjs
scripts/test-r2-residual-audit.mjs
scripts/test-r3-auth-browser-matrix.mjs
scripts/test-r3-email-notification-matrix.mjs
scripts/test-r3-student-lifecycle.mjs
scripts/test-relationship-notification.mjs
scripts/verify-platform.mjs
src/components/SharedPromoVideo.jsx
src/components/StoryVideoModal.jsx
src/components/shared-promo-video.css
src/data/promoVideoMedia.js
src/data/publicVideoMedia.js
src/martech/ConsentManager.jsx
src/martech/adapters.js
src/martech/consent.css
src/martech/consent.js
src/martech/events.d.ts
src/martech/events.js
src/pages/AuthLifecycle.jsx
src/pages/LocalReviewHub.jsx
src/pages/auth-lifecycle.css
src/pages/local-review-data.d.ts
src/pages/local-review-data.js
src/pages/local-review-hub.css
src/platform/admin/AdminAssignmentPage.tsx
src/platform/admin/AdminDashboardPage.tsx
src/platform/admin/AdminPackageDetailPage.tsx
src/platform/admin/AdminPackagesPage.tsx
src/platform/admin/AdminProductDetailPage.tsx
src/platform/admin/AdminProductsPage.tsx
src/platform/admin/AdminShipmentsPage.tsx
src/platform/admin/AdminTrainersPage.tsx
src/platform/admin/EmailTemplatesPage.tsx
src/platform/admin/LegalPreparationPage.tsx
src/platform/admin/MeasurementPage.tsx
src/platform/admin/OwnerDashboardPage.tsx
src/platform/admin/OwnerFinancePage.tsx
src/platform/admin/ProviderStatusPage.tsx
src/platform/admin/admin-panel.css
src/platform/commerce/CheckoutLegalConsents.jsx
src/platform/commerce/PaytrCheckout.jsx
src/platform/jsx-modules.d.ts
src/platform/panel/notifications/NotificationCenterPage.tsx
src/platform/panel/notifications/notification-center.css
src/platform/student/StudentPackagesPage.tsx
src/platform/student/StudentPanelShell.tsx
src/platform/student/StudentProfilePage.tsx
src/platform/student/StudentShipmentsPage.tsx
src/platform/trainer/payout/TrainerPayoutAccountPage.tsx
src/server/auth/invitations.js
src/server/auth/owner-bootstrap.js
src/server/domain/commerce.js
src/server/domain/digital-delivery.js
src/server/domain/email-outbox.js
src/server/domain/email-renderer.d.ts
src/server/domain/email-renderer.js
src/server/domain/package-version.js
src/server/domain/profile-media.js
src/server/domain/provider-runtime.js
src/server/domain/test-email-capture.d.ts
src/server/domain/test-email-capture.js
src/server/domain/test-mail-sink.js
src/server/payments/paytr.js
src/server/shipping/adapter.js
src/server/shipping/carriers.js
tests/support/consent.ts
```
