import { productionTaxResearchCollector } from "../providers/taxResearch/collector.js";
import type { TaxResearchCollector, TaxResearchCollectorInput, TaxResearchCollectorResult } from "./types.js";

/**
 * Stub collector — kept for tests and explicit fallback wiring.
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

let activeCollector: TaxResearchCollector = productionTaxResearchCollector;

export function getTaxResearchCollector(): TaxResearchCollector {
  return activeCollector;
}

export function setTaxResearchCollectorForTests(collector: TaxResearchCollector): void {
  activeCollector = collector;
}

export function resetTaxResearchCollectorForTests(): void {
  activeCollector = productionTaxResearchCollector;
}
