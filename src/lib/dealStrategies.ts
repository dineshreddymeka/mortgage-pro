export type StrIncomeInput = {
  nightlyRate: number;
  nightsBookedPerMonth: number;
  cleaningFeePerStay: number;
  staysPerMonth: number;
  platformFeePercent?: number;
  otherMonthlyIncome?: number;
  vacancyRatePercent?: number;
};

export type StrIncomeResult = {
  grossBookingIncome: number;
  cleaningIncome: number;
  otherIncome: number;
  grossScheduledIncomeMonthly: number;
  platformFees: number;
  vacancyLoss: number;
  effectiveGrossIncomeMonthly: number;
};

export type MultifamilyUnit = {
  monthlyRent: number;
  otherMonthlyIncome?: number;
  vacancyRatePercent?: number;
};

export type MultifamilyAggregateInput = {
  units: MultifamilyUnit[];
  /** Portfolio-wide vacancy when a unit omits its own rate. */
  defaultVacancyRatePercent?: number;
};

export type MultifamilyAggregateResult = {
  unitCount: number;
  grossScheduledIncomeMonthly: number;
  vacancyLossMonthly: number;
  effectiveGrossIncomeMonthly: number;
  averageRentPerUnit: number;
};

export type BrrrrInput = {
  purchasePrice: number;
  rehabCost: number;
  buyClosingCosts: number;
  holdingCostsDuringRehab: number;
  downPayment: number;
  initialLoanAmount: number;
  arv: number;
  refiLtvPercent: number;
  refiClosingCosts: number;
};

export type BrrrrResult = {
  totalCashInvested: number;
  refiLoanAmount: number;
  cashOutAtRefi: number;
  cashLeftInDeal: number;
  equityCreated: number;
  infiniteReturn: boolean;
};

export type FlipInput = {
  purchasePrice: number;
  rehabCost: number;
  buyClosingCosts: number;
  holdingCosts: number;
  financingCosts?: number;
  salePrice: number;
  sellingCostPercent?: number;
  loanPayoffAtSale?: number;
};

export type FlipResult = {
  totalProjectCost: number;
  netSaleProceeds: number;
  netProfit: number;
  roiPercent: number;
  profitMarginPercent: number;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Short-term rental gross-to-net income (platform fees + vacancy). */
export function computeStrIncome(input: StrIncomeInput): StrIncomeResult {
  const nightly = Math.max(0, Number(input.nightlyRate) || 0);
  const nights = Math.max(0, Number(input.nightsBookedPerMonth) || 0);
  const cleaningFee = Math.max(0, Number(input.cleaningFeePerStay) || 0);
  const stays = Math.max(0, Number(input.staysPerMonth) || 0);
  const platformPct = clamp(Number(input.platformFeePercent ?? 3) || 0, 0, 100);
  const other = Math.max(0, Number(input.otherMonthlyIncome ?? 0) || 0);
  const vacancyPct = clamp(Number(input.vacancyRatePercent ?? 5) || 0, 0, 100);

  const grossBooking = roundMoney(nightly * nights);
  const cleaningIncome = roundMoney(cleaningFee * stays);
  const grossScheduled = roundMoney(grossBooking + cleaningIncome + other);
  const platformFees = roundMoney(grossScheduled * (platformPct / 100));
  const afterPlatform = Math.max(0, grossScheduled - platformFees);
  const vacancyLoss = roundMoney(afterPlatform * (vacancyPct / 100));
  const egi = roundMoney(Math.max(0, afterPlatform - vacancyLoss));

  return {
    grossBookingIncome: grossBooking,
    cleaningIncome,
    otherIncome: roundMoney(other),
    grossScheduledIncomeMonthly: grossScheduled,
    platformFees,
    vacancyLoss,
    effectiveGrossIncomeMonthly: egi,
  };
}

/** Roll up per-unit rents into portfolio-level income metrics. */
export function aggregateMultifamilyIncome(
  input: MultifamilyAggregateInput
): MultifamilyAggregateResult {
  const units = input.units ?? [];
  const defaultVacancy = clamp(Number(input.defaultVacancyRatePercent ?? 5) || 0, 0, 100);

  let gsi = 0;
  let vacancyLoss = 0;

  for (const unit of units) {
    const rent = Math.max(0, Number(unit.monthlyRent) || 0);
    const other = Math.max(0, Number(unit.otherMonthlyIncome ?? 0) || 0);
    const unitGsi = rent + other;
    const vacPct = clamp(Number(unit.vacancyRatePercent ?? defaultVacancy) || 0, 0, 100);
    gsi += unitGsi;
    vacancyLoss += unitGsi * (vacPct / 100);
  }

  const count = units.length;
  const egi = Math.max(0, gsi - vacancyLoss);

  return {
    unitCount: count,
    grossScheduledIncomeMonthly: roundMoney(gsi),
    vacancyLossMonthly: roundMoney(vacancyLoss),
    effectiveGrossIncomeMonthly: roundMoney(egi),
    averageRentPerUnit: count > 0 ? roundMoney(gsi / count) : 0,
  };
}

/**
 * BRRRR cash left after refi: total cash in minus cash returned when refinancing at ARV × LTV.
 * Cash out = refi loan − initial loan payoff − refi closing costs.
 */
export function computeBrrrrCashLeft(input: BrrrrInput): BrrrrResult {
  const rehab = Math.max(0, Number(input.rehabCost) || 0);
  const buyClosing = Math.max(0, Number(input.buyClosingCosts) || 0);
  const holding = Math.max(0, Number(input.holdingCostsDuringRehab) || 0);
  const down = Math.max(0, Number(input.downPayment) || 0);
  const initialLoan = Math.max(0, Number(input.initialLoanAmount) || 0);
  const arv = Math.max(0, Number(input.arv) || 0);
  const ltvPct = clamp(Number(input.refiLtvPercent ?? 75) || 0, 0, 100);
  const refiClosing = Math.max(0, Number(input.refiClosingCosts) || 0);

  const totalCashInvested = roundMoney(down + rehab + buyClosing + holding);
  const refiLoanAmount = roundMoney(arv * (ltvPct / 100));
  const cashOutAtRefi = roundMoney(
    Math.max(0, refiLoanAmount - initialLoan - refiClosing)
  );
  const cashLeftInDeal = roundMoney(Math.max(0, totalCashInvested - cashOutAtRefi));
  const infiniteReturn = totalCashInvested > 0 && cashOutAtRefi >= totalCashInvested;
  const equityCreated = roundMoney(Math.max(0, arv - refiLoanAmount));

  return {
    totalCashInvested,
    refiLoanAmount,
    cashOutAtRefi,
    cashLeftInDeal: infiniteReturn ? 0 : cashLeftInDeal,
    equityCreated,
    infiniteReturn,
  };
}

/** Fix-and-flip net proceeds and return metrics after sale costs and optional loan payoff. */
export function computeFlipProceeds(input: FlipInput): FlipResult {
  const purchase = Math.max(0, Number(input.purchasePrice) || 0);
  const rehab = Math.max(0, Number(input.rehabCost) || 0);
  const buyClosing = Math.max(0, Number(input.buyClosingCosts) || 0);
  const holding = Math.max(0, Number(input.holdingCosts) || 0);
  const financing = Math.max(0, Number(input.financingCosts ?? 0) || 0);
  const sale = Math.max(0, Number(input.salePrice) || 0);
  const sellPct = clamp(Number(input.sellingCostPercent ?? 6) || 0, 0, 100);
  const loanPayoff = Math.max(0, Number(input.loanPayoffAtSale ?? 0) || 0);

  const totalProjectCost = roundMoney(
    purchase + rehab + buyClosing + holding + financing
  );
  const sellingCosts = roundMoney(sale * (sellPct / 100));
  const netSaleProceeds = roundMoney(
    Math.max(0, sale - sellingCosts - loanPayoff)
  );
  const netProfit = roundMoney(netSaleProceeds - totalProjectCost);
  const roiPercent =
    totalProjectCost > 0 ? roundMoney((netProfit / totalProjectCost) * 100) : 0;
  const profitMarginPercent = sale > 0 ? roundMoney((netProfit / sale) * 100) : 0;

  return {
    totalProjectCost,
    netSaleProceeds,
    netProfit,
    roiPercent,
    profitMarginPercent,
  };
}

/** Map a conventional monthly rent to STR income using occupancy assumptions. */
export function strIncomeFromMonthlyRent(
  monthlyRent: number,
  options?: Partial<Pick<StrIncomeInput, "nightsBookedPerMonth" | "vacancyRatePercent">>
): StrIncomeResult {
  const targetRent = Math.max(0, Number(monthlyRent) || 0);
  const nights = Math.max(1, Number(options?.nightsBookedPerMonth ?? 20) || 20);
  const nightlyRate = targetRent / nights;
  return computeStrIncome({
    nightlyRate,
    nightsBookedPerMonth: nights,
    cleaningFeePerStay: 0,
    staysPerMonth: 0,
    platformFeePercent: 0,
    vacancyRatePercent: options?.vacancyRatePercent ?? 5,
  });
}
