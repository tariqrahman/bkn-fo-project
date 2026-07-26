import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PayrollPage } from "@/pages/PayrollPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PayrollPage />
  </StrictMode>,
);
