import type { ServerConfig } from "../config.js";

export function resolveCorsOrigin(origin: string | undefined, config: ServerConfig): string | null {
  if (!origin) return null;
  if (config.allowedOrigins.includes("*")) return origin;
  return config.allowedOrigins.includes(origin) ? origin : null;
}

export function applyCorsHeaders(
  headers: Record<string, string>,
  origin: string | null,
  config: ServerConfig
): void {
  if (!origin) return;
  headers["Access-Control-Allow-Origin"] = origin;
  headers["Vary"] = "Origin";
  headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type, X-Estimate-User-Id";
  headers["Access-Control-Max-Age"] = "86400";
  if (config.allowedOrigins.includes("*")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
}

export function isPreflight(method: string): boolean {
  return method.toUpperCase() === "OPTIONS";
}
