import type { ReactNode } from "react";

export function PanelCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return <article className={`panel-card ${className}`}>{children}</article>;
}
