import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import AppRoutes from "./AppRoutes.jsx";

export function renderRoute(pathname) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={pathname}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  );
}
