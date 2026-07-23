import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { getConfig } from "../config.js";
import { verifyBearerToken } from "../http/auth.js";
import { applyCorsHeaders, isPreflight, resolveCorsOrigin } from "../http/cors.js";
import { clientIpFromHeaders, getRateLimiter, userIdFromHeaders } from "../http/rateLimit.js";
import {
  addressFingerprintMatchesScenario,
  computeAddressFingerprint,
} from "../taxResearch/addressFingerprint.js";
import { boundTaxResearchSnapshot } from "../taxResearch/boundSnapshot.js";
import { getTaxResearchCollector } from "../taxResearch/collector.js";
import {
  loadPropertyRecord,
  persistExternalTaxResearchSnapshot,
  readScenarioIdentity,
} from "../taxResearch/persist.js";
import { resolvePropertyAccess } from "../taxResearch/propertyAccess.js";
import type { CollectHouseTaxResearchResponse } from "../taxResearch/types.js";
import { validateCollectHouseTaxResearchBody } from "../taxResearch/validate.js";

type HandlerRequest = Pick<Request, "method" | "headers" | "body">;
type HandlerResponse = Pick<Response, "status" | "set" | "json" | "send" | "end">;

function headerRecord(headers: HandlerRequest["headers"]): Record<string, string | string[] | undefined> {
  return headers as Record<string, string | string[] | undefined>;
}

function writeJson(res: HandlerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  res.status(status);
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.set(key, value);
  }
  res.json(body);
}

async function readJsonBody(req: HandlerRequest): Promise<unknown> {
  if (req.body && typeof req.body === "object") return req.body;
  return {};
}

export async function handleCollectHouseTaxResearch(req: HandlerRequest, res: HandlerResponse): Promise<void> {
  const config = getConfig();
  const origin = resolveCorsOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined, config);
  const corsHeaders: Record<string, string> = {};
  applyCorsHeaders(corsHeaders, origin, config);

  if (isPreflight(req.method)) {
    if (!origin) {
      writeJson(res, 403, { ok: false, error: "Origin not allowed." }, corsHeaders);
      return;
    }
    res.status(204);
    for (const [key, value] of Object.entries(corsHeaders)) res.set(key, value);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, error: "Method not allowed. Use POST." }, corsHeaders);
    return;
  }

  if (!origin) {
    writeJson(res, 403, { ok: false, error: "Origin not allowed." }, corsHeaders);
    return;
  }

  const auth = await verifyBearerToken(req.headers.authorization);
  if (!auth) {
    writeJson(res, 401, { ok: false, error: "Missing or invalid Authorization Bearer token." }, corsHeaders);
    return;
  }

  const limiter = getRateLimiter(config);
  const ip = clientIpFromHeaders(headerRecord(req.headers));
  const headerUserId = userIdFromHeaders(headerRecord(req.headers));
  const limit = limiter.check(ip, headerUserId ?? auth.uid);
  if (!limit.allowed) {
    writeJson(
      res,
      429,
      { ok: false, error: "Rate limit exceeded." },
      { ...corsHeaders, "Retry-After": String(limit.retryAfterSeconds) }
    );
    return;
  }

  const parsed = validateCollectHouseTaxResearchBody(await readJsonBody(req));
  if (!parsed.ok) {
    writeJson(res, parsed.status, { ok: false, error: parsed.error }, corsHeaders);
    return;
  }

  const addressFingerprint = computeAddressFingerprint(parsed.body);
  if (!addressFingerprint) {
    writeJson(res, 400, { ok: false, error: "Could not derive address fingerprint from request." }, corsHeaders);
    return;
  }

  const property = await loadPropertyRecord(parsed.body.propertyDocId);
  if (!property.exists) {
    writeJson(res, 404, { ok: false, error: "House not found." }, corsHeaders);
    return;
  }

  const accessRole = resolvePropertyAccess(property.data, auth.uid);
  if (!accessRole) {
    writeJson(res, 403, { ok: false, error: "You do not have access to this house." }, corsHeaders);
    return;
  }

  const scenarioIdentity = readScenarioIdentity(property.data);
  if (!addressFingerprintMatchesScenario(parsed.body, scenarioIdentity)) {
    writeJson(
      res,
      409,
      { ok: false, error: "Request address identity does not match the saved property scenario." },
      corsHeaders
    );
    return;
  }

  const shouldPersist = parsed.body.persist !== false;
  const requestId = randomUUID();

  try {
    const collector = getTaxResearchCollector();
    const rawSnapshot = await collector.collect({
      request: parsed.body,
      addressFingerprint,
      requestId,
    });
    const snapshot = boundTaxResearchSnapshot({
      ...rawSnapshot,
      addressFingerprint,
      collectedAt: rawSnapshot.collectedAt || new Date().toISOString(),
    });

    let persisted = false;
    if (shouldPersist) {
      await persistExternalTaxResearchSnapshot(parsed.body.propertyDocId, auth.uid, snapshot);
      persisted = true;
    }

    const payload: CollectHouseTaxResearchResponse = {
      ok: true,
      snapshot,
      persisted,
      accessRole,
    };
    writeJson(res, 200, payload, corsHeaders);
  } catch (err) {
    writeJson(
      res,
      502,
      { ok: false, error: err instanceof Error ? err.message : "Tax research collection failed." },
      corsHeaders
    );
  }
}
