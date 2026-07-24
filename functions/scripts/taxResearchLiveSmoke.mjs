#!/usr/bin/env node
/**
 * Opt-in live smoke for official tax research adapters.
 * NOT run in CI — requires built functions output, explicit --network, and --address.
 *
 * Usage:
 *   npm run build
 *   node scripts/taxResearchLiveSmoke.mjs --network --address "123 Main St, San Francisco, CA" --state CA --postal 94107
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = join(SCRIPT_DIR, "..");
const COLLECTOR_PATH = join(FUNCTIONS_ROOT, "lib/providers/taxResearch/collector.js");
const FINGERPRINT_PATH = join(FUNCTIONS_ROOT, "lib/taxResearch/addressFingerprint.js");

function usage(exitCode = 1) {
  console.error(`Live tax research adapter smoke (official HTTPS sources only).

Requires:
  1. npm run build   (imports from functions/lib)
  2. --network       explicit opt-in to outbound requests
  3. --address       property address string

Optional:
  --state <code>     two-letter state (recommended)
  --postal <zip>     ZIP / postal code
  --place-id <id>    Google place id

Example:
  npm run build
  node scripts/taxResearchLiveSmoke.mjs --network --address "123 Main St, San Francisco, CA" --state CA --postal 94107
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const parsed = {
    network: false,
    address: "",
    state: undefined,
    postal: undefined,
    placeId: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--network") {
      parsed.network = true;
      continue;
    }
    if (arg === "--address") {
      parsed.address = String(argv[++i] ?? "").trim();
      continue;
    }
    if (arg === "--state") {
      parsed.state = String(argv[++i] ?? "").trim().toUpperCase();
      continue;
    }
    if (arg === "--postal") {
      parsed.postal = String(argv[++i] ?? "").trim();
      continue;
    }
    if (arg === "--place-id") {
      parsed.placeId = String(argv[++i] ?? "").trim();
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage(0);
    }
    console.error(`Unknown argument: ${arg}`);
    usage(1);
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.network) {
    console.error("Refusing to run without --network (live outbound HTTPS to official sources).");
    usage(1);
  }
  if (!args.address) {
    console.error("Missing required --address.");
    usage(1);
  }
  if (!existsSync(COLLECTOR_PATH) || !existsSync(FINGERPRINT_PATH)) {
    console.error(`Missing build output. Run \`npm run build\` in ${FUNCTIONS_ROOT} first.`);
    console.error(`Expected: ${COLLECTOR_PATH}`);
    process.exit(1);
  }

  const { productionTaxResearchCollector } = await import(COLLECTOR_PATH);
  const { computeAddressFingerprint } = await import(FINGERPRINT_PATH);

  const request = {
    propertyDocId: "live-smoke-doc",
    propertyAddress: args.address,
    ...(args.state ? { propertyState: args.state } : {}),
    ...(args.postal ? { propertyPostalCode: args.postal } : {}),
    ...(args.placeId ? { propertyPlaceId: args.placeId } : {}),
    persist: false,
    forceRefresh: true,
  };

  const addressFingerprint = computeAddressFingerprint(request);
  if (!addressFingerprint) {
    console.error("Could not derive address fingerprint from provided identity fields.");
    process.exit(1);
  }

  console.error("Starting live collection (real network)…");
  const started = Date.now();
  const result = await productionTaxResearchCollector.collect({
    request,
    addressFingerprint,
    requestId: randomUUID(),
  });
  const elapsedMs = Date.now() - started;

  const summary = {
    ok: result.collectionStatus === "complete" || result.collectionStatus === "partial",
    elapsedMs,
    collectionStatus: result.collectionStatus,
    referenceCount: result.normalizedReferences?.length ?? 0,
    errorCount: result.errors?.length ?? 0,
    jurisdictions: [...new Set((result.normalizedReferences ?? []).map((ref) => ref.jurisdiction).filter(Boolean))],
    provenanceSources: result.sourceProvenance?.sources ?? [],
    errors: result.errors?.map((error) => ({ code: error.code, message: error.message })) ?? [],
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
