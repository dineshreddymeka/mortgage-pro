export type LocationCostEstimate = {
  stateCode: string;
  postalCode: string;
  suggestedPropertyTaxPercent: number;
  suggestedInsuranceAnnual: number;
  closingCostMultiplier: number;
  notes: string[];
};

const STATE_PROFILES: Record<string, { taxPct: number; insuranceAnnual: number; closingMultiplier: number; note?: string }> = {
  CA: { taxPct: 0.75, insuranceAnnual: 1400, closingMultiplier: 1.15 },
  TX: { taxPct: 1.8, insuranceAnnual: 2600, closingMultiplier: 1.05 },
  NJ: { taxPct: 2.47, insuranceAnnual: 1300, closingMultiplier: 1.18, note: "High property taxes" },
};

const DEFAULT: { taxPct: number; insuranceAnnual: number; closingMultiplier: number; note?: string } = { taxPct: 1.2, insuranceAnnual: 1400, closingMultiplier: 1 };
const HIGH_COST = new Set(["941", "100", "902"]);

export function normalizeStateCode(raw: string | undefined | null): string {
  const s = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : "";
}

export function normalizePostal(raw: string | undefined | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : digits;
}

export function estimateLocationCosts(stateCodeRaw: string | undefined | null, postalCodeRaw?: string | null): LocationCostEstimate {
  const stateCode = normalizeStateCode(stateCodeRaw);
  const postalCode = normalizePostal(postalCodeRaw);
  const profile = (stateCode && STATE_PROFILES[stateCode]) || DEFAULT;
  const notes = profile.note ? [profile.note] : [];
  let closingCostMultiplier = profile.closingMultiplier;
  let suggestedPropertyTaxPercent = profile.taxPct;
  if (postalCode.length >= 3 && HIGH_COST.has(postalCode.slice(0, 3))) {
    closingCostMultiplier *= 1.08;
    suggestedPropertyTaxPercent *= 1.05;
    notes.push("High-cost metro adjustment");
  }
  if (!stateCode) notes.push("Enter a 2-letter state for a tighter estimate");
  return { stateCode, postalCode, suggestedPropertyTaxPercent, suggestedInsuranceAnnual: profile.insuranceAnnual, closingCostMultiplier, notes };
}
