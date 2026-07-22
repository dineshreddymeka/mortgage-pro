/**
 * Pure loan-product math — conventional, FHA, VA, USDA; upfront fees, MI, points, buydown, ARM.
 */

export type LoanProductType = "conventional" | "fha" | "va" | "usda";
export type RateType = "fixed" | "arm";
export type BuydownType = "none" | "2-1" | "3-2-1";

export type ArmTerms = {
  initialFixedYears: number;
  margin: number;
  indexRate: number;
  periodicCap: number;
  lifetimeCap: number;
};

export type LoanProductInput = {
  productType: LoanProductType;
  homePrice: number;
  downPayment: number;
  noteApr: number;
  termYears: number;
  rateType?: RateType;
  arm?: ArmTerms;
  pointsPercent?: number;
  buydown?: BuydownType;
  financeUpfrontFees?: boolean;
  vaFirstUse?: boolean;
  miMonthlyOverride?: number;
};

export type UpfrontFeeLine = {
  id: string;
  label: string;
  amount: number;
  financeable: boolean;
};

export type LoanProductResult = {
  productType: LoanProductType;
  baseLoanAmount: number;
  upfrontFees: UpfrontFeeLine[];
  upfrontFeesTotal: number;
  financedFeesTotal: number;
  totalLoanAmount: number;
  noteApr: number;
  pointsUpfrontCost: number;
  miMonthly: number;
  miLabel: string;
  pmiDropLtvThreshold: number | null;
  pmiDropMinMonths: number | null;
  rateSchedule: number[];
};

const FHA_UFMIP_RATE = 0.0175;
const FHA_MIP_ANNUAL = 0.0055;
const VA_FUNDING_FIRST = 0.0215;
const VA_FUNDING_SUBSEQUENT = 0.033;
const USDA_GUARANTEE_UPFRONT = 0.01;
const USDA_ANNUAL_FEE = 0.0035;
const CONV_PMI_ANNUAL = 0.006;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function roundUsd(n: number): number {
  return Math.max(0, Math.round(n));
}

export function minDownPaymentPercent(productType: LoanProductType): number {
  switch (productType) {
    case "fha":
      return 3.5;
    case "va":
    case "usda":
      return 0;
    default:
      return 3;
  }
}

export function computeUpfrontFees(input: LoanProductInput, baseLoanAmount: number): UpfrontFeeLine[] {
  switch (input.productType) {
    case "fha":
      return [{
        id: "ufmip",
        label: "FHA UFMIP (1.75%)",
        amount: roundUsd(baseLoanAmount * FHA_UFMIP_RATE),
        financeable: true,
      }];
    case "va": {
      const rate = input.vaFirstUse !== false ? VA_FUNDING_FIRST : VA_FUNDING_SUBSEQUENT;
      return [{
        id: "vaFunding",
        label: "VA funding fee",
        amount: roundUsd(baseLoanAmount * rate),
        financeable: true,
      }];
    }
    case "usda":
      return [{
        id: "usdaGuarantee",
        label: "USDA guarantee fee (1%)",
        amount: roundUsd(baseLoanAmount * USDA_GUARANTEE_UPFRONT),
        financeable: true,
      }];
    default:
      return [];
  }
}

export function estimateMiMonthly(
  input: LoanProductInput,
  totalLoanAmount: number,
  downPaymentPercent: number
): { miMonthly: number; miLabel: string; pmiDropLtvThreshold: number | null; pmiDropMinMonths: number | null } {
  if (input.miMonthlyOverride !== undefined && Number.isFinite(input.miMonthlyOverride)) {
    return { miMonthly: Math.max(0, input.miMonthlyOverride), miLabel: "MI (override)", pmiDropLtvThreshold: 0.78, pmiDropMinMonths: null };
  }
  switch (input.productType) {
    case "conventional":
      if (downPaymentPercent >= 19.99 || totalLoanAmount <= 0) {
        return { miMonthly: 0, miLabel: "PMI", pmiDropLtvThreshold: 0.78, pmiDropMinMonths: null };
      }
      return {
        miMonthly: roundUsd((totalLoanAmount * CONV_PMI_ANNUAL) / 12),
        miLabel: "PMI",
        pmiDropLtvThreshold: 0.78,
        pmiDropMinMonths: null,
      };
    case "fha": {
      const canDrop = downPaymentPercent >= 10;
      return {
        miMonthly: roundUsd((totalLoanAmount * FHA_MIP_ANNUAL) / 12),
        miLabel: "FHA MIP",
        pmiDropLtvThreshold: canDrop ? 0.78 : null,
        pmiDropMinMonths: canDrop ? 132 : null,
      };
    }
    case "va":
      return { miMonthly: 0, miLabel: "None (VA)", pmiDropLtvThreshold: null, pmiDropMinMonths: null };
    case "usda":
      return {
        miMonthly: roundUsd((totalLoanAmount * USDA_ANNUAL_FEE) / 12),
        miLabel: "USDA annual fee",
        pmiDropLtvThreshold: null,
        pmiDropMinMonths: null,
      };
    default:
      return { miMonthly: 0, miLabel: "MI", pmiDropLtvThreshold: 0.78, pmiDropMinMonths: null };
  }
}

export function buydownOffsets(buydown: BuydownType): number[] {
  if (buydown === "2-1") return [2, 1];
  if (buydown === "3-2-1") return [3, 2, 1];
  return [];
}

export function buildRateSchedule(
  noteApr: number,
  termYears: number,
  rateType: RateType,
  buydown: BuydownType,
  arm?: ArmTerms
): number[] {
  const months = Math.max(1, Math.round(termYears * 12));
  const offsets = buydownOffsets(buydown);
  const schedule: number[] = [];
  let currentRate = noteApr;
  const startRate = noteApr;

  for (let month = 1; month <= months; month++) {
    const yearIndex = Math.floor((month - 1) / 12);
    let rate = yearIndex < offsets.length ? Math.max(0, noteApr - offsets[yearIndex]!) : noteApr;
    if (rateType === "arm" && arm) {
      const fixedMonths = Math.max(1, Math.round(arm.initialFixedYears * 12));
      if (month > fixedMonths) {
        const periodsSinceFixed = Math.floor((month - fixedMonths - 1) / 12);
        if (periodsSinceFixed >= 0 && month === fixedMonths + 1 + periodsSinceFixed * 12) {
          currentRate = Math.min(arm.indexRate + arm.margin, currentRate + arm.periodicCap, startRate + arm.lifetimeCap);
        }
        rate = currentRate;
      } else {
        currentRate = rate;
      }
    }
    schedule.push(rate);
  }
  return schedule;
}

export function miForMonth(
  balanceBeforePayment: number,
  originalLoanAmount: number,
  configuredMiMonthly: number,
  pmiDropLtvThreshold: number | null,
  pmiDropMinMonths: number | null,
  month: number
): number {
  const mi = Math.max(0, configuredMiMonthly);
  if (mi <= 0 || originalLoanAmount <= 0) return 0;
  if (pmiDropMinMonths !== null && month < pmiDropMinMonths) return mi;
  if (pmiDropLtvThreshold === null) return mi;
  return balanceBeforePayment / originalLoanAmount <= pmiDropLtvThreshold + 1e-9 ? 0 : mi;
}

export function computeLoanProduct(input: LoanProductInput): LoanProductResult {
  const hp = Math.max(0, input.homePrice);
  const dp = clamp(input.downPayment, 0, hp);
  const baseLoanAmount = Math.max(0, hp - dp);
  const downPct = hp > 0 ? (dp / hp) * 100 : 0;
  const upfrontFees = computeUpfrontFees(input, baseLoanAmount);
  const financedFeesTotal = input.financeUpfrontFees
    ? upfrontFees.filter((f) => f.financeable).reduce((s, f) => s + f.amount, 0)
    : 0;
  const pointsPct = Math.max(0, input.pointsPercent ?? 0);
  const pointsUpfrontCost = roundUsd(baseLoanAmount * (pointsPct / 100));
  const noteApr = Math.max(0, input.noteApr - pointsPct * 0.25);
  const rateType: RateType = input.rateType === "arm" ? "arm" : "fixed";
  const buydown: BuydownType = input.buydown ?? "none";
  const rateSchedule = buildRateSchedule(noteApr, input.termYears, rateType, buydown, input.arm);
  const mi = estimateMiMonthly(input, baseLoanAmount + financedFeesTotal, downPct);

  return {
    productType: input.productType,
    baseLoanAmount,
    upfrontFees,
    upfrontFeesTotal: upfrontFees.reduce((s, f) => s + f.amount, 0),
    financedFeesTotal,
    totalLoanAmount: baseLoanAmount + financedFeesTotal,
    noteApr,
    pointsUpfrontCost,
    miMonthly: mi.miMonthly,
    miLabel: mi.miLabel,
    pmiDropLtvThreshold: mi.pmiDropLtvThreshold,
    pmiDropMinMonths: mi.pmiDropMinMonths,
    rateSchedule,
  };
}

export function amortizeWithRateSchedule(
  loanAmount: number,
  rateSchedule: number[],
  termYears: number
): { principalAndInterest: number; rows: { month: number; payment: number; principal: number; interest: number; balance: number; rate: number }[] } {
  const nMax = Math.max(1, Math.round(termYears * 12));
  if (loanAmount <= 0) return { principalAndInterest: 0, rows: [] };
  const rows: { month: number; payment: number; principal: number; interest: number; balance: number; rate: number }[] = [];
  let balance = loanAmount;
  let scheduledPi = 0;
  for (let month = 1; month <= nMax && balance > 1e-6; month++) {
    const apr = rateSchedule[month - 1] ?? rateSchedule.at(-1) ?? 0;
    const monthlyRate = apr / 100 / 12;
    const remaining = nMax - month + 1;
    const payment = monthlyRate <= 0 ? balance / remaining : (balance * (monthlyRate * (1 + monthlyRate) ** remaining)) / ((1 + monthlyRate) ** remaining - 1);
    if (month === 1) scheduledPi = payment;
    const interest = monthlyRate <= 0 ? 0 : balance * monthlyRate;
    let principal = Math.min(balance, Math.max(0, payment - interest));
    if (balance - principal < 1e-4) principal = balance;
    balance = Math.max(0, balance - principal);
    rows.push({ month, payment: principal + interest, principal, interest, balance, rate: apr });
  }
  return { principalAndInterest: scheduledPi, rows };
}
