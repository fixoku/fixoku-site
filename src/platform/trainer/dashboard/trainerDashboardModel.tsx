import type { ReactNode } from "react";
import { TRAINER_VISUAL_FIXTURE } from "../../test-support/deterministicFixtures";

export type TrainerDashboardMetric = Readonly<{
  icon: "book" | "presentation" | "folder" | "users" | "cap" | "wallet" | "package";
  title: string;
  value?: ReactNode;
  detail: string;
  action?: string;
}>;

export type TrainerDashboardViewModel = Readonly<{
  trainerName: string;
  greeting: string;
  heroDescription: string;
  metrics: readonly TrainerDashboardMetric[];
  quickActions: readonly Readonly<{ icon: "package" | "presentation" | "folder"; label: string }>[];
}>;

const metrics: readonly TrainerDashboardMetric[] = [
  { icon: "cap", title: "Aktif Eğitimlerim", detail: "Devam eden ve yakında başlayacak eğitimleriniz", action: "Eğitimlerime Git" },
  { icon: "folder", title: "Eğitmen Kaynakları", detail: "Katalog, broşür, görüşme rehberi ve sertifikalar", action: "Kaynaklara Git" },
  { icon: "users", title: "Aktif Öğrencilerim", detail: "Devam eden eğitimlerinizdeki aktif öğrenci sayısı" },
  { icon: "package", title: "Eğitmen Paketleri", detail: "Eğitmen eğitimlerini ve erişim durumunuzu inceleyin.", action: "Paketleri İncele" },
  { icon: "wallet", title: "Güncel Bakiyem", detail: "Bu ay toplam hak ediş (Bekleyen ödemeler dahil)" },
];

const quickActions: TrainerDashboardViewModel["quickActions"] = [
  { icon: "package", label: "Yeni eğitim paketlerini incele" },
  { icon: "folder", label: "Eğitmen kaynaklarını incele" },
];

export const TRAINER_DASHBOARD_PREVIEW: TrainerDashboardViewModel = Object.freeze({
  trainerName: TRAINER_VISUAL_FIXTURE.trainerName,
  greeting: `Merhaba ${TRAINER_VISUAL_FIXTURE.trainerName.split(" ")[0]} Hocam`,
  heroDescription: "Fixoku eğitmen panelinden eğitimlerinize, atamalarınıza ve kaynaklarınıza hızlıca ulaşabilirsiniz.",
  metrics,
  quickActions,
});
