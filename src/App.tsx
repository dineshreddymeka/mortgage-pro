import Alert from "@mui/material/Alert";
import { Box, Snackbar, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { CompareTab } from "./tabs/CompareTab";
import { FinancingTab } from "./tabs/MortgageTab";
import { PropertyTab } from "./tabs/PropertyTab";
import { ResearchTab } from "./tabs/ResearchTab";
import { RentalTab } from "./tabs/RentalTab";
import { UpfrontCashTab } from "./tabs/UpfrontCashTab";
import { WhenToSellTab } from "./tabs/WhenToSellTab";
import { AppHeader } from "./components/AppHeader";
import { HouseNavBar } from "./components/HouseNavBar";
import { DataVerificationDialog } from "./components/DataVerificationDialog";
import { RevisionConflictDialog } from "./components/RevisionConflictDialog";
import { WorkspaceKpiStrip } from "./components/WorkspaceKpiStrip";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { WORKSPACE_TAB_INDEX } from "./components/workspaceShell";
import { useMortgageSyncedState } from "./hooks/useMortgageSyncedState";
import { workspaceMaxWidth } from "./layout/formLayout";
import { buildHouseComparisonRow } from "./lib/houseComparison";
import { downloadScenarioExcel } from "./lib/scenarioExcelExport";
import { deriveScenario } from "./lib/deriveScenario";
import {
  buildDataVerificationReport,
  type DataVerificationReport,
} from "./lib/dataConsistency";
import { openScenarioReportWindow } from "./report/reportStorage";

export default function App() {
  const {
    state,
    patch,
    reset,
    replace,
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
    createPropertyFromImport,
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
  const [verificationReport, setVerificationReport] = useState<DataVerificationReport | null>(null);

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

  function verifyData() {
    setVerificationReport(buildDataVerificationReport(state, { scenario: state }));
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
            setTab(WORKSPACE_TAB_INDEX.property);
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
      <AppHeader
        paymentMonthly={payment.total}
        onSave={() => {
          void saveScenario();
        }}
        onReport={openReport}
        onExportExcel={exportExcel}
        onVerify={verifyData}
        onReset={reset}
      />

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          maxWidth: workspaceMaxWidth,
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

          <WorkspaceTabs value={tab} onChange={setTab} />

          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.property}
            id="tabpanel-property"
            aria-labelledby="tab-property"
          >
            {tab === WORKSPACE_TAB_INDEX.property ? (
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
                onReplaceScenario={replace}
                onCreateImportedHouse={createPropertyFromImport}
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
            hidden={tab !== WORKSPACE_TAB_INDEX.research}
            id="tabpanel-research"
            aria-labelledby="tab-research"
          >
            {tab === WORKSPACE_TAB_INDEX.research ? (
              <ResearchTab state={state} patch={patch} activePropertyId={activePropertyId} />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.financing}
            id="tabpanel-financing"
            aria-labelledby="tab-financing"
          >
            {tab === WORKSPACE_TAB_INDEX.financing ? (
              <FinancingTab
                state={state}
                patch={patch}
                onNotify={(message, severity = "success") => setToast({ message, severity })}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.upfront}
            id="tabpanel-upfront"
            aria-labelledby="tab-upfront"
          >
            {tab === WORKSPACE_TAB_INDEX.upfront ? <UpfrontCashTab state={state} patch={patch} /> : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.rental}
            id="tabpanel-rental"
            aria-labelledby="tab-rental"
          >
            {tab === WORKSPACE_TAB_INDEX.rental ? (
              <RentalTab
                state={state}
                patch={patch}
                onGoToFinancing={() => setTab(WORKSPACE_TAB_INDEX.financing)}
                onGoToUpfront={() => setTab(WORKSPACE_TAB_INDEX.upfront)}
                onGoToResearch={() => setTab(WORKSPACE_TAB_INDEX.research)}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.exit}
            id="tabpanel-exit"
            aria-labelledby="tab-exit"
          >
            {tab === WORKSPACE_TAB_INDEX.exit ? (
              <WhenToSellTab
                state={state}
                patch={patch}
                onGoToFinancing={() => setTab(WORKSPACE_TAB_INDEX.financing)}
                onGoToUpfront={() => setTab(WORKSPACE_TAB_INDEX.upfront)}
                onGoToRental={() => setTab(WORKSPACE_TAB_INDEX.rental)}
                onGoToResearch={() => setTab(WORKSPACE_TAB_INDEX.research)}
              />
            ) : null}
          </Box>
          <Box
            role="tabpanel"
            hidden={tab !== WORKSPACE_TAB_INDEX.compare}
            id="tabpanel-compare"
            aria-labelledby="tab-compare"
          >
            {tab === WORKSPACE_TAB_INDEX.compare ? (
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

      <DataVerificationDialog
        open={verificationReport != null}
        report={verificationReport}
        onClose={() => setVerificationReport(null)}
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
