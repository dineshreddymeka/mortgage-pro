import type { CollectHouseTaxResearchRequest } from "../../taxResearch/types.js";
import { buildCensusGeocoderUrl, normalizeStateCode } from "./catalogs.js";
import { safeFetchJson } from "./fetch.js";
import type { AdapterOutcome, GeocodeResolution } from "./types.js";

const ADAPTER_SOURCE = "census-geocoder";

const STATE_FIPS_TO_CODE: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};

type CensusGeographiesResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string;
      geographies?: {
        Counties?: Array<{
          NAME?: string;
          STATE?: string;
          COUNTY?: string;
        }>;
        States?: Array<{
          STUSAB?: string;
          STATE?: string;
        }>;
      };
    }>;
  };
};

function buildOneLineAddress(request: CollectHouseTaxResearchRequest): string | null {
  if (!request.propertyAddress?.trim()) return null;
  const parts: string[] = [request.propertyAddress.trim()];
  if (request.propertyState?.trim()) parts.push(request.propertyState.trim());
  if (request.propertyPostalCode?.trim()) parts.push(request.propertyPostalCode.trim());
  const oneLine = parts.join(", ");
  return oneLine.length >= 5 ? oneLine : null;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function resolveCountyViaCensusGeocoder(
  request: CollectHouseTaxResearchRequest,
  options: { timeoutMs?: number } = {}
): Promise<{ resolution?: GeocodeResolution; outcome: AdapterOutcome }> {
  const oneLine = buildOneLineAddress(request);
  if (!oneLine) {
    return {
      outcome: {
        references: [],
        provenanceSources: [],
        errors: [
          {
            code: "geocoder_address_missing",
            message: "Census Geocoder requires a street address with state or postal code.",
            source: ADAPTER_SOURCE,
            at: nowIso(),
          },
        ],
      },
    };
  }

  const sourceUrl = buildCensusGeocoderUrl(oneLine);
  const fetched = await safeFetchJson<CensusGeographiesResponse>(sourceUrl, {
    timeoutMs: options.timeoutMs,
    headers: { Accept: "application/json" },
  });

  if (!fetched.ok) {
    return {
      outcome: {
        references: [],
        provenanceSources: [sourceUrl],
        errors: [
          {
            code: fetched.result.error === "timeout" ? "geocoder_timeout" : "geocoder_fetch_failed",
            message: `Census Geocoder request failed (${fetched.result.error ?? "unknown"}).`,
            source: ADAPTER_SOURCE,
            at: nowIso(),
          },
        ],
      },
    };
  }

  const match = fetched.data.result?.addressMatches?.[0];
  const county = match?.geographies?.Counties?.[0];
  const state = match?.geographies?.States?.[0];
  if (!match || !county?.NAME) {
    return {
      outcome: {
        references: [],
        provenanceSources: [fetched.result.canonicalUrl],
        errors: [
          {
            code: "geocoder_no_match",
            message: "Census Geocoder could not match the property address to a county.",
            source: ADAPTER_SOURCE,
            at: nowIso(),
          },
        ],
      },
    };
  }

  const stateFips = county.STATE ?? state?.STATE;
  const stateCode =
    normalizeStateCode(state?.STUSAB) ??
    (stateFips ? STATE_FIPS_TO_CODE[stateFips.padStart(2, "0")] : undefined) ??
    normalizeStateCode(request.propertyState);

  const requestedState = normalizeStateCode(request.propertyState);
  const stateMismatch = Boolean(requestedState && stateCode && requestedState !== stateCode);

  const resolution: GeocodeResolution = {
    countyName: county.NAME,
    stateCode,
    stateFips: stateFips?.padStart(2, "0"),
    countyFips: county.COUNTY?.padStart(3, "0"),
    matchedAddress: match.matchedAddress,
    ...(stateMismatch ? { stateMismatch: true } : {}),
  };

  const errors: AdapterOutcome["errors"] = [];
  if (stateMismatch) {
    errors.push({
      code: "geocoder_state_mismatch",
      message: `Census Geocoder resolved ${stateCode}, but the request propertyState is ${requestedState}. County collection was skipped.`,
      source: ADAPTER_SOURCE,
      at: nowIso(),
    });
  }

  return {
    resolution,
    outcome: {
      references: [],
      provenanceSources: [fetched.result.canonicalUrl],
      errors,
    },
  };
}
