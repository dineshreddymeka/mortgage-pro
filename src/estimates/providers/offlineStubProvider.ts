import type { EstimateRequestContext, ExternalEstimateBundle, ExternalEstimateProvider, ExternalEstimateSuggestion } from "../types";

function suggestion(partial: Omit<ExternalEstimateSuggestion, "id" | "fetchedAt"> & { id?: string }, fetchedAt: string): ExternalEstimateSuggestion {
  return { ...partial, id: partial.id ?? `${partial.category}-${partial.targetField}`, fetchedAt };
}

export const offlineStubEstimateProvider: ExternalEstimateProvider = {
  id: "offline-stub",
  label: "Offline heuristics",
  isOfflineCapable: true,
  async fetchEstimates(context: EstimateRequestContext): Promise<ExternalEstimateBundle> {
    const fetchedAt = new Date().toISOString();
    const price = Math.max(0, context.homePrice);
    const taxRate = context.zipCode?.startsWith("9") ? 1.05 : 1.15;
    return {
      providerId: "offline-stub",
      fetchedAt,
      offline: true,
      suggestions: [
        suggestion({ category: "rate", targetField: "interestRateApr", label: "Market rate (stub)", value: 6.75, unit: "% APR", source: "offline-stub", confidence: "low" }, fetchedAt),
        suggestion({ category: "tax", targetField: "propertyTaxAnnual", label: "Property tax (stub)", value: Math.round((price * taxRate) / 100), unit: "USD / year", source: "offline-stub", confidence: "low" }, fetchedAt),
        suggestion({ category: "insurance", targetField: "insuranceAnnual", label: "Insurance (stub)", value: Math.round(Math.max(900, price * 0.0025)), unit: "USD / year", source: "offline-stub", confidence: "low" }, fetchedAt),
        suggestion({ category: "rent", targetField: "monthlyRent", label: "Market rent (stub)", value: Math.round(price * 0.0075), unit: "USD / month", source: "offline-stub", confidence: "low" }, fetchedAt),
        suggestion({ category: "comps", targetField: "currentHomeValue", label: "Value comp (stub)", value: Math.round(price * 1.02), unit: "USD", source: "offline-stub", confidence: "low" }, fetchedAt),
      ],
    };
  },
};

