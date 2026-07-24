/** Investment metrics derived from projected cash flows (not persisted). */
export type InvestmentMetrics = {
  /** Annualized IRR (%), or null when undefined / no meaningful solution. */
  irrAnnualPercent: number | null;
  /** Total inflows ÷ initial cash invested, or null when invested ≤ 0. */
  equityMultiple: number | null;
};

const IRR_MAX_ITER = 80;
const IRR_TOLERANCE = 1e-7;

function npv(rate: number, flows: number[]): number {
  let sum = 0;
  for (let t = 0; t < flows.length; t++) {
    const cf = flows[t] ?? 0;
    sum += cf / (1 + rate) ** t;
  }
  return sum;
}

/**
 * Monthly IRR from uneven cash flows (t=0 = initial investment, negative).
 * Returns null when invested ≤ 0, all flows zero, or no converging root.
 */
export function irrMonthlyPercent(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  const initial = cashFlows[0] ?? 0;
  if (!(initial < 0)) return null;
  const hasNonZeroLater = cashFlows.slice(1).some((cf) => Math.abs(cf) > 1e-9);
  if (!hasNonZeroLater) return null;

  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo, cashFlows);
  let fHi = npv(hi, cashFlows);
  if (fLo * fHi > 0) {
    // Scan for a bracket
    let found = false;
    for (let r = -0.99; r <= 5; r += 0.05) {
      const f0 = npv(r, cashFlows);
      const f1 = npv(r + 0.05, cashFlows);
      if (f0 * f1 <= 0) {
        lo = r;
        hi = r + 0.05;
        fLo = f0;
        fHi = f1;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }

  for (let i = 0; i < IRR_MAX_ITER; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashFlows);
    if (Math.abs(fMid) < IRR_TOLERANCE || Math.abs(hi - lo) < IRR_TOLERANCE) {
      return mid * 100;
    }
    if (fLo * fMid <= 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return null;
}

export function annualizedIrrFromMonthly(monthlyIrrPct: number | null): number | null {
  if (monthlyIrrPct == null || !Number.isFinite(monthlyIrrPct)) return null;
  const r = monthlyIrrPct / 100;
  const annual = (1 + r) ** 12 - 1;
  if (!Number.isFinite(annual)) return null;
  return Math.round(annual * 10000) / 100;
}

/**
 * Equity multiple = (sum of operating cash flows through exit + net sale proceeds) / initial cash in.
 * Robust to zero invested (returns null).
 */
export function equityMultipleFromFlows(
  initialCashInvested: number,
  monthlyCashFlows: number[],
  netProceedsAtExit: number
): number | null {
  const invested = Math.max(0, Number(initialCashInvested) || 0);
  if (invested <= 0) return null;
  const operating = monthlyCashFlows.reduce((a, b) => a + b, 0);
  const totalIn = operating + Math.max(0, netProceedsAtExit);
  const mult = totalIn / invested;
  return Number.isFinite(mult) ? Math.round(mult * 1000) / 1000 : null;
}

/** Build t=0..exitMonth cash-flow series for IRR (monthly periods). */
export function buildInvestmentCashFlows(
  initialCashInvested: number,
  monthlyCashFlowsThroughExit: number[],
  netProceedsAtExit: number
): number[] {
  const invested = Math.max(0, Number(initialCashInvested) || 0);
  const flows: number[] = [-invested];
  const n = monthlyCashFlowsThroughExit.length;
  for (let i = 0; i < n; i++) {
    let cf = monthlyCashFlowsThroughExit[i] ?? 0;
    if (i === n - 1) cf += netProceedsAtExit;
    flows.push(cf);
  }
  return flows;
}

export function computeInvestmentMetrics(
  initialCashInvested: number,
  monthlyCashFlowsThroughExit: number[],
  netProceedsAtExit: number
): InvestmentMetrics {
  const invested = Math.max(0, Number(initialCashInvested) || 0);
  if (invested <= 0) {
    return { irrAnnualPercent: null, equityMultiple: null };
  }
  const flows = buildInvestmentCashFlows(invested, monthlyCashFlowsThroughExit, netProceedsAtExit);
  const monthlyIrr = irrMonthlyPercent(flows);
  return {
    irrAnnualPercent: annualizedIrrFromMonthly(monthlyIrr),
    equityMultiple: equityMultipleFromFlows(invested, monthlyCashFlowsThroughExit, netProceedsAtExit),
  };
}
