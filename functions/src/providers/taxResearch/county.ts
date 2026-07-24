import type { ExternalTaxResearchReference } from "../../taxResearch/types.js";
import { COUNTY_DIRECTORIES, normalizedUrlKey, normalizeStateCode } from "./catalogs.js";
import { extractPageMetadata } from "./extract.js";
import { safeFetchText } from "./fetch.js";
import type { AdapterOutcome, GeocodeResolution } from "./types.js";

const ADAPTER_SOURCE = "county-adapter";

function nowIso(): string {
  return new Date().toISOString();
}

export async function collectCountyReferences(
  resolution: GeocodeResolution | undefined,
  propertyState: string | undefined,
  options: { timeoutMs?: number } = {}
): Promise<AdapterOutcome> {
  const stateCode = normalizeStateCode(resolution?.stateCode) ?? normalizeStateCode(propertyState);
  const countyName = resolution?.countyName?.trim();
  const retrievedAt = nowIso();
  const references: ExternalTaxResearchReference[] = [];
  const provenanceSources: string[] = [];
  const errors: AdapterOutcome["errors"] = [];

  if (!stateCode) {
    return {
      references,
      provenanceSources,
      errors: [
        {
          code: "county_state_unresolved",
          message: "County collection requires a resolved or requested state code.",
          source: ADAPTER_SOURCE,
          at: retrievedAt,
        },
      ],
    };
  }

  const directory = COUNTY_DIRECTORIES[stateCode];
  if (!directory) {
    errors.push({
      code: "county_directory_unavailable",
      message: `No official county assessor directory is mapped for ${stateCode}.`,
      source: ADAPTER_SOURCE,
      at: retrievedAt,
    });
  } else {
    const fetched = await safeFetchText(directory.url, { timeoutMs: options.timeoutMs, method: "GET" });
    provenanceSources.push(fetched.canonicalUrl);
    const metadata = fetched.text ? extractPageMetadata(fetched.text) : undefined;
    references.push({
      id: `county-dir-${stateCode.toLowerCase()}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: metadata?.title ?? directory.title,
      url: fetched.ok ? fetched.canonicalUrl : directory.url,
      source: `${stateCode} County`,
      normalizedKey: normalizedUrlKey(directory.url),
      excerpt: metadata?.excerpt ?? directory.blurb,
      retrievedAt,
      linkStatus: fetched.ok ? (fetched.redirected ? "redirected" : "ok") : "broken",
    });
    if (!fetched.ok) {
      errors.push({
        code: "county_directory_fetch_failed",
        message: `Could not verify the official ${stateCode} county directory (${fetched.error ?? "unknown"}).`,
        source: ADAPTER_SOURCE,
        at: retrievedAt,
      });
    }
  }

  if (countyName) {
    references.push({
      id: `county-resolved-${stateCode.toLowerCase()}-${countyName.toLowerCase().replace(/\s+/g, "-")}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: `${countyName} County, ${stateCode} — local assessor lookup`,
      source: `${stateCode} · ${countyName}`,
      normalizedKey: `county:${stateCode}:${countyName.toLowerCase()}`,
      excerpt: directory
        ? `Resolved to ${countyName} County via Census Geocoder. Use the official ${stateCode} directory to open the assessor or appraisal district.`
        : `Resolved to ${countyName} County via Census Geocoder, but no deterministic county directory is mapped for ${stateCode}.`,
      retrievedAt,
      ...(directory ? { url: directory.url, linkStatus: references[0]?.linkStatus ?? "unknown" } : {}),
    });
    errors.push({
      code: "county_assessor_url_not_deterministic",
      message: `Resolved ${countyName} County, ${stateCode}, but per-county assessor URLs require lookup via the official state/county directory.`,
      source: ADAPTER_SOURCE,
      at: retrievedAt,
    });
  } else {
    errors.push({
      code: "county_name_unresolved",
      message: "County name was not resolved from the property address; only state-level directory links are available.",
      source: ADAPTER_SOURCE,
      at: retrievedAt,
    });
  }

  return { references, provenanceSources, errors };
}
