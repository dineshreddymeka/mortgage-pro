import type { AppPersisted } from "../storage/mortgageState";
import type { TaxIssueTopic } from "../storage/researchNotes";

export type TaxResourceEntry = {
  id: string;
  topic: TaxIssueTopic;
  title: string;
  url: string;
  source: string;
  blurb: string;
};

/** Static IRS and reference links — not persisted until the user adds them. */
const BASE_RESOURCES: TaxResourceEntry[] = [
  {
    id: "irs-pub-530",
    topic: "property_tax",
    title: "IRS Pub 530 — Tax Information for Homeowners",
    url: "https://www.irs.gov/publications/p530",
    source: "IRS",
    blurb: "Property tax deductions, mortgage interest, and sale basics.",
  },
  {
    id: "irs-pub-527",
    topic: "rental_income",
    title: "IRS Pub 527 — Residential Rental Property",
    url: "https://www.irs.gov/publications/p527",
    source: "IRS",
    blurb: "Rental income, expenses, and recordkeeping for landlords.",
  },
  {
    id: "irs-pub-946",
    topic: "depreciation",
    title: "IRS Pub 946 — How to Depreciate Property",
    url: "https://www.irs.gov/publications/p946",
    source: "IRS",
    blurb: "MACRS, 27.5-year residential rental, and basis rules.",
  },
  {
    id: "irs-qbi-faq",
    topic: "qbi",
    title: "IRS — Qualified Business Income Deduction (§199A) FAQ",
    url: "https://www.irs.gov/newsroom/qualified-business-income-deduction",
    source: "IRS",
    blurb: "QBI eligibility, SSTB limits, and rental real estate safe harbor overview.",
  },
  {
    id: "irs-1031",
    topic: "1031",
    title: "IRS — Like-Kind Exchanges (1031) Real Estate",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips",
    source: "IRS",
    blurb: "Deferral basics, boot, and replacement property requirements.",
  },
  {
    id: "irs-pub-544",
    topic: "capital_gains",
    title: "IRS Pub 544 — Sales and Other Dispositions of Assets",
    url: "https://www.irs.gov/publications/p544",
    source: "IRS",
    blurb: "Capital gains, Section 1250 recapture, and installment sales.",
  },
  {
    id: "irs-passive",
    topic: "passive_loss",
    title: "IRS — Passive Activity Losses",
    url: "https://www.irs.gov/publications/p925",
    source: "IRS",
    blurb: "Pub 925 — passive activity rules, real estate professional, and PAL limits.",
  },
];

/** State comptroller / revenue portal search hints (opens official state sites). */
const STATE_PORTALS: Partial<Record<string, { title: string; url: string }>> = {
  TX: {
    title: "Texas Comptroller — Property Tax",
    url: "https://comptroller.texas.gov/taxes/property-tax/",
  },
  CA: {
    title: "California FTB — Real Estate",
    url: "https://www.ftb.ca.gov/file/business/types/rental-income.html",
  },
  FL: {
    title: "Florida DOR — Property Tax",
    url: "https://floridarevenue.com/property/Pages/default.aspx",
  },
  NY: {
    title: "NY Dept of Taxation — Real Property",
    url: "https://www.tax.ny.gov/research/property/default.htm",
  },
  AZ: {
    title: "Arizona DOR — Property Tax",
    url: "https://azdor.gov/property-tax",
  },
  CO: {
    title: "Colorado — Property Tax Overview",
    url: "https://tax.colorado.gov/property-tax",
  },
  GA: {
    title: "Georgia DOR — Property Tax",
    url: "https://dor.georgia.gov/property-tax",
  },
  NC: {
    title: "North Carolina DOR — Property Tax",
    url: "https://www.ncdor.gov/taxes-forms/property-tax",
  },
  WA: {
    title: "Washington DOR — Property Tax",
    url: "https://dor.wa.gov/taxes-rates/property-tax",
  },
};

function normalizeStateCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 2);
}

/** Curated pack for a scenario — includes state-specific portal when propertyState is set. */
export function buildTaxResourcePack(state: Pick<AppPersisted, "propertyState">): TaxResourceEntry[] {
  const out = [...BASE_RESOURCES];
  const code = normalizeStateCode(state.propertyState ?? "");
  const portal = code ? STATE_PORTALS[code] : undefined;
  if (portal) {
    out.unshift({
      id: `state-${code.toLowerCase()}`,
      topic: "state_local",
      title: portal.title,
      url: portal.url,
      source: code,
      blurb: `Official ${code} property tax / revenue resources for this property.`,
    });
  } else if (code) {
    out.unshift({
      id: `state-search-${code.toLowerCase()}`,
      topic: "state_local",
      title: `${code} property tax resources`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${code} property tax assessor site:gov`)}`,
      source: code,
      blurb: "Search official state/county assessor portals for rates and exemptions.",
    });
  }
  return out;
}

/** Topics to highlight when tax modeling is enabled or exit 1031 fields are in use. */
export function relevantTaxTopics(state: AppPersisted): Set<TaxIssueTopic> {
  const topics = new Set<TaxIssueTopic>(["property_tax", "state_local"]);
  if (state.tax?.enabled) {
    topics.add("rental_income");
    topics.add("depreciation");
    topics.add("passive_loss");
    if (state.tax.qbiEligible !== false) topics.add("qbi");
    if (state.tax.marginalIncomeTaxRatePercent && state.tax.marginalIncomeTaxRatePercent > 0) {
      topics.add("rental_income");
    }
  }
  const has1031 =
    (state.tax?.exchange1031?.replacementPropertyCost ?? 0) > 0 ||
    (state.tax?.exchange1031?.bootReceived ?? 0) > 0;
  if (has1031 || state.tax?.enabled) {
    topics.add("1031");
    topics.add("capital_gains");
  }
  return topics;
}

export function filterTaxResources(
  resources: TaxResourceEntry[],
  topic: TaxIssueTopic | "all"
): TaxResourceEntry[] {
  if (topic === "all") return resources;
  return resources.filter((r) => r.topic === topic);
}
