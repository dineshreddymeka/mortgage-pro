import { isPlausibleShareToken } from "./shareToken";

/** Parse `#/share/{token}` from the location hash. */
export function parseShareTokenFromHash(hash: string): string | null {
  const trimmed = hash.trim();
  const match = trimmed.match(/^#\/share\/([^/?#]+)/);
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]).trim();
    return isPlausibleShareToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function isShareRouteHash(hash: string): boolean {
  return /^#\/share\//.test(hash.trim());
}
