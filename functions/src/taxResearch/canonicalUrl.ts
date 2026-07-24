import { normalizeAllowedUrl } from "./allowedUrls.js";

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

/**
 * Deterministic dedupe key for allowed https URLs.
 * Strips fragments and tracking params; lowercases host; trims trailing slashes.
 * Meaningful query params are preserved (sorted for stability).
 */
export function canonicalUrlDedupeKey(raw: unknown): string | null {
  const normalized = normalizeAllowedUrl(raw);
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
