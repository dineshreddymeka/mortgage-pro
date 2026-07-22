import type { AppPersisted } from "../storage/mortgageState";
import { buildFullScenarioExport } from "../lib/scenarioExport";
import type { DerivedScenario } from "../lib/deriveScenario";
import { deriveScenario } from "../lib/deriveScenario";
import type { RealWealthExitSnapshot } from "../lib/whenToSellMath";

export type ScenarioReportMeta = {
  houseId?: string;
  houseLabel: string;
  exportedAt: string;
};

export type ScenarioReportMetricRow = {
  label: string;
  value: string;
  hint?: string;
};

export type ScenarioReportSection = {
  id: string;
  title: string;
  rows: ScenarioReportMetricRow[];
};

export type ScenarioReportModel = {
  meta: ScenarioReportMeta;
  sections: ScenarioReportSection[];
  disclaimer: string;
};

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const moneyPrecise = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct = (n: number, digits = 2) => `${n.toFixed(digits)}%`;

function row(label: string, value: string, hint?: string): ScenarioReportMetricRow {
  return hint ? { label, value, hint } : { label, value };
}

export function buildScenarioReportModel(
  state: AppPersisted,
  meta: { houseId?: string; houseLabel: string; houseNumber?: number; name?: string },
  exportedAt: string = new Date().toISOString()
): ScenarioReportModel {
  const derived = deriveScenario(state);
  return {
    meta: { houseId: meta.houseId, houseLabel: meta.houseLabel, exportedAt },
    sections: [
      buildPropertySection(state, derived),
      buildMortgageSection(state, derived),
      buildRentalSection(derived),
      buildExitSection(state, derived, derived.realWealthSnapshots),
      buildMaxOfferSection(derived),
    ],
    disclaimer:
      "Estimates only — not an offer, appraisal, or financial advice. Figures reflect your inputs and in-app formulas at export time.",
  };
}

export function buildScenarioReportExport(
  state: AppPersisted,
  meta: { houseId?: string; houseLabel: string; houseNumber?: number; name?: string }
) {
  return buildFullScenarioExport(state, {
    id: meta.houseId,
    houseId: meta.houseId,
    houseNumber: meta.houseNumber,
    name: meta.name ?? meta.houseLabel,
  });
}

function buildPropertySection(state: AppPersisted, derived: DerivedScenario): ScenarioReportSection {
  const rows: ScenarioReportMetricRow[] = [
    row("Purchase price", money.format(derived.purchasePrice)),
    row("Down payment", money.format(derived.downPayment)),
    row("Loan amount", money.format(derived.loanAmount)),
  ];
  if (state.propertyAddress.trim()) rows.push(row("Address", state.propertyAddress.trim()));
  if (state.currentHomeValue > 0) {
    rows.push(row("Current value (modeled)", money.format(state.currentHomeValue)));
    rows.push(
      row("Implied annual appreciation", pct(derived.impliedAnnualAppreciationPercent), "From purchase price, present value, and years owned")
    );
  }
  return { id: "property", title: "Property", rows };
}

function buildMortgageSection(state: AppPersisted, derived: DerivedScenario): ScenarioReportSection {
  const m = derived.monthlyPayment;
  return {
    id: "mortgage",
    title: "Financing",
    rows: [
      row("Interest rate (APR)", pct(state.interestRateApr)),
      row("Loan term", `${state.termYears} years`),
      row("Principal & interest", moneyPrecise.format(m.principalAndInterest)),
      row("Property tax (monthly)", moneyPrecise.format(m.propertyTax)),
      row("Insurance (monthly)", moneyPrecise.format(m.insurance)),
      row("HOA (monthly)", moneyPrecise.format(m.hoa)),
      row("PMI (monthly)", moneyPrecise.format(m.pmi)),
      row("Total housing payment", moneyPrecise.format(m.total)),
      row("Total interest (scenario term)", money.format(derived.amortizationTotals.totalInterest), `${derived.amortization.length} scheduled months`),
    ],
  };
}

function buildRentalSection(derived: DerivedScenario): ScenarioReportSection {
  const r = derived.rental;
  const rows: ScenarioReportMetricRow[] = [
    row("Monthly rent (GSI base)", moneyPrecise.format(r.grossScheduledIncomeMonthly)),
    row("Effective gross income", moneyPrecise.format(r.effectiveGrossIncomeMonthly)),
    row("Net operating income", moneyPrecise.format(r.noiMonthly)),
    row("Cash flow (monthly)", moneyPrecise.format(r.cashFlowMonthly)),
    row("Cash-on-cash (annual)", r.cashOnCash > 0 ? pct(r.cashOnCash * 100) : "—"),
    row("Cap rate", r.capRate > 0 ? pct(r.capRate * 100) : "—"),
  ];
  if (r.dscr != null) rows.push(row("DSCR", r.dscr.toFixed(2)));
  if (r.grossRentMultiplier != null) rows.push(row("GRM", r.grossRentMultiplier.toFixed(1)));
  if (r.onePercentRuleRatio != null) rows.push(row("1% rule ratio", pct(r.onePercentRuleRatio * 100, 2)));
  return { id: "rental", title: "Rental pro-forma", rows };
}

function buildExitSection(state: AppPersisted, derived: DerivedScenario, milestones: RealWealthExitSnapshot[]): ScenarioReportSection {
  const rows: ScenarioReportMetricRow[] = [
    row("Modeled appreciation (annual)", pct(state.sellAnnualAppreciationPercent)),
    row("Sale closing costs", pct(state.sellClosingCostPercent, 1)),
  ];
  for (const snap of milestones.slice(0, 4)) {
    rows.push(row(`Exit year ${snap.year} — net proceeds`, money.format(snap.netProceedsUserTerm)));
    rows.push(row(`Exit year ${snap.year} — real wealth made`, money.format(snap.realWealthMadeUserTerm)));
  }
  const bestIrr = derived.exitInvestments.find((x) => x.irrAnnualPercent != null);
  if (bestIrr?.irrAnnualPercent != null) {
    rows.push(row(`IRR at year ${bestIrr.year}`, pct(bestIrr.irrAnnualPercent, 2), "From monthly projection cash flows"));
  }
  return { id: "exit", title: "Exit & wealth", rows };
}

function buildMaxOfferSection(derived: DerivedScenario): ScenarioReportSection {
  const m = derived.maxOffer;
  return {
    id: "max-offer",
    title: "Affordability caps (derived)",
    rows: [
      row("Max price @ 28% front-end DTI", money.format(m.fromDti28Pct)),
      row("Max price @ custom housing budget", money.format(m.fromCustomHousingBudget)),
      row("Max price @ target DSCR", m.fromTargetDscr != null ? money.format(m.fromTargetDscr) : "—", m.targetDscr != null ? `Target DSCR ${m.targetDscr.toFixed(2)}` : undefined),
    ],
  };
}
