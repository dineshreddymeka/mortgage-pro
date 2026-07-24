import type { AppPersisted } from "../storage/mortgageState";
import type { ExternalEstimateSuggestion, EstimateTargetField } from "./types";

export type ApplyExternalEstimateResult = {
  nextState: AppPersisted;
  applied: ExternalEstimateSuggestion[];
  skipped: ExternalEstimateSuggestion[];
};

const ALLOWED = new Set<EstimateTargetField>([
  "interestRateApr",
  "propertyTaxAnnual",
  "propertyTaxPercent",
  "insuranceAnnual",
  "monthlyRent",
  "currentHomeValue",
  "sellAnnualAppreciationPercent",
]);

function syncTax(state: AppPersisted, mode: "annual" | "percent"): AppPersisted {
  const hp = Math.max(0, state.homePrice);
  if (hp <= 0) return state;
  return mode === "annual"
    ? { ...state, propertyTaxPercent: (Math.max(0, state.propertyTaxAnnual) / hp) * 100 }
    : { ...state, propertyTaxAnnual: Math.round((hp * Math.max(0, state.propertyTaxPercent)) / 100) };
}

function applyField(state: AppPersisted, field: EstimateTargetField, value: number): AppPersisted {
  switch (field) {
    case "interestRateApr":
      return { ...state, interestRateApr: Math.max(0, value) };
    case "propertyTaxAnnual":
      return syncTax({ ...state, propertyTaxAnnual: Math.max(0, value) }, "annual");
    case "propertyTaxPercent":
      return syncTax({ ...state, propertyTaxPercent: Math.max(0, value) }, "percent");
    case "insuranceAnnual":
      return { ...state, insuranceAnnual: Math.max(0, value) };
    case "monthlyRent":
      return { ...state, monthlyRent: Math.max(0, value) };
    case "currentHomeValue":
      return { ...state, currentHomeValue: Math.max(0, value) };
    case "sellAnnualAppreciationPercent":
      return { ...state, sellAnnualAppreciationPercent: value };
    default:
      return state;
  }
}

export function applyExternalEstimates(
  state: AppPersisted,
  suggestions: ExternalEstimateSuggestion[],
  selectedIds?: Iterable<string>
): ApplyExternalEstimateResult {
  const selected = selectedIds ? new Set(selectedIds) : null;
  let nextState = state;
  const applied: ExternalEstimateSuggestion[] = [];
  const skipped: ExternalEstimateSuggestion[] = [];
  for (const suggestion of suggestions) {
    if ((selected && !selected.has(suggestion.id)) || !ALLOWED.has(suggestion.targetField) || !Number.isFinite(suggestion.value)) {
      skipped.push(suggestion);
      continue;
    }
    nextState = applyField(nextState, suggestion.targetField, suggestion.value);
    applied.push(suggestion);
  }
  return { nextState, applied, skipped };
}
