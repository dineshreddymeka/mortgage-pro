import type { ExternalEstimateBundle } from "./types";

export type EstimateCacheEntry = { key: string; bundle: ExternalEstimateBundle; expiresAt: number };

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_PREFIX = "mortgage-pro:estimate-cache:";

function stableKey(providerId: string, contextKey: string): string {
  return `${providerId}:${contextKey}`;
}

export class EstimateCache {
  private memory = new Map<string, EstimateCacheEntry>();
  constructor(private ttlMs = DEFAULT_TTL_MS, private persist = true) {}

  get(providerId: string, contextKey: string, now = Date.now()): ExternalEstimateBundle | null {
    const key = stableKey(providerId, contextKey);
    const fromMemory = this.memory.get(key);
    if (fromMemory && fromMemory.expiresAt > now) return fromMemory.bundle;
    if (this.persist && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as EstimateCacheEntry;
        if (parsed.expiresAt <= now) return null;
        this.memory.set(key, parsed);
        return parsed.bundle;
      } catch {
        return null;
      }
    }
    return null;
  }

  set(providerId: string, contextKey: string, bundle: ExternalEstimateBundle, now = Date.now()): void {
    const key = stableKey(providerId, contextKey);
    const entry: EstimateCacheEntry = { key, bundle, expiresAt: now + this.ttlMs };
    this.memory.set(key, entry);
    if (this.persist && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        /* quota */
      }
    }
  }

  clear(): void {
    this.memory.clear();
  }
}

export function contextCacheKey(ctx: { homePrice: number; zipCode?: string; propertyAddress?: string }): string {
  const priceBucket = Math.round(ctx.homePrice / 1000);
  const loc = (ctx.zipCode ?? ctx.propertyAddress ?? "unknown").toLowerCase().slice(0, 32);
  return `${priceBucket}:${loc}`;
}
