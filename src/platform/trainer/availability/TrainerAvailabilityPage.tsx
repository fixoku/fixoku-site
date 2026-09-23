import { Navigate } from "react-router-dom";
// Retire the old scheduling entry point at the view boundary; existing server data stays intact.
export function TrainerAvailabilityPage(_props: { user: { id: string; name: string; email: string } }) {
  return <Navigate to="/panel/egitmen" replace />;
}
