import { useMemo } from "react";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { parseMortgageState } from "../storage/mortgageState";
import { LOCAL_SCENARIO_REPORT_KEY } from "./reportStorage";
import { ScenarioReportView } from "./ScenarioReportView";
import { buildScenarioReportModel } from "./scenarioReportModel";
import "./reportPrint.css";

function readReportPayload() {
  try {
    const raw = sessionStorage.getItem(LOCAL_SCENARIO_REPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      scenario?: unknown;
      meta?: { houseId?: string; houseLabel?: string; houseNumber?: number; name?: string };
    };
    if (!parsed.scenario || typeof parsed.scenario !== "object") return null;
    const state = parseMortgageState(JSON.stringify(parsed.scenario));
    const label =
      typeof parsed.meta?.houseLabel === "string" && parsed.meta.houseLabel.trim()
        ? parsed.meta.houseLabel.trim()
        : "Scenario report";
    return {
      state,
      meta: {
        houseId: parsed.meta?.houseId,
        houseLabel: label,
        houseNumber: parsed.meta?.houseNumber,
        name: parsed.meta?.name,
      },
    };
  } catch {
    return null;
  }
}

export default function ReportRoot() {
  const payload = useMemo(() => readReportPayload(), []);
  const model = useMemo(() => {
    if (payload) return buildScenarioReportModel(payload.state, payload.meta);
    return buildScenarioReportModel(fixtureV2Full, { houseLabel: "Sample report (no payload)" });
  }, [payload]);

  return (
    <ScenarioReportView
      model={model}
      onClose={() => {
        window.location.hash = "";
        window.location.reload();
      }}
    />
  );
}
