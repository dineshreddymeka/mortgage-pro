import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Alert from "@mui/material/Alert";
import {
  Box,
  Button,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useColorScheme, useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { CompareTab } from "./tabs/CompareTab";
import { FinancingTab } from "./tabs/MortgageTab";
import { PropertyTab } from "./tabs/PropertyTab";
import { RentalTab } from "./tabs/RentalTab";
import { UpfrontCashTab } from "./tabs/UpfrontCashTab";
import { WhenToSellTab } from "./tabs/WhenToSellTab";
import { HouseNavBar } from "./components/HouseNavBar";
import { RevisionConflictDialog } from "./components/RevisionConflictDialog";
import { WorkspaceKpiStrip } from "./components/WorkspaceKpiStrip";
import { useMortgageSyncedState } from "./hooks/useMortgageSyncedState";
import { buildHouseComparisonRow } from "./lib/houseComparison";
import { downloadScenarioExcel } from "./lib/scenarioExcelExport";
import { deriveScenario } from "./lib/deriveScenario";
import { openScenarioReportWindow } from "./report/reportStorage";

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** One tab per category — editors are not duplicated across tabs. */
const TABS = [
  { label: "Property", id: "property" },
  { label: "Financing", id: "financing" },
  { label: "Upfront", id: "upfront" },
  { label: "Rental", id: "rental" },
  { label: "Exit", id: "exit" },
  { label: "Compare", id: "compare" },
] as const;

const TAB_INDEX = {
  property: 0,
  financing: 1,
  upfront: 2,
  rental: 3,
  exit: 4,
  compare: 5,
} as const;

export default function App() {
  const { setMode } = useColorScheme();
  const theme = useTheme();
  const {
    state,
    patch,
    reset,
    saveToBrowser,
    saveToCloud,
    properties,
    archivedProperties,
    comparisons,
    activePropertyId,
    activeHouseId,
    activeHouseLabel,
    selectProperty,
    createNewProperty,
    archiveHouse,
    restoreHouse,
    renameActiveHouse,
    cloudStatus,
    cloudError,
    userId,
    authProfile,
    activeAccessRole,
    revisionConflict,
    conflictBusy,
    reloadPortfolio,
    dismissRevisionConflict,
    reloadFromRemote,
    overwriteRemote,
  } = useMortgageSyncedState();
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(
    null
  );

  const isDark = theme.palette.mode === "dark";

  const derived = useMemo(() => deriveScenario(state), [state]);
  const payment = derived.monthlyPayment;

  const activeComparison = useMemo(() => {
    const fromCloud = comparisons.find((c) => c.id === activePropertyId);
    if (fromCloud) return fromCloud;
    return buildHouseComparisonRow(
      activePropertyId ?? "local",
      1,
      state,
      activeHouseId,
      activeHouseLabel
    );
  }, [comparisons, activePropertyId, activeHouseId, activeHouseLabel, state]);

  /** Always feed Compare at least the active house (works offline / before cloud sync). */
  const compareRows = useMemo(() => {
    if (comparisons.length > 0) return comparisons;
    return [activeComparison];
  }, [comparisons, activeComparison]);

  function exportExcel() {
    downloadScenarioExcel(state, `house-${activeHouseId}.xlsx`, {
      id: activeHouseId,
      houseId: activeHouseId,
      houseNumber: activeComparison.houseNumber,
      name: activeHouseLabel,
    });
    setToast({ message: `Exported ${activeHouseLabel} to Excel.`, severity: "success" });
  }

  function openReport() {
    const opened = openScenarioReportWindow(state, {
      houseId: activeHouseId,
      houseLabel: activeHouseLabel,
      houseNumber: activeComparison.houseNumber,
      name: activeHouseLabel,
    });
    setToast({
      message: opened ? `Opened print report for ${activeHouseLabel}.` : "Allow pop-ups to open the print report.",
      severity: opened ? "success" : "error",
    });
  }

  async function saveScenario() {
    try {
      const cloud = await saveToCloud();
      setToast({
        message: cloud
          ? `Saved all tab data for ${activeHouseLabel} to Firestore.`
          : `Saved all tab data for ${activeHouseLabel} in this browser.`,
        severity: "success",
      });
    } catch {
      saveToBrowser();
      setToast({
        message: `Saved ${activeHouseLabel} in this browser (cloud save failed).`,
        severity: "error",
      });
    }
  }

  const houseHandlers = {
    onSelect: (id: string) => {
      void selectProperty(id).catch(() =>
        setToast({ message: "Could not open that house.", severity: "error" })
      );
    },
    onCreate: () => {
      void createNewProperty()
        .then((id) => {
          if (id) {
            setToast({ message: "New house added. All tabs start fresh.", severity: "success" });
            setTab(TAB_INDEX.property);
          }
        })
        .catch(() => setToast({ message: "Could not create house.", severity: "error" }));
    },
    onArchive: (id: string) => {
      void archiveHouse(id)
        .then((ok) => {
          if (ok) {
            setToast({
              message: "House archived. Full tab data kept — restore anytime.",
              severity: "success",
            });
          }
        })
        .catch(() => setToast({ message: "Could not archive house.", severity: "error" }));
    },
    onRestore: (id: string) => {
      void restoreHouse(id)
        .then((ok) => {
          if (ok) {
            setToast({
              message: "House restored with the same ID and full scenario.",
              severity: "success",
            });
          }
        })
        .catch(() => setToast({ message: "Could not restore house.", severity: "error" }));
    },
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "transparent", display: "flex", flexDirection: "column" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "light" ? alpha("#eef3f7", 0.86) : alpha("#071018", 0.86),
          backdropFilter: "saturate(160%) blur(18px)",
          WebkitBackdropFilter: "saturate(160%) blur(18px)",
        }}
      >
        <Box sx={{ px: { xs: 1.25, sm: 2 }, py: { xs: 0.65, sm: 0.75 }, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            sx={{ rowGap: 0.6 }}
          >
            <Stack direction="row" spacing={{ xs: 0.85, sm: 1.25 }} alignItems="baseline" sx={{ minWidth: 0, flex: "1 1 auto" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: "var(--pp-font-display)",
                    fontWeight: 700,
                    fontSize: { xs: "1rem", sm: "1.2rem" },
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                  }}
                >
                  Property Pro
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  Deal desk
                </Typography>
              </Box>
              <Typography
                className="pp-mono"
                sx={{
                  fontWeight: 650,
                  fontSize: { xs: "0.88rem", sm: "1.1rem" },
                  letterSpacing: "-0.03em",
                  color: "secondary.main",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {moneyDec.format(payment.total)}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.35, fontWeight: 600, fontSize: "0.68rem" }}
                >
                  /mo
                </Typography>
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.35} alignItems="center" flexWrap="nowrap" useFlexGap sx={{ flexShrink: 0 }}>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  void saveScenario();
                }}
                aria-label="Save all tab data"
                sx={{ minHeight: 32, px: { xs: 1, sm: 1.35 }, fontWeight: 700, minWidth: 0 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Save all
                </Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  Save
                </Box>
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={openReport}
                aria-label="Open print report"
                sx={{ minHeight: 32, px: { xs: 0.85, sm: 1.25 }, minWidth: 0 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Report
                </Box>
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={exportExcel}
                aria-label="Export scenario to Excel"
                sx={{ minHeight: 32, px: { xs: 0.85, sm: 1.25 }, minWidth: 0 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Export
                </Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  XLS
                </Box>
              </Button>
              <Tooltip title="Clear all tab values for this house to zero">
                <Button
                  size="small"
                  variant="text"
                  startIcon={<RestartAltIcon sx={{ fontSize: 17 }} />}
                  onClick={reset}
                  aria-label="Reset all tab values to zero"
                  sx={{
                    minHeight: 32,
                    px: { xs: 0.5, sm: 1 },
                    minWidth: { xs: 36, sm: "auto" },
                    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    Reset
                  </Box>
                </Button>
              </Tooltip>
              <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
                <IconButton
                  onClick={() => setMode(isDark ? "light" : "dark")}
                  aria-label="toggle color mode"
                  size="small"
                >
                  {isDark ? (
                    <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          maxWidth: 1400,
          width: "100%",
          mx: "auto",
          minHeight: 0,
        }}
      >
        <HouseNavBar
          cloudStatus={cloudStatus}
          cloudError={cloudError}
          properties={properties}
          archivedProperties={archivedProperties}
          comparisons={comparisons}
          activePropertyId={activePropertyId}
          onSelect={houseHandlers.onSelect}
          onCreate={houseHandlers.onCreate}
          onArchive={houseHandlers.onArchive}
          onRestore={houseHandlers.onRestore}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 1.25, sm: 2 },
            pt: { xs: 0.85, sm: 1.1 },
            pb: { xs: 2, sm: 1.5 },
            overflowX: "hidden",
          }}
        >
          <WorkspaceKpiStrip
            houseLabel={activeHouseLabel}
            row={activeComparison}
            rateApr={state.interestRateApr}
            termYears={state.termYears}
          />

          <Box
            role="tablist"
            aria-label="Main sections"
            className="pp-rise-delay"
            sx={{
              display: "flex",
              width: "100%",
              maxWidth: "100%",
              p: 0.35,
              gap: 0.25,
              borderRadius: "10px",
              bgcolor: (t) =>
                t.palette.mode === "light" ? alpha("#0b1f33", 0.05) : alpha("#e8eef4", 0.08),
              border: "1px solid",
              borderColor: "divider",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              mb: 1,
              // Soft fade hints that more tabs are off-screen on phones.
              maskImage: {
                xs: "linear-gradient(90deg, #000 0%, #000 calc(100% - 28px), transparent 100%)",
                sm: "none",
              },
            }}
          >
            {TABS.map(({ label, id }, i) => {
              const selected = tab === i;
              return (
                <Button
                  key={id}
                  size="small"
                  disableElevation
                  id={`tab-${id}`}
                  aria-controls={`tabpanel-${id}`}
                  aria-selected={selected}
                  role="tab"
                  onClick={() => setTab(i)}
                  sx={{
                    py: 0.5,
                    px: { xs: 1.1, sm: 1.4 },
                    minWidth: "auto",
                    minHeight: { xs: 34, sm: 30 },
                    borderRadius: "8px",
                    bgcolor: selected ? "secondary.main" : "transparent !important",
                    color: selected ? "secondary.contrastText" : "text.secondary",
                    fontWeight: selected ? 700 : 600,
                    fontSize: { xs: "0.78rem", sm: "0.8125rem" },
                    letterSpacing: "-0.015em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    touchAction: "manipulation",
                    "&:hover": {
                      color: selected ? "secondary.contrastText" : "text.primary",
                      bgcolor: selected
                        ? "secondary.dark"
                        : (t) => alpha(t.palette.text.primary, 0.04),
                    },
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>

          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.property}
            id="tabpanel-property"
            aria-labelledby="tab-property"
          >
            {tab === TAB_INDEX.property ? (
              <PropertyTab
                state={state}
                patch={patch}
                houseId={activeHouseId}
                propertyName={activeHouseLabel}
                propertyDocId={activePropertyId}
                ownerUid={userId}
                viewerEmail={authProfile?.email ?? null}
                activeAccessRole={activeAccessRole}
                cloudReady={cloudStatus === "ready"}
                onReloadPortfolio={() => void reloadPortfolio()}
                onNotify={(message, severity = "success") => setToast({ message, severity })}
                onRename={async (name) => {
                  try {
                    const next = await renameActiveHouse(name);
                    if (next) {
                      setToast({ message: `Renamed to “${next}”.`, severity: "success" });
                    }
                    return next;
                  } catch {
                    setToast({ message: "Could not rename property.", severity: "error" });
                    return null;
                  }
                }}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.financing}
            id="tabpanel-financing"
            aria-labelledby="tab-financing"
          >
            {tab === TAB_INDEX.financing ? (
              <FinancingTab
                state={state}
                patch={patch}
                onNotify={(message, severity = "success") => setToast({ message, severity })}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.upfront}
            id="tabpanel-upfront"
            aria-labelledby="tab-upfront"
          >
            {tab === TAB_INDEX.upfront ? <UpfrontCashTab state={state} patch={patch} /> : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.rental}
            id="tabpanel-rental"
            aria-labelledby="tab-rental"
          >
            {tab === TAB_INDEX.rental ? (
              <RentalTab
                state={state}
                patch={patch}
                onGoToFinancing={() => setTab(TAB_INDEX.financing)}
                onGoToUpfront={() => setTab(TAB_INDEX.upfront)}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.exit}
            id="tabpanel-exit"
            aria-labelledby="tab-exit"
          >
            {tab === TAB_INDEX.exit ? (
              <WhenToSellTab
                state={state}
                patch={patch}
                onGoToFinancing={() => setTab(TAB_INDEX.financing)}
                onGoToUpfront={() => setTab(TAB_INDEX.upfront)}
                onGoToRental={() => setTab(TAB_INDEX.rental)}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== TAB_INDEX.compare}
            id="tabpanel-compare"
            aria-labelledby="tab-compare"
          >
            {tab === TAB_INDEX.compare ? (
              <CompareTab
                rows={compareRows}
                properties={properties}
                activePropertyId={activePropertyId}
                activeState={state}
                cloudReady={cloudStatus === "ready"}
                onSelect={houseHandlers.onSelect}
              />
            ) : null}
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ lineHeight: 1.35, pt: 1, pb: 0.25, fontSize: "0.68rem", opacity: 0.85 }}
          >
            Estimates only. {activeHouseLabel}: one category per tab
            {cloudStatus === "ready" ? " · synced to Firestore." : " · saved in this browser."}
            {cloudError ? ` ${cloudError}` : ""}
          </Typography>
        </Box>
      </Box>

      <RevisionConflictDialog
        open={revisionConflict != null}
        conflict={revisionConflict}
        busy={conflictBusy}
        onDismiss={dismissRevisionConflict}
        onReload={() => void reloadFromRemote()}
        onOverwrite={() => void overwriteRemote()}
      />

      <Snackbar
        open={toast != null}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity ?? "success"}
          variant="filled"
          sx={{ width: "100%", bgcolor: "secondary.main" }}
        >
          {toast?.message ?? ""}
        </Alert>
      </Snackbar>
    </Box>
  );
}
