import type { ExternalTaxResearchReference } from "../../taxResearch/types.js";
import { normalizedUrlKey, normalizeStateCode, STATE_PORTALS } from "./catalogs.js";
import { extractPageMetadata } from "./extract.js";
import { safeFetchText } from "./fetch.js";
import type { AdapterOutcome } from "./types.js";

const ADAPTER_SOURCE = "state-adapter";

function nowIso(): string {
  return new Date().toISOString();
}

export async function collectStateReferences(
  propertyState: string | undefined,
  options: { timeoutMs?: number } = {}
): Promise<AdapterOutcome> {
  const stateCode = normalizeStateCode(propertyState);
  if (!stateCode) {
    return {
      references: [],
      provenanceSources: [],
      errors: [
        {
          code: "state_code_missing",
          message: "propertyState is required to select an official state revenue portal.",
          source: ADAPTER_SOURCE,
          at: nowIso(),
        },
      ],
    };
  }

  const portal = STATE_PORTALS[stateCode];
  if (!portal) {
    return {
      references: [],
      provenanceSources: [],
      errors: [
        {
          code: "state_portal_unmapped",
          message: `No official state revenue portal is mapped for ${stateCode}.`,
          source: ADAPTER_SOURCE,
          at: nowIso(),
        },
      ],
    };
  }

  const fetched = await safeFetchText(portal.url, { timeoutMs: options.timeoutMs, method: "GET" });
  const metadata = fetched.text ? extractPageMetadata(fetched.text) : undefined;
  const retrievedAt = nowIso();
  const reference: ExternalTaxResearchReference = {
    id: `state-${stateCode.toLowerCase()}`,
    topic: "state_local",
    jurisdiction: "state",
    title: metadata?.title ?? portal.title,
    url: fetched.ok ? fetched.canonicalUrl : portal.url,
    source: stateCode,
    normalizedKey: normalizedUrlKey(portal.url),
    excerpt: metadata?.excerpt ?? portal.blurb,
    retrievedAt,
    linkStatus: fetched.ok ? (fetched.redirected ? "redirected" : "ok") : "broken",
  };

  const errors: AdapterOutcome["errors"] = [];
  if (!fetched.ok) {
    errors.push({
      code: "state_portal_fetch_failed",
      message: `Could not verify the official ${stateCode} portal (${fetched.error ?? "unknown"}).`,
      source: ADAPTER_SOURCE,
      at: retrievedAt,
    });
  }

  return {
    references: [reference],
    provenanceSources: [fetched.canonicalUrl],
    errors,
  };
}
