export type EstimateCategory = "rate" | "tax" | "insurance" | "rent" | "comps";

export type EstimateTargetField =
  | "interestRateApr"
  | "propertyTaxAnnual"
  | "propertyTaxPercent"
  | "insuranceAnnual"
  | "monthlyRent"
  | "currentHomeValue"
  | "sellAnnualAppreciationPercent";

export type EstimateSuggestion = {
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

export type EstimateRequestBody = {
  homePrice: number;
  propertyAddress?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  zipCode?: string;
  termYears?: number;
  downPaymentPercent?: number;
};

export type EstimateCategoryResponse = {
  category: EstimateCategory;
  suggestions: EstimateSuggestion[];
  cached: boolean;
  provider: string;
  fetchedAt: string;
};

export type EstimateBundleResponse = {
  providerId: string;
  fetchedAt: string;
  offline: boolean;
  suggestions: EstimateSuggestion[];
  cached: boolean;
};

export type EstimateProviderContext = EstimateRequestBody;

export interface CategoryEstimateProvider {
  readonly id: string;
  readonly category: EstimateCategory;
  fetch(context: EstimateProviderContext): Promise<EstimateSuggestion[]>;
}

export function suggestion(
  partial: Omit<EstimateSuggestion, "id" | "fetchedAt"> & { id?: string },
  fetchedAt: string
): EstimateSuggestion {
  return { ...partial, id: partial.id ?? `${partial.category}-${partial.targetField}`, fetchedAt };
}
