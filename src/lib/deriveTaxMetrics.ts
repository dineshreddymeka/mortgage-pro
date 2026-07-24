import type { AppPersisted, TaxAssumptionsPersisted } from "../storage/mortgageState";
import type { RentalAnalysis } from "./rentalMath";
import {
  capitalGainsTax,
  compute1031Exchange,
  computeSaleTaxSummary,
  depreciation27_5,
  simplifiedQbiDeduction,
  splitLandBuildingBasis,
  type Depreciation27_5Result,
  type Exchange1031Result,
  type LandBuildingBasis,
  type SaleTaxSummary,
  type SimplifiedQbiResult,
} from "./taxMath";
import { REAL_WEALTH_MILESTONE_YEARS, type RealWealthExitSnapshot } from "./whenToSellMath";

export type DerivedTaxOperating = {
  basis: LandBuildingBasis;
  depreciation: Depreciation27_5Result;
  qbi: SimplifiedQbiResult | null;
  qualifiedBusinessIncome: number;
  taxableIncomeBeforeQbi: number;
  preTaxCashFlowAnnual: number;
  estimatedAnnualOperatingTax: number | null;
  afterTaxCashFlowAnnual: number | null;
};

export type DerivedTaxExitSnapshot = {
  year: number;
  monthsHeld: number;
  salePrice: number;
  netProceedsPreTax: number;
  saleTaxSummary: SaleTaxSummary;
  exchange1031: Exchange1031Result | null;
  estimatedSaleTax: number;
  afterTaxNetProceeds: number;
  cumulativeRentalCashFlow: number;
  afterTaxRealWealthMade: number;
};

export type DerivedTaxMetrics = {
  enabled: true;
  assumptions: TaxAssumptionsPersisted;
  operating: DerivedTaxOperating;
  exitSnapshots: DerivedTaxExitSnapshot[];
};

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function isTaxModelingEnabled(state: AppPersisted): boolean {
  return state.tax?.enabled === true;
}

function resolveTaxAssumptions(state: AppPersisted): TaxAssumptionsPersisted {
  const t = state.tax!;
  return {
    enabled: true,
    landPercent: t.landPercent ?? 20,
    improvementsBasis: Math.max(0, t.improvementsBasis ?? state.rehabCashIn ?? state.upfront?.rehabCashIn ?? 0),
    qbiEligible: t.qbiEligible !== false,
    taxableIncomeBeforeQbi: Math.max(0, t.taxableIncomeBeforeQbi ?? 0),
    marginalIncomeTaxRatePercent: clampPct(t.marginalIncomeTaxRatePercent ?? 24),
    capitalGainsRatePercent: clampPct(t.capitalGainsRatePercent ?? 15),
    recaptureRatePercent: clampPct(t.recaptureRatePercent ?? 25),
    isLongTerm: t.isLongTerm !== false,
    ...(t.exchange1031 ? { exchange1031: t.exchange1031 } : {}),
  };
}

function operatingMonthsHeld(state: AppPersisted): number {
  const years = Math.max(0, Math.round(state.yearsOwned));
  return Math.min(360, Math.max(0, years * 12));
}

function buildOperatingMetrics(
  state: AppPersisted,
  rental: RentalAnalysis,
  assumptions: TaxAssumptionsPersisted
): DerivedTaxOperating {
  const purchase = Math.max(0, state.homePrice);
  const improvements = Math.max(0, assumptions.improvementsBasis ?? 0);
  const basis = splitLandBuildingBasis(purchase + improvements, assumptions.landPercent ?? 20);
  const depreciation = depreciation27_5(basis.buildingBasis, operatingMonthsHeld(state));
  const noiAnnual = Math.max(0, rental.noiAnnual);
  const qualifiedBusinessIncome = roundMoney(Math.max(0, noiAnnual - depreciation.annualDepreciation));
  const taxableBeforeQbi =
    assumptions.taxableIncomeBeforeQbi && assumptions.taxableIncomeBeforeQbi > 0
      ? assumptions.taxableIncomeBeforeQbi
      : qualifiedBusinessIncome;
  const qbi = simplifiedQbiDeduction({
    qualifiedBusinessIncome,
    taxableIncomeBeforeQbi: taxableBeforeQbi,
    isEligible: assumptions.qbiEligible,
  });
  const preTaxCashFlowAnnual = rental.cashFlowAnnual;
  const marginalRate = assumptions.marginalIncomeTaxRatePercent ?? 0;
  let estimatedAnnualOperatingTax: number | null = null;
  let afterTaxCashFlowAnnual: number | null = null;
  if (marginalRate > 0) {
    const taxableAfterQbi = roundMoney(Math.max(0, qualifiedBusinessIncome - qbi.qbiDeduction));
    estimatedAnnualOperatingTax = roundMoney(taxableAfterQbi * (marginalRate / 100));
    afterTaxCashFlowAnnual = roundMoney(preTaxCashFlowAnnual - estimatedAnnualOperatingTax);
  }
  return {
    basis,
    depreciation,
    qbi,
    qualifiedBusinessIncome,
    taxableIncomeBeforeQbi: taxableBeforeQbi,
    preTaxCashFlowAnnual,
    estimatedAnnualOperatingTax,
    afterTaxCashFlowAnnual,
  };
}

function estimate1031SaleTax(
  saleSummary: SaleTaxSummary,
  exchange: Exchange1031Result,
  assumptions: TaxAssumptionsPersisted
): number {
  if (exchange.recognizedGain <= 0) return 0;
  const recaptureGain = roundMoney(
    Math.min(saleSummary.depreciation.accumulatedDepreciation, exchange.recognizedGain)
  );
  const capitalGain = roundMoney(Math.max(0, exchange.recognizedGain - recaptureGain));
  const recaptureTax = roundMoney(recaptureGain * ((assumptions.recaptureRatePercent ?? 25) / 100));
  const capitalTax = capitalGainsTax({
    capitalGain,
    longTermRatePercent: assumptions.capitalGainsRatePercent,
    isLongTerm: assumptions.isLongTerm,
  }).estimatedTax;
  return roundMoney(recaptureTax + capitalTax);
}

function buildExitSnapshots(
  state: AppPersisted,
  assumptions: TaxAssumptionsPersisted,
  wealthSnapshots: RealWealthExitSnapshot[],
  operating: DerivedTaxOperating
): DerivedTaxExitSnapshot[] {
  const purchase = Math.max(0, state.homePrice);
  const improvements = Math.max(0, assumptions.improvementsBasis ?? 0);
  const sellPct = clampPct(state.sellClosingCostPercent);
  const annualNet = operating.qualifiedBusinessIncome;
  const taxableBeforeQbi =
    assumptions.taxableIncomeBeforeQbi && assumptions.taxableIncomeBeforeQbi > 0
      ? assumptions.taxableIncomeBeforeQbi
      : annualNet;
  const exchangeInput = assumptions.exchange1031;
  const has1031 =
    exchangeInput != null &&
    (exchangeInput.replacementPropertyCost != null || exchangeInput.bootReceived != null);

  const out: DerivedTaxExitSnapshot[] = [];
  for (const year of REAL_WEALTH_MILESTONE_YEARS) {
    const wealth = wealthSnapshots.find((w) => w.year === year);
    if (!wealth) continue;
    const monthsHeld = year * 12;
    const salePrice = wealth.futureHomeValue;
    const netProceedsPreTax = wealth.netProceedsUserTerm;
    const saleTaxSummary = computeSaleTaxSummary({
      purchasePrice: purchase,
      landPercent: assumptions.landPercent ?? 20,
      improvementsBasis: improvements,
      monthsHeld,
      salePrice,
      sellingCostPercent: sellPct,
      annualNetRentalIncome: annualNet,
      taxableIncomeBeforeQbi: taxableBeforeQbi,
      isQbiEligible: assumptions.qbiEligible,
      capitalGainsRatePercent: assumptions.capitalGainsRatePercent,
      recaptureRatePercent: assumptions.recaptureRatePercent,
      isLongTerm: assumptions.isLongTerm,
    });
    let exchange1031: Exchange1031Result | null = null;
    let estimatedSaleTax = saleTaxSummary.totalEstimatedTax;
    if (has1031) {
      exchange1031 = compute1031Exchange({
        relinquishedSalePrice: salePrice,
        relinquishedAdjustedBasis: saleTaxSummary.adjustedBasis,
        sellingCostPercent: sellPct,
        replacementPropertyCost: Math.max(0, exchangeInput?.replacementPropertyCost ?? salePrice),
        bootReceived: Math.max(0, exchangeInput?.bootReceived ?? 0),
      });
      estimatedSaleTax = estimate1031SaleTax(saleTaxSummary, exchange1031, assumptions);
    }
    const cumulativeRentalCashFlow = wealth.cumulativeRentalCashFlowUserTerm;
    const operatingTaxTotal =
      operating.estimatedAnnualOperatingTax != null
        ? operating.estimatedAnnualOperatingTax * year
        : 0;
    const afterTaxNetProceeds = roundMoney(Math.max(0, netProceedsPreTax - estimatedSaleTax));
    const afterTaxRealWealthMade = roundMoney(
      afterTaxNetProceeds + cumulativeRentalCashFlow - wealth.initialCashInvested - operatingTaxTotal
    );
    out.push({
      year,
      monthsHeld,
      salePrice,
      netProceedsPreTax,
      saleTaxSummary,
      exchange1031,
      estimatedSaleTax,
      afterTaxNetProceeds,
      cumulativeRentalCashFlow,
      afterTaxRealWealthMade,
    });
  }
  return out;
}

export function deriveTaxMetrics(
  state: AppPersisted,
  rental: RentalAnalysis,
  wealthSnapshots: RealWealthExitSnapshot[]
): DerivedTaxMetrics | null {
  if (!isTaxModelingEnabled(state)) return null;
  const assumptions = resolveTaxAssumptions(state);
  const operating = buildOperatingMetrics(state, rental, assumptions);
  const exitSnapshots = buildExitSnapshots(state, assumptions, wealthSnapshots, operating);
  return { enabled: true, assumptions, operating, exitSnapshots };
}
