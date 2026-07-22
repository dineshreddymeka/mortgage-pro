import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
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
import { MortgageTab } from "./tabs/MortgageTab";
import { RentalTab } from "./tabs/RentalTab";
import { UpfrontCashTab } from "./tabs/UpfrontCashTab";
import { WhenToSellTab } from "./tabs/WhenToSellTab";
import { HouseNavBar } from "./components/HouseNavBar";
import { WorkspaceKpiStrip } from "./components/WorkspaceKpiStrip";
import { useMortgageSyncedState } from "./hooks/useMortgageSyncedState";
import { buildHouseComparisonRow } from "./lib/houseComparison";
import { downloadScenarioExcel } from "./lib/scenarioExcelExport";
import { computeMonthlyPayment } from "./lib/mortgageMath";

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TABS = [
  { label: "Mortgage", id: "mortgage" },
  { label: "Upfront", id: "upfront" },
  { label: "Rental", id: "rental" },
  { label: "When to sell", id: "sell" },
  { label: "Compare", id: "compare" },
] as const;

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
    activeHouseLabel,
    selectProperty,
    createNewProperty,
    archiveHouse,
    restoreHouse,
    cloudStatus,
    cloudError,
  } = useMortgageSyncedState();
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(
    null
  );

  const isDark = theme.palette.mode === "dark";

  const payment = useMemo(
    () =>
      computeMonthlyPayment(
        state.homePrice,
        state.downPayment,
        state.interestRateApr,
        state.termYears,
        state.propertyTaxAnnual,
        state.insuranceAnnual,
        state.hoaMonthly,
        state.pmiMonthly
      ),
    [
      state.downPayment,
      state.homePrice,
      state.hoaMonthly,
      state.insuranceAnnual,
      state.interestRateApr,
      state.pmiMonthly,
      state.propertyTaxAnnual,
      state.termYears,
    ]
  );

  const activeComparison = useMemo(() => {
    const fromCloud = comparisons.find((c) => c.id === activePropertyId);
    if (fromCloud) return fromCloud;
    return buildHouseComparisonRow(activePropertyId ?? "local", 1, state);
  }, [comparisons, activePropertyId, state]);

  function exportExcel() {
    downloadScenarioExcel(state);
    setToast({
      message: `Exported ${activeHouseLabel} to Excel.`,
      severity: "success",
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
            setTab(0);
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
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 0.75, maxWidth: 1400, mx: "auto", width: "100%" }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            sx={{ rowGap: 0.75 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="baseline" sx={{ minWidth: 0 }}>
              <Box>
                <Typography
                  component="h1"
                  sx={{
                    fontFamily: "var(--pp-font-display)",
                    fontWeight: 700,
                    fontSize: { xs: "1.05rem", sm: "1.2rem" },
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
                  }}
                >
                  Deal desk
                </Typography>
              </Box>
              <Typography
                className="pp-mono"
                sx={{
                  fontWeight: 650,
                  fontSize: { xs: "0.95rem", sm: "1.1rem" },
                  letterSpacing: "-0.03em",
                  color: "secondary.main",
                  whiteSpace: "nowrap",
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

            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  void saveScenario();
                }}
                aria-label="Save all tab data"
                sx={{ minHeight: 32, px: 1.35, fontWeight: 700 }}
              >
                Save all
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={exportExcel}
                aria-label="Export scenario to Excel"
                sx={{ minHeight: 32, px: 1.25 }}
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
                  sx={{ minHeight: 32, px: 1 }}
                >
                  Reset
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
            px: { xs: 1.5, sm: 2 },
            pt: 1.1,
            pb: 1.5,
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
              display: "inline-flex",
              maxWidth: "100%",
              p: 0.35,
              gap: 0.25,
              borderRadius: "10px",
              bgcolor: (t) =>
                t.palette.mode === "light" ? alpha("#0b1f33", 0.05) : alpha("#e8eef4", 0.08),
              border: "1px solid",
              borderColor: "divider",
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              mb: 1,
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
                    px: { xs: 1.05, sm: 1.4 },
                    minWidth: "auto",
                    minHeight: 30,
                    borderRadius: "8px",
                    bgcolor: selected ? "secondary.main" : "transparent !important",
                    color: selected ? "secondary.contrastText" : "text.secondary",
                    fontWeight: selected ? 700 : 600,
                    fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                    letterSpacing: "-0.015em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
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
            hidden={tab !== 0}
            id="tabpanel-mortgage"
            aria-labelledby="tab-mortgage"
          >
            {tab === 0 ? <MortgageTab state={state} patch={patch} /> : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== 1}
            id="tabpanel-upfront"
            aria-labelledby="tab-upfront"
          >
            {tab === 1 ? <UpfrontCashTab state={state} patch={patch} /> : null}
          </Box>
          <Box role="tabpanel" hidden={tab !== 2} id="tabpanel-rental" aria-labelledby="tab-rental">
            {tab === 2 ? <RentalTab state={state} patch={patch} /> : null}
          </Box>
          <Box role="tabpanel" hidden={tab !== 3} id="tabpanel-sell" aria-labelledby="tab-sell">
            {tab === 3 ? <WhenToSellTab state={state} patch={patch} /> : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== 4}
            id="tabpanel-compare"
            aria-labelledby="tab-compare"
          >
            {tab === 4 ? (
              <CompareTab
                rows={comparisons}
                properties={properties}
                activePropertyId={activePropertyId}
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
            Estimates only. {activeHouseLabel}: all tabs save together
            {cloudStatus === "ready" ? " to Firestore." : " in this browser."}
            {cloudError ? ` ${cloudError}` : ""}
          </Typography>
        </Box>
      </Box>

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
