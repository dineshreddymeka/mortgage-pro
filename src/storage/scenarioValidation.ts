import {
  KNOWN_SCENARIO_KEYS,
  SCHEMA_VERSION,
  SCHEMA_VERSION_LEGACY,
  parseMortgageState,
  type AppPersisted,
} from "./mortgageState";
import {
  EXTERNAL_TAX_RESEARCH_LINK_STATUSES,
  EXTERNAL_TAX_RESEARCH_STATUSES,
  TAX_ISSUE_TOPICS,
} from "./researchNotes";
import {
  HOUSE_TREE_VERSION,
  hasHouseCategoryNodes,
  resolveScenarioFromHouseDoc,
} from "./houseTree";

export type ScenarioInputKind =
  | "raw-scenario"
  | "full-export"
  | "scenario-envelope"
  | "house-root"
  | "legacy-categories"
  | "unknown";

export type ScenarioIssueSeverity = "error" | "warning";
export type ScenarioIssueRepairability = "automatic" | "manual" | "not-applicable";

/**
 * A stable, UI-agnostic problem description. `path` is a canonical dotted path rooted at
 * `scenario` (or at envelope metadata such as `house.id`), so callers can render or group
 * issues without persisting validation state beside the scenario.
 */
export type ScenarioValidationIssue = {
  severity: ScenarioIssueSeverity;
  code: string;
  path: string;
  message: string;
  repairability: ScenarioIssueRepairability;
};

/**
 * Validation never throws for user data. A candidate is returned only when every ambiguity
 * can be repaired deterministically by the existing mortgage-state/house-tree migration path.
 */
export type ScenarioValidationResult = {
  inputKind: ScenarioInputKind;
  valid: boolean;
  issues: ScenarioValidationIssue[];
  houseId?: string;
  repairedScenario?: AppPersisted;
};

type PlainObject = Record<string, unknown>;

type ExtractedInput = {
  inputKind: Exclude<ScenarioInputKind, "unknown">;
  scenario: PlainObject;
  root?: PlainObject;
  rootPath?: string;
  duplicateScenario?: unknown;
};

type FutureFieldRule = true | "dynamic-map" | FutureFieldShape | readonly [FutureFieldShape];
interface FutureFieldShape {
  [key: string]: FutureFieldRule;
}

const futureShape = (keys: readonly string[]): FutureFieldShape =>
  Object.fromEntries(keys.map((key) => [key, true])) as FutureFieldShape;

const MONEY_MAP_RULE: FutureFieldRule = "dynamic-map";
const LUMP_SUM_SHAPE = futureShape(["month", "amount"]);
const UNIT_SHAPE = futureShape([
  "id",
  "monthlyRent",
  "otherMonthlyIncome",
  "vacancyRatePercent",
]);
const ARM_SHAPE = futureShape([
  "initialFixedYears",
  "margin",
  "indexRate",
  "periodicCap",
  "lifetimeCap",
]);
const STR_SHAPE = futureShape([
  "nightlyRate",
  "nightsBookedPerMonth",
  "cleaningFeePerStay",
  "staysPerMonth",
  "platformFeePercent",
  "otherMonthlyIncome",
  "vacancyRatePercent",
]);

const SCENARIO_FUTURE_SHAPE = futureShape(KNOWN_SCENARIO_KEYS);
Object.assign(SCENARIO_FUTURE_SHAPE, {
  buyingCostLineOverrides: MONEY_MAP_RULE,
  rentalProFormaInclude: MONEY_MAP_RULE,
  sellRentalYieldInclude: MONEY_MAP_RULE,
  refi: futureShape([
    "balance",
    "currentPi",
    "newRateApr",
    "newTermYears",
    "closingCosts",
    "loanYearEndPick",
  ]),
  growth: futureShape([
    "rentGrowthPercent",
    "expenseGrowthPercent",
    "rentGrowthPct",
    "expenseGrowthPct",
  ]),
  tax: {
    ...futureShape([
      "enabled",
      "landPercent",
      "improvementsBasis",
      "qbiEligible",
      "taxableIncomeBeforeQbi",
      "marginalIncomeTaxRatePercent",
      "capitalGainsRatePercent",
      "recaptureRatePercent",
      "isLongTerm",
    ]),
    exchange1031: futureShape(["replacementPropertyCost", "bootReceived"]),
  },
  paymentPlan: {
    frequency: true,
    lumpSums: [LUMP_SUM_SHAPE],
  },
  loan: {
    ...futureShape([
      "productType",
      "noteApr",
      "termYears",
      "rateType",
      "pointsPercent",
      "buydown",
      "financeUpfrontFees",
      "vaFirstUse",
      "useScenarioPmi",
      "miMonthlyOverride",
    ]),
    arm: ARM_SHAPE,
  },
  upfront: futureShape(["earnestMoney", "sellerCredit", "lenderCredit", "rehabCashIn"]),
  offerTargets: futureShape([
    "targetDscr",
    "targetCashFlowMonthly",
    "targetCashOnCashPercent",
    "targetPaymentMonthly",
  ]),
  rentVsBuy: futureShape([
    "comparableRentMonthly",
    "investmentReturnPercent",
    "horizonYears",
  ]),
  stressTestDeltas: futureShape([
    "rateDeltaPct",
    "rentDeltaPct",
    "vacancyDeltaPct",
    "appreciationDeltaPct",
    "expenseDeltaPct",
    "homePriceDeltaPct",
  ]),
  rentalIncome: {
    mode: true,
    multifamily: {
      units: [UNIT_SHAPE],
      defaultVacancyRatePercent: true,
    },
    str: STR_SHAPE,
  },
  dealStrategy: {
    brrrr: futureShape([
      "arv",
      "refiLtvPercent",
      "refiClosingCosts",
      "holdingCostsDuringRehab",
    ]),
    flip: futureShape([
      "salePrice",
      "sellingCostPercent",
      "holdingCosts",
      "financingCosts",
      "loanPayoffAtSale",
    ]),
  },
  research: {
    notes: true,
    links: [
      futureShape(["id", "url", "title", "kind", "addedAt"]),
    ],
    comps: [
      futureShape(["id", "label", "price", "address", "url", "notes", "addedAt"]),
    ],
    docs: [
      futureShape(["id", "title", "url", "note", "addedAt"]),
    ],
    taxIssues: [
      futureShape(["id", "topic", "title", "url", "notes", "source", "jurisdiction", "curatedRefId", "addedAt"]),
    ],
    externalTaxResearch: {
      collectionStatus: true,
      addressFingerprint: true,
      collectedAt: true,
      sourceProvenance: futureShape([
        "provider",
        "providerVersion",
        "bundleId",
        "requestId",
        "sources",
      ]),
      normalizedReferences: [
        futureShape([
          "id",
          "topic",
          "title",
          "url",
          "source",
          "jurisdiction",
          "externalRefId",
          "normalizedKey",
          "excerpt",
          "publishedAt",
          "retrievedAt",
          "linkStatus",
        ]),
      ],
      errors: [futureShape(["code", "message", "source", "at"])],
    },
  },
});

const REQUIRED_NUMBERS = [
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
] as const;

const REQUIRED_STRINGS = [
  "propertyAddress",
  "propertyPlaceId",
  "propertyState",
  "propertyPostalCode",
] as const;

const PERCENT_FIELDS = new Set<string>([
  "downPaymentPercent",
  "interestRateApr",
  "propertyTaxPercent",
  "vacancyRatePercent",
  "propertyMgmtPercent",
  "maintenancePercent",
  "capexPercent",
  "sellClosingCostPercent",
]);

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function looksLikeScenario(value: PlainObject): boolean {
  return KNOWN_SCENARIO_KEYS.some((key) => key in value);
}

function extractInput(input: unknown): ExtractedInput | null {
  if (!isPlainObject(input)) return null;

  if (isPlainObject(input.house) && isPlainObject(input.house.scenario)) {
    return {
      inputKind: "full-export",
      scenario: input.house.scenario,
      root: input.house,
      rootPath: "house",
      duplicateScenario: input.scenario,
    };
  }

  if (isPlainObject(input.scenario)) {
    const isHouse =
      "id" in input ||
      "houseId" in input ||
      "houseNumber" in input ||
      "userId" in input ||
      "archived" in input;
    return {
      inputKind: isHouse ? "house-root" : "scenario-envelope",
      scenario: input.scenario,
      root: input,
      rootPath: isHouse ? "house" : undefined,
    };
  }

  if (hasHouseCategoryNodes(input)) {
    const scenario = Object.assign(
      {},
      isPlainObject(input.property) ? input.property : {},
      isPlainObject(input.financing) ? input.financing : {},
      isPlainObject(input.upfront) ? input.upfront : {},
      isPlainObject(input.rental) ? input.rental : {},
      isPlainObject(input.exit) ? input.exit : {}
    );
    return {
      inputKind: "legacy-categories",
      scenario,
      root: input,
      rootPath: "house",
    };
  }

  if (looksLikeScenario(input)) {
    return { inputKind: "raw-scenario", scenario: input };
  }

  return null;
}

function makeIssue(
  severity: ScenarioIssueSeverity,
  code: string,
  path: string,
  message: string,
  repairability: ScenarioIssueRepairability
): ScenarioValidationIssue {
  return { severity, code, path, message, repairability };
}

class IssueCollector {
  readonly issues: ScenarioValidationIssue[] = [];

  add(
    severity: ScenarioIssueSeverity,
    code: string,
    path: string,
    message: string,
    repairability: ScenarioIssueRepairability
  ): void {
    this.issues.push(makeIssue(severity, code, path, message, repairability));
  }

  get safeToRepair(): boolean {
    return !this.issues.some((issue) => issue.repairability === "manual");
  }
}

type NumberRules = {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  missingRepair?: "automatic" | "manual";
  typeRepair?: "automatic" | "manual";
  rangeRepair?: "automatic" | "manual";
};

function readNumber(
  object: PlainObject,
  key: string,
  path: string,
  collector: IssueCollector,
  rules: NumberRules = {}
): number | undefined {
  const raw = object[key];
  if (raw === undefined || raw === null || raw === "") {
    if (rules.required) {
      collector.add(
        "warning",
        "FIELD_DEFAULTED",
        path,
        "Required numeric field is missing and will use the current schema default.",
        rules.missingRepair ?? "automatic"
      );
    }
    return undefined;
  }

  let value: number;
  if (typeof raw === "number") {
    value = raw;
  } else if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
    value = Number(raw);
    collector.add(
      "warning",
      "NUMBER_COERCED",
      path,
      "Numeric text will be converted to a number.",
      "automatic"
    );
  } else {
    collector.add(
      "error",
      "FIELD_TYPE",
      path,
      "Expected a finite number.",
      rules.typeRepair ?? "automatic"
    );
    return undefined;
  }

  if (!Number.isFinite(value)) {
    collector.add(
      "error",
      "NUMBER_NOT_FINITE",
      path,
      "Number must be finite.",
      rules.typeRepair ?? "automatic"
    );
    return undefined;
  }

  const rangeRepair = rules.rangeRepair ?? "automatic";
  if (rules.min !== undefined && value < rules.min) {
    collector.add(
      "error",
      "NUMBER_OUT_OF_RANGE",
      path,
      `Number must be at least ${rules.min}.`,
      rangeRepair
    );
  }
  if (rules.max !== undefined && value > rules.max) {
    collector.add(
      "error",
      "NUMBER_OUT_OF_RANGE",
      path,
      `Number must be at most ${rules.max}.`,
      rangeRepair
    );
  }
  if (rules.integer && !Number.isInteger(value)) {
    collector.add(
      "error",
      "NUMBER_NOT_INTEGER",
      path,
      "Number must be an integer.",
      rangeRepair
    );
  }
  return value;
}

function readString(
  object: PlainObject,
  key: string,
  path: string,
  collector: IssueCollector,
  required: boolean,
  missingRepair: "automatic" | "manual" = "automatic"
): string | undefined {
  const raw = object[key];
  if (raw === undefined || raw === null) {
    if (required) {
      collector.add(
        "warning",
        "FIELD_DEFAULTED",
        path,
        "Required text field is missing and will use the current schema default.",
        missingRepair
      );
    }
    return undefined;
  }
  if (typeof raw !== "string") {
    const repairability =
      typeof raw === "number" || typeof raw === "boolean" || typeof raw === "bigint"
        ? "automatic"
        : "manual";
    collector.add(
      repairability === "automatic" ? "warning" : "error",
      "STRING_COERCED",
      path,
      "Value will be converted to text.",
      repairability
    );
    return String(raw);
  }
  return raw;
}

function readObject(
  parent: PlainObject,
  key: string,
  path: string,
  collector: IssueCollector
): PlainObject | undefined {
  const raw = parent[key];
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    collector.add(
      "error",
      "OBJECT_EXPECTED",
      path,
      "Expected an object.",
      "automatic"
    );
    return undefined;
  }
  return raw;
}

function checkEnum(
  object: PlainObject,
  key: string,
  allowed: readonly string[],
  path: string,
  collector: IssueCollector,
  required = false
): void {
  const raw = object[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) {
      collector.add(
        "warning",
        "FIELD_DEFAULTED",
        path,
        `Missing value will default to "${allowed[0]}".`,
        "automatic"
      );
    }
    return;
  }
  if (typeof raw !== "string" || !allowed.includes(raw.toLowerCase())) {
    collector.add(
      "error",
      "ENUM_INVALID",
      path,
      `Expected one of: ${allowed.join(", ")}.`,
      "automatic"
    );
  } else if (raw !== raw.toLowerCase()) {
    collector.add(
      "warning",
      "ENUM_NORMALIZED",
      path,
      "Enum text will be normalized to lowercase.",
      "automatic"
    );
  }
}

function checkOptionalBoolean(
  object: PlainObject,
  key: string,
  path: string,
  collector: IssueCollector
): void {
  if (object[key] !== undefined && typeof object[key] !== "boolean") {
    collector.add(
      "error",
      "FIELD_TYPE",
      path,
      "Expected a boolean.",
      "automatic"
    );
  }
}

function validateSchemaVersion(scenario: PlainObject, collector: IssueCollector): void {
  const raw = scenario.v;
  if (raw === undefined || raw === null) {
    collector.add(
      "warning",
      "SCHEMA_VERSION_MISSING",
      "scenario.v",
      "Scenario has no schema version and will be migrated as a legacy scenario.",
      "automatic"
    );
    return;
  }
  if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 1) {
    collector.add(
      "error",
      "SCHEMA_VERSION_INVALID",
      "scenario.v",
      "Scenario schema version must be a positive integer.",
      "manual"
    );
    return;
  }
  if (raw === SCHEMA_VERSION_LEGACY) {
    collector.add(
      "warning",
      "SCHEMA_VERSION_LEGACY",
      "scenario.v",
      `Scenario v${raw} will be migrated to v${SCHEMA_VERSION}.`,
      "automatic"
    );
  } else if (raw > SCHEMA_VERSION) {
    collector.add(
      "warning",
      "SCHEMA_VERSION_FUTURE",
      "scenario.v",
      `Scenario v${raw} is newer than supported v${SCHEMA_VERSION}; known fields can be inspected, but rewriting is unsafe.`,
      "manual"
    );
  }
}

function normalizeBusinessId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return String(Number(trimmed)).padStart(3, "0");
}

function validateHouseIdentity(
  root: PlainObject,
  rootPath: string,
  collector: IssueCollector
): string | undefined {
  const idRaw = root.id;
  const aliasRaw = root.houseId;
  let houseId: string | undefined;

  const normalizedId = typeof idRaw === "string" ? normalizeBusinessId(idRaw) : null;
  const normalizedAlias =
    typeof aliasRaw === "string" ? normalizeBusinessId(aliasRaw) : null;
  const selected =
    normalizedId !== null ? idRaw : normalizedAlias !== null ? aliasRaw : idRaw ?? aliasRaw;
  if (selected === undefined || selected === null || selected === "") {
    const houseNumber = readNumber(
      root,
      "houseNumber",
      `${rootPath}.houseNumber`,
      collector,
      { min: 1, integer: true, rangeRepair: "manual" }
    );
    if (houseNumber !== undefined && houseNumber >= 1 && Number.isInteger(houseNumber)) {
      houseId = String(houseNumber).padStart(3, "0");
      collector.add(
        "warning",
        "HOUSE_ID_DERIVED",
        `${rootPath}.id`,
        "Business house id will be derived from houseNumber.",
        "automatic"
      );
    } else {
      collector.add(
        "error",
        "HOUSE_ID_MISSING",
        `${rootPath}.id`,
        "House root requires a numeric business id such as 001.",
        "manual"
      );
    }
  } else if (typeof selected !== "string" || normalizeBusinessId(selected) === null) {
    collector.add(
      "error",
      "HOUSE_ID_INVALID",
      `${rootPath}.${idRaw !== undefined ? "id" : "houseId"}`,
      "Business house id must contain digits only (for example, 001).",
      "manual"
    );
  } else {
    houseId = normalizeBusinessId(selected) ?? undefined;
    if (selected.trim() !== houseId) {
      collector.add(
        "warning",
        "HOUSE_ID_NORMALIZED",
        `${rootPath}.${idRaw !== undefined ? "id" : "houseId"}`,
        `Business house id will be normalized to ${houseId}.`,
        "automatic"
      );
    }
  }

  if (idRaw !== undefined && normalizedId === null && normalizedAlias !== null) {
    collector.add(
      "warning",
      "HOUSE_DOCUMENT_ID_IGNORED",
      `${rootPath}.id`,
      "Non-business document id is ignored in favor of the numeric houseId.",
      "not-applicable"
    );
  }

  if (idRaw !== undefined && aliasRaw !== undefined) {
    if (
      normalizedAlias === null ||
      (normalizedId !== null && normalizedId !== normalizedAlias)
    ) {
      collector.add(
        "error",
        "HOUSE_ID_MISMATCH",
        rootPath,
        "id and houseId identify different business houses.",
        "manual"
      );
    }
  }

  if (houseId && root.houseNumber !== undefined) {
    const n = readNumber(root, "houseNumber", `${rootPath}.houseNumber`, collector, {
      min: 1,
      integer: true,
      rangeRepair: "manual",
    });
    if (n !== undefined && Number.isInteger(n) && Number(houseId) !== n) {
      collector.add(
        "error",
        "HOUSE_NUMBER_MISMATCH",
        `${rootPath}.houseNumber`,
        "houseNumber does not match the business house id.",
        "manual"
      );
    }
  }

  const treeVersion = root.v;
  if (treeVersion !== undefined) {
    if (
      typeof treeVersion !== "number" ||
      !Number.isInteger(treeVersion) ||
      treeVersion < 1
    ) {
      collector.add(
        "error",
        "HOUSE_SCHEMA_VERSION_INVALID",
        `${rootPath}.v`,
        "House tree version must be a positive integer.",
        "manual"
      );
    } else if (treeVersion > HOUSE_TREE_VERSION) {
      collector.add(
        "warning",
        "HOUSE_SCHEMA_VERSION_FUTURE",
        `${rootPath}.v`,
        `House tree v${treeVersion} is newer than supported v${HOUSE_TREE_VERSION}.`,
        "manual"
      );
    }
  }
  return houseId;
}

function validateTopLevel(
  scenario: PlainObject,
  collector: IssueCollector,
  allowLegacyDefaults: boolean
): void {
  const values = new Map<string, number | undefined>();
  for (const field of REQUIRED_NUMBERS) {
    const isAppreciation = field === "sellAnnualAppreciationPercent";
    const isInteger = field === "termYears" || field === "yearsOwned";
    values.set(
      field,
      readNumber(scenario, field, `scenario.${field}`, collector, {
        required: true,
        min: isAppreciation ? -100 : 0,
        max: PERCENT_FIELDS.has(field) ? 100 : field === "termYears" ? 40 : undefined,
        integer: isInteger,
        missingRepair: allowLegacyDefaults ? "automatic" : "manual",
        typeRepair: "manual",
        rangeRepair: "manual",
      })
    );
  }
  for (const field of REQUIRED_STRINGS) {
    readString(
      scenario,
      field,
      `scenario.${field}`,
      collector,
      true,
      allowLegacyDefaults ? "automatic" : "manual"
    );
  }

  readNumber(
    scenario,
    "customHousingBudgetMonthly",
    "scenario.customHousingBudgetMonthly",
    collector,
    { min: 0, rangeRepair: "manual" }
  );
  for (const key of ["earnestMoney", "sellerCredit", "lenderCredit", "rehabCashIn"] as const) {
    readNumber(scenario, key, `scenario.${key}`, collector, {
      min: 0,
      rangeRepair: "manual",
    });
  }

  const hp = values.get("homePrice");
  const down = values.get("downPayment");
  const downPercent = values.get("downPaymentPercent");
  if (hp !== undefined && down !== undefined && hp >= 0 && down > hp) {
    collector.add(
      "error",
      "DOWN_PAYMENT_EXCEEDS_PRICE",
      "scenario.downPayment",
      "Down payment cannot exceed the home price.",
      "manual"
    );
  }
  if (hp !== undefined && hp > 0 && down !== undefined && downPercent !== undefined) {
    const expected = Math.round((hp * downPercent) / 100);
    if (Math.abs(down - expected) > 1) {
      collector.add(
        "error",
        "SYNCHRONIZED_PAIR_MISMATCH",
        "scenario.downPayment",
        "Down payment dollars do not match downPaymentPercent; the percentage is canonical during migration.",
        "automatic"
      );
    }
  }

  const tax = values.get("propertyTaxAnnual");
  const taxPercent = values.get("propertyTaxPercent");
  if (hp !== undefined && hp > 0 && tax !== undefined && taxPercent !== undefined) {
    const expected = Math.round((hp * taxPercent) / 100);
    if (Math.abs(tax - expected) > 1) {
      collector.add(
        "error",
        "SYNCHRONIZED_PAIR_MISMATCH",
        "scenario.propertyTaxAnnual",
        "Annual property tax does not match propertyTaxPercent; the percentage is canonical during migration.",
        "automatic"
      );
    }
  }

  validateCoordinates(scenario, collector);
  validateDynamicMap(
    scenario,
    "buyingCostLineOverrides",
    "scenario.buyingCostLineOverrides",
    "number",
    collector
  );
  validateDynamicMap(
    scenario,
    "rentalProFormaInclude",
    "scenario.rentalProFormaInclude",
    "boolean",
    collector
  );
  validateDynamicMap(
    scenario,
    "sellRentalYieldInclude",
    "scenario.sellRentalYieldInclude",
    "boolean",
    collector
  );
}

function coordinateValue(raw: unknown): number | null | undefined {
  if (raw === null || raw === "") return null;
  if (raw === undefined) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() && Number.isFinite(Number(raw))) return Number(raw);
  return undefined;
}

function validateCoordinates(scenario: PlainObject, collector: IssueCollector): void {
  const latRaw = scenario.propertyLatitude;
  const lngRaw = scenario.propertyLongitude;
  const lat = coordinateValue(latRaw);
  const lng = coordinateValue(lngRaw);

  if (
    (typeof latRaw === "string" && lat !== undefined && lat !== null) ||
    (typeof lngRaw === "string" && lng !== undefined && lng !== null)
  ) {
    collector.add(
      "warning",
      "NUMBER_COERCED",
      "scenario.propertyLatitude/propertyLongitude",
      "Coordinate text will be converted to numbers.",
      "automatic"
    );
  }
  if (latRaw !== undefined && latRaw !== null && latRaw !== "" && lat === undefined) {
    collector.add(
      "error",
      "FIELD_TYPE",
      "scenario.propertyLatitude",
      "Latitude must be a finite number or null.",
      "automatic"
    );
  }
  if (lngRaw !== undefined && lngRaw !== null && lngRaw !== "" && lng === undefined) {
    collector.add(
      "error",
      "FIELD_TYPE",
      "scenario.propertyLongitude",
      "Longitude must be a finite number or null.",
      "automatic"
    );
  }

  const latPresent = lat !== null && lat !== undefined;
  const lngPresent = lng !== null && lng !== undefined;
  if (latPresent !== lngPresent) {
    collector.add(
      "error",
      "COORDINATE_PAIR_INCOMPLETE",
      "scenario.propertyLatitude/propertyLongitude",
      "Latitude and longitude must both be set or both be null.",
      "manual"
    );
  }
  if (latPresent && (lat < -90 || lat > 90)) {
    collector.add(
      "error",
      "NUMBER_OUT_OF_RANGE",
      "scenario.propertyLatitude",
      "Latitude must be between -90 and 90.",
      "manual"
    );
  }
  if (lngPresent && (lng < -180 || lng > 180)) {
    collector.add(
      "error",
      "NUMBER_OUT_OF_RANGE",
      "scenario.propertyLongitude",
      "Longitude must be between -180 and 180.",
      "manual"
    );
  }
}

function validateDynamicMap(
  parent: PlainObject,
  key: string,
  path: string,
  valueType: "number" | "boolean",
  collector: IssueCollector
): void {
  const object = readObject(parent, key, path, collector);
  if (!object) return;
  for (const [entryKey, value] of Object.entries(object)) {
    if (!entryKey) {
      collector.add("error", "MAP_KEY_INVALID", path, "Map keys cannot be empty.", "automatic");
    }
    if (valueType === "boolean" && typeof value !== "boolean") {
      collector.add(
        "error",
        "FIELD_TYPE",
        `${path}.${entryKey}`,
        "Expected a boolean.",
        "automatic"
      );
    }
    if (
      valueType === "number" &&
      (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    ) {
      collector.add(
        "error",
        "FIELD_TYPE",
        `${path}.${entryKey}`,
        "Expected a finite nonnegative number.",
        "automatic"
      );
    }
  }
}

function validateRefi(scenario: PlainObject, collector: IssueCollector): void {
  const refi = readObject(scenario, "refi", "scenario.refi", collector);
  if (!refi) return;
  for (const key of ["balance", "currentPi", "newRateApr", "closingCosts"] as const) {
    readNumber(refi, key, `scenario.refi.${key}`, collector, {
      required: true,
      min: 0,
    });
  }
  const term = readNumber(refi, "newTermYears", "scenario.refi.newTermYears", collector, {
    required: true,
    min: 1,
    integer: true,
  });
  if (term !== undefined && ![10, 15, 20, 25, 30].includes(term)) {
    collector.add(
      "error",
      "ENUM_INVALID",
      "scenario.refi.newTermYears",
      "Refinance term must be 10, 15, 20, 25, or 30 years.",
      "automatic"
    );
  }
  const pickedYear = readNumber(
    refi,
    "loanYearEndPick",
    "scenario.refi.loanYearEndPick",
    collector,
    {
      required: true,
      min: 0,
      integer: true,
    }
  );
  const originalTerm =
    typeof scenario.termYears === "number" && Number.isFinite(scenario.termYears)
      ? scenario.termYears
      : undefined;
  if (
    pickedYear !== undefined &&
    originalTerm !== undefined &&
    originalTerm > 0 &&
    pickedYear > originalTerm
  ) {
    collector.add(
      "error",
      "NUMBER_OUT_OF_RANGE",
      "scenario.refi.loanYearEndPick",
      "Completed loan year cannot exceed the original loan term.",
      "manual"
    );
  }
}

function validateGrowth(scenario: PlainObject, collector: IssueCollector): void {
  const growth = readObject(scenario, "growth", "scenario.growth", collector);
  if (!growth) return;
  const hasRent = growth.rentGrowthPercent !== undefined || growth.rentGrowthPct !== undefined;
  const hasExpense =
    growth.expenseGrowthPercent !== undefined || growth.expenseGrowthPct !== undefined;
  if (!hasRent && !hasExpense) {
    collector.add(
      "warning",
      "EMPTY_BLOCK_REMOVED",
      "scenario.growth",
      "Empty growth block will be removed.",
      "automatic"
    );
  }
  for (const [canonical, legacy] of [
    ["rentGrowthPercent", "rentGrowthPct"],
    ["expenseGrowthPercent", "expenseGrowthPct"],
  ] as const) {
    const key = growth[canonical] !== undefined ? canonical : legacy;
    if (growth[key] !== undefined) {
      readNumber(growth, key, `scenario.growth.${key}`, collector, { min: 0, max: 100 });
      if (key === legacy) {
        collector.add(
          "warning",
          "LEGACY_FIELD_MIGRATED",
          `scenario.growth.${key}`,
          `${key} will be renamed to ${canonical}.`,
          "automatic"
        );
      }
    }
  }
}

function validatePaymentPlan(scenario: PlainObject, collector: IssueCollector): void {
  const plan = readObject(scenario, "paymentPlan", "scenario.paymentPlan", collector);
  if (!plan) return;
  checkEnum(
    plan,
    "frequency",
    ["monthly", "biweekly"],
    "scenario.paymentPlan.frequency",
    collector,
    true
  );
  if (plan.lumpSums === undefined) {
    collector.add(
      "warning",
      "FIELD_DEFAULTED",
      "scenario.paymentPlan.lumpSums",
      "Missing lumpSums will default to an empty array.",
      "automatic"
    );
  } else if (!Array.isArray(plan.lumpSums)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.paymentPlan.lumpSums",
      "Expected an array of lump-sum payments.",
      "automatic"
    );
  } else {
    plan.lumpSums.forEach((item, index) => {
      const path = `scenario.paymentPlan.lumpSums[${index}]`;
      if (!isPlainObject(item)) {
        collector.add("error", "OBJECT_EXPECTED", path, "Expected an object.", "automatic");
        return;
      }
      readNumber(item, "month", `${path}.month`, collector, {
        required: true,
        min: 1,
        max: 360,
        integer: true,
      });
      readNumber(item, "amount", `${path}.amount`, collector, {
        required: true,
        min: 0,
      });
    });
  }
}

function validateLoan(scenario: PlainObject, collector: IssueCollector): void {
  const loan = readObject(scenario, "loan", "scenario.loan", collector);
  if (!loan) return;
  checkEnum(
    loan,
    "productType",
    ["conventional", "fha", "va", "usda"],
    "scenario.loan.productType",
    collector,
    true
  );
  checkEnum(loan, "rateType", ["fixed", "arm"], "scenario.loan.rateType", collector);
  checkEnum(loan, "buydown", ["none", "2-1", "3-2-1"], "scenario.loan.buydown", collector);
  readNumber(loan, "noteApr", "scenario.loan.noteApr", collector, { min: 0, max: 100 });
  readNumber(loan, "termYears", "scenario.loan.termYears", collector, {
    min: 1,
    max: 40,
    integer: true,
  });
  readNumber(loan, "pointsPercent", "scenario.loan.pointsPercent", collector, {
    min: 0,
    max: 100,
  });
  readNumber(loan, "miMonthlyOverride", "scenario.loan.miMonthlyOverride", collector, { min: 0 });
  for (const key of [
    "financeUpfrontFees",
    "vaFirstUse",
    "useScenarioPmi",
  ] as const) {
    checkOptionalBoolean(loan, key, `scenario.loan.${key}`, collector);
  }

  const arm = readObject(loan, "arm", "scenario.loan.arm", collector);
  if (loan.rateType === "arm" && !arm) {
    collector.add(
      "error",
      "REQUIRED_BLOCK_MISSING",
      "scenario.loan.arm",
      "ARM rate type requires ARM assumptions.",
      "manual"
    );
  }
  if (arm) {
    readNumber(arm, "initialFixedYears", "scenario.loan.arm.initialFixedYears", collector, {
      required: true,
      min: 1,
      max: 10,
      integer: true,
    });
    for (const key of ["margin", "indexRate", "periodicCap", "lifetimeCap"] as const) {
      readNumber(arm, key, `scenario.loan.arm.${key}`, collector, {
        required: true,
        min: 0,
        max: 100,
      });
    }
  }
}

function validateUpfront(scenario: PlainObject, collector: IssueCollector): void {
  const upfront = readObject(scenario, "upfront", "scenario.upfront", collector);
  if (!upfront) return;
  for (const key of ["earnestMoney", "sellerCredit", "lenderCredit", "rehabCashIn"] as const) {
    readNumber(upfront, key, `scenario.upfront.${key}`, collector, { min: 0 });
  }
}

function validateTax(scenario: PlainObject, collector: IssueCollector): void {
  const tax = readObject(scenario, "tax", "scenario.tax", collector);
  if (!tax) return;
  if (tax.enabled !== true) {
    collector.add(
      "warning",
      "DISABLED_BLOCK_REMOVED",
      "scenario.tax.enabled",
      "Tax assumptions are persisted only while enabled; this block will be removed.",
      "automatic"
    );
  }
  for (const key of [
    "landPercent",
    "marginalIncomeTaxRatePercent",
    "capitalGainsRatePercent",
    "recaptureRatePercent",
  ] as const) {
    readNumber(tax, key, `scenario.tax.${key}`, collector, { min: 0, max: 100 });
  }
  for (const key of ["improvementsBasis", "taxableIncomeBeforeQbi"] as const) {
    readNumber(tax, key, `scenario.tax.${key}`, collector, { min: 0 });
  }
  checkOptionalBoolean(tax, "qbiEligible", "scenario.tax.qbiEligible", collector);
  checkOptionalBoolean(tax, "isLongTerm", "scenario.tax.isLongTerm", collector);
  const exchange = readObject(tax, "exchange1031", "scenario.tax.exchange1031", collector);
  if (exchange) {
    for (const key of ["replacementPropertyCost", "bootReceived"] as const) {
      readNumber(exchange, key, `scenario.tax.exchange1031.${key}`, collector, { min: 0 });
    }
  }
}

function validateOfferTargets(scenario: PlainObject, collector: IssueCollector): void {
  const targets = readObject(scenario, "offerTargets", "scenario.offerTargets", collector);
  if (!targets) return;
  for (const key of [
    "targetDscr",
    "targetCashFlowMonthly",
    "targetCashOnCashPercent",
    "targetPaymentMonthly",
  ] as const) {
    readNumber(targets, key, `scenario.offerTargets.${key}`, collector, { min: 0 });
  }
}

function validateRentalIncome(scenario: PlainObject, collector: IssueCollector): void {
  const rental = readObject(scenario, "rentalIncome", "scenario.rentalIncome", collector);
  if (!rental) return;
  checkEnum(
    rental,
    "mode",
    ["simple", "multifamily", "str"],
    "scenario.rentalIncome.mode",
    collector,
    true
  );
  const multifamily = readObject(
    rental,
    "multifamily",
    "scenario.rentalIncome.multifamily",
    collector
  );
  const str = readObject(rental, "str", "scenario.rentalIncome.str", collector);
  if (rental.mode === "multifamily" && !multifamily) {
    collector.add(
      "error",
      "REQUIRED_BLOCK_MISSING",
      "scenario.rentalIncome.multifamily",
      "Multifamily mode requires a multifamily block.",
      "manual"
    );
  }
  if (rental.mode === "str" && !str) {
    collector.add(
      "error",
      "REQUIRED_BLOCK_MISSING",
      "scenario.rentalIncome.str",
      "STR mode requires an STR block.",
      "manual"
    );
  }
  if (multifamily) validateMultifamily(multifamily, collector);
  if (str) validateStr(str, collector);
}

function validateMultifamily(multifamily: PlainObject, collector: IssueCollector): void {
  readNumber(
    multifamily,
    "defaultVacancyRatePercent",
    "scenario.rentalIncome.multifamily.defaultVacancyRatePercent",
    collector,
    { min: 0, max: 100 }
  );
  if (!Array.isArray(multifamily.units)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.rentalIncome.multifamily.units",
      "Expected a non-empty unit array.",
      "manual"
    );
    return;
  }
  if (multifamily.units.length === 0) {
    collector.add(
      "error",
      "ARRAY_EMPTY",
      "scenario.rentalIncome.multifamily.units",
      "Multifamily income requires at least one unit.",
      "manual"
    );
  }

  const ids = new Map<string, number>();
  multifamily.units.forEach((unit, index) => {
    const path = `scenario.rentalIncome.multifamily.units[${index}]`;
    if (!isPlainObject(unit)) {
      collector.add("error", "OBJECT_EXPECTED", path, "Expected a unit object.", "automatic");
      return;
    }
    let id = typeof unit.id === "string" ? unit.id : "";
    if (!id) {
      id = `unit-${index + 1}`;
      collector.add(
        "warning",
        "UNIT_ID_GENERATED",
        `${path}.id`,
        `Missing unit id will be generated as ${id}.`,
        "automatic"
      );
    } else if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(id)) {
      collector.add(
        "error",
        "UNIT_ID_UNSTABLE",
        `${path}.id`,
        "Unit id must be a stable, whitespace-free identifier of at most 80 characters.",
        "manual"
      );
    }
    const prior = ids.get(id);
    if (prior !== undefined) {
      collector.add(
        "error",
        "UNIT_ID_DUPLICATE",
        `${path}.id`,
        `Unit id duplicates units[${prior}].id.`,
        "manual"
      );
    } else {
      ids.set(id, index);
    }
    readNumber(unit, "monthlyRent", `${path}.monthlyRent`, collector, {
      required: true,
      min: 0,
    });
    readNumber(unit, "otherMonthlyIncome", `${path}.otherMonthlyIncome`, collector, { min: 0 });
    readNumber(unit, "vacancyRatePercent", `${path}.vacancyRatePercent`, collector, {
      min: 0,
      max: 100,
    });
  });
}

function validateStr(str: PlainObject, collector: IssueCollector): void {
  for (const key of ["nightlyRate", "cleaningFeePerStay", "otherMonthlyIncome"] as const) {
    readNumber(str, key, `scenario.rentalIncome.str.${key}`, collector, {
      required: key !== "otherMonthlyIncome",
      min: 0,
    });
  }
  for (const key of ["nightsBookedPerMonth", "staysPerMonth"] as const) {
    readNumber(str, key, `scenario.rentalIncome.str.${key}`, collector, {
      required: true,
      min: 0,
      max: 31,
      integer: true,
      rangeRepair: "manual",
    });
  }
  for (const key of ["platformFeePercent", "vacancyRatePercent"] as const) {
    readNumber(str, key, `scenario.rentalIncome.str.${key}`, collector, {
      min: 0,
      max: 100,
    });
  }
}

function validateDealStrategy(scenario: PlainObject, collector: IssueCollector): void {
  const strategy = readObject(scenario, "dealStrategy", "scenario.dealStrategy", collector);
  if (!strategy) return;
  const brrrr = readObject(strategy, "brrrr", "scenario.dealStrategy.brrrr", collector);
  if (brrrr) {
    for (const key of ["arv", "refiClosingCosts", "holdingCostsDuringRehab"] as const) {
      readNumber(brrrr, key, `scenario.dealStrategy.brrrr.${key}`, collector, { min: 0 });
    }
    readNumber(brrrr, "refiLtvPercent", "scenario.dealStrategy.brrrr.refiLtvPercent", collector, {
      min: 0,
      max: 100,
    });
  }
  const flip = readObject(strategy, "flip", "scenario.dealStrategy.flip", collector);
  if (flip) {
    for (const key of [
      "salePrice",
      "holdingCosts",
      "financingCosts",
      "loanPayoffAtSale",
    ] as const) {
      readNumber(flip, key, `scenario.dealStrategy.flip.${key}`, collector, { min: 0 });
    }
    readNumber(flip, "sellingCostPercent", "scenario.dealStrategy.flip.sellingCostPercent", collector, {
      min: 0,
      max: 100,
    });
  }
}

const TAX_JURISDICTIONS = ["federal", "state", "county"] as const;

function validateResearch(scenario: PlainObject, collector: IssueCollector): void {
  const research = readObject(scenario, "research", "scenario.research", collector);
  if (!research) return;

  if (research.taxIssues !== undefined && !Array.isArray(research.taxIssues)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.research.taxIssues",
      "Expected an array of manual tax issue references.",
      "automatic"
    );
  }

  const external = readObject(
    research,
    "externalTaxResearch",
    "scenario.research.externalTaxResearch",
    collector
  );
  if (!external) return;

  checkEnum(
    external,
    "collectionStatus",
    EXTERNAL_TAX_RESEARCH_STATUSES,
    "scenario.research.externalTaxResearch.collectionStatus",
    collector,
    true
  );
  readString(
    external,
    "addressFingerprint",
    "scenario.research.externalTaxResearch.addressFingerprint",
    collector,
    true
  );
  const fingerprint = external.addressFingerprint;
  if (typeof fingerprint === "string" && fingerprint.trim() === "") {
    collector.add(
      "error",
      "FIELD_EMPTY",
      "scenario.research.externalTaxResearch.addressFingerprint",
      "Address fingerprint cannot be empty.",
      "automatic"
    );
  }
  if (external.collectedAt !== undefined && external.collectedAt !== null && external.collectedAt !== "") {
    if (typeof external.collectedAt !== "string" || !Number.isFinite(Date.parse(external.collectedAt))) {
      collector.add(
        "error",
        "FIELD_TYPE",
        "scenario.research.externalTaxResearch.collectedAt",
        "Expected an ISO-8601 timestamp.",
        "automatic"
      );
    }
  } else {
    collector.add(
      "warning",
      "FIELD_DEFAULTED",
      "scenario.research.externalTaxResearch.collectedAt",
      "Missing collectedAt will default to the current time during normalization.",
      "automatic"
    );
  }

  const provenance = readObject(
    external,
    "sourceProvenance",
    "scenario.research.externalTaxResearch.sourceProvenance",
    collector
  );
  if (provenance?.sources !== undefined && !Array.isArray(provenance.sources)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.research.externalTaxResearch.sourceProvenance.sources",
      "Expected an array of source labels or URLs.",
      "automatic"
    );
  }

  if (external.normalizedReferences !== undefined && !Array.isArray(external.normalizedReferences)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.research.externalTaxResearch.normalizedReferences",
      "Expected an array of normalized tax references.",
      "automatic"
    );
  } else if (Array.isArray(external.normalizedReferences)) {
    external.normalizedReferences.forEach((item, index) => {
      const path = `scenario.research.externalTaxResearch.normalizedReferences[${index}]`;
      if (!isPlainObject(item)) {
        collector.add("error", "OBJECT_EXPECTED", path, "Expected a reference object.", "automatic");
        return;
      }
      readString(item, "title", `${path}.title`, collector, true);
      if (typeof item.title === "string" && item.title.trim() === "") {
        collector.add(
          "error",
          "FIELD_EMPTY",
          `${path}.title`,
          "Reference title cannot be empty.",
          "automatic"
        );
      }
      checkEnum(item, "topic", TAX_ISSUE_TOPICS, `${path}.topic`, collector);
      checkEnum(item, "jurisdiction", TAX_JURISDICTIONS, `${path}.jurisdiction`, collector);
      checkEnum(item, "linkStatus", EXTERNAL_TAX_RESEARCH_LINK_STATUSES, `${path}.linkStatus`, collector);
      for (const dateKey of ["publishedAt", "retrievedAt"] as const) {
        const raw = item[dateKey];
        if (raw === undefined || raw === null || raw === "") continue;
        if (typeof raw !== "string" || !Number.isFinite(Date.parse(raw))) {
          collector.add(
            "error",
            "FIELD_TYPE",
            `${path}.${dateKey}`,
            "Expected an ISO-8601 timestamp.",
            "automatic"
          );
        }
      }
    });
  }

  if (external.errors !== undefined && !Array.isArray(external.errors)) {
    collector.add(
      "error",
      "ARRAY_EXPECTED",
      "scenario.research.externalTaxResearch.errors",
      "Expected an array of collection errors.",
      "automatic"
    );
  } else if (Array.isArray(external.errors)) {
    external.errors.forEach((item, index) => {
      const path = `scenario.research.externalTaxResearch.errors[${index}]`;
      if (!isPlainObject(item)) {
        collector.add("error", "OBJECT_EXPECTED", path, "Expected an error object.", "automatic");
        return;
      }
      readString(item, "code", `${path}.code`, collector, true);
      readString(item, "message", `${path}.message`, collector, true);
      if (typeof item.code === "string" && item.code.trim() === "") {
        collector.add(
          "error",
          "FIELD_EMPTY",
          `${path}.code`,
          "Error code cannot be empty.",
          "automatic"
        );
      }
      if (typeof item.message === "string" && item.message.trim() === "") {
        collector.add(
          "error",
          "FIELD_EMPTY",
          `${path}.message`,
          "Error message cannot be empty.",
          "automatic"
        );
      }
    });
  }
}

function validateOtherDecisionBlocks(scenario: PlainObject, collector: IssueCollector): void {
  const rentVsBuy = readObject(scenario, "rentVsBuy", "scenario.rentVsBuy", collector);
  if (rentVsBuy) {
    readNumber(
      rentVsBuy,
      "comparableRentMonthly",
      "scenario.rentVsBuy.comparableRentMonthly",
      collector,
      { min: 0 }
    );
    readNumber(
      rentVsBuy,
      "investmentReturnPercent",
      "scenario.rentVsBuy.investmentReturnPercent",
      collector,
      { min: 0, max: 30 }
    );
    readNumber(rentVsBuy, "horizonYears", "scenario.rentVsBuy.horizonYears", collector, {
      min: 1,
      max: 30,
      integer: true,
    });
  }

  const stress = readObject(
    scenario,
    "stressTestDeltas",
    "scenario.stressTestDeltas",
    collector
  );
  if (stress) {
    for (const key of [
      "rateDeltaPct",
      "rentDeltaPct",
      "vacancyDeltaPct",
      "appreciationDeltaPct",
      "expenseDeltaPct",
      "homePriceDeltaPct",
    ] as const) {
      readNumber(stress, key, `scenario.stressTestDeltas.${key}`, collector);
    }
  }
}

function validateNestedBlocks(scenario: PlainObject, collector: IssueCollector): void {
  validateRefi(scenario, collector);
  validateGrowth(scenario, collector);
  validatePaymentPlan(scenario, collector);
  validateLoan(scenario, collector);
  validateUpfront(scenario, collector);
  validateTax(scenario, collector);
  validateOfferTargets(scenario, collector);
  validateRentalIncome(scenario, collector);
  validateDealStrategy(scenario, collector);
  validateResearch(scenario, collector);
  validateOtherDecisionBlocks(scenario, collector);
}

function equivalentJson(
  left: unknown,
  right: unknown,
  seen = new WeakMap<object, object>()
): boolean {
  if (Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  if (seen.get(left) === right) return true;
  seen.set(left, right);
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => equivalentJson(value, right[index], seen));
  }
  const leftObject = left as PlainObject;
  const rightObject = right as PlainObject;
  const leftKeys = Object.keys(leftObject).sort();
  const rightKeys = Object.keys(rightObject).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        equivalentJson(leftObject[key], rightObject[key], seen)
    )
  );
}

function mergeFutureFields(
  source: unknown,
  normalized: unknown,
  shape: FutureFieldShape
): unknown {
  if (!isPlainObject(source) || !isPlainObject(normalized)) return normalized;
  const result: PlainObject = { ...normalized };
  for (const [key, sourceValue] of Object.entries(source)) {
    const rule = shape[key];
    if (rule === undefined) {
      result[key] = sourceValue;
      continue;
    }
    if (rule === true || rule === "dynamic-map") continue;
    const normalizedValue = normalized[key];
    if (Array.isArray(rule)) {
      if (!Array.isArray(sourceValue) || !Array.isArray(normalizedValue)) continue;
      const rowShape = rule[0];
      result[key] = normalizedValue.map((row, index) => {
        let sourceRow = sourceValue[index];
        if (isPlainObject(row) && typeof row.id === "string") {
          sourceRow =
            sourceValue.find(
              (candidate) => isPlainObject(candidate) && candidate.id === row.id
            ) ?? sourceRow;
        }
        return mergeFutureFields(sourceRow, row, rowShape);
      });
      continue;
    }
    if (isPlainObject(sourceValue) && isPlainObject(normalizedValue)) {
      result[key] = mergeFutureFields(
        sourceValue,
        normalizedValue,
        rule as FutureFieldShape
      );
    }
  }
  return result;
}

function normalizeExtracted(extracted: ExtractedInput): AppPersisted | null {
  if (
    extracted.inputKind === "house-root" ||
    extracted.inputKind === "scenario-envelope" ||
    extracted.inputKind === "legacy-categories"
  ) {
    const resolved = extracted.root ? resolveScenarioFromHouseDoc(extracted.root) : null;
    if (resolved) return resolved;
  }
  const serialized = JSON.stringify(extracted.scenario);
  if (typeof serialized !== "string") return null;
  return parseMortgageState(serialized);
}

function validateKnownInput(extracted: ExtractedInput): ScenarioValidationResult {
  const collector = new IssueCollector();
  validateSchemaVersion(extracted.scenario, collector);
  const allowLegacyDefaults =
    extracted.inputKind === "legacy-categories" ||
    extracted.scenario.v === undefined ||
    extracted.scenario.v === SCHEMA_VERSION_LEGACY;
  validateTopLevel(extracted.scenario, collector, allowLegacyDefaults);
  validateNestedBlocks(extracted.scenario, collector);

  let houseId: string | undefined;
  const hasHouseIdentity =
    extracted.root &&
    ("id" in extracted.root ||
      "houseId" in extracted.root ||
      "houseNumber" in extracted.root);
  if (
    extracted.root &&
    extracted.rootPath &&
    (extracted.inputKind === "full-export" ||
      extracted.inputKind === "house-root" ||
      hasHouseIdentity)
  ) {
    houseId = validateHouseIdentity(extracted.root, extracted.rootPath, collector);
  }

  if (extracted.inputKind === "full-export" && extracted.duplicateScenario !== undefined) {
    if (!equivalentJson(extracted.scenario, extracted.duplicateScenario)) {
      collector.add(
        "error",
        "DUPLICATE_SCENARIO_CONFLICT",
        "scenario",
        "Top-level scenario conflicts with house.scenario; choose one source before import.",
        "manual"
      );
    } else {
      collector.add(
        "warning",
        "DUPLICATE_SCENARIO_SOURCE",
        "scenario",
        "Duplicate top-level scenario is ignored; house.scenario is the canonical source.",
        "not-applicable"
      );
    }
  }

  let normalized: AppPersisted | null = null;
  try {
    normalized = normalizeExtracted(extracted);
  } catch {
    collector.add(
      "error",
      "INPUT_NOT_SERIALIZABLE",
      "scenario",
      "Scenario cannot be safely serialized and normalized.",
      "manual"
    );
  }

  const repairedScenario =
    normalized && collector.safeToRepair
      ? (mergeFutureFields(
          extracted.scenario,
          normalized as unknown as PlainObject,
          SCENARIO_FUTURE_SHAPE
        ) as AppPersisted)
      : undefined;

  return {
    inputKind: extracted.inputKind,
    valid: !collector.issues.some((issue) => issue.severity === "error"),
    issues: collector.issues,
    ...(houseId ? { houseId } : {}),
    ...(repairedScenario ? { repairedScenario } : {}),
  };
}

/**
 * Validate and safely normalize any supported Property Pro scenario representation.
 *
 * Accepted inputs are a raw scenario, `{ house: { id, scenario } }` full export,
 * legacy `{ scenario }`, a Firestore-like house root, or legacy category maps.
 * This function is pure: it does not write storage and never embeds issues in the candidate.
 */
export function validatePropertyProScenario(input: unknown): ScenarioValidationResult {
  try {
    const extracted = extractInput(input);
    if (!extracted) {
      return {
        inputKind: "unknown",
        valid: false,
        issues: [
          makeIssue(
            "error",
            isPlainObject(input) ? "INPUT_SHAPE_UNRECOGNIZED" : "INPUT_NOT_OBJECT",
            "$",
            "Input is not a supported Property Pro scenario representation.",
            "manual"
          ),
        ],
      };
    }
    return validateKnownInput(extracted);
  } catch {
    return {
      inputKind: "unknown",
      valid: false,
      issues: [
        makeIssue(
          "error",
          "INPUT_INSPECTION_FAILED",
          "$",
          "Input could not be inspected safely.",
          "manual"
        ),
      ],
    };
  }
}
