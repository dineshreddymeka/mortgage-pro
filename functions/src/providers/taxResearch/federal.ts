import type { ExternalTaxResearchReference } from "../../taxResearch/types.js";
import { normalizedUrlKey, FEDERAL_IRS_RESOURCES, FEDERAL_REGISTER_QUERIES, buildFederalRegisterApiUrl } from "./catalogs.js";
import { extractJsonFieldText } from "./extract.js";
import { safeFetchJson, safeFetchText } from "./fetch.js";
import type { AdapterOutcome } from "./types.js";

const ADAPTER_SOURCE = "federal-adapter";

type FederalRegisterResponse = {
  results?: Array<{
    document_number?: string;
    title?: string;
    abstract?: string;
    publication_date?: string;
    html_url?: string;
  }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

async function verifyIrsResource(
  spec: (typeof FEDERAL_IRS_RESOURCES)[number],
  timeoutMs?: number
): Promise<{ reference: ExternalTaxResearchReference; provenance: string; failed: boolean }> {
  const retrievedAt = nowIso();
  const fetched = await safeFetchText(spec.url, { timeoutMs, method: "HEAD" });
  const canonicalUrl = fetched.canonicalUrl;
  const linkStatus = fetched.ok ? (fetched.redirected ? "redirected" : "ok") : "broken";

  return {
    reference: {
      id: spec.id,
      topic: spec.topic,
      jurisdiction: "federal",
      title: spec.title,
      url: fetched.ok ? canonicalUrl : spec.url,
      source: spec.source,
      normalizedKey: normalizedUrlKey(spec.url),
      excerpt: spec.blurb,
      retrievedAt,
      linkStatus,
    },
    provenance: canonicalUrl,
    failed: !fetched.ok,
  };
}

async function fetchFederalRegisterTopic(
  query: (typeof FEDERAL_REGISTER_QUERIES)[number],
  timeoutMs?: number
): Promise<{ references: ExternalTaxResearchReference[]; provenance: string; failed: boolean }> {
  const sourceUrl = buildFederalRegisterApiUrl(query);
  const fetched = await safeFetchJson<FederalRegisterResponse>(sourceUrl, {
    timeoutMs,
    headers: { Accept: "application/json" },
  });
  if (!fetched.ok) {
    return { references: [], provenance: sourceUrl, failed: true };
  }

  const retrievedAt = nowIso();
  const references: ExternalTaxResearchReference[] = [];
  for (const doc of fetched.data.results ?? []) {
    const title = extractJsonFieldText(doc.title);
    const url = extractJsonFieldText(doc.html_url);
    const documentNumber = extractJsonFieldText(doc.document_number);
    if (!title || !url || !documentNumber) continue;
    references.push({
      id: `fr-${documentNumber}`,
      topic: query.topic,
      jurisdiction: "federal",
      title,
      url,
      source: "Federal Register",
      externalRefId: documentNumber,
      normalizedKey: `federalregister.gov:${documentNumber}`,
      ...(extractJsonFieldText(doc.abstract) ? { excerpt: extractJsonFieldText(doc.abstract) } : {}),
      ...(extractJsonFieldText(doc.publication_date) ? { publishedAt: extractJsonFieldText(doc.publication_date) } : {}),
      retrievedAt,
      linkStatus: "ok",
    });
  }

  return {
    references,
    provenance: fetched.result.canonicalUrl,
    failed: references.length === 0,
  };
}

export async function collectFederalReferences(options: { timeoutMs?: number } = {}): Promise<AdapterOutcome> {
  const retrievedAt = nowIso();
  const irsTasks = FEDERAL_IRS_RESOURCES.map((spec) => verifyIrsResource(spec, options.timeoutMs));
  const frTasks = FEDERAL_REGISTER_QUERIES.map((query) => fetchFederalRegisterTopic(query, options.timeoutMs));
  const [irsResults, frResults] = await Promise.all([Promise.all(irsTasks), Promise.all(frTasks)]);

  const references: ExternalTaxResearchReference[] = [];
  const provenanceSources: string[] = [];
  const errors: AdapterOutcome["errors"] = [];
  let failures = 0;

  for (const result of irsResults) {
    references.push(result.reference);
    provenanceSources.push(result.provenance);
    if (result.failed) failures += 1;
  }

  for (const result of frResults) {
    references.push(...result.references);
    provenanceSources.push(result.provenance);
    if (result.failed) failures += 1;
  }

  if (failures > 0) {
    errors.push({
      code: "federal_partial_fetch",
      message: `${failures} federal source request(s) failed; returned verified IRS links and available Federal Register results.`,
      source: ADAPTER_SOURCE,
      at: retrievedAt,
    });
  }

  return { references, provenanceSources, errors };
}
