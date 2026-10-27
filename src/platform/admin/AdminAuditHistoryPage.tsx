import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import "./admin-panel.css";
import "./admin-audit-owner-v2.css";
import "./admin-audit-export-v6.css";
import "./admin-audit-role-photo-v7.css";
import "./admin-audit-actor-process-v9.css";
import { resolveProfileImage } from "../panel/profileAvatar";
import { createAuditPdf, type AuditPdfRow } from "./audit-export-v6";

type Category = "all" | "owner" | "admin" | "trainer" | "student" | "guardian" | "system" | "other";
type Domain = "all" | "training" | "sales" | "finance" | "shipping" | "access" | "test" | "account";
type TabKey = Category;

type AuditEvent = {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  result: string;
  correlationId: string;
  category: Exclude<Category, "all">;
  currentRoles: string[];
  actorPhotoUrl: string | null;
};

type AuditResponse = {
  events: AuditEvent[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  summary: {
    total: number;
    success: number;
    attention: number;
    categories: Record<Exclude<Category, "all">, number>;
    domains: Record<"sales" | "shipping" | "finance", number>;
  };
  scope: {
    category: Category;
    timezone: string;
    historicalRoleAvailable: boolean;
    coverage: string;
    exportSnapshot?: string | null;
  };
};

type IconName =
  | "list"
  | "book"
  | "users"
  | "shield"
  | "settings"
  | "clock"
  | "check"
  | "alert"
  | "search"
  | "refresh"
  | "download"
  | "info"
  | "arrow"
  | "close"
  | "filter";

const tabs: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "all", label: "Tüm kullanıcılar", icon: "list" },
  { key: "owner", label: "İşletme sahibi", icon: "shield" },
  { key: "admin", label: "Yöneticiler", icon: "shield" },
  { key: "trainer", label: "Eğitmenler", icon: "users" },
  { key: "student", label: "Öğrenciler", icon: "book" },
  { key: "guardian", label: "Temsilciler", icon: "users" },
  { key: "system", label: "Sistem", icon: "settings" },
];
const domains: { key: Domain; label: string }[] = [
  { key: "all", label: "Tüm işlem alanları" },
  { key: "training", label: "Eğitim ve atamalar" },
  { key: "sales", label: "Satış ve paket" },
  { key: "finance", label: "Ödeme ve hakediş" },
  { key: "shipping", label: "Kargo ve stok" },
  { key: "access", label: "Yetki ve erişim" },
  { key: "test", label: "Test ve geliştirme" },
  { key: "account", label: "Üyelik ve hesap" },
];

const actions: Record<string, string> = {
  "membership.create": "Yeni üyelik oluşturuldu", "user.session.terminated": "Kullanıcı oturumu sonlandırıldı",
  "membership.manage": "Üyelik yetkileri değiştirildi",
  "commerce.order.created": "Sipariş oluşturuldu",
  "student_commerce.order.created": "Öğrenci paketi siparişi oluşturuldu", "student_commerce.package.published": "Öğrenci paket sürümü yayımlandı", "student_commerce.package.draft.created": "Öğrenci paketi taslağı oluşturuldu", "student_commerce.package.updated": "Öğrenci paketi güncellendi",
  "trainer.commerce.order.created": "Eğitmen paketi siparişi oluşturuldu",
  "commerce.payment.succeeded": "Ödeme doğrulandı",
  "trainer.commerce.payment.settled": "Eğitmen paketi ödemesi onaylandı",
  "commerce.entitlement.granted": "Paket erişimi tanımlandı",
  "education.enrollment.materialized": "Eğitim kaydı oluşturuldu",
  "education.assignment_request.created": "Eğitmen atama talebi oluşturuldu",
  "education.progress.updated": "Eğitim ilerlemesi güncellendi",
  "education.session.recorded": "Eğitim oturumu kaydedildi",
  "education.completion.recorded": "Eğitim tamamlandı",
  "trainer.assignment.assign": "Öğrenci, eğitmene atandı", "trainer.assignment.assign.requested": "Eğitmen atama işlemi başlatıldı",
  "trainer.assignment.reassigned": "Öğrenci ataması değiştirildi",
  "trainer.qualification.granted": "Eğitmen uzmanlığı etkinleştirildi",
  "trainer.qualification.reactivated": "Eğitmen uzmanlığı yeniden etkinleştirildi",
  "trainer.availability.update": "Eğitmen müsaitliği güncellendi",
  "trainer.profile.update": "Eğitmen profili güncellendi",
  "trainer.payout.paid": "Eğitmen hakedişi ödendi",
  "trainer.payout.adjusted": "Eğitmen hakedişi düzeltildi",
  "trainer.payout_account.update": "Eğitmenin hakediş hesabı güncellendi", "trainer.payout.account.update": "Eğitmenin hakediş hesabı güncellendi",
  "trainer.package.entitlement.assigned": "Eğitmen paketi hakkı tanımlandı",
  "trainer.package.entitlement.revoked": "Eğitmen paketi hakkı kaldırıldı",
  "r6.qualification.granted": "Eğitmen uzmanlığı tanımlandı",
  "r6.qualification.revoked": "Eğitmen uzmanlığı kaldırıldı",
  "r6.training_group.created": "Eğitim grubu oluşturuldu", "r6.training_group.published": "Eğitim grubu yayımlandı",
  "r6.training_group.completed": "Eğitim grubu tamamlandı",
  "r6.training_participant.refunded": "Eğitim katılımcısı iade edildi",
  "r6.custom_offer.created": "Özel teklif oluşturuldu",
  "r6.custom_offer.claimed": "Özel teklif görüntülendi",
  "r6.custom_offer.accepted": "Özel teklif kabul edildi",
  "shipment.status.preparing": "Sipariş hazırlığa alındı",
  "shipment.status.cancelled": "Kargo işlemi iptal edildi", "shipment.status.shipped": "Sipariş kargoya verildi", "shipment.status.delivered": "Sipariş teslim edildi",
  "shipment.details.updated": "Kargo bilgileri güncellendi",
  "inventory.movement.recorded": "Stok hareketi kaydedildi",
  "owner_admin.package_permission.granted": "Yöneticiye paket erişim yetkisi verildi",
  "owner_admin.package_permission.revoked": "Yöneticinin paket erişim yetkisi kaldırıldı",
  "trainer.commerce.bank_transfer.review.approved": "Eğitmen havalesi yönetici tarafından onaylandı",
  "trainer.commerce.bank_transfer.review.rejected": "Eğitmen havalesi yönetici tarafından reddedildi",
  "trainer_commerce.package.published": "Eğitmen eğitim paketi sürümü yayımlandı",
  "trainer_commerce.package.draft.created": "Eğitmen eğitim paketi taslağı oluşturuldu",
  "qa.scenario.seeded": "Test senaryosu verisi oluşturuldu",
  "qa.scenario.updated": "Test senaryosu güncellendi",
  "qa.general_overview.v33.repair": "Test verisi onarım işlemi kaydedildi",
  "staging.smtp.single_attempt": "Test e-postası denemesi kaydedildi",
};

const explanations: Record<string, string> = {
  "student_commerce.package.published": "Paketin öğrenci kataloğundaki sürümü yayımlandı. Bu kayıt bir öğrenciye satın alma veya erişim tanımlandığını göstermez.",
  "student_commerce.order.created": "Öğrenci paketine ilişkin yeni sipariş kaydı oluşturuldu. Ödemenin tamamlandığı ayrıca doğrulanmalıdır.",
  "commerce.entitlement.granted": "Satın alınmış paket için erişim hakkı tanımlandı.",
  "commerce.payment.succeeded": "Siparişe ait ödeme başarılı olarak doğrulandı.",
  "education.completion.recorded": "Eğitim tamamlama kaydı sisteme işlendi.",
  "trainer.assignment.assign": "Öğrenci ile eğitmen arasında atama kaydı oluşturuldu.",
  "trainer.payout_account.update": "Eğitmenin hakediş ödeme hesabı bilgilerinde değişiklik kaydedildi. Hesap numarası burada gösterilmez.",
  "shipment.status.cancelled": "Kargo yönetiminde sevkiyatın durumu iptal edildi olarak kaydedildi.",
  "trainer.commerce.bank_transfer.review.approved": "Yönetici, eğitmen paketi için bildirilen havaleyi onayladı. Hak tanımlama ve ödeme kaydı ayrıca incelenebilir.",
  "trainer.commerce.bank_transfer.review.rejected": "Yönetici, eğitmen paketine ilişkin havale bildirimini reddetti. Gerekçe veya banka bilgileri denetim ekranına aktarılmaz.",
  "trainer_commerce.package.published": "Eğitmen eğitim paketinin yeni sürümü katalogda yayımlandı. Bu kayıt eğitmenin satın alma işlemi değildir.",
  "shipment.status.preparing": "Siparişin kargo hazırlık aşamasına geçişi kaydedildi.",
  "owner_admin.package_permission.granted": "Yönetici için paket yönetimi erişim yetkisi oluşturuldu.",
  "owner_admin.package_permission.revoked": "Yönetici için önceden verilmiş paket yetkisi kaldırıldı.",
};
const results: Record<string, string> = {
  SUCCESS: "Başarılı",
  FAILED: "Başarısız",
  REJECTED: "Reddedildi",
  ATTEMPT_RESERVED: "Ayrılmış deneme",
};

const roles: Record<string, string> = {
  OWNER: "İşletme sahibi",
  SUPER_ADMIN: "Yönetici",
  STUDENT: "Öğrenci",
  TRAINER: "Eğitmen",
  GUARDIAN: "Temsilci",
};

const areas: Record<Exclude<Category, "all">, string> = {
  owner: "İşletme sahibi", admin: "Yönetici", trainer: "Eğitmen", student: "Öğrenci",
  guardian: "Temsilci", system: "Sistem", other: "Etkin rol bulunamadı",
};

const subjectTypes: Record<string, string> = {
  shipment: "Kargo kaydı",
  order: "Sipariş",
  enrollment: "Eğitim kaydı",
  trainer_assignment_request: "Eğitmen atama talebi",
  r6_training_group: "Eğitim grubu",
  platform_user: "Platform kullanıcısı",
  package_version: "Paket sürümü",
  qa_dataset: "Kalite veri seti",
  trainerPayoutAccount: "Hakediş hesabı",
};

const number = (value: number) => new Intl.NumberFormat("tr-TR").format(value);

const dateTime = (value: string, seconds = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  }).format(date);
};

function friendlyAction(action: string) {
  return actions[action] || "Açıklaması henüz tanımlanmamış işlem";
}
function actionExplanation(event: AuditEvent) {
  return explanations[event.action] || "Bu olayın işlemsel anlamı henüz doğrulanmadı. Hangi işlemin gerçekleştiği teknik kod ve kaynak işlem üzerinden araştırılmalıdır.";
}
function subjectLabel(value: string) {
  const labels: Record<string, string> = {
    shipment: "Kargo kaydı", order: "Sipariş", package_version: "Paket sürümü",
    trainer_assignment_request: "Eğitmen atama talebi", platform_user: "Kullanıcı hesabı",
    r6_training_group: "Eğitim grubu", enrollment: "Eğitim kaydı",
    TrainerPayoutAccount: "Hakediş hesabı", qa_dataset: "Test kayıtları",
    student: "Öğrenci", user: "Kullanıcı", payment: "Ödeme kaydı",
  };
  return labels[value] || "İlgili kayıt";
}
function tabCount(tab: TabKey, summary?: AuditResponse["summary"]) {
  if (!summary) return "·";
  if (tab === "all") return number(Object.values(summary.categories || {}).reduce((a, b) => a + b, 0));
  return number(summary.categories?.[tab] ?? 0);
}
function ActorGroupBadge({ category }: { category: Exclude<Category, "all"> }) {
  const tone = category === "owner" ? "owner" : category === "admin" ? "admin" : category === "trainer" ? "trainer" : category === "student" ? "student" : category === "guardian" ? "guardian" : "unknown";
  return <span className={`fa2-role fa7-role-${tone}`}>{areas[category]}</span>;
}

function AuditAvatar({ event, large = false }: { event: AuditEvent; large?: boolean }) {
  // Özel yükleme yolu yalnızca yetkili aynı-köken API'sidir.
  const apiImage = event.actorPhotoUrl;
  const safeUrl = apiImage && /^\/api\/admin\/audit-actor-photo\?userId=[0-9a-f-]{36}$/i.test(apiImage) ? apiImage : null;
  // Owner üst paneli bu yerel görselleri zaten kullanıyor. Fotoğraf yoksa aynı güvenli
  // profil eşleştirmesine, o dosya da yoksa baş harflere düşülür.
  const localImage = resolveProfileImage({ name: event.actorName, email: event.actorEmail, photoUrl: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [event.actorUserId, safeUrl, localImage]);
  const image = attempt === 0 ? (safeUrl || localImage) : attempt === 1 && safeUrl ? localImage : null;
  const initials = (event.actorName || "Sistem").trim().split(/\s+/u).slice(0, 2).map(x => x[0] || "").join("").toLocaleUpperCase("tr-TR");
  return <span className={`fa2-avatar fa4-avatar ${large ? "fa4-avatar-large" : ""} fa4-avatar-${event.category}`} aria-label={event.actorName || "Sistem"}>
    {image ? <img src={image} alt="" loading="lazy" referrerPolicy="same-origin" onError={() => setAttempt(n => n + 1)} /> : initials}
  </span>;
}
const todayIstanbul = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

function safeCsvCell(value: unknown) {
  const raw = String(value ?? "");
  const protectedValue = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function actionLabel(value: string) {
  return actions[value] || "Kayıtlı işlem";
}

function resultLabel(value: string) {
  return results[value] || value;
}

function roleLabel(values: string[]) {
  if (!values.length) return "Belirsiz";
  return values.map((value) => roles[value] || value).join(", ");
}

function subjectTypeLabel(value: string) {
  return subjectTypes[value] || value;
}

function resultTone(value: string) {
  if (value === "SUCCESS") return "success";
  if (value === "FAILED" || value === "REJECTED") return "danger";
  return "neutral";
}

function areaLabel(value: Exclude<Category, "all">) {
  return areas[value];
}

function AuditIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
    users: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l-1.8 1.8a1.7 1.7 0 0 0-1.9-.3l-1 1.8h-2.6l-1-1.8a1.7 1.7 0 0 0-1.9.3l-1.8-1.8A1.7 1.7 0 0 0 8 15l-1.8-1v-2.6l1.8-1a1.7 1.7 0 0 0-.3-1.9l1.8-1.8a1.7 1.7 0 0 0 1.9.3l1-1.8H15l1 1.8a1.7 1.7 0 0 0 1.9-.3l1.8 1.8a1.7 1.7 0 0 0-.3 1.9l1.8 1V14z",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
    check: "M20 6 9 17l-5-5",
    alert: "M12 9v4m0 4h.01M10.3 3.8 2 18.5A1.5 1.5 0 0 0 3.3 21h17.4a1.5 1.5 0 0 0 1.3-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z",
    search: "m21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
    refresh: "M20 11a8 8 0 0 0-14.6-4.5L3 9m0-6v6h6M4 13a8 8 0 0 0 14.6 4.5L21 15m0 6v-6h-6",
    download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6m0-10h.01",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    close: "M18 6 6 18M6 6l12 12",
    filter: "M4 5h16l-6.5 8v6l-3 2v-8L4 5Z",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

async function loadEvents(params: URLSearchParams): Promise<AuditResponse> {
  const response = await fetch(`/api/admin/audit-history?${params.toString()}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`AUDIT_HTTP_${response.status}`);
  return response.json();
}

function downloadAllRowsCsv(events: AuditEvent[], description: string) {
  const headers = ["Tarih ve saat", "İşlemi yapan", "E-posta", "Güncel etkin roller", "Filtrelenen hesap rolü", "İşlem açıklaması", "Teknik işlem kodu", "Kayıt türü", "Kayıt kimliği", "Sonuç", "Olay kimliği", "İlişkilendirme kimliği"];
  const lines = [
    ["FIXOKU DENETİM MERKEZİ", "Kayıtlı olayların dışa aktarımı"],
    ["Kapsam", description],
    ["Toplam kayıt", String(events.length)],
    [],
    headers,
    ...events.map(event => [dateTime(event.createdAt, true), event.actorName || "Sistem / bilinmiyor", event.actorEmail || "", roleLabel(event.currentRoles), areaLabel(event.category), friendlyAction(event.action), event.action, subjectLabel(event.subjectType), event.subjectId, resultLabel(event.result), event.id, event.correlationId]),
  ];
  const csv = "\uFEFF" + lines.map(line => line.map(safeCsvCell).join(";")).join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `FIXOKU_DENETIM_TUM_FILTRELI_KAYITLAR_${todayIstanbul()}.csv`);
}
function downloadBlob(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}
function AuditFileLogo({ format }: { format: "csv" | "pdf" }) {
  if (format === "csv") {
    return (
      <span className="fa7-icon-stage fa7-icon-stage-csv" aria-hidden="true">
        <svg className="fa7-file-logo" width="34" height="34" viewBox="0 0 40 40" fill="none">
          <rect x="0" y="0" width="40" height="40" rx="9" fill="#117C43" />
          <path d="M11 4.5H24L31.5 12V31.8C31.5 33 30.5 34 29.3 34H12.5C11.1 34 10 32.9 10 31.5V6.2C10 5.3 10.7 4.5 11 4.5Z" fill="white" />
          <path d="M24 4.5V12H31.5Z" fill="#B3E6CA" />
          <path d="M14 16.5H27.5M14 21.2H27.5M14 25.9H27.5M19 16.5V29.5M23.3 16.5V29.5" stroke="#20955B" strokeWidth="1.45" strokeLinecap="round" />
          <rect x="3" y="26" width="34" height="11" rx="3.5" fill="#08643A" />
          <text x="20" y="34" fontFamily="Arial, sans-serif" fontSize="9.4" fontWeight="800" textAnchor="middle" fill="white">CSV</text>
        </svg>
      </span>
    );
  }

  return (
    <span className="fa7-icon-stage fa7-icon-stage-pdf" aria-hidden="true">
      <svg className="fa7-file-logo" width="34" height="34" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="9" fill="#E8322C" />
        <path d="M23.598 15.368c-.71-.76-2.164-1.197-4.224-1.197-1.1 0-2.375.11-3.76.37-.782-.77-1.562-1.67-2.307-2.72-.53-.74-.993-1.52-1.42-2.29.813-2.54 1.206-4.61 1.206-6.1 0-1.672-.603-3.416-2.34-3.416-.533 0-1.066.325-1.35.8-.783 1.408-.43 4.493.917 7.54-.503 1.52-1.035 2.973-1.7 4.605-.578 1.376-1.244 2.794-1.923 4.096C2.793 18.64.267 20.49.03 21.94c-.104.547.074 1.05.457 1.45.133.11.636.545 1.48.545 2.59 0 5.32-4.28 6.707-6.86 1.065-.36 2.13-.687 3.193-1.015 1.168-.323 2.34-.583 3.405-.765 2.735 2.504 5.146 2.9 6.358 2.9 1.492 0 2.024-.617 2.203-1.122.28-.65.07-1.37-.252-1.74l.02.04zm-1.385 1.054c-.104.544-.638.906-1.386.906-.21 0-.39-.037-.603-.072-1.36-.325-2.633-1.016-3.903-2.106 1.25-.214 2.31-.25 2.98-.25.74 0 1.38.032 1.81.144.49.106 1.27.435 1.095 1.38h.02zm-7.523-1.707c-.92.19-1.914.414-2.944.693-.816.223-1.666.474-2.52.77.463-.902.854-1.774 1.208-2.603.428-1.02.78-2.07 1.135-3.046.35.61.74 1.23 1.13 1.78.64.87 1.31 1.7 1.98 2.42v-.02zM10.04 1.23c.145-.29.43-.436.678-.436.745 0 .887.868.887 1.56 0 1.168-.354 2.942-.96 4.967-1.062-2.82-1.135-5.18-.603-6.09zM6.138 18.127C4.328 21.17 2.59 23.06 1.525 23.06c-.21 0-.387-.075-.53-.183-.214-.216-.32-.472-.248-.76.213-1.09 2.236-2.613 5.392-3.99z" transform="translate(8.6 8.6) scale(0.95)" fill="#FFFFFF" />
      </svg>
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="fa2-meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AdminAuditHistoryPage() {
  const [category, setCategory] = useState<Category>("all");
  const [domain, setDomain] = useState<Domain>("all");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState("createdAt");
  const [direction, setDirection] = useState("desc");
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportProgress, setExportProgress] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page), pageSize: String(pageSize), sort, direction, category,
    });
    if (domain !== "all") value.set("domain", domain);
    if (search.trim()) value.set("search", search.trim());
    if (action.trim()) value.set("action", action.trim());
    if (result) value.set("result", result);
    if (startDate) value.set("startDate", startDate);
    if (endDate) value.set("endDate", endDate);
    return value;
  }, [page, pageSize, sort, direction, category, domain, search, action, result, startDate, endDate]);

  const query = useQuery({
    queryKey: ["admin-audit-owner-v2", params.toString()],
    queryFn: () => loadEvents(params),
    placeholderData: keepPreviousData,
  });

  async function exportFiltered(format: "csv" | "pdf") {
    if (exporting) return;
    setExporting(format); setExportProgress("Kayıtlar hazırlanıyor..."); setExportError("");
    try {
      // The full filter and sort state is copied, but the selected page is ignored.
      const requestParams = new URLSearchParams(params);
      requestParams.set("page", "1");
      requestParams.set("pageSize", "1000");
      requestParams.set("export", "1");
      let snapshot: string | null = null;
      let expected = 0;
      const all: AuditEvent[] = [];
      const seen = new Set<string>();
      for (let currentPage = 1; ; currentPage++) {
        requestParams.set("page", String(currentPage));
        if (snapshot) requestParams.set("exportSnapshot", snapshot);
        const batch = await loadEvents(requestParams);
        if (currentPage === 1) {
          expected = batch.pagination.total;
          snapshot = batch.scope.exportSnapshot || null;
          if (!snapshot) throw new Error("Dışa aktarma için sabit kayıt zamanı alınamadı.");
          if (!expected) throw new Error("Seçili filtrelerde indirilecek kayıt bulunmuyor.");
          const limit = format === "pdf" ? 5000 : 100000;
          if (expected > limit) throw new Error(`Bu kapsamda ${number(expected)} kayıt var. ${format.toUpperCase()} sınırı ${number(limit)} kayıt. Tarih aralığını daraltın${format === "pdf" ? " veya CSV ile indirin" : ""}.`);
        }
        if (batch.scope.exportSnapshot !== snapshot || batch.pagination.total !== expected) throw new Error("İndirme sırasında kayıt kapsamı değişti. Yeniden deneyin.");
        for (const event of batch.events) {
          if (seen.has(event.id)) throw new Error("Tekrarlanan kayıt algılandı. Eksik veya mükerrer döküm oluşturulmadı.");
          seen.add(event.id); all.push(event);
        }
        if (all.length > expected) throw new Error("Beklenenden fazla kayıt alındı.");
        setExportProgress(`${number(all.length)} / ${number(expected)} kayıt alındı`);
        if (all.length === expected) break;
        if (!batch.events.length || currentPage >= batch.pagination.pageCount) throw new Error("Bütün kayıtlar alınamadı. Dosya oluşturulmadı.");
      }
      const activeTab = tabs.find(tab => tab.key === category)?.label || "Tümü";
      const domainLabel = domains.find(item => item.key === domain)?.label || "Tüm işlem alanları";
      const description = [activeTab, domainLabel, search && `Arama: ${search}`, result && `Sonuç: ${resultLabel(result)}`, action && `İşlem: ${action}`, startDate && `Başlangıç: ${startDate}`, endDate && `Bitiş: ${endDate}`, `Toplam: ${number(expected)}`].filter(Boolean).join(" | ");
      if (format === "csv") {
        downloadAllRowsCsv(all, description);
      } else {
        setExportProgress("PDF tablo sayfaları hazırlanıyor...");
        const pdfRows: AuditPdfRow[] = all.map(event => ({
          when: dateTime(event.createdAt), person: `${event.actorName || "Sistem / bilinmiyor"}${event.actorEmail ? " | " + event.actorEmail : ""}`,
          role: areaLabel(event.category), action: friendlyAction(event.action),
          target: `${subjectLabel(event.subjectType)} | ${event.subjectId}`,
          result: resultLabel(event.result),
        }));
        const blob = await createAuditPdf(pdfRows, { title: "Filtrelenmiş denetim olayları", scope: description, generatedAt: dateTime(new Date().toISOString(), true) }, (done, count) => setExportProgress(`PDF: ${done} / ${count} sayfa`));
        downloadBlob(blob, `FIXOKU_DENETIM_TUM_FILTRELI_KAYITLAR_${todayIstanbul()}.pdf`);
      }
      setExportProgress(`${number(expected)} kayıt için ${format.toUpperCase()} dosyası hazırlandı.`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Dışa aktarma sırasında hata oluştu.");
      setExportProgress("");
    } finally { setExporting(null); }
  }

  const summary = query.data?.summary;
  const events = query.data?.events || [];
  const pagination = query.data?.pagination;
  const hasActiveFilters = Boolean(search || action || result || startDate || endDate || category !== "all" || domain !== "all");

  const setTab = (value: Category) => {
    setCategory(value);
    setPage(1);
  };

  const reset = () => {
    setCategory("all");
    setDomain("all");
    setDraftSearch("");
    setSearch("");
    setResult("");
    setAction("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setSort("createdAt");
    setDirection("desc");
  };

  return (
    <main className="platform-foundation-panel admin-panel fixoku-audit-v2">
      <header className="fa2-hero">
        <div>
          <span className="fa2-eyebrow">SİSTEM · İŞLEM GÜVENLİĞİ</span>
          <h1>Denetim Merkezi</h1>
          <p>
            Öğrenci, eğitmen, işletme sahibi ve yönetici hesaplarının kaydedilmiş işlemlerini gerçek aktöre göre izleyin.
          </p>
        </div>
        <div className="fa2-hero-actions">
          <button type="button" className="fa2-button" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <AuditIcon name="refresh" />
            Yenile
          </button>
          <button type="button" className="fa2-button fa6-export fa6-export-csv" disabled={!!exporting || query.isFetching} onClick={() => void exportFiltered("csv")} title="Seçili filtrelere uyan tüm kayıtları CSV tablo olarak indir">
            <AuditFileLogo format="csv" /><span>CSV indir</span>
          </button>
          <button type="button" className="fa2-button fa6-export fa6-export-pdf" disabled={!!exporting || query.isFetching} onClick={() => void exportFiltered("pdf")} title="Seçili filtrelere uyan tüm kayıtları PDF tablo olarak indir (en fazla 5.000 kayıt)">
            <AuditFileLogo format="pdf" /><span>PDF indir</span>
          </button>
        </div>
      </header>

      {(exporting || exportProgress || exportError) && <div className={`fa6-export-status ${exportError ? "fa6-export-error" : ""}`} role="status" aria-live="polite">{exportError || exportProgress}</div>}
      <div className="fa2-info" role="note">
        <AuditIcon name="info" />
        <span>
          Bu ekran yalnızca <strong>veritabanına kaydedilmiş denetim olaylarını</strong> gösterir.
          Kaydedilmeyen hareketler burada görünmez. Sekmeler işlem konusuna göre ayrılır; rol
          sütunu ise kullanıcının mevcut aktif rolünü gösterir.
        </span>
      </div>

      <div className="fa2-metrics">
        <div className="fa2-metric">
          <div className="fa2-metric-icon blue">
            <AuditIcon name="list" size={22} />
          </div>
          <div>
            <small>Filtre kapsamındaki kayıtlar</small>
            <strong>{summary ? number(summary.total) : "—"}</strong>
            <span>Toplam kayıtlı olay</span>
          </div>
        </div>

        <div className="fa2-metric">
          <div className="fa2-metric-icon green">
            <AuditIcon name="check" size={22} />
          </div>
          <div>
            <small>Başarıyla tamamlananlar</small>
            <strong>{summary ? number(summary.success) : "—"}</strong>
            <span>Başarılı işlemler</span>
          </div>
        </div>

        <div className="fa2-metric">
          <div className="fa2-metric-icon rose">
            <AuditIcon name="alert" size={22} />
          </div>
          <div>
            <small>İnceleme gerektirenler</small>
            <strong>{summary ? number(summary.attention) : "—"}</strong>
            <span>Başarısız veya reddedilen işlemler</span>
          </div>
        </div>

        <div className="fa2-metric">
          <div className="fa2-metric-icon purple">
            <AuditIcon name="clock" size={22} />
          </div>
          <div>
            <small>Tarih ve saat düzeni</small>
            <strong className="fa2-timezone">Türkiye</strong>
            <span>Gün / ay / yıl · saat:dakika</span>
          </div>
        </div>
      </div>

      <section className="fa2-panel" aria-label="Denetim olayları">
        <div className="fa2-panel-title">
          <div>
            <h2>İşlem kayıtları</h2>
            <p>İşlemi yapan kişiyi, tarihini, ilgili kaydı ve sonucunu ayrıntılı olarak inceleyin.</p>
          </div>
        </div>

        <div className="fa9-filter-title"><span className="fa9-filter-index">1</span><span><strong>İşlemi kim yaptı?</strong><small>İşlem anındaki rol değil, mevcut etkin hesap rolü esas alınır.</small></span></div>
        <div className="fa2-tabs fa9-actor-tabs" role="tablist" aria-label="İşlemi yapanın güncel etkin rolü">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              className={`fa2-tab ${category === tab.key ? "active" : ""}`}
              onClick={() => setTab(tab.key)}
            >
              <span className="fa2-tab-icon">
                <AuditIcon name={tab.icon} size={20} />
              </span>
              <span className="fa2-tab-label">{tab.label}</span>
              <span className="fa2-tab-count">
                {tabCount(tab.key, summary)}
              </span>
            </button>
          ))}
        </div>
        <div className="fa9-process-bar">
          <div className="fa9-filter-title"><span className="fa9-filter-index">2</span><span><strong>Hangi konuda işlem yaptı?</strong><small>Aktör rolünden bağımsız işlem konusu filtresi.</small></span></div>
          <label className="fa9-domain-select">
            <span className="fa9-sr-only">İşlem konusu</span>
            <select value={domain} onChange={(event) => { setDomain(event.target.value as Domain); setPage(1); }}>
              {domains.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <form
          className="fa2-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draftSearch.trim());
            setPage(1);
          }}
        >
          <label className="fa2-search-field">
            <span>Kayıt ara</span>
            <div className="fa2-search-input">
              <AuditIcon name="search" size={16} />
              <input
                type="search"
                maxLength={100}
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Kişi, e-posta, olay veya kayıt kimliği"
              />
            </div>
          </label>

          <label>
            <span>Başlangıç tarihi</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            <span>Bitiş tarihi</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label>
            <span>İşlem sonucu</span>
            <select
              value={result}
              onChange={(event) => {
                setResult(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tüm sonuçlar</option>
              <option value="SUCCESS">Başarılı</option>
              <option value="FAILED">Başarısız</option>
              <option value="REJECTED">Reddedildi</option>
              <option value="ATTEMPT_RESERVED">Ayrılmış deneme</option>
            </select>
          </label>

          <label>
            <span>İşlem türü</span>
            <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}>
              <option value="">Tüm işlemler</option>
              <option value="order">Sipariş</option>
              <option value="payment">Ödeme</option>
              <option value="shipment">Kargo</option>
              <option value="assignment">Öğrenci ataması</option>
              <option value="payout">Hakediş</option>
              <option value="package">Paket</option>
              <option value="qualification">Uzmanlık</option>
              <option value="membership">Üyelik</option>
            </select>
          </label>

          <div className="fa2-filter-actions">
            <button type="submit" className="fa2-button fa2-primary">
              <AuditIcon name="filter" size={16} />
              Uygula
            </button>
            <button type="button" className="fa2-button" onClick={reset} disabled={!hasActiveFilters && !draftSearch}>
              Sıfırla
            </button>
          </div>
        </form>

        <div className="fa2-table-options">
          <span>
            {query.isFetching
              ? "Güncelleniyor…"
              : pagination
              ? `${number(pagination.total)} eşleşen kayıt`
              : "Kayıtlar bekleniyor"}
            {query.isPlaceholderData ? " · Önceki sonuçlar gösteriliyor" : ""}
          </span>

          <div>
            <label>
              Sıralama
              <select
                value={`${sort}:${direction}`}
                onChange={(event) => {
                  const [nextSort, nextDirection] = event.target.value.split(":");
                  setSort(nextSort);
                  setDirection(nextDirection);
                  setPage(1);
                }}
              >
                <option value="createdAt:desc">En yeni</option>
                <option value="createdAt:asc">En eski</option>
                <option value="action:asc">İşlem A–Z</option>
                <option value="result:asc">Sonuç A–Z</option>
              </select>
            </label>

            <label>
              Sayfa başına
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1.000</option>
              </select>
            </label>
          </div>
        </div>

        {query.isError ? (
          <div className="fa2-empty" role="alert">
            <AuditIcon name="alert" size={24} />
            <h3>Denetim kayıtları yüklenemedi</h3>
            <p>Bağlantıyı ve yetkilerinizi kontrol edip tekrar deneyin.</p>
            <button className="fa2-button" type="button" onClick={() => void query.refetch()}>
              Tekrar dene
            </button>
          </div>
        ) : query.isLoading ? (
          <div className="fa2-empty" role="status">
            Denetim kayıtları yükleniyor…
          </div>
        ) : events.length === 0 ? (
          <div className="fa2-empty">
            <AuditIcon name="search" size={26} />
            <h3>Kayıt bulunamadı</h3>
            <p>Seçili tarih, kategori veya arama koşullarına uygun kaydedilmiş bir olay bulunmuyor.</p>
          </div>
        ) : (
          <div className="fa2-table-wrap">
            <table className="fa2-table">
              <thead>
                <tr>
                  <th>TARİH · SAAT</th>
                  <th>İŞLEMİ YAPAN</th>
                  <th>GÜNCEL ROL</th>
                  <th>GERÇEKLEŞEN İŞLEM</th>
                  <th>İLGİLİ KAYIT</th>
                  <th>SONUÇ</th>
                  <th>İNCELE</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="fa2-date">
                      {dateTime(event.createdAt)}
                    </td>
                    <td>
                      <span className="fa2-actor">
                        <AuditAvatar event={event} />
                        <span>
                          <strong>{event.actorName || "Sistem / bilinmiyor"}</strong>
                          <small>{event.actorEmail || "Kullanıcı bilgisi bulunmuyor"}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <ActorGroupBadge category={event.category} />
                    </td>
                    <td>
                      <strong>{friendlyAction(event.action)}</strong>
                      <small className="fa2-explanation">{actionExplanation(event)}</small>
                    </td>
                    <td>
                      <span className="fa2-subject">{subjectTypeLabel(event.subjectType)}</span>
                      <small title={event.subjectId}>
                        {event.subjectId.length > 24 ? `${event.subjectId.slice(0, 24)}…` : event.subjectId}
                      </small>
                    </td>
                    <td>
                      <span className={`fa2-result ${resultTone(event.result)}`}>
                        <span className="fa2-dot" />
                        {resultLabel(event.result)}
                      </span>
                    </td>
                    <td>
                      <button className="fa2-detail-button" type="button" onClick={() => setSelected(event)}>
                        Ayrıntı
                        <AuditIcon name="arrow" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="fa2-pagination">
          <span>
            {pagination && pagination.total
              ? `${number((page - 1) * pageSize + 1)}–${number(Math.min(page * pageSize, pagination.total))} / ${number(
                  pagination.total,
                )} kayıt`
              : "Kayıt yok"}
          </span>

          <div>
            <button
              type="button"
              className="fa2-button"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              ← Önceki
            </button>
            <strong>
              {page} / {Math.max(1, pagination?.pageCount || 1)}
            </strong>
            <button
              type="button"
              className="fa2-button"
              disabled={page >= (pagination?.pageCount || 1) || query.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              Sonraki →
            </button>
          </div>
        </div>
      </section>

      <div className="fa2-bottom-notes">
        <div>
          <AuditIcon name="info" size={20} />
          <div>
            <h3>Kapsam notu</h3>
            <p>
              Bu ekran her kullanıcı tıklamasını değil, sunucuda kaydedilen denetim olaylarını gösterir.
              Eksik kayıt noktaları ilerleyen geliştirmelerle tamamlanabilir.
            </p>
          </div>
        </div>
        <div>
          <AuditIcon name="shield" size={20} />
          <div>
            <h3>Kişisel veri koruması</h3>
            <p>
              Ham olay metaverileri gösterilmez veya CSV&apos;ye aktarılmaz. Rol sütunu mevcut aktif
              rolleri yansıtır; olay anındaki geçmiş rol kaydı değildir.
            </p>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fa2-modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="fa2-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fa2-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fa2-modal-head">
              <div className="fa2-modal-head-main">
                <div className="fa2-modal-icon">
                  <AuditIcon name="shield" size={22} />
                </div>
                <div>
                  <span className="fa2-eyebrow">DENETİM OLAYI</span>
                  <h2 id="fa2-modal-title">İşlem ayrıntısı</h2>
                  <p>Kimin hangi işlemi gerçekleştirdiğini ve işlemin sonucunu tek bakışta görün.</p>
                </div>
              </div>

              <button
                type="button"
                className="fa2-close-button"
                onClick={() => setSelected(null)}
                aria-label="Ayrıntıları kapat"
              >
                <AuditIcon name="close" />
              </button>
            </div>

            <div className="fa2-modal-body fa4-modal-body">
              <div className="fa4-modal-hero">
                <div className="fa4-person-line">
                  <AuditAvatar event={selected} large />
                  <div>
                    <span className="fa4-section-eyebrow">İŞLEMİ YAPAN</span>
                    <strong>{selected.actorName || "Sistem / bilinmiyor"}</strong>
                    <small>{selected.actorEmail || "E-posta bilgisi bulunmuyor"}</small>
                    <span className="fa4-current-role">Güncel rol: <ActorGroupBadge category={selected.category} /></span>
                  </div>
                </div>
                <div className="fa4-modal-status"><span className={`fa2-result ${resultTone(selected.result)}`}><span className="fa2-dot"/>{resultLabel(selected.result)}</span><span>{dateTime(selected.createdAt, true)}</span></div>
              </div>
              <div className="fa4-story-grid">
                <section className="fa4-story-card fa4-what">
                  <span className="fa4-section-eyebrow">NE YAPTI?</span>
                  <h3>{friendlyAction(selected.action)}</h3>
                  <p>{actionExplanation(selected)}</p>
                </section>
                <section className="fa4-story-card fa4-target">
                  <span className="fa4-section-eyebrow">NEYİ ETKİLEDİ?</span>
                  <h3>{subjectLabel(selected.subjectType)}</h3>
                  <p>İlişkili kayıt: <code>{selected.subjectId || "Kimlik bulunmuyor"}</code></p>
                  <small>Bu kayıtla ilişkili kişinin adı olayda tutulmuyorsa tahmin edilmez.</small>
                </section>
                <section className="fa4-story-card fa4-outcome">
                  <span className="fa4-section-eyebrow">SONUÇ NE OLDU?</span>
                  <h3>{resultLabel(selected.result)}</h3>
                  <p>İşlemin denetim sistemine kaydedilmiş sonucudur. İşlem öncesi ve sonrası alan değerleri bu kayıtta ayrıca bulunmayabilir.</p>
                </section>
                <section className="fa4-story-card fa4-when">
                  <span className="fa4-section-eyebrow">NE ZAMAN?</span>
                  <h3>{dateTime(selected.createdAt, true)}</h3>
                  <p>Türkiye saatine göre işlem zamanı.</p>
                </section>
              </div>
              <details className="fa4-technical">
                <summary>Teknik ayrıntıları göster <span>İşlem kodu ve kayıt kimlikleri</span></summary>
                <dl>
                  {[
                    ["İşlem kodu", selected.action],
                    ["İşlemi yapan hesap grubu", areaLabel(selected.category)],
                    ["Hedef türü", selected.subjectType],
                    ["Hedef kimliği", selected.subjectId],
                    ["Olay kimliği", selected.id],
                    ["İlişkilendirme kimliği", selected.correlationId],
                  ].map(([label, value]) => <div className="fa4-tech-row" key={label}><dt>{label}</dt><dd>{value || "Yok"}</dd></div>)}
                </dl>
              </details>
              <div className="fa2-modal-note">
                <AuditIcon name="info" size={18} />
                <span>Bu ekran, kaydedilen olayları açıklar. Mevcut roller işlem anındaki rolleri kanıtlamaz. Fotoğraflar yalnızca yetkili kullanıcılar için yüklenir; özel ve hassas metaveriler gösterilmez.</span>
              </div>
            </div>
            <div className="fa2-modal-footer">
              <button type="button" className="fa2-button" onClick={() => setSelected(null)}>
                Kapat
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
