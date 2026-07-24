import { getConfig } from "../config.js";
import { fetchJsonWithTimeout, pickNumber } from "./upstream.js";
import { suggestion, type CategoryEstimateProvider, type EstimateProviderContext } from "./types.js";

export const compsProvider: CategoryEstimateProvider = {
  id: "comps-valuation",
  category: "comps",
  async fetch(context: EstimateProviderContext) {
    const fetchedAt = new Date().toISOString();
    const config = getConfig();
    const price = Math.max(0, context.homePrice);
    let value = Math.round(price * 1.02);
    let source = "server-heuristic";
    let confidence: "low" | "medium" | "high" = "low";
    let rationale = "Purchase-price comp placeholder when no valuation upstream is configured.";

    if (config.compsApiUrl) {
      const params = new URLSearchParams({ homePrice: String(price) });
      if (context.zipCode) params.set("zipCode", context.zipCode);
      if (context.propertyAddress) params.set("address", context.propertyAddress);
      const url = `${config.compsApiUrl}${config.compsApiUrl.includes("?") ? "&" : "?"}${params}`;
      const json = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "GET",
        apiKey: config.compsApiKey || undefined,
      });
      const upstream = pickNumber(json, ["value", "estimatedValue", "currentHomeValue", "avm"]);
      if (upstream !== null && upstream > 0) {
        value = Math.round(upstream);
        source = "upstream-comps";
        confidence = "medium";
        rationale = "Proxied from configured comps / valuation provider.";
      }
    }

    return [
      suggestion(
        {
          category: "comps",
          targetField: "currentHomeValue",
          label: "Estimated home value",
          value,
          unit: "USD",
          source,
          confidence,
          rationale,
        },
        fetchedAt
      ),
    ];
  },
};
