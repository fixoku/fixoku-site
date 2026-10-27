import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "./content.css";
import AppRoutes from "./AppRoutes.jsx";

const root = document.getElementById("root");
const application = (
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>
);

if (root.dataset.renderMode === "prerendered") {
  hydrateRoot(root, application);
} else {
  createRoot(root).render(application);
}
