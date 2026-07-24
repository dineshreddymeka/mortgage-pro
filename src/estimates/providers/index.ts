import type { ExternalEstimateProvider } from "../types";
import { isEstimateProxyConfigured, proxyEstimateProvider } from "./proxyEstimateProvider";
import { offlineStubEstimateProvider } from "./offlineStubProvider";

export const estimateProviders: ExternalEstimateProvider[] = [offlineStubEstimateProvider];

export function resolveEstimateProviders(preferOfflineOnly = true): ExternalEstimateProvider[] {
  const offline = estimateProviders.filter((p) => p.isOfflineCapable);
  if (preferOfflineOnly || !isEstimateProxyConfigured()) {
    return offline;
  }
  return [proxyEstimateProvider, ...offline];
}

export { offlineStubEstimateProvider, proxyEstimateProvider, isEstimateProxyConfigured };
