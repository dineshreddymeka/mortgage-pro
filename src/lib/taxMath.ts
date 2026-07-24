/** Residential rental depreciation period (years) — IRC §168. */
export const RESIDENTIAL_DEPRECIATION_YEARS = 27.5;

export type LandBuildingBasis = {
  totalBasis: number;
  landPercent: number;
  landBasis: number;
  buildingBasis: number;
};

export type Depreciation27_5Result = {
  buildingBasis: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  /** Whole months held (clamped 0–330 = 27.5×12). */
  monthsHeld: number;
  accumulatedDepreciation: number;
  remainingBuildingBasis: number;
};

export type SimplifiedQbiInput = {
  /** Net rental income before QBI (typically after depreciation). */
  qualifiedBusinessIncome: number;
  /** Taxable income before the QBI deduction (simplified cap). */
  taxableIncomeBeforeQbi: number;
  /** Deduction rate; default 20% (§199A). */
  qbiRatePercent?: number;
  /** When false, deduction is zero (e.g. disqualified rental). */
  isEligible?: boolean;
};

export type SimplifiedQbiResult = {
  qualifiedBusinessIncome: number;
  qbiDeduction: number;
  effectiveDeductionRatePercent: number;
};

export type DepreciationRecaptureInput = {
  accumulatedDepreciation: number;
  adjustedBasis: number;
  salePrice: number;
  sellingCostPercent?: number;
  /** Unrecaptured §1250 rate; default 25%. */
  recaptureRatePercent?: number;
};

export type DepreciationRecaptureResult = {
  amountRealized: number;
  totalGain: number;
  recaptureGain: number;
  remainingCapitalGain: number;
  estimatedRecaptureTax: number;
};

export type CapitalGainsTaxInput = {
  capitalGain: number;
  /** Long-term rate applied to non-recapture gain; default 15%. */
  longTermRatePercent?: number;
  /** Short-term rate when not long-term; default 24%. */
  shortTermRatePercent?: number;
  isLongTerm?: boolean;
};

export type CapitalGainsTaxResult = {
  taxableGain: number;
  estimatedTax: number;
  effectiveRatePercent: number;
};

export type Exchange1031Input = {
  relinquishedSalePrice: number;
  relinquishedAdjustedBasis: number;
  sellingCostPercent: number;
  replacementPropertyCost: number;
  /** Cash or non-like-kind property received (“boot”). */
  bootReceived?: number;
};

export type Exchange1031Result = {
  amountRealized: number;
  realizedGain: number;
  recognizedGain: number;
  deferredGain: number;
  substitutedBasis: number;
};

export type SaleTaxSummaryInput = {
  purchasePrice: number;
  landPercent: number;
  improvementsBasis?: number;
  monthsHeld: number;
  salePrice: number;
  sellingCostPercent: number;
  annualNetRentalIncome?: number;
  taxableIncomeBeforeQbi?: number;
  isQbiEligible?: boolean;
  capitalGainsRatePercent?: number;
  recaptureRatePercent?: number;
  isLongTerm?: boolean;
};

export type SaleTaxSummary = {
  basis: LandBuildingBasis;
  depreciation: Depreciation27_5Result;
  adjustedBasis: number;
  recapture: DepreciationRecaptureResult;
  capitalGainTax: CapitalGainsTaxResult;
  qbi: SimplifiedQbiResult | null;
  totalEstimatedTax: number;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Split purchase/all-in cost into non-depreciable land and depreciable building. */
export function splitLandBuildingBasis(
  totalBasis: number,
  landPercent: number
): LandBuildingBasis {
  const total = Math.max(0, Number(totalBasis) || 0);
  const landPct = clamp(Number(landPercent) || 0, 0, 100);
  const landBasis = roundMoney(total * (landPct / 100));
  const buildingBasis = roundMoney(Math.max(0, total - landBasis));
  return {
    totalBasis: roundMoney(total),
    landPercent: landPct,
    landBasis,
    buildingBasis,
  };
}

/** Straight-line residential rental depreciation over 27.5 years. */
export function depreciation27_5(
  buildingBasis: number,
  monthsHeld: number
): Depreciation27_5Result {
  const basis = Math.max(0, Number(buildingBasis) || 0);
  const maxMonths = RESIDENTIAL_DEPRECIATION_YEARS * 12;
  const months = clamp(Math.floor(Number(monthsHeld) || 0), 0, maxMonths);
  const annual = basis > 0 ? basis / RESIDENTIAL_DEPRECIATION_YEARS : 0;
  const monthly = annual / 12;
  const accumulated = roundMoney(Math.min(basis, monthly * months));
  return {
    buildingBasis: roundMoney(basis),
    annualDepreciation: roundMoney(annual),
    monthlyDepreciation: roundMoney(monthly),
    monthsHeld: months,
    accumulatedDepreciation: accumulated,
    remainingBuildingBasis: roundMoney(Math.max(0, basis - accumulated)),
  };
}

/**
 * Simplified §199A QBI: 20% of QBI capped at 20% of taxable income before the deduction.
 * Does not model SSTB, W-2/UBIA limits, or REIT/PTP rules.
 */
export function simplifiedQbiDeduction(input: SimplifiedQbiInput): SimplifiedQbiResult {
  const qbiRate = clamp(Number(input.qbiRatePercent ?? 20) || 20, 0, 100) / 100;
  const eligible = input.isEligible !== false;
  const qbi = Math.max(0, Number(input.qualifiedBusinessIncome) || 0);
  const taxable = Math.max(0, Number(input.taxableIncomeBeforeQbi) || 0);

  if (!eligible || qbi <= 0) {
    return { qualifiedBusinessIncome: roundMoney(qbi), qbiDeduction: 0, effectiveDeductionRatePercent: 0 };
  }

  const fromQbi = qbi * qbiRate;
  const fromIncome = taxable * qbiRate;
  const deduction = roundMoney(Math.min(fromQbi, fromIncome));
  const effectiveRate = qbi > 0 ? (deduction / qbi) * 100 : 0;
  return {
    qualifiedBusinessIncome: roundMoney(qbi),
    qbiDeduction: deduction,
    effectiveDeductionRatePercent: roundMoney(effectiveRate),
  };
}

/** §1250 unrecaptured gain on depreciable real property (simplified). */
export function depreciationRecapture(
  input: DepreciationRecaptureInput
): DepreciationRecaptureResult {
  const sale = Math.max(0, Number(input.salePrice) || 0);
  const basis = Math.max(0, Number(input.adjustedBasis) || 0);
  const dep = Math.max(0, Number(input.accumulatedDepreciation) || 0);
  const sellPct = clamp(Number(input.sellingCostPercent ?? 0) || 0, 0, 100);
  const recaptureRate = clamp(Number(input.recaptureRatePercent ?? 25) || 25, 0, 100) / 100;

  const sellingCosts = roundMoney(sale * (sellPct / 100));
  const amountRealized = roundMoney(Math.max(0, sale - sellingCosts));
  const totalGain = roundMoney(Math.max(0, amountRealized - basis));
  const recaptureGain = roundMoney(Math.min(dep, totalGain));
  const remainingCapitalGain = roundMoney(Math.max(0, totalGain - recaptureGain));
  const estimatedRecaptureTax = roundMoney(recaptureGain * recaptureRate);

  return {
    amountRealized,
    totalGain,
    recaptureGain,
    remainingCapitalGain,
    estimatedRecaptureTax,
  };
}

/** Estimated tax on capital gain (recapture handled separately). */
export function capitalGainsTax(input: CapitalGainsTaxInput): CapitalGainsTaxResult {
  const gain = Math.max(0, Number(input.capitalGain) || 0);
  const longTerm = input.isLongTerm !== false;
  const ratePct = longTerm
    ? clamp(Number(input.longTermRatePercent ?? 15) || 15, 0, 100)
    : clamp(Number(input.shortTermRatePercent ?? 24) || 24, 0, 100);
  const rate = ratePct / 100;
  const tax = roundMoney(gain * rate);
  const effectiveRate = gain > 0 ? (tax / gain) * 100 : 0;
  return {
    taxableGain: roundMoney(gain),
    estimatedTax: tax,
    effectiveRatePercent: roundMoney(effectiveRate),
  };
}

/**
 * Like-kind exchange (§1031) — realized vs recognized gain and substituted basis.
 * Boot recognition: min(realized gain, boot received).
 */
export function compute1031Exchange(input: Exchange1031Input): Exchange1031Result {
  const sale = Math.max(0, Number(input.relinquishedSalePrice) || 0);
  const basis = Math.max(0, Number(input.relinquishedAdjustedBasis) || 0);
  const sellPct = clamp(Number(input.sellingCostPercent ?? 0) || 0, 0, 100);
  const replacement = Math.max(0, Number(input.replacementPropertyCost) || 0);
  const boot = Math.max(0, Number(input.bootReceived ?? 0) || 0);

  const sellingCosts = roundMoney(sale * (sellPct / 100));
  const amountRealized = roundMoney(Math.max(0, sale - sellingCosts));
  const realizedGain = roundMoney(Math.max(0, amountRealized - basis));
  const recognizedGain = roundMoney(Math.min(realizedGain, boot));
  const deferredGain = roundMoney(Math.max(0, realizedGain - recognizedGain));
  const substitutedBasis = roundMoney(Math.max(0, replacement - deferredGain));

  return {
    amountRealized,
    realizedGain,
    recognizedGain,
    deferredGain,
    substitutedBasis,
  };
}

/** End-to-end simplified sale tax snapshot from basis → depreciation → recapture → LTCG (+ optional QBI). */
export function computeSaleTaxSummary(input: SaleTaxSummaryInput): SaleTaxSummary {
  const purchase = Math.max(0, Number(input.purchasePrice) || 0);
  const improvements = Math.max(0, Number(input.improvementsBasis ?? 0) || 0);
  const months = Math.max(0, Math.floor(Number(input.monthsHeld) || 0));
  const sale = Math.max(0, Number(input.salePrice) || 0);
  const sellPct = clamp(Number(input.sellingCostPercent ?? 0) || 0, 0, 100);
  const landPct = clamp(Number(input.landPercent ?? 20) || 20, 0, 100);

  const basis = splitLandBuildingBasis(purchase + improvements, landPct);
  const depreciation = depreciation27_5(basis.buildingBasis, months);
  const adjustedBasis = roundMoney(
    basis.totalBasis - depreciation.accumulatedDepreciation
  );

  const recapture = depreciationRecapture({
    accumulatedDepreciation: depreciation.accumulatedDepreciation,
    adjustedBasis,
    salePrice: sale,
    sellingCostPercent: sellPct,
    recaptureRatePercent: input.recaptureRatePercent,
  });

  const capitalGainTax = capitalGainsTax({
    capitalGain: recapture.remainingCapitalGain,
    longTermRatePercent: input.capitalGainsRatePercent,
    isLongTerm: input.isLongTerm,
  });

  let qbi: SimplifiedQbiResult | null = null;
  const annualNet = Number(input.annualNetRentalIncome);
  if (Number.isFinite(annualNet)) {
    qbi = simplifiedQbiDeduction({
      qualifiedBusinessIncome: annualNet,
      taxableIncomeBeforeQbi:
        Number(input.taxableIncomeBeforeQbi ?? annualNet) || annualNet,
      isEligible: input.isQbiEligible,
    });
  }

  const totalEstimatedTax = roundMoney(
    recapture.estimatedRecaptureTax + capitalGainTax.estimatedTax
  );

  return {
    basis,
    depreciation,
    adjustedBasis,
    recapture,
    capitalGainTax,
    qbi,
    totalEstimatedTax,
  };
}
