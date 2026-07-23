import { boundTaxResearchSnapshot } from "./boundSnapshot.js";
import type { ExternalTaxResearchCollectionStatus, ExternalTaxResearchSnapshot } from "./types.js";

/** Reusable snapshot TTL defaults to server `CACHE_TTL_SECONDS` (6 hours). */
export const DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS = 21_600;

const REUSABLE_COLLECTION_STATUSES = new Set<ExternalTaxResearchCollectionStatus>(["complete", "partial"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function readExternalTaxResearchFromScenario(
  data: Record<string, unknown>
): ExternalTaxResearchSnapshot | null {
  const scenario = isPlainObject(data.scenario) ? data.scenario : null;
  if (!scenario) return null;

  const research = isPlainObject(scenario.research) ? scenario.research : null;
  if (!research) return null;

  const raw = research.externalTaxResearch;
  if (!isPlainObject(raw)) return null;
  if (typeof raw.collectionStatus !== "string" || typeof raw.collectedAt !== "string") {
    return null;
  }

  return raw as ExternalTaxResearchSnapshot;
}

export function isTaxResearchSnapshotFresh(
  snapshot: ExternalTaxResearchSnapshot,
  ttlSeconds: number,
  nowMs: number = Date.now()
): boolean {
  const collectedAtMs = Date.parse(snapshot.collectedAt);
  if (!Number.isFinite(collectedAtMs)) return false;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return false;
  return nowMs - collectedAtMs < ttlSeconds * 1000;
}

export function findReusableTaxResearchSnapshot(input: {
  scenarioData: Record<string, unknown>;
  addressFingerprint: string;
  ttlSeconds?: number;
  forceRefresh?: boolean;
  nowMs?: number;
}): ExternalTaxResearchSnapshot | null {
  if (input.forceRefresh) return null;

  const raw = readExternalTaxResearchFromScenario(input.scenarioData);
  if (!raw) return null;

  const snapshot = boundTaxResearchSnapshot(raw);
  if (!snapshot.addressFingerprint || snapshot.addressFingerprint !== input.addressFingerprint) {
    return null;
  }
  if (!REUSABLE_COLLECTION_STATUSES.has(snapshot.collectionStatus)) {
    return null;
  }

  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TAX_RESEARCH_SNAPSHOT_TTL_SECONDS;
  if (!isTaxResearchSnapshotFresh(snapshot, ttlSeconds, input.nowMs)) {
    return null;
  }

  return snapshot;
}
