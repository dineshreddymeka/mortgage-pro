export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number) {}

  get(key: string, now = Date.now()): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

let defaultCache: TtlCache<unknown> | null = null;

export function getEstimateCache(ttlSeconds: number): TtlCache<unknown> {
  defaultCache ??= new TtlCache<unknown>(ttlSeconds * 1000);
  return defaultCache;
}

export function resetEstimateCacheForTests(): void {
  defaultCache = null;
}
