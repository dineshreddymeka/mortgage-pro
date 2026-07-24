import { normalizeAllowedUrl } from "../../taxResearch/allowedUrls.js";
import type { SafeFetchResult } from "./types.js";

export const DEFAULT_FETCH_TIMEOUT_MS = 8_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 512_000;
export const DEFAULT_MAX_REDIRECTS = 5;

export type FetchFn = typeof fetch;

let fetchImpl: FetchFn = globalThis.fetch.bind(globalThis);

export function setFetchForTests(fn: FetchFn | null): void {
  fetchImpl = fn ?? globalThis.fetch.bind(globalThis);
}

export function resetFetchForTests(): void {
  fetchImpl = globalThis.fetch.bind(globalThis);
}

function canonicalizeUrl(raw: string): string | null {
  const normalized = normalizeAllowedUrl(raw);
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveRedirectLocation(currentUrl: string, location: string): string | null {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return null;
  }
}

type RedirectFetchResult =
  | { ok: true; response: Response; finalUrl: string; redirected: boolean }
  | { ok: false; finalUrl: string; status: number; error: string };

async function fetchWithValidatedRedirects(
  startUrl: string,
  init: RequestInit,
  maxRedirects: number
): Promise<RedirectFetchResult> {
  let currentUrl = startUrl;
  let redirected = false;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const res = await fetchImpl(currentUrl, { ...init, redirect: "manual" });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return { ok: false, finalUrl: currentUrl, status: res.status, error: "redirect_missing_location" };
      }

      const nextRaw = resolveRedirectLocation(currentUrl, location);
      if (!nextRaw) {
        return { ok: false, finalUrl: currentUrl, status: res.status, error: "redirect_invalid_location" };
      }

      const nextUrl = canonicalizeUrl(nextRaw);
      if (!nextUrl) {
        return { ok: false, finalUrl: currentUrl, status: res.status, error: "redirect_not_allowed" };
      }

      redirected = true;
      currentUrl = nextUrl;
      continue;
    }

    return { ok: true, response: res, finalUrl: currentUrl, redirected };
  }

  return { ok: false, finalUrl: currentUrl, status: 0, error: "redirect_limit_exceeded" };
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    const remaining = maxBytes - total;
    if (value.byteLength > remaining) {
      chunks.push(value.subarray(0, remaining));
      total = maxBytes;
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  try {
    await reader.cancel();
  } catch {
    // ignore cancel errors
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export async function safeFetchText(
  url: string,
  options: {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    method?: "GET" | "HEAD";
    headers?: Record<string, string>;
  } = {}
): Promise<SafeFetchResult> {
  const canonicalUrl = canonicalizeUrl(url);
  if (!canonicalUrl) {
    return {
      ok: false,
      url,
      canonicalUrl: url,
      status: 0,
      error: "url_not_allowed",
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const method = options.method ?? "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Accept")) {
      headers.set("Accept", "text/html,application/json,text/plain;q=0.9,*/*;q=0.1");
    }
    headers.set("User-Agent", "MortgagePro-TaxResearch/1.0 (+https://github.com)");

    const redirected = await fetchWithValidatedRedirects(
      canonicalUrl,
      {
        method,
        headers,
        signal: controller.signal,
      },
      maxRedirects
    );

    if (!redirected.ok) {
      return {
        ok: false,
        url: canonicalUrl,
        canonicalUrl: redirected.finalUrl,
        status: redirected.status,
        error: redirected.error,
        redirected: redirected.finalUrl !== canonicalUrl,
      };
    }

    const { response: res, finalUrl, redirected: wasRedirected } = redirected;

    if (method === "HEAD") {
      return {
        ok: res.ok,
        url: canonicalUrl,
        canonicalUrl: finalUrl,
        status: res.status,
        contentType: res.headers.get("content-type") ?? undefined,
        redirected: wasRedirected,
        ...(res.ok ? {} : { error: `http_${res.status}` }),
      };
    }

    const contentType = res.headers.get("content-type") ?? undefined;
    const text = res.ok ? await readLimitedText(res, maxBytes) : "";

    return {
      ok: res.ok,
      url: canonicalUrl,
      canonicalUrl: finalUrl,
      status: res.status,
      contentType,
      text,
      redirected: wasRedirected,
      ...(res.ok ? {} : { error: `http_${res.status}` }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    const error = message.toLowerCase().includes("abort") ? "timeout" : "fetch_failed";
    return {
      ok: false,
      url: canonicalUrl,
      canonicalUrl,
      status: 0,
      error,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function safeFetchJson<T>(
  url: string,
  options: {
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<{ ok: true; data: T; result: SafeFetchResult } | { ok: false; result: SafeFetchResult }> {
  const result = await safeFetchText(url, options);
  if (!result.ok || !result.text) {
    return { ok: false, result };
  }
  try {
    const data = JSON.parse(result.text) as T;
    return { ok: true, data, result };
  } catch {
    return {
      ok: false,
      result: { ...result, error: "invalid_json" },
    };
  }
}
