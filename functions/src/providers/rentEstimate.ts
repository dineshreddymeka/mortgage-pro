import { getConfig } from "../config.js";
import { fetchJsonWithTimeout, heuristicMonthlyRent, pickNumber } from "./upstream.js";
import { suggestion, type CategoryEstimateProvider, type EstimateProviderContext } from "./types.js";

export const rentEstimateProvider: CategoryEstimateProvider = {
  id: "rent-estimate",
  category: "rent",
  async fetch(context: EstimateProviderContext) {
    const fetchedAt = new Date().toISOString();
    const config = getConfig();
    const price = Math.max(0, context.homePrice);
    let monthly = heuristicMonthlyRent(price);
    let source = "server-heuristic";
    let confidence: "low" | "medium" | "high" = "low";
    let rationale = "Price-ratio heuristic when no rent upstream is configured.";

    if (config.rentEstimateApiUrl) {
      const params = new URLSearchParams({ homePrice: String(price) });
      if (context.zipCode) params.set("zipCode", context.zipCode);
      if (context.propertyAddress) params.set("address", context.propertyAddress);
      const url = `${config.rentEstimateApiUrl}${config.rentEstimateApiUrl.includes("?") ? "&" : "?"}${params}`;
      const json = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "GET",
        apiKey: config.rentEstimateApiKey || undefined,
      });
      const upstream = pickNumber(json, ["monthlyRent", "rent", "estimatedRent"]);
      if (upstream !== null && upstream >= 0) {
        monthly = Math.round(upstream);
        source = "upstream-rent";
        confidence = "medium";
        rationale = "Proxied from configured rent estimate provider.";
      }
    }

    return [
      suggestion(
        {
          category: "rent",
          targetField: "monthlyRent",
          label: "Market rent (monthly)",
          value: monthly,
          unit: "USD / month",
          source,
          confidence,
          rationale,
        },
        fetchedAt
      ),
    ];
  },
};
