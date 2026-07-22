import { getConfig } from "../config.js";
import { fetchJsonWithTimeout, heuristicMortgageApr, pickNumber } from "./upstream.js";
import { suggestion, type CategoryEstimateProvider, type EstimateProviderContext } from "./types.js";

export const mortgageRatesProvider: CategoryEstimateProvider = {
  id: "mortgage-rates",
  category: "rate",
  async fetch(context: EstimateProviderContext) {
    const fetchedAt = new Date().toISOString();
    const config = getConfig();
    let apr = heuristicMortgageApr(context.termYears);
    let source = "server-heuristic";
    let confidence: "low" | "medium" | "high" = "low";
    let rationale = "Heuristic market rate placeholder when no upstream is configured.";

    if (config.mortgageRatesApiUrl) {
      const params = new URLSearchParams({
        homePrice: String(context.homePrice),
        termYears: String(context.termYears ?? 30),
        downPaymentPercent: String(context.downPaymentPercent ?? 20),
      });
      if (context.zipCode) params.set("zipCode", context.zipCode);
      const url = `${config.mortgageRatesApiUrl}${config.mortgageRatesApiUrl.includes("?") ? "&" : "?"}${params}`;
      const json = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "GET",
        apiKey: config.mortgageRatesApiKey || undefined,
      });
      const upstream = pickNumber(json, ["apr", "rate", "interestRateApr"]);
      if (upstream !== null && upstream > 0 && upstream < 30) {
        apr = upstream;
        source = "upstream-mortgage-rates";
        confidence = "medium";
        rationale = "Proxied from configured mortgage rates provider.";
      }
    }

    return [
      suggestion(
        {
          category: "rate",
          targetField: "interestRateApr",
          label: "Market mortgage rate",
          value: apr,
          unit: "% APR",
          source,
          confidence,
          rationale,
        },
        fetchedAt
      ),
    ];
  },
};
