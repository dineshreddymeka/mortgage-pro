const TOKEN_BYTES = 24;

export function generateShareToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isPlausibleShareToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.length >= 16 && trimmed.length <= 64 && /^[A-Za-z0-9_-]+$/.test(trimmed);
}
