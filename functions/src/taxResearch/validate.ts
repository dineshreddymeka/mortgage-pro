import type { CollectHouseTaxResearchRequest } from "./types.js";

export type TaxResearchValidationResult =
  | { ok: true; body: CollectHouseTaxResearchRequest }
  | { ok: false; status: number; error: string };

const MAX_DOC_ID = 128;
const MAX_STRING = 512;

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

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

export function validateCollectHouseTaxResearchBody(raw: unknown): TaxResearchValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }

  const data = raw as Record<string, unknown>;
  const propertyDocId = optionalString(data.propertyDocId, MAX_DOC_ID);
  if (!propertyDocId) {
    return { ok: false, status: 400, error: "propertyDocId is required and must be a non-empty string." };
  }

  const propertyAddress = optionalString(data.propertyAddress);
  if (data.propertyAddress !== undefined && data.propertyAddress !== null && data.propertyAddress !== "" && !propertyAddress) {
    return { ok: false, status: 400, error: "propertyAddress must be a string up to 512 characters." };
  }

  const propertyPlaceId = optionalString(data.propertyPlaceId, 120);
  if (data.propertyPlaceId !== undefined && data.propertyPlaceId !== null && data.propertyPlaceId !== "" && !propertyPlaceId) {
    return { ok: false, status: 400, error: "propertyPlaceId must be a string up to 120 characters." };
  }

  const propertyPostalCode = optionalString(data.propertyPostalCode, 10);
  if (
    data.propertyPostalCode !== undefined &&
    data.propertyPostalCode !== null &&
    data.propertyPostalCode !== "" &&
    !propertyPostalCode
  ) {
    return { ok: false, status: 400, error: "propertyPostalCode must be a string up to 10 characters." };
  }

  const propertyState = optionalString(data.propertyState, 2);
  if (data.propertyState !== undefined && data.propertyState !== null && data.propertyState !== "" && !propertyState) {
    return { ok: false, status: 400, error: "propertyState must be a two-letter state code." };
  }

  const propertyLatitude = optionalLatLng(data.propertyLatitude);
  if (data.propertyLatitude !== undefined && propertyLatitude === undefined) {
    return { ok: false, status: 400, error: "propertyLatitude must be a finite number or null." };
  }

  const propertyLongitude = optionalLatLng(data.propertyLongitude);
  if (data.propertyLongitude !== undefined && propertyLongitude === undefined) {
    return { ok: false, status: 400, error: "propertyLongitude must be a finite number or null." };
  }

  const persist = optionalBoolean(data.persist);
  const forceRefresh = optionalBoolean(data.forceRefresh);

  const hasIdentity =
    Boolean(propertyAddress) ||
    Boolean(propertyPlaceId) ||
    Boolean(propertyPostalCode) ||
    propertyLatitude != null ||
    propertyLongitude != null;
  if (!hasIdentity) {
    return {
      ok: false,
      status: 400,
      error: "Provide at least one property identity field (address, place id, postal code, or coordinates).",
    };
  }

  return {
    ok: true,
    body: {
      propertyDocId,
      ...(propertyAddress ? { propertyAddress } : {}),
      ...(propertyPlaceId ? { propertyPlaceId } : {}),
      ...(propertyPostalCode ? { propertyPostalCode } : {}),
      ...(propertyState ? { propertyState: propertyState.toUpperCase() } : {}),
      ...(propertyLatitude !== undefined ? { propertyLatitude } : {}),
      ...(propertyLongitude !== undefined ? { propertyLongitude } : {}),
      ...(persist !== undefined ? { persist } : {}),
      ...(forceRefresh !== undefined ? { forceRefresh } : {}),
    },
  };
}
