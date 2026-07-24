/**
 * Rule-of-thumb buyer one-time costs (not a Loan Estimate).
 */

export type BuyerCostLine = {
  id: string;
  label: string;
  amount: number;
  kind: "fee" | "prepaid";
};

export type HomeBuyingCostEstimate = {
  lines: BuyerCostLine[];
  feesSubtotal: number;
  prepaidsSubtotal: number;
  suggestedClosingTotal: number;
};

export type UpfrontCashAdjustments = {
  earnestMoney?: number;
  sellerCredit?: number;
  lenderCredit?: number;
  rehabCashIn?: number;
  pointsUpfrontCost?: number;
};

export type NetCashToCloseBreakdown = {
  downPayment: number;
  closingCosts: number;
  miscInitialCash: number;
  rehabCashIn: number;
  pointsUpfrontCost: number;
  grossCashRequired: number;
  earnestMoney: number;
  sellerCredit: number;
  lenderCredit: number;
  totalCredits: number;
  netCashToClose: number;
};

export function estimateHomeBuyingOneTimeCosts(params: {
  homePrice: number;
  loanAmount: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  prepaidTaxMonths?: number;
  prepaidInsuranceMonths?: number;
  closingCostMultiplier?: number;
}): HomeBuyingCostEstimate {
  const hp = Math.max(0, params.homePrice);
  const loan = Math.max(0, params.loanAmount);
  const tax = Math.max(0, params.propertyTaxAnnual);
  const ins = Math.max(0, params.insuranceAnnual);
  const hoa = Math.max(0, params.hoaMonthly);
  const prepaidTaxMo = Math.min(12, Math.max(0, params.prepaidTaxMonths ?? 3));
  const prepaidInsMo = Math.min(18, Math.max(0, params.prepaidInsuranceMonths ?? 13));
  const mult = Math.max(0.5, Math.min(2, params.closingCostMultiplier ?? 1));

  const lines: BuyerCostLine[] = [];
  lines.push({ id: "recording", label: "Recording / transfer (est.)", amount: Math.round(Math.min(Math.max(hp * 0.0025, 150), 7500) * mult), kind: "fee" });
  lines.push({ id: "appraisal", label: "Appraisal (est.)", amount: Math.round(600 * mult), kind: "fee" });
  lines.push({ id: "inspection", label: "Home inspection (est.)", amount: Math.round(500 * mult), kind: "fee" });
  lines.push({ id: "lenderTitle", label: "Lender / title / settlement (est., % of loan)", amount: Math.round(Math.min(Math.max(loan * 0.009, 800), 25_000) * mult), kind: "fee" });
  lines.push({ id: "escrowTax", label: `Property tax escrow (~${prepaidTaxMo} mo)`, amount: Math.round((tax / 12) * prepaidTaxMo), kind: "prepaid" });
  lines.push({ id: "insPrepay", label: `Homeowners insurance prepaid (~${prepaidInsMo} mo)`, amount: Math.round((ins / 12) * prepaidInsMo), kind: "prepaid" });
  if (hoa > 0) lines.push({ id: "hoaPrepay", label: "HOA prepaid (~2 mo)", amount: Math.round(hoa * 2), kind: "prepaid" });

  const feesSubtotal = lines.filter((l) => l.kind === "fee").reduce((s, l) => s + l.amount, 0);
  const prepaidsSubtotal = lines.filter((l) => l.kind === "prepaid").reduce((s, l) => s + l.amount, 0);
  return { lines, feesSubtotal, prepaidsSubtotal, suggestedClosingTotal: feesSubtotal + prepaidsSubtotal };
}

export function computeNetCashToClose(
  downPayment: number,
  closingCosts: number,
  miscInitialCash: number,
  adjustments: UpfrontCashAdjustments = {}
): NetCashToCloseBreakdown {
  const down = Math.max(0, Math.round(downPayment || 0));
  const closing = Math.max(0, Math.round(closingCosts || 0));
  const misc = Math.max(0, Math.round(miscInitialCash || 0));
  const rehabCashIn = Math.max(0, Math.round(adjustments.rehabCashIn || 0));
  const pointsUpfrontCost = Math.max(0, Math.round(adjustments.pointsUpfrontCost || 0));
  const earnestMoney = Math.max(0, Math.round(adjustments.earnestMoney || 0));
  const sellerCredit = Math.max(0, Math.round(adjustments.sellerCredit || 0));
  const lenderCredit = Math.max(0, Math.round(adjustments.lenderCredit || 0));
  const grossCashRequired = down + closing + misc + rehabCashIn + pointsUpfrontCost;
  const totalCredits = earnestMoney + sellerCredit + lenderCredit;
  return {
    downPayment: down,
    closingCosts: closing,
    miscInitialCash: misc,
    rehabCashIn,
    pointsUpfrontCost,
    grossCashRequired,
    earnestMoney,
    sellerCredit,
    lenderCredit,
    totalCredits,
    netCashToClose: Math.max(0, grossCashRequired - totalCredits),
  };
}

export function applyBuyerCostLineOverrides(
  estimate: HomeBuyingCostEstimate,
  overrides: Partial<Record<string, number>> | undefined | null
): HomeBuyingCostEstimate {
  if (!overrides || Object.keys(overrides).length === 0) return estimate;
  const lines = estimate.lines.map((l) => {
    const o = overrides[l.id];
    if (o === undefined || !Number.isFinite(o)) return l;
    return { ...l, amount: Math.max(0, Math.round(o)) };
  });
  const feesSubtotal = lines.filter((l) => l.kind === "fee").reduce((s, l) => s + l.amount, 0);
  const prepaidsSubtotal = lines.filter((l) => l.kind === "prepaid").reduce((s, l) => s + l.amount, 0);
  return { lines, feesSubtotal, prepaidsSubtotal, suggestedClosingTotal: feesSubtotal + prepaidsSubtotal };
}
