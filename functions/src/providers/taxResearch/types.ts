import type {
  ExternalTaxResearchError,
  ExternalTaxResearchReference,
  TaxIssueTopic,
} from "../../taxResearch/types.js";

export type AdapterOutcome = {
  references: ExternalTaxResearchReference[];
  errors: ExternalTaxResearchError[];
  provenanceSources: string[];
};

export type GeocodeResolution = {
  countyName?: string;
  stateCode?: string;
  stateFips?: string;
  countyFips?: string;
  matchedAddress?: string;
  /** True when Census-resolved state differs from request.propertyState. */
  stateMismatch?: boolean;
};

export type FederalResourceSpec = {
  id: string;
  topic: TaxIssueTopic;
  title: string;
  url: string;
  source: string;
  blurb: string;
};

export type StatePortalSpec = {
  title: string;
  url: string;
  blurb: string;
};

export type FederalRegisterQuery = {
  topic: TaxIssueTopic;
  term: string;
  perPage?: number;
};

export type SafeFetchResult = {
  ok: boolean;
  url: string;
  canonicalUrl: string;
  status: number;
  contentType?: string;
  text?: string;
  error?: string;
  redirected?: boolean;
};
