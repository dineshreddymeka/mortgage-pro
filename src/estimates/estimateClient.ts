import type { AppPersisted } from "../storage/mortgageState";
import { contextCacheKey, EstimateCache } from "./estimateCache";
import { isEstimateProxyConfigured, resolveEstimateProviders } from "./providers/index";
import type { EstimateRequestContext, ExternalEstimateBundle, ExternalEstimateSuggestion } from "./types";
import { buildEstimateContextFromScenario } from "./types";

let defaultCache: EstimateCache | null = null;

export type FetchExternalEstimatesOptions = {
  context?: EstimateRequestContext;
  preferOfflineOnly?: boolean;
  cache?: EstimateCache;
  bypassCache?: boolean;
};

export async function fetchExternalEstimates(state: AppPersisted, options: FetchExternalEstimatesOptions = {}): Promise<ExternalEstimateBundle[]> {
  const context = options.context ?? buildEstimateContextFromScenario(state);
  const cache = options.cache ?? (defaultCache ??= new EstimateCache());
  const cacheKey = contextCacheKey(context);
  const preferOfflineOnly = options.preferOfflineOnly ?? !isEstimateProxyConfigured();
  const bundles: ExternalEstimateBundle[] = [];

  for (const provider of resolveEstimateProviders(preferOfflineOnly)) {
    if (!options.bypassCache) {
      const cached = cache.get(provider.id, cacheKey);
      if (cached) {
        bundles.push(cached);
        if (!provider.isOfflineCapable) return bundles;
        continue;
      }
    }
    try {
      const bundle = await provider.fetchEstimates(context);
      cache.set(provider.id, cacheKey, bundle);
      bundles.push(bundle);
      if (!provider.isOfflineCapable) return bundles;
    } catch {
      if (!provider.isOfflineCapable) continue;
      throw new Error("Could not load estimate suggestions.");
    }
  }

  return bundles;
}

export function flattenEstimateSuggestions(bundles: ExternalEstimateBundle[]): ExternalEstimateSuggestion[] {
  const seen = new Set<string>();
  const out: ExternalEstimateSuggestion[] = [];
  for (const bundle of bundles) {
    for (const s of bundle.suggestions) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
  }
  return out;
}

export function resetEstimateClientCacheForTests(): void {
  defaultCache?.clear();
  defaultCache = null;
}
