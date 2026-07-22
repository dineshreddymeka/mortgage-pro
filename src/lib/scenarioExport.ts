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
  rentalDscr:
    "DSCR = NOI (annual) / annual debt service (P&I + PMI per month × 12). Null when all-cash or no debt service.",
  rentalGrm:
    "GRM = purchasePrice / annual gross scheduled income (monthlyRent + otherMonthlyIncome, before vacancy). Null when price or GSI is zero.",
  rentalOnePercentRule:
    "1% rule ratio = monthlyRent / purchasePrice (decimal; 0.01 = 1%). Null when price or rent is zero.",
  rentalIncomeMultifamily:
    "Multifamily mode: sum unit rents → monthlyRent, sum unit other income → otherMonthlyIncome, portfolio vacancyLoss / GSI → vacancyRatePercent. Feeds the same rental/derive path.",
  rentalIncomeStr:
    "STR mode: computeStrIncome (nightly × nights + cleaning + other; platform fees + vacancy) → canonical rent fields with effective vacancy folded in.",
  dealStrategyBrrrr:
    "BRRRR: totalCashInvested = down + rehab + buy closing + holding; refiLoan = ARV × LTV; cashOut = max(0, refiLoan − initial loan − refi closing); cashLeft = max(0, invested − cashOut).",
  dealStrategyFlip:
    "Flip: totalProjectCost = purchase + rehab + buy closing + holding + financing; netSaleProceeds = sale − selling costs − loan payoff; netProfit = proceeds − project cost.",
  maxOfferDti28:
    "Binary search max purchase price where PITI+HOA+PMI ≤ 28% of monthly gross income.",
  maxOfferCustomBudget:
    "Binary search max purchase price where PITI+HOA+PMI ≤ customHousingBudgetMonthly.",
  maxOfferTargetDscr:
    "Binary search max purchase price where modeled DSCR ≥ offerTargets.targetDscr (optional scenario field).",
  maxOfferTargetCashFlow:
    "Binary search max purchase price where modeled monthly cash flow ≥ offerTargets.targetCashFlowMonthly.",
  maxOfferTargetCashOnCash:
    "Binary search max purchase price where cash-on-cash ≥ offerTargets.targetCashOnCashPercent.",
  maxOfferTargetPayment:
    "Binary search max purchase price where total housing payment ≤ offerTargets.targetPaymentMonthly.",
  rentVsBuy:
    "Compare buy (projection equity + cumulative CF) vs rent & invest same upfront cash over rentVsBuy.horizonYears.",
  stressTest:
    "Apply stressTestDeltas to a scenario copy and re-run deriveScenario for baseline vs stressed metrics.",
  totalGainWhenToSell:
    "At exit: netProceeds + sum of monthly amounts through exit − initial cash. While the loan is active: yield-adjusted cash flow (NOI − P&I with toggles). After the loan is paid off: effective gross income only (vacancy applied; no operating expenses or P&I).",
  monthlyProjection:
    "Month-by-month model: scheduled P&I + extraPrincipalMonthly + biweekly-equivalent (P&I/12 when frequency=biweekly) + lump sums; PMI from scenario until balance/originalLoan ≤ 78%; rent/OpEx growth from growth.*; value from sellAnnualAppreciationPercent.",
  pmiAutoDrop:
    "Projection PMI uses pmiMonthly while remaining balance / original loan > 78%; drops to $0 at or below 78% of original loan (not re-estimated).",
  investmentIrr:
    "Monthly IRR on cash flows: t=0 = −initial cash (down + closing + misc); months 1..exit = projected cash flow; last month adds net sale proceeds. Annualized as (1+r_month)^12 − 1.",
  equityMultiple:
    "Equity multiple = (cumulative projected cash flow through exit + net sale proceeds) / initial cash invested.",
  taxDepreciation27_5:
    "Straight-line residential rental depreciation over 27.5 years on building basis (purchase + improvements minus land %).",
  taxSimplifiedQbi:
    "§199A simplified: 20% of qualified business income capped at 20% of taxable income before the deduction.",
  taxSaleSummary:
    "Sale tax snapshot: land/building split → accumulated depreciation → §1250 recapture → LTCG on remaining gain.",
  tax1031Exchange:
    "§1031: recognized gain = min(realized gain, boot received); deferred gain = realized − recognized; substituted basis on replacement.",
  taxAfterTaxCashFlow:
    "After-tax annual cash flow ≈ pre-tax cash flow − marginal rate × max(0, QBI − depreciation − QBI deduction). Requires marginal rate.",
  taxAfterTaxExit:
    "After-tax net proceeds = pre-tax net proceeds − estimated sale tax (full sale or boot-only under 1031). After-tax total gain subtracts cumulative operating tax when marginal rate is set.",
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
    maxOffer,
    monthlyProjection,
    exitInvestments,
    rentalIncome,
    dealStrategy,
    tax,
  } = derived;

  const house = buildHouseRoot(state, houseMeta);

  return {
    exportKind: "property-pro-full-export",
    exportVersion: 4,
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
        rentalIncomeMode: rentalIncome.mode,
        rentalIncomeResolvedCanonical: {
          monthlyRent: rentalIncome.monthlyRent,
          otherMonthlyIncome: rentalIncome.otherMonthlyIncome,
          vacancyRatePercent: rentalIncome.vacancyRatePercent,
        },
        multifamilySnapshot: rentalIncome.multifamilySnapshot ?? null,
        strSnapshot: rentalIncome.strSnapshot ?? null,
        rentalProformaWithMortgageTerm: rentalTerm,
        rentalProformaWith30YearPI: rental30,
        rentalProformaWith15YearPI: rental15,
        whenToSell_yieldAdjustedAnnualCashFlow_30yrPath: yieldCf30,
        whenToSell_yieldAdjustedAnnualCashFlow_15yrPath: yieldCf15,
        dscr: rentalTerm.dscr,
        grossRentMultiplier: rentalTerm.grossRentMultiplier,
        onePercentRuleRatio: rentalTerm.onePercentRuleRatio,
      },
      dealStrategy: {
        brrrr: dealStrategy.brrrr,
        flip: dealStrategy.flip,
      },
      maxOffer: {
        fromDti28Pct: maxOffer.fromDti28Pct,
        fromCustomHousingBudget: maxOffer.fromCustomHousingBudget,
        fromTargetDscr: maxOffer.fromTargetDscr,
        fromTargetCashFlow: maxOffer.fromTargetCashFlow,
        fromTargetCashOnCash: maxOffer.fromTargetCashOnCash,
        fromTargetPayment: maxOffer.fromTargetPayment,
        bindingCap: maxOffer.bindingCap,
        targets: maxOffer.targets,
      },
      decisionTools: {
        rentVsBuy: state.rentVsBuy ?? null,
        stressTestDeltas: state.stressTestDeltas ?? null,
      },
      whenToSell: {
        exitHorizonYears_clampedToTerm: termYears,
        yearlyProjection_rows_year1Through30: sellRows,
        realWealthMilestoneSnapshots: milestones,
        exitInvestmentMetrics: exitInvestments,
      },
      projection: {
        monthCount: monthlyProjection.length,
        firstMonth: monthlyProjection[0] ?? null,
        month12: monthlyProjection[11] ?? null,
        month60: monthlyProjection[59] ?? null,
        fullMonthlyRows: monthlyProjection,
      },
      tax: tax
        ? {
            enabled: true,
            assumptionsPersisted: state.tax,
            operating: {
              landBuildingBasis: tax.operating.basis,
              depreciation: tax.operating.depreciation,
              qbi: tax.operating.qbi,
              preTaxCashFlowAnnual: tax.operating.preTaxCashFlowAnnual,
              estimatedAnnualOperatingTax: tax.operating.estimatedAnnualOperatingTax,
              afterTaxCashFlowAnnual: tax.operating.afterTaxCashFlowAnnual,
            },
            exitSnapshots: tax.exitSnapshots.map((s) => ({
              year: s.year,
              monthsHeld: s.monthsHeld,
              salePrice: s.salePrice,
              netProceedsPreTax: s.netProceedsPreTax,
              estimatedSaleTax: s.estimatedSaleTax,
              afterTaxNetProceeds: s.afterTaxNetProceeds,
              afterTaxRealWealthMade: s.afterTaxRealWealthMade,
              recaptureGain: s.saleTaxSummary.recapture.recaptureGain,
              capitalGainTax: s.saleTaxSummary.capitalGainTax.estimatedTax,
              exchange1031: s.exchange1031,
            })),
          }
        : null,
    },
  };
}
