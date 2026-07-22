import type { AppPersisted } from "../storage/mortgageState";
import { defaultAppState, SCHEMA_VERSION, SCHEMA_VERSION_LEGACY } from "../storage/mortgageState";

/** Full v2 scenario with optional blocks populated (refi, DTI budget, pro-forma toggles). */
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
  buyingCostLineOverrides: { appraisal: 750, recording: 400 },
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
  growth: { rentGrowthPct: 3, expenseGrowthPct: 2.5 },
  offerTargets: { targetDscr: 1.25 },
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
