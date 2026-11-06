import { useEffect, useLayoutEffect, useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { DEMO_IDENTITIES, localReviewEnabled } from "./local-review-data.js";
import { PanelShell } from "../platform/panel/layout/PanelShell";
import { OwnerDashboardPage } from "../platform/admin/OwnerDashboardPage";
import { AdminDashboardPage } from "../platform/admin/AdminDashboardPage";
import { AdminAssignmentPage } from "../platform/admin/AdminAssignmentPage";
import { R6TrainingGroupsPage } from "../platform/admin/R6TrainingGroupsPage";
import { TrainerDashboardPreview } from "../platform/trainer/dashboard/TrainerDashboardPreview";
import { TrainerProfilePage } from "../platform/trainer/profile/TrainerProfilePage";
import { TrainerTrainingsPage } from "../platform/trainer/trainings/TrainerTrainingsPage";
import { TrainerAssignmentsPage } from "../platform/trainer/trainings/TrainerAssignmentsPage";
import { TrainerResourcesPage } from "../platform/trainer/resources/TrainerResourcesPage";
import { TrainerStudentsPage } from "../platform/trainer/students/TrainerStudentsPage";
import { TrainerEarningsPage } from "../platform/trainer/earnings/TrainerEarningsPage";
import { TrainerPayoutAccountPage } from "../platform/trainer/payout/TrainerPayoutAccountPage";

import { StudentPortalPage } from "../platform/student/StudentPortalPage";
import { StudentPackagesPage } from "../platform/student/StudentPackagesPage";
import { StudentProfilePage } from "../platform/student/StudentProfilePage";
import "./local-review-profile-r30.css";
import { StudentShipmentsPage } from "../platform/student/StudentShipmentsPage";
import { NotificationCenterPage } from "../platform/panel/notifications/NotificationCenterPage";
import { StudentCartPage } from "../platform/student/StudentCartPage";
import "./local-review-student-batch-r33.css";
import "./local-review-trainer-r38.css";
import "./local-review-trainer-r39.css";

function json(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }));
}

const ownerOverview = {
  period: "MONTHLY",
  range: { from: "2026-10-01", to: "2026-11-04", prevFrom: "2026-08-27", prevTo: "2026-09-30" },
  current: { studentNetMinor: 2845000, studentUnits: 14, trainerNetMinor: 2398000, trainerUnits: 5, totalNetMinor: 5243000, totalUnits: 19, averageMinor: 275947 },
  previous: { studentNetMinor: 1935000, studentUnits: 9, trainerNetMinor: 1678000, trainerUnits: 4, totalNetMinor: 3613000, totalUnits: 13, averageMinor: 277923 },
  change: { totalRevenuePct: 45.1, totalUnitsPct: 46.2, studentRevenuePct: 47.0, studentUnitsPct: 55.6, trainerRevenuePct: 42.9, trainerUnitsPct: 25.0, averagePct: -0.7 },
  activeStudents: 18,
  activeTrainers: 4,
  pending: { payments: 3, assignments: 2, unpaidEarningsMinor: 164000, unfinishedTrainings: 4 },
  series: [
    { key: "w1", label: "1 Eki", studentMinor: 240000, trainerMinor: 0, totalMinor: 240000 },
    { key: "w2", label: "8 Eki", studentMinor: 410000, trainerMinor: 0, totalMinor: 410000 },
    { key: "w3", label: "15 Eki", studentMinor: 520000, trainerMinor: 899000, totalMinor: 1419000 },
    { key: "w4", label: "22 Eki", studentMinor: 780000, trainerMinor: 0, totalMinor: 780000 },
    { key: "w5", label: "29 Eki", studentMinor: 895000, trainerMinor: 1499000, totalMinor: 2394000 },
  ],
  topPackages: [
    { key: "p1", audience: "STUDENT", title: "İlkokul Hızlı Okuma Paketi", units: 6, netMinor: 899400 },
    { key: "p2", audience: "STUDENT", title: "Ortaokul Hızlı Okuma Paketi", units: 4, netMinor: 799600 },
    { key: "p3", audience: "TRAINER", title: "Lise Eğitmen Eğitimi", units: 2, netMinor: 188800 },
  ],
  recentOrders: [
    { id: "ord_101", createdAt: "2026-11-03T14:30:00.000Z", status: "PAID", paymentMethod: "BANK_TRANSFER", totalMinor: 1199000, currency: "TRY", customerName: "Hatice Kübra Usta", beneficiaryName: "Fixoku", packageTitle: "İLKOKUL HIZLI OKUMA", educationStage: "PRIMARY", kind: "STUDENT" },
    { id: "ord_102", createdAt: "2026-11-02T11:05:00.000Z", status: "PAYMENT_REVIEW", paymentMethod: "BANK_TRANSFER", totalMinor: 999000, currency: "TRY", customerName: "Ali Asaf Usta", beneficiaryName: "Fixoku", packageTitle: "LİSE PARAGRAF", educationStage: "HIGH", kind: "STUDENT" },
    { id: "ord_103", createdAt: "2026-11-01T10:15:00.000Z", status: "PAID", paymentMethod: "BANK_TRANSFER", totalMinor: 1250000, currency: "TRY", customerName: "Özlem Kaplan", beneficiaryName: "Fixoku", packageTitle: "Ortaokul Lise Paragraf Eğitimi İkili Set", kind: "TRAINER" },
  ],
};

const adminAssignments = {
  requests: [
    { id: "req_1", trainerName: "Özlem Kaplan", trainingTitle: "İlkokul Hızlı Okuma", status: "PENDING" },
    { id: "req_2", trainerName: "Elif Usta", trainingTitle: "Lise Paragraf Teknikleri", status: "PENDING" },
  ],
  metrics: { activeTrainers: 4, activeStudents: 18 },
};

const providerStatus = {
  providers: {
    email: { provider: "SMTP", status: "ACTIVE", configured: true },
    digitalStorage: { provider: "Local Storage", status: "ACTIVE", configured: true },
    shipping: { provider: "Kolay Gelsin", status: "SETUP_PENDING", configured: false },
  },
};

function studentFixture(identity) {
  const fullName = identity?.name || "Örnek Öğrenci";
  const parts = fullName.trim().split(/\s+/u);
  const lastName = parts.length > 1 ? parts.pop() : "";
  const firstName = parts.join(" ") || fullName;
  return {
    profile: { firstName, lastName, grade: "3", school: "Örnek İlkokulu" },
  };
}

function studentProfileFixture(identity) {
  const base = studentFixture(identity).profile;
  return { profile: {
    ...base,
    email: `${identity.slug}@fixoku.test`,
    phone: "5550000000",
    dateOfBirth: "2017-05-15",
    guardianName: "Örnek Veli",
    guardianEmail: "veli@fixoku.test",
    guardianPhone: "5550000001",
    guardianRelation: "Anne",
    educationStage: "PRIMARY",
    grade: "3",
    school: "Örnek İlkokulu",
    city: "İstanbul",
    district: "Üsküdar",
    addressLine: "Örnek adres (yalnızca yerel önizleme)",
    postalCode: "34000",
    marketingConsent: false,
    photoStorageKey: null,
    photoUrl: null,
  } };
}

function previewCover(title, colorA, colorB) {
  const safe = title.replace(/[&<>"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/></linearGradient></defs><rect width="900" height="540" fill="url(#g)"/><circle cx="760" cy="90" r="220" fill="#ffffff" opacity=".09"/><circle cx="110" cy="520" r="190" fill="#ffffff" opacity=".06"/><text x="64" y="132" font-size="42" font-weight="700" font-family="Arial, sans-serif" fill="#fff">FIXOKU</text><text x="64" y="200" font-size="26" font-family="Arial, sans-serif" fill="#fff">TEMSİLİ PAKET GÖRSELİ</text><text x="64" y="330" font-size="38" font-weight="700" font-family="Arial, sans-serif" fill="#fff">${safe}</text><text x="64" y="390" font-size="22" font-family="Arial, sans-serif" fill="#fff">Yalnızca yerel önizleme</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}


const studentPortal = {
  student: { enrollments: [] },
  enrollments: [
    { programTitle: "İlkokul Hızlı Okuma Eğitimi", status: "ACTIVE" },
    { programTitle: "Dikkat ve Odaklanma Programı", status: "PLANNED" },
  ],
};

const assignedTrainer = {
  trainer: {
    trainerUserId: "tr_1",
    firstName: "Özlem",
    lastName: "Kaplan",
    displayName: "Özlem Kaplan",
    phone: "(örnek bilgi)",
    email: "ozlem.kaplan@fixoku.test",
    city: "İstanbul",
    profession: "Usta Öğretici",
    bio: "Hızlı okuma ve dikkat geliştirme eğitimlerinde uzmanlaşmış örnek eğitmen profili.",
    photoUrl: null,
    badges: [
      { id: "b1", label: "Hızlı Okuma Uzmanı" },
      { id: "b2", label: "Odaklanma Eğitmeni" },
    ],
  },
};

// R43: static cover preview is an independent catalogue, NOT an Owner DB mapping.
// Unknown slugs never receive an arbitrary image. No price/entitlement is inferred.
const r43KnownCoverSlugs = new Set([
  "student-primary-platinum-egitim",
  "student-primary-premium-egitim",
  "student-primary-akilli-sistem",
  "student-primary-dijital-yapay-zeka-sistemi",
  "student-primary-gelisim",
  "student-primary-baslangic",
  "student-middle-platinum-egitim",
  "student-middle-premium-egitim",
  "student-middle-akilli-sistem",
  "student-middle-dijital-yapay-zeka-sistemi",
  "student-middle-gelisim",
  "student-middle-baslangic",
  "student-high-platinum-egitim",
  "student-high-premium-egitim",
  "student-high-akilli-sistem",
  "student-high-dijital-yapay-zeka-sistemi",
  "student-high-baslangic",
  "student-adult-platinum-egitim",
  "student-adult-premium-egitim",
  "student-adult-akilli-sistem",
  "student-adult-dijital-yapay-zeka-sistemi",
  "student-adult-baslangic",
  "student-middle-paragraf-egitim",
  "student-middle-paragraf-kitabi",
  "student-high-paragraf-egitim",
  "student-high-paragraf-kitabi"
]);
const r43DisplayNames = { primary: "İlkokul", middle: "Ortaokul", high: "Lise", adult: "Yetişkin", platinum: "Platinum", premium: "Premium", akilli: "Akıllı", sistem: "Sistem", dijital: "Dijital", yapay: "Yapay", zeka: "Zekâ", egitim: "Eğitim", baslangic: "Başlangıç", gelisim: "Gelişim", paragraf: "Paragraf", kitabi: "Kitabı" };
const r43CataloguePackages = Array.from(r43KnownCoverSlugs, (slug) => ({
  packageVersionId: `r43-catalogue-${slug}`,
  packageId: `r43-catalogue-${slug}`,
  slug,
  coverImage: `/images/fixoku-katalog/paketler/${slug}.webp`,
  versionNumber: 1,
  title: slug.replace(/^student-/, "").split("-").map((piece) => r43DisplayNames[piece] || piece).join(" "),
  subtitle: "Doğrulanmış yerel kapak dosyası; Owner ataması değildir.",
  description: "Sadece görsel katalog önizlemesi. Bu kayıt satışa açık değildir.",
  features: [], products: [], contentItems: [],
  priceMinor: null, priceRequired: true, requiresShipping: false,
  currency: "TRY", accessState: "AVAILABLE"
}));

const studentEntitlements = {
  role: "STUDENT",
  context: {
    studentProfileId: "sp_1",
    studentUserId: "stu_1",
    studentName: "Hatice Kübra Usta",
    educationStage: "PRIMARY",
    grade: "3",
  },
  students: [],
  packages: [
    {
      packageVersionId: "pv_1",
      packageId: "pkg_1",
      coverImage: previewCover("Hızlı Okuma", "#163760", "#ef721f"),
      versionNumber: 1,
      title: "İlkokul Hızlı Okuma Paketi",
      subtitle: "Akıcı okuma, dikkat ve yazılım desteği",
      description: "Öğrenci paneli önizlemesi için örnek satış paketi.",
      features: ["Canlı eğitim", "Kitap gönderimi", "Yazılım erişimi"],
      priceMinor: 1199000,
      currency: "TRY",
      shippingFeeMinor: 0,
      requiresShipping: true,
      products: [
        { title: "İlkokul Hızlı Okuma Kitabı", productType: "BOOK", quantity: 1, displayLabel: "Kitap" },
        { title: "FIXOKU Yapay Zekâ Destekli Yazılım", productType: "SOFTWARE", quantity: 1, displayLabel: "Yazılım" },
      ],
      contentItems: [
        { title: "Canlı ders planı" },
        { title: "Odak egzersizleri" },
      ],
      accessState: "AVAILABLE",
      priceRequired: false,
    },
    {
      packageVersionId: "pv_2",
      packageId: "pkg_2",
      coverImage: previewCover("Dikkat ve Odaklanma", "#303b78", "#9565c4"),
      versionNumber: 1,
      title: "Dikkat ve Odaklanma Paketi",
      subtitle: "Günlük çalışma akışı",
      description: "Öğrenci paneli önizlemesi için ikinci örnek paket.",
      features: ["Egzersiz planı", "Takip desteği"],
      priceMinor: 899000,
      currency: "TRY",
      shippingFeeMinor: 0,
      requiresShipping: false,
      products: [
        { title: "Odaklanma Çalışma Seti", productType: "SERVICE", quantity: 1, displayLabel: "Hizmet" },
      ],
      contentItems: [{ title: "8 haftalık yol haritası" }],
      accessState: "PENDING_PAYMENT",
      priceRequired: false,
      pendingOrderId: "ord_preview_1",
    },
  ],
};

const cartBody = { items: [] };

// R31: All records below are synthetic. No student, order or delivery record is read.
const previewShipments = { shipments: [
  { id: "preview-shipment-1", orderId: "PREVIEW-1001", status: "SHIPPED", carrier: "Sendeo", trackingNumber: "ORNEK-TAKIP-001", shippedAt: "2026-11-02T09:00:00.000Z", items: [{ titleSnapshot: "Hızlı Okuma Kitabı (örnek)", quantity: 1 }] },
  { id: "preview-shipment-2", orderId: "PREVIEW-1002", status: "PREPARING", carrier: "LOCAL_TEST", trackingNumber: null, shippedAt: null, items: [{ titleSnapshot: "Çalışma Kitabı (örnek)", quantity: 2 }] },
] };
const previewNotifications = { unreadCount: 2, notifications: [
  { id: "preview-notification-1", eventType: "TRAINER_ASSIGNMENT", title: "Eğitmen ataması (örnek)", body: "Örnek eğitmen eşleştirmesi oluşturuldu.", createdAt: "2026-11-03T09:20:00.000Z", readAt: null },
  { id: "preview-notification-2", eventType: "EDUCATION_ENTITLEMENT_ACTIVATED", title: "Eğitim erişimi (örnek)", body: "Örnek eğitim paketi görüntüleme listesine eklendi.", createdAt: "2026-11-02T12:10:00.000Z", readAt: null },
  { id: "preview-notification-3", eventType: "PACKAGE_COMPLETION", title: "Eğitim bilgilendirmesi (örnek)", body: "Önizleme amaçlı tamamlanma bildirimi.", createdAt: "2026-11-01T15:00:00.000Z", readAt: "2026-11-01T16:00:00.000Z" },
] };
const previewCart = { beneficiary: { studentProfileId: "preview-student", educationStage: "PRIMARY", grade: "3", studentName: "Örnek Öğrenci" }, items: [
  { packageVersionId: "preview-package-1", title: "İlkokul Hızlı Okuma Paketi (örnek)", subtitle: "Kitap ve yazılım erişimi", priceMinor: 1199000, currency: "TRY", shippingFeeMinor: 0, requiresShipping: true, products: [{ title: "Örnek hızlı okuma kitabı", productType: "BOOK", quantity: 1 }] },
], subtotalMinor: 1199000, shippingMinor: 0, totalMinor: 1199000, currency: "TRY", requiresShipping: true };



// H5EG-R35: Synthetic review fixtures, never connected to real accounts.
const r35Person = { id: "r35-student-1", name: "Örnek Öğrenci", email: "example-student@fixoku.test", phone: "0500 000 00 00", enrollments: [{ id: "r35-enrollment-1", programTitle: "Hızlı Okuma Eğitimi", progressPercent: 35, status: "IN_PROGRESS" }] };
const r35Group = { id: "r35-group-1", trainingType: "FAST_READING", educationStage: "PRIMARY", mode: "GROUP", status: "IN_PROGRESS", maxStudents: 5, participants: [{ studentUserId: r35Person.id, studentName: r35Person.name, studentEmail: r35Person.email }] };
const r35Followup = { assignments: { "r6-r35-group-1": { memberIds: [r35Person.id], marks: {}, status: "IN_PROGRESS", eligibility: { ready: false, reason: "PREVIEW", daysLeft: 21 } } }, profiles: { "r35-student-1": { name: r35Person.name, email: r35Person.email, phone: r35Person.phone } }, scope: "PREVIEW", completionDays: 21 };
const r35Packages = { packages: [{
  packageId: "r35-trainer-package-1", packageVersionId: "r35-version-1", slug: "ilkokul-akici-hizli-okuma-egitimi", title: "İlkokul Akıcı Hızlı Okuma Eğitimi", shortDescription: "Yerel inceleme için örnek eğitmen eğitimi.", description: "Temsili veridir.", accessState: "OWNED", entitlementSource: "MANUAL_GIFT", expertiseActive: true, currency: "TRY", priceGrossMinor: 1199000, catalogGrossMinor: 1199000, verifiedVideoCount: 2, features: ["Eğitim videoları", "Ders materyalleri"], components: [{ componentType: "PHYSICAL_PRODUCT", title: "Örnek eğitim kitabı", productType: "PHYSICAL", quantity: 1, listGrossMinor: 55000 }], contentItems: ["Örnek müfredat"]
}] };
const r35Profile = (identity) => {
  const parts = String(identity.name || "Örnek Eğitmen").trim().split(/\s+/u);
  return { profile: { firstName: parts[0] || "Örnek", lastName: parts.slice(1).join(" ") || "Eğitmen", email: `${identity.slug}@fixoku.test`, phone: "0500 000 00 00", city: "İstanbul", district: "Kadıköy", profession: "Eğitmen", institution: "FIXOKU Önizleme", educationBackground: "Örnek eğitim bilgisi", experience: "3 yıl (örnek)", specialties: "Hızlı Okuma", bio: "Yerel inceleme amaçlı örnek eğitmen profili.", photoUrl: null, photoStorageKey: null }, badges: [{ id: "r35-badge-1", label: "Hızlı Okuma" }] };
};
const r35Earnings = { currency: "TRY", summary: { earnedMinor: 450000, paidMinor: 200000, heldMinor: 100000, pendingMinor: 250000 }, entries: [
  { id: "r35-earning-1", type: "SESSION", status: "PAID", amountMinor: 200000, currency: "TRY", description: "Örnek ders hak edişi", occurredAt: "2026-11-01T12:00:00Z" },
  { id: "r35-earning-2", type: "SESSION", status: "HELD", amountMinor: 250000, currency: "TRY", description: "Örnek bekleyen hak ediş", occurredAt: "2026-11-03T12:00:00Z" }
], payout: "NOT_CONFIGURED" };

// H5EG-R72: The REAL Owner assignment components receive fixture GET responses only.
// These are deliberately fabricated records. No account, database or permission is queried.
const r72IndividualList = { requests: [
  { id: "r72-request-a", studentName: "Örnek Öğrenci A", grade: "3", classBranch: "A", educationStage: "PRIMARY", programTitle: "İlkokul Hızlı Okuma", status: "PENDING", trainerName: null, trainerUserId: null },
  { id: "r72-request-b", studentName: "Örnek Öğrenci B", grade: "6", classBranch: "B", educationStage: "MIDDLE", programTitle: "Ortaokul Paragraf", status: "ASSIGNED", trainerName: "Örnek Eğitmen A", trainerUserId: "r72-trainer-a" }
], metrics: { activeTrainers: 2, activeStudents: 2 } };
const r72IndividualDetails = {
  "r72-request-a": { candidates: [
    { id: "r72-trainer-a", name: "Örnek Eğitmen A", city: "İstanbul", qualification: "İlkokul Hızlı Okuma", workload: 2, hasFutureAvailability: true },
    { id: "r72-trainer-b", name: "Örnek Eğitmen B", city: "Ankara", qualification: "İlkokul Hızlı Okuma", workload: 1, hasFutureAvailability: true }
  ], currentAssignment: null, history: [] },
  "r72-request-b": { candidates: [
    { id: "r72-trainer-a", name: "Örnek Eğitmen A", city: "İstanbul", qualification: "Ortaokul Paragraf", workload: 2, hasFutureAvailability: true },
    { id: "r72-trainer-b", name: "Örnek Eğitmen B", city: "Ankara", qualification: "Ortaokul Paragraf", workload: 1, hasFutureAvailability: true }
  ], currentAssignment: { trainerUserId: "r72-trainer-a", trainerName: "Örnek Eğitmen A" }, history: [
    { id: "r72-history-1", eventType: "ASSIGNED", trainerName: "Örnek Eğitmen A", occurredAt: "2026-11-01T12:00:00Z" }
  ] }
};
const r72GroupFixture = {
  candidates: [
    { studentUserId: "r72-student-c", studentProfileId: "r72-profile-c", studentName: "Örnek Öğrenci C", school: "Örnek Okul", grade: "4", classBranch: "A", packageTitle: "İlkokul Grup Eğitim Paketi", trainingTitle: "Hızlı Okuma Grup", packageVersionId: "r72-pv-c", trainingProductId: "r72-product-c", trainingType: "FAST_READING", educationStage: "PRIMARY", requiredQualificationId: "r72-qualification-primary", requiredQualificationTitle: "İlkokul Hızlı Okuma Eğitmeni", maxStudents: 5, configuredMinStudents: 1 }
  ],
  groups: [
    { id: "r72-group-a", mode: "GROUP", trainingType: "FAST_READING", educationStage: "PRIMARY", trainerUserId: "r72-trainer-a", trainerName: "Örnek Eğitmen A", status: "IN_PROGRESS", maxStudents: 5, activeParticipantCount: 2, requiredQualificationId: "r72-qualification-primary", requiredQualificationTitle: "İlkokul Hızlı Okuma Eğitmeni", createdAt: "2026-11-01T10:00:00Z", participants: [
      { id: "r72-participant-a", status: "ACTIVE", studentName: "Örnek Öğrenci D", grade: "3" },
      { id: "r72-participant-b", status: "ACTIVE", studentName: "Örnek Öğrenci E", grade: "4" }
    ] }
  ]
};
const r72QualificationFixture = { trainers: [
  { id: "r72-trainer-a", displayName: "Örnek Eğitmen A", activeQualificationCount: 1, grants: [{ qualificationId: "r72-qualification-primary", educationStage: "PRIMARY", serviceType: "FAST_READING", status: "ACTIVE" }] },
  { id: "r72-trainer-b", displayName: "Örnek Eğitmen B", activeQualificationCount: 1, grants: [{ qualificationId: "r72-qualification-middle", educationStage: "MIDDLE", serviceType: "PARAGRAPH", status: "ACTIVE" }] }
] };

function usePreviewFetch(panel, view, identity) {
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();

      if (url.startsWith("/api/") && method !== "GET" && method !== "HEAD") return json({ error: "PREVIEW_READ_ONLY" }, 403);
      // Owner assignment GETs are intercepted before the general API deny guard.
      if (panel === "owner" && (view === "owner-individual" || view === "owner-groups" || view === "section")) {
        if (method === "GET" && url.startsWith("/api/admin/assignment-requests/")) {
          const id = decodeURIComponent(url.split("?")[0].split("/").pop() || "");
          return json(r72IndividualDetails[id] || { error: "PREVIEW_NOT_FOUND" }, r72IndividualDetails[id] ? 200 : 404);
        }
        if (method === "GET" && url.startsWith("/api/admin/assignment-requests")) return json(r72IndividualList);
        if (method === "GET" && url.startsWith("/api/admin/r6-training-groups")) return json(r72GroupFixture);
        if (method === "GET" && url.startsWith("/api/admin/r6-qualifications")) return json(r72QualificationFixture);
      }
      if (panel === "owner" && url.startsWith("/api/admin/orders")) return json(ownerOverview);
      if (panel === "admin" && url.startsWith("/api/admin/assignment-requests")) return json(adminAssignments);
      if (panel === "admin" && url.startsWith("/api/provider-status")) return json(providerStatus);

      if (panel === "trainer" && method === "GET") {
        if (url.startsWith("/api/trainer/profile")) return json(r35Profile(identity));
        if (url.startsWith("/api/trainer/addresses")) return json({ addresses: [] });
        if (url.startsWith("/api/trainer/packages")) return json(r35Packages);
        if (url.startsWith("/api/trainer/students")) return json({ students: [r35Person] });
        if (url.startsWith("/api/admin/r6-training-groups")) return json({ groups: [r35Group] });
        if (url.startsWith("/api/trainer/assignment-followup")) return json(r35Followup);
        if (url.startsWith("/api/trainer/earnings")) return json(r35Earnings);
        if (url.startsWith("/api/trainer/payout-account")) return json({ payoutAccount: { configured: false } });
      }
      if (panel === "student") {
        if (method === "GET" && view === "shipments" && url.startsWith("/api/student/shipments")) return json(previewShipments);
        if (method === "GET" && view === "notifications" && url.startsWith("/api/notifications")) return json(previewNotifications);
        if (method === "GET" && view === "cart" && url.startsWith("/api/student/cart")) return json({ ...previewCart, beneficiary: { ...previewCart.beneficiary, studentName: identity.name, studentProfileId: identity.slug } });
        if (view === "profile" && url.startsWith("/api/student/profile") && method === "GET") {
          return json(studentProfileFixture(identity));
        }
        if (view === "packages") {
          if (url.startsWith("/api/student/entitlements")) return json({ ...studentEntitlements, packages: new URLSearchParams(window.location.search).get("catalog") === "1" ? r43CataloguePackages : studentEntitlements.packages, context: { ...studentEntitlements.context, studentName: identity.name, studentUserId: identity.slug } });
          if (url.startsWith("/api/student/cart") && method === "GET") return json(cartBody);

        } else {
          if (url.startsWith("/api/student/profile") && method === "GET") return json(studentFixture(identity));
          if (url.startsWith("/api/student/portal-context")) return json(studentPortal);
          if (url.startsWith("/api/student/assigned-trainer")) return json(assignedTrainer);
        }
      }
      // No preview API call may touch a real backend or change persistent data.
      if (url.startsWith("/api/")) {
        if (method !== "GET" && method !== "HEAD") return json({ error: "PREVIEW_READ_ONLY" }, 403);
        return json({ error: "PREVIEW_DATA_NOT_AVAILABLE" }, 503);
      }
      return original(input, init);
    };
    return () => { window.fetch = original; };
  }, [panel, view, identity]);
}

function identityFor(panel, slug) {
  const wantedRole = panel === "owner" ? "OWNER" : panel === "admin" ? "SUPER_ADMIN" : panel === "trainer" ? "TRAINER" : "STUDENT";
  return DEMO_IDENTITIES.find((item) => item.slug === slug && item.role === wantedRole) || DEMO_IDENTITIES.find((item) => item.role === wantedRole) || { name: "Fixoku Önizleme", role: wantedRole, slug: `${panel}-preview` };
}

function PreviewChrome({ title, subtitle, children, actions = null }) {
  return <div className="fixoku-preview-r25-stage" style={{ display: "grid", gap: 16 }}>
    <style>{`
      .fixoku-preview-r25 .student-package-card__actions { display: none !important; }
      .fixoku-preview-r25 .student-package-card__visual img { object-fit: cover !important; }
      .fixoku-preview-r25 .student-package-card__content h4 { font-size: 0 !important; }
      .fixoku-preview-r25 .student-package-card__content h4::after { content: "Paket içeriği ve ürünler"; font-size: 12px; }
      .fixoku-preview-r25 .student-package-card__content:nth-of-type(3) h4::after { content: "Paket İçeriği"; }
      .fixoku-preview-r25 .student-package-card__content:nth-of-type(4) h4::after { content: "Pakete Dahil Ürünler"; }
      .fixoku-preview-r25-stage .review-six-shell p { color: #52657c !important; }
    `}</style>
    <div className="review-six-shell" style={{ padding: 18, margin: "0 auto", width: "min(1180px, calc(100% - 24px))" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#62748a", textTransform: "uppercase", letterSpacing: ".06em" }}>Salt-okunur yerel önizleme</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: 28 }}>{title}</h1>
          <p style={{ margin: 0, color: "#5f6f84" }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/yerel-inceleme" className="review-six-card-action" style={{ textDecoration: "none", padding: "10px 14px", border: "1px solid #d9e2ef", borderRadius: 12, color: "#173051", background: "#fff" }}>← Hesap seçimine dön</Link>
          {actions}
        </div>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9c441b" }}>Gösterilen tüm sayılar, paketler, görseller ve kişi detayları temsildir. Satın alma ve veri değiştirme işlemleri bu önizlemede kapalıdır.</p>
    </div>
    {children}
  </div>;
}

// H5EG-R70C: Demonstration-only Owner assignment views. No real assignment API or mutation.
function OwnerAssignmentPreview({ kind, identity }) {
  const individual = kind === "individual";
  const rows = individual ? [
    { student: "Örnek Öğrenci A", education: "İlkokul · 3. sınıf", training: "Hızlı Okuma · Birebir", trainer: "Atanmadı", status: "Bekliyor" },
    { student: "Örnek Öğrenci B", education: "Ortaokul · 6. sınıf", training: "Paragraf · Birebir", trainer: "Örnek Eğitmen A", status: "Atandı" },
  ] : [
    { student: "Örnek Grup A · 4 öğrenci", education: "İlkokul · 3–4. sınıf", training: "Hızlı Okuma · Grup", trainer: "Örnek Eğitmen A", status: "Atandı" },
    { student: "Örnek Grup B · 3 öğrenci", education: "Lise · 9–12. sınıf", training: "Paragraf · Grup", trainer: "Atanmadı", status: "Bekliyor" },
  ];
  const base = `/yerel-inceleme/owner?identity=${encodeURIComponent(identity.slug)}`;
  return <PreviewChrome
    title={individual ? "Birebir Atamalar · Temsili Önizleme" : "Grup Atamaları · Temsili Önizleme"}
    subtitle="Bu ekran gerçek atama bileşeninin işlev testi değildir. Gösterilen tüm kayıtlar kurgusaldır; hiçbir sunucu çağrısı yapılmaz."
    actions={<>
      <Link to={`${base}&view=owner-individual`} className="review-six-card-action" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d9e2ef", background: individual ? "#eef5ff" : "#fff", color: "#173051" }}>Birebir Atamalar</Link>
      <Link to={`${base}&view=owner-groups`} className="review-six-card-action" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #d9e2ef", background: !individual ? "#eef5ff" : "#fff", color: "#173051" }}>Grup Atamaları</Link>
    </>}
  >
    <PanelShell user={{ name: identity.name, email: `${identity.slug}@fixoku.test` }} role="OWNER">
      <main style={{ maxWidth: 1180, margin: "20px auto", padding: "0 20px 28px", display: "grid", gap: 16 }}>
        <section style={{ border: "1px solid #d9e2ef", borderRadius: 14, padding: 22, background: "#fff" }}>
          <div style={{ color: "#8c4d21", fontSize: 12, fontWeight: 800, letterSpacing: ".07em" }}>YALNIZCA ÖRNEK VERİ / SALT-OKUNUR</div>
          <h2 style={{ margin: "8px 0 4px" }}>{individual ? "Birebir eğitim atama kuyruğu" : "Grup eğitimleri atama kuyruğu"}</h2>
          <p style={{ color: "#53657b", marginTop: 4 }}>Önizleme, eğitim seviyesi ve eğitmen yetkinliği için bir görsel kontrol alanıdır. Gerçek istek, atama geçmişi veya başarı sonucu göstermez.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, textAlign: "left" }}>
              <thead><tr>{[individual ? "Öğrenci" : "Grup", "Seviye", "Eğitim", "Eğitmen", "Durum"].map((heading) => <th key={heading} style={{ padding: "12px 10px", background: "#edf3f9", color: "#173051", borderBottom: "1px solid #dce5ef" }}>{heading}</th>)}</tr></thead>
              <tbody>{rows.map((row) => <tr key={row.student}>
                {[row.student, row.education, row.training, row.trainer, row.status].map((value, index) => <td key={index} style={{ padding: "14px 10px", borderBottom: "1px solid #e8eef5", color: "#283c54" }}>{value}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section style={{ border: "1px solid #d9e2ef", borderRadius: 14, padding: 22, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Eğitmen yetkinliği: örnek karar kuralları</h3>
          <p style={{ margin: "8px 0" }}><strong>Yetkili eğitmen:</strong> İlgili eğitim alanında tamamlanmış paket veya Owner tarafından verilmiş geçerli yetki bulunmalıdır.</p>
          <p style={{ margin: "8px 0" }}><strong>Yetkisiz eğitmen:</strong> Atama sunucu tarafından reddedilmelidir. Bu ekranda gerçek uygunluk sorgusu yapılmaz.</p>
          <p style={{ margin: "8px 0", color: "#8c4d21" }}>Atama, yeniden atama, yetki verme, kaydetme ve bildirim gönderme bu önizlemede yoktur.</p>
        </section>
      </main>
    </PanelShell>
  </PreviewChrome>;
}

// R72 shows the original designed components, never a simplified table.
// inert prevents clicking even client-side controls; the GET fixture interceptor
// and existing global API write guard provide an additional boundary.
function OwnerAssignmentRealPreview({ kind, identity }) {
  const individual = kind === "individual";
  const base = `/yerel-inceleme/owner?identity=${encodeURIComponent(identity.slug)}`;
  const RealComponent = individual ? AdminAssignmentPage : R6TrainingGroupsPage;
  return <PreviewChrome
    title={`${individual ? "Birebir Atamalar" : "Grup Atamaları"} · Gerçek Tasarım Önizlemesi`}
    subtitle="Orijinal Owner ekran bileşeni, yalnızca temsili GET verisiyle açılır. Kaydetme ve gerçek atama kapalıdır."
    actions={<>
      <Link to={`${base}&view=owner-individual`} className="review-six-card-action">Birebir Atamalar</Link>
      <Link to={`${base}&view=owner-groups`} className="review-six-card-action">Grup Atamaları</Link>
    </>}
  >
    <div inert={true} aria-label="Orijinal Owner atama tasarımı, salt-okunur önizleme">
      <RealComponent key={`${kind}-${identity.slug}`} />
    </div>
  </PreviewChrome>;
}

export default function LocalReviewPanelPreview() {
  const { panel = "student" } = useParams();
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") || (panel === "student" ? "portal" : "dashboard");

  const identity = useMemo(() => identityFor(panel, searchParams.get("identity")), [panel, searchParams]);
  const user = useMemo(() => ({ name: identity.name, email: `${identity.slug}@fixoku.test` }), [identity]);

  usePreviewFetch(panel, view, identity);

  useEffect(() => {
    document.body.classList.add("fixoku-preview-r25");
    return () => document.body.classList.remove("fixoku-preview-r25");
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".student-package-card button, .trainer-dashboard-preview button")) {
        event.preventDefault(); event.stopPropagation(); return;
      }
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("/panel/")) return;
      event.preventDefault();
      event.stopPropagation();
      const destination = new URLSearchParams(window.location.search);
      const activePanel = window.location.pathname.split("/")[2] || "student";
      const rootPath = activePanel === "owner" ? "/panel/owner" : activePanel === "admin" ? "/panel/admin" : activePanel === "trainer" ? "/panel/egitmen" : "/panel/ogrenci";
      const selectedIdentity = destination.get("identity") || "";
      const label = (anchor.textContent || "Bölüm").trim().slice(0, 90);
      let mappedView = "section";
      if (href === rootPath) mappedView = activePanel === "student" ? "portal" : "dashboard";
      if (activePanel === "student" && href === "/panel/ogrenci/paketler") mappedView = "packages";
      if (activePanel === "student" && href === "/panel/ogrenci/profil") mappedView = "profile";
      if (activePanel === "student" && href === "/panel/ogrenci/kargolar") mappedView = "shipments";
      if (activePanel === "student" && href === "/panel/bildirimler") mappedView = "notifications";
      if (activePanel === "student" && href === "/panel/ogrenci/sepet") mappedView = "cart";
      if (activePanel === "owner") {
        const combined = `${href} ${label}`.toLocaleLowerCase("tr-TR");
        if (/birebir|individual|atamalar/.test(combined) && !/grup|group/.test(combined)) mappedView = "owner-individual";
        if (/grup|group/.test(combined) && /atama|egitim|eğitim|training|group/.test(combined)) mappedView = "owner-groups";
      }
      if (activePanel === "trainer") {
        const trainerViews = {
          "/panel/egitmen/profil": "profile",
          "/panel/egitmen/egitimlerim": "trainings",
          "/panel/egitmen/atamalarim": "assignments",
          "/panel/egitmen/kaynaklarim": "resources",
          "/panel/egitmen/ogrencilerim": "students",
          "/panel/egitmen/hakedislerim": "earnings",
        };
        mappedView = trainerViews[href] || mappedView;
      }
      const next = new URLSearchParams({ identity: selectedIdentity, view: mappedView });
      if (mappedView === "section") { next.set("section", href); next.set("label", label); }
      window.location.assign(`/yerel-inceleme/${activePanel}?${next.toString()}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!localReviewEnabled()) return <Navigate replace to="/yerel-inceleme" />;
  if (!["owner", "admin", "trainer", "student"].includes(panel)) return <Navigate replace to="/yerel-inceleme" />;

  if (panel === "owner" && (view === "owner-individual" || view === "owner-groups")) {
    return <OwnerAssignmentRealPreview kind={view === "owner-individual" ? "individual" : "groups"} identity={identity} />;
  }

  if (panel === "owner" && view === "section") {
    const section = `${searchParams.get("section") || ""} ${searchParams.get("label") || ""}`.toLocaleLowerCase("tr-TR");
    if (/grup|group/.test(section) && /atama|egitim|eğitim|training|group/.test(section)) return <OwnerAssignmentRealPreview kind="groups" identity={identity} />;
    if (/birebir|individual|atamalar/.test(section)) return <OwnerAssignmentRealPreview kind="individual" identity={identity} />;
  }

  if (view === "section") {
    const rawSection = searchParams.get("section") || "";
    const label = (searchParams.get("label") || "Panel bölümü").slice(0, 90);
    const safeSection = rawSection.startsWith("/panel/") ? rawSection : "";
    const homeView = panel === "student" ? "portal" : "dashboard";
    return <PreviewChrome title={`${label} · Yerel Önizleme`} subtitle="Bu bölüm için temsili, güvenli ekran henüz hazırlanmadı. Gerçek panele yönlendirme yapılmadı.">
      <PanelShell user={user} role={panel === "owner" ? "OWNER" : panel === "admin" ? "ADMIN" : panel === "trainer" ? "TRAINER" : "STUDENT"}>
        <main style={{ margin: 24, padding: 28, background: "white", border: "1px solid #e1e8f0", borderRadius: 14, maxWidth: 900 }}>
          <h2 style={{ marginTop: 0 }}>{label}</h2>
          <p>Bu bölümün gerçek içerikleri henüz yerel önizlemeye bağlanmadı. Güvenliğiniz için gerçek hesap, ödeme ve veritabanı işlemlerine yönlendirme yapılmaz.</p>
          {safeSection && <p style={{ fontSize: 13, color: "#6a7890" }}>İncelenecek sayfa: <code>{safeSection}</code></p>}
          <Link to={`/yerel-inceleme/${panel}?identity=${encodeURIComponent(identity.slug)}&view=${homeView}`} style={{ color: "#b64c1e", fontWeight: 700 }}>← Panelin önizleme ana sayfasına dön</Link>
        </main>
      </PanelShell>
    </PreviewChrome>;
  }

  if (panel === "owner") {
    return <PreviewChrome title="Owner Paneli Önizlemesi" subtitle="Gerçek oturum açmadan, örnek verilerle genel bakış ekranı."><PanelShell user={user} role="OWNER"><OwnerDashboardPage /></PanelShell></PreviewChrome>;
  }

  if (panel === "admin") {
    return <PreviewChrome title="Yönetim Paneli Önizlemesi" subtitle="Operasyon ekranı örnek istek ve sağlayıcı verileriyle açılır."><PanelShell user={user} role="ADMIN"><AdminDashboardPage /></PanelShell></PreviewChrome>;
  }

  if (panel === "trainer") {
    const trainerViews = {
      profile: ["Eğitmen Profilim", TrainerProfilePage],
      trainings: ["Eğitimlerim", TrainerTrainingsPage],
      assignments: ["Atamalarım", TrainerAssignmentsPage],
      resources: ["Eğitmen Kaynakları", TrainerResourcesPage],
      students: ["Öğrencilerim", TrainerStudentsPage],
      earnings: ["Hakedişlerim", TrainerEarningsPage],
      payout: ["Ödeme Hesabım", TrainerPayoutAccountPage],
    };
    if (trainerViews[view]) {
      const [title, Component] = trainerViews[view];
      const previewUser = { ...user, id: identity.slug };
      const payoutSwitch = (view === "earnings" || view === "payout") ? <>
        <Link to={`/yerel-inceleme/trainer?identity=${encodeURIComponent(identity.slug)}&view=earnings`} style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #edb99f", borderRadius: 9, background: view === "earnings" ? "#fff0e5" : "#fff", color: "#a7420f", fontWeight: 700, textDecoration: "none" }}>Kazançlarım</Link>
        <Link to={`/yerel-inceleme/trainer?identity=${encodeURIComponent(identity.slug)}&view=payout`} style={{ display: "inline-block", padding: "10px 14px", border: "1px solid #edb99f", borderRadius: 9, background: view === "payout" ? "#fff0e5" : "#fff", color: "#a7420f", fontWeight: 700, textDecoration: "none" }}>Ödeme Hesabım</Link>
      </> : null;
      return <PreviewChrome title={`${title} · İşlevsel Render Testi`} subtitle="Gerçek eğitmen ekranı temsili GET verileriyle açılır. Tüm etkileşimler kapalıdır." actions={payoutSwitch}>
        <div inert={true} aria-label={`Salt-okunur eğitmen ${view} önizlemesi`}>
          <Component key={`${identity.slug}-${view}`} user={previewUser} />
        </div>
      </PreviewChrome>;
    }
    return <PreviewChrome title="Eğitmen Paneli Önizlemesi" subtitle="Salt-okunur gösterim. Gerçek eğitmen oturumu oluşturulmaz."><TrainerDashboardPreview user={user} /></PreviewChrome>;
  }

  const actionButtons = <>
    <Link to={`/yerel-inceleme/student?identity=${encodeURIComponent(identity.slug)}&view=portal`} className="review-six-card-action" style={{ textDecoration: "none", padding: "10px 14px", border: view === "portal" ? "1px solid #193858" : "1px solid #d9e2ef", borderRadius: 12, color: "#173051", background: view === "portal" ? "#eef5ff" : "#fff" }}>Öğrenci paneli</Link>
    <Link to={`/yerel-inceleme/student?identity=${encodeURIComponent(identity.slug)}&view=packages`} className="review-six-card-action" style={{ textDecoration: "none", padding: "10px 14px", border: view === "packages" ? "1px solid #193858" : "1px solid #d9e2ef", borderRadius: 12, color: "#173051", background: view === "packages" ? "#eef5ff" : "#fff" }}>Öğrenci paketleri</Link>
  </>;

  // R31: Render the existing product components with synthetic GET-only fixtures.
  // inert blocks clicks, forms, focus and uploads; any unexpected API write
  // is also rejected by usePreviewFetch before reaching a backend.
  if (view === "shipments") {
    return <PreviewChrome title="Kargolarım · İşlevsel Render Testi" subtitle="Gerçek gönderi bileşeni örnek verilerle açılır. Takip numaraları temsildir." actions={actionButtons}>
      <div inert={true} aria-label="Salt-okunur kargo önizlemesi"><StudentShipmentsPage key={identity.slug} user={user} /></div>
    </PreviewChrome>;
  }
  if (view === "notifications") {
    return <PreviewChrome title="Bildirimler · İşlevsel Render Testi" subtitle="Gerçek bildirim bileşeni örnek verilerle açılır; okundu işaretleme kapalıdır." actions={actionButtons}>
      <div inert={true} aria-label="Salt-okunur bildirim önizlemesi"><NotificationCenterPage key={identity.slug} user={{ ...user, id: identity.slug }} role="STUDENT" /></div>
    </PreviewChrome>;
  }
  if (view === "cart") {
    return <PreviewChrome title="Sepetim · İşlevsel Render Testi" subtitle="Gerçek sepet bileşeni örnek paketle açılır; sepet ve ödeme işlemleri kapalıdır." actions={actionButtons}>
      <div inert={true} aria-label="Salt-okunur sepet önizlemesi"><StudentCartPage key={identity.slug} user={user} guardian={false} /></div>
    </PreviewChrome>;
  }

  if (view === "profile") {
    return <PreviewChrome title="Öğrenci Profilim · İşlevsel Render Testi" subtitle="Gerçek profil bileşeni örnek GET verisiyle açılır. Alanlar salt-okunurdur; kayıt ve fotoğraf yükleme işlemleri devre dışıdır." actions={actionButtons}>
      <div inert={true} style={{ position: "relative" }} aria-label="Salt-okunur profil önizlemesi">
        <StudentProfilePage key={identity.slug} user={user} guardian={false} />
      </div>
    </PreviewChrome>;
  }

  if (view === "packages") {
    const catalogueMode = searchParams.get("catalog") === "1";
    const packageActions = <>
      {actionButtons}
      <Link to={`/yerel-inceleme/student?identity=${encodeURIComponent(identity.slug)}&view=packages&catalog=${catalogueMode ? "0" : "1"}`} style={{ textDecoration: "none", padding: "10px 14px", border: "1px solid #bd6538", borderRadius: 10, color: "#a74310", background: "#fff5ef" }}>{catalogueMode ? "Örnek paketleri gör" : "26 gerçek katalog kapağını gör"}</Link>
    </>;
    return <PreviewChrome title={catalogueMode ? "Katalog Kapakları · Salt-Okunur Önizleme" : "Öğrenci Paketleri Önizlemesi"} subtitle={catalogueMode ? "26 doğrulanmış yerel görsel, eşleşen katalog slug'larıyla gösterilir. Owner paket ataması ve satış fiyatı doğrulanmamıştır." : "İki temsili öğrenci paketi: Owner kimlikleri doğrulanmadığından kapak ataması yapılmadı."} actions={packageActions}>
      <div inert={true} aria-label="Salt-okunur katalog paket kartları">
        <StudentPackagesPage key={`${identity.slug}-${catalogueMode ? "catalogue" : "demo"}`} user={user} guardian={false} />
      </div>
    </PreviewChrome>;
  }

  return <PreviewChrome title="Öğrenci Paneli Önizlemesi" subtitle="Gerçek oturum açmadan, örnek öğrenci ve eğitmen verileriyle açılır." actions={actionButtons}><StudentPortalPage key={identity.slug} user={user} roles={["STUDENT"]} guardian={false} /></PreviewChrome>;
}
