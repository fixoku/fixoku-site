import { TrainerPresentationsTab } from "./TrainerPresentationsTab";
import { PanelShell } from "../../panel/layout/PanelShell";
import "./trainer-shared-presentations.css";

/** Shared presentations are free for verified Trainers and candidates. */
export function TrainerPresentationsPage({ user }: { user: { name: string; email?: string } }) {
  return <PanelShell role="TRAINER" user={user}>
    <main className="trainer-commerce-page trainer-video-page" aria-label="Eğitmen ortak sunumları">
      <div className="trainer-commerce-heading">
        <a href="/panel/egitmen/egitimlerim">← Eğitimlerim</a>
        <h2>Ortak Sunumlarım</h2>
        <p>Doğrulanmış eğitmenler için beş ortak PDF sunumu. Paket satın alma koşulu yoktur.</p>
      </div>
      <TrainerPresentationsTab watermarkName={user.name} />
    </main>
  </PanelShell>;
}
