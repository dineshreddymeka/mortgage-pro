import { getConfig } from "../config.js";
import { fetchJsonWithTimeout, heuristicInsuranceAnnual, pickNumber } from "./upstream.js";
import { suggestion, type CategoryEstimateProvider, type EstimateProviderContext } from "./types.js";

export const insuranceProvider: CategoryEstimateProvider = {
  id: "insurance",
  category: "insurance",
  async fetch(context: EstimateProviderContext) {
    const fetchedAt = new Date().toISOString();
    const config = getConfig();
    const price = Math.max(0, context.homePrice);
    let annual = heuristicInsuranceAnnual(price);
    let source = "server-heuristic";
    let confidence: "low" | "medium" | "high" = "low";
    let rationale = "Price-based heuristic when no insurance upstream is configured.";

    if (config.insuranceApiUrl) {
      const params = new URLSearchParams({ homePrice: String(price) });
      if (context.zipCode) params.set("zipCode", context.zipCode);
      const url = `${config.insuranceApiUrl}${config.insuranceApiUrl.includes("?") ? "&" : "?"}${params}`;
      const json = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "GET",
        apiKey: config.insuranceApiKey || undefined,
      });
      const upstream = pickNumber(json, ["annualPremium", "insuranceAnnual", "premiumAnnual"]);
      if (upstream !== null && upstream >= 0) {
        annual = Math.round(upstream);
        source = "upstream-insurance";
        confidence = "medium";
        rationale = "Proxied from configured insurance provider.";
      }
    }

    return [
      suggestion(
        {
          category: "insurance",
          targetField: "insuranceAnnual",
          label: "Homeowners insurance (annual)",
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
