const ALLOWED_HOST_SUFFIXES = [
  ".gov",
  ".mil",
  ".edu",
] as const;

const ALLOWED_EXACT_HOSTS = new Set([
  "www.irs.gov",
  "irs.gov",
]);

/**
 * Reject arbitrary URLs — only https links to official / curated hosts are permitted.
 * Returns the normalized URL or null when rejected.
 */
export function normalizeAllowedUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2_000) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();
  if (ALLOWED_EXACT_HOSTS.has(host)) return parsed.toString();
  if (ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return parsed.toString();

  return null;
}

export function isAllowedUrl(raw: unknown): raw is string {
  return normalizeAllowedUrl(raw) != null;
}
