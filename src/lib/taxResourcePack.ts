import type { AppPersisted } from "../storage/mortgageState";
import type { TaxIssueTopic } from "../storage/researchNotes";

export type TaxJurisdiction = "federal" | "state" | "county";

export type TaxResourceEntry = {
  id: string;
  topic: TaxIssueTopic;
  jurisdiction: TaxJurisdiction;
  title: string;
  url: string;
  source: string;
  blurb: string;
};

export const TAX_JURISDICTIONS = ["federal", "state", "county"] as const satisfies readonly TaxJurisdiction[];

export function taxJurisdictionLabel(j: TaxJurisdiction): string {
  const labels: Record<TaxJurisdiction, string> = {
    federal: "Federal",
    state: "State",
    county: "County / local",
  };
  return labels[j];
}

/** IRS and federal reference links — not persisted until the user adds them. */
const FEDERAL_RESOURCES: TaxResourceEntry[] = [
  {
    id: "irs-rental-hub",
    topic: "rental_income",
    jurisdiction: "federal",
    title: "IRS — Rental Income and Expenses (Real Estate Tax Tips)",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/rental-income-and-expenses-real-estate-tax-tips",
    source: "IRS",
    blurb: "Federal rental income, deductions, and recordkeeping overview.",
  },
  {
    id: "irs-pub-530",
    topic: "property_tax",
    jurisdiction: "federal",
    title: "IRS Pub 530 — Tax Information for Homeowners",
    url: "https://www.irs.gov/publications/p530",
    source: "IRS",
    blurb: "Mortgage interest, SALT cap, and property tax deduction basics.",
  },
  {
    id: "irs-pub-527",
    topic: "rental_income",
    jurisdiction: "federal",
    title: "IRS Pub 527 — Residential Rental Property",
    url: "https://www.irs.gov/publications/p527",
    source: "IRS",
    blurb: "Landlord income, expenses, and vacation-home rules.",
  },
  {
    id: "irs-pub-946",
    topic: "depreciation",
    jurisdiction: "federal",
    title: "IRS Pub 946 — How to Depreciate Property",
    url: "https://www.irs.gov/publications/p946",
    source: "IRS",
    blurb: "MACRS, 27.5-year residential rental, and basis rules.",
  },
  {
    id: "irs-qbi-faq",
    topic: "qbi",
    jurisdiction: "federal",
    title: "IRS — Qualified Business Income Deduction (§199A)",
    url: "https://www.irs.gov/newsroom/qualified-business-income-deduction",
    source: "IRS",
    blurb: "QBI eligibility, SSTB limits, and rental safe harbor.",
  },
  {
    id: "irs-1031",
    topic: "1031",
    jurisdiction: "federal",
    title: "IRS — Like-Kind Exchanges (1031) Real Estate",
    url: "https://www.irs.gov/businesses/small-businesses-self-employed/like-kind-exchanges-real-estate-tax-tips",
    source: "IRS",
    blurb: "Deferral basics, boot, and replacement property requirements.",
  },
  {
    id: "irs-pub-544",
    topic: "capital_gains",
    jurisdiction: "federal",
    title: "IRS Pub 544 — Sales and Other Dispositions of Assets",
    url: "https://www.irs.gov/publications/p544",
    source: "IRS",
    blurb: "Capital gains, Section 1250 recapture, installment sales.",
  },
  {
    id: "irs-passive",
    topic: "passive_loss",
    jurisdiction: "federal",
    title: "IRS Pub 925 — Passive Activity and At-Risk Rules",
    url: "https://www.irs.gov/publications/p925",
    source: "IRS",
    blurb: "Passive loss limits and real estate professional rules.",
  },
  {
    id: "irs-schedule-e",
    topic: "rental_income",
    jurisdiction: "federal",
    title: "IRS — Schedule E (Supplemental Income and Loss)",
    url: "https://www.irs.gov/forms-pubs/about-schedule-e-form-1040",
    source: "IRS",
    blurb: "Where rental activity is reported on Form 1040.",
  },
];

type StatePortal = { title: string; url: string; blurb: string };

/** Official state revenue / property-tax portals (all states + DC). */
const STATE_PORTALS: Record<string, StatePortal> = {
  AL: {
    title: "Alabama Department of Revenue — Property Tax",
    url: "https://revenue.alabama.gov/property-tax/",
    blurb: "State property tax administration and local assessor guidance.",
  },
  AK: {
    title: "Alaska Department of Revenue — Tax Division",
    url: "https://www.tax.alaska.gov/",
    blurb: "Alaska has no statewide property tax; borough/city assessors set rates.",
  },
  AZ: {
    title: "Arizona Department of Revenue — Property Tax",
    url: "https://azdor.gov/property-tax",
    blurb: "State oversight and links to county assessors.",
  },
  AR: {
    title: "Arkansas DFA — Property Tax",
    url: "https://www.dfa.arkansas.gov/office/taxes/property-tax/",
    blurb: "State property tax info and county assessor references.",
  },
  CA: {
    title: "California Franchise Tax Board — Rental Income",
    url: "https://www.ftb.ca.gov/file/business/types/rental-income.html",
    blurb: "State income tax on rental; pair with county assessor for property tax.",
  },
  CO: {
    title: "Colorado — Property Tax Overview",
    url: "https://tax.colorado.gov/property-tax",
    blurb: "State property tax overview and county assessor links.",
  },
  CT: {
    title: "Connecticut DRS — Property Tax",
    url: "https://portal.ct.gov/DRS/Individual/Individual-Tax/Frequently-Asked-Questions/Property-Tax",
    blurb: "Connecticut property tax guidance (levied locally).",
  },
  DE: {
    title: "Delaware Division of Revenue",
    url: "https://revenue.delaware.gov/",
    blurb: "State taxes; property tax is county-level in Delaware.",
  },
  DC: {
    title: "MyTax.DC.gov — Real Property Tax",
    url: "https://mytax.dc.gov/_/",
    blurb: "District real property tax bills, assessments, and account services.",
  },
  FL: {
    title: "Florida DOR — Property Tax",
    url: "https://floridorevenue.com/property/Pages/default.aspx",
    blurb: "State oversight; property appraised by county property appraisers.",
  },
  GA: {
    title: "Georgia DOR — Property Tax",
    url: "https://dor.georgia.gov/property-tax",
    blurb: "State property tax administration and county tax commissioner links.",
  },
  HI: {
    title: "Hawaii Department of Taxation",
    url: "https://tax.hawaii.gov/",
    blurb: "State taxes; real property tax is county-level in Hawaii.",
  },
  ID: {
    title: "Idaho State Tax Commission — Property Tax",
    url: "https://tax.idaho.gov/taxes/property-tax/",
    blurb: "State property tax resources and county assessor directory.",
  },
  IL: {
    title: "Illinois DOR — Property Tax",
    url: "https://www2.illinois.gov/rev/research/taxinformation/property/Pages/default.aspx",
    blurb: "State property tax overview; assessments are local.",
  },
  IN: {
    title: "Indiana DOR — Property Tax",
    url: "https://www.in.gov/dor/property-tax/",
    blurb: "Indiana property tax basics and county assessor references.",
  },
  IA: {
    title: "Iowa Department of Revenue — Property Tax",
    url: "https://tax.iowa.gov/property-tax",
    blurb: "State property tax and county assessor information.",
  },
  KS: {
    title: "Kansas DOR — Property Valuation and Taxation",
    url: "https://www.ksrevenue.gov/pr-tax.html",
    blurb: "State property tax oversight and county appraiser links.",
  },
  KY: {
    title: "Kentucky Department of Revenue — Property Tax",
    url: "https://revenue.ky.gov/Property/Pages/default.aspx",
    blurb: "State property tax and local PVA (assessor) offices.",
  },
  LA: {
    title: "Louisiana Department of Revenue — Property Tax",
    url: "https://revenue.louisiana.gov/PropertyTax",
    blurb: "State property tax administration and parish assessors.",
  },
  ME: {
    title: "Maine Revenue Services — Property Tax",
    url: "https://www.maine.gov/revenue/propertytax",
    blurb: "State property tax programs and municipal assessor info.",
  },
  MD: {
    title: "Maryland SDAT — Property Tax",
    url: "https://dat.maryland.gov/pages/propertyTax.aspx",
    blurb: "State assessments and county/city property tax links.",
  },
  MA: {
    title: "Massachusetts DOR — Property Tax",
    url: "https://www.mass.gov/guides/property-tax",
    blurb: "Massachusetts property tax overview (local assessors).",
  },
  MI: {
    title: "Michigan Treasury — Property Tax",
    url: "https://www.michigan.gov/taxes/property",
    blurb: "State property tax and local assessor resources.",
  },
  MN: {
    title: "Minnesota Department of Revenue — Property Tax",
    url: "https://www.revenue.state.mn.us/property-tax",
    blurb: "State property tax and county assessor information.",
  },
  MS: {
    title: "Mississippi DOR — Ad Valorem Tax",
    url: "https://www.dor.ms.gov/business/ad-valorem-tax",
    blurb: "Mississippi property (ad valorem) tax and county tax assessors.",
  },
  MO: {
    title: "Missouri DOR — Property Tax",
    url: "https://dor.mo.gov/taxation/business/tax-types/property/",
    blurb: "Missouri property tax and county assessor references.",
  },
  MT: {
    title: "Montana DOR — Property Tax",
    url: "https://mtrevenue.gov/taxes/property-taxes/",
    blurb: "Montana property tax and county treasurer/assessor links.",
  },
  NE: {
    title: "Nebraska DOR — Property Assessment and Taxation",
    url: "https://revenue.nebraska.gov/businesses/property-assessment-and-taxation",
    blurb: "Nebraska property tax and county assessor directory.",
  },
  NV: {
    title: "Nevada Department of Taxation",
    url: "https://tax.nv.gov/",
    blurb: "No state property tax; county assessors set rates in Nevada.",
  },
  NH: {
    title: "New Hampshire DRA — Property Tax",
    url: "https://www.revenue.nh.gov/assessing/index.htm",
    blurb: "NH property tax is local; state assessing standards and resources.",
  },
  NJ: {
    title: "New Jersey Division of Taxation — Property Tax",
    url: "https://www.nj.gov/treasury/taxation/propertytax.shtml",
    blurb: "NJ property tax programs and municipal assessor info.",
  },
  NM: {
    title: "New Mexico Taxation and Revenue — Property Tax",
    url: "https://www.tax.newmexico.gov/businesses/property-tax-overview/",
    blurb: "NM property tax and county assessor references.",
  },
  NY: {
    title: "NY Dept of Taxation — Real Property",
    url: "https://www.tax.ny.gov/research/property/default.htm",
    blurb: "NY property tax and local assessor resources.",
  },
  NC: {
    title: "North Carolina DOR — Property Tax",
    url: "https://www.ncdor.gov/taxes-forms/property-tax",
    blurb: "NC property tax and county assessor information.",
  },
  ND: {
    title: "North Dakota Office of State Tax Commissioner — Property Tax",
    url: "https://www.tax.nd.gov/business/property-tax",
    blurb: "ND property tax and county director of tax equalization links.",
  },
  OH: {
    title: "Ohio Department of Taxation — Property Tax",
    url: "https://tax.ohio.gov/wps/portal/gov/tax/business/property-tax",
    blurb: "Ohio property tax and county auditor/assessor resources.",
  },
  OK: {
    title: "Oklahoma Tax Commission — Ad Valorem",
    url: "https://oklahoma.gov/tax/businesses/ad-valorem.html",
    blurb: "Oklahoma property tax and county assessor references.",
  },
  OR: {
    title: "Oregon Department of Revenue — Property Tax",
    url: "https://www.oregon.gov/dor/programs/property/pages/default.aspx",
    blurb: "Oregon property tax and county assessor links.",
  },
  PA: {
    title: "Pennsylvania DOR — Property Tax",
    url: "https://www.revenue.pa.gov/TaxTypes/PropertyTax/Pages/default.aspx",
    blurb: "PA property tax and county assessment offices.",
  },
  RI: {
    title: "Rhode Island Division of Taxation — Property Tax",
    url: "https://tax.ri.gov/tax-sections/property-tax",
    blurb: "RI property tax relief programs and municipal assessors.",
  },
  SC: {
    title: "South Carolina DOR — Property Tax",
    url: "https://dor.sc.gov/tax/property",
    blurb: "SC property tax and county assessor references.",
  },
  SD: {
    title: "South Dakota DOR — Property Tax",
    url: "https://dor.sd.gov/businesses/taxes/property-tax/",
    blurb: "SD property tax and county director of equalization links.",
  },
  TN: {
    title: "Tennessee DOR — Property Tax",
    url: "https://www.tn.gov/revenue/taxes/property-tax.html",
    blurb: "TN property tax and county assessor of property links.",
  },
  TX: {
    title: "Texas Comptroller — Property Tax",
    url: "https://comptroller.texas.gov/taxes/property-tax/",
    blurb: "Texas property tax oversight and appraisal district directory.",
  },
  UT: {
    title: "Utah State Tax Commission — Property Tax",
    url: "https://tax.utah.gov/utah-taxes/property-tax",
    blurb: "Utah property tax and county assessor references.",
  },
  VT: {
    title: "Vermont Department of Taxes — Property Tax",
    url: "https://tax.vermont.gov/property-tax",
    blurb: "VT property tax and town listers (local assessors).",
  },
  VA: {
    title: "Virginia Tax — Local Tax & Assessment",
    url: "https://www.tax.virginia.gov/local-tax",
    blurb: "Virginia local property tax and commissioner of revenue links.",
  },
  WA: {
    title: "Washington DOR — Property Tax",
    url: "https://dor.wa.gov/taxes-rates/property-tax",
    blurb: "Washington property tax and county assessor directory.",
  },
  WV: {
    title: "West Virginia State Tax Department — Property Tax",
    url: "https://tax.wv.gov/Business/PropertyTax/Pages/PropertyTax.aspx",
    blurb: "WV property tax and county assessor references.",
  },
  WI: {
    title: "Wisconsin DOR — Property Tax",
    url: "https://www.revenue.wi.gov/Pages/PropertyTax.aspx",
    blurb: "Wisconsin property tax and local assessor resources.",
  },
  WY: {
    title: "Wyoming Department of Revenue — Property Tax",
    url: "https://wyo.gov/revenue/tax-division/property-tax",
    blurb: "Wyoming property tax and county assessor links.",
  },
};

/** Official county assessor / appraisal district directory pages by state. */
const COUNTY_DIRECTORIES: Partial<Record<string, StatePortal>> = {
  AL: {
    title: "Alabama — County Revenue Commissioners",
    url: "https://revenue.alabama.gov/property-tax/county-offices/",
    blurb: "Find your county tax office and assessment contacts.",
  },
  AZ: {
    title: "Arizona — County Assessors",
    url: "https://azdor.gov/about/legal/county-assessors",
    blurb: "Directory of Arizona county assessors.",
  },
  CA: {
    title: "California BOE — County Assessor Contacts",
    url: "https://www.boe.ca.gov/proptaxes/countycontacts.htm",
    blurb: "Official county assessor contact list for property tax.",
  },
  CO: {
    title: "Colorado — County Assessor Directory",
    url: "https://dpt.colorado.gov/locality-search",
    blurb: "Search Colorado county assessors and property records.",
  },
  FL: {
    title: "Florida — County Property Appraisers",
    url: "https://floridarevenue.com/property/pages/counties.aspx",
    blurb: "Official list of Florida county property appraisers.",
  },
  GA: {
    title: "Georgia — County Tax Commissioners",
    url: "https://dor.georgia.gov/county-tax-commissioners",
    blurb: "County tax commissioners and property tax administration.",
  },
  IL: {
    title: "Illinois — Chief County Assessment Officers",
    url: "https://www2.illinois.gov/rev/localgovernments/property/Pages/CCAO-List.aspx",
    blurb: "County assessment office contacts in Illinois.",
  },
  IN: {
    title: "Indiana — County Assessor Directory",
    url: "https://www.in.gov/dor/property-tax/overview-for-taxpayers/county-assessors/",
    blurb: "Indiana county assessor contact directory.",
  },
  MI: {
    title: "Michigan — County Equalization Directors",
    url: "https://www.michigan.gov/taxes/property/county-directory",
    blurb: "Michigan county equalization and assessment contacts.",
  },
  NC: {
    title: "North Carolina — County Tax Assessor Directory",
    url: "https://www.ncdor.gov/local-government/local-government-services/county-tax-administrators",
    blurb: "NC county tax administrators and assessors.",
  },
  NY: {
    title: "New York — Local Assessors",
    url: "https://www.tax.ny.gov/research/property/assessors.htm",
    blurb: "NY local assessor and county real property tax services.",
  },
  OH: {
    title: "Ohio — County Auditors",
    url: "https://ohioauditor.gov/auditsearch/Search.aspx",
    blurb: "Ohio county auditors (property tax and assessments).",
  },
  PA: {
    title: "Pennsylvania — County Assessment Offices",
    url: "https://www.revenue.pa.gov/GeneralTaxInformation/TaxTypes/Pages/PropertyTax-CountyDirectory.aspx",
    blurb: "PA county assessment office directory.",
  },
  TX: {
    title: "Texas — Appraisal District Directory",
    url: "https://comptroller.texas.gov/taxes/property-tax/county-directory.php",
    blurb: "Official Texas county appraisal district lookup.",
  },
  VA: {
    title: "Virginia — Commissioner of Revenue Directory",
    url: "https://www.tax.virginia.gov/local-tax-commissioner-revenue",
    blurb: "Local commissioners of the revenue and assessors in Virginia.",
  },
  WA: {
    title: "Washington — County Assessor Directory",
    url: "https://dor.wa.gov/taxes-rates/property-tax/county-assessors",
    blurb: "Washington county assessor contacts and records.",
  },
};

function normalizeStateCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 2);
}

function normalizeZip(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 5);
}

function govSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function buildStateResources(code: string): TaxResourceEntry[] {
  const portal = STATE_PORTALS[code];
  if (portal) {
    return [
      {
        id: `state-${code.toLowerCase()}`,
        topic: "state_local",
        jurisdiction: "state",
        title: portal.title,
        url: portal.url,
        source: code,
        blurb: portal.blurb,
      },
    ];
  }
  return [
    {
      id: `state-search-${code.toLowerCase()}`,
      topic: "state_local",
      jurisdiction: "state",
      title: `${code} — state tax & property resources`,
      url: govSearchUrl(`${code} state department of revenue property tax site:gov`),
      source: code,
      blurb: "Search official state revenue and property tax portals.",
    },
  ];
}

function buildCountyResources(
  code: string,
  zip: string,
  address: string
): TaxResourceEntry[] {
  const entries: TaxResourceEntry[] = [];
  const directory = COUNTY_DIRECTORIES[code];
  if (directory) {
    entries.push({
      id: `county-dir-${code.toLowerCase()}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: directory.title,
      url: directory.url,
      source: `${code} County`,
      blurb: directory.blurb,
    });
  }

  const zip5 = normalizeZip(zip);
  if (zip5.length === 5) {
    entries.push({
      id: `county-zip-${code.toLowerCase()}-${zip5}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: `County assessor near ZIP ${zip5}`,
      url: govSearchUrl(`${code} county property assessor ${zip5} site:gov OR site:us`),
      source: `${code} · ${zip5}`,
      blurb: "Find the local assessor or appraisal district for this ZIP code.",
    });
  }

  const addr = address.trim();
  if (addr.length > 5) {
    entries.push({
      id: `county-address-${code.toLowerCase()}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: "County records for this address",
      url: govSearchUrl(`${addr} county property tax assessor ${code}`),
      source: `${code} County`,
      blurb: "Search county assessor or appraisal records for the property address.",
    });
  }

  if (entries.length === 0 && code) {
    entries.push({
      id: `county-fallback-${code.toLowerCase()}`,
      topic: "property_tax",
      jurisdiction: "county",
      title: `${code} — county assessor directory`,
      url: govSearchUrl(`${code} county property assessor directory site:gov`),
      source: `${code} County`,
      blurb: "Search for your county assessor, appraiser, or tax commissioner.",
    });
  }

  return entries;
}

export type TaxResourcePackInput = Pick<
  AppPersisted,
  "propertyState" | "propertyPostalCode" | "propertyAddress"
>;

/**
 * Curated pack: county/local first, then state, then federal IRS references.
 * Nothing is persisted until the user clicks “Add to my list”.
 */
export function buildTaxResourcePack(state: TaxResourcePackInput): TaxResourceEntry[] {
  const code = normalizeStateCode(state.propertyState ?? "");
  const county = code
    ? buildCountyResources(code, state.propertyPostalCode ?? "", state.propertyAddress ?? "")
    : [];
  const stateLevel = code ? buildStateResources(code) : [];
  return [...county, ...stateLevel, ...FEDERAL_RESOURCES];
}

/** Topics to highlight when tax modeling is enabled or exit 1031 fields are in use. */
export function relevantTaxTopics(state: AppPersisted): Set<TaxIssueTopic> {
  const topics = new Set<TaxIssueTopic>(["property_tax", "state_local"]);
  if (state.tax?.enabled) {
    topics.add("rental_income");
    topics.add("depreciation");
    topics.add("passive_loss");
    if (state.tax.qbiEligible !== false) topics.add("qbi");
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

export function filterTaxResourcesByJurisdiction(
  resources: TaxResourceEntry[],
  jurisdiction: TaxJurisdiction | "all"
): TaxResourceEntry[] {
  if (jurisdiction === "all") return resources;
  return resources.filter((r) => r.jurisdiction === jurisdiction);
}

export function groupTaxResourcesByJurisdiction(
  resources: TaxResourceEntry[]
): Record<TaxJurisdiction, TaxResourceEntry[]> {
  return {
    federal: resources.filter((r) => r.jurisdiction === "federal"),
    state: resources.filter((r) => r.jurisdiction === "state"),
    county: resources.filter((r) => r.jurisdiction === "county"),
  };
}

export type TaxTopicGuide = {
  topic: TaxIssueTopic;
  title: string;
  summary: string;
  checklist: string[];
  relatedIds: string[];
};

const TOPIC_GUIDES: TaxTopicGuide[] = [
  {
    topic: "property_tax",
    title: "Property tax diligence",
    summary: "Separate ad valorem (local) bills from federal income-tax treatment of SALT.",
    checklist: [
      "Confirm county assessor and appraisal district for this address",
      "Check current assessed value vs your modeled propertyTaxAnnual",
      "Note homestead, senior, or investor exemption rules",
      "Track reassessment timing after purchase or rehab",
    ],
    relatedIds: ["irs-pub-530"],
  },
  {
    topic: "rental_income",
    title: "Rental income reporting",
    summary: "Schedule E reports rent and operating expenses; keep records by property.",
    checklist: [
      "Document gross rent and other income",
      "Separate repairs (expensed) from improvements (capitalized)",
      "Track mileage and professional fees",
      "Reconcile to your pro-forma NOI assumptions",
    ],
    relatedIds: ["irs-rental-hub", "irs-pub-527", "irs-schedule-e"],
  },
  {
    topic: "depreciation",
    title: "Depreciation & basis",
    summary: "Residential rental is typically 27.5-year straight-line on building basis.",
    checklist: [
      "Split land vs building (land is not depreciable)",
      "Include capitalized improvements in basis",
      "Confirm placed-in-service date",
      "Compare modeled annual depreciation to Pub 946 rules",
    ],
    relatedIds: ["irs-pub-946"],
  },
  {
    topic: "qbi",
    title: "QBI (§199A)",
    summary: "Rental may qualify for QBI with safe-harbor or trade/business facts.",
    checklist: [
      "Document hours and rental activity level",
      "Check SSTB and W-2/UBIA limitations",
      "Compare simplified model QBI to CPA estimate",
    ],
    relatedIds: ["irs-qbi-faq"],
  },
  {
    topic: "1031",
    title: "1031 like-kind exchange",
    summary: "Defer gain by exchanging into like-kind replacement property; boot is taxable.",
    checklist: [
      "Identify replacement within 45 days",
      "Close replacement within 180 days",
      "Use qualified intermediary — no direct receipt of proceeds",
      "Model boot and replacement cost in Exit assumptions",
    ],
    relatedIds: ["irs-1031"],
  },
  {
    topic: "capital_gains",
    title: "Sale tax & recapture",
    summary: "Exit gain may include recapture and capital gain at different rates.",
    checklist: [
      "Estimate adjusted basis and accumulated depreciation recapture",
      "Confirm holding period (long- vs short-term)",
      "Include selling costs in net proceeds",
    ],
    relatedIds: ["irs-pub-544"],
  },
  {
    topic: "passive_loss",
    title: "Passive activity losses",
    summary: "Rental losses may be limited unless you qualify as real estate professional.",
    checklist: [
      "Track aggregate passive income and losses",
      "Document material participation hours if claiming active status",
      "Review suspended losses from prior years",
    ],
    relatedIds: ["irs-passive"],
  },
  {
    topic: "state_local",
    title: "State & local",
    summary: "Many states tax rental income; property tax is almost always local.",
    checklist: [
      "Open your state revenue portal below",
      "Find county assessor or appraisal district",
      "Check local business personal property or rental registration",
    ],
    relatedIds: [],
  },
];

export function getTopicGuide(topic: TaxIssueTopic): TaxTopicGuide | undefined {
  return TOPIC_GUIDES.find((g) => g.topic === topic);
}

export function listTopicGuides(): TaxTopicGuide[] {
  return TOPIC_GUIDES;
}

/** Topics emphasized on Rental vs Exit tax panels. */
export function focusTopicsForVariant(variant: "rental" | "exit"): Set<TaxIssueTopic> {
  if (variant === "exit") {
    return new Set<TaxIssueTopic>(["property_tax", "1031", "capital_gains", "state_local"]);
  }
  return new Set<TaxIssueTopic>([
    "property_tax",
    "rental_income",
    "depreciation",
    "qbi",
    "passive_loss",
    "state_local",
  ]);
}

export function resolveRelatedResources(
  pack: TaxResourceEntry[],
  guide: TaxTopicGuide
): TaxResourceEntry[] {
  if (guide.relatedIds.length === 0) {
    return pack.filter((r) => r.topic === guide.topic).slice(0, 4);
  }
  const byId = new Map(pack.map((r) => [r.id, r]));
  const picked = guide.relatedIds.map((id) => byId.get(id)).filter((r): r is TaxResourceEntry => r != null);
  return picked.length > 0 ? picked : pack.filter((r) => r.topic === guide.topic).slice(0, 4);
}
