import type { EstimateRequestBody } from "../providers/types.js";

export type ValidationResult =
  | { ok: true; body: EstimateRequestBody }
  | { ok: false; status: number; error: string };

const MAX_HOME_PRICE = 100_000_000;
const MAX_STRING = 512;

function finiteNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function optionalString(value: unknown, maxLen = MAX_STRING): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) return undefined;
  return trimmed;
}

function optionalLatLng(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export function validateEstimateRequestBody(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const data = raw as Record<string, unknown>;
  const homePrice = finiteNumber(data.homePrice, 1, MAX_HOME_PRICE);
  if (homePrice === null) {
    return { ok: false, status: 400, error: "homePrice is required and must be between 1 and 100000000." };
  }

  const zipCode = optionalString(data.zipCode, 10);
  if (data.zipCode !== undefined && data.zipCode !== null && data.zipCode !== "" && !zipCode) {
    return { ok: false, status: 400, error: "zipCode must be a string up to 10 characters." };
  }

  const termYears = data.termYears === undefined ? undefined : finiteNumber(data.termYears, 1, 50);
  if (data.termYears !== undefined && termYears === null) {
    return { ok: false, status: 400, error: "termYears must be between 1 and 50." };
  }

  const downPaymentPercent =
    data.downPaymentPercent === undefined ? undefined : finiteNumber(data.downPaymentPercent, 0, 100);
  if (data.downPaymentPercent !== undefined && downPaymentPercent === null) {
    return { ok: false, status: 400, error: "downPaymentPercent must be between 0 and 100." };
  }

  const lat = optionalLatLng(data.propertyLatitude);
  if (data.propertyLatitude !== undefined && lat === undefined) {
    return { ok: false, status: 400, error: "propertyLatitude must be a finite number or null." };
  }
  const lng = optionalLatLng(data.propertyLongitude);
  if (data.propertyLongitude !== undefined && lng === undefined) {
    return { ok: false, status: 400, error: "propertyLongitude must be a finite number or null." };
  }

  return {
    ok: true,
    body: {
      homePrice,
      propertyAddress: optionalString(data.propertyAddress),
      propertyLatitude: lat,
      propertyLongitude: lng,
      zipCode,
      termYears: termYears ?? undefined,
      downPaymentPercent: downPaymentPercent ?? undefined,
    },
  };
}

export function cacheKeyForBody(body: EstimateRequestBody, category: string): string {
  const priceBucket = Math.round(body.homePrice / 1000);
  const loc = (body.zipCode ?? body.propertyAddress ?? "unknown").toLowerCase().slice(0, 32);
  const term = body.termYears ?? 30;
  const down = body.downPaymentPercent ?? 20;
  return `${category}:${priceBucket}:${loc}:${term}:${down}`;
}
