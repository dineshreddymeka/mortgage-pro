import type {
  ExternalTaxResearchPersisted,
  ExternalTaxResearchReferencePersisted,
} from "../storage/researchNotes";

/** POST body for `/collectHouseTaxResearch`. */
export type CollectHouseTaxResearchRequest = {
  propertyDocId: string;
  propertyAddress?: string;
  propertyPlaceId?: string;
  propertyPostalCode?: string;
  propertyState?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
  persist?: boolean;
  forceRefresh?: boolean;
};

export type CollectHouseTaxResearchSuccessResponse = {
  ok: true;
  snapshot: ExternalTaxResearchPersisted;
  persisted: boolean;
  cacheHit: boolean;
  accessRole: "owner" | "member";
};

export type CollectHouseTaxResearchErrorResponse = {
  ok: false;
  error: string;
};

export type CollectHouseTaxResearchResponse =
  | CollectHouseTaxResearchSuccessResponse
  | CollectHouseTaxResearchErrorResponse;

export type CollectHouseTaxResearchResult = {
  snapshot: ExternalTaxResearchPersisted;
  persisted: boolean;
  cacheHit: boolean;
  accessRole: "owner" | "member";
};

export type MergedReferenceKind = "curated" | "external" | "both";

export type MergedTaxReferenceRow = {
  key: string;
  kind: MergedReferenceKind;
  jurisdiction: "federal" | "state" | "county";
  curated?: {
    id: string;
    topic: ExternalTaxResearchReferencePersisted["topic"];
    title: string;
    url: string;
    source: string;
    blurb: string;
  };
  external?: ExternalTaxResearchReferencePersisted;
};
