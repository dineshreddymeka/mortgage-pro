import { getConfig } from "../config.js";
import { fetchJsonWithTimeout, heuristicTaxRatePercent, pickNumber } from "./upstream.js";
import { suggestion, type CategoryEstimateProvider, type EstimateProviderContext } from "./types.js";

export const propertyTaxProvider: CategoryEstimateProvider = {
  id: "property-tax",
  category: "tax",
  async fetch(context: EstimateProviderContext) {
    const fetchedAt = new Date().toISOString();
    const config = getConfig();
    const price = Math.max(0, context.homePrice);
    let annual = Math.round((price * heuristicTaxRatePercent(context.zipCode)) / 100);
    let source = "server-heuristic";
    let confidence: "low" | "medium" | "high" = "low";
    let rationale = "Zip-aware heuristic when no property tax upstream is configured.";

    if (config.propertyTaxApiUrl) {
      const params = new URLSearchParams({ homePrice: String(price) });
      if (context.zipCode) params.set("zipCode", context.zipCode);
      if (context.propertyAddress) params.set("address", context.propertyAddress);
      const url = `${config.propertyTaxApiUrl}${config.propertyTaxApiUrl.includes("?") ? "&" : "?"}${params}`;
      const json = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "GET",
        apiKey: config.propertyTaxApiKey || undefined,
      });
      const upstream = pickNumber(json, ["annualTax", "taxAnnual", "propertyTaxAnnual"]);
      if (upstream !== null && upstream >= 0) {
        annual = Math.round(upstream);
        source = "upstream-property-tax";
        confidence = "medium";
        rationale = "Proxied from configured property tax provider.";
      }
    }

    return [
      suggestion(
        {
          category: "tax",
          targetField: "propertyTaxAnnual",
          label: "Property tax (annual)",
          value: annual,
          unit: "USD / year",
          source,
          confidence,
          rationale,
        },
        fetchedAt
      ),
    ];
  },
};
