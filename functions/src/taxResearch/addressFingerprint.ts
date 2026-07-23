import { createHash } from "node:crypto";

export type AddressFingerprintInput = {
  propertyAddress?: string;
  propertyPlaceId?: string;
  propertyPostalCode?: string;
};

const MAX_FINGERPRINT = 128;

function normalizePostal(raw: string | undefined): string {
  const trimmed = String(raw ?? "").trim();
  const match = trimmed.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? trimmed.toLowerCase().replace(/\s+/g, "");
}

function slugAddress(raw: string | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizePlaceId(raw: string | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Stable fingerprint for a property identity (postal + address + place id).
 * Format: `sha256:{postal}|{slug-address}|{placeId}` capped at 128 chars.
 */
export function computeAddressFingerprint(input: AddressFingerprintInput): string {
  const postal = normalizePostal(input.propertyPostalCode);
  const address = slugAddress(input.propertyAddress);
  const placeId = normalizePlaceId(input.propertyPlaceId);
  const parts = [postal, address, placeId].filter(Boolean);
  if (parts.length === 0) return "";

  const readable = `sha256:${parts.join("|")}`;
  if (readable.length <= MAX_FINGERPRINT) return readable;

  const digest = createHash("sha256").update(parts.join("|")).digest("hex");
  return `sha256:${digest}`.slice(0, MAX_FINGERPRINT);
}

/** True when stored scenario address fields align with the request fingerprint inputs. */
export function addressFingerprintMatchesScenario(
  request: AddressFingerprintInput,
  scenario: AddressFingerprintInput
): boolean {
  const scenarioHasIdentity =
    Boolean(scenario.propertyAddress?.trim()) ||
    Boolean(scenario.propertyPlaceId?.trim()) ||
    Boolean(scenario.propertyPostalCode?.trim());
  if (!scenarioHasIdentity) return true;
  return computeAddressFingerprint(request) === computeAddressFingerprint(scenario);
}
