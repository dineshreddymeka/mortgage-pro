import { deriveScenario } from "./deriveScenario";
import {
  KNOWN_SCENARIO_KEYS,
  type AppPersisted,
} from "../storage/mortgageState";
import { hasHouseCategoryNodes } from "../storage/houseTree";
import { validatePropertyProScenario } from "../storage/scenarioValidation";

export const MAX_SCENARIO_IMPORT_BYTES = 5 * 1024 * 1024;

export type ScenarioImportFormat =
  | "current-full-export"
  | "legacy-top-level-scenario"
  | "raw-scenario"
  | "legacy-house-categories";

export type ScenarioImportIssue = {
  path?: string;
  message: string;
};

export type ScenarioImportKpi = {
  id: "purchasePrice" | "monthlyPayment" | "cashToClose" | "rentalCashFlow";
  label: string;
  before: number;
  after: number;
  format: "currency";
};

export type ScenarioImportPreview = {
  houseId: string | null;
  houseName: string | null;
  format: ScenarioImportFormat;
  formatLabel: string;
  versionLabel: string;
  fieldCount: number;
  knownFieldCount: number;
  unknownFieldCount: number;
  sectionCount: number;
  kpis: ScenarioImportKpi[];
};

export type ScenarioImportReady = {
  status: "ready";
  scenario: AppPersisted;
  preview: ScenarioImportPreview;
  warnings: ScenarioImportIssue[];
  errors: [];
};

export type ScenarioImportFailure = {
  status: "error";
  errors: ScenarioImportIssue[];
  warnings: ScenarioImportIssue[];
};

export type ScenarioImportResult = ScenarioImportReady | ScenarioImportFailure;

type JsonObject = Record<string, unknown>;

const FORMAT_LABELS: Record<ScenarioImportFormat, string> = {
  "current-full-export": "Current full export",
  "legacy-top-level-scenario": "Legacy top-level scenario",
  "raw-scenario": "Raw scenario",
  "legacy-house-categories": "Legacy house categories",
};

const CATEGORY_KEYS = ["property", "financing", "upfront", "rental", "exit"] as const;
const KNOWN_KEY_SET = new Set<string>(KNOWN_SCENARIO_KEYS);
const RECOGNITION_KEYS = new Set<string>(KNOWN_SCENARIO_KEYS.filter((key) => key !== "v"));

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readableMeta(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function hasRecognizedScenarioField(value: JsonObject): boolean {
  return Object.keys(value).some((key) => RECOGNITION_KEYS.has(key));
}

function flattenCategories(value: JsonObject): JsonObject {
  const flattened: JsonObject = {};
  for (const category of CATEGORY_KEYS) {
    const node = value[category];
    if (isObject(node)) Object.assign(flattened, node);
  }
  return flattened;
}

type DetectedImport = {
  format: ScenarioImportFormat;
  scenarioSource: JsonObject;
  metaSource: JsonObject;
  exportSource?: JsonObject;
  categoryCount?: number;
};

function detectImport(root: JsonObject, warnings: ScenarioImportIssue[]): DetectedImport | null {
  const house = isObject(root.house) ? root.house : null;

  if (house && isObject(house.scenario)) {
    if (isObject(root.scenario) && JSON.stringify(root.scenario) !== JSON.stringify(house.scenario)) {
      warnings.push({
        path: "scenario",
        message: "The duplicate top-level scenario differs; house.scenario will be imported.",
      });
    }
    return {
      format: "current-full-export",
      scenarioSource: house.scenario,
      metaSource: house,
      exportSource: root,
    };
  }

  if (isObject(root.scenario)) {
    return {
      format: "legacy-top-level-scenario",
      scenarioSource: root.scenario,
      metaSource: root,
      exportSource: root,
    };
  }

  const categoryRoot = house && hasHouseCategoryNodes(house) ? house : root;
  if (hasHouseCategoryNodes(categoryRoot)) {
    const categoryCount = CATEGORY_KEYS.filter((key) => isObject(categoryRoot[key])).length;
    return {
      format: "legacy-house-categories",
      scenarioSource: flattenCategories(categoryRoot),
      metaSource: house ?? root,
      categoryCount,
    };
  }

  if (hasRecognizedScenarioField(root)) {
    return {
      format: "raw-scenario",
      scenarioSource: root,
      metaSource: root,
    };
  }

  return null;
}

function buildVersionLabel(detected: DetectedImport): string {
  const labels: string[] = [];
  const exportVersion = detected.exportSource?.exportVersion;
  if (typeof exportVersion === "number") labels.push(`export v${exportVersion}`);
  const houseVersion = detected.metaSource.v;
  if (typeof houseVersion === "number" && detected.format === "current-full-export") {
    labels.push(`house v${houseVersion}`);
  }
  const scenarioVersion = detected.scenarioSource.v;
  labels.push(
    typeof scenarioVersion === "number" ? `scenario v${scenarioVersion}` : "scenario version not set"
  );
  return labels.join(" · ");
}

function buildKpis(before: AppPersisted, after: AppPersisted): ScenarioImportKpi[] {
  const previous = deriveScenario(before);
  const next = deriveScenario(after);
  return [
    {
      id: "purchasePrice",
      label: "Purchase price",
      before: previous.purchasePrice,
      after: next.purchasePrice,
      format: "currency",
    },
    {
      id: "monthlyPayment",
      label: "Monthly housing payment",
      before: previous.monthlyPayment.total,
      after: next.monthlyPayment.total,
      format: "currency",
    },
    {
      id: "cashToClose",
      label: "Net cash to close",
      before: previous.netCashToClose,
      after: next.netCashToClose,
      format: "currency",
    },
    {
      id: "rentalCashFlow",
      label: "Monthly rental cash flow",
      before: previous.rental.cashFlowMonthly,
      after: next.rental.cashFlowMonthly,
      format: "currency",
    },
  ];
}

export function parseScenarioImportText(
  text: string,
  currentScenario: AppPersisted
): ScenarioImportResult {
  const warnings: ScenarioImportIssue[] = [];
  if (!text.trim()) {
    return {
      status: "error",
      errors: [{ message: "Choose a JSON file or paste scenario JSON first." }],
      warnings,
    };
  }
  if (new TextEncoder().encode(text).byteLength > MAX_SCENARIO_IMPORT_BYTES) {
    return {
      status: "error",
      errors: [{ message: "Import is larger than the 5 MB safety limit." }],
      warnings,
    };
  }

  let rootValue: unknown;
  try {
    rootValue = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    return {
      status: "error",
      errors: [{ message: `Could not parse JSON: ${detail}` }],
      warnings,
    };
  }

  if (!isObject(rootValue)) {
    return {
      status: "error",
      errors: [{ message: "The import root must be a JSON object." }],
      warnings,
    };
  }

  const detected = detectImport(rootValue, warnings);
  if (!detected || !hasRecognizedScenarioField(detected.scenarioSource)) {
    return {
      status: "error",
      errors: [
        {
          message:
            "No supported scenario was found. Use a full export, a top-level scenario, a raw scenario, or legacy category maps.",
        },
      ],
      warnings,
    };
  }

  if (detected.format === "legacy-house-categories") {
    warnings.push({ message: "Legacy category sections will be folded into one current scenario." });
  }

  const validation = validatePropertyProScenario(rootValue);
  warnings.push(
    ...validation.issues
      .filter((issue) => issue.severity === "warning")
      .map(({ path, message }) => ({ path, message }))
  );
  const validationErrors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map(({ path, message }) => ({ path, message }));
  if (!validation.valid || validationErrors.length > 0 || !validation.repairedScenario) {
    return {
      status: "error",
      errors:
        validationErrors.length > 0
          ? validationErrors
          : [{ message: "The scenario could not be repaired safely." }],
      warnings,
    };
  }

  const suppliedKnown = Object.keys(detected.scenarioSource).filter((key) => KNOWN_KEY_SET.has(key));
  const missingKnown = KNOWN_SCENARIO_KEYS.length - suppliedKnown.length;
  if (missingKnown > 0) {
    warnings.push({
      message: `${missingKnown} current fields are absent and will use app defaults.`,
    });
  }

  const unknownFieldCount = Object.keys(detected.scenarioSource).filter(
    (key) => !KNOWN_KEY_SET.has(key)
  ).length;
  if (unknownFieldCount > 0) {
    warnings.push({
      message: `${unknownFieldCount} unknown future field${unknownFieldCount === 1 ? "" : "s"} will be preserved.`,
    });
  }

  const scenario = validation.repairedScenario;

  let kpis: ScenarioImportKpi[];
  try {
    kpis = buildKpis(currentScenario, scenario);
  } catch {
    return {
      status: "error",
      errors: [{ message: "The scenario could not be calculated safely for preview." }],
      warnings,
    };
  }

  const fieldCount = Object.keys(detected.scenarioSource).length;
  const nestedSectionCount = Object.values(detected.scenarioSource).filter(isObject).length;
  const houseId =
    readableMeta(detected.metaSource.id) ?? readableMeta(detected.metaSource.houseId);
  const houseName = readableMeta(detected.metaSource.name);

  return {
    status: "ready",
    scenario,
    preview: {
      houseId,
      houseName,
      format: detected.format,
      formatLabel: FORMAT_LABELS[detected.format],
      versionLabel: buildVersionLabel(detected),
      fieldCount,
      knownFieldCount: suppliedKnown.length,
      unknownFieldCount,
      sectionCount: detected.categoryCount ?? nestedSectionCount,
      kpis,
    },
    warnings,
    errors: [],
  };
}

export type ScenarioImportMode = "current" | "new";

export async function applyScenarioImport(
  result: ScenarioImportResult,
  options: { confirmed: boolean; mode: ScenarioImportMode },
  actions: {
    replaceCurrent: (scenario: AppPersisted) => void | Promise<void>;
    createNew: (scenario: AppPersisted, suggestedName: string | null) => void | Promise<void>;
  }
): Promise<boolean> {
  if (!options.confirmed || result.status !== "ready") return false;
  if (options.mode === "new") {
    await actions.createNew(result.scenario, result.preview.houseName);
  } else {
    await actions.replaceCurrent(result.scenario);
  }
  return true;
}
