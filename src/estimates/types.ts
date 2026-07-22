import type { AppPersisted } from "../storage/mortgageState";

export type EstimateCategory = "rate" | "tax" | "insurance" | "rent" | "comps";

export type EstimateTargetField =
  | "interestRateApr"
  | "propertyTaxAnnual"
  | "propertyTaxPercent"
  | "insuranceAnnual"
  | "monthlyRent"
  | "currentHomeValue"
  | "sellAnnualAppreciationPercent";

export type ExternalEstimateSuggestion = {
  id: string;
  category: EstimateCategory;
  targetField: EstimateTargetField;
  label: string;
  value: number;
  unit: string;
  source: string;
  fetchedAt: string;
  confidence: "low" | "medium" | "high";
  rationale?: string;
};

export type EstimateRequestContext = {
  homePrice: number;
  propertyAddress?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  zipCode?: string;
  termYears?: number;
  downPaymentPercent?: number;
};

export type ExternalEstimateBundle = {
  providerId: string;
  fetchedAt: string;
  suggestions: ExternalEstimateSuggestion[];
  offline: boolean;
};

export interface ExternalEstimateProvider {
  readonly id: string;
  readonly label: string;
  readonly isOfflineCapable: boolean;
  fetchEstimates(context: EstimateRequestContext): Promise<ExternalEstimateBundle>;
}

export function buildEstimateContextFromScenario(state: AppPersisted): EstimateRequestContext {
  const zipMatch = state.propertyAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
  return {
    homePrice: Math.max(0, state.homePrice),
    propertyAddress: state.propertyAddress.trim() || undefined,
    propertyLatitude: state.propertyLatitude,
    propertyLongitude: state.propertyLongitude,
    zipCode: zipMatch?.[1],
    termYears: state.termYears,
    downPaymentPercent: state.downPaymentPercent,
  };
}
