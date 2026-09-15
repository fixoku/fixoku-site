import type { ReactNode } from "react";
import { PanelShell } from "../panel/layout/PanelShell";

type StudentPanelShellProps = {
  user: { name: string; email?: string };
  guardian?: boolean;
  studentProfileId?: string | null;
  children: ReactNode;
};

/** Shared Fixoku shell for student and guardian surfaces. */
export function StudentPanelShell({ user, guardian = false, studentProfileId, children }: StudentPanelShellProps) {
  // Öğrenci ekranları, eğitmen ve yönetici ekranlarıyla aynı ürün kabuğunu kullanır.
  // Veli bağlamı sayfanın kendi seçim bileşeninde gösterilir; kabukta ayrı bir görsel dil yoktur.
  void guardian;
  void studentProfileId;
  return <PanelShell user={user} role="STUDENT">{children}</PanelShell>;
}
