/**
 * Single source of truth under each house:
 *
 *   { id: "001", name, archived, scenario: AppPersisted }
 *
 * - `id` — business house id (`001`, `002`, …)
 * - `scenario` — one object with every tab / reusable-panel input (no field loss)
 *
 * Do not split inputs across many top-level maps. Category UI is presentation only.
 * Older docs that stored `property` / `financing` / … maps are still readable and
 * folded back into `scenario` on load.
 */
import {
  defaultAppState,
  mergeParsedWithSchemaDefaults,
  type AppPersisted,
} from "./mortgageState";

export const HOUSE_TREE_VERSION = 3 as const;

/** House root for export / docs — meta + one scenario blob. */
export type HouseRootExport = {
  /** Business house id — root identity (`001`, `002`, …). */
  id: string;
  v: typeof HOUSE_TREE_VERSION;
  houseNumber?: number;
  name?: string;
  /** All tab inputs — single point of truth (reuse these fields; don’t fork copies). */
  scenario: AppPersisted;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Legacy intermediate shape (category maps on the house doc). */
export function hasHouseCategoryNodes(data: Record<string, unknown>): boolean {
  return (
    isPlainObject(data.property) ||
    isPlainObject(data.financing) ||
    isPlainObject(data.upfront) ||
    isPlainObject(data.rental) ||
    isPlainObject(data.exit)
  );
}

/** Fold legacy category maps into flat AppPersisted (read-only migration helper). */
export function unpackHouseCategories(tree: Record<string, unknown>): AppPersisted {
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
 * Prefer `scenario` (canonical). Fall back to legacy category maps if needed.
 */
export function resolveScenarioFromHouseDoc(data: Record<string, unknown>): AppPersisted | null {
  if (isPlainObject(data.scenario)) {
    return mergeParsedWithSchemaDefaults(data.scenario as AppPersisted);
  }
  if (hasHouseCategoryNodes(data)) {
    return unpackHouseCategories(data);
  }
  return null;
}

/** Top-level category map keys to clear when rewriting to the single-scenario shape. */
export const LEGACY_CATEGORY_KEYS = ["property", "financing", "upfront", "rental", "exit"] as const;

/** House root: id + one scenario (all inputs preserved, no duplicated category trees). */
export function buildHouseRoot(
  state: AppPersisted,
  meta?: {
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
    scenario: state,
  };
}
