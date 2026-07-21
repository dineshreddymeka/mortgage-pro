import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Alert from "@mui/material/Alert";
import {
  Box,
  Button,
  Container,
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
  const { state, patch, reset, saveToBrowser } = useMortgageSyncedState();
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
      message: "Exported property-pro-scenario.xlsx.",
      severity: "success",
    });
  }

  function saveScenario() {
    saveToBrowser();
    setToast({ message: "Scenario saved in this browser.", severity: "success" });
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "transparent" }}>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "light" ? alpha("#fbfcfb", 0.9) : alpha("#15201c", 0.92),
          backdropFilter: "blur(12px)",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1 }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
            <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: "var(--pp-font-display)",
                  fontWeight: 800,
                  fontSize: { xs: "1.35rem", sm: "1.55rem" },
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                Property Pro
              </Typography>
              <Typography
                sx={{
                  fontFamily: "var(--pp-font-display)",
                  fontWeight: 800,
                  fontSize: { xs: "1.2rem", sm: "1.35rem" },
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                  color: "secondary.dark",
                  whiteSpace: "nowrap",
                }}
              >
                {moneyDec.format(payment.total)}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.4, fontWeight: 600 }}
                >
                  /mo
                </Typography>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: "none", md: "inline" }, whiteSpace: "nowrap" }}
              >
                {state.interestRateApr}% · {state.termYears}-yr
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<SaveOutlinedIcon />}
                onClick={saveScenario}
                aria-label="Save scenario"
                sx={{ minHeight: 34 }}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={exportExcel}
                aria-label="Export scenario to Excel"
                sx={{ minHeight: 34 }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Export
                </Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  XLS
                </Box>
              </Button>
              <Tooltip title="Reset to defaults">
                <IconButton onClick={reset} aria-label="reset scenario" size="small">
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
                <IconButton
                  onClick={() => setMode(isDark ? "light" : "dark")}
                  aria-label="toggle color mode"
                  size="small"
                >
                  {isDark ? (
                    <LightModeOutlinedIcon fontSize="small" />
                  ) : (
                    <DarkModeOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 2 }}>
        <Box
          role="tablist"
          aria-label="Main sections"
          sx={{
            display: "flex",
            gap: { xs: 0.25, sm: 1 },
            mt: 0.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
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
                  position: "relative",
                  py: 0.85,
                  px: { xs: 1, sm: 1.35 },
                  minWidth: "auto",
                  minHeight: 36,
                  borderRadius: 0,
                  bgcolor: "transparent !important",
                  boxShadow: "none !important",
                  color: selected ? "text.primary" : "text.secondary",
                  fontWeight: selected ? 700 : 600,
                  fontSize: { xs: "0.85rem", sm: "0.92rem" },
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 2,
                    bgcolor: "secondary.main",
                    transform: selected ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left center",
                    transition: "transform 0.22s var(--pp-ease, ease)",
                  },
                  "&:hover": {
                    color: "text.primary",
                    bgcolor: "transparent",
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
          sx={{ lineHeight: 1.4, pt: 1.5, pb: 0.5, maxWidth: 560 }}
        >
          Estimates only. One scenario across tabs; auto-saves locally.
        </Typography>
      </Container>

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
          sx={{ width: "100%", bgcolor: "primary.main" }}
        >
          {toast?.message ?? ""}
        </Alert>
      </Snackbar>
    </Box>
  );
}
