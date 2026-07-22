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
import { MortgageTab } from "./tabs/MortgageTab";
import { RentalTab } from "./tabs/RentalTab";
import { UpfrontCashTab } from "./tabs/UpfrontCashTab";
import { WhenToSellTab } from "./tabs/WhenToSellTab";
import { HouseComparisonBar } from "./components/HouseComparisonBar";
import { HouseNavBar } from "./components/HouseNavBar";
import { useMortgageSyncedState } from "./hooks/useMortgageSyncedState";
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
    comparisons,
    activePropertyId,
    activeHouseLabel,
    selectProperty,
    createNewProperty,
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
            t.palette.mode === "light" ? alpha("#f5f5f7", 0.72) : alpha("#1c1c1e", 0.72),
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 0.65, maxWidth: 1400, mx: "auto", width: "100%" }}>
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
              <Typography
                component="h1"
                sx={{
                  fontFamily: "var(--pp-font-display)",
                  fontWeight: 700,
                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                }}
              >
                Property Pro
              </Typography>
              <Typography
                sx={{
                  fontFamily: "var(--pp-font-display)",
                  fontWeight: 600,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  color: "secondary.main",
                  whiteSpace: "nowrap",
                }}
              >
                {moneyDec.format(payment.total)}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.35, fontWeight: 500, fontSize: "0.7rem" }}
                >
                  /mo
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: { xs: "none", sm: "inline" },
                  whiteSpace: "nowrap",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                }}
              >
                {activeHouseLabel}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: { xs: "none", md: "inline" },
                  whiteSpace: "nowrap",
                  fontSize: "0.72rem",
                }}
              >
                {state.interestRateApr}% · {state.termYears}-yr
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
                sx={{ minHeight: 30, px: 1.25 }}
              >
                Save all
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={exportExcel}
                aria-label="Export scenario to Excel"
                sx={{ minHeight: 30, px: 1.25 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Export
                </Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  XLS
                </Box>
              </Button>
              <Tooltip title="Restore all fields to their default values for this house">
                <Button
                  size="small"
                  variant="text"
                  startIcon={<RestartAltIcon sx={{ fontSize: 17 }} />}
                  onClick={reset}
                  aria-label="Reset scenario to defaults"
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
          activePropertyId={activePropertyId}
          onSelect={houseHandlers.onSelect}
          onCreate={houseHandlers.onCreate}
        />

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 1.5, sm: 2 },
            pt: 1,
            pb: 1.5,
          }}
        >
          <Box
            role="tablist"
            aria-label="Main sections"
            sx={{
              display: "inline-flex",
              maxWidth: "100%",
              p: 0.35,
              gap: 0.25,
              borderRadius: "10px",
              bgcolor: (t) =>
                t.palette.mode === "light" ? alpha("#787880", 0.12) : alpha("#787880", 0.28),
              border: "1px solid",
              borderColor: "divider",
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              mb: 0.75,
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
                    py: 0.45,
                    px: { xs: 1, sm: 1.35 },
                    minWidth: "auto",
                    minHeight: 28,
                    borderRadius: "8px",
                    bgcolor: selected
                      ? (t) =>
                          t.palette.mode === "light"
                            ? alpha("#ffffff", 0.95)
                            : alpha("#636366", 0.72)
                      : "transparent !important",
                    boxShadow: selected
                      ? (t) =>
                          t.palette.mode === "light"
                            ? "0 1px 2px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)"
                            : "0 1px 2px rgba(0,0,0,0.35)"
                      : "none !important",
                    color: selected ? "text.primary" : "text.secondary",
                    fontWeight: selected ? 600 : 500,
                    fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                    letterSpacing: "-0.015em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    "&:hover": {
                      color: "text.primary",
                      bgcolor: selected
                        ? undefined
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

      {cloudStatus === "ready" && comparisons.length > 0 ? (
        <HouseComparisonBar
          rows={comparisons}
          activePropertyId={activePropertyId}
          onSelect={houseHandlers.onSelect}
        />
      ) : null}

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
