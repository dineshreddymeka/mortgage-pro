import type { AppPersisted } from "../storage/mortgageState";
import { defaultAppState, SCHEMA_VERSION, SCHEMA_VERSION_LEGACY } from "../storage/mortgageState";

/** Full v2 scenario with commonly edited optional blocks populated. */
export const fixtureV2Full: AppPersisted = {
  ...defaultAppState(),
  v: SCHEMA_VERSION,
  homePrice: 520_000,
  downPayment: 104_000,
  downPaymentPercent: 20,
  interestRateApr: 6.25,
  termYears: 30,
  propertyTaxAnnual: 6240,
  propertyTaxPercent: 1.2,
  insuranceAnnual: 1400,
  hoaMonthly: 75,
  pmiMonthly: 0,
  extraPrincipalMonthly: 200,
  annualGrossIncome: 165_000,
  monthlyNonMortgageDebt: 650,
  customHousingBudgetMonthly: 3200,
  refi: {
    balance: 380_000,
    currentPi: 2100,
    newRateApr: 5.75,
    newTermYears: 30,
    closingCosts: 4500,
    loanYearEndPick: 5,
  },
  monthlyRent: 3100,
  otherMonthlyIncome: 150,
  vacancyRatePercent: 6,
  closingCosts: 9500,
  miscInitialCash: 2500,
  propertyMgmtPercent: 9,
  maintenancePercent: 7,
  capexPercent: 4,
  rentalProFormaInclude: { pi: true, mgmt: false, tax: true },
  sellRentalYieldInclude: { pi: false, ins: true },
  sellAnnualAppreciationPercent: 3.5,
  sellClosingCostPercent: 6.5,
  currentHomeValue: 538_000,
  yearsOwned: 2,
  propertyAddress: "123 Main St",
  propertyPlaceId: "place-abc",
  propertyLatitude: 37.77,
  propertyLongitude: -122.42,
  propertyState: "CA",
  propertyPostalCode: "94107",
  buyingCostLineOverrides: { appraisal: 750, recording: 400 },
};

/** Canonical current scenario with every non-alias optional block populated. */
export const fixtureAllKnownFields: AppPersisted = {
  ...fixtureV2Full,
  currentHomeValue: 557_037,
  growth: { rentGrowthPercent: 3, expenseGrowthPercent: 2 },
  tax: {
    enabled: true,
    landPercent: 22,
    improvementsBasis: 18_000,
    qbiEligible: false,
    taxableIncomeBeforeQbi: 45_000,
    marginalIncomeTaxRatePercent: 24,
    capitalGainsRatePercent: 15,
    recaptureRatePercent: 25,
    isLongTerm: false,
    exchange1031: { replacementPropertyCost: 650_000, bootReceived: 12_000 },
  },
  paymentPlan: {
    frequency: "biweekly",
    lumpSums: [{ month: 24, amount: 5000 }],
  },
  loan: {
    productType: "fha",
    noteApr: 6.1,
    termYears: 30,
    rateType: "arm",
    arm: {
      initialFixedYears: 5,
      margin: 2.25,
      indexRate: 4,
      periodicCap: 2,
      lifetimeCap: 5,
    },
    pointsPercent: 1,
    buydown: "2-1",
    financeUpfrontFees: true,
    vaFirstUse: false,
    useScenarioPmi: true,
    miMonthlyOverride: 145,
  },
  upfront: {
    earnestMoney: 10_000,
    sellerCredit: 3500,
    lenderCredit: 1200,
    rehabCashIn: 15_000,
  },
  offerTargets: {
    targetDscr: 1.25,
    targetCashFlowMonthly: 500,
    targetCashOnCashPercent: 8,
    targetPaymentMonthly: 3200,
  },
  rentVsBuy: {
    comparableRentMonthly: 2700,
    investmentReturnPercent: 7,
    horizonYears: 7,
  },
  stressTestDeltas: {
    rateDeltaPct: 1,
    rentDeltaPct: -5,
    vacancyDeltaPct: 2,
    appreciationDeltaPct: -1,
    expenseDeltaPct: 10,
    homePriceDeltaPct: -5,
  },
  rentalIncome: {
    mode: "multifamily",
    multifamily: {
      units: [
        { id: "unit-a", monthlyRent: 1700, otherMonthlyIncome: 75, vacancyRatePercent: 5 },
        { id: "unit-b", monthlyRent: 1400, otherMonthlyIncome: 75, vacancyRatePercent: 7 },
      ],
      defaultVacancyRatePercent: 6,
    },
  },
  dealStrategy: {
    brrrr: {
      arv: 650_000,
      refiLtvPercent: 75,
      refiClosingCosts: 6000,
      holdingCostsDuringRehab: 9000,
    },
    flip: {
      salePrice: 625_000,
      sellingCostPercent: 6,
      holdingCosts: 12_000,
      financingCosts: 8000,
      loanPayoffAtSale: 400_000,
    },
  },
  research: {
    notes: "Roof replaced 2022; HOA review pending.",
    links: [
      {
        id: "link-listing",
        url: "https://example.com/listing/123",
        title: "Listing",
        kind: "listing",
        addedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
    comps: [
      {
        id: "comp-1",
        label: "456 Oak Ave",
        price: 540_000,
        address: "456 Oak Ave",
        addedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
    docs: [
      {
        id: "doc-1",
        title: "Inspection report",
        url: "https://drive.example.com/inspection",
        note: "PDF",
        addedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
    taxIssues: [
      {
        id: "tax-1",
        topic: "depreciation",
        jurisdiction: "federal",
        title: "IRS Pub 946",
        url: "https://www.irs.gov/publications/p946",
        source: "IRS",
        notes: "27.5-year rental depreciation reference",
        addedAt: "2026-01-15T12:00:00.000Z",
      },
    ],
  },
};

/** Legacy v1 mortgage-only blob (no rental fields in storage). */
export const fixtureV1MortgageOnly: Record<string, unknown> = {
  v: SCHEMA_VERSION_LEGACY,
  homePrice: 400_000,
  downPayment: 80_000,
  interestRateApr: 7,
  termYears: 30,
  propertyTaxAnnual: 4800,
  insuranceAnnual: 1100,
  hoaMonthly: 0,
  pmiMonthly: 180,
  extraPrincipalMonthly: 0,
  annualGrossIncome: 120_000,
  monthlyNonMortgageDebt: 400,
};

/** Future schema version with an unknown persisted field from a newer client. */
export const fixtureFutureV99: Record<string, unknown> = {
  ...fixtureV2Full,
  v: 99,
  growth: { rentGrowthPercent: 3, expenseGrowthPercent: 2.5 },
  offerTargets: { targetDscr: 1.25 },
  futureUnderwriting: {
    model: "vNext",
    adjustments: [{ name: "climate", value: 0.98 }],
  },
};

/** Current-version input using top-level aliases retained for legacy imports. */
export const fixtureLegacyV2Aliases: Record<string, unknown> = {
  ...fixtureV2Full,
  upfront: undefined,
  earnestMoney: 8000,
  sellerCredit: 2500,
  lenderCredit: 750,
  rehabCashIn: 12_000,
};

/** Bad containers and values used to prove nested parser diagnostics are path-specific. */
export const fixtureMalformedNested: Record<string, unknown> = {
  ...fixtureV2Full,
  paymentPlan: {
    frequency: "weekly",
    lumpSums: [{ month: "later", amount: -20 }, null, ["not-an-object"]],
  },
  loan: {
    productType: "unknown",
    arm: [{ initialFixedYears: 5 }],
  },
  rentalProFormaInclude: ["pi", true],
  rentalIncome: {
    mode: "multifamily",
    multifamily: {
      units: [
        { id: "", monthlyRent: "many", vacancyRatePercent: 180 },
        { id: "valid", monthlyRent: 1200 },
      ],
    },
  },
  dealStrategy: {
    brrrr: ["not-an-object"],
    flip: { salePrice: { dollars: 600_000 } },
  },
};

/** Firestore house root with single scenario blob. */
export function fixtureFirestoreHouseDoc(scenario: AppPersisted) {
  return {
    id: "001",
    v: 3,
    houseNumber: 1,
    name: "Test House",
    scenario,
  };
}

/** Legacy category-map house doc (read-only migration input). */
export const fixtureLegacyCategoryHouse: Record<string, unknown> = {
  id: "002",
  property: {
    homePrice: 350_000,
    propertyAddress: "456 Oak Ave",
    currentHomeValue: 360_000,
    yearsOwned: 3,
  },
  financing: {
    downPayment: 70_000,
    interestRateApr: 6.75,
    termYears: 30,
    pmiMonthly: 0,
  },
  upfront: { closingCosts: 7000, miscInitialCash: 1000 },
  rental: { monthlyRent: 2400, vacancyRatePercent: 5 },
  exit: { sellClosingCostPercent: 6 },
};
