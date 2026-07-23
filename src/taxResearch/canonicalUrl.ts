/** Common tracking / session query params stripped for dedupe keys only. */
const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "msclkid",
  "mc_eid",
  "ref",
  "referrer",
]);

function isTrackingQueryParam(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_QUERY_PARAMS.has(lower);
}

function normalizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2_000) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Deterministic dedupe key for http(s) URLs.
 * Strips fragments and tracking params; lowercases host; trims trailing slashes.
 */
export function canonicalUrlDedupeKey(raw: unknown): string | null {
  const normalized = normalizeHttpUrl(raw);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();

    for (const key of [...parsed.searchParams.keys()]) {
      if (isTrackingQueryParam(key)) {
        parsed.searchParams.delete(key);
      }
    }

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }

    parsed.searchParams.sort();
    const query = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return null;
  }
}
