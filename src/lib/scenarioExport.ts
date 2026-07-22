import type { AppPersisted } from "../storage/mortgageState";
import { buildHouseRoot } from "../storage/houseTree";
import { deriveScenario } from "./deriveScenario";

/**
 * Human-readable formulas matching app logic (Mortgage, Rental, When to sell).
 * Export-only documentation; not executed.
 */
export const SCENARIO_EXPORT_FORMULAS: Record<string, string> = {
  impliedAnnualAppreciationPercent:
    "Compound annual rate from purchase to present: ((currentHomeValue / homePrice)^(1 / yearsOwned) - 1) * 100, with yearsOwned at least 1.",
  futureHomeValue:
    "Modeled value at exit year Y: homePrice * (1 + sellAnnualAppreciationPercent/100) ^ Y.",
  netProceedsAtSale:
    "max(0, futureHomeValue - remainingLoanBalance - futureHomeValue * sellClosingCostPercent/100).",
  monthlyPayment:
    "Fixed-rate amortizing P&I from loan amount, APR, term; property tax, insurance, HOA, and optional PMI per month in MonthlyBreakdown.",
  extraPrincipalMonthly:
    "Optional add-on principal each month: same scheduled P&I as the no-prepay loan; surplus reduces balance early (Mortgage tab schedule used for refi/yearly views; rental / other paths may use standard amortization).",
  refiBreakevenSimple:
    "P&I savings = current P&I − new fixed P&I on refinanced balance; payback (months) = refi closing costs / monthly savings when savings > 0. Remaining balance can be snapped from the modeled schedule by completed loan year.",
  rentalGsiEgi:
    "GSI = monthlyRent + otherMonthlyIncome; vacancy loss = GSI * vacancyRatePercent/100; EGI = GSI - vacancy loss.",
  rentalNoi:
    "NOI (monthly) = EGI - management - maintenance - capex reserve - monthly property tax - monthly insurance - HOA.",
  rentalCashFlow:
    "Monthly cash flow = NOI - P&I. Rental pro-forma toggles (rentalProFormaInclude) and When-to-sell yield toggles (sellRentalYieldInclude) can omit OpEx lines, P&I, or PMI for alternate paths.",
  cashOnCash: "Annual cash flow / (downPayment + closingCosts + miscInitialCash).",
  capRate: "NOI (annual) / purchasePrice (homePrice).",
  totalGainWhenToSell:
    "At exit: netProceeds + sum of monthly amounts through exit − initial cash. While the loan is active: yield-adjusted cash flow (NOI − P&I with toggles). After the loan is paid off: effective gross income only (vacancy applied; no operating expenses or P&I).",
};

export function buildFullScenarioExport(
  state: AppPersisted,
  houseMeta?: { id?: string; houseId?: string; houseNumber?: number; name?: string }
) {
  const derived = deriveScenario(state);
  const {
    purchasePrice: hp,
    downPayment: dp,
    loanAmount,
    termYears,
    monthlyPayment: monthlyScenario,
    monthlyPayment30: monthly30,
    monthlyPayment15: monthly15,
    amortization: schedTerm,
    amortizationTotals: totalsTerm,
    amortizationWithExtraPrincipal: schedPrepay,
    amortizationPrepayTotals: totalsPrepay,
    rental: rentalTerm,
    rental30,
    rental15,
    yieldCashFlowAnnual30: yieldCf30,
    yieldCashFlowAnnual15: yieldCf15,
    sellRows,
    realWealthSnapshots: milestones,
    impliedAnnualAppreciationPercent: impliedAprVerify,
  } = derived;

  const house = buildHouseRoot(state, houseMeta);

  return {
    exportKind: "property-pro-full-export",
    exportVersion: 3,
    exportedAt: new Date().toISOString(),
    /** House root: `id` + one `scenario` (all inputs). */
    house,
    /** Same scenario blob as `house.scenario` (Excel / older helpers). */
    scenario: state,
    formulas: SCENARIO_EXPORT_FORMULAS,
    calculated: {
      common: {
        purchasePrice: hp,
        downPayment: dp,
        loanAmount,
        currentHomeValue: state.currentHomeValue,
        yearsOwned: state.yearsOwned,
        impliedAnnualAppreciationPercent_fromPresentValue: impliedAprVerify,
        sellAnnualAppreciationPercent_usedInProjections: state.sellAnnualAppreciationPercent,
      },
      mortgage: {
        termYears: state.termYears,
        monthlyPaymentForScenarioTerm: monthlyScenario,
        monthlyPaymentComparison30Year: monthly30,
        monthlyPaymentComparison15Year: monthly15,
        amortizationForScenarioTerm: {
          months: schedTerm.length,
          totalInterest: totalsTerm.totalInterest,
          totalPrincipal: totalsTerm.totalPrincipal,
        },
        amortizationWithExtraPrincipalWhenSet:
          schedPrepay && totalsPrepay
            ? {
                extraPrincipalMonthly: state.extraPrincipalMonthly,
                months: schedPrepay.length,
                totalInterest: totalsPrepay.totalInterest,
                totalPrincipal: totalsPrepay.totalPrincipal,
                interestSavedVsNoPrepay: totalsTerm.totalInterest - totalsPrepay.totalInterest,
                monthsShortenedVsNoPrepay: schedTerm.length - schedPrepay.length,
              }
            : null,
        firstAmortizationRow: schedTerm[0] ?? null,
        lastAmortizationRow: schedTerm.length > 0 ? schedTerm[schedTerm.length - 1] ?? null : null,
      },
      rental: {
        rentalProformaWithMortgageTerm: rentalTerm,
        rentalProformaWith30YearPI: rental30,
        rentalProformaWith15YearPI: rental15,
        whenToSell_yieldAdjustedAnnualCashFlow_30yrPath: yieldCf30,
        whenToSell_yieldAdjustedAnnualCashFlow_15yrPath: yieldCf15,
      },
      whenToSell: {
        exitHorizonYears_clampedToTerm: termYears,
        yearlyProjection_rows_year1Through30: sellRows,
        realWealthMilestoneSnapshots: milestones,
      },
    },
  };
}
