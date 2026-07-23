import type { TaxResearchCollector, TaxResearchCollectorInput, TaxResearchCollectorResult } from "./types.js";

/**
 * Stub collector — subsequent work replaces this with real source adapters.
 * Returns a bounded pending snapshot without fetching external pages.
 */
export const stubTaxResearchCollector: TaxResearchCollector = {
  id: "stub-tax-collector",
  async collect(input: TaxResearchCollectorInput): Promise<TaxResearchCollectorResult> {
    return {
      collectionStatus: "pending",
      addressFingerprint: input.addressFingerprint,
      collectedAt: new Date().toISOString(),
      sourceProvenance: {
        provider: "stub-tax-collector",
        providerVersion: "0.0.0",
        requestId: input.requestId,
        sources: [],
      },
      normalizedReferences: [],
      errors: [
        {
          code: "collector_not_implemented",
          message: "External tax source adapters are not configured yet.",
          source: "stub-tax-collector",
          at: new Date().toISOString(),
        },
      ],
    };
  },
};

let activeCollector: TaxResearchCollector = stubTaxResearchCollector;

export function getTaxResearchCollector(): TaxResearchCollector {
  return activeCollector;
}

export function setTaxResearchCollectorForTests(collector: TaxResearchCollector): void {
  activeCollector = collector;
}

export function resetTaxResearchCollectorForTests(): void {
  activeCollector = stubTaxResearchCollector;
}
