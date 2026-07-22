import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "./index.css";
import { appTheme } from "./theme";
import App from "./App";
import ReportRoot from "./report/ReportRoot";

const isReportRoute =
  window.location.hash === "#/report" || window.location.hash.startsWith("#/report?");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InitColorSchemeScript attribute="class" defaultMode="light" />
    <ThemeProvider theme={appTheme} defaultMode="light">
      <CssBaseline enableColorScheme />
      {isReportRoute ? <ReportRoot /> : <App />}
    </ThemeProvider>
  </StrictMode>
);
