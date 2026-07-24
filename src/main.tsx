import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline } from "@mui/material";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import "./index.css";
import { appTheme } from "./theme";
import App from "./App";
import ReportRoot from "./report/ReportRoot";
import ShareRoot from "./share/ShareRoot";
import { isShareRouteHash } from "./share/parseShareRoute";

const hash = window.location.hash;
const isReportRoute = hash === "#/report" || hash.startsWith("#/report?");
const isShareRoute = isShareRouteHash(hash);

function RootRoute() {
  if (isShareRoute) return <ShareRoot />;
  if (isReportRoute) return <ReportRoot />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InitColorSchemeScript attribute="class" defaultMode="light" />
    <ThemeProvider theme={appTheme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <RootRoute />
    </ThemeProvider>
  </StrictMode>
);
