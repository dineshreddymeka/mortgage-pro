import { getConfig } from "../config.js";

export async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit & { apiKey?: string } = {}
): Promise<T> {
  const config = getConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.apiKey) headers.set("Authorization", `Bearer ${init.apiKey}`);
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Upstream ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function heuristicTaxRatePercent(zipCode?: string): number {
  if (!zipCode) return 1.15;
  if (zipCode.startsWith("9")) return 1.05;
  if (zipCode.startsWith("07") || zipCode.startsWith("08")) return 2.2;
  if (zipCode.startsWith("33") || zipCode.startsWith("34")) return 1.8;
  return 1.15;
}

export function heuristicInsuranceAnnual(homePrice: number): number {
  return Math.round(Math.max(900, homePrice * 0.0025));
}

export function heuristicMonthlyRent(homePrice: number): number {
  return Math.round(homePrice * 0.0075);
}

export function heuristicMortgageApr(termYears?: number): number {
  return termYears && termYears <= 15 ? 6.25 : 6.75;
}

export function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
