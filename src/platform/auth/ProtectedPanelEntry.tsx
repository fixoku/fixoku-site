import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { TrainerDashboardPreview } from "../trainer/dashboard/TrainerDashboardPreview";

type PanelContext = { user: { id: string; name: string; email: string }; roles: string[]; destination: string | null; destinations?: string[]; selectionRequired?: boolean };

export function ProtectedPanelEntry({ requiredRole, children }: { requiredRole?: string | readonly string[]; children?: (context: PanelContext) => ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<{ status: "loading" } | { status: "ready"; context: PanelContext } | { status: "denied" }>({ status: "loading" });
  useEffect(() => {
    let active = true;
    const query = requiredRole ? `?panel=${encodeURIComponent(location.pathname)}` : "";
    fetch(`/api/panel-context${query}`, { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) { if (active) setState({ status: "denied" }); return; }
      const context = await response.json() as PanelContext;
      if (active) setState({ status: "ready", context });
    }).catch(() => active && setState({ status: "denied" }));
    return () => { active = false; };
  }, [location.pathname, requiredRole]);
  if (state.status === "loading") return <main className="route-loading-status" aria-live="polite">Oturum doğrulanıyor…</main>;
  if (state.status === "denied") return <Navigate replace to={`/giris?returnTo=${encodeURIComponent(location.pathname)}`} />;
  const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : [];
  if (allowedRoles.length && !allowedRoles.some((role) => state.context.roles.includes(role))) return <main className="platform-access-denied"><h1>Bu panele erişim izniniz yok.</h1><p>Hesabınızın yetkili olduğu panele devam edebilirsiniz.</p><button type="button" onClick={() => navigate(state.context.destination ?? state.context.destinations?.[0] ?? "/giris")}>Yetkili panele git</button></main>;
  return <>{children?.(state.context)}</>;
}

export function ProtectedTrainerDashboard() {
  return <ProtectedPanelEntry requiredRole="TRAINER">{({ user }) => <TrainerDashboardPreview user={user} />}</ProtectedPanelEntry>;
}

export function ProtectedPanelRouter() {
  return <ProtectedPanelEntry>{({ destination, destinations = [] }) => destination ? <Navigate replace to={destination as string} /> : <main className="platform-panel-chooser"><h1>Panel seçin</h1><p>Hesabınızın yetkili olduğu paneli seçin.</p><div>{destinations.map((target) => <button type="button" key={target} onClick={() => window.location.assign(target)}>{target}</button>)}</div></main>}</ProtectedPanelEntry>;
}

export function FoundationPanel({ title, role }: { title: string; role: string | readonly string[] }) {
  return <ProtectedPanelEntry requiredRole={role}>{({ user }) => <main className="platform-foundation-panel"><h1>{title}</h1><p>Hoş geldiniz, {user.name}.</p><p>Bu panel temeli Phase 1C kapsamında hazırlanmıştır.</p></main>}</ProtectedPanelEntry>;
}
