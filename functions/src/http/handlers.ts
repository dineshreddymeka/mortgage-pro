import type { Request, Response } from "express";
import { getEstimateCache } from "../cache/ttlCache.js";
import { getConfig } from "../config.js";
import { applyCorsHeaders, isPreflight, resolveCorsOrigin } from "../http/cors.js";
import { clientIpFromHeaders, getRateLimiter, userIdFromHeaders } from "../http/rateLimit.js";
import { cacheKeyForBody, validateEstimateRequestBody } from "../http/validate.js";
import { categoryProviderByRoute, categoryProviders } from "../providers/index.js";
import type {
  CategoryEstimateProvider,
  EstimateBundleResponse,
  EstimateCategoryResponse,
  EstimateSuggestion,
} from "../providers/types.js";

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

export async function handleCategoryEstimate(
  req: HandlerRequest,
  res: HandlerResponse,
  routeKey: string
): Promise<void> {
  const config = getConfig();
  const origin = resolveCorsOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined, config);
  const corsHeaders: Record<string, string> = {};
  applyCorsHeaders(corsHeaders, origin, config);

  if (isPreflight(req.method)) {
    if (!origin) {
      writeJson(res, 403, { error: "Origin not allowed." }, corsHeaders);
      return;
    }
    res.status(204);
    for (const [key, value] of Object.entries(corsHeaders)) res.set(key, value);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { error: "Method not allowed. Use POST." }, corsHeaders);
    return;
  }

  if (!origin) {
    writeJson(res, 403, { error: "Origin not allowed." }, corsHeaders);
    return;
  }

  const provider = categoryProviderByRoute.get(routeKey);
  if (!provider) {
    writeJson(res, 404, { error: "Unknown estimate route." }, corsHeaders);
    return;
  }

  const limiter = getRateLimiter(config);
  const ip = clientIpFromHeaders(headerRecord(req.headers));
  const userId = userIdFromHeaders(headerRecord(req.headers));
  const limit = limiter.check(ip, userId);
  if (!limit.allowed) {
    writeJson(res, 429, { error: "Rate limit exceeded." }, { ...corsHeaders, "Retry-After": String(limit.retryAfterSeconds) });
    return;
  }

  const parsed = validateEstimateRequestBody(await readJsonBody(req));
  if (!parsed.ok) {
    writeJson(res, parsed.status, { error: parsed.error }, corsHeaders);
    return;
  }

  const cache = getEstimateCache(config.cacheTtlSeconds);
  const cacheKey = cacheKeyForBody(parsed.body, provider.category);
  const cached = cache.get(cacheKey) as EstimateCategoryResponse | null;
  if (cached) {
    writeJson(res, 200, cached, { ...corsHeaders, "X-Estimate-Cache": "HIT" });
    return;
  }

  try {
    const suggestions = await provider.fetch(parsed.body);
    const payload: EstimateCategoryResponse = {
      category: provider.category,
      suggestions,
      cached: false,
      provider: provider.id,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, payload);
    writeJson(res, 200, payload, { ...corsHeaders, "X-Estimate-Cache": "MISS" });
  } catch (err) {
    writeJson(
      res,
      502,
      { error: err instanceof Error ? err.message : "Upstream provider failed." },
      corsHeaders
    );
  }
}

export async function handleEstimateBundle(req: HandlerRequest, res: HandlerResponse): Promise<void> {
  const config = getConfig();
  const origin = resolveCorsOrigin(typeof req.headers.origin === "string" ? req.headers.origin : undefined, config);
  const corsHeaders: Record<string, string> = {};
  applyCorsHeaders(corsHeaders, origin, config);

  if (isPreflight(req.method)) {
    if (!origin) {
      writeJson(res, 403, { error: "Origin not allowed." }, corsHeaders);
      return;
    }
    res.status(204);
    for (const [key, value] of Object.entries(corsHeaders)) res.set(key, value);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { error: "Method not allowed. Use POST." }, corsHeaders);
    return;
  }

  if (!origin) {
    writeJson(res, 403, { error: "Origin not allowed." }, corsHeaders);
    return;
  }

  const limiter = getRateLimiter(config);
  const ip = clientIpFromHeaders(headerRecord(req.headers));
  const userId = userIdFromHeaders(headerRecord(req.headers));
  const limit = limiter.check(ip, userId);
  if (!limit.allowed) {
    writeJson(res, 429, { error: "Rate limit exceeded." }, { ...corsHeaders, "Retry-After": String(limit.retryAfterSeconds) });
    return;
  }

  const parsed = validateEstimateRequestBody(await readJsonBody(req));
  if (!parsed.ok) {
    writeJson(res, parsed.status, { error: parsed.error }, corsHeaders);
    return;
  }

  const cache = getEstimateCache(config.cacheTtlSeconds);
  const cacheKey = cacheKeyForBody(parsed.body, "bundle");
  const cached = cache.get(cacheKey) as EstimateBundleResponse | null;
  if (cached) {
    writeJson(res, 200, { ...cached, cached: true }, { ...corsHeaders, "X-Estimate-Cache": "HIT" });
    return;
  }

  try {
    const suggestions = await fetchAllSuggestions(categoryProviders, parsed.body);
    const payload: EstimateBundleResponse = {
      providerId: "server-proxy",
      fetchedAt: new Date().toISOString(),
      offline: suggestions.every((s) => s.source.includes("heuristic") || s.confidence === "low"),
      suggestions,
      cached: false,
    };
    cache.set(cacheKey, payload);
    writeJson(res, 200, payload, { ...corsHeaders, "X-Estimate-Cache": "MISS" });
  } catch (err) {
    writeJson(
      res,
      502,
      { error: err instanceof Error ? err.message : "Estimate bundle failed." },
      corsHeaders
    );
  }
}

async function fetchAllSuggestions(
  providers: CategoryEstimateProvider[],
  body: Parameters<CategoryEstimateProvider["fetch"]>[0]
): Promise<EstimateSuggestion[]> {
  const results = await Promise.all(providers.map((p) => p.fetch(body)));
  return results.flat();
}

export const estimateRouteKeys = [...categoryProviderByRoute.keys()] as const;
