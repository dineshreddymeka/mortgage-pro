import { normalizeAllowedUrl } from "../../taxResearch/allowedUrls.js";
import type {
  ExternalTaxResearchCollectionStatus,
  ExternalTaxResearchError,
  ExternalTaxResearchReference,
} from "../../taxResearch/types.js";

function referenceKey(ref: ExternalTaxResearchReference): string {
  if (ref.normalizedKey) return ref.normalizedKey.toLowerCase();
  if (ref.url) {
    const normalized = normalizeAllowedUrl(ref.url);
    if (normalized) {
      try {
        const parsed = new URL(normalized);
        parsed.hash = "";
        return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      } catch {
        return normalized.toLowerCase();
      }
    }
  }
  return `${ref.jurisdiction ?? "unknown"}:${ref.topic}:${ref.id}`.toLowerCase();
}

export function dedupeReferences(references: ExternalTaxResearchReference[]): ExternalTaxResearchReference[] {
  const seen = new Set<string>();
  const deduped: ExternalTaxResearchReference[] = [];
  for (const ref of references) {
    const key = referenceKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  return deduped;
}

export function mergeErrors(...groups: ExternalTaxResearchError[][]): ExternalTaxResearchError[] {
  const seen = new Set<string>();
  const merged: ExternalTaxResearchError[] = [];
  for (const group of groups) {
    for (const error of group) {
      const key = `${error.code}:${error.message}:${error.source ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(error);
    }
  }
  return merged;
}

export function computeCollectionStatus(input: {
  references: ExternalTaxResearchReference[];
  errors: ExternalTaxResearchError[];
  attemptedAdapters: number;
  failedAdapters: number;
}): ExternalTaxResearchCollectionStatus {
  const { references, errors, attemptedAdapters, failedAdapters } = input;
  if (references.length === 0) {
    return failedAdapters > 0 || errors.length > 0 ? "failed" : "failed";
  }
  if (failedAdapters === 0 && errors.length === 0) return "complete";
  if (failedAdapters >= attemptedAdapters) return "failed";
  return "partial";
}
