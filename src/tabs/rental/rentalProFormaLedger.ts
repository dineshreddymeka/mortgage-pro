import {
  cashFlowMonthlyFromYieldToggles,
  RENTAL_YIELD_PI_ID,
  RENTAL_YIELD_PMI_ID,
  type RentalAnalysis,
  type RentalLineItem,
} from "../../lib/rentalMath";

/** Pro-forma / exit-yield P&amp;I row id (not in operatingExpenseLines). */
export const PF_PI_ID = RENTAL_YIELD_PI_ID;

/** Pro-forma / exit-yield PMI row id. */
export const PF_PMI_ID = RENTAL_YIELD_PMI_ID;

/** Pro-forma OpEx line id → scroll target in the canonical OpEx editor. */
export const OPEX_SCROLL_ANCHOR: Record<string, string> = {
  mgmt: "rental-edit-mgmt",
  maint: "rental-edit-maint",
  capex: "rental-edit-capex",
  tax: "rental-edit-monthly-taxes",
  ins: "rental-edit-monthly-taxes",
  hoa: "rental-edit-monthly-taxes",
};

export type IncludeMap = Record<string, boolean>;

/** Missing key or non-false → included (same as Rental / Exit toggle semantics). */
export function lineIncluded(toggles: IncludeMap | undefined, id: string): boolean {
  return toggles?.[id] !== false;
}

/**
 * Toggle one line in an exclusion map. Returns `undefined` when every line is included
 * (matches persisted `rentalProFormaInclude` / `sellRentalYieldInclude` omit-when-all-on).
 */
export function patchIncludeMap(
  current: IncludeMap | undefined,
  id: string,
  on: boolean
): IncludeMap | undefined {
  const excl: IncludeMap = {};
  if (current) {
    for (const [k, v] of Object.entries(current)) {
      if (v === false) excl[k] = false;
    }
  }
  if (on) delete excl[id];
  else excl[id] = false;
  return Object.keys(excl).length > 0 ? excl : undefined;
}

export type ProFormaAdjusted = {
  opexIn: number;
  noiAdj: number;
  piIn: boolean;
  piAmt: number;
  pmiIn: boolean;
  pmiAmt: number;
  cfAdj: number;
  hasExclusion: boolean;
  opexPartial: boolean;
};

/** Rental-tab pro-forma NOI / cash flow with `rentalProFormaInclude` exclusions. */
export function computeProFormaAdjusted(
  r: RentalAnalysis,
  pfToggles: IncludeMap
): ProFormaAdjusted {
  const egi = r.effectiveGrossIncomeMonthly;
  const opexIn = r.operatingExpenseLines.reduce(
    (sum, line) => sum + (lineIncluded(pfToggles, line.id) ? line.amount : 0),
    0
  );
  const noiAdj = egi - opexIn;
  const piIn = lineIncluded(pfToggles, PF_PI_ID);
  const piAmt = r.principalAndInterestMonthly;
  const piForCf = piIn ? piAmt : 0;
  const pmiIn = r.pmiMonthly > 0.0001 ? lineIncluded(pfToggles, PF_PMI_ID) : false;
  const pmiAmt = r.pmiMonthly;
  const pmiForCf = pmiIn ? pmiAmt : 0;
  const cfAdj = noiAdj - piForCf - pmiForCf;
  const ids = [
    ...r.operatingExpenseLines.map((l) => l.id),
    PF_PI_ID,
    ...(r.pmiMonthly > 0.0001 ? [PF_PMI_ID] : []),
  ];
  const hasExclusion = ids.some((id) => pfToggles[id] === false);
  const opexPartial = r.operatingExpenseLines.some((l) => pfToggles[l.id] === false);
  return { opexIn, noiAdj, piIn, piAmt, pmiIn, pmiAmt, cfAdj, hasExclusion, opexPartial };
}

export type ExitYieldAdjusted = {
  opexIn: number;
  noiAdj: number;
  piIn: boolean;
  pmiIn: boolean;
  cfAdj: number;
  hasExclusion: boolean;
  opexPartial: boolean;
};

/**
 * Exit-yield path using the same inclusion map semantics as
 * {@link cashFlowMonthlyFromYieldToggles} (`sellRentalYieldInclude`).
 */
export function computeExitYieldAdjusted(
  r: RentalAnalysis,
  yieldToggles: IncludeMap | undefined
): ExitYieldAdjusted {
  const egi = r.effectiveGrossIncomeMonthly;
  const opexIn = r.operatingExpenseLines.reduce(
    (sum, line) => sum + (lineIncluded(yieldToggles, line.id) ? line.amount : 0),
    0
  );
  const noiAdj = egi - opexIn;
  const piIn = lineIncluded(yieldToggles, PF_PI_ID);
  const pmiIn = r.pmiMonthly > 0.0001 ? lineIncluded(yieldToggles, PF_PMI_ID) : false;
  const cfAdj = cashFlowMonthlyFromYieldToggles(r, yieldToggles, true);
  const ids = [
    ...r.operatingExpenseLines.map((l) => l.id),
    PF_PI_ID,
    ...(r.pmiMonthly > 0.0001 ? [PF_PMI_ID] : []),
  ];
  const hasExclusion = ids.some((id) => yieldToggles?.[id] === false);
  const opexPartial = r.operatingExpenseLines.some((l) => yieldToggles?.[l.id] === false);
  return { opexIn, noiAdj, piIn, pmiIn, cfAdj, hasExclusion, opexPartial };
}

export type LedgerNavTarget = "income" | "vacancy" | "opex" | "common-inputs" | "overview";

export type LedgerRowKind =
  | "gsi"
  | "vacancy"
  | "egi"
  | "opex"
  | "noi"
  | "pi"
  | "pmi"
  | "cashflow";

export type ProFormaLedgerRow = {
  id: string;
  kind: LedgerRowKind;
  label: string;
  detail?: string;
  /** Raw monthly magnitude (always ≥ 0 for expense lines; display adds sign). */
  amountMonthly: number;
  /** Expense / debt lines display as negative cash. */
  isDeduction: boolean;
  showIncludeToggles: boolean;
  navTarget: LedgerNavTarget;
  opexAnchorId?: string;
};

/** Accessible label for a ledger row’s navigation control. */
export function ledgerNavAriaLabel(
  row: Pick<ProFormaLedgerRow, "label" | "navTarget">
): string {
  if (row.navTarget === "common-inputs") return `Edit ${row.label} on Common Inputs`;
  if (row.navTarget === "overview") return `Jump to key metrics for ${row.label}`;
  if (row.navTarget === "vacancy") return `Jump to vacancy editor`;
  if (row.navTarget === "income") return `Jump to income editor for ${row.label}`;
  return `Jump to operating expense editor for ${row.label}`;
}

/**
 * In-tab scroll target for non–Common Inputs ledger navigation.
 * P&amp;I / PMI use the Common Inputs tab callback instead.
 */
export function ledgerScrollElementId(
  target: Exclude<LedgerNavTarget, "common-inputs">,
  opexAnchorId?: string
): string {
  if (target === "income") return "rental-edit-income";
  if (target === "vacancy") return "rental-edit-vacancy";
  if (target === "overview") return "rental-metrics-row";
  return opexAnchorId ?? "rental-edit-carrying";
}

/** Single unified ledger sequence: income → EGI → OpEx → NOI → debt → cash flow. */
export function buildProFormaLedgerRows(
  r: RentalAnalysis,
  vacancyRatePercent: number
): ProFormaLedgerRow[] {
  const rows: ProFormaLedgerRow[] = [
    {
      id: "gsi",
      kind: "gsi",
      label: "Gross scheduled income",
      detail: "Rent + other before vacancy",
      amountMonthly: r.grossScheduledIncomeMonthly,
      isDeduction: false,
      showIncludeToggles: false,
      navTarget: "income",
    },
    {
      id: "vacancy",
      kind: "vacancy",
      label: `Vacancy (${vacancyRatePercent.toFixed(1)}% of scheduled)`,
      amountMonthly: r.vacancyLossMonthly,
      isDeduction: true,
      showIncludeToggles: false,
      navTarget: "vacancy",
    },
    {
      id: "egi",
      kind: "egi",
      label: "EGI",
      amountMonthly: r.effectiveGrossIncomeMonthly,
      isDeduction: false,
      showIncludeToggles: false,
      navTarget: "income",
    },
  ];

  for (const line of r.operatingExpenseLines) {
    rows.push(opexLedgerRow(line));
  }

  rows.push({
    id: "noi",
    kind: "noi",
    label: "NOI",
    amountMonthly: r.noiMonthly,
    isDeduction: false,
    showIncludeToggles: false,
    navTarget: "opex",
  });

  rows.push({
    id: PF_PI_ID,
    kind: "pi",
    label: "P&I (principal & interest)",
    amountMonthly: r.principalAndInterestMonthly,
    isDeduction: true,
    showIncludeToggles: true,
    navTarget: "common-inputs",
  });

  if (r.pmiMonthly > 0.001) {
    rows.push({
      id: PF_PMI_ID,
      kind: "pmi",
      label: "PMI",
      amountMonthly: r.pmiMonthly,
      isDeduction: true,
      showIncludeToggles: true,
      navTarget: "common-inputs",
    });
  }

  rows.push({
    id: "cashflow",
    kind: "cashflow",
    label: "Cash flow",
    amountMonthly: r.cashFlowMonthly,
    isDeduction: false,
    showIncludeToggles: false,
    navTarget: "overview",
  });

  return rows;
}

function opexLedgerRow(line: RentalLineItem): ProFormaLedgerRow {
  return {
    id: line.id,
    kind: "opex",
    label: line.label,
    amountMonthly: line.amount,
    isDeduction: true,
    showIncludeToggles: true,
    navTarget: "opex",
    opexAnchorId: OPEX_SCROLL_ANCHOR[line.id] ?? "rental-edit-carrying",
  };
}

const pct0 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

/**
 * Monthly carrying total shown on the OpEx panel: operating expenses + P&amp;I + PMI.
 * (OpEx lines themselves exclude debt service; PMI is part of carrying cost.)
 */
export function monthlyCarryingTotal(
  totalOpexMo: number,
  piMonthly: number,
  pmiMonthly: number
): number {
  return (
    Math.max(0, totalOpexMo) + Math.max(0, piMonthly) + Math.max(0, pmiMonthly)
  );
}

/** Format amount as % of EGI for ledger cells (matches prior Rental tab display). */
export function pctOfEgi(amount: number, egi: number): string {
  if (!Number.isFinite(amount) || !Number.isFinite(egi) || egi <= 0) return "—";
  const p = (amount / egi) * 100;
  if (p > 0 && p < 0.5 && p !== 0) return "<1%";
  if (p < 0 && p > -0.5) return ">−1%";
  return `${pct0.format(p)}%`;
}
