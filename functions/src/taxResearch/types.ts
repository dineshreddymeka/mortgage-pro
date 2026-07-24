/** Tax research collection lifecycle — mirrors client `ExternalTaxResearchCollectionStatus`. */
export type ExternalTaxResearchCollectionStatus =
  | "idle"
  | "pending"
  | "running"
  | "complete"
  | "partial"
  | "failed"
  | "stale";

export type TaxIssueTopic =
  | "property_tax"
  | "rental_income"
  | "depreciation"
  | "qbi"
  | "1031"
  | "capital_gains"
  | "passive_loss"
  | "state_local"
  | "other";

export type TaxIssueJurisdiction = "federal" | "state" | "county";

export type ExternalTaxResearchLinkStatus = "ok" | "redirected" | "broken" | "unknown";

export type ExternalTaxResearchSourceProvenance = {
  provider?: string;
  providerVersion?: string;
  bundleId?: string;
  requestId?: string;
  sources?: string[];
};

export type ExternalTaxResearchReference = {
  id: string;
  topic: TaxIssueTopic;
  title: string;
  url?: string;
  source?: string;
  jurisdiction?: TaxIssueJurisdiction;
  externalRefId?: string;
  normalizedKey?: string;
  excerpt?: string;
  publishedAt?: string;
  retrievedAt?: string;
  linkStatus?: ExternalTaxResearchLinkStatus;
};

export type ExternalTaxResearchError = {
  code: string;
  message: string;
  source?: string;
  at?: string;
};

export type ExternalTaxResearchSnapshot = {
  collectionStatus: ExternalTaxResearchCollectionStatus;
  addressFingerprint: string;
  collectedAt: string;
  sourceProvenance?: ExternalTaxResearchSourceProvenance;
  normalizedReferences?: ExternalTaxResearchReference[];
  errors?: ExternalTaxResearchError[];
};

export type CollectHouseTaxResearchRequest = {
  propertyDocId: string;
  propertyAddress?: string;
  propertyPlaceId?: string;
  propertyPostalCode?: string;
  propertyState?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  /** When true (default), merge bounded snapshot into the authorized property scenario. */
  persist?: boolean;
  /** When true, bypass a fresh stored snapshot and re-run collection. */
  forceRefresh?: boolean;
};

export type CollectHouseTaxResearchResponse = {
  ok: true;
  snapshot: ExternalTaxResearchSnapshot;
  persisted: boolean;
  /** True when a fresh stored snapshot was reused instead of re-collecting. */
  cacheHit: boolean;
  accessRole: "owner" | "member";
};

export type CollectHouseTaxResearchErrorResponse = {
  ok: false;
  error: string;
};

export type TaxResearchCollectorInput = {
  request: CollectHouseTaxResearchRequest;
  addressFingerprint: string;
  requestId: string;
};

export type TaxResearchCollectorResult = ExternalTaxResearchSnapshot;

export interface TaxResearchCollector {
  readonly id: string;
  collect(input: TaxResearchCollectorInput): Promise<TaxResearchCollectorResult>;
}
