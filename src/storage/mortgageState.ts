import scenarioDefaultsJson from "../defaults/scenario-defaults.json";
import { normalizePostal, normalizeStateCode } from "../lib/locationCostEstimator";
import { impliedAnnualAppreciationPercent } from "../lib/mortgageMath";
import { parseResearchNotes, type ResearchPersisted } from "./researchNotes";

export type { ExternalTaxResearchPersisted, ResearchPersisted } from "./researchNotes";

export const STORAGE_KEY = "mortgage-pro:v1";
export const SYNC_CHANNEL = "mortgage-pro-sync";

/** v1: mortgage only. v2: mortgage + rental pro-forma fields. */
export const SCHEMA_VERSION = 2 as const;
export const SCHEMA_VERSION_LEGACY = 1 as const;

/** Refinance breakeven what-if inputs (Financing tab). */
export type RefiScenarioPersisted = {
  balance: number;
  currentPi: number;
  newRateApr: number;
  newTermYears: number;
  closingCosts: number;
  /** Completed loan years used to snap balance from amortization (0 = at closing). */
  loanYearEndPick: number;
};

/** Optional annual growth assumptions (Rental tab). Appreciation stays on `sellAnnualAppreciationPercent`. */
export type GrowthAssumptionsPersisted = {
  rentGrowthPercent: number;
  expenseGrowthPercent: number;
};

/** Optional §1031 inputs when tax modeling is enabled (Exit tab). */
export type Tax1031AssumptionsPersisted = {
  replacementPropertyCost?: number;
  bootReceived?: number;
};

/**
 * Optional simplified tax assumptions (Rental / Exit). Omitted until the user enables modeling;
 * derived depreciation, QBI, sale tax, and after-tax metrics are never persisted.
 */
export type TaxAssumptionsPersisted = {
  enabled: true;
  /** Non-depreciable land as % of basis (0–100). Default 20 when enabled. */
  landPercent?: number;
  /** Capitalized improvements added to depreciable basis ($). */
  improvementsBasis?: number;
  /** §199A eligibility (simplified). Default true when enabled. */
  qbiEligible?: boolean;
  /** Taxable income cap before QBI; 0 = use NOI − depreciation. */
  taxableIncomeBeforeQbi?: number;
  /** Marginal ordinary rate for after-tax cash flow estimate (0 = skip). */
  marginalIncomeTaxRatePercent?: number;
  /** Long-term capital gain rate on non-recapture gain (%). */
  capitalGainsRatePercent?: number;
  /** Unrecaptured §1250 rate (%). */
  recaptureRatePercent?: number;
  /** Long-term vs short-term on remaining capital gain. */
  isLongTerm?: boolean;
  exchange1031?: Tax1031AssumptionsPersisted;
};

export type PaymentPlanLumpSum = {
  month: number;
  amount: number;
};

/** Optional payment plan (Financing tab) — frequency and one-time principal lump sums. */
export type PaymentPlanPersisted = {
  frequency: "monthly" | "biweekly";
  lumpSums: PaymentPlanLumpSum[];
};

/** Optional max-offer targets (Financing tab) — persisted assumptions, not derived caps. */
export type OfferTargetsPersisted = {
  targetDscr?: number;
  targetCashFlowMonthly?: number;
  targetCashOnCashPercent?: number;
  targetPaymentMonthly?: number;
};

/** Rent-vs-buy comparison assumptions (Exit tab). */
export type RentVsBuyAssumptionsPersisted = {
  comparableRentMonthly?: number;
  investmentReturnPercent?: number;
  horizonYears?: number;
};

/** Stress-test deltas applied to scenario copies (Rental / Compare). */
export type StressTestDeltasPersisted = {
  rateDeltaPct?: number;
  rentDeltaPct?: number;
  vacancyDeltaPct?: number;
  appreciationDeltaPct?: number;
  expenseDeltaPct?: number;
  homePriceDeltaPct?: number;
};

export type LoanProductTypePersisted = "conventional" | "fha" | "va" | "usda";

export type LoanArmPersisted = {
  initialFixedYears: number;
  margin: number;
  indexRate: number;
  periodicCap: number;
  lifetimeCap: number;
};

export type LoanScenarioPersisted = {
  productType: LoanProductTypePersisted;
  noteApr?: number;
  termYears?: number;
  rateType?: "fixed" | "arm";
  arm?: LoanArmPersisted;
  pointsPercent?: number;
  buydown?: "none" | "2-1" | "3-2-1";
  financeUpfrontFees?: boolean;
  vaFirstUse?: boolean;
  useScenarioPmi?: boolean;
  miMonthlyOverride?: number;
};

export type UpfrontScenarioPersisted = {
  earnestMoney?: number;
  sellerCredit?: number;
  lenderCredit?: number;
  rehabCashIn?: number;
};

/** Rental income entry mode (canonical rent fields remain the single derive path). */
export type RentalIncomeMode = "simple" | "multifamily" | "str";

export type MultifamilyUnitPersisted = {
  id: string;
  monthlyRent: number;
  otherMonthlyIncome?: number;
  vacancyRatePercent?: number;
};

export type MultifamilyIncomePersisted = {
  units: MultifamilyUnitPersisted[];
  defaultVacancyRatePercent?: number;
};

export type StrIncomePersisted = {
  nightlyRate: number;
  nightsBookedPerMonth: number;
  cleaningFeePerStay: number;
  staysPerMonth: number;
  platformFeePercent?: number;
  otherMonthlyIncome?: number;
  vacancyRatePercent?: number;
};

/** Optional rental income detail (multifamily units / STR). Syncs into canonical rent fields. */
export type RentalIncomePersisted = {
  mode: RentalIncomeMode;
  multifamily?: MultifamilyIncomePersisted;
  str?: StrIncomePersisted;
};

/** Optional BRRRR strategy inputs — derived snapshots are computed, not stored. */
export type BrrrrStrategyPersisted = {
  arv?: number;
  refiLtvPercent?: number;
  refiClosingCosts?: number;
  holdingCostsDuringRehab?: number;
};

/** Optional fix-and-flip strategy inputs — derived snapshots are computed, not stored. */
export type FlipStrategyPersisted = {
  salePrice?: number;
  sellingCostPercent?: number;
  holdingCosts?: number;
  financingCosts?: number;
  loanPayoffAtSale?: number;
};

export type DealStrategyPersisted = {
  brrrr?: BrrrrStrategyPersisted;
  flip?: FlipStrategyPersisted;
};

export type AppPersisted = {
  v: typeof SCHEMA_VERSION;
  homePrice: number;
  downPayment: number;
  /** 0–100; kept in sync when purchase price changes (same % → new dollar amount). */
  downPaymentPercent: number;
  interestRateApr: number;
  termYears: number;
  propertyTaxAnnual: number;
  /** Annual property tax as % of purchase price (0–100); synced with `propertyTaxAnnual`. */
  propertyTaxPercent: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  /** Private mortgage insurance per month ($0 if none / removed / not modeled). */
  pmiMonthly: number;
  /** Optional extra principal paid every month (P&amp;I prepayment; $0 = off). */
  extraPrincipalMonthly: number;
  /** Pre-tax annual income for DTI / affordability (0 = leave DTI blank). */
  annualGrossIncome: number;
  /** Car, cards, student loans, etc. — not housing (for back-end DTI). */
  monthlyNonMortgageDebt: number;
  /**
   * Optional custom max housing payment ($/mo) for the DTI “max price for a monthly budget” tool.
   * Omitted / 0 = field empty.
   */
  customHousingBudgetMonthly?: number;
  /**
   * Refinance breakeven card inputs. Omitted until the user edits the tool; then fully stored
   * with the scenario (local + Firestore).
   */
  refi?: RefiScenarioPersisted;
  /** Optional rent / OpEx growth (%/yr). Omitted until edited; 0 = flat baseline. */
  growth?: GrowthAssumptionsPersisted;
  /** Optional simplified tax modeling inputs. Omitted until enabled on Rental / Exit. */
  tax?: TaxAssumptionsPersisted;
  /** Optional pay cadence + lump-sum principal (Financing tab). Omitted until edited. */
  paymentPlan?: PaymentPlanPersisted;
  loan?: LoanScenarioPersisted;
  upfront?: UpfrontScenarioPersisted;
  earnestMoney?: number;
  sellerCredit?: number;
  lenderCredit?: number;
  rehabCashIn?: number;
  propertyState: string;
  propertyPostalCode: string;
  monthlyRent: number;
  otherMonthlyIncome: number;
  vacancyRatePercent: number;
  closingCosts: number;
  /** One-time cash at closing not in lender fees (repairs, moving, escrow top-up, etc.). Counts toward cash-on-cash denominator. */
  miscInitialCash: number;
  propertyMgmtPercent: number;
  maintenancePercent: number;
  capexPercent: number;
  /**
   * Rental pro-forma: optional exclusions from NOI / cash flow totals.
   * If `lineId`, `"pi"`, or `"pmi"` is `false`, that piece is omitted (default: all included).
   */
  rentalProFormaInclude?: Record<string, boolean>;
  /**
   * When to sell: optional exclusions from rental cash flow in total-gain math.
   * If `lineId` or `"pi"` is `false`, that piece is omitted from operating costs or P&amp;I (default: all included).
   */
  sellRentalYieldInclude?: Record<string, boolean>;
  /** When to sell: modeled annual appreciation on purchase price until exit (%). Derived from present value & years owned. */
  sellAnnualAppreciationPercent: number;
  /** When to sell: closing costs at sale as % of sale price. */
  sellClosingCostPercent: number;
  /** Estimated market value today (vs purchase price) — drives implied annual appreciation. */
  currentHomeValue: number;
  /** Whole years since purchase — used with present value to imply compound annual appreciation. */
  yearsOwned: number;
  /** Property street address (Places Autocomplete or manual entry). */
  propertyAddress: string;
  /** Google Place ID when selected via Autocomplete; empty when manual-only. */
  propertyPlaceId: string;
  /** WGS84 latitude from Places geometry, or null if unset / manual address. */
  propertyLatitude: number | null;
  /** WGS84 longitude from Places geometry, or null if unset / manual address. */
  propertyLongitude: number | null;
  /**
   * Optional USD overrides for modeled buyer-cost lines (`estimateHomeBuyingOneTimeCosts` line `id`s).
   * Omitted keys use the formula amount. Persisted with the scenario.
   */
  buyingCostLineOverrides?: Partial<Record<string, number>>;
  /** Optional max-offer targets (derived caps computed on read via offerMath). */
  offerTargets?: OfferTargetsPersisted;
  /** Optional rent-vs-buy assumptions (Exit tab decision tool). */
  rentVsBuy?: RentVsBuyAssumptionsPersisted;
  /** Optional stress-test deltas (% / points) applied to scenario copies. */
  stressTestDeltas?: StressTestDeltasPersisted;
  /** Optional rental income mode detail (multifamily / STR). Syncs into monthlyRent fields. */
  rentalIncome?: RentalIncomePersisted;
  /** Optional BRRRR / flip strategy inputs. Derived metrics are not persisted. */
  dealStrategy?: DealStrategyPersisted;
  /** Optional diligence: notes, links, comps, and document refs for this house scenario. */
  research?: ResearchPersisted;
};

/** @deprecated Use AppPersisted */
export type MortgagePersisted = AppPersisted;

/** Required persisted keys. Defaults and reset state must provide every one. */
export const REQUIRED_SCENARIO_KEYS = [
  "v",
  "homePrice",
  "downPayment",
  "downPaymentPercent",
  "interestRateApr",
  "termYears",
  "propertyTaxAnnual",
  "propertyTaxPercent",
  "insuranceAnnual",
  "hoaMonthly",
  "pmiMonthly",
  "extraPrincipalMonthly",
  "annualGrossIncome",
  "monthlyNonMortgageDebt",
  "propertyState",
  "propertyPostalCode",
  "monthlyRent",
  "otherMonthlyIncome",
  "vacancyRatePercent",
  "closingCosts",
  "miscInitialCash",
  "propertyMgmtPercent",
  "maintenancePercent",
  "capexPercent",
  "sellAnnualAppreciationPercent",
  "sellClosingCostPercent",
  "currentHomeValue",
  "yearsOwned",
  "propertyAddress",
  "propertyPlaceId",
  "propertyLatitude",
  "propertyLongitude",
] as const satisfies readonly (keyof AppPersisted)[];

/** Optional feature blocks and backward-compatible aliases. */
export const OPTIONAL_SCENARIO_KEYS = [
  "customHousingBudgetMonthly",
  "refi",
  "growth",
  "tax",
  "paymentPlan",
  "loan",
  "upfront",
  "earnestMoney",
  "sellerCredit",
  "lenderCredit",
  "rehabCashIn",
  "rentalProFormaInclude",
  "sellRentalYieldInclude",
  "buyingCostLineOverrides",
  "offerTargets",
  "rentVsBuy",
  "stressTestDeltas",
  "rentalIncome",
  "dealStrategy",
  "research",
] as const satisfies readonly (keyof AppPersisted)[];

/** Known persisted scenario keys — extras from newer clients are preserved on merge/parse. */
export const KNOWN_SCENARIO_KEYS = [
  ...REQUIRED_SCENARIO_KEYS,
  ...OPTIONAL_SCENARIO_KEYS,
] as const satisfies readonly (keyof AppPersisted)[];

const KNOWN_SCENARIO_KEY_SET = new Set<string>(KNOWN_SCENARIO_KEYS);

/** Copy unknown top-level keys from a parsed blob onto the normalized scenario. */
export function preserveUnknownScenarioFields(
  source: Record<string, unknown>,
  parsed: AppPersisted
): AppPersisted {
  const out: Record<string, unknown> = { ...parsed };
  for (const [k, v] of Object.entries(source)) {
    if (k === "v" || KNOWN_SCENARIO_KEY_SET.has(k)) continue;
    out[k] = v;
  }
  return out as AppPersisted;
}

/**
 * Shape of `scenario-defaults.json`. Omit `v` (always current schema) and `sellAnnualAppreciationPercent`
 * (derived from purchase price, present value, and years owned).
 */
export type ScenarioDefaultsFile = Omit<AppPersisted, "v" | "sellAnnualAppreciationPercent">;

/** Editable factory defaults — single source of truth is `src/defaults/scenario-defaults.json`. */
export const SCENARIO_DEFAULTS_JSON = scenarioDefaultsJson as ScenarioDefaultsFile;

export function defaultAppStateFromJson(d: ScenarioDefaultsFile): AppPersisted {
  const yearsOwned = Math.max(1, Math.round(d.yearsOwned));
  const sellAnnualAppreciationPercent = impliedAnnualAppreciationPercent(
    d.homePrice,
    d.currentHomeValue,
    yearsOwned
  );
  return {
    v: SCHEMA_VERSION,
    ...d,
    yearsOwned,
    sellAnnualAppreciationPercent,
  };
}

/** Factory sample scenario (new house / corrupt storage). Values come from `scenario-defaults.json`. */
export const defaultAppState = (): AppPersisted => defaultAppStateFromJson(SCENARIO_DEFAULTS_JSON);

/**
 * Cleared scenario for Reset — every editable field across all tabs set to zero / empty.
 * Does not use factory sample defaults.
 */
export function emptyAppState(): AppPersisted {
  return {
    v: SCHEMA_VERSION,
    homePrice: 0,
    downPayment: 0,
    downPaymentPercent: 0,
    interestRateApr: 0,
    termYears: 0,
    propertyTaxAnnual: 0,
    propertyTaxPercent: 0,
    insuranceAnnual: 0,
    hoaMonthly: 0,
    pmiMonthly: 0,
    extraPrincipalMonthly: 0,
    annualGrossIncome: 0,
    monthlyNonMortgageDebt: 0,
    monthlyRent: 0,
    otherMonthlyIncome: 0,
    vacancyRatePercent: 0,
    closingCosts: 0,
    miscInitialCash: 0,
    propertyMgmtPercent: 0,
    maintenancePercent: 0,
    capexPercent: 0,
    sellAnnualAppreciationPercent: 0,
    sellClosingCostPercent: 0,
    currentHomeValue: 0,
    yearsOwned: 0,
    propertyAddress: "",
    propertyPlaceId: "",
    propertyLatitude: null,
    propertyLongitude: null,
    propertyState: "",
    propertyPostalCode: "",
  };
}

/**
 * Merge parsed storage with current schema defaults so new fields (e.g. `pmiMonthly`) appear
 * when older localStorage JSON omitted them.
 */
export function mergeParsedWithSchemaDefaults(parsed: AppPersisted): AppPersisted {
  const merged: AppPersisted = {
    ...defaultAppState(),
    ...parsed,
    v: SCHEMA_VERSION,
  };
  const {
    buyingCostLineOverrides: rawLineOverrides,
    rentalProFormaInclude: rawPf,
    sellRentalYieldInclude: rawYield,
    refi: rawRefi,
    growth: rawGrowth,
    tax: rawTax,
    paymentPlan: rawPaymentPlan,
    loan: rawLoan,
    upfront: rawUpfront,
    offerTargets: rawOfferTargets,
    rentVsBuy: rawRentVsBuy,
    stressTestDeltas: rawStressDeltas,
    rentalIncome: rawRentalIncome,
    dealStrategy: rawDealStrategy,
    research: rawResearch,
    customHousingBudgetMonthly: rawBudget,
    ...mergedRest
  } = merged;
  const buyingCostLineOverrides = parseBuyingCostLineOverrides(rawLineOverrides);
  const rentalProFormaInclude = parseBooleanIncludeMap(rawPf);
  const sellRentalYieldInclude = parseBooleanIncludeMap(rawYield);
  const refi = parseRefiScenario(rawRefi);
  const growth = parseGrowthAssumptions(rawGrowth);
  const tax = parseTaxAssumptions(rawTax);
  const paymentPlan = parsePaymentPlan(rawPaymentPlan);
  const loan = parseLoanScenario(rawLoan);
  const upfront = parseUpfrontScenario(rawUpfront, mergedRest);
  const offerTargets = parseOfferTargets(rawOfferTargets);
  const rentVsBuy = parseRentVsBuyAssumptions(rawRentVsBuy);
  const stressTestDeltas = parseStressTestDeltas(rawStressDeltas);
  const rentalIncome = parseRentalIncome(rawRentalIncome);
  const dealStrategy = parseDealStrategy(rawDealStrategy);
  const research = parseResearchNotes(rawResearch);
  const customHousingBudgetMonthly = parseOptionalNonNegInt(rawBudget);
  const location = normalizePropertyLocation(merged, defaultAppState());
  const normalized: AppPersisted = {
    ...mergedRest,
    ...location,
    pmiMonthly: Math.max(0, Math.round(Number(merged.pmiMonthly) || 0)),
    extraPrincipalMonthly: Math.max(0, Math.round(Number(merged.extraPrincipalMonthly) || 0)),
    annualGrossIncome: Math.max(0, Math.round(Number(merged.annualGrossIncome) || 0)),
    monthlyNonMortgageDebt: Math.max(0, Math.round(Number(merged.monthlyNonMortgageDebt) || 0)),
    ...(buyingCostLineOverrides ? { buyingCostLineOverrides } : {}),
    ...(rentalProFormaInclude ? { rentalProFormaInclude } : {}),
    ...(sellRentalYieldInclude ? { sellRentalYieldInclude } : {}),
    ...(refi ? { refi } : {}),
    ...(growth ? { growth } : {}),
    ...(tax ? { tax } : {}),
    ...(paymentPlan ? { paymentPlan } : {}),
    ...(loan ? { loan } : {}),
    ...(upfront ? { upfront } : {}),
    ...(offerTargets ? { offerTargets } : {}),
    ...(rentVsBuy ? { rentVsBuy } : {}),
    ...(stressTestDeltas ? { stressTestDeltas } : {}),
    ...(rentalIncome ? { rentalIncome } : {}),
    ...(dealStrategy ? { dealStrategy } : {}),
    ...(research ? { research } : {}),
    ...(customHousingBudgetMonthly !== undefined ? { customHousingBudgetMonthly } : {}),
  };
  return preserveUnknownScenarioFields(parsed as Record<string, unknown>, normalized);
}

export const defaultMortgageState = defaultAppState;

function num(x: unknown, fallback: number): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

type MortgageCore = Pick<
  AppPersisted,
  | "homePrice"
  | "downPayment"
  | "interestRateApr"
  | "termYears"
  | "propertyTaxAnnual"
  | "insuranceAnnual"
  | "hoaMonthly"
  | "pmiMonthly"
  | "extraPrincipalMonthly"
  | "annualGrossIncome"
  | "monthlyNonMortgageDebt"
>;

function clampPct(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

function parseV1Mortgage(data: Record<string, unknown>): MortgageCore {
  const base = defaultAppState();
  return {
    homePrice: num(data.homePrice, base.homePrice),
    downPayment: num(data.downPayment, base.downPayment),
    interestRateApr: num(data.interestRateApr, base.interestRateApr),
    termYears: num(data.termYears, base.termYears),
    propertyTaxAnnual: num(data.propertyTaxAnnual, base.propertyTaxAnnual),
    insuranceAnnual: num(data.insuranceAnnual, base.insuranceAnnual),
    hoaMonthly: num(data.hoaMonthly, base.hoaMonthly),
    pmiMonthly: num(data.pmiMonthly, base.pmiMonthly),
    extraPrincipalMonthly: num(data.extraPrincipalMonthly, base.extraPrincipalMonthly),
    annualGrossIncome: num(data.annualGrossIncome, base.annualGrossIncome),
    monthlyNonMortgageDebt: num(data.monthlyNonMortgageDebt, base.monthlyNonMortgageDebt),
  };
}

/** Derive dollar down + percent from stored JSON (prefers `downPaymentPercent` when present). */
function normalizeDownPayment(
  m: MortgageCore,
  data: Record<string, unknown>,
  base: AppPersisted
): Pick<AppPersisted, "downPayment" | "downPaymentPercent"> {
  const hp = m.homePrice;
  if (hp <= 0) {
    return {
      downPayment: Math.max(0, m.downPayment),
      downPaymentPercent: clampPct(num(data.downPaymentPercent, base.downPaymentPercent)),
    };
  }
  if (data.downPaymentPercent !== undefined && data.downPaymentPercent !== null) {
    const pct = clampPct(num(data.downPaymentPercent, base.downPaymentPercent));
    return { downPaymentPercent: pct, downPayment: Math.round((hp * pct) / 100) };
  }
  const pct = clampPct((m.downPayment / hp) * 100);
  return { downPaymentPercent: pct, downPayment: Math.round((hp * pct) / 100) };
}

type MortgageAfterDown = MortgageCore & Pick<AppPersisted, "downPayment" | "downPaymentPercent">;

/** Derive annual tax + % of value from JSON (prefers `propertyTaxPercent` when present). */
function normalizePropertyTax(
  m: MortgageAfterDown,
  data: Record<string, unknown>,
  base: AppPersisted
): Pick<AppPersisted, "propertyTaxAnnual" | "propertyTaxPercent"> {
  const hp = m.homePrice;
  const annualRaw = m.propertyTaxAnnual;
  if (hp <= 0) {
    return {
      propertyTaxAnnual: Math.max(0, annualRaw),
      propertyTaxPercent: clampPct(num(data.propertyTaxPercent, base.propertyTaxPercent)),
    };
  }
  if (data.propertyTaxPercent !== undefined && data.propertyTaxPercent !== null) {
    const pct = clampPct(num(data.propertyTaxPercent, base.propertyTaxPercent));
    return { propertyTaxPercent: pct, propertyTaxAnnual: Math.round((hp * pct) / 100) };
  }
  const pct = clampPct((annualRaw / hp) * 100);
  return { propertyTaxPercent: pct, propertyTaxAnnual: Math.round((hp * pct) / 100) };
}

type RentalOnly = Pick<
  AppPersisted,
  | "monthlyRent"
  | "otherMonthlyIncome"
  | "vacancyRatePercent"
  | "closingCosts"
  | "miscInitialCash"
  | "propertyMgmtPercent"
  | "maintenancePercent"
  | "capexPercent"
>;

type PropertyLocation = Pick<
  AppPersisted,
  | "propertyAddress"
  | "propertyPlaceId"
  | "propertyLatitude"
  | "propertyLongitude"
  | "propertyState"
  | "propertyPostalCode"
>;

function strField(x: unknown, fallback: string): string {
  if (typeof x === "string") return x;
  if (x === null || x === undefined) return fallback;
  return String(x);
}

/** Finite number or null (legacy missing / invalid → fallback). */
function nullableCoord(x: unknown, fallback: number | null): number | null {
  if (x === null || x === undefined || x === "") return fallback;
  if (typeof x === "number" && Number.isFinite(x)) return x;
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePropertyLocation(
  data: Partial<PropertyLocation> | Record<string, unknown>,
  base: AppPersisted
): PropertyLocation {
  return {
    propertyAddress: strField(data.propertyAddress, base.propertyAddress),
    propertyPlaceId: strField(data.propertyPlaceId, base.propertyPlaceId),
    propertyLatitude: nullableCoord(data.propertyLatitude, base.propertyLatitude),
    propertyLongitude: nullableCoord(data.propertyLongitude, base.propertyLongitude),
    propertyState: normalizeStateCode(strField(data.propertyState, base.propertyState)),
    propertyPostalCode: normalizePostal(strField(data.propertyPostalCode, base.propertyPostalCode)),
  };
}

function parseBuyingCostLineOverrides(raw: unknown): Partial<Record<string, number>> | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Partial<Record<string, number>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== "string" || k.length === 0) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = Math.max(0, Math.round(n));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseBooleanIncludeMap(raw: unknown): Record<string, boolean> | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== "string" || k.length === 0) continue;
    if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseOptionalNonNegInt(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.max(0, Math.round(n));
  return rounded > 0 ? rounded : undefined;
}

function parseRefiScenario(raw: unknown): RefiScenarioPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const hasAny =
    o.balance !== undefined ||
    o.currentPi !== undefined ||
    o.newRateApr !== undefined ||
    o.newTermYears !== undefined ||
    o.closingCosts !== undefined ||
    o.loanYearEndPick !== undefined;
  if (!hasAny) return undefined;
  const termRaw = num(o.newTermYears, 30);
  const allowedTerms = [10, 15, 20, 25, 30];
  const newTermYears = allowedTerms.includes(termRaw) ? termRaw : 30;
  return {
    balance: Math.max(0, num(o.balance, 0)),
    currentPi: Math.max(0, num(o.currentPi, 0)),
    newRateApr: Math.max(0, num(o.newRateApr, 0)),
    newTermYears,
    closingCosts: Math.max(0, num(o.closingCosts, 0)),
    loanYearEndPick: Math.max(0, Math.round(num(o.loanYearEndPick, 0))),
  };
}

function growthPctField(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") {
      return clampPct(num(raw[k], 0));
    }
  }
  return undefined;
}

function parseGrowthAssumptions(raw: unknown): GrowthAssumptionsPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const rent = growthPctField(o, ["rentGrowthPercent", "rentGrowthPct"]);
  const expense = growthPctField(o, ["expenseGrowthPercent", "expenseGrowthPct"]);
  if (rent === undefined && expense === undefined) return undefined;
  const rentGrowthPercent = rent ?? 0;
  const expenseGrowthPercent = expense ?? 0;
  if (rentGrowthPercent <= 0 && expenseGrowthPercent <= 0) return undefined;
  return { rentGrowthPercent, expenseGrowthPercent };
}

function parseTax1031(raw: unknown): Tax1031AssumptionsPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const replacement = parseOptionalNonNegInt(o.replacementPropertyCost);
  const boot = parseOptionalNonNegInt(o.bootReceived);
  if (replacement === undefined && boot === undefined) return undefined;
  return {
    ...(replacement !== undefined ? { replacementPropertyCost: replacement } : {}),
    ...(boot !== undefined ? { bootReceived: boot } : {}),
  };
}

function parseTaxAssumptions(raw: unknown): TaxAssumptionsPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.enabled !== true) return undefined;
  const exchange1031 = parseTax1031(o.exchange1031);
  const landPercent = o.landPercent !== undefined ? clampPct(num(o.landPercent, 20)) : undefined;
  const improvementsBasis =
    o.improvementsBasis !== undefined ? Math.max(0, Math.round(num(o.improvementsBasis, 0))) : undefined;
  const taxableIncomeBeforeQbi =
    o.taxableIncomeBeforeQbi !== undefined
      ? Math.max(0, Math.round(num(o.taxableIncomeBeforeQbi, 0)))
      : undefined;
  const marginalIncomeTaxRatePercent =
    o.marginalIncomeTaxRatePercent !== undefined ? clampPct(num(o.marginalIncomeTaxRatePercent, 0)) : undefined;
  const capitalGainsRatePercent =
    o.capitalGainsRatePercent !== undefined ? clampPct(num(o.capitalGainsRatePercent, 15)) : undefined;
  const recaptureRatePercent =
    o.recaptureRatePercent !== undefined ? clampPct(num(o.recaptureRatePercent, 25)) : undefined;
  return {
    enabled: true,
    ...(landPercent !== undefined ? { landPercent } : {}),
    ...(improvementsBasis !== undefined && improvementsBasis > 0 ? { improvementsBasis } : {}),
    ...(o.qbiEligible === false ? { qbiEligible: false } : {}),
    ...(taxableIncomeBeforeQbi !== undefined && taxableIncomeBeforeQbi > 0
      ? { taxableIncomeBeforeQbi }
      : {}),
    ...(marginalIncomeTaxRatePercent !== undefined && marginalIncomeTaxRatePercent > 0
      ? { marginalIncomeTaxRatePercent }
      : {}),
    ...(capitalGainsRatePercent !== undefined ? { capitalGainsRatePercent } : {}),
    ...(recaptureRatePercent !== undefined ? { recaptureRatePercent } : {}),
    ...(o.isLongTerm === false ? { isLongTerm: false } : {}),
    ...(exchange1031 ? { exchange1031 } : {}),
  };
}

function parsePaymentPlan(raw: unknown): PaymentPlanPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const freqRaw = o.frequency;
  const frequency: PaymentPlanPersisted["frequency"] =
    freqRaw === "biweekly" ? "biweekly" : freqRaw === "monthly" ? "monthly" : "monthly";
  const lumpSums: PaymentPlanLumpSum[] = [];
  if (Array.isArray(o.lumpSums)) {
    for (const item of o.lumpSums) {
      if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const month = Math.max(1, Math.min(360, Math.round(num(row.month, 0))));
      const amount = Math.max(0, Math.round(num(row.amount, 0)));
      if (amount <= 0) continue;
      lumpSums.push({ month, amount });
    }
  }
  const hasBiweekly = frequency === "biweekly";
  const hasLumps = lumpSums.length > 0;
  const hasAny = hasBiweekly || hasLumps || o.frequency !== undefined || o.lumpSums !== undefined;
  if (!hasAny) return undefined;
  if (!hasBiweekly && !hasLumps && frequency === "monthly") return undefined;
  return { frequency, lumpSums };
}

const LOAN_PRODUCT_TYPES = new Set<LoanProductTypePersisted>(["conventional", "fha", "va", "usda"]);

function parseLoanArm(raw: unknown): LoanArmPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  return {
    initialFixedYears: Math.max(1, Math.min(10, Math.round(num(o.initialFixedYears, 5)))),
    margin: clampPct(num(o.margin, 2.25)),
    indexRate: clampPct(num(o.indexRate, 4)),
    periodicCap: clampPct(num(o.periodicCap, 2)),
    lifetimeCap: clampPct(num(o.lifetimeCap, 5)),
  };
}

function parseLoanScenario(raw: unknown): LoanScenarioPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const productRaw = typeof o.productType === "string" ? o.productType.toLowerCase() : "conventional";
  const productType = LOAN_PRODUCT_TYPES.has(productRaw as LoanProductTypePersisted) ? (productRaw as LoanProductTypePersisted) : "conventional";
  if (Object.keys(o).length === 0) return undefined;
  const out: LoanScenarioPersisted = { productType };
  if (o.noteApr !== undefined) out.noteApr = clampPct(num(o.noteApr, 0));
  if (o.termYears !== undefined) out.termYears = Math.max(1, Math.min(40, Math.round(num(o.termYears, 30))));
  if (o.rateType === "arm" || o.rateType === "fixed") out.rateType = o.rateType;
  const arm = parseLoanArm(o.arm);
  if (arm) out.arm = arm;
  if (o.pointsPercent !== undefined) out.pointsPercent = clampPct(num(o.pointsPercent, 0));
  if (o.buydown === "2-1" || o.buydown === "3-2-1" || o.buydown === "none") out.buydown = o.buydown;
  if (o.financeUpfrontFees === true) out.financeUpfrontFees = true;
  if (o.vaFirstUse === false) out.vaFirstUse = false;
  if (o.useScenarioPmi === true || o.useScenarioPmi === false) out.useScenarioPmi = o.useScenarioPmi;
  if (o.miMonthlyOverride !== undefined) out.miMonthlyOverride = Math.max(0, Math.round(num(o.miMonthlyOverride, 0)));
  if (productType === "conventional" && Object.keys(out).length === 1) return undefined;
  return out;
}

function parseUpfrontUsd(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.max(0, Math.round(n));
  return rounded > 0 ? rounded : undefined;
}

function parseUpfrontScenario(raw: unknown, legacy: Record<string, unknown>): UpfrontScenarioPersisted | undefined {
  const block = raw !== null && raw !== undefined && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const earnestMoney = parseUpfrontUsd(block.earnestMoney) ?? parseUpfrontUsd(legacy.earnestMoney);
  const sellerCredit = parseUpfrontUsd(block.sellerCredit) ?? parseUpfrontUsd(legacy.sellerCredit);
  const lenderCredit = parseUpfrontUsd(block.lenderCredit) ?? parseUpfrontUsd(legacy.lenderCredit);
  const rehabCashIn = parseUpfrontUsd(block.rehabCashIn) ?? parseUpfrontUsd(legacy.rehabCashIn);
  if (!earnestMoney && !sellerCredit && !lenderCredit && !rehabCashIn) return undefined;
  return {
    ...(earnestMoney ? { earnestMoney } : {}),
    ...(sellerCredit ? { sellerCredit } : {}),
    ...(lenderCredit ? { lenderCredit } : {}),
    ...(rehabCashIn ? { rehabCashIn } : {}),
  };
}

function parseOptionalPositiveNumber(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseOfferTargets(raw: unknown): OfferTargetsPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: OfferTargetsPersisted = {};
  const dscr = parseOptionalPositiveNumber(o.targetDscr);
  if (dscr !== undefined && dscr > 0) out.targetDscr = dscr;
  const cf = parseOptionalPositiveNumber(o.targetCashFlowMonthly);
  if (cf !== undefined) out.targetCashFlowMonthly = Math.round(cf);
  const coc = parseOptionalPositiveNumber(o.targetCashOnCashPercent);
  if (coc !== undefined && coc > 0) out.targetCashOnCashPercent = coc;
  const pmt = parseOptionalPositiveNumber(o.targetPaymentMonthly);
  if (pmt !== undefined && pmt > 0) out.targetPaymentMonthly = Math.round(pmt);
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseRentVsBuyAssumptions(raw: unknown): RentVsBuyAssumptionsPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: RentVsBuyAssumptionsPersisted = {};
  const rent = parseOptionalPositiveNumber(o.comparableRentMonthly);
  if (rent !== undefined) out.comparableRentMonthly = Math.round(rent);
  const ret = parseOptionalPositiveNumber(o.investmentReturnPercent);
  if (ret !== undefined) out.investmentReturnPercent = Math.min(30, ret);
  if (o.horizonYears !== undefined && o.horizonYears !== null) {
    const n = Number(o.horizonYears);
    if (Number.isFinite(n) && n > 0) out.horizonYears = Math.min(30, Math.max(1, Math.round(n)));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseStressTestDeltas(raw: unknown): StressTestDeltasPersisted | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: StressTestDeltasPersisted = {};
  const keys: (keyof StressTestDeltasPersisted)[] = [
    "rateDeltaPct",
    "rentDeltaPct",
    "vacancyDeltaPct",
    "appreciationDeltaPct",
    "expenseDeltaPct",
    "homePriceDeltaPct",
  ];
  for (const key of keys) {
    if (o[key] === undefined || o[key] === null) continue;
    const n = Number(o[key]);
    if (!Number.isFinite(n) || n === 0) continue;
    out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const RENTAL_INCOME_MODES = new Set<RentalIncomeMode>(["simple", "multifamily", "str"]);

function parseMultifamilyUnit(raw: unknown, index: number): MultifamilyUnitPersisted | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const idRaw = typeof o.id === "string" && o.id.length > 0 ? o.id : `unit-${index + 1}`;
  const monthlyRent = Math.max(0, Math.round(num(o.monthlyRent, 0)));
  const other = parseUpfrontUsd(o.otherMonthlyIncome);
  const vacancy =
    o.vacancyRatePercent !== undefined && o.vacancyRatePercent !== null && o.vacancyRatePercent !== ""
      ? clampPct(num(o.vacancyRatePercent, 0))
      : undefined;
  if (monthlyRent <= 0 && !other && vacancy === undefined) return null;
  return {
    id: idRaw,
    monthlyRent,
    ...(other ? { otherMonthlyIncome: other } : {}),
    ...(vacancy !== undefined ? { vacancyRatePercent: vacancy } : {}),
  };
}

function parseMultifamilyIncome(raw: unknown): MultifamilyIncomePersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const units: MultifamilyUnitPersisted[] = [];
  if (Array.isArray(o.units)) {
    o.units.forEach((item, index) => {
      const unit = parseMultifamilyUnit(item, index);
      if (unit) units.push(unit);
    });
  }
  if (units.length === 0) return undefined;
  const defaultVacancy =
    o.defaultVacancyRatePercent !== undefined && o.defaultVacancyRatePercent !== null
      ? clampPct(num(o.defaultVacancyRatePercent, 0))
      : undefined;
  return {
    units,
    ...(defaultVacancy !== undefined ? { defaultVacancyRatePercent: defaultVacancy } : {}),
  };
}

function parseStrIncome(raw: unknown): StrIncomePersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const hasAny =
    o.nightlyRate !== undefined ||
    o.nightsBookedPerMonth !== undefined ||
    o.cleaningFeePerStay !== undefined ||
    o.staysPerMonth !== undefined ||
    o.platformFeePercent !== undefined ||
    o.otherMonthlyIncome !== undefined ||
    o.vacancyRatePercent !== undefined;
  if (!hasAny) return undefined;
  return {
    nightlyRate: Math.max(0, num(o.nightlyRate, 0)),
    nightsBookedPerMonth: Math.max(0, Math.round(num(o.nightsBookedPerMonth, 20))),
    cleaningFeePerStay: Math.max(0, num(o.cleaningFeePerStay, 0)),
    staysPerMonth: Math.max(0, Math.round(num(o.staysPerMonth, 0))),
    ...(o.platformFeePercent !== undefined
      ? { platformFeePercent: clampPct(num(o.platformFeePercent, 3)) }
      : {}),
    ...(o.otherMonthlyIncome !== undefined
      ? { otherMonthlyIncome: Math.max(0, num(o.otherMonthlyIncome, 0)) }
      : {}),
    ...(o.vacancyRatePercent !== undefined
      ? { vacancyRatePercent: clampPct(num(o.vacancyRatePercent, 5)) }
      : {}),
  };
}

function parseRentalIncome(raw: unknown): RentalIncomePersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const modeRaw = typeof o.mode === "string" ? o.mode.toLowerCase() : "simple";
  const mode = RENTAL_INCOME_MODES.has(modeRaw as RentalIncomeMode) ? (modeRaw as RentalIncomeMode) : "simple";
  const multifamily = parseMultifamilyIncome(o.multifamily);
  const str = parseStrIncome(o.str);
  if (mode === "simple" && !multifamily && !str) return undefined;
  if (mode === "multifamily" && !multifamily) return undefined;
  if (mode === "str" && !str) return undefined;
  return {
    mode,
    ...(multifamily ? { multifamily } : {}),
    ...(str ? { str } : {}),
  };
}

function parseBrrrrStrategy(raw: unknown): BrrrrStrategyPersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const arv = parseUpfrontUsd(o.arv);
  const refiClosing = parseUpfrontUsd(o.refiClosingCosts);
  const holding = parseUpfrontUsd(o.holdingCostsDuringRehab);
  const refiLtv =
    o.refiLtvPercent !== undefined && o.refiLtvPercent !== null && o.refiLtvPercent !== ""
      ? clampPct(num(o.refiLtvPercent, 75))
      : undefined;
  if (!arv && !refiClosing && !holding && refiLtv === undefined) return undefined;
  return {
    ...(arv ? { arv } : {}),
    ...(refiLtv !== undefined ? { refiLtvPercent: refiLtv } : {}),
    ...(refiClosing ? { refiClosingCosts: refiClosing } : {}),
    ...(holding ? { holdingCostsDuringRehab: holding } : {}),
  };
}

function parseFlipStrategy(raw: unknown): FlipStrategyPersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const salePrice = parseUpfrontUsd(o.salePrice);
  const holding = parseUpfrontUsd(o.holdingCosts);
  const financing = parseUpfrontUsd(o.financingCosts);
  const loanPayoff = parseUpfrontUsd(o.loanPayoffAtSale);
  const sellingCostPercent =
    o.sellingCostPercent !== undefined && o.sellingCostPercent !== null && o.sellingCostPercent !== ""
      ? clampPct(num(o.sellingCostPercent, 6))
      : undefined;
  if (!salePrice && !holding && !financing && !loanPayoff && sellingCostPercent === undefined) return undefined;
  return {
    ...(salePrice ? { salePrice } : {}),
    ...(sellingCostPercent !== undefined ? { sellingCostPercent } : {}),
    ...(holding ? { holdingCosts: holding } : {}),
    ...(financing ? { financingCosts: financing } : {}),
    ...(loanPayoff ? { loanPayoffAtSale: loanPayoff } : {}),
  };
}

function parseDealStrategy(raw: unknown): DealStrategyPersisted | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const brrrr = parseBrrrrStrategy(o.brrrr);
  const flip = parseFlipStrategy(o.flip);
  if (!brrrr && !flip) return undefined;
  return {
    ...(brrrr ? { brrrr } : {}),
    ...(flip ? { flip } : {}),
  };
}

function parseRentalFields(data: Record<string, unknown>, base: AppPersisted): RentalOnly {
  return {
    monthlyRent: num(data.monthlyRent, base.monthlyRent),
    otherMonthlyIncome: num(data.otherMonthlyIncome, base.otherMonthlyIncome),
    vacancyRatePercent: num(data.vacancyRatePercent, base.vacancyRatePercent),
    closingCosts: num(data.closingCosts, base.closingCosts),
    miscInitialCash: num(data.miscInitialCash, base.miscInitialCash),
    propertyMgmtPercent: num(data.propertyMgmtPercent, base.propertyMgmtPercent),
    maintenancePercent: num(data.maintenancePercent, base.maintenancePercent),
    capexPercent: num(data.capexPercent, base.capexPercent),
  };
}

/** Parse known v2+ fields from JSON; does not reset on newer schema versions. */
function parseKnownScenarioFromData(data: Record<string, unknown>, base: AppPersisted): AppPersisted {
  const m0 = parseV1Mortgage(data);
  const d = normalizeDownPayment(m0, data, base);
  const m1 = { ...m0, ...d };
  const t = normalizePropertyTax(m1, data, base);
  const m = { ...m1, ...t };
  const r = parseRentalFields(data, base);
  const yearsOwned = Math.max(1, Math.round(num(data.yearsOwned, base.yearsOwned)));
  const sellAprStored = num(data.sellAnnualAppreciationPercent, base.sellAnnualAppreciationPercent);
  const hasExplicitPresent =
    data.currentHomeValue !== undefined &&
    data.currentHomeValue !== null &&
    data.currentHomeValue !== "" &&
    Number.isFinite(Number(data.currentHomeValue));
  const currentHomeValue = hasExplicitPresent
    ? Math.max(0, Number(data.currentHomeValue))
    : m.homePrice * (1 + sellAprStored / 100) ** yearsOwned;
  const sellAnnualAppreciationPercent = impliedAnnualAppreciationPercent(
    m.homePrice,
    currentHomeValue,
    yearsOwned
  );
  const buyingCostLineOverrides = parseBuyingCostLineOverrides(data.buyingCostLineOverrides);
  const rentalProFormaInclude = parseBooleanIncludeMap(data.rentalProFormaInclude);
  const y = parseBooleanIncludeMap(data.sellRentalYieldInclude);
  const refi = parseRefiScenario(data.refi);
  const growth = parseGrowthAssumptions(data.growth);
  const tax = parseTaxAssumptions(data.tax);
  const paymentPlan = parsePaymentPlan(data.paymentPlan);
  const loan = parseLoanScenario(data.loan);
  const upfront = parseUpfrontScenario(data.upfront, data);
  const offerTargets = parseOfferTargets(data.offerTargets);
  const rentVsBuy = parseRentVsBuyAssumptions(data.rentVsBuy);
  const stressTestDeltas = parseStressTestDeltas(data.stressTestDeltas);
  const rentalIncome = parseRentalIncome(data.rentalIncome);
  const dealStrategy = parseDealStrategy(data.dealStrategy);
  const research = parseResearchNotes(data.research);
  const customHousingBudgetMonthly = parseOptionalNonNegInt(data.customHousingBudgetMonthly);
  const loc = normalizePropertyLocation(data, base);
  return {
    v: SCHEMA_VERSION,
    ...m,
    ...r,
    ...loc,
    pmiMonthly: num(data.pmiMonthly, base.pmiMonthly),
    extraPrincipalMonthly: num(data.extraPrincipalMonthly, base.extraPrincipalMonthly),
    annualGrossIncome: num(data.annualGrossIncome, base.annualGrossIncome),
    monthlyNonMortgageDebt: num(data.monthlyNonMortgageDebt, base.monthlyNonMortgageDebt),
    yearsOwned,
    currentHomeValue,
    sellAnnualAppreciationPercent,
    sellClosingCostPercent: num(data.sellClosingCostPercent, base.sellClosingCostPercent),
    ...(rentalProFormaInclude ? { rentalProFormaInclude } : {}),
    ...(y !== undefined ? { sellRentalYieldInclude: y } : {}),
    ...(refi ? { refi } : {}),
    ...(growth ? { growth } : {}),
    ...(tax ? { tax } : {}),
    ...(paymentPlan ? { paymentPlan } : {}),
    ...(loan ? { loan } : {}),
    ...(upfront ? { upfront } : {}),
    ...(offerTargets ? { offerTargets } : {}),
    ...(rentVsBuy ? { rentVsBuy } : {}),
    ...(stressTestDeltas ? { stressTestDeltas } : {}),
    ...(rentalIncome ? { rentalIncome } : {}),
    ...(dealStrategy ? { dealStrategy } : {}),
    ...(research ? { research } : {}),
    ...(customHousingBudgetMonthly !== undefined ? { customHousingBudgetMonthly } : {}),
    ...(buyingCostLineOverrides ? { buyingCostLineOverrides } : {}),
  };
}

export function parseMortgageState(raw: string | null): AppPersisted {
  if (!raw) return defaultAppState();
  try {
    const data = JSON.parse(raw) as Record<string, unknown> & { v?: unknown };
    const base = defaultAppState();
    const version = typeof data.v === "number" ? data.v : SCHEMA_VERSION;

    if (version === SCHEMA_VERSION_LEGACY) {
      const m0 = parseV1Mortgage(data);
      const d = normalizeDownPayment(m0, data, base);
      const m1 = { ...m0, ...d };
      const t = normalizePropertyTax(m1, data, base);
      const m = { ...m1, ...t };
      const loc = normalizePropertyLocation(data, base);
      const merged: AppPersisted = {
        ...base,
        ...m,
        ...parseRentalFields({}, base),
        ...loc,
        v: SCHEMA_VERSION,
      };
      const yearsOwned = Math.max(1, Math.round(merged.yearsOwned));
      const apr = merged.sellAnnualAppreciationPercent;
      const currentHomeValue = merged.homePrice * (1 + apr / 100) ** yearsOwned;
      const migrated = {
        ...merged,
        yearsOwned,
        currentHomeValue,
        sellAnnualAppreciationPercent: impliedAnnualAppreciationPercent(
          merged.homePrice,
          currentHomeValue,
          yearsOwned
        ),
      };
      return preserveUnknownScenarioFields(data, migrated);
    }

    // Future numeric schema versions: parse known fields; never silently reset to factory defaults.
    if (typeof version !== "number" || version < SCHEMA_VERSION) {
      return defaultAppState();
    }

    const parsed = parseKnownScenarioFromData(data, base);
    return preserveUnknownScenarioFields(data, parsed);
  } catch {
    return defaultAppState();
  }
}

export function serializeMortgageState(state: AppPersisted): string {
  return JSON.stringify({ ...state, v: SCHEMA_VERSION });
}

