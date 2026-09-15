import type { ReactNode } from "react";
import { TRAINER_VISUAL_FIXTURE } from "../../test-support/deterministicFixtures";

export type TrainerDashboardMetric = Readonly<{
  icon: "book" | "presentation" | "folder" | "users" | "calendar" | "wallet";
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
  quickActions: readonly Readonly<{ icon: "package" | "presentation" | "calendar"; label: string }>[];
}>;

const metrics: readonly TrainerDashboardMetric[] = [
  { icon: "book", title: "Aktif Eğitimlerim", detail: "Devam eden ve yakında başlayacak eğitimleriniz", action: "Eğitimlerime Git" },
  { icon: "presentation", title: "Sunumlarım", detail: "Hazırladığınız sunumlara buradan ulaşabilirsiniz.", action: "Sunumları Aç" },
  { icon: "folder", title: "Eğitmen Kaynakları", detail: "Katalog, broşür, görüşme rehberi ve sertifikalar", action: "Kaynaklara Git" },
  { icon: "users", title: "Aktif Öğrencilerim", value: "4 Öğrenci", detail: "Devam eden eğitimlerinizdeki aktif öğrenci sayısı" },
  { icon: "calendar", title: "Müsaitlik Takvimim", detail: "Görüşme ve eğitim planlarınızı yönetin.", action: "Takvimi Güncelle" },
  { icon: "wallet", title: "Güncel Bakiyem", detail: "Bu ay toplam hak ediş (Bekleyen ödemeler dahil)" },
];

const quickActions: TrainerDashboardViewModel["quickActions"] = [
  { icon: "package", label: "Yeni eğitim paketlerini incele" },
  { icon: "presentation", label: "Güncel sunumu aç" },
  { icon: "calendar", label: "Müsaitlik durumunu güncelle" },
];

export const TRAINER_DASHBOARD_PREVIEW: TrainerDashboardViewModel = Object.freeze({
  trainerName: TRAINER_VISUAL_FIXTURE.trainerName,
  greeting: `Merhaba ${TRAINER_VISUAL_FIXTURE.trainerName.split(" ")[0]} Hocam`,
  heroDescription: "Fixoku eğitmen panelinden eğitimlerinize, sunumlarınıza ve kaynaklarınıza hızlıca ulaşabilirsiniz.",
  metrics,
  quickActions,
});
