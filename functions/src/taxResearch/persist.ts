import { getDb } from "../db.js";
import { boundTaxResearchSnapshot } from "./boundSnapshot.js";
import type { ExternalTaxResearchSnapshot } from "./types.js";

const PROPERTIES_COLLECTION = "properties";

type ScenarioRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Merge bounded external research while preserving manual research fields such as `taxIssues`. */
export function mergeResearchSnapshot(
  scenario: ScenarioRecord,
  snapshot: ExternalTaxResearchSnapshot
): ScenarioRecord {
  const research = isPlainObject(scenario.research) ? { ...scenario.research } : {};
  return {
    ...scenario,
    research: {
      ...research,
      externalTaxResearch: snapshot,
    },
  };
}

function bumpCollaborationMeta(
  prev: Record<string, unknown> | undefined,
  uid: string,
  nowIso: string
): Record<string, unknown> {
  const revision =
    typeof prev?.revision === "number" && Number.isFinite(prev.revision) ? Math.max(1, prev.revision + 1) : 1;
  return {
    revision,
    updatedAt: nowIso,
    updatedByUid: uid,
    editorSessionId: "server-tax-collector",
  };
}

/**
 * Persist bounded external tax research into `scenario.research.externalTaxResearch`.
 * Caller must verify property access before invoking.
 */
export async function persistExternalTaxResearchSnapshot(
  propertyDocId: string,
  uid: string,
  snapshot: ExternalTaxResearchSnapshot
): Promise<void> {
  const bounded = boundTaxResearchSnapshot(snapshot);
  const db = getDb();
  const ref = db.collection(PROPERTIES_COLLECTION).doc(propertyDocId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("House not found.");

    const data = snap.data() as Record<string, unknown>;
    const scenario = isPlainObject(data.scenario) ? { ...data.scenario } : null;
    if (!scenario) throw new Error("House scenario is missing.");

    const nextScenario = mergeResearchSnapshot(scenario, bounded);
    const nowIso = new Date().toISOString();
    const collaboration = bumpCollaborationMeta(
      isPlainObject(data.collaboration) ? (data.collaboration as Record<string, unknown>) : undefined,
      uid,
      nowIso
    );

    tx.update(ref, {
      scenario: nextScenario,
      collaboration,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    });
  });
}

export async function loadPropertyRecord(
  propertyDocId: string
): Promise<{ exists: true; data: Record<string, unknown> } | { exists: false }> {
  const snap = await getDb().collection(PROPERTIES_COLLECTION).doc(propertyDocId).get();
  if (!snap.exists) return { exists: false };
  return { exists: true, data: snap.data() as Record<string, unknown> };
}

export function readScenarioIdentity(data: Record<string, unknown>): {
  propertyAddress?: string;
  propertyPlaceId?: string;
  propertyPostalCode?: string;
} {
  const scenario = isPlainObject(data.scenario) ? data.scenario : {};
  return {
    propertyAddress: typeof scenario.propertyAddress === "string" ? scenario.propertyAddress : undefined,
    propertyPlaceId: typeof scenario.propertyPlaceId === "string" ? scenario.propertyPlaceId : undefined,
    propertyPostalCode:
      typeof scenario.propertyPostalCode === "string" ? scenario.propertyPostalCode : undefined,
  };
}
