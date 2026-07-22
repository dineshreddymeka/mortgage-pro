import type { AppPersisted } from "../storage/mortgageState";

export const LOCAL_SCENARIO_REPORT_KEY = "mortgage-pro:report-payload";

export type ReportLaunchMeta = {
  houseId?: string;
  houseLabel: string;
  houseNumber?: number;
  name?: string;
};

export function stageScenarioReportPayload(state: AppPersisted, meta: ReportLaunchMeta): void {
  sessionStorage.setItem(
    LOCAL_SCENARIO_REPORT_KEY,
    JSON.stringify({ scenario: state, meta, stagedAt: Date.now() })
  );
}

export function openScenarioReportWindow(state: AppPersisted, meta: ReportLaunchMeta): Window | null {
  stageScenarioReportPayload(state, meta);
  const base = `${window.location.origin}${window.location.pathname}`;
  return window.open(`${base}#/report`, "_blank", "noopener,noreferrer");
}
