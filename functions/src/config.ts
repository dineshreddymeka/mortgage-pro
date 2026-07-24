export type ServerConfig = {
  allowedOrigins: string[];
  rateLimitPerIp: number;
  rateLimitPerUser: number;
  upstreamTimeoutMs: number;
  cacheTtlSeconds: number;
  mortgageRatesApiUrl: string;
  mortgageRatesApiKey: string;
  propertyTaxApiUrl: string;
  propertyTaxApiKey: string;
  insuranceApiUrl: string;
  insuranceApiKey: string;
  rentEstimateApiUrl: string;
  rentEstimateApiKey: string;
  compsApiUrl: string;
  compsApiKey: string;
};

function intEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function listEnv(env: NodeJS.ProcessEnv, name: string, fallback: string[]): string[] {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function strEnv(env: NodeJS.ProcessEnv, name: string): string {
  return String(env[name] ?? "").trim();
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    allowedOrigins: listEnv(env, "ALLOWED_ORIGINS", [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://dineshreddymeka.github.io",
    ]),
    rateLimitPerIp: intEnv(env, "RATE_LIMIT_PER_IP", 60),
    rateLimitPerUser: intEnv(env, "RATE_LIMIT_PER_USER", 120),
    upstreamTimeoutMs: intEnv(env, "UPSTREAM_TIMEOUT_MS", 8000),
    cacheTtlSeconds: intEnv(env, "CACHE_TTL_SECONDS", 21600),
    mortgageRatesApiUrl: strEnv(env, "MORTGAGE_RATES_API_URL"),
    mortgageRatesApiKey: strEnv(env, "MORTGAGE_RATES_API_KEY"),
    propertyTaxApiUrl: strEnv(env, "PROPERTY_TAX_API_URL"),
    propertyTaxApiKey: strEnv(env, "PROPERTY_TAX_API_KEY"),
    insuranceApiUrl: strEnv(env, "INSURANCE_API_URL"),
    insuranceApiKey: strEnv(env, "INSURANCE_API_KEY"),
    rentEstimateApiUrl: strEnv(env, "RENT_ESTIMATE_API_URL"),
    rentEstimateApiKey: strEnv(env, "RENT_ESTIMATE_API_KEY"),
    compsApiUrl: strEnv(env, "COMPS_API_URL"),
    compsApiKey: strEnv(env, "COMPS_API_KEY"),
  };
}

let cached: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  cached ??= loadConfig();
  return cached;
}

export function resetConfigForTests(): void {
  cached = null;
}

export function setConfigForTests(config: ServerConfig): void {
  cached = config;
}
