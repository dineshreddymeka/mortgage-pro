/**
 * House is the root persistence node, identified by business `id` (`001`, `002`, …).
 * Category UI tabs map to child nodes under that id.
 *
 * Shape:
 *   { id: "001", name, property, financing, upfront, rental, exit }
 *
 * Firestore keeps an internal doc path for multi-user uniqueness; the house root
 * field `id` (and `houseId`) is the stable business id users see.
 *
 * In-app editing still uses flat `AppPersisted`; pack/unpack at the storage boundary.
 */
import {
  defaultAppState,
  mergeParsedWithSchemaDefaults,
  type AppPersisted,
  type RefiScenarioPersisted,
} from "./mortgageState";

export const HOUSE_TREE_VERSION = 3 as const;

export type HousePropertyNode = {
  propertyAddress: string;
  propertyPlaceId: string;
  propertyLatitude: number | null;
  propertyLongitude: number | null;
};

export type HouseFinancingNode = {
  homePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  interestRateApr: number;
  termYears: number;
  propertyTaxAnnual: number;
  propertyTaxPercent: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiMonthly: number;
  extraPrincipalMonthly: number;
  annualGrossIncome: number;
  monthlyNonMortgageDebt: number;
  customHousingBudgetMonthly?: number;
  refi?: RefiScenarioPersisted;
};

export type HouseUpfrontNode = {
  closingCosts: number;
  miscInitialCash: number;
  buyingCostLineOverrides?: Partial<Record<string, number>>;
};

export type HouseRentalNode = {
  monthlyRent: number;
  otherMonthlyIncome: number;
  vacancyRatePercent: number;
  propertyMgmtPercent: number;
  maintenancePercent: number;
  capexPercent: number;
  rentalProFormaInclude?: Record<string, boolean>;
};

export type HouseExitNode = {
  sellAnnualAppreciationPercent: number;
  sellClosingCostPercent: number;
  currentHomeValue: number;
  yearsOwned: number;
  sellRentalYieldInclude?: Record<string, boolean>;
};

/** Category children under a house root (matches Property · Financing · Upfront · Rental · Exit). */
export type HouseCategoryTree = {
  property: HousePropertyNode;
  financing: HouseFinancingNode;
  upfront: HouseUpfrontNode;
  rental: HouseRentalNode;
  exit: HouseExitNode;
};

/** Full house-rooted payload — `id` is the root key (`001`, `002`, …). */
export type HouseRootExport = {
  /** Business house id — root identity (e.g. `"001"`). */
  id: string;
  v: typeof HOUSE_TREE_VERSION;
  houseNumber?: number;
  name?: string;
} & HouseCategoryTree;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/** True when the Firestore house doc already has category child nodes. */
export function hasHouseCategoryNodes(data: Record<string, unknown>): boolean {
  return (
    isPlainObject(data.property) ||
    isPlainObject(data.financing) ||
    isPlainObject(data.upfront) ||
    isPlainObject(data.rental) ||
    isPlainObject(data.exit)
  );
}

/** Split flat scenario fields into house → category child nodes. */
export function packHouseCategories(state: AppPersisted): HouseCategoryTree {
  return {
    property: {
      propertyAddress: state.propertyAddress,
      propertyPlaceId: state.propertyPlaceId,
      propertyLatitude: state.propertyLatitude,
      propertyLongitude: state.propertyLongitude,
    },
    financing: omitUndefined({
      homePrice: state.homePrice,
      downPayment: state.downPayment,
      downPaymentPercent: state.downPaymentPercent,
      interestRateApr: state.interestRateApr,
      termYears: state.termYears,
      propertyTaxAnnual: state.propertyTaxAnnual,
      propertyTaxPercent: state.propertyTaxPercent,
      insuranceAnnual: state.insuranceAnnual,
      hoaMonthly: state.hoaMonthly,
      pmiMonthly: state.pmiMonthly,
      extraPrincipalMonthly: state.extraPrincipalMonthly,
      annualGrossIncome: state.annualGrossIncome,
      monthlyNonMortgageDebt: state.monthlyNonMortgageDebt,
      customHousingBudgetMonthly: state.customHousingBudgetMonthly,
      refi: state.refi,
    }) as HouseFinancingNode,
    upfront: omitUndefined({
      closingCosts: state.closingCosts,
      miscInitialCash: state.miscInitialCash,
      buyingCostLineOverrides: state.buyingCostLineOverrides,
    }) as HouseUpfrontNode,
    rental: omitUndefined({
      monthlyRent: state.monthlyRent,
      otherMonthlyIncome: state.otherMonthlyIncome,
      vacancyRatePercent: state.vacancyRatePercent,
      propertyMgmtPercent: state.propertyMgmtPercent,
      maintenancePercent: state.maintenancePercent,
      capexPercent: state.capexPercent,
      rentalProFormaInclude: state.rentalProFormaInclude,
    }) as HouseRentalNode,
    exit: omitUndefined({
      sellAnnualAppreciationPercent: state.sellAnnualAppreciationPercent,
      sellClosingCostPercent: state.sellClosingCostPercent,
      currentHomeValue: state.currentHomeValue,
      yearsOwned: state.yearsOwned,
      sellRentalYieldInclude: state.sellRentalYieldInclude,
    }) as HouseExitNode,
  };
}

/** Flatten category nodes back to in-app `AppPersisted`. */
export function unpackHouseCategories(tree: Partial<HouseCategoryTree> | Record<string, unknown>): AppPersisted {
  const property = isPlainObject(tree.property) ? tree.property : {};
  const financing = isPlainObject(tree.financing) ? tree.financing : {};
  const upfront = isPlainObject(tree.upfront) ? tree.upfront : {};
  const rental = isPlainObject(tree.rental) ? tree.rental : {};
  const exit = isPlainObject(tree.exit) ? tree.exit : {};

  return mergeParsedWithSchemaDefaults({
    ...defaultAppState(),
    ...property,
    ...financing,
    ...upfront,
    ...rental,
    ...exit,
  } as AppPersisted);
}

/**
 * Resolve tab data from a house document.
 * Prefers category child nodes; falls back to legacy flat `scenario` blob.
 */
export function resolveScenarioFromHouseDoc(data: Record<string, unknown>): AppPersisted | null {
  if (hasHouseCategoryNodes(data)) {
    return unpackHouseCategories(data);
  }
  if (isPlainObject(data.scenario)) {
    return mergeParsedWithSchemaDefaults(data.scenario as AppPersisted);
  }
  return null;
}

/** House-rooted object keyed by business `id` (`001`…), with category children. */
export function buildHouseRoot(
  state: AppPersisted,
  meta?: {
    /** Business house id (`001`). Required for a proper root; falls back to `"000"`. */
    id?: string;
    houseId?: string;
    houseNumber?: number;
    name?: string;
  }
): HouseRootExport {
  const id = (meta?.id ?? meta?.houseId ?? "").trim() || "000";
  return {
    id,
    v: HOUSE_TREE_VERSION,
    ...(meta?.houseNumber !== undefined ? { houseNumber: meta.houseNumber } : {}),
    ...(meta?.name ? { name: meta.name } : {}),
    ...packHouseCategories(state),
  };
}
