import { getConfig } from "../../config.js";
import { canonicalUrlDedupeKey } from "../../taxResearch/canonicalUrl.js";
import type {
  TaxResearchCollector,
  TaxResearchCollectorInput,
  TaxResearchCollectorResult,
} from "../../taxResearch/types.js";
import { collectCountyReferences } from "./county.js";
import { collectFederalReferences } from "./federal.js";
import { resolveCountyViaCensusGeocoder } from "./geocoder.js";
import { computeCollectionStatus, dedupeReferences, mergeErrors } from "./normalize.js";
import { collectStateReferences } from "./state.js";

export const PRODUCTION_TAX_RESEARCH_PROVIDER_VERSION = "1.0.0";

function perRequestTimeoutMs(): number {
  return Math.min(getConfig().upstreamTimeoutMs, 8_000);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of urls) {
    const key = canonicalUrlDedupeKey(url) ?? url.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(url);
  }
  return deduped;
}

export const productionTaxResearchCollector: TaxResearchCollector = {
  id: "official-tax-research-collector",
  async collect(input: TaxResearchCollectorInput): Promise<TaxResearchCollectorResult> {
    const collectedAt = new Date().toISOString();
    const timeoutMs = perRequestTimeoutMs();
    const { request, addressFingerprint, requestId } = input;

    const [geocoderResult, federalOutcome, stateOutcome] = await Promise.all([
      resolveCountyViaCensusGeocoder(request, { timeoutMs }),
      collectFederalReferences({ timeoutMs }),
      collectStateReferences(request.propertyState, { timeoutMs }),
    ]);

    const skipCounty = geocoderResult.resolution?.stateMismatch === true;
    const countyOutcome = skipCounty
      ? { references: [], provenanceSources: [], errors: [] }
      : await collectCountyReferences(geocoderResult.resolution, request.propertyState, {
          timeoutMs,
        });

    const normalizedReferences = dedupeReferences([
      ...countyOutcome.references,
      ...stateOutcome.references,
      ...federalOutcome.references,
    ]);

    const errors = mergeErrors(
      geocoderResult.outcome.errors,
      federalOutcome.errors,
      stateOutcome.errors,
      countyOutcome.errors
    );

    const geocoderFailed = geocoderResult.outcome.errors.length > 0;
    const federalFailed = federalOutcome.references.length === 0;
    const stateFailed = stateOutcome.references.length === 0;
    const countyFailed =
      !skipCounty &&
      countyOutcome.references.length === 0 &&
      countyOutcome.errors.some((error) => error.code !== "county_assessor_url_not_deterministic");

    const attemptedAdapters = 4;
    const failedAdapters = [geocoderFailed, federalFailed, stateFailed, countyFailed].filter(Boolean).length;

    const provenanceSources = dedupeUrls([
      ...geocoderResult.outcome.provenanceSources,
      ...federalOutcome.provenanceSources,
      ...stateOutcome.provenanceSources,
      ...countyOutcome.provenanceSources,
    ]);

    return {
      collectionStatus: computeCollectionStatus({
        references: normalizedReferences,
        errors,
        attemptedAdapters,
        failedAdapters,
      }),
      addressFingerprint,
      collectedAt,
      sourceProvenance: {
        provider: productionTaxResearchCollector.id,
        providerVersion: PRODUCTION_TAX_RESEARCH_PROVIDER_VERSION,
        requestId,
        sources: provenanceSources,
      },
      normalizedReferences,
      ...(errors.length ? { errors } : {}),
    };
  },
};
