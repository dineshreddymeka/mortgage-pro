import {
  KNOWN_SCENARIO_KEYS,
  REQUIRED_SCENARIO_KEYS,
  SCHEMA_VERSION,
  defaultAppState,
  parseMortgageState,
  type AppPersisted,
} from "../storage/mortgageState";
import { buildFullScenarioExport } from "./scenarioExport";

export type DifferenceKind = "missing" | "changed" | "extra";

export type DataDifference = {
  kind: DifferenceKind;
  path: string;
  expected?: unknown;
  actual?: unknown;
};

export type DerivedNormalizationPair = {
  name: string;
  paths: readonly string[];
};

/**
 * Fields intentionally normalized as a group by the parser. A change within one of
 * these groups is documented normalization, not export loss.
 */
export const DERIVED_NORMALIZATION_PAIRS: readonly DerivedNormalizationPair[] = [
  {
    name: "down payment amount ↔ percent",
    paths: ["homePrice", "downPayment", "downPaymentPercent"],
  },
  {
    name: "property tax annual amount ↔ percent",
    paths: ["homePrice", "propertyTaxAnnual", "propertyTaxPercent"],
  },
  {
    name: "present value ↔ annual appreciation",
    paths: [
      "homePrice",
      "currentHomeValue",
      "yearsOwned",
      "sellAnnualAppreciationPercent",
    ],
  },
] as const;

/** Kept executable so the UI and inventory synchronization test use the same contract. */
export const DOCUMENTED_SCENARIO_KEYS = [...KNOWN_SCENARIO_KEYS] as const;

export type ScenarioRoundTripResult = {
  ok: boolean;
  missingPaths: string[];
  changedPaths: string[];
  extraPaths: string[];
  differences: DataDifference[];
  toleratedNormalizations: Array<{ pair: string; paths: string[] }>;
  error?: string;
};

export type InvalidScenarioValue = {
  path: string;
  message: string;
  value?: unknown;
};

export type DuplicateAlias = {
  canonicalPath: string;
  aliasPath: string;
  status: "duplicate" | "conflict";
};

export type DataVerificationReport = {
  ok: boolean;
  singleSourceOfTruth: {
    ok: boolean;
    message: string;
  };
  scenarioVersion: {
    found: number | null;
    current: number;
    status: "current" | "legacy" | "future" | "invalid";
  };
  documentedFieldCoverage: {
    documented: number;
    known: number;
    missing: string[];
  };
  invalidValues: InvalidScenarioValue[];
  duplicateAliases: DuplicateAlias[];
  duplicateCategoryMaps: string[];
  exportRoundTrip: ScenarioRoundTripResult;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function childPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

function indexPath(parent: string, index: number): string {
  return `${parent}[${index}]`;
}

/** Deep structural comparison with stable, actionable property paths. */
export function compareDataDeep(expected: unknown, actual: unknown, path = ""): DataDifference[] {
  if (Object.is(expected, actual)) return [];

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const differences: DataDifference[] = [];
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      const nextPath = indexPath(path, index);
      if (index >= actual.length) {
        differences.push({ kind: "missing", path: nextPath, expected: expected[index] });
      } else if (index >= expected.length) {
        differences.push({ kind: "extra", path: nextPath, actual: actual[index] });
      } else {
        differences.push(...compareDataDeep(expected[index], actual[index], nextPath));
      }
    }
    return differences;
  }

  if (isPlainObject(expected) && isPlainObject(actual)) {
    const differences: DataDifference[] = [];
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      const nextPath = childPath(path, key);
      if (!hasOwn(actual, key)) {
        differences.push({ kind: "missing", path: nextPath, expected: expected[key] });
      } else if (!hasOwn(expected, key)) {
        differences.push({ kind: "extra", path: nextPath, actual: actual[key] });
      } else {
        differences.push(...compareDataDeep(expected[key], actual[key], nextPath));
      }
    }
    return differences;
  }

  return [{ kind: "changed", path: path || "$", expected, actual }];
}

function normalizeScenario(source: Record<string, unknown>): AppPersisted {
  try {
    return parseMortgageState(JSON.stringify(source));
  } catch {
    return defaultAppState();
  }
}

/**
 * Import the scenario portion of a full JSON export. The canonical house.scenario
 * path wins; the top-level scenario path remains a backward-compatible export alias.
 */
export function importScenarioFromFullExport(exportDocument: unknown): AppPersisted {
  if (!isPlainObject(exportDocument)) {
    throw new Error("Export document must be an object.");
  }
  const house = isPlainObject(exportDocument.house) ? exportDocument.house : null;
  const source = house && isPlainObject(house.scenario)
    ? house.scenario
    : isPlainObject(exportDocument.scenario)
      ? exportDocument.scenario
      : null;
  if (!source) {
    throw new Error("Export document does not contain house.scenario or scenario.");
  }
  return normalizeScenario(source);
}

function pathIsInPair(path: string, pair: DerivedNormalizationPair): boolean {
  return pair.paths.some(
    (candidate) =>
      path === candidate || path.startsWith(`${candidate}.`) || path.startsWith(`${candidate}[`)
  );
}

function findToleratedNormalizations(
  source: Record<string, unknown>,
  normalized: AppPersisted
): Array<{ pair: string; paths: string[] }> {
  const differences = compareDataDeep(source, normalized);
  const tolerated: Array<{ pair: string; paths: string[] }> = [];
  for (const pair of DERIVED_NORMALIZATION_PAIRS) {
    const paths = differences.filter((difference) => pathIsInPair(difference.path, pair)).map((d) => d.path);
    if (paths.length > 0) tolerated.push({ pair: pair.name, paths: [...new Set(paths)] });
  }
  if (differences.some((difference) => difference.path === "v")) {
    tolerated.push({ pair: "schema version migration", paths: ["v"] });
  }
  return tolerated;
}

/**
 * Verify a generated export can be imported and normalized without losing any
 * known field, nested value, or preserved future-version extra.
 */
export function verifyScenarioRoundTrip(
  state: AppPersisted | Record<string, unknown>
): ScenarioRoundTripResult {
  const source = state as Record<string, unknown>;
  const normalized = normalizeScenario(source);
  const toleratedNormalizations = findToleratedNormalizations(source, normalized);
  try {
    const exported = buildFullScenarioExport(normalized);
    const imported = importScenarioFromFullExport(exported);
    const differences = compareDataDeep(normalized, imported);
    return {
      ok: differences.length === 0,
      missingPaths: differences.filter((d) => d.kind === "missing").map((d) => d.path),
      changedPaths: differences.filter((d) => d.kind === "changed").map((d) => d.path),
      extraPaths: differences.filter((d) => d.kind === "extra").map((d) => d.path),
      differences,
      toleratedNormalizations,
    };
  } catch (error) {
    return {
      ok: false,
      missingPaths: [],
      changedPaths: [],
      extraPaths: [],
      differences: [],
      toleratedNormalizations,
      error: error instanceof Error ? error.message : "Unknown export round-trip failure.",
    };
  }
}

const REQUIRED_STRING_PATHS = [
  "propertyState",
  "propertyPostalCode",
  "propertyAddress",
  "propertyPlaceId",
] as const;

const COORDINATE_LIMITS = {
  propertyLatitude: [-90, 90],
  propertyLongitude: [-180, 180],
} as const;

function collectPrimitiveProblems(
  value: unknown,
  path: string,
  output: InvalidScenarioValue[]
): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    output.push({ path, message: "Must be a finite number.", value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPrimitiveProblems(item, indexPath(path, index), output));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectPrimitiveProblems(child, childPath(path, key), output);
    }
  }
}

function collectInvalidValues(source: Record<string, unknown>): InvalidScenarioValue[] {
  const invalid: InvalidScenarioValue[] = [];
  const add = (path: string, message: string, value?: unknown) => {
    invalid.push({ path, message, value });
  };
  for (const key of REQUIRED_SCENARIO_KEYS) {
    if (!hasOwn(source, key)) {
      invalid.push({ path: key, message: "Required scenario field is missing." });
    }
  }

  const reference = defaultAppState() as Record<string, unknown>;
  for (const key of REQUIRED_SCENARIO_KEYS) {
    if (!hasOwn(source, key) || key === "v") continue;
    const expected = reference[key];
    const value = source[key];
    if (typeof expected === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        invalid.push({ path: key, message: "Must be a finite number.", value });
      } else if (
        key !== "sellAnnualAppreciationPercent" &&
        key !== "propertyLatitude" &&
        key !== "propertyLongitude" &&
        value < 0
      ) {
        invalid.push({ path: key, message: "Must not be negative.", value });
      }
    }
  }

  for (const key of REQUIRED_STRING_PATHS) {
    if (hasOwn(source, key) && typeof source[key] !== "string") {
      invalid.push({ path: key, message: "Must be a string.", value: source[key] });
    }
  }

  for (const [key, [minimum, maximum]] of Object.entries(COORDINATE_LIMITS)) {
    const value = source[key];
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum)) {
      invalid.push({ path: key, message: `Must be null or between ${minimum} and ${maximum}.`, value });
    }
  }

  if (source.paymentPlan !== undefined && isPlainObject(source.paymentPlan)) {
    const plan = source.paymentPlan;
    if (plan.frequency !== "monthly" && plan.frequency !== "biweekly") {
      add("paymentPlan.frequency", "Must be monthly or biweekly.", plan.frequency);
    }
    if (!Array.isArray(plan.lumpSums)) {
      add("paymentPlan.lumpSums", "Must be an array.", plan.lumpSums);
    } else {
      plan.lumpSums.forEach((row, index) => {
        const path = `paymentPlan.lumpSums[${index}]`;
        if (!isPlainObject(row)) {
          add(path, "Must be an object.", row);
          return;
        }
        if (typeof row.month !== "number" || !Number.isFinite(row.month) || row.month < 1) {
          add(`${path}.month`, "Must be a positive finite month.", row.month);
        }
        if (typeof row.amount !== "number" || !Number.isFinite(row.amount) || row.amount <= 0) {
          add(`${path}.amount`, "Must be a positive finite amount.", row.amount);
        }
      });
    }
  }

  if (source.loan !== undefined && isPlainObject(source.loan)) {
    const loan = source.loan;
    if (
      typeof loan.productType !== "string" ||
      !["conventional", "fha", "va", "usda"].includes(loan.productType)
    ) {
      add("loan.productType", "Must be a supported loan product.", loan.productType);
    }
    if (loan.arm !== undefined && !isPlainObject(loan.arm)) {
      add("loan.arm", "Must be an object.", loan.arm);
    }
  }

  if (source.rentalIncome !== undefined && isPlainObject(source.rentalIncome)) {
    const multifamily = source.rentalIncome.multifamily;
    if (multifamily !== undefined && isPlainObject(multifamily)) {
      if (!Array.isArray(multifamily.units)) {
        add("rentalIncome.multifamily.units", "Must be an array.", multifamily.units);
      } else {
        multifamily.units.forEach((unit, index) => {
          const path = `rentalIncome.multifamily.units[${index}]`;
          if (!isPlainObject(unit)) {
            add(path, "Must be an object.", unit);
            return;
          }
          if (typeof unit.monthlyRent !== "number" || !Number.isFinite(unit.monthlyRent)) {
            add(`${path}.monthlyRent`, "Must be a finite number.", unit.monthlyRent);
          }
        });
      }
    }
  }

  if (source.dealStrategy !== undefined && isPlainObject(source.dealStrategy)) {
    const strategy = source.dealStrategy;
    for (const name of ["brrrr", "flip"] as const) {
      if (strategy[name] !== undefined && !isPlainObject(strategy[name])) {
        add(`dealStrategy.${name}`, "Must be an object.", strategy[name]);
      }
    }
    if (isPlainObject(strategy.flip) && strategy.flip.salePrice !== undefined) {
      const salePrice = strategy.flip.salePrice;
      if (typeof salePrice !== "number" || !Number.isFinite(salePrice) || salePrice < 0) {
        add("dealStrategy.flip.salePrice", "Must be a non-negative finite number.", salePrice);
      }
    }
  }

  const normalized = normalizeScenario(source) as Record<string, unknown>;
  const normalizationDifferences = compareDataDeep(source, normalized);
  for (const difference of normalizationDifferences) {
    const tolerated =
      difference.path === "v" ||
      DERIVED_NORMALIZATION_PAIRS.some((pair) => pathIsInPair(difference.path, pair));
    const alreadyReported = invalid.some((item) => item.path === difference.path);
    if (!tolerated && !alreadyReported) {
      invalid.push({
        path: difference.path,
        message:
          difference.kind === "missing"
            ? "Value is not accepted by the scenario parser."
            : difference.kind === "extra"
              ? "Parser supplied a required/default value."
              : "Parser would normalize this value.",
        value: difference.kind === "extra" ? difference.actual : difference.expected,
      });
    }
  }

  collectPrimitiveProblems(source, "", invalid);
  const unique = new Map<string, InvalidScenarioValue>();
  for (const item of invalid) {
    const key = `${item.path}\u0000${item.message}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

const UPFRONT_ALIASES = ["earnestMoney", "sellerCredit", "lenderCredit", "rehabCashIn"] as const;
const LEGACY_CATEGORY_NAMES = ["property", "financing", "upfront", "rental", "exit"] as const;

function findDuplicateAliases(source: Record<string, unknown>): DuplicateAlias[] {
  if (!isPlainObject(source.upfront)) return [];
  const duplicates: DuplicateAlias[] = [];
  for (const alias of UPFRONT_ALIASES) {
    if (!hasOwn(source, alias) || !hasOwn(source.upfront, alias)) continue;
    duplicates.push({
      canonicalPath: `upfront.${alias}`,
      aliasPath: alias,
      status: Object.is(source.upfront[alias], source[alias]) ? "duplicate" : "conflict",
    });
  }
  return duplicates;
}

function findCategoryMaps(
  scenario: Record<string, unknown>,
  sourceDocument?: Record<string, unknown>
): string[] {
  const paths: string[] = [];
  for (const name of LEGACY_CATEGORY_NAMES) {
    if (name !== "upfront" && isPlainObject(scenario[name])) paths.push(`scenario.${name}`);
    if (sourceDocument && isPlainObject(sourceDocument[name])) paths.push(name);
  }
  return [...new Set(paths)].sort();
}

export function buildDataVerificationReport(
  state: AppPersisted | Record<string, unknown>,
  sourceDocument?: Record<string, unknown>
): DataVerificationReport {
  const source = state as Record<string, unknown>;
  const duplicateAliases = findDuplicateAliases(source);
  const duplicateCategoryMaps = findCategoryMaps(source, sourceDocument);
  const invalidValues = collectInvalidValues(source);
  const exportRoundTrip = verifyScenarioRoundTrip(source);
  const foundVersion =
    typeof source.v === "number" && Number.isFinite(source.v) ? source.v : null;
  const versionStatus =
    foundVersion === null
      ? "invalid"
      : foundVersion === SCHEMA_VERSION
        ? "current"
        : foundVersion < SCHEMA_VERSION
          ? "legacy"
          : "future";
  const documented = new Set<string>(DOCUMENTED_SCENARIO_KEYS);
  const undocumented = KNOWN_SCENARIO_KEYS.filter((key) => !documented.has(key));
  const sourceHasCanonicalScenario = !sourceDocument || isPlainObject(sourceDocument.scenario);
  const singleSourceOk =
    sourceHasCanonicalScenario && duplicateAliases.length === 0 && duplicateCategoryMaps.length === 0;
  const ok =
    singleSourceOk &&
    versionStatus === "current" &&
    undocumented.length === 0 &&
    invalidValues.length === 0 &&
    exportRoundTrip.ok;

  return {
    ok,
    singleSourceOfTruth: {
      ok: singleSourceOk,
      message: singleSourceOk
        ? "One canonical scenario object; no competing aliases or category maps."
        : "Competing aliases, category maps, or a missing canonical scenario were found.",
    },
    scenarioVersion: {
      found: foundVersion,
      current: SCHEMA_VERSION,
      status: versionStatus,
    },
    documentedFieldCoverage: {
      documented: KNOWN_SCENARIO_KEYS.length - undocumented.length,
      known: KNOWN_SCENARIO_KEYS.length,
      missing: undocumented,
    },
    invalidValues,
    duplicateAliases,
    duplicateCategoryMaps,
    exportRoundTrip,
  };
}
