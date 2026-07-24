import type { ExitYearInvestment } from "../../lib/projectionEngine";
import type { RealWealthExitSnapshot } from "../../lib/whenToSellMath";

export type MilestoneOutcome = "bothGain" | "bothLoss" | "mixed";

/** Compact matrix row — preserves every milestone snapshot value. */
export type MilestoneMatrixRow = {
  year: number;
  outcome: MilestoneOutcome;
  initialCashInvested: number;
  interestToBank30: number;
  interestToBank15: number;
  interestToBankUserTerm: number;
  principalPaidIntoLoan30: number;
  principalPaidIntoLoan15: number;
  principalPaidIntoLoanUserTerm: number;
  cumulativeRentalCashFlow30: number;
  cumulativeRentalCashFlow15: number;
  cumulativeRentalCashFlowUserTerm: number;
  futureHomeValue: number;
  netProceeds30: number;
  netProceeds15: number;
  netProceedsUserTerm: number;
  realWealthMade30: number;
  realWealthMade15: number;
  realWealthMadeUserTerm: number;
  irrAnnualPercent: number | null;
  equityMultiple: number | null;
};

/** Outcome chip from 30-yr vs 15-yr total gain (same rule as legacy cards). */
export function milestoneOutcome(gain30: number, gain15: number): MilestoneOutcome {
  if (gain30 >= 0 && gain15 >= 0) return "bothGain";
  if (gain30 < 0 && gain15 < 0) return "bothLoss";
  return "mixed";
}

export function outcomeChipLabel(outcome: MilestoneOutcome): string {
  if (outcome === "bothGain") return "Both gain";
  if (outcome === "bothLoss") return "Both loss";
  return "Mixed outcome";
}

export function outcomeChipTone(outcome: MilestoneOutcome): "success" | "error" | "warning" {
  if (outcome === "bothGain") return "success";
  if (outcome === "bothLoss") return "error";
  return "warning";
}

/** Flatten wealth snapshots + investment metrics into matrix rows (all values preserved). */
export function buildMilestoneMatrixRows(
  snapshots: readonly RealWealthExitSnapshot[],
  investmentsByYear: ReadonlyMap<number, ExitYearInvestment> | readonly ExitYearInvestment[]
): MilestoneMatrixRow[] {
  let map: ReadonlyMap<number, ExitYearInvestment>;
  if (investmentsByYear instanceof Map) {
    map = investmentsByYear;
  } else {
    const list = investmentsByYear as readonly ExitYearInvestment[];
    map = new Map(list.map((row) => [row.year, row]));
  }

  return snapshots.map((w) => {
    const inv = map.get(w.year);
    return {
      year: w.year,
      outcome: milestoneOutcome(w.realWealthMade30, w.realWealthMade15),
      initialCashInvested: w.initialCashInvested,
      interestToBank30: w.interestToBank30,
      interestToBank15: w.interestToBank15,
      interestToBankUserTerm: w.interestToBankUserTerm,
      principalPaidIntoLoan30: w.principalPaidIntoLoan30,
      principalPaidIntoLoan15: w.principalPaidIntoLoan15,
      principalPaidIntoLoanUserTerm: w.principalPaidIntoLoanUserTerm,
      cumulativeRentalCashFlow30: w.cumulativeRentalCashFlow30,
      cumulativeRentalCashFlow15: w.cumulativeRentalCashFlow15,
      cumulativeRentalCashFlowUserTerm: w.cumulativeRentalCashFlowUserTerm,
      futureHomeValue: w.futureHomeValue,
      netProceeds30: w.netProceeds30,
      netProceeds15: w.netProceeds15,
      netProceedsUserTerm: w.netProceedsUserTerm,
      realWealthMade30: w.realWealthMade30,
      realWealthMade15: w.realWealthMade15,
      realWealthMadeUserTerm: w.realWealthMadeUserTerm,
      irrAnnualPercent: inv?.irrAnnualPercent ?? null,
      equityMultiple: inv?.equityMultiple ?? null,
    };
  });
}

/** Resolve selected-year detail; falls back to first row when year missing. */
export function selectMilestoneDetail(
  rows: readonly MilestoneMatrixRow[],
  selectedYear: number | null | undefined
): MilestoneMatrixRow | null {
  if (!rows.length) return null;
  if (selectedYear != null) {
    const hit = rows.find((r) => r.year === selectedYear);
    if (hit) return hit;
  }
  return rows[0] ?? null;
}

/** Default selected year: prefer 5 when present, else first milestone. */
export function defaultSelectedMilestoneYear(years: readonly number[]): number | null {
  if (!years.length) return null;
  if (years.includes(5)) return 5;
  return years[0] ?? null;
}

/** Enter / Space activate a focused milestone row (button semantics). */
export function isMilestoneActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}
